# Dataset Factory

::: dataset.dataset_factory
    options:
      show_source: true

## Overview

Dynamically instantiates datasets using the registry or from custom configurations. Supports predefined torchvision datasets, ImageFolder datasets, and custom datasets across 4 modalities (image, text, tabular, audio).

## Functions

### `get_dataset(name, root_dir, transform, split)`

Create a dataset instance from the registry. (Legacy API, preserved for backward compatibility.)

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

### `get_dataset_from_config(config)`

Create a dataset from a `DatasetConfig` discriminated union. This is the primary entry point used by the API and visual editor.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `DatasetConfig` | Dataset configuration (predefined, image_folder, or custom) |

**Returns:** Dataset instance

**Dispatch logic:**

| Source Type | Handler | Description |
|-------------|---------|-------------|
| `predefined` | `_create_predefined()` | Load from torchvision via registry |
| `image_folder` | `_create_image_folder()` | Load from folder with class subfolders |
| `custom` + `image` | `_create_custom()` → `CSVImageDataset` | Load images from CSV with labels |
| `custom` + `text` | `_create_custom()` → `TextDataset` | Load text from CSV with tokenization |
| `custom` + `tabular` | `_create_custom()` → `TabularDataset` | Load tabular data from CSV |
| `custom` + `audio` | `_create_custom()` → `AudioDataset` | Load audio from class subfolders |

## How It Works

### Predefined datasets

1. Load the registry via `load_registry()`
2. Look up the dataset name
3. Dynamically import the module: `importlib.import_module(config["module"])`
4. Get the class: `getattr(module, config["class"])`
5. Override the `train` parameter based on `split`
6. Instantiate with `root`, `transform`, and default params

### ImageFolder datasets

1. Validate that the root path exists
2. Build transforms if provided
3. Create `torchvision.datasets.ImageFolder` instance

### Custom datasets

1. Dispatch based on `modality` field
2. Pass config fields to the appropriate custom loader
3. Build and apply transforms if provided

## Examples

### Predefined dataset (legacy API)

```python
from dataset.dataset_factory import get_dataset

dataset = get_dataset("MNIST", "./data", split="train")
# Equivalent to:
# torchvision.datasets.MNIST(root="./data", train=True, download=True)
```

### Predefined dataset (config-driven API)

```python
from dataset.dataset_factory import get_dataset_from_config
from schemas import PredefinedDatasetConfig

config = PredefinedDatasetConfig(name="CIFAR10", split="train")
dataset = get_dataset_from_config(config)
```

### Custom text dataset

```python
from dataset.dataset_factory import get_dataset_from_config
from schemas import CustomDatasetConfig

config = CustomDatasetConfig(
    source="custom",
    modality="text",
    file_path="/data/reviews.csv",
    text_column="review",
    target_column="sentiment",
    max_length=256,
)
dataset = get_dataset_from_config(config)
```

### Custom tabular dataset

```python
from dataset.dataset_factory import get_dataset_from_config
from schemas import CustomDatasetConfig

config = CustomDatasetConfig(
    source="custom",
    modality="tabular",
    file_path="/data/features.csv",
    feature_columns=["age", "income", "score"],
    target_column="label",
    categorical_columns=["score"],
    normalize=True,
)
dataset = get_dataset_from_config(config)
```
