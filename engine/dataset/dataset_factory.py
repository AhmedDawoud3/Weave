from __future__ import annotations

import importlib
import os
from typing import Any

from torch.utils.data import Dataset
from torchvision.datasets import ImageFolder
from torchvision.transforms import Compose

from schemas import (
    CustomDatasetConfig,
    DatasetConfig,
    ImageFolderDatasetConfig,
    PredefinedDatasetConfig,
)

from .custom_loaders.csv_image_dataset import CSVImageDataset
from .custom_loaders.tabular_dataset import TabularDataset
from .custom_loaders.text_dataset import TextDataset

try:
    from .custom_loaders.audio_dataset import AudioDataset
except (ImportError, OSError):
    # OSError raised on CPU-only runners where CUDA shared libs are missing
    AudioDataset: Any = None
from .registry import load_registry
from .transform_factory import build_transforms


def get_dataset(
    name: str,
    root_dir: str,
    transform: Compose | None = None,
    split: str = "train",
) -> Dataset:
    """Dynamically instantiate a predefined dataset from the registry.

    Looks up the dataset name in the registry, imports the corresponding
    torchvision class, and creates an instance with the given parameters.

    Args:
        name: Dataset name (must exist in the registry, e.g. "MNIST", "CIFAR10").
        root_dir: Directory path to download/load the dataset.
        transform: Optional transform pipeline to apply to samples.
        split: Dataset split, either "train" or "test".

    Returns:
        A torchvision Dataset instance.

    Raises:
        ValueError: If the dataset name is not found in the registry.
    """
    registry = load_registry()

    if name not in registry:
        raise ValueError(
            f"Dataset '{name}' not supported. Available: {list(registry.keys())}"
        )

    config = registry[name]

    module = importlib.import_module(config["module"])
    dataset_class = getattr(module, config["class"])

    default_params = config.get("default_params", {}).copy()
    # Override train/test split if the underlying dataset accepts a `train` bool
    if "train" in default_params:
        default_params["train"] = split == "train"
    # SVHN uses "split" instead of "train"
    if "split" in default_params and "train" not in default_params:
        default_params["split"] = split

    dataset = dataset_class(
        root=root_dir,
        transform=transform,
        **default_params,
    )

    return dataset


def get_dataset_from_config(config: DatasetConfig) -> Dataset:
    """Create a Dataset from a DatasetConfig union type.

    Dispatches to the appropriate loader based on the ``source`` field:
    - ``predefined`` → torchvision dataset via registry
    - ``image_folder`` → ImageFolder with optional train/test split
    - ``custom`` → custom loader based on ``modality``

    Args:
        config: A DatasetConfig (PredefinedDatasetConfig, ImageFolderDatasetConfig,
            or CustomDatasetConfig).

    Returns:
        A PyTorch Dataset instance.

    Raises:
        ValueError: If the configuration is invalid or required fields are missing.
    """
    if isinstance(config, PredefinedDatasetConfig):
        return _create_predefined(config)
    elif isinstance(config, ImageFolderDatasetConfig):
        return _create_image_folder(config)
    elif isinstance(config, CustomDatasetConfig):
        return _create_custom(config)
    else:
        raise ValueError(f"Unknown dataset source type: {type(config)}")


def _create_predefined(config: PredefinedDatasetConfig) -> Dataset:
    """Create a predefined torchvision dataset."""
    transform = _build_transforms_if_any(config.transforms)
    return get_dataset(
        name=config.name,
        root_dir=os.path.join(".", "data"),
        transform=transform,
        split=config.split,
    )


def _create_image_folder(config: ImageFolderDatasetConfig) -> Dataset:
    """Create an ImageFolder dataset with optional train/test split."""
    if not os.path.isdir(config.root):
        raise ValueError(f"Image folder path does not exist: {config.root}")

    transform = _build_transforms_if_any(config.transforms)
    full_dataset = ImageFolder(root=config.root, transform=transform)

    if config.split_ratio < 1.0:
        # Return the full dataset; caller can use split_dataset() for the split
        return full_dataset

    return full_dataset


def _create_custom(config: CustomDatasetConfig) -> Dataset:
    """Create a custom dataset based on modality."""
    transform = _build_transforms_if_any(config.transforms)

    if config.modality == "image":
        return _create_custom_image(config, transform)
    elif config.modality == "text":
        return _create_custom_text(config)
    elif config.modality == "tabular":
        return _create_custom_tabular(config)
    elif config.modality == "audio":
        return _create_custom_audio(config, transform)
    else:
        raise ValueError(f"Unknown custom dataset modality: {config.modality}")


def _create_custom_image(
    config: CustomDatasetConfig, transform: Compose | None
) -> Dataset:
    """Create a custom image dataset (CSV-labeled or folder-based)."""
    if config.label_source == "csv" and config.label_file:
        return CSVImageDataset(
            root=config.root or ".",
            label_file=config.label_file,
            image_column=config.image_column or "image",
            label_column=config.label_column or "label",
            transform=transform,
            file_pattern=config.file_pattern,
        )
    elif config.root and os.path.isdir(config.root):
        # Fall back to ImageFolder if root exists
        return ImageFolder(root=config.root, transform=transform)
    else:
        raise ValueError(
            "Custom image dataset requires either label_source='csv' with label_file, "
            "or a valid root directory for ImageFolder structure."
        )


def _create_custom_text(config: CustomDatasetConfig) -> Dataset:
    """Create a custom text dataset."""
    if not config.file_path:
        raise ValueError("Custom text dataset requires 'file_path'.")

    return TextDataset(
        file_path=config.file_path,
        text_column=config.text_column or "text",
        target_column=config.target_column,
        max_length=config.max_length,
        vocab_size=config.vocab_size,
        tokenizer=config.tokenizer,
    )


def _create_custom_tabular(config: CustomDatasetConfig) -> Dataset:
    """Create a custom tabular dataset."""
    if not config.file_path:
        raise ValueError("Custom tabular dataset requires 'file_path'.")

    return TabularDataset(
        file_path=config.file_path,
        feature_columns=config.feature_columns or None,
        target_column=config.target_column,
        categorical_columns=config.categorical_columns or None,
        normalize=config.normalize,
    )


def _create_custom_audio(
    config: CustomDatasetConfig, transform: Compose | None
) -> Dataset:
    """Create a custom audio dataset."""
    if AudioDataset is None:
        raise ImportError(
            "torchaudio is required for audio datasets but could not be loaded. "
            "Install it with: pip install torchaudio"
        )

    if not config.root:
        raise ValueError("Custom audio dataset requires 'root' directory.")

    return AudioDataset(
        root=config.root,
        sample_rate=config.sample_rate,
        max_duration_sec=config.max_duration_sec,
        n_mels=config.n_mels,
        feature_extraction=config.feature_extraction,
        transform=transform,
    )


def _build_transforms_if_any(transforms_list: list | None) -> Compose | None:
    """Build a transform pipeline from a list of TransformConfig, or return None."""
    if not transforms_list:
        return None
    transform_dicts = [t.model_dump() for t in transforms_list]
    return build_transforms(transform_dicts)
