"""Dataset config validator — full validation beyond shape inference.

Checks that required fields are present, paths exist, column names
are valid, and transforms are compatible. Returns structured errors
and warnings for the frontend.
"""

from __future__ import annotations

import os
from typing import Any

from schemas import (
    CustomDatasetConfig,
    DatasetConfig,
    ImageFolderDatasetConfig,
    PredefinedDatasetConfig,
)

from .registry import load_registry, load_transforms_registry


def validate_dataset_config(config: DatasetConfig) -> dict[str, Any]:
    """Validate a dataset configuration and return errors/warnings.

    Args:
        config: A DatasetConfig (any source type).

    Returns:
        dict with keys:
            - "valid" (bool): Whether the config is usable.
            - "errors" (list[str]): Blocking issues.
            - "warnings" (list[str]): Non-blocking suggestions.
    """
    errors: list[str] = []
    warnings: list[str] = []

    if isinstance(config, PredefinedDatasetConfig):
        _validate_predefined(config, errors, warnings)
    elif isinstance(config, ImageFolderDatasetConfig):
        _validate_image_folder(config, errors, warnings)
    elif isinstance(config, CustomDatasetConfig):
        _validate_custom(config, errors, warnings)
    else:
        errors.append(f"Unknown dataset source type: {type(config)}")

    # Validate transforms for all config types
    _validate_transforms(config, errors, warnings)

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
    }


def _validate_predefined(
    config: PredefinedDatasetConfig,
    errors: list[str],
    warnings: list[str],
) -> None:
    """Validate a predefined dataset config."""
    registry = load_registry()
    if config.name not in registry:
        errors.append(
            f"Dataset '{config.name}' not found in registry. "
            f"Available: {list(registry.keys())}"
        )
        return

    if config.split not in ("train", "test"):
        errors.append(f"Invalid split '{config.split}'. Must be 'train' or 'test'.")


def _validate_image_folder(
    config: ImageFolderDatasetConfig,
    errors: list[str],
    warnings: list[str],
) -> None:
    """Validate an image folder dataset config."""
    if not config.root:
        errors.append("Image folder dataset requires a 'root' path.")
        return

    if not os.path.isdir(config.root):
        # Path may not exist yet (user is still configuring)
        warnings.append(f"Root path does not exist yet: {config.root}")
        return

    # Check for class subfolders
    subdirs = [d for d in os.listdir(config.root) if os.path.isdir(os.path.join(config.root, d))]
    if len(subdirs) == 0:
        errors.append(
            f"No class subfolders found in '{config.root}'. "
            "ImageFolder expects subdirectories as class labels."
        )
    elif len(subdirs) == 1:
        warnings.append(
            f"Only 1 class subfolder found in '{config.root}'. "
            "Classification typically requires at least 2 classes."
        )

    if config.split_ratio <= 0 or config.split_ratio > 1:
        errors.append(f"split_ratio must be between 0 and 1, got {config.split_ratio}.")


def _validate_custom(
    config: CustomDatasetConfig,
    errors: list[str],
    warnings: list[str],
) -> None:
    """Validate a custom dataset config based on modality."""
    if config.modality == "image":
        _validate_custom_image(config, errors, warnings)
    elif config.modality == "text":
        _validate_custom_text(config, errors, warnings)
    elif config.modality == "tabular":
        _validate_custom_tabular(config, errors, warnings)
    elif config.modality == "audio":
        _validate_custom_audio(config, errors, warnings)
    else:
        errors.append(f"Unknown modality: {config.modality}")


