import importlib

from .registry import load_registry


def get_dataset(name: str, root_dir: str, transform=None, split: str = "train"):
    """Dynamically instantiate a dataset from the registry.

    Looks up the dataset name in the registry, imports the corresponding
    torchvision class, and creates an instance with the given parameters.

    Args:
        name: Dataset name (must exist in the registry, e.g. "MNIST", "CIFAR10").
        root_dir: Directory path to download/load the dataset.
        transform: Optional transform pipeline to apply to samples.
        split: Dataset split, either "train" or "test".

    Returns:
        A torchvision Dataset instance.

    Raises:
        ValueError: If the dataset name is not found in the registry.
    """
    registry = load_registry()

    if name not in registry:
        raise ValueError(
            f"Dataset '{name}' not supported. Available: {list(registry.keys())}"
        )

    config = registry[name]

    module = importlib.import_module(config["module"])
    dataset_class = getattr(module, config["class"])

    default_params = config.get("default_params", {}).copy()
    # Override train/test split if the underlying dataset accepts a `train` bool
    if "train" in default_params:
        default_params["train"] = split == "train"

    dataset = dataset_class(
        root=root_dir,
        transform=transform,
        **default_params,
    )

    return dataset
