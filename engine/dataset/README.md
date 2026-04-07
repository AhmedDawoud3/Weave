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

main.py
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
* Merges default and user-provided parameters

Example:

```python
dataset = get_dataset("MNIST", "./data")
```

---

### 4. transform_factory.py

Builds preprocessing pipelines from a JSON configuration.

Key functionality:

* Maps transform names to `torchvision.transforms`
* Dynamically constructs transformation pipelines
* Returns a composed transform object

Example:

```python
transform = build_transforms([
    {"type": "Resize", "params": {"size": 128}},
    {"type": "ToTensor"}
])
```

---

### 5. scanner.py

Provides functionality to analyze a dataset folder.

Key features:

* Traverses directories using `os.walk`
* Detects class folders
* Counts total number of images

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
loader = get_dataloader(dataset, batch_size=32)
```

---

### 7. main.py

Entry point for testing or integration with FastAPI.

Can be used to:

* Test dataset loading
* Validate transform pipelines
* Run scanner utilities

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
dataset = get_dataset("CIFAR10", "./data")

transform = build_transforms([
    {"type": "Resize", "params": {"size": 128}},
    {"type": "ToTensor"}
])

loader = get_dataloader(dataset, batch_size=32)
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
