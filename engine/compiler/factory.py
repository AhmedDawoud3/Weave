from collections.abc import Callable, Iterable
from typing import Any

import torch.nn as nn
import torch.optim as optim
from torch.nn.parameter import Parameter

from schemas import (
    AdaptiveAvgPool2dNode,
    AvgPool2dNode,
    BatchNorm1dNode,
    BatchNorm2dNode,
    CausalMaskNode,
    ChannelScaleBiasNode,
    ConcatNode,
    Conv1dNode,
    Conv2dNode,
    ConvTranspose2dNode,
    CustomAutogradNode,
    DivNode,
    Dropout2dNode,
    DropoutNode,
    ELUNode,
    EmbeddingNode,
    FeedForwardNode,
    FlattenConsecutiveNode,
    FlattenNode,
    GELUNode,
    GroupNormNode,
    LayerNormNode,
    LeakyReLUNode,
    LinearNode,
    MatMulNode,
    MaxPool1dNode,
    MaxPool2dNode,
    MeanNode,
    NodeConfig,
    PermuteNode,
    PositionalEncodingNode,
    PReLUNode,
    ReLUNode,
    ReshapeNode,
    ScaleNode,
    SelfAttentionNode,
    SigmoidNode,
    SiLUNode,
    SliceNode,
    SoftmaxNode,
    SqrtNode,
    SubNode,
    TanhNode,
    VarNode,
)

from .modules import (
    AddModule,
    CausalMaskModule,
    ChannelScaleBias,
    ConcatModule,
    CustomAutogradModule,
    DivModule,
    FeedForwardModule,
    FlattenConsecutiveModule,
    MatMulModule,
    MeanModule,
    MultiplyModule,
    PermuteModule,
    PositionalEncodingModule,
    ReshapeModule,
    ScaleModule,
    SelfAttentionModule,
    SliceModule,
    SqrtModule,
    SubModule,
    VarModule,
)

# Type alias for a function that takes a NodeConfig and returns an nn.Module
LayerBuilder = Callable[[NodeConfig], nn.Module]


def _apply_init(module: nn.Module, scheme: str, gain: float | None, fan_mode: str) -> None:
    """Apply weight initialization to a module based on the given scheme.

    Auto heuristics:
    - Conv* / Linear  -> kaiming_uniform (good for ReLU/GELU/SiLU families)
    - Embedding       -> normal(0, 1/sqrt(embedding_dim))
    - 'auto' uses these defaults.
    """
    import math

    import torch.nn as nn

    if scheme == "auto":
        if isinstance(module, (nn.Conv1d, nn.Conv2d, nn.ConvTranspose2d, nn.Linear)):
            nn.init.kaiming_uniform_(module.weight, a=math.sqrt(5))
            if module.bias is not None:
                fan_in, _ = nn.init._calculate_fan_in_and_fan_out(module.weight)
                bound = 1 / math.sqrt(fan_in) if fan_in > 0 else 0
                nn.init.uniform_(module.bias, -bound, bound)
        elif isinstance(module, nn.Embedding):
            nn.init.normal_(module.weight, mean=0.0, std=1.0 / math.sqrt(module.embedding_dim))
        # all other modules: leave PyTorch defaults
        return

    # Manual override schemes
    _gain = gain if gain is not None else 1.0
    weight = getattr(module, "weight", None)
    if weight is None:
        return

    if scheme == "xavier_uniform":
        nn.init.xavier_uniform_(weight, gain=_gain)
    elif scheme == "xavier_normal":
        nn.init.xavier_normal_(weight, gain=_gain)
    elif scheme == "kaiming_uniform":
        nn.init.kaiming_uniform_(weight, mode=fan_mode)
    elif scheme == "kaiming_normal":
        nn.init.kaiming_normal_(weight, mode=fan_mode)
    elif scheme == "zeros":
        nn.init.zeros_(weight)
    elif scheme == "ones":
        nn.init.ones_(weight)
    elif scheme == "normal":
        nn.init.normal_(weight, std=_gain)
    elif scheme == "uniform":
        nn.init.uniform_(weight, -_gain, _gain)



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
    m = nn.Conv2d(
        p.in_channels,
        p.out_channels,
        p.kernel_size,
        p.stride,
        p.padding,
        p.dilation,
        p.groups,
        p.bias,
    )
    _apply_init(m, p.init_scheme, p.init_gain, p.init_fan_mode)
    return m


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
    m = nn.Linear(p.in_features, p.out_features, p.bias)
    _apply_init(m, p.init_scheme, p.init_gain, p.init_fan_mode)
    return m


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
    return nn.Tanh()


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


