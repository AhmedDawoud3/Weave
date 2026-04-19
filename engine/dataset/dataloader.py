from torch.utils.data import DataLoader


def create_dataloader(
    dataset,
    batch_size=32,
    shuffle=True,
    num_workers=0,
    pin_memory=False,
    drop_last=False,
):
    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=shuffle,
        num_workers=num_workers,
        pin_memory=pin_memory,
        drop_last=drop_last,
    )
