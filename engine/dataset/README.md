Dataset and Transform Module

## Overview

This module is responsible for handling dataset loading, preprocessing, and inspection. It is designed to work independently from the model compilation and training logic, and integrates with the backend through clean, JSON-driven interfaces.

---

## Project Structure

```
dataset/
├── dataset_factory.py
├── transform_factory.py
├── scanner.py
├── registry.py
├── dataloader.py
├── datasets_registry.json
├── __init__.py
```

---

## Components Description

### 1. datasets_registry.json

Defines all supported predefined datasets. Each dataset entry includes:

* Module path
* Class name
* Default parameters

This file acts as the single source of truth for dataset configuration.

---

### 2. registry.py

Handles loading and parsing of the dataset registry JSON file. Provides access to dataset configurations for other modules.

---

### 3. dataset_factory.py

Responsible for dynamically instantiating datasets using the registry.

Key functionality:

* Validates dataset name
* Dynamically imports dataset class using `importlib`
* Accepts a `split` parameter (`"train"` or `"test"`) to control which subset to load

Example:

```python
dataset = get_dataset("MNIST", "./data", split="train")
```

---

### 4. transform_factory.py

Builds preprocessing pipelines from a JSON configuration.

Key functionality:

* Maps transform names to `torchvision.transforms`
* Dynamically constructs transformation pipelines
* Returns a composed transform object
* Supports both flat schema (`{"type": "Resize", "size": 128}`) and nested params (`{"type": "Resize", "params": {"size": 128}}`)

Example:

```python
transform = build_transforms([
    {"type": "Resize", "size": 128},
    {"type": "ToTensor"}
])
```

---

### 5. scanner.py

Provides functionality to analyze a dataset folder.

Key features:

* Traverses directories using `os.walk`
* Detects class folders
* Counts total number of images (by file extension)

Example output:

```json
{
  "classes": ["cat", "dog"],
  "total_images": 2000
}
```

---

### 6. dataloader.py

Wraps dataset and transform into a PyTorch `DataLoader`.

Responsibilities:

* Applies transformations to dataset
* Configures batching, shuffling, and parallel loading

Example:

```python
loader = create_dataloader(dataset, batch_size=32, num_workers=4, pin_memory=True)
```

---

## Design Principles

* Fully JSON-driven configuration
* Modular and extensible design
* No hardcoded dataset or transform logic
* Separation of concerns across components
* Compatible with backend API integration

---

## Usage Flow

1. Load dataset configuration from registry
2. Instantiate dataset using `dataset_factory`
3. Build transform pipeline using `transform_factory`
4. Optionally scan custom dataset using `scanner`
5. Wrap dataset with `dataloader`

---

## Example End-to-End Usage

```python
from dataset.dataset_factory import get_dataset
from dataset.transform_factory import build_transforms
from dataset.dataloader import create_dataloader

transform = build_transforms([
    {"type": "Resize", "size": 128},
    {"type": "ToTensor"}
])

dataset = get_dataset("CIFAR10", "./data", transform=transform, split="train")

loader = create_dataloader(dataset, batch_size=32)
```

---

## Integration Notes

* This module does not handle model definition or training
* Designed to be used by FastAPI endpoints
* Outputs standard PyTorch Dataset and DataLoader objects

---

## Status

* Dataset registry implemented
* Dynamic dataset loading implemented
* Transform pipeline factory implemented
* Dataset folder scanning implemented
* DataLoader wrapper implemented

---

## Future Improvements

* Extend dataset registry with more datasets
* Support custom dataset formats (CSV, JSON annotations)
* Add advanced augmentations
* Improve validation and error reporting

---

