from __future__ import annotations

from typing import Any

from torchvision import transforms

from .registry import load_transforms_registry

TRANSFORM_MAP = {
    "Resize": transforms.Resize,
    "CenterCrop": transforms.CenterCrop,
    "RandomResizedCrop": transforms.RandomResizedCrop,
    "ToTensor": transforms.ToTensor,
    "Normalize": transforms.Normalize,
    "RandomHorizontalFlip": transforms.RandomHorizontalFlip,
    "RandomVerticalFlip": transforms.RandomVerticalFlip,
    "RandomRotation": transforms.RandomRotation,
    "ColorJitter": transforms.ColorJitter,
    "GaussianBlur": transforms.GaussianBlur,
    "RandomErasing": transforms.RandomErasing,
    "Grayscale": transforms.Grayscale,
}


def build_transforms(transform_list: list[dict[str, Any]]) -> transforms.Compose:
    """Build a composed transform pipeline from a list of transform configurations.

    Supports both flat schema (e.g. {"type": "Resize", "size": 128}) and
    nested params schema (e.g. {"type": "Resize", "params": {"size": 128}}).

    Args:
        transform_list: List of transform config dictionaries, each with a "type"
            key and optional parameter keys or a "params" nested dict.

    Returns:
        transforms.Compose: A composed transform pipeline.

    Raises:
        ValueError: If a transform type is not in TRANSFORM_MAP.
    """
    ops = []

    for t in transform_list:
        t_type = t.get("type")
        if t.get("params") is not None:
            params = t["params"]
        else:
            params = {key: value for key, value in t.items() if key != "type"}

        if t_type not in TRANSFORM_MAP:
            raise ValueError(f"Transform '{t_type}' not supported.")

        transform_class = TRANSFORM_MAP[t_type]

        ops.append(transform_class(**params))

    return transforms.Compose(ops)


def get_transform_catalog() -> list[dict[str, Any]]:
    """Return the full transform catalog for the API.

    Each entry includes the transform name, parameter schemas, category,
    and description — everything the frontend needs to render dynamic
    form fields in the visual editor.

    Returns:
        list[dict]: A list of transform catalog entries.
    """
    registry = load_transforms_registry()
    catalog = []
    for name, config in registry.items():
        catalog.append(
            {
                "name": name,
                "params": config.get("params", {}),
                "category": config.get("category", "other"),
                "description": config.get("description", ""),
            }
        )
    return catalog
