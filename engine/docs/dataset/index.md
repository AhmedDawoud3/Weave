# Dataset Module

The dataset module handles dataset loading, preprocessing, shape inference, and inspection. It is designed to work independently from the model compilation and training logic, integrating with the backend through clean, JSON-driven interfaces.

## Architecture

```
dataset/
├── __init__.py              # Empty (no public exports)
├── shape_inference.py       # Dataset shape inference without data download
├── dataset_factory.py       # Dynamic dataset instantiation from registry
├── registry.py              # Load and query the dataset registry JSON
├── scanner.py               # Scan local folders for image datasets
├── transform_factory.py     # Build torchvision transform pipelines from config
├── dataloader.py            # Thin DataLoader wrapper
└── datasets_registry.json   # Static registry of predefined datasets
```

## Flow

1. User sends a `DatasetConfig` to the `/infer/dataset` endpoint
2. `infer_dataset_shape()` dispatches based on `source` type
3. Predefined datasets look up shapes from the registry
4. Custom datasets compute shapes from modality-specific logic
5. Transforms are applied to determine the final tensor shape
6. Batch shape is computed by prepending the batch size

## Components

| Component | Description | Details |
|-----------|-------------|---------|
| [Shape Inference](shape-inference.md) | Compute tensor shapes without loading data | Main entry point for the `/infer/dataset` endpoint |
| [Dataset Factory](dataset-factory.md) | Dynamic dataset instantiation | Import and create torchvision datasets from registry |
| [Registry](registry.md) | Dataset configuration store | JSON-based registry of predefined datasets |
| [Scanner](scanner.md) | Folder analysis | Count classes and images in local folders |
| [Transform Factory](transform-factory.md) | Preprocessing pipelines | Build torchvision transforms from config |
| [DataLoader](dataloader.md) | Batch loading wrapper | Thin wrapper around torch.utils.data.DataLoader |
