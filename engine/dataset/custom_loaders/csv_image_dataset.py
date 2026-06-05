"""CSV-backed image dataset loader.

Reads a CSV file containing image paths and labels, loads images with PIL,
and applies optional transforms. Used when CustomDatasetConfig.modality="image"
and label_source="csv".
"""

from __future__ import annotations

import os
from typing import Any

import pandas as pd
from PIL import Image
from torch.utils.data import Dataset


class CSVImageDataset(Dataset):
    """A PyTorch Dataset that loads images from paths listed in a CSV file.

    The CSV must contain at least two columns: one with image file paths
    (relative to ``root``) and one with integer or string labels.

    Args:
        root: Root directory that image paths are relative to.
        label_file: Path to the CSV file.
        image_column: Column name containing image paths.
        label_column: Column name containing labels.
        transform: Optional torchvision transform pipeline.
        file_pattern: Glob pattern (reserved for future filtering).
    """

    def __init__(
        self,
        root: str,
        label_file: str,
        image_column: str = "image",
        label_column: str = "label",
        transform: Any | None = None,
        file_pattern: str = "*.jpg",
    ) -> None:
        self.root = root
        self.transform = transform
        self.file_pattern = file_pattern

        if not os.path.isfile(label_file):
            raise FileNotFoundError(f"Label file not found: {label_file}")

        self.df = pd.read_csv(label_file)

        if image_column not in self.df.columns:
            raise ValueError(
                f"Image column '{image_column}' not found in {label_file}. "
                f"Available columns: {list(self.df.columns)}"
            )
        if label_column not in self.df.columns:
            raise ValueError(
                f"Label column '{label_column}' not found in {label_file}. "
                f"Available columns: {list(self.df.columns)}"
            )

        self.image_column = image_column
        self.label_column = label_column

        # Build label-to-index mapping for string labels
        unique_labels = sorted(self.df[self.label_column].unique())
        self.class_to_idx = {label: idx for idx, label in enumerate(unique_labels)}
        self.classes = unique_labels

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(self, index: int) -> tuple[Any, int]:
        row = self.df.iloc[index]
        img_path = os.path.join(self.root, str(row[self.image_column]))
        label_raw = row[self.label_column]

        image = Image.open(img_path).convert("RGB")
        label = (
            self.class_to_idx[label_raw]
            if isinstance(label_raw, str)
            else int(label_raw)
        )

        if self.transform is not None:
            image = self.transform(image)

        return image, label
