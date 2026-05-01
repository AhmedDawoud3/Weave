# DataLoader

::: dataset.dataloader
    options:
      show_source: true

## Overview

Wraps dataset and transform into a PyTorch `DataLoader`. Provides both a simple wrapper function and a config-driven creation function, plus dataset splitting.

## Functions

### `create_dataloader(dataset, batch_size, shuffle, num_workers, pin_memory, drop_last)`

Create a PyTorch DataLoader for a dataset. (Legacy API, preserved for backward compatibility.)

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

### `create_dataloader_from_config(dataset, config)`

Create a PyTorch DataLoader from a `DataLoaderConfig` schema. Used by the API and visual editor.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `dataset` | `Dataset` | The dataset to load |
| `config` | `DataLoaderConfig` | DataLoader configuration schema |

**Returns:** `DataLoader`

### `split_dataset(dataset, split_ratio)`

Split a dataset into train and validation subsets.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `dataset` | `Dataset` | — | The dataset to split |
| `split_ratio` | `float` | `0.8` | Fraction of data to use for training |

**Returns:** `list[Subset]` — `[train_subset, val_subset]`

## Examples

### Legacy API

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

### Config-driven API

```python
from dataset.dataloader import create_dataloader_from_config, split_dataset
from dataset.dataset_factory import get_dataset_from_config
from schemas import PredefinedDatasetConfig, DataLoaderConfig

config = PredefinedDatasetConfig(name="CIFAR10", split="train")
dataset = get_dataset_from_config(config)

# Split into train/val
train_ds, val_ds = split_dataset(dataset, split_ratio=0.8)

# Create dataloader from config
dl_config = DataLoaderConfig(batch_size=64, shuffle=True, num_workers=4, pin_memory=True)
loader = create_dataloader_from_config(train_ds, dl_config)
```

!!! note "Default differences from schemas"
    The `DataLoaderConfig` schema defaults to `num_workers=4` and `pin_memory=True`, while the legacy `create_dataloader` wrapper defaults to `num_workers=0` and `pin_memory=False`. The schema defaults are used when creating dataloaders through the API; the wrapper provides safe defaults for direct Python usage.
