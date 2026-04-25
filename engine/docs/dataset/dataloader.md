# DataLoader

::: dataset.dataloader
    options:
      show_source: true

## Overview

A thin wrapper around `torch.utils.data.DataLoader` that provides a clean interface consistent with the rest of the dataset module.

## Function

### `create_dataloader(dataset, batch_size, shuffle, num_workers, pin_memory, drop_last)`

Create a PyTorch DataLoader for a dataset.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `dataset` | `Dataset` | — | The dataset to load |
| `batch_size` | `int` | `32` | Number of samples per batch |
| `shuffle` | `bool` | `True` | Whether to shuffle data at every epoch |
| `num_workers` | `int` | `0` | Number of subprocesses for data loading |
| `pin_memory` | `bool` | `False` | If `True`, copies data into pinned memory |
| `drop_last` | `bool` | `False` | If `True`, drops the last incomplete batch |

**Returns:** `DataLoader`

## Example

```python
from dataset.dataloader import create_dataloader
from dataset.dataset_factory import get_dataset
from dataset.transform_factory import build_transforms

transform = build_transforms([
    {"type": "ToTensor"},
    {"type": "Normalize", "mean": [0.1307], "std": [0.3081]}
])

dataset = get_dataset("MNIST", "./data", transform=transform, split="train")
loader = create_dataloader(dataset, batch_size=64, shuffle=True, num_workers=2)

for batch_x, batch_y in loader:
    # batch_x shape: [64, 1, 28, 28]
    # batch_y shape: [64]
    pass
```

!!! note "Default differences from schemas"
    The `DataLoaderConfig` schema defaults to `num_workers=4` and `pin_memory=True`, while this wrapper defaults to `num_workers=0` and `pin_memory=False`. The schema defaults are used when creating dataloaders through the API; this wrapper provides safe defaults for direct Python usage.