@ComponentFactory.register("ConvTranspose2d")
def _build_convtranspose2d(node: NodeConfig) -> nn.Module:
    if not isinstance(node, ConvTranspose2dNode):
        raise ValueError("Expected ConvTranspose2d")
    p = node.params
    m = nn.ConvTranspose2d(
        p.in_channels,
        p.out_channels,
        p.kernel_size,
        p.stride,
        p.padding,
        p.output_padding,
        p.bias,
    )
    _apply_init(m, p.init_scheme, p.init_gain, p.init_fan_mode)
    return m


@ComponentFactory.register("AvgPool2d")
def _build_avgpool2d(node: NodeConfig) -> nn.Module:
    if not isinstance(node, AvgPool2dNode):
        raise ValueError("Expected AvgPool2d")
    p = node.params
    return nn.AvgPool2d(p.kernel_size, p.stride, p.padding)


@ComponentFactory.register("Embedding")
def _build_embedding(node: NodeConfig) -> nn.Module:
    if not isinstance(node, EmbeddingNode):
        raise ValueError("Expected Embedding")
    p = node.params
    m = nn.Embedding(p.num_embeddings, p.embedding_dim, p.padding_idx)
    _apply_init(m, p.init_scheme, p.init_gain, p.init_fan_mode)
    return m


# --- 1D Convolution & Pooling ---


@ComponentFactory.register("Conv1d")
def _build_conv1d(node: NodeConfig) -> nn.Module:
    if not isinstance(node, Conv1dNode):
        raise ValueError("Expected Conv1d")
    p = node.params
    m = nn.Conv1d(
        p.in_channels,
        p.out_channels,
        p.kernel_size,
        p.stride,
        p.padding,
        p.dilation,
        p.groups,
        p.bias,
    )
    _apply_init(m, p.init_scheme, p.init_gain, p.init_fan_mode)
    return m


@ComponentFactory.register("MaxPool1d")
def _build_maxpool1d(node: NodeConfig) -> nn.Module:
    if not isinstance(node, MaxPool1dNode):
        raise ValueError("Expected MaxPool1d")
    p = node.params
    return nn.MaxPool1d(p.kernel_size, p.stride, p.padding)


@ComponentFactory.register("BatchNorm1d")
def _build_batchnorm1d(node: NodeConfig) -> nn.Module:
    if not isinstance(node, BatchNorm1dNode):
        raise ValueError("Expected BatchNorm1d")
    p = node.params
    return nn.BatchNorm1d(p.num_features, p.eps, p.momentum, p.affine)


@ComponentFactory.register("FlattenConsecutive")
def _build_flatten_consecutive(node: NodeConfig) -> nn.Module:
    if not isinstance(node, FlattenConsecutiveNode):
        raise ValueError("Expected FlattenConsecutive")
    p = node.params
    return FlattenConsecutiveModule(n=p.n)


# --- Transformer Primitives ---


@ComponentFactory.register("SelfAttention")
def _build_self_attention(node: NodeConfig) -> nn.Module:
    if not isinstance(node, SelfAttentionNode):
        raise ValueError("Expected SelfAttention")
    p = node.params
    return SelfAttentionModule(
        embed_dim=p.embed_dim,
        num_heads=p.num_heads,
        dropout=p.dropout,
        causal=p.causal,
        bias=p.bias,
    )


@ComponentFactory.register("PositionalEncoding")
def _build_positional_encoding(node: NodeConfig) -> nn.Module:
    if not isinstance(node, PositionalEncodingNode):
        raise ValueError("Expected PositionalEncoding")
    p = node.params
    return PositionalEncodingModule(
        embed_dim=p.embed_dim,
        max_seq_len=p.max_seq_len,
        pe_type=p.pe_type,
    )


@ComponentFactory.register("CausalMask")
def _build_causal_mask(node: NodeConfig) -> nn.Module:
    return CausalMaskModule()


@ComponentFactory.register("FeedForward")
def _build_feedforward(node: NodeConfig) -> nn.Module:
    if not isinstance(node, FeedForwardNode):
        raise ValueError("Expected FeedForward")
    p = node.params
    return FeedForwardModule(
        embed_dim=p.embed_dim,
        expansion=p.expansion,
        dropout=p.dropout,
    )


# --- Additional Activations ---


@ComponentFactory.register("LeakyReLU")
def _build_leakyrelu(node: NodeConfig) -> nn.Module:
    if not isinstance(node, LeakyReLUNode):
        raise ValueError("Expected LeakyReLU")
    p = node.params
    return nn.LeakyReLU(negative_slope=p.negative_slope, inplace=p.inplace)


@ComponentFactory.register("SiLU")
def _build_silu(node: NodeConfig) -> nn.Module:
    if not isinstance(node, SiLUNode):
        raise ValueError("Expected SiLU")
    p = node.params
    return nn.SiLU(inplace=p.inplace)


@ComponentFactory.register("ELU")
def _build_elu(node: NodeConfig) -> nn.Module:
    if not isinstance(node, ELUNode):
        raise ValueError("Expected ELU")
    p = node.params
    return nn.ELU(alpha=p.alpha, inplace=p.inplace)


