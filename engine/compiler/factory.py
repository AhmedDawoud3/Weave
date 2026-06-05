from collections.abc import Callable, Iterable
from typing import Any

import torch.nn as nn
import torch.optim as optim
from torch.nn.parameter import Parameter

from schemas import (
    AdaptiveAvgPool2dNode,
    BatchNorm2dNode,
    ChannelScaleBiasNode,
    ConcatNode,
    Conv2dNode,
    CustomAutogradNode,
    DivNode,
    FlattenNode,
    GELUNode,
    LinearNode,
    MatMulNode,
    MaxPool2dNode,
    MeanNode,
    NodeConfig,
    PermuteNode,
    ReLUNode,
    ReshapeNode,
    ScaleNode,
    SliceNode,
    SoftmaxNode,
    SqrtNode,
    SubNode,
    TanhNode,
    VarNode,
)

from .modules import (
    AddModule,
    ChannelScaleBias,
    ConcatModule,
    CustomAutogradModule,
    DivModule,
    MatMulModule,
    MeanModule,
    MultiplyModule,
    PermuteModule,
    ReshapeModule,
    ScaleModule,
    SliceModule,
    SqrtModule,
    SubModule,
    TanhModule,
    VarModule,
)

# Type alias for a function that takes a NodeConfig and returns an nn.Module
LayerBuilder = Callable[[NodeConfig], nn.Module]


