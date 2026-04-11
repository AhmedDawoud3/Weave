from torchvision import transforms

TRANSFORM_MAP = {
    "Resize": transforms.Resize,
    "ToTensor": transforms.ToTensor,
    "Normalize": transforms.Normalize,
    "RandomHorizontalFlip": transforms.RandomHorizontalFlip,
    "RandomRotation": transforms.RandomRotation
}

def build_transforms(transform_list):
    ops = []

    for t in transform_list:
        t_type = t.get("type")
        if "params" in t and t.get("params") is not None:
            params = t.get("params", {})
        else:
            params = {key: value for key, value in t.items() if key != "type"}

        if t_type not in TRANSFORM_MAP:
            raise ValueError(f"Transform '{t_type}' not supported.")

        transform_class = TRANSFORM_MAP[t_type]

        ops.append(transform_class(**params))

    return transforms.Compose(ops)