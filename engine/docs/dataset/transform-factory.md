# Transform Factory

::: dataset.transform_factory
    options:
      show_source: true

## Overview

Builds preprocessing pipelines from a JSON configuration. Maps transform names to `torchvision.transforms` classes and constructs a composed transform object. Also provides a catalog endpoint for the visual editor to dynamically render transform parameter forms.

## Transform Map

| Name | PyTorch Class | Parameters | Category |
|------|--------------|------------|----------|
| `Resize` | `transforms.Resize` | `size: int \| list[int]` | geometric |
| `CenterCrop` | `transforms.CenterCrop` | `size: int \| list[int]` | geometric |
| `RandomResizedCrop` | `transforms.RandomResizedCrop` | `size: int`, `scale: list[float]` | augmentation |
| `RandomHorizontalFlip` | `transforms.RandomHorizontalFlip` | `p: float = 0.5` | augmentation |
| `RandomVerticalFlip` | `transforms.RandomVerticalFlip` | `p: float = 0.5` | augmentation |
| `RandomRotation` | `transforms.RandomRotation` | `degrees: float \| list[float]` | augmentation |
| `ColorJitter` | `transforms.ColorJitter` | `brightness: float`, `contrast: float`, `saturation: float`, `hue: float` | color |
| `GaussianBlur` | `transforms.GaussianBlur` | `kernel_size: int \| list[int]`, `sigma: list[float]` | color |
| `RandomErasing` | `transforms.RandomErasing` | `p: float = 0.5`, `scale: list[float]` | augmentation |
| `Grayscale` | `transforms.Grayscale` | `num_output_channels: int = 1` | color |
| `Normalize` | `transforms.Normalize` | `mean: list[float]`, `std: list[float]` | normalization |
| `ToTensor` | `transforms.ToTensor` | *(none)* | normalization |

## Functions

### `build_transforms(transform_list)`

Build a composed transform pipeline from a list of transform configurations.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `transform_list` | `list[dict]` | List of transform config dicts |

**Returns:** `transforms.Compose` — Composed transform pipeline

**Raises:**

| Exception | Condition |
|-----------|-----------|
| `ValueError` | Transform type not in `TRANSFORM_MAP` |

### `get_transform_catalog()`

Return all available transforms with their parameter schemas. Used by the `GET /transforms/catalog` endpoint to populate the visual editor's transform picker and dynamic parameter forms.

**Returns:** `list[dict]` — Each entry has `name`, `description`, `category`, and `params` (name → schema)

## Supported Schema Formats

The factory supports both **flat** and **nested** parameter schemas:

### Flat schema (preferred)

```json
{ "type": "Resize", "size": [224, 224] }
{ "type": "Normalize", "mean": [0.485, 0.456, 0.406], "std": [0.229, 0.224, 0.225] }
```

### Nested params schema

```json
{ "type": "Resize", "params": { "size": [224, 224] } }
{ "type": "Normalize", "params": { "mean": [0.485, 0.456, 0.406], "std": [0.229, 0.224, 0.225] } }
```

## Example

```python
from dataset.transform_factory import build_transforms, get_transform_catalog

# Build a transform pipeline
transform = build_transforms([
    {"type": "RandomResizedCrop", "size": 224},
    {"type": "RandomHorizontalFlip", "p": 0.5},
    {"type": "ToTensor"},
    {"type": "Normalize", "mean": [0.485, 0.456, 0.406], "std": [0.229, 0.224, 0.225]}
])

# Get catalog for visual editor
catalog = get_transform_catalog()
# [
#   {"name": "Resize", "description": "Resize the input image...", "category": "geometric", "params": {...}},
#   ...
# ]
```
