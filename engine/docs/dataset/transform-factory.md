# Transform Factory

::: dataset.transform_factory
    options:
      show_source: true

## Overview

Builds preprocessing pipelines from a JSON configuration. Maps transform names to `torchvision.transforms` classes and constructs a composed transform object.

## Transform Map

| Name | PyTorch Class | Parameters |
|------|--------------|------------|
| `Resize` | `transforms.Resize` | `size: int \| list[int]` |
| `ToTensor` | `transforms.ToTensor` | *(none)* |
| `Normalize` | `transforms.Normalize` | `mean: list[float]`, `std: list[float]` |
| `RandomHorizontalFlip` | `transforms.RandomHorizontalFlip` | `p: float = 0.5` |
| `RandomRotation` | `transforms.RandomRotation` | `degrees: float \| list[float]` |

## Function

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
from dataset.transform_factory import build_transforms

transform = build_transforms([
    {"type": "Resize", "size": [224, 224]},
    {"type": "ToTensor"},
    {"type": "Normalize", "mean": [0.485, 0.456, 0.406], "std": [0.229, 0.224, 0.225]}
])

# Equivalent to:
# transforms.Compose([
#     transforms.Resize([224, 224]),
#     transforms.ToTensor(),
#     transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
# ])
```
