"""Dataset module — loading, preprocessing, shape inference, and inspection.

Public API for the Weave Engine dataset subsystem.
"""

from .dataloader import create_dataloader, create_dataloader_from_config, split_dataset
from .dataset_factory import get_dataset, get_dataset_from_config
from .preview import preview_dataset
from .registry import (
    get_dataset_metadata,
    list_predefined_datasets,
    list_transforms,
    load_registry,
    load_transforms_registry,
)
from .scanner import (
    scan_audio_folder,
    scan_csv,
    scan_folder,
    scan_text_file,
    smart_scan,
)
from .shape_inference import infer_dataset_shape
from .transform_factory import build_transforms, get_transform_catalog
from .validator import validate_dataset_config

__all__ = [
    # Dataset factory
    "get_dataset",
    "get_dataset_from_config",
    # DataLoader
    "create_dataloader",
    "create_dataloader_from_config",
    "split_dataset",
    # Preview
    "preview_dataset",
    # Registry
    "get_dataset_metadata",
    "list_predefined_datasets",
    "list_transforms",
    "load_registry",
    "load_transforms_registry",
    # Scanner
    "scan_folder",
    "scan_csv",
    "scan_text_file",
    "scan_audio_folder",
    "smart_scan",
    # Shape inference
    "infer_dataset_shape",
    # Transforms
    "build_transforms",
    "get_transform_catalog",
    # Validator
    "validate_dataset_config",
]
