from __future__ import annotations

import json
from pathlib import Path
from typing import Any

REGISTRY_PATH = Path(__file__).resolve().parent / "datasets_registry.json"
TRANSFORMS_REGISTRY_PATH = Path(__file__).resolve().parent / "transforms_registry.json"


def load_registry() -> dict[str, Any]:
    """Load the dataset registry from the JSON file on disk.

    Returns:
        dict: The parsed dataset registry mapping dataset names to configs.

    Raises:
        FileNotFoundError: If the registry JSON file cannot be found.
    """
    try:
        with REGISTRY_PATH.open("r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError as exc:
        raise FileNotFoundError(
            f"Dataset registry file not found: {REGISTRY_PATH}"
        ) from exc


def list_predefined_datasets() -> list[str]:
    """Get a list of all available predefined dataset names.

    Returns:
        list[str]: Dataset names (e.g. ["MNIST", "CIFAR10"]).
    """
    return list(load_registry().keys())


def get_dataset_metadata(name: str) -> dict[str, Any]:
    """Get the full metadata entry for a predefined dataset.

    Args:
        name: Dataset name (must exist in the registry).

    Returns:
        dict: The full dataset config including description, tags, shape, etc.

    Raises:
        ValueError: If the dataset name is not found in the registry.
    """
    registry = load_registry()
    if name not in registry:
        raise ValueError(
            f"Dataset '{name}' not found. Available: {list(registry.keys())}"
        )
    return registry[name]


def load_transforms_registry() -> dict[str, Any]:
    """Load the transforms registry from the JSON file on disk.

    Returns:
        dict: The parsed transforms registry mapping transform names to configs.

    Raises:
        FileNotFoundError: If the transforms registry JSON file cannot be found.
    """
    try:
        with TRANSFORMS_REGISTRY_PATH.open("r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError as exc:
        raise FileNotFoundError(
            f"Transforms registry file not found: {TRANSFORMS_REGISTRY_PATH}"
        ) from exc


def list_transforms() -> list[str]:
    """Get a list of all available transform names.

    Returns:
        list[str]: Transform names (e.g. ["Resize", "ToTensor", "Normalize"]).
    """
    return list(load_transforms_registry().keys())