def _validate_custom_image(
    config: CustomDatasetConfig,
    errors: list[str],
    warnings: list[str],
) -> None:
    """Validate custom image modality."""
    if config.label_source == "csv":
        if not config.label_file:
            errors.append("CSV label source requires 'label_file' path.")
        elif not os.path.isfile(config.label_file):
            warnings.append(f"Label file does not exist: {config.label_file}")

        if not config.image_column:
            warnings.append("No 'image_column' specified. Defaulting to 'image'.")
        if not config.label_column:
            warnings.append("No 'label_column' specified. Defaulting to 'label'.")
    else:
        # Folder-based
        if not config.root:
            errors.append("Custom image dataset requires 'root' when not using CSV labels.")
        elif not os.path.isdir(config.root):
            warnings.append(f"Root path does not exist: {config.root}")


def _validate_custom_text(
    config: CustomDatasetConfig,
    errors: list[str],
    warnings: list[str],
) -> None:
    """Validate custom text modality."""
    if not config.file_path:
        errors.append("Text dataset requires 'file_path'.")
    elif not os.path.isfile(config.file_path):
        warnings.append(f"Data file does not exist: {config.file_path}")

    if not config.text_column:
        warnings.append("No 'text_column' specified. Defaulting to 'text'.")

    if config.max_length <= 0:
        errors.append(f"max_length must be positive, got {config.max_length}.")

    if config.vocab_size <= 0:
        errors.append(f"vocab_size must be positive, got {config.vocab_size}.")


def _validate_custom_tabular(
    config: CustomDatasetConfig,
    errors: list[str],
    warnings: list[str],
) -> None:
    """Validate custom tabular modality."""
    if not config.file_path:
        errors.append("Tabular dataset requires 'file_path'.")
    elif not os.path.isfile(config.file_path):
        warnings.append(f"Data file does not exist: {config.file_path}")

    if not config.feature_columns:
        warnings.append(
            "No 'feature_columns' specified. All non-target columns will be used."
        )

    if not config.target_column:
        warnings.append("No 'target_column' specified. Dataset will return 0 as label.")


def _validate_custom_audio(
    config: CustomDatasetConfig,
    errors: list[str],
    warnings: list[str],
) -> None:
    """Validate custom audio modality."""
    if not config.root:
        errors.append("Audio dataset requires 'root' directory.")
    elif not os.path.isdir(config.root):
        warnings.append(f"Audio root path does not exist: {config.root}")

    if config.sample_rate <= 0:
        errors.append(f"sample_rate must be positive, got {config.sample_rate}.")

    if config.max_duration_sec <= 0:
        errors.append(f"max_duration_sec must be positive, got {config.max_duration_sec}.")

    if config.n_mels <= 0:
        errors.append(f"n_mels must be positive, got {config.n_mels}.")


def _validate_transforms(
    config: DatasetConfig,
    errors: list[str],
    warnings: list[str],
) -> None:
    """Validate the transform pipeline for any dataset config."""
    transforms_list = getattr(config, "transforms", None)
    if not transforms_list:
        return

    transforms_registry = load_transforms_registry()

    for t in transforms_list:
        t_type = t.type if hasattr(t, "type") else t.get("type")
        if t_type and t_type not in transforms_registry:
            errors.append(f"Transform '{t_type}' is not in the transforms registry.")
        elif t_type == "Normalize":
            # Normalize should come after ToTensor
            warnings.append(
                "Normalize transform requires tensor input. "
                "Make sure ToTensor comes before Normalize in the pipeline."
            )

    # Check for ToTensor presence in image datasets
    has_to_tensor = any(
        (t.type if hasattr(t, "type") else t.get("type")) == "ToTensor"
        for t in transforms_list
    )

    from schemas import (
        CustomDatasetConfig,
        ImageFolderDatasetConfig,
        PredefinedDatasetConfig,
    )

    is_image = isinstance(config, (PredefinedDatasetConfig, ImageFolderDatasetConfig)) or (
        isinstance(config, CustomDatasetConfig) and config.modality == "image"
    )

    if is_image and transforms_list and not has_to_tensor:
        warnings.append(
            "Image dataset transforms do not include ToTensor. "
            "Most PyTorch models expect tensor inputs."
        )
