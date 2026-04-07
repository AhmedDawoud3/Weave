import json

REGISTRY_PATH = "dataset/datasets_registry.json"

def load_registry():
    with open(REGISTRY_PATH, "r") as f:
        return json.load(f)

def list_predefined_datasets():
    return load_registry()