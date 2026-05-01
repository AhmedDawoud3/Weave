"""Custom dataset loaders for non-torchvision data sources.

Each loader is a standard PyTorch Dataset that reads from the fields
defined in CustomDatasetConfig (schemas.py).
"""

from typing import Any

from .csv_image_dataset import CSVImageDataset
from .tabular_dataset import TabularDataset
from .text_dataset import TextDataset

try:
    from .audio_dataset import AudioDataset
except (ImportError, OSError):
    # OSError raised on CPU-only runners where CUDA shared libs are missing
    AudioDataset: Any = None

__all__ = ["CSVImageDataset", "TextDataset", "TabularDataset", "AudioDataset"]