@ComponentFactory.register("PReLU")
def _build_prelu(node: NodeConfig) -> nn.Module:
    if not isinstance(node, PReLUNode):
        raise ValueError("Expected PReLU")
    p = node.params
    return nn.PReLU(num_parameters=p.num_parameters, init=p.init)


@ComponentFactory.register("LayerNorm")
def _build_layernorm(node: NodeConfig) -> nn.Module:
    if not isinstance(node, LayerNormNode):
        raise ValueError("Expected LayerNorm")
    p = node.params
    norm_shape = p.normalized_shape
    return nn.LayerNorm(norm_shape, p.eps)


@ComponentFactory.register("GroupNorm")
def _build_groupnorm(node: NodeConfig) -> nn.Module:
    if not isinstance(node, GroupNormNode):
        raise ValueError("Expected GroupNorm")
    p = node.params
    return nn.GroupNorm(p.num_groups, p.num_channels, p.eps)


@ComponentFactory.register("Sigmoid")
def _build_sigmoid(node: NodeConfig) -> nn.Module:
    if not isinstance(node, SigmoidNode):
        raise ValueError("Expected Sigmoid")
    return nn.Sigmoid()


@ComponentFactory.register("Dropout")
def _build_dropout(node: NodeConfig) -> nn.Module:
    if not isinstance(node, DropoutNode):
        raise ValueError("Expected Dropout")
    p = node.params
    return nn.Dropout(p.p, p.inplace)


@ComponentFactory.register("Dropout2d")
def _build_dropout2d(node: NodeConfig) -> nn.Module:
    if not isinstance(node, Dropout2dNode):
        raise ValueError("Expected Dropout2d")
    p = node.params
    return nn.Dropout2d(p.p, p.inplace)


class IdentityModule(nn.Module):
    def forward(self, x):
        return x


class StackModule(nn.Module):
    def __init__(self, blocks):
        super().__init__()
        self.blocks = nn.ModuleList(blocks)

    def forward(self, x, *args, **kwargs):
        for block in self.blocks:
            if isinstance(x, tuple):
                x = block(*x, **kwargs)
            else:
                x = block(x, *args, **kwargs)
        return x


@ComponentFactory.register("InputPort")
@ComponentFactory.register("OutputPort")
def _build_port(node: NodeConfig) -> nn.Module:
    return IdentityModule()


@ComponentFactory.register("Stack")
def _build_stack(node: NodeConfig) -> nn.Module:
    count = node.params.count
    subgraph = node.graph
    from compiler.compiler import GraphCompiler
    compiler = GraphCompiler()
    blocks = [compiler.compile(subgraph) for _ in range(count)]
    return StackModule(blocks)


@ComponentFactory.register("Module")
def _build_module(node: NodeConfig) -> nn.Module:
    subgraph = getattr(node, "graph", None)
    if subgraph is None:
        raise ValueError(f"Module node '{node.id}' is missing graph.")

    subgraph_dict = subgraph.model_dump()
    param_overrides = getattr(node, "param_overrides", {}) or {}
    configurable_params = getattr(node, "configurable_params", []) or []

    param_map = {}
    for cp in configurable_params:
        param_map[cp.display_name] = (cp.inner_node_id, cp.param_name)

    for key, val in param_overrides.items():
        if key in param_map:
            inner_node_id, param_name = param_map[key]
        elif "." in key:
            inner_node_id, param_name = key.split(".", 1)
        else:
            continue
        for inner_node in subgraph_dict.get("nodes", []):
            if inner_node.get("id") == inner_node_id:
                if "params" not in inner_node or inner_node["params"] is None:
                    inner_node["params"] = {}
                inner_node["params"][param_name] = val
                break

    from compiler.compiler import GraphCompiler
    compiler = GraphCompiler()
    return compiler.compile(subgraph_dict)


@ComponentFactory.register("ResidualBlock")
@ComponentFactory.register("TransformerEncoder")
@ComponentFactory.register("MultiHeadAttention")
@ComponentFactory.register("ConvBNReLU")
@ComponentFactory.register("BottleneckBlock")
@ComponentFactory.register("Block")
@ComponentFactory.register("BatchNorm2dManualBlock")
@ComponentFactory.register("AttentionManualBlock")
@ComponentFactory.register("RNNManualBlock")
@ComponentFactory.register("CustomAutogradManualBlock")
def _build_block(node: NodeConfig) -> nn.Module:
    subgraph = getattr(node, "graph", None)
    if subgraph is None:
        raise ValueError(f"Block node '{node.id}' of type '{node.type}' is missing its nested graph.")
    from compiler.compiler import GraphCompiler
    compiler = GraphCompiler()
    return compiler.compile(subgraph)
