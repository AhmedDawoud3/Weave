# Dataset Module

The dataset module handles dataset discovery, loading, preprocessing, validation, preview, shape inference, and inspection across multiple modalities (image, text, tabular, audio). It is designed to work independently from the model compilation and training logic, integrating with the backend through clean, JSON-driven interfaces and REST API endpoints.

## Architecture

```
dataset/
├── __init__.py                 # Public API exports
├── shape_inference.py          # Dataset shape inference without data download
├── dataset_factory.py          # Dynamic dataset instantiation (registry + custom)
├── registry.py                 # Load and query dataset & transform registries
├── scanner.py                  # Scan local paths for data (images, CSV, text, audio)
├── transform_factory.py        # Build torchvision transform pipelines from config
├── dataloader.py               # DataLoader wrapper + config-driven creation + split
├── preview.py                  # Preview dataset samples (frontend-friendly output)
├── validator.py                # Validate dataset configs (errors + warnings)
├── datasets_registry.json      # Static registry of predefined datasets (7 datasets)
├── transforms_registry.json    # Static registry of transforms (12 transforms)
└── custom_loaders/             # Custom dataset loaders for 4 modalities
    ├── __init__.py
    ├── csv_image_dataset.py    # CSV with image paths + labels
    ├── text_dataset.py         # CSV with text column + tokenization
    ├── tabular_dataset.py      # CSV with feature/target columns
    └── audio_dataset.py        # Folder of audio class subfolders → mel spectrograms
```

## Flow

1. Frontend calls `GET /datasets/catalog` to populate the dataset picker
2. Frontend calls `GET /transforms/catalog` to populate the transform editor
3. User configures a dataset (predefined, image folder, or custom)
4. Frontend calls `POST /datasets/validate` to check the config
5. Frontend calls `POST /datasets/preview` to show sample data
6. Frontend calls `POST /datasets/scan` to inspect local data
7. On training start, `get_dataset_from_config()` creates the dataset
8. `create_dataloader_from_config()` wraps it in a DataLoader

## Components

| Component | Description | Details |
|-----------|-------------|---------|
| [Shape Inference](shape-inference.md) | Compute tensor shapes without loading data | Main entry point for the `/infer/dataset` endpoint |
| [Dataset Factory](dataset-factory.md) | Dynamic dataset instantiation | Import and create torchvision datasets from registry or custom configs |
| [Registry](registry.md) | Dataset & transform configuration store | JSON-based registries of predefined datasets and transforms |
| [Scanner](scanner.md) | Data source analysis | Scan local paths for images, CSV, text, and audio data |
| [Transform Factory](transform-factory.md) | Preprocessing pipelines | Build torchvision transforms from config; catalog for visual editor |
| [DataLoader](dataloader.md) | Batch loading wrapper | Config-driven DataLoader creation + dataset splitting |
| [Preview](preview.md) | Dataset preview | Preview samples in frontend-friendly format |
| [Validator](validator.md) | Config validation | Validate dataset configs with errors and warnings |
| [Custom Loaders](custom-loaders.md) | Modality-specific loaders | CSVImage, Text, Tabular, Audio dataset implementations |
