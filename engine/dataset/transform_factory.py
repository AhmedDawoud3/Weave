from __future__ import annotations

from typing import Any

from torchvision import transforms

TRANSFORM_MAP = {
    "Resize": transforms.Resize,
    "ToTensor": transforms.ToTensor,
    "Normalize": transforms.Normalize,
    "RandomHorizontalFlip": transforms.RandomHorizontalFlip,
    "RandomRotation": transforms.RandomRotation,
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
