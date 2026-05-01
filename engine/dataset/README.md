# Dataset and Transform Module

## Overview

This module handles dataset discovery, loading, preprocessing, validation, and inspection across multiple modalities (image, text, tabular, audio). It is designed to power the Weave visual editor's no-code/low-code dataset configuration experience, integrating with the backend through clean, JSON-driven interfaces and REST API endpoints.

---

## Project Structure

```
dataset/
├── __init__.py                 # Public API exports
├── dataset_factory.py          # Dynamic dataset instantiation (registry + custom)
├── transform_factory.py        # Build torchvision transform pipelines from config
├── registry.py                 # Load and query dataset & transform registries
├── scanner.py                  # Scan local paths for data (images, CSV, text, audio)
├── dataloader.py               # DataLoader wrapper + config-driven creation + split
├── preview.py                  # Preview dataset samples (frontend-friendly output)
├── validator.py                # Validate dataset configs (errors + warnings)
├── shape_inference.py          # Dataset shape inference without data download
├── datasets_registry.json      # Static registry of predefined datasets (7 datasets)
├── transforms_registry.json    # Static registry of transforms (12 transforms)
└── custom_loaders/             # Custom dataset loaders for 4 modalities
    ├── __init__.py
    ├── csv_image_dataset.py    # CSV with image paths + labels
    ├── text_dataset.py         # CSV with text column + tokenization
    ├── tabular_dataset.py      # CSV with feature/target columns
    └── audio_dataset.py        # Folder of audio class subfolders → mel spectrograms
```

---

## Components Description

### 1. datasets_registry.json

Defines all supported predefined datasets. Each entry includes:

* Module path and class name
* Default constructor parameters
* Per-sample tensor shape and number of classes
* UI metadata: `description`, `tags`, `modality`

Currently registered: **MNIST**, **FashionMNIST**, **CIFAR10**, **CIFAR100**, **EMNIST**, **QMNIST**, **SVHN**

---

### 2. transforms_registry.json

Defines all supported transforms with parameter schemas for the visual editor. Each entry includes:

* Transform name and description
* Parameter definitions with `type`, `required`, `default`, `description`
* Category grouping (e.g. `"geometric"`, `"color"`, `"normalization"`)

Currently registered: **Resize**, **CenterCrop**, **RandomResizedCrop**, **RandomHorizontalFlip**, **RandomVerticalFlip**, **RandomRotation**, **ColorJitter**, **GaussianBlur**, **RandomErasing**, **Grayscale**, **Normalize**, **ToTensor**

---

### 3. registry.py

Handles loading and parsing of both dataset and transform registry JSON files.

Key functions:

* `load_registry()` — Load the dataset registry
* `list_predefined_datasets()` — Get available dataset names
* `get_dataset_metadata(name)` — Get UI metadata for a dataset
* `load_transforms_registry()` — Load the transforms registry
* `list_transforms()` — Get available transform names

---

### 4. dataset_factory.py

Responsible for dynamically instantiating datasets from the registry or from custom configurations.

Key functions:

* `get_dataset(name, root_dir, ...)` — Create a dataset from the registry (backward compatible)
* `get_dataset_from_config(config)` — Create a dataset from a `DatasetConfig` discriminated union, dispatching to:
  * `_create_predefined()` — torchvision datasets from registry
  * `_create_image_folder()` — ImageFolder datasets
  * `_create_custom()` — Custom datasets by modality (image, text, tabular, audio)

Example:

```python
from dataset.dataset_factory import get_dataset, get_dataset_from_config

# Legacy API
dataset = get_dataset("MNIST", "./data", split="train")

# Config-driven API (used by frontend)
from schemas import PredefinedDatasetConfig
config = PredefinedDatasetConfig(name="CIFAR10", split="train")
dataset = get_dataset_from_config(config)
```

---

### 5. transform_factory.py

Builds preprocessing pipelines from a JSON configuration.

Key functions:

* `build_transforms(transform_list)` — Build a composed transform pipeline
* `get_transform_catalog()` — Return all transforms with parameter schemas (for visual editor)

Supports **12 transforms** in `TRANSFORM_MAP` and both flat and nested parameter schemas.

---

### 6. custom_loaders/

Four modality-specific PyTorch Dataset implementations:

