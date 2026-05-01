"""Dataset preview — return a few samples for frontend display.

Lets the frontend show sample data from a dataset config without
requiring a full training run.
"""

from __future__ import annotations

import base64
import io
from collections.abc import Sized
from typing import Any, cast

from PIL import Image
from torch.utils.data import Dataset

from schemas import DatasetConfig

from .dataset_factory import get_dataset_from_config


def preview_dataset(
    config: DatasetConfig,
    num_samples: int = 5,
) -> dict[str, Any]:
    """Preview a few samples from a dataset configuration.

    Returns sample data in a frontend-friendly format:
    - Images → base64-encoded thumbnails
    - Text → raw text strings
    - Tabular → row dictionaries
    - Audio → duration + waveform stats

    Args:
        config: A DatasetConfig (any source type).
        num_samples: Number of samples to return. Defaults to 5.

    Returns:
        dict with keys:
            - "status": "success" or "error"
            - "samples": list of sample dicts (format depends on modality)
            - "total_size": total dataset size (if determinable)
            - "message": error message (if status is "error")
    """
    try:
        dataset = get_dataset_from_config(config)
        return _preview_from_dataset(dataset, config, num_samples)
    except Exception as e:
        return {
            "status": "error",
            "samples": [],
            "total_size": 0,
            "message": str(e),
        }


def _preview_from_dataset(
    dataset: Dataset,
    config: DatasetConfig,
    num_samples: int,
) -> dict[str, Any]:
    """Extract preview samples from an instantiated dataset."""
    total_size = len(cast(Sized, dataset))
    indices = list(range(min(num_samples, total_size)))

    samples = []
    for idx in indices:
        item = dataset[idx]
        sample = _format_sample(item, config)
        samples.append(sample)

    return {
        "status": "success",
        "samples": samples,
        "total_size": total_size,
    }


def _format_sample(item: tuple, config: DatasetConfig) -> dict[str, Any]:
    """Format a single dataset item for JSON serialization."""
    data, label = item[0], item[1]

    # Determine modality from config
    from schemas import (
        CustomDatasetConfig,
        ImageFolderDatasetConfig,
        PredefinedDatasetConfig,
    )

    if isinstance(config, CustomDatasetConfig):
        modality = config.modality
    elif isinstance(config, (PredefinedDatasetConfig, ImageFolderDatasetConfig)):
        modality = "image"
    else:
        modality = "unknown"

    if modality == "image":
        return _format_image_sample(data, label)
    elif modality == "text":
        return _format_text_sample(data, label)
    elif modality == "tabular":
        return _format_tabular_sample(data, label)
    elif modality == "audio":
        return _format_audio_sample(data, label)
    else:
        return {"label": label, "data_type": str(type(data).__name__)}


def _format_image_sample(data: Any, label: int) -> dict[str, Any]:
    """Format an image sample as a base64-encoded thumbnail."""
    try:
        from torchvision.transforms.functional import to_pil_image

        if hasattr(data, "shape"):
            # It's a tensor — convert to PIL
            pil_img = to_pil_image(data)
        elif isinstance(data, Image.Image):
            pil_img = data
        else:
            return {"label": label, "data_type": "image", "note": "Cannot preview"}

        # Create thumbnail
        pil_img.thumbnail((128, 128))
        buffer = io.BytesIO()
        pil_img.save(buffer, format="PNG")
        b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        return {
            "label": label,
            "data_type": "image",
            "thumbnail": f"data:image/png;base64,{b64}",
        }
    except Exception:
        return {"label": label, "data_type": "image", "note": "Preview unavailable"}


def _format_text_sample(data: Any, label: int) -> dict[str, Any]:
    """Format a text sample."""
    import torch

    if isinstance(data, torch.Tensor):
        # Token IDs — just show the shape and first few tokens
        return {
            "label": label,
            "data_type": "text",
            "token_ids_shape": list(data.shape),
            "first_10_tokens": data[:10].tolist(),
        }
    return {"label": label, "data_type": "text", "text": str(data)}


def _format_tabular_sample(data: Any, label: int) -> dict[str, Any]:
    """Format a tabular sample."""
    import torch

    if isinstance(data, torch.Tensor):
        return {
            "label": label,
            "data_type": "tabular",
            "features": data.tolist(),
            "num_features": len(data),
        }
    return {"label": label, "data_type": "tabular", "features": str(data)}


def _format_audio_sample(data: Any, label: int) -> dict[str, Any]:
    """Format an audio sample (mel spectrogram stats)."""
    import torch

    if isinstance(data, torch.Tensor):
        return {
            "label": label,
            "data_type": "audio",
            "shape": list(data.shape),
            "min": float(data.min()),
            "max": float(data.max()),
            "mean": float(data.mean()),
        }
    return {"label": label, "data_type": "audio", "note": str(type(data).__name__)}
