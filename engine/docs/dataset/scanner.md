# Scanner

::: dataset.scanner
    options:
      show_source: true

## Overview

Provides functionality to analyze a local dataset folder structure. Used by the ImageFolder shape inference to determine the number of classes.

## Function

### `scan_folder(path)`

Analyze a folder to detect class subfolders and count images.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | `str` | Path to the dataset root folder |

**Returns:** `dict` with keys:

| Key | Type | Description |
|-----|------|-------------|
| `classes` | `list[str]` | Subfolder names (class labels) |
| `num_classes` | `int` | Number of class subfolders |
| `total_images` | `int` | Total count of image files |

**Raises:**

| Exception | Condition |
|-----------|-----------|
| `ValueError` | Path does not exist or is not a directory |

## Supported Image Extensions

```python
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".webp"}
```

## Example

Given a folder structure:

```
/data/my_dataset/
├── cat/
│   ├── cat1.jpg
│   └── cat2.jpg
└── dog/
    ├── dog1.jpg
    └── dog2.png
```

```python
from dataset.scanner import scan_folder

result = scan_folder("/data/my_dataset")
# {
#     "classes": ["cat", "dog"],
#     "num_classes": 2,
#     "total_images": 4
# }
```

## How It Works

1. Validate that the path exists and is a directory
2. Normalize the path for cross-platform compatibility
3. Walk the directory tree using `os.walk`
4. Direct subfolders of the root are treated as class names
5. Files in subdirectories with recognized image extensions are counted