def _normalize_config(config: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    """Extract and flatten parameters from a config dictionary.

    Handles both flat schema (e.g. {"type": "Resize", "size": 128}) and
    nested params schema (e.g. {"type": "Resize", "params": {"size": 128}}).

    Args:
        config: Configuration dictionary with a "type" key and optional "params" key.

    Returns:
        A tuple of (type_string, flattened_params_dict).

    Raises:
        ValueError: If "type" is missing or empty, or if "params" is not a dict.
    """
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
    """Create a PyTorch loss function from a configuration dictionary.

    Args:
        config: Configuration with "type" (e.g. "CrossEntropyLoss", "MSELoss")
            and optional "params" for loss function keyword arguments.

    Returns:
        An instantiated PyTorch loss function (nn.Module).

    Raises:
        ValueError: If the loss type is not supported.
    """
    loss_type, loss_params = _normalize_config(config)

    loss_registry: dict[str, type[nn.Module]] = {
        "CrossEntropyLoss": nn.CrossEntropyLoss,
        "MSELoss": nn.MSELoss,
        "NLLLoss": nn.NLLLoss,
        "BCEWithLogitsLoss": nn.BCEWithLogitsLoss,
        "L1Loss": nn.L1Loss,
    }

    if loss_type not in loss_registry:
        raise ValueError(f"Unsupported loss type: {loss_type}")

    return loss_registry[loss_type](**loss_params)


def get_optimizer(
    model_params: Iterable[Parameter], config: dict[str, Any]
) -> optim.Optimizer:
    """Create a PyTorch optimizer from a configuration dictionary.

    Args:
        model_params: Iterable of model parameters to optimize.
        config: Configuration with "type" (e.g. "Adam", "SGD") and optional
            "params" for optimizer keyword arguments.

    Returns:
        An instantiated PyTorch optimizer.

    Raises:
        ValueError: If the optimizer type is not supported.
    """
    optimizer_type, optimizer_params = _normalize_config(config)

    optimizer_registry = {
        "Adam": optim.Adam,
        "SGD": optim.SGD,
        "AdamW": optim.AdamW,
        "RMSprop": optim.RMSprop,
        "Adagrad": optim.Adagrad,
    }

    if optimizer_type not in optimizer_registry:
        raise ValueError(f"Unsupported optimizer type: {optimizer_type}")

    if optimizer_type in {"Adam", "AdamW"}:
        optimizer_params.setdefault("lr", 0.001)

    return optimizer_registry[optimizer_type](model_params, **optimizer_params)


class ComponentFactory:
    """
    Factory pattern returning torch.nn modules based on schema representations.
    Complies with Open/Closed Principle: layers are registered dynamically, allowing
    easy addition of new types without modifying the core factory logic.
    """

    _registry: dict[str, LayerBuilder] = {}

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
    if not isinstance(node, Conv2dNode):
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
    if not isinstance(node, MaxPool2dNode):
        raise ValueError("Expected MaxPool2d")
    p = node.params
    return nn.MaxPool2d(p.kernel_size, p.stride, p.padding)


@ComponentFactory.register("AdaptiveAvgPool2d")
def _build_adaptiveavgpool2d(node: NodeConfig) -> nn.Module:
    if not isinstance(node, AdaptiveAvgPool2dNode):
        raise ValueError("Expected AdaptiveAvgPool2d")
    p = node.params
    out_size = (
        tuple(p.output_size) if isinstance(p.output_size, list) else p.output_size
    )
    return nn.AdaptiveAvgPool2d(out_size)


# --- Linear & Embedding ---


@ComponentFactory.register("Linear")
def _build_linear(node: NodeConfig) -> nn.Module:
    if not isinstance(node, LinearNode):
        raise ValueError("Expected Linear")
    p = node.params
    return nn.Linear(p.in_features, p.out_features, p.bias)


# --- Normalization ---


@ComponentFactory.register("BatchNorm2d")
def _build_batchnorm2d(node: NodeConfig) -> nn.Module:
    if not isinstance(node, BatchNorm2dNode):
        raise ValueError("Expected BatchNorm2d")
    p = node.params
    return nn.BatchNorm2d(p.num_features, p.eps, p.momentum, p.affine)


# --- Activations ---


@ComponentFactory.register("ReLU")
def _build_relu(node: NodeConfig) -> nn.Module:
    if not isinstance(node, ReLUNode):
        raise ValueError("Expected ReLU")
    p = node.params
    return nn.ReLU(p.inplace)


@ComponentFactory.register("GELU")
def _build_gelu(node: NodeConfig) -> nn.Module:
    if not isinstance(node, GELUNode):
        raise ValueError("Expected GELU")
    p = node.params
    return nn.GELU(approximate=p.approximate)


@ComponentFactory.register("Softmax")
def _build_softmax(node: NodeConfig) -> nn.Module:
    if not isinstance(node, SoftmaxNode):
        raise ValueError("Expected Softmax")
    p = node.params
    return nn.Softmax(dim=p.dim)


# --- Shape Manipulation ---


@ComponentFactory.register("Flatten")
def _build_flatten(node: NodeConfig) -> nn.Module:
    if not isinstance(node, FlattenNode):
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
    if not isinstance(node, ConcatNode):
        raise ValueError("Expected Concat")
    p = node.params
    return ConcatModule(dim=p.dim)


@ComponentFactory.register("Multiply")
def _build_multiply(node: NodeConfig) -> nn.Module:
    _ = node  # Not needed for Multiply operation
    return MultiplyModule()


@ComponentFactory.register("Sub")
def _build_sub(node: NodeConfig) -> nn.Module:
    if not isinstance(node, SubNode):
        raise ValueError("Expected Sub")
    return SubModule()


@ComponentFactory.register("Div")
def _build_div(node: NodeConfig) -> nn.Module:
    if not isinstance(node, DivNode):
        raise ValueError("Expected Div")
    return DivModule()


@ComponentFactory.register("Sqrt")
def _build_sqrt(node: NodeConfig) -> nn.Module:
    if not isinstance(node, SqrtNode):
        raise ValueError("Expected Sqrt")
    p = node.params
    return SqrtModule(eps=p.eps)


@ComponentFactory.register("Mean")
def _build_mean(node: NodeConfig) -> nn.Module:
    if not isinstance(node, MeanNode):
        raise ValueError("Expected Mean")
    p = node.params
    return MeanModule(dim=p.dim, keepdim=p.keepdim)


@ComponentFactory.register("Var")
def _build_var(node: NodeConfig) -> nn.Module:
    if not isinstance(node, VarNode):
        raise ValueError("Expected Var")
    p = node.params
    return VarModule(dim=p.dim, keepdim=p.keepdim, unbiased=p.unbiased)


@ComponentFactory.register("MatMul")
def _build_matmul(node: NodeConfig) -> nn.Module:
    if not isinstance(node, MatMulNode):
        raise ValueError("Expected MatMul")
    return MatMulModule()


@ComponentFactory.register("Scale")
def _build_scale(node: NodeConfig) -> nn.Module:
    if not isinstance(node, ScaleNode):
        raise ValueError("Expected Scale")
    p = node.params
    return ScaleModule(value=p.value)


@ComponentFactory.register("ChannelScaleBias")
def _build_channel_scale_bias(node: NodeConfig) -> nn.Module:
    if not isinstance(node, ChannelScaleBiasNode):
        raise ValueError("Expected ChannelScaleBias")
    p = node.params
    return ChannelScaleBias(num_features=p.num_features)


@ComponentFactory.register("Slice")
def _build_slice(node: NodeConfig) -> nn.Module:
    if not isinstance(node, SliceNode):
        raise ValueError("Expected Slice")
    p = node.params
    return SliceModule(dim=p.dim, index=p.index)


@ComponentFactory.register("Permute")
def _build_permute(node: NodeConfig) -> nn.Module:
    if not isinstance(node, PermuteNode):
        raise ValueError("Expected Permute")
    p = node.params
    return PermuteModule(dims=p.dims)


@ComponentFactory.register("Tanh")
def _build_tanh(node: NodeConfig) -> nn.Module:
    if not isinstance(node, TanhNode):
        raise ValueError("Expected Tanh")
    return TanhModule()


@ComponentFactory.register("CustomAutograd")
def _build_custom_autograd(node: NodeConfig) -> nn.Module:
    if not isinstance(node, CustomAutogradNode):
        raise ValueError("Expected CustomAutograd")
    p = node.params
    return CustomAutogradModule(
        forward_code=p.forward_code, backward_code=p.backward_code
    )


@ComponentFactory.register("Reshape")
def _build_reshape(node: NodeConfig) -> nn.Module:
    if not isinstance(node, ReshapeNode):
        raise ValueError("Expected Reshape")
    p = node.params
    return ReshapeModule(target_shape=p.target_shape)