| Loader | Modality | Input | Output |
|--------|----------|-------|--------|
| `CSVImageDataset` | image | CSV with image paths + labels | `(PIL.Image, int)` |
| `TextDataset` | text | CSV with text column | `(tensor[token_ids], int)` |
| `TabularDataset` | tabular | CSV with feature/target columns | `(tensor[features], int)` |
| `AudioDataset` | audio | Folder of class subfolders | `(tensor[mel_spectrogram], int)` |

---

### 7. scanner.py

Provides functionality to analyze local data sources.

Key functions:

* `scan_folder(path)` — Scan image folder (class subfolders + image count)
* `scan_csv(path)` — Scan CSV file (columns, row count, dtypes, preview)
* `scan_text_file(path)` — Scan text CSV (columns, row count, text stats)
* `scan_audio_folder(path)` — Scan audio folder (class subfolders + audio count)
* `smart_scan(path, modality)` — Auto-detect modality and scan

---

### 8. preview.py

Preview dataset samples in a frontend-friendly format.

* `preview_dataset(config, num_samples=5)` — Returns samples with modality-specific formatting:
  * **image**: base64-encoded thumbnails
  * **text**: token ID arrays
  * **tabular**: feature vectors
  * **audio**: spectrogram statistics

---

### 9. validator.py

Validate dataset configurations before loading.

* `validate_dataset_config(config)` — Returns `{valid, errors, warnings}`:
  * Checks required fields per source type
  * Validates path existence
  * Validates column names for CSV-based datasets
  * Warns about transform compatibility issues

---

### 10. dataloader.py

Wraps dataset and transform into a PyTorch `DataLoader`.

Key functions:

* `create_dataloader(dataset, ...)` — Create a DataLoader (backward compatible)
* `create_dataloader_from_config(dataset, config)` — Create from `DataLoaderConfig` schema
* `split_dataset(dataset, split_ratio)` — Split into train/test `Subset`s

---

## API Endpoints

The module exposes 5 REST endpoints via FastAPI:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/datasets/catalog` | List all predefined datasets with UI metadata |
| GET | `/transforms/catalog` | List all transforms with parameter schemas |
| POST | `/datasets/scan` | Scan a local path for data structure |
| POST | `/datasets/preview` | Preview samples from a dataset config |
| POST | `/datasets/validate` | Validate a dataset configuration |

---

## Design Principles

* Fully JSON-driven configuration
* Modular and extensible design
* No hardcoded dataset or transform logic
* Separation of concerns across components
* Compatible with backend API integration
* Frontend-friendly: registries include param schemas for dynamic form rendering
* All changes are additive — existing function signatures preserved for backward compatibility

---

## Usage Flow

1. Frontend calls `GET /datasets/catalog` to populate the dataset picker
2. Frontend calls `GET /transforms/catalog` to populate the transform editor
3. User configures a dataset (predefined, image folder, or custom)
4. Frontend calls `POST /datasets/validate` to check the config
5. Frontend calls `POST /datasets/preview` to show sample data
6. Frontend calls `POST /datasets/scan` to inspect local data
7. On training start, `get_dataset_from_config()` creates the dataset
8. `create_dataloader_from_config()` wraps it in a DataLoader

---

## Example End-to-End Usage

```python
from dataset.dataset_factory import get_dataset_from_config
from dataset.transform_factory import build_transforms
from dataset.dataloader import create_dataloader_from_config, split_dataset
from schemas import PredefinedDatasetConfig, DataLoaderConfig

# Config-driven dataset creation
config = PredefinedDatasetConfig(
    name="CIFAR10",
    split="train",
    transforms=[
        {"type": "Resize", "size": [224, 224]},
        {"type": "ToTensor"},
    ],
)
dataset = get_dataset_from_config(config)

# Split and create dataloader
train_ds, val_ds = split_dataset(dataset, split_ratio=0.8)
dl_config = DataLoaderConfig(batch_size=64, shuffle=True)
loader = create_dataloader_from_config(train_ds, dl_config)

for batch_x, batch_y in loader:
    # batch_x shape: [64, 3, 224, 224]
    # batch_y shape: [64]
    pass
```

---

## Integration Notes

* This module does not handle model definition or training
* Designed to be used by FastAPI endpoints
* Outputs standard PyTorch Dataset and DataLoader objects
* Custom loaders handle CSV-based data for image, text, tabular, and audio modalities
- Registries include UI metadata for the visual editor's dynamic form rendering
