# Validator

::: dataset.validator
    options:
      show_source: true

## Overview

Validates dataset configurations before loading. Returns structured errors and warnings to help users fix their configs in the visual editor. Used by the `POST /datasets/validate` endpoint.

## Function

### `validate_dataset_config(config)`

Validate a dataset configuration and return errors and warnings.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `DatasetConfig` | Dataset configuration to validate |

**Returns:** `dict` with keys:

| Key | Type | Description |
|-----|------|-------------|
| `valid` | `bool` | Whether the config is valid (no errors) |
| `errors` | `list[str]` | Blocking issues that prevent dataset creation |
| `warnings` | `list[str]` | Non-blocking issues that may cause problems |

## Validation Rules

### Predefined datasets

| Rule | Level | Condition |
|------|-------|-----------|
| Name in registry | Error | Dataset name not found in registry |
| Valid split | Error | Split is not `"train"` or `"test"` |

### ImageFolder datasets

| Rule | Level | Condition |
|------|-------|-----------|
| Root path exists | Error | Root directory not found |
| Root is directory | Error | Root path is not a directory |
| Has class subfolders | Warning | No subfolders detected (may be flat structure) |

### Custom image datasets

| Rule | Level | Condition |
|------|-------|-----------|
| Label file exists | Error | CSV label file not found |
| Image column in CSV | Error | Specified image column not in CSV |
| Label column in CSV | Error | Specified label column not in CSV |

### Custom text datasets

| Rule | Level | Condition |
|------|-------|-----------|
| File path exists | Error | Data file not found |
| Text column in CSV | Error | Specified text column not in CSV |
| Max length > 0 | Warning | `max_length` is very small (< 16) |

### Custom tabular datasets

| Rule | Level | Condition |
|------|-------|-----------|
| File path exists | Error | Data file not found |
| Feature columns in CSV | Error | One or more feature columns not in CSV |
| Target column in CSV | Error | Target column not in CSV |

### Custom audio datasets

| Rule | Level | Condition |
|------|-------|-----------|
| Root path exists | Error | Root directory not found |
| Has class subfolders | Warning | No audio class subfolders detected |

### Transform compatibility

| Rule | Level | Condition |
|------|-------|-----------|
| Normalize after ToTensor | Warning | Normalize used without ToTensor (may cause issues) |
| Resize on non-image | Warning | Geometric transforms on non-image modality |

## Example

```python
from dataset.validator import validate_dataset_config
from schemas import CustomDatasetConfig

config = CustomDatasetConfig(
    source="custom",
    modality="text",
    file_path="/nonexistent/file.csv",
    text_column="review",
)
result = validate_dataset_config(config)
# {
#     "valid": False,
#     "errors": ["Data file not found: /nonexistent/file.csv"],
#     "warnings": []
# }
```
