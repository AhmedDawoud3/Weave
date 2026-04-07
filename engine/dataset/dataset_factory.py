import importlib
from .registry import load_registry

def get_dataset(name: str, root_dir: str, transform=None):
    registry = load_registry()

    if name not in registry:
        raise ValueError(
            f"Dataset '{name}' not supported. Available: {list(registry.keys())}"
        )

    config = registry[name]

    module = importlib.import_module(config["module"])
    dataset_class = getattr(module, config["class"])

    dataset = dataset_class(
        root=root_dir,
        transform=transform,
        **config.get("default_params", {})
    )

    return dataset