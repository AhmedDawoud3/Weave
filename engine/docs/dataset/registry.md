# Registry

::: dataset.registry
    options:
      show_source: true

## Overview

Handles loading and parsing of both the dataset and transform registry JSON files. The registries are the single source of truth for predefined dataset configurations and available transforms.

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

**Returns:** `list[str]` — Dataset names (e.g. `["MNIST", "CIFAR10", ...]`)

### `get_dataset_metadata(name)`

Get UI metadata for a specific dataset. Returns description, tags, and modality info for the visual editor.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `str` | Dataset name |

**Returns:** `dict | None` — Metadata dict with `description`, `tags`, `modality` keys, or `None` if not found

### `load_transforms_registry()`

Load the transforms registry from disk.

**Returns:** `dict` — The parsed JSON transforms registry

**Raises:**

| Exception | Condition |
|-----------|-----------|
| `FileNotFoundError` | Registry file not found at expected path |

**Registry location:** `dataset/transforms_registry.json` (relative to the package)

### `list_transforms()`

Get a list of all available transform names.

**Returns:** `list[str]` — Transform names (e.g. `["Resize", "CenterCrop", ...]`)

## Dataset Registry Format

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
        "num_classes": 10,
        "description": "Handwritten digit recognition dataset",
        "tags": ["grayscale", "digits", "beginner"],
        "modality": "image"
    }
}
```

### Dataset Registry Entry Fields

| Field | Type | Description |
|-------|------|-------------|
| `module` | `str` | Python module path (e.g. `"torchvision.datasets"`) |
| `class` | `str` | Class name within the module |
| `default_params` | `dict` | Default constructor arguments |
| `shape` | `list[int]` | Per-sample tensor shape |
| `num_classes` | `int` | Number of output classes |
| `description` | `str` | Human-readable description for the visual editor |
| `tags` | `list[str]` | Search/filter tags |
| `modality` | `str` | Data modality (e.g. `"image"`) |

## Currently Registered Datasets

| Name | Shape | Classes | Modality | Description |
|------|-------|---------|----------|-------------|
| MNIST | `[1, 28, 28]` | 10 | image | Handwritten digit recognition dataset |
| FashionMNIST | `[1, 28, 28]` | 10 | image | Fashion article images (grayscale) |
| CIFAR10 | `[3, 32, 32]` | 10 | image | Natural images (RGB) |
| CIFAR100 | `[3, 32, 32]` | 100 | image | Natural images, 100 classes (RGB) |
| EMNIST | `[1, 28, 28]` | 47 | image | Extended MNIST with letters |
| QMNIST | `[1, 28, 28]` | 10 | image | MNIST with revised labels |
| SVHN | `[3, 32, 32]` | 10 | image | Street View House Numbers |

## Transforms Registry Format

The `transforms_registry.json` file maps transform names to parameter schemas:

```json
{
    "Resize": {
        "description": "Resize the input image to the given size",
        "category": "geometric",
        "params": {
            "size": {
                "type": "int_or_list",
                "required": true,
                "description": "Desired output size"
            }
        }
    }
}
```

### Transform Registry Entry Fields

| Field | Type | Description |
|-------|------|-------------|
| `description` | `str` | Human-readable description |
| `category` | `str` | Category grouping (`"geometric"`, `"color"`, `"normalization"`, `"augmentation"`) |
| `params` | `dict` | Parameter name → parameter schema |

### Parameter Schema Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | `str` | Parameter type (`"int"`, `"float"`, `"list[int]"`, `"list[float]"`, `"int_or_list"`, `"float_or_list"`) |
| `required` | `bool` | Whether the parameter is required |
| `default` | any | Default value (if optional) |
| `description` | `str` | Human-readable parameter description |
