# Scanner

::: dataset.scanner
    options:
      show_source: true

## Overview

Provides functionality to analyze local data sources. Supports image folders, CSV files, text files, and audio folders. Used by the `POST /datasets/scan` endpoint and by shape inference.

## Functions

### `scan_folder(path)`

Analyze an image folder to detect class subfolders and count images.

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

### `scan_csv(path)`

Analyze a CSV file to detect columns, row count, and data types.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | `str` | Path to the CSV file |

**Returns:** `dict` with keys:

| Key | Type | Description |
|-----|------|-------------|
| `columns` | `list[str]` | Column names |
| `num_rows` | `int` | Number of data rows (excluding header) |
| `dtypes` | `dict` | Column name → dtype string |
| `preview` | `list[dict]` | First 5 rows as dicts |

### `scan_text_file(path)`

Analyze a text CSV file to detect columns, row count, and text statistics.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | `str` | Path to the CSV file |

**Returns:** `dict` with keys:

| Key | Type | Description |
|-----|------|-------------|
| `columns` | `list[str]` | Column names |
| `num_rows` | `int` | Number of data rows |
| `text_stats` | `dict` | `avg_length`, `max_length`, `min_length` of text column |

### `scan_audio_folder(path)`

Analyze an audio folder to detect class subfolders and count audio files.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | `str` | Path to the audio dataset root folder |

**Returns:** `dict` with keys:

| Key | Type | Description |
|-----|------|-------------|
| `classes` | `list[str]` | Subfolder names (class labels) |
| `num_classes` | `int` | Number of class subfolders |
| `total_files` | `int` | Total count of audio files |

### `smart_scan(path, modality)`

Auto-detect the data modality and scan using the appropriate scanner.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `path` | `str` | — | Path to scan |
| `modality` | `str \| None` | `None` | Hint: `"image"`, `"text"`, `"tabular"`, `"audio"` |

**Returns:** `dict` — Result from the appropriate scanner

**Auto-detection logic:**

| Condition | Scanner Used |
|-----------|-------------|
| `modality="image"` or path is directory with image files | `scan_folder()` |
| `modality="audio"` or path is directory with audio files | `scan_audio_folder()` |
| `modality="text"` or CSV with text-like column | `scan_text_file()` |
| `modality="tabular"` or CSV without text column | `scan_csv()` |

## Supported File Extensions

### Image extensions (for `scan_folder`)

```python
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".webp"}
```

### Audio extensions (for `scan_audio_folder`)

```python
AUDIO_EXTENSIONS = {".wav", ".mp3", ".flac", ".ogg", ".m4a", ".wma", ".aac"}
```

## Example

### Image folder scan

```python
from dataset.scanner import scan_folder

result = scan_folder("/data/my_dataset")
# {
#     "classes": ["cat", "dog"],
#     "num_classes": 2,
#     "total_images": 4
# }
```

### CSV scan

```python
from dataset.scanner import scan_csv

result = scan_csv("/data/features.csv")
# {
#     "columns": ["age", "income", "label"],
#     "num_rows": 1000,
#     "dtypes": {"age": "int64", "income": "float64", "label": "int64"},
#     "preview": [{"age": 25, "income": 50000.0, "label": 0}, ...]
# }
```

### Smart scan

```python
from dataset.scanner import smart_scan

result = smart_scan("/data/reviews.csv", modality="text")
# Automatically uses scan_text_file()
```
