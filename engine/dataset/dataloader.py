from __future__ import annotations

from collections.abc import Sized
from typing import cast

from torch.utils.data import DataLoader, Dataset, Subset, random_split

from schemas import DataLoaderConfig


def create_dataloader(
    dataset: Dataset,
    batch_size: int = 32,
    shuffle: bool = True,
    num_workers: int = 0,
    pin_memory: bool = False,
    drop_last: bool = False,
) -> DataLoader:
    """Create a PyTorch DataLoader for a dataset.

    Thin wrapper around torch.utils.data.DataLoader with sensible defaults.

    Args:
        dataset: The dataset to load.
        batch_size: Number of samples per batch. Defaults to 32.
        shuffle: Whether to shuffle data at every epoch. Defaults to True.
        num_workers: Number of subprocesses for data loading. Defaults to 0.
        pin_memory: If True, copies data into pinned memory. Defaults to False.
        drop_last: If True, drops the last incomplete batch. Defaults to False.

    Returns:
        DataLoader: A PyTorch DataLoader instance.
    """
    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=shuffle,
        num_workers=num_workers,
        pin_memory=pin_memory,
        drop_last=drop_last,
    )


def create_dataloader_from_config(
    dataset: Dataset, config: DataLoaderConfig
) -> DataLoader:
    """Create a PyTorch DataLoader from a DataLoaderConfig schema.

    Args:
        dataset: The dataset to load.
        config: DataLoaderConfig with batch_size, shuffle, num_workers, etc.

    Returns:
        DataLoader: A PyTorch DataLoader instance.
    """
    return DataLoader(
        dataset,
        batch_size=config.batch_size,
        shuffle=config.shuffle,
        num_workers=config.num_workers,
        pin_memory=config.pin_memory,
        drop_last=config.drop_last,
    )


def split_dataset(
    dataset: Dataset,
    split_ratio: float = 0.8,
) -> list[Subset]:
    """Split a dataset into train and validation subsets.

    Uses torch.utils.data.random_split with lengths proportional to
    ``split_ratio``.

    Args:
        dataset: The full dataset to split.
        split_ratio: Fraction of data to use for training. Defaults to 0.8.

    Returns:
        list[Subset]: [train_subset, val_subset]
    """
    total = len(cast(Sized, dataset))
    train_len = int(total * split_ratio)
    val_len = total - train_len

    return random_split(dataset, [train_len, val_len])
