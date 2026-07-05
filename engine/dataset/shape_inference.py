"""
shape_inference.py — Dataset shape inference for Weave Engine
=============================================================
Computes per-sample and batch tensor shapes for dataset configurations
without requiring actual data download or loading.
"""

import torch

from schemas import (
    CustomDatasetConfig,
    DatasetConfig,
    ImageFolderDatasetConfig,
    PredefinedDatasetConfig,
    TransformConfig,
)

from .registry import load_registry
from .transform_factory import build_transforms


def infer_dataset_shape(config: DatasetConfig) -> dict:
    """
    Infer the tensor shape produced by a dataset configuration.

    Returns {
        "status": "success"|"error",
        "per_sample_shape": [...],
        "batch_shape": [...],
        "num_classes": int|None,
        "message": str|None,
    }
    """
    if isinstance(config, PredefinedDatasetConfig):
        return _infer_predefined(config)
    elif isinstance(config, ImageFolderDatasetConfig):
        return _infer_image_folder(config)
    elif isinstance(config, CustomDatasetConfig):
        return _infer_custom(config)
    else:
        return {"status": "error", "message": "Unknown dataset source."}


def _infer_predefined(config: PredefinedDatasetConfig) -> dict:
    """Look up static shape from the registry, then apply transforms."""
    registry = load_registry()

    if config.name not in registry:
        return {
            "status": "error",
            "message": f"Dataset '{config.name}' not found in registry. Available: {list(registry.keys())}",
        }

    entry = registry[config.name]
    base_shape = entry.get("shape")
    if entry.get("modality") == "text":
        max_length = getattr(config, "max_length", None) or entry.get(
            "default_params", {}
        ).get("max_length", 128)
        base_shape = [max_length]
    num_classes = entry.get("num_classes")

    if base_shape is None:
        return {
            "status": "error",
            "message": f"Dataset '{config.name}' has no shape information in the registry.",
        }

    # Apply transforms to the base shape
    per_sample_shape = _apply_transforms_to_shape(base_shape, config.transforms)

    batch_size = config.dataloader.batch_size
    batch_shape = [batch_size] + per_sample_shape

    return {
        "status": "success",
        "per_sample_shape": per_sample_shape,
        "batch_shape": batch_shape,
        "num_classes": num_classes,
    }


def _infer_image_folder(config: ImageFolderDatasetConfig) -> dict:
    """ImageFolder datasets default to [3, H, W], then apply transforms."""
    # Standard RGB image shape before any transforms.
    # The actual H, W depend on the image files, but we default to a
    # reasonable assumption. If transforms include Resize, that overrides.
    base_shape = [3, 256, 256]

    per_sample_shape = _apply_transforms_to_shape(base_shape, config.transforms)

    batch_size = config.dataloader.batch_size
    batch_shape = [batch_size] + per_sample_shape

    # Try to get num_classes from scanner if the path exists
    num_classes = None
    try:
        from .scanner import scan_folder

        scan_result = scan_folder(config.root)
        num_classes = scan_result.get("num_classes")
    except (ValueError, OSError):
        pass  # Path may not exist yet (user is still configuring)

    return {
        "status": "success",
        "per_sample_shape": per_sample_shape,
        "batch_shape": batch_shape,
        "num_classes": num_classes,
    }


def _infer_custom(config: CustomDatasetConfig) -> dict:
    """Infer shape based on the custom dataset modality."""
    modality = config.modality

    if modality == "image":
        base_shape = [3, 256, 256]
        per_sample_shape = _apply_transforms_to_shape(base_shape, config.transforms)
        num_classes = None  # Would need to scan label source
    elif modality == "text":
        # Text data: tokenized sequence of max_length
        per_sample_shape = [config.max_length]
        num_classes = None
    elif modality == "tabular":
        # Tabular: one feature per column
        num_features = len(config.feature_columns) if config.feature_columns else 1
        per_sample_shape = [num_features]
        num_classes = None
    elif modality == "audio":
        # Audio: mel spectrogram shape [n_mels, time_frames]
        # time_frames ≈ sample_rate * max_duration_sec / hop_length
        # Default hop_length = 512 for mel spectrogram
        hop_length = 512
        time_frames = int(config.sample_rate * config.max_duration_sec / hop_length) + 1
        per_sample_shape = [config.n_mels, time_frames]
        num_classes = None
    else:
        return {
            "status": "error",
            "message": f"Unknown custom dataset modality: '{modality}'.",
        }

    # Apply transforms only for image modality
    if modality == "image" and config.transforms:
        per_sample_shape = _apply_transforms_to_shape(
            per_sample_shape, config.transforms
        )

    batch_size = config.dataloader.batch_size
    batch_shape = [batch_size] + per_sample_shape

    return {
        "status": "success",
        "per_sample_shape": per_sample_shape,
        "batch_shape": batch_shape,
        "num_classes": num_classes,
    }


def _apply_transforms_to_shape(
    base_shape: list[int], transforms: list[TransformConfig]
) -> list[int]:
    """
    Pass a dummy tensor through the transform pipeline to determine
    the output shape. If no transforms, return base_shape unchanged.
    """
    if not transforms:
        return base_shape

    try:
        transform_dicts = [t.model_dump() for t in transforms]
        compose = build_transforms(transform_dicts)

        dummy = torch.zeros(base_shape)
        result = compose(dummy)
        return list(result.shape)
    except Exception:
        # If transforms fail to apply (e.g., Normalize on wrong shape),
        # fall back to the base shape
        return base_shape
