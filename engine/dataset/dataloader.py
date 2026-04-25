from torch.utils.data import DataLoader


def create_dataloader(
    dataset,
    batch_size=32,
    shuffle=True,
    num_workers=0,
    pin_memory=False,
    drop_last=False,
):
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
