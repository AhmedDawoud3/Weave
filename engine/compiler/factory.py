from typing import Any, Callable, Dict, Iterable

import torch.nn as nn
import torch.optim as optim
from schemas import NodeConfig
from torch.nn.parameter import Parameter

from .modules import AddModule, ConcatModule

# Type alias for a function that takes a NodeConfig and returns an nn.Module
LayerBuilder = Callable[[NodeConfig], nn.Module]


def _normalize_config(config: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    if "type" not in config or not config["type"]:
        raise ValueError("Config must include a non-empty 'type' field.")

    config_type = config["type"]
    nested_params = config.get("params", {})
    if nested_params is None:
        nested_params = {}
    if not isinstance(nested_params, dict):
        raise ValueError("Config 'params' must be a dictionary.")

    flat_params = {k: v for k, v in config.items() if k not in {"type", "params"}}
    normalized_params = {**flat_params, **nested_params}
    return config_type, normalized_params


def get_loss_function(config: dict[str, Any]) -> nn.Module:
    loss_type, loss_params = _normalize_config(config)

    loss_registry: dict[str, type[nn.Module]] = {
        "CrossEntropyLoss": nn.CrossEntropyLoss,
        "MSELoss": nn.MSELoss,
    }

    if loss_type not in loss_registry:
        raise ValueError(f"Unsupported loss type: {loss_type}")

    return loss_registry[loss_type](**loss_params)


def get_optimizer(
    model_params: Iterable[Parameter], config: dict[str, Any]
) -> optim.Optimizer:
    optimizer_type, optimizer_params = _normalize_config(config)

    optimizer_registry = {
        "Adam": optim.Adam,
        "SGD": optim.SGD,
    }

    if optimizer_type not in optimizer_registry:
        raise ValueError(f"Unsupported optimizer type: {optimizer_type}")

    if optimizer_type == "Adam":
        optimizer_params.setdefault("lr", 0.001)

    return optimizer_registry[optimizer_type](model_params, **optimizer_params)


class ComponentFactory:
    """
    Factory pattern returning torch.nn modules based on schema representations.
    Complies with Open/Closed Principle: layers are registered dynamically, allowing
    easy addition of new types without modifying the core factory logic.
    """

    _registry: Dict[str, LayerBuilder] = {}

    @classmethod
    def register(cls, node_type: str) -> Callable[[LayerBuilder], LayerBuilder]:
        def decorator(builder: LayerBuilder) -> LayerBuilder:
            cls._registry[node_type] = builder
            return builder

        return decorator

    @classmethod
    def create_layer(cls, node: NodeConfig) -> nn.Module:
        if node.type not in cls._registry:
            raise NotImplementedError(
                f"Compilation for layer type {node.type} is not yet implemented."
            )
        builder = cls._registry[node.type]
        return builder(node)


# --- Convolution & Pooling ---


@ComponentFactory.register("Conv2d")
def _build_conv2d(node: NodeConfig) -> nn.Module:
    # Explicit type narrowing to prevent Pylance type-checking errors
    if node.type != "Conv2d":
        raise ValueError("Expected Conv2d")
    p = node.params
    return nn.Conv2d(
        p.in_channels,
        p.out_channels,
        p.kernel_size,
        p.stride,
        p.padding,
        p.dilation,
        p.groups,
        p.bias,
    )


@ComponentFactory.register("MaxPool2d")
def _build_maxpool2d(node: NodeConfig) -> nn.Module:
    if node.type != "MaxPool2d":
        raise ValueError("Expected MaxPool2d")
    p = node.params
    return nn.MaxPool2d(p.kernel_size, p.stride, p.padding)


@ComponentFactory.register("AdaptiveAvgPool2d")
def _build_adaptiveavgpool2d(node: NodeConfig) -> nn.Module:
    if node.type != "AdaptiveAvgPool2d":
        raise ValueError("Expected AdaptiveAvgPool2d")
    p = node.params
    out_size = (
        tuple(p.output_size) if isinstance(p.output_size, list) else p.output_size
    )
    return nn.AdaptiveAvgPool2d(out_size)


# --- Linear & Embedding ---


@ComponentFactory.register("Linear")
def _build_linear(node: NodeConfig) -> nn.Module:
    if node.type != "Linear":
        raise ValueError("Expected Linear")
    p = node.params
    return nn.Linear(p.in_features, p.out_features, p.bias)


# --- Normalization ---


@ComponentFactory.register("BatchNorm2d")
def _build_batchnorm2d(node: NodeConfig) -> nn.Module:
    if node.type != "BatchNorm2d":
        raise ValueError("Expected BatchNorm2d")
    p = node.params
    return nn.BatchNorm2d(p.num_features, p.eps, p.momentum, p.affine)


# --- Activations ---


@ComponentFactory.register("ReLU")
def _build_relu(node: NodeConfig) -> nn.Module:
    if node.type != "ReLU":
        raise ValueError("Expected ReLU")
    p = node.params
    return nn.ReLU(p.inplace)


@ComponentFactory.register("GELU")
def _build_gelu(node: NodeConfig) -> nn.Module:
    if node.type != "GELU":
        raise ValueError("Expected GELU")
    p = node.params
    return nn.GELU(approximate=p.approximate)


@ComponentFactory.register("Softmax")
def _build_softmax(node: NodeConfig) -> nn.Module:
    if node.type != "Softmax":
        raise ValueError("Expected Softmax")
    p = node.params
    return nn.Softmax(dim=p.dim)


# --- Shape Manipulation ---


@ComponentFactory.register("Flatten")
def _build_flatten(node: NodeConfig) -> nn.Module:
    if node.type != "Flatten":
        raise ValueError("Expected Flatten")
    p = node.params
    return nn.Flatten(p.start_dim, p.end_dim)


# --- Multi-Input Operations ---


@ComponentFactory.register("Add")
def _build_add(node: NodeConfig) -> nn.Module:
    _ = node  # Not needed for Add operation
    return AddModule()


@ComponentFactory.register("Concat")
def _build_concat(node: NodeConfig) -> nn.Module:
    if node.type != "Concat":
        raise ValueError("Expected Concat")
    p = node.params
    return ConcatModule(dim=p.dim)
