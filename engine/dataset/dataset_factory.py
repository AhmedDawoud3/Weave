from __future__ import annotations

import importlib
import os
from typing import Any

from torch.utils.data import Dataset
from torchvision.datasets import ImageFolder
from torchvision.transforms import Compose, ToTensor

from schemas import (
    CustomDatasetConfig,
    DatasetConfig,
    ImageFolderDatasetConfig,
    PredefinedDatasetConfig,
    TextDatasetConfig,
)

from .custom_loaders.csv_image_dataset import CSVImageDataset
from .custom_loaders.tabular_dataset import TabularDataset
from .custom_loaders.text_dataset import TextDataset
from .text_lm_dataset import CharLMDataset

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
    download: bool = False,
) -> Dataset:
    """Dynamically instantiate a predefined dataset from the registry.

    Looks up the dataset name in the registry, imports the corresponding
    torchvision class, and creates an instance with the given parameters.

    Args:
        name: Dataset name (must exist in the registry, e.g. "MNIST", "CIFAR10").
        root_dir: Directory path to download/load the dataset.
        transform: Optional transform pipeline to apply to samples.
        split: Dataset split, either "train" or "test".
        download: Whether to trigger torchvision's auto-downloader if missing.

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
    if "train" in default_params:
        default_params["train"] = split == "train"
    if "split" in default_params and "train" not in default_params:
        default_params["split"] = split
    if "download" in default_params:
        default_params["download"] = download

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
    elif isinstance(config, TextDatasetConfig):
        return _create_text_lm(config)
    else:
        raise ValueError(f"Unknown dataset source type: {type(config)}")


def _create_predefined(config: PredefinedDatasetConfig) -> Dataset:
    """Create a predefined dataset (torchvision image or built-in text)."""
    if config.name == "AG_NEWS_SUBSET":
        return TextDataset(
            file_path=os.path.join("..", "data", "ag_news_subset.csv"),
            text_column="text",
            target_column="label",
            max_length=getattr(config, "max_length", 128) or 128,
            vocab_size=getattr(config, "vocab_size", 10000) or 10000,
            tokenizer=getattr(config, "tokenizer", "bpe") or "bpe",
            lowercase=getattr(config, "lowercase", True)
            if getattr(config, "lowercase", True) is not None
            else True,
            remove_punctuation=getattr(config, "remove_punctuation", False)
            if getattr(config, "remove_punctuation", False) is not None
            else False,
        )

    transform = _build_transforms_if_any(config.transforms)
    transform = _ensure_tensor_transform(transform)
    return get_dataset(
        name=config.name,
        root_dir=os.path.join("..", "data"),
        transform=transform,
        split=config.split,
    )


def _create_image_folder(config: ImageFolderDatasetConfig) -> Dataset:
    """Create an ImageFolder dataset with optional train/test split."""
    if not os.path.isdir(config.root):
        raise ValueError(f"Image folder path does not exist: {config.root}")

    transform = _build_transforms_if_any(config.transforms)
    transform = _ensure_tensor_transform(transform)
    full_dataset = ImageFolder(root=config.root, transform=transform)

    if config.split_ratio < 1.0:
        # Return the full dataset; caller can use split_dataset() for the split
        return full_dataset

    return full_dataset


def _create_custom(config: CustomDatasetConfig) -> Dataset:
    """Create a custom dataset based on modality."""
    transform = _build_transforms_if_any(config.transforms)
    if config.modality == "image":
        transform = _ensure_tensor_transform(transform)

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
        lowercase=getattr(config, "lowercase", True),
        remove_punctuation=getattr(config, "remove_punctuation", False),
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



def _create_text_lm(config: "TextDatasetConfig") -> "CharLMDataset":
    """Create a language model dataset from TextDatasetConfig."""
    return CharLMDataset(
        text_source=config.text_source,
        builtin_name=config.builtin_name,
        file_path=config.file_path,
        text_content=config.text_content,
        context_length=config.context_length,
        split="train",
        train_split=config.train_split,
        tokenization=config.tokenization,
        bpe_vocab_size=config.bpe_vocab_size,
    )


def _build_transforms_if_any(transforms_list: list | None) -> Compose | None:
    """Build a transform pipeline from a list of TransformConfig, or return None."""
    if not transforms_list:
        return None
    transform_dicts = [t.model_dump() for t in transforms_list]
    return build_transforms(transform_dicts)


def _ensure_tensor_transform(transform: Any) -> Compose:
    """Ensure that ToTensor transform exists in the Compose pipeline for image datasets."""
    if transform is None:
        return Compose([ToTensor()])

    if not hasattr(transform, "transforms"):
        if isinstance(transform, ToTensor):
            return Compose([transform])
        return Compose([transform, ToTensor()])

    has_to_tensor = any(isinstance(t, ToTensor) for t in transform.transforms)
    if not has_to_tensor:
        new_transforms = list(transform.transforms)
        new_transforms.append(ToTensor())
        return Compose(new_transforms)

    return transform


def check_dataset_downloaded(name: str) -> bool:
    """Check if a predefined dataset has already been downloaded to disk."""
    if name == "AG_NEWS_SUBSET":
        return os.path.exists(os.path.join("..", "data", "ag_news_subset.csv"))

    registry = load_registry()
    if name not in registry:
        return False

    config = registry[name]
    try:
        module = importlib.import_module(config["module"])
        dataset_class = getattr(module, config["class"])
        default_params = config.get("default_params", {}).copy()

        # Override split parameters
        if "train" in default_params:
            default_params["train"] = True
        if "split" in default_params and "train" not in default_params:
            default_params["split"] = "train"

        # Explicitly set download=False so it raises if missing
        default_params["download"] = False

        root_dir = os.path.join("..", "data")
        dataset_class(root=root_dir, **default_params)
        return True
    except Exception:
        return False


def get_dataset_size(name: str) -> float | None:
    """Calculate the size of the dataset on disk in megabytes (MB)."""
    root_dir = os.path.join("..", "data")
    if name == "AG_NEWS_SUBSET":
        path = os.path.join(root_dir, "ag_news_subset.csv")
        if os.path.exists(path):
            return os.path.getsize(path) / (1024 * 1024)
        return None

    folder_mapping = {
        "MNIST": "MNIST",
        "FashionMNIST": "FashionMNIST",
        "CIFAR10": "cifar-10-batches-py",
        "CIFAR100": "cifar-100-python",
        "EMNIST": "EMNIST",
        "QMNIST": "QMNIST",
    }

    if name in folder_mapping:
        folder_path = os.path.join(root_dir, folder_mapping[name])
        if os.path.isdir(folder_path):
            total_size = 0
            for dirpath, _, filenames in os.walk(folder_path):
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    total_size += os.path.getsize(fp)
            return total_size / (1024 * 1024)

    if name == "SVHN":
        total_size = 0
        for f in ["train_32x32.mat", "test_32x32.mat"]:
            fp = os.path.join(root_dir, f)
            if os.path.exists(fp):
                total_size += os.path.getsize(fp)
        if total_size > 0:
            return total_size / (1024 * 1024)

    return None
