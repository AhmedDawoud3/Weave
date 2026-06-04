"""Tabular dataset loader.

Reads a CSV file with feature and target columns, handles categorical
encoding and optional normalization. Used when
CustomDatasetConfig.modality="tabular".
"""

from __future__ import annotations

import os
from typing import Any

import pandas as pd
import torch
from torch.utils.data import Dataset


class TabularDataset(Dataset):
    """A PyTorch Dataset for tabular data from a CSV file.

    Handles categorical encoding (label encoding) and optional
    z-score normalization of numerical features.

    Args:
        file_path: Path to the CSV file.
        feature_columns: List of column names to use as features.
        target_column: Column name for the target/label.
        categorical_columns: Subset of feature_columns that are categorical.
        normalize: Whether to z-score normalize numerical features.
    """

    def __init__(
        self,
        file_path: str,
        feature_columns: list[str] | None = None,
        target_column: str | None = None,
        categorical_columns: list[str] | None = None,
        normalize: bool = True,
    ) -> None:
        if not os.path.isfile(file_path):
            raise FileNotFoundError(f"Data file not found: {file_path}")

        self.df = pd.read_csv(file_path)
        self.target_column = target_column
        self.normalize = normalize
        self.categorical_columns = categorical_columns or []

        # Auto-detect feature columns if not provided
        if feature_columns:
            self.feature_columns = feature_columns
        else:
            cols = list(self.df.columns)
            self.feature_columns = [c for c in cols if c != target_column]

        # Validate columns exist
        for col in self.feature_columns:
            if col not in self.df.columns:
                raise ValueError(
                    f"Feature column '{col}' not found. "
                    f"Available: {list(self.df.columns)}"
                )

        # Label-encode categorical columns
        self._encoders: dict[str, dict[Any, int]] = {}
        for col in self.categorical_columns:
            if col in self.feature_columns:
                unique_vals = sorted(self.df[col].unique())
                self._encoders[col] = {v: i for i, v in enumerate(unique_vals)}

        # Compute normalization stats for numerical columns
        self._mean: dict[str, float] = {}
        self._std: dict[str, float] = {}
        if normalize:
            num_cols = [
                c for c in self.feature_columns if c not in self.categorical_columns
            ]
            for col in num_cols:
                self._mean[col] = float(self.df[col].mean())
                self._std[col] = float(self.df[col].std())
                # Avoid division by zero
                if self._std[col] == 0:
                    self._std[col] = 1.0

        # Build label mapping for target
        self.class_to_idx: dict[str, int] = {}
        self.classes: list[str] = []
        if target_column and target_column in self.df.columns:
            unique_labels = sorted(self.df[target_column].unique())
            self.classes = [str(label) for label in unique_labels]
            self.class_to_idx = {
                str(label): idx for idx, label in enumerate(unique_labels)
            }

    def _get_features(self, row: pd.Series) -> list[float]:
        """Extract and transform feature values from a DataFrame row."""
        features: list[float] = []
        for col in self.feature_columns:
            val = row[col]
            if col in self._encoders:
                val = self._encoders[col].get(val, 0)
            elif col in self._mean:
                val = (float(val) - self._mean[col]) / self._std[col]
            else:
                val = float(val)
            features.append(val)
        return features

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor | int]:
        row = self.df.iloc[index]
        features = torch.tensor(self._get_features(row), dtype=torch.float32)

        if self.target_column and self.target_column in self.df.columns:
            label_raw = str(row[self.target_column])
            label = self.class_to_idx.get(label_raw, 0)
            return features, label

        return features, 0
