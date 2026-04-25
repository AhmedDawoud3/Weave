# Dataset Factory

::: dataset.dataset_factory
    options:
      show_source: true

## Overview

Dynamically instantiates torchvision datasets using the registry. Given a dataset name, it looks up the module path and class name, imports the class, and creates an instance.

## Function

### `get_dataset(name, root_dir, transform, split)`

Create a dataset instance from the registry.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | `str` | — | Dataset name (must exist in registry) |
| `root_dir` | `str` | — | Directory to download/load data |
| `transform` | `callable \| None` | `None` | Transform pipeline to apply |
| `split` | `str` | `"train"` | `"train"` or `"test"` |

**Returns:** Dataset instance

**Raises:**

| Exception | Condition |
|-----------|-----------|
| `ValueError` | Dataset name not in registry |

## How It Works

1. Load the registry via `load_registry()`
2. Look up the dataset name
3. Dynamically import the module: `importlib.import_module(config["module"])`
4. Get the class: `getattr(module, config["class"])`
5. Override the `train` parameter based on `split`
6. Instantiate with `root`, `transform`, and default params

## Example

```python
from dataset.dataset_factory import get_dataset

dataset = get_dataset("MNIST", "./data", split="train")
# Equivalent to:
# torchvision.datasets.MNIST(root="./data", train=True, download=True)
```
