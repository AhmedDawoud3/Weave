import json
from pathlib import Path

REGISTRY_PATH = Path(__file__).resolve().parent / "datasets_registry.json"


def load_registry():
    try:
        with REGISTRY_PATH.open("r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError as exc:
        raise FileNotFoundError(
            f"Dataset registry file not found: {REGISTRY_PATH}"
        ) from exc


def list_predefined_datasets():
    return list(load_registry().keys())
