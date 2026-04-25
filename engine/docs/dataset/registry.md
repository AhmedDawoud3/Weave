# Registry

::: dataset.registry
    options:
      show_source: true

## Overview

Handles loading and parsing of the dataset registry JSON file. The registry is the single source of truth for predefined dataset configurations.

## Functions

### `load_registry()`

Load the dataset registry from disk.

**Returns:** `dict` — The parsed JSON registry

**Raises:**

| Exception | Condition |
|-----------|-----------|
| `FileNotFoundError` | Registry file not found at expected path |

**Registry location:** `dataset/datasets_registry.json` (relative to the package)

### `list_predefined_datasets()`

Get a list of all available predefined dataset names.

**Returns:** `list[str]` — Dataset names (e.g. `["MNIST", "CIFAR10"]`)

## Registry Format

The `datasets_registry.json` file maps dataset names to configuration objects:

```json
{
    "MNIST": {
        "module": "torchvision.datasets",
        "class": "MNIST",
        "default_params": {
            "train": true,
            "download": true
        },
        "shape": [1, 28, 28],
        "num_classes": 10
    },
    "CIFAR10": {
        "module": "torchvision.datasets",
        "class": "CIFAR10",
        "default_params": {
            "train": true,
            "download": true
        },
        "shape": [3, 32, 32],
        "num_classes": 10
    }
}
```

### Registry Entry Fields

| Field | Type | Description |
|-------|------|-------------|
| `module` | `str` | Python module path (e.g. `"torchvision.datasets"`) |
| `class` | `str` | Class name within the module |
| `default_params` | `dict` | Default constructor arguments |
| `shape` | `list[int]` | Per-sample tensor shape |
| `num_classes` | `int` | Number of output classes |

## Currently Registered Datasets

| Name | Shape | Classes | Description |
|------|-------|---------|-------------|
| MNIST | `[1, 28, 28]` | 10 | Handwritten digits (grayscale) |
| CIFAR10 | `[3, 32, 32]` | 10 | Natural images (RGB) |
