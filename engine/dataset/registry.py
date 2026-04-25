import json
from pathlib import Path

REGISTRY_PATH = Path(__file__).resolve().parent / "datasets_registry.json"


def load_registry():
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


def list_predefined_datasets():
    """Get a list of all available predefined dataset names.

    Returns:
        list[str]: Dataset names (e.g. ["MNIST", "CIFAR10"]).
    """
    return list(load_registry().keys())
