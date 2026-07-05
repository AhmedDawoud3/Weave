"""Dataset preview — return a few samples for frontend display.

Lets the frontend show sample data from a dataset config without
requiring a full training run.
"""

from __future__ import annotations

import base64
import io
import copy
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
    """Preview a few samples from a dataset configuration with side-by-side comparison.

    Returns sample data in a frontend-friendly format:
    - Images → base64-encoded thumbnails
    - Text → raw text strings vs tokens/token IDs
    - Tabular → raw row dict vs normalized features
    - Audio → raw waveform stats vs features

    Args:
        config: A DatasetConfig (any source type).
        num_samples: Number of samples to return. Defaults to 5.

    Returns:
        dict with keys:
            - "status": "success" or "error"
            - "samples": list of sample dicts containing "raw" and "transformed"
            - "total_size": total dataset size (if determinable)
            - "modality": the dataset modality
            - "message": error message (if status is "error")
    """
    try:
        # Load the transformed dataset (with all user transforms)
        transformed_dataset = get_dataset_from_config(config)
        total_size = len(cast(Sized, transformed_dataset))
        indices = list(range(min(num_samples, total_size)))

        # Try to load the raw dataset (by deep-copying and clearing transforms)
        try:
            raw_config = copy.deepcopy(config)
            raw_config.transforms = []
            raw_dataset = get_dataset_from_config(raw_config)
        except Exception:
            raw_dataset = None

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

        samples = []
        for idx in indices:
            # 1. Fetch transformed item
            transformed_item = transformed_dataset[idx]
            transformed_data, label = transformed_item[0], transformed_item[1]

            # Format transformed sample
            transformed_sample = _format_sample(transformed_data, label, modality)

            # For text modality, enrich with actual token list if the loader supports it
            if modality == "text" and hasattr(transformed_dataset, "_tokenize") and hasattr(transformed_dataset, "_preprocess"):
                try:
                    # Retrieve the raw text first to re-tokenize for tokens display
                    if raw_dataset is not None and hasattr(raw_dataset, "df") and hasattr(raw_dataset, "text_column"):
                        raw_text_str = str(raw_dataset.df.iloc[idx][raw_dataset.text_column])
                    elif hasattr(transformed_dataset, "df") and hasattr(transformed_dataset, "text_column"):
                        raw_text_str = str(transformed_dataset.df.iloc[idx][transformed_dataset.text_column])
                    else:
                        raw_text_str = ""

                    if raw_text_str:
                        cleaned = transformed_dataset._preprocess(raw_text_str)
                        tokens_list = transformed_dataset._tokenize(cleaned)
                        transformed_sample["tokens"] = tokens_list
                except Exception:
                    pass

            # 2. Fetch and format raw sample
            if raw_dataset is not None:
                try:
                    raw_item = raw_dataset[idx]
                    raw_data = raw_item[0]

                    if modality == "text" and hasattr(raw_dataset, "df") and hasattr(raw_dataset, "text_column"):
                        # For raw text, we want the raw string, not the tokenized ID tensor
                        raw_text_val = str(raw_dataset.df.iloc[idx][raw_dataset.text_column])
                        raw_sample = {"label": label, "data_type": "text", "text": raw_text_val}
                    elif modality == "tabular" and hasattr(raw_dataset, "df") and hasattr(raw_dataset, "feature_columns"):
                        # For raw tabular, we want the raw values row dictionary
                        raw_row = raw_dataset.df.iloc[idx][raw_dataset.feature_columns].to_dict()
                        raw_sample = {"label": label, "data_type": "tabular", "features": raw_row}
                    else:
                        raw_sample = _format_sample(raw_data, label, modality)
                except Exception:
                    raw_sample = transformed_sample
            else:
                raw_sample = transformed_sample

            samples.append({
                "label": label,
                "raw": raw_sample,
                "transformed": transformed_sample
            })

        return {
            "status": "success",
            "samples": samples,
            "total_size": total_size,
            "modality": modality,
        }
    except Exception as e:
        return {
            "status": "error",
            "samples": [],
            "total_size": 0,
            "message": str(e),
        }


def _format_sample(data: Any, label: int, modality: str) -> dict[str, Any]:
    """Format a single dataset item for JSON serialization based on modality."""
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
