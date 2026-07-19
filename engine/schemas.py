"""
schemas.py — Weave Python Backend
==================================
Single source of truth for all data contracts.
Every request into the FastAPI server is validated here before
any other code runs.

Think of this as the "Models" folder in an ASP.NET Core project.

Author: Omar Elzarka
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, ConfigDict, Field

# =============================================================================
# SECTION 1 — LAYER PARAMS
# One params class per layer type.
# These are like your DTO/Request model classes in C#.
# Required fields have no default. Optional fields have a default value.
# =============================================================================


# --- Convolution & Pooling ---------------------------------------------------


class Conv2dParams(BaseModel):
    in_channels: int
    out_channels: int
    kernel_size: int
    stride: int = 1
    padding: int = 0
    dilation: int = 1
    groups: int = 1
    bias: bool = True
    # Weight initialization
    init_scheme: str = "auto"  # auto | xavier_uniform | xavier_normal | kaiming_uniform | kaiming_normal | zeros | ones | normal | uniform
    init_gain: float | None = None
    init_fan_mode: str = "fan_in"  # fan_in | fan_out


class ConvTranspose2dParams(BaseModel):
    in_channels: int
    out_channels: int
    kernel_size: int
    stride: int = 1
    padding: int = 0
    output_padding: int = 0
    bias: bool = True
    # Weight initialization
    init_scheme: str = "auto"
    init_gain: float | None = None
    init_fan_mode: str = "fan_in"


class MaxPool2dParams(BaseModel):
    kernel_size: int
    stride: int | None = None
    padding: int = 0


class AvgPool2dParams(BaseModel):
    kernel_size: int
    stride: int | None = None
    padding: int = 0


class AdaptiveAvgPool2dParams(BaseModel):
    output_size: int | list[int]


# --- Linear & Embedding ------------------------------------------------------


class LinearParams(BaseModel):
    in_features: int
    out_features: int
    bias: bool = True
    # Weight initialization
    init_scheme: str = "auto"
    init_gain: float | None = None
    init_fan_mode: str = "fan_in"


class EmbeddingParams(BaseModel):
    num_embeddings: int
    embedding_dim: int
    padding_idx: int | None = None
    # Weight initialization
    init_scheme: str = "auto"
    init_gain: float | None = None
    init_fan_mode: str = "fan_in"


# --- Normalization ------------------------------------------------------------


class BatchNorm2dParams(BaseModel):
    num_features: int
    eps: float = 1e-5
    momentum: float = 0.1
    affine: bool = True


class SubParams(BaseModel):
    pass


class DivParams(BaseModel):
    pass


class SqrtParams(BaseModel):
    eps: float = 0.0


class MeanParams(BaseModel):
    dim: list[int]
    keepdim: bool = True


class VarParams(BaseModel):
    dim: list[int]
    keepdim: bool = True
    unbiased: bool = False


class MatMulParams(BaseModel):
    pass


class ScaleParams(BaseModel):
    value: float


class ChannelScaleBiasParams(BaseModel):
    num_features: int


class SliceParams(BaseModel):
    dim: int
    index: int


class LayerNormParams(BaseModel):
    normalized_shape: int | list[int]
    eps: float = 1e-5


class GroupNormParams(BaseModel):
    num_groups: int
    num_channels: int
    eps: float = 1e-5


# --- Activations -------------------------------------------------------------


class ReLUParams(BaseModel):
    inplace: bool = False


class GELUParams(BaseModel):
    approximate: str = "none"


class SigmoidParams(BaseModel):
    pass


class TanhParams(BaseModel):
    pass


class CustomAutogradParams(BaseModel):
    forward_code: str
    backward_code: str


class SoftmaxParams(BaseModel):
    dim: int  # required — which dimension to apply softmax over


# --- Shape Manipulation ------------------------------------------------------


class FlattenParams(BaseModel):
    start_dim: int = 1
    end_dim: int = -1


class ReshapeParams(BaseModel):
    target_shape: list[int]


class PermuteParams(BaseModel):
    dims: list[int]


# --- Regularization ----------------------------------------------------------


class DropoutParams(BaseModel):
    p: float = 0.5
    inplace: bool = False


class Dropout2dParams(BaseModel):
    p: float = 0.5
    inplace: bool = False


# --- Multi-Input Operations --------------------------------------------------


class AddParams(BaseModel):
    pass


class ConcatParams(BaseModel):
    dim: int = 1


class MultiplyParams(BaseModel):
    pass


# --- 1D Convolution & Pooling ------------------------------------------------


class Conv1dParams(BaseModel):
    in_channels: int
    out_channels: int
    kernel_size: int
    stride: int = 1
    padding: int = 0
    dilation: int = 1
    groups: int = 1
    bias: bool = True
    # Weight initialization
    init_scheme: str = "auto"
    init_gain: float | None = None
    init_fan_mode: str = "fan_in"


class MaxPool1dParams(BaseModel):
    kernel_size: int
    stride: int | None = None
    padding: int = 0


class BatchNorm1dParams(BaseModel):
    num_features: int
    eps: float = 1e-5
    momentum: float = 0.1
    affine: bool = True


class FlattenConsecutiveParams(BaseModel):
    n: int = 2  # merge factor: (B, T, C) -> (B, T//n, C*n)


# --- Transformer Primitives --------------------------------------------------


class SelfAttentionParams(BaseModel):
    embed_dim: int
    num_heads: int
    dropout: float = 0.0
    causal: bool = True
    bias: bool = True


class PositionalEncodingParams(BaseModel):
    embed_dim: int
    max_seq_len: int = 1024
    pe_type: str = "sinusoidal"  # sinusoidal | learned


class CausalMaskParams(BaseModel):
    pass


class FeedForwardParams(BaseModel):
    embed_dim: int
    expansion: int = 4
    dropout: float = 0.0


# --- Additional Activations --------------------------------------------------


class LeakyReLUParams(BaseModel):
    negative_slope: float = 0.01
    inplace: bool = False


class SiLUParams(BaseModel):
    inplace: bool = False


class ELUParams(BaseModel):
    alpha: float = 1.0
    inplace: bool = False


class PReLUParams(BaseModel):
    num_parameters: int = 1
    init: float = 0.25


# =============================================================================
# SECTION 2 — NODE CLASSES
# Each node type gets its own class with a Literal type field.
# Literal["Conv2d"] means the "type" field MUST be exactly "Conv2d".
# =============================================================================


class Conv2dNode(BaseModel):
    id: str
    type: Literal["Conv2d"]
    params: Conv2dParams


class ConvTranspose2dNode(BaseModel):
    id: str
    type: Literal["ConvTranspose2d"]
    params: ConvTranspose2dParams


class MaxPool2dNode(BaseModel):
    id: str
    type: Literal["MaxPool2d"]
    params: MaxPool2dParams


class AvgPool2dNode(BaseModel):
    id: str
    type: Literal["AvgPool2d"]
    params: AvgPool2dParams


class AdaptiveAvgPool2dNode(BaseModel):
    id: str
    type: Literal["AdaptiveAvgPool2d"]
    params: AdaptiveAvgPool2dParams


class LinearNode(BaseModel):
    id: str
    type: Literal["Linear"]
    params: LinearParams


class EmbeddingNode(BaseModel):
    id: str
    type: Literal["Embedding"]
    params: EmbeddingParams


class BatchNorm2dNode(BaseModel):
    id: str
    type: Literal["BatchNorm2d"]
    params: BatchNorm2dParams


class SubNode(BaseModel):
    id: str
    type: Literal["Sub"]
    params: SubParams = SubParams()


class DivNode(BaseModel):
    id: str
    type: Literal["Div"]
    params: DivParams = DivParams()


class SqrtNode(BaseModel):
    id: str
    type: Literal["Sqrt"]
    params: SqrtParams = SqrtParams()


class MeanNode(BaseModel):
    id: str
    type: Literal["Mean"]
    params: MeanParams


class VarNode(BaseModel):
    id: str
    type: Literal["Var"]
    params: VarParams


class MatMulNode(BaseModel):
    id: str
    type: Literal["MatMul"]
    params: MatMulParams = MatMulParams()


class ScaleNode(BaseModel):
    id: str
    type: Literal["Scale"]
    params: ScaleParams


class ChannelScaleBiasNode(BaseModel):
    id: str
    type: Literal["ChannelScaleBias"]
    params: ChannelScaleBiasParams


class SliceNode(BaseModel):
    id: str
    type: Literal["Slice"]
    params: SliceParams


class LayerNormNode(BaseModel):
    id: str
    type: Literal["LayerNorm"]
    params: LayerNormParams


class GroupNormNode(BaseModel):
    id: str
    type: Literal["GroupNorm"]
    params: GroupNormParams


class ReLUNode(BaseModel):
    id: str
    type: Literal["ReLU"]
    params: ReLUParams = Field(default_factory=ReLUParams)


class GELUNode(BaseModel):
    id: str
    type: Literal["GELU"]
    params: GELUParams = Field(default_factory=GELUParams)


class SigmoidNode(BaseModel):
    id: str
    type: Literal["Sigmoid"]
    params: SigmoidParams = Field(default_factory=SigmoidParams)


class TanhNode(BaseModel):
    id: str
    type: Literal["Tanh"]
    params: TanhParams = Field(default_factory=TanhParams)


class CustomAutogradNode(BaseModel):
    id: str
    type: Literal["CustomAutograd"]
    params: CustomAutogradParams


class SoftmaxNode(BaseModel):
    id: str
    type: Literal["Softmax"]
    params: SoftmaxParams


class FlattenNode(BaseModel):
    id: str
    type: Literal["Flatten"]
    params: FlattenParams = FlattenParams()


class ReshapeNode(BaseModel):
    id: str
    type: Literal["Reshape"]
    params: ReshapeParams


class PermuteNode(BaseModel):
    id: str
    type: Literal["Permute"]
    params: PermuteParams


class DropoutNode(BaseModel):
    id: str
    type: Literal["Dropout"]
    params: DropoutParams = DropoutParams()


class Dropout2dNode(BaseModel):
    id: str
    type: Literal["Dropout2d"]
    params: Dropout2dParams = Dropout2dParams()


class AddNode(BaseModel):
    id: str
    type: Literal["Add"]
    params: AddParams = AddParams()


class ConcatNode(BaseModel):
    id: str
    type: Literal["Concat"]
    params: ConcatParams = ConcatParams()


class MultiplyNode(BaseModel):
    id: str
    type: Literal["Multiply"]
    params: MultiplyParams = MultiplyParams()


# --- 1D Convolution & Pooling Nodes ------------------------------------------


class Conv1dNode(BaseModel):
    id: str
    type: Literal["Conv1d"]
    params: Conv1dParams


class MaxPool1dNode(BaseModel):
    id: str
    type: Literal["MaxPool1d"]
    params: MaxPool1dParams


class BatchNorm1dNode(BaseModel):
    id: str
    type: Literal["BatchNorm1d"]
    params: BatchNorm1dParams


class FlattenConsecutiveNode(BaseModel):
    id: str
    type: Literal["FlattenConsecutive"]
    params: FlattenConsecutiveParams = FlattenConsecutiveParams()


# --- Transformer Primitive Nodes ---------------------------------------------


class SelfAttentionNode(BaseModel):
    id: str
    type: Literal["SelfAttention"]
    params: SelfAttentionParams


class PositionalEncodingNode(BaseModel):
    id: str
    type: Literal["PositionalEncoding"]
    params: PositionalEncodingParams


class CausalMaskNode(BaseModel):
    id: str
    type: Literal["CausalMask"]
    params: CausalMaskParams = CausalMaskParams()


class FeedForwardNode(BaseModel):
    id: str
    type: Literal["FeedForward"]
    params: FeedForwardParams


# --- Additional Activation Nodes ---------------------------------------------


class LeakyReLUNode(BaseModel):
    id: str
    type: Literal["LeakyReLU"]
    params: LeakyReLUParams = LeakyReLUParams()


class SiLUNode(BaseModel):
    id: str
    type: Literal["SiLU"]
    params: SiLUParams = SiLUParams()


class ELUNode(BaseModel):
    id: str
    type: Literal["ELU"]
    params: ELUParams = ELUParams()


class PReLUNode(BaseModel):
    id: str
    type: Literal["PReLU"]
    params: PReLUParams = PReLUParams()


# =============================================================================
# SECTION 2B — BLOCK NODES
# FIX from previous version: We used Literal["Block"] for everything.
# The architecture doc (section 3.3.4) shows blocks use their template name
# as the type: "ResidualBlock", "TransformerEncoder", etc.
#
# All block nodes share the same structure:
#   id     — unique name
#   type   — the template name or "Block" for user-created
#   graph  — a nested GraphConfig (the subgraph inside)
#   repeat — how many times to stack it (default 1)
#
# "GraphConfig" is in quotes = forward reference.
# Works because of "from __future__ import annotations" at top.
# =============================================================================


class ResidualBlockNode(BaseModel):
    """Conv -> BN -> ReLU -> Conv -> Add"""

    id: str
    type: Literal["ResidualBlock"]
    graph: GraphConfig
    repeat: int = 1


class TransformerEncoderNode(BaseModel):
    """MultiHeadAttn -> Add -> LN -> FFN -> Add -> LN"""

    id: str
    type: Literal["TransformerEncoder"]
    graph: GraphConfig
    repeat: int = 1


class MultiHeadAttentionNode(BaseModel):
    """Linear(Q,K,V) -> ScaledDotProduct -> Linear"""

    id: str
    type: Literal["MultiHeadAttention"]
    graph: GraphConfig
    repeat: int = 1


class ConvBNReLUNode(BaseModel):
    """Conv2d -> BatchNorm2d -> ReLU"""

    id: str
    type: Literal["ConvBNReLU"]
    graph: GraphConfig
    repeat: int = 1


class BottleneckBlockNode(BaseModel):
    """1x1 Conv -> 3x3 Conv -> 1x1 Conv -> Add"""

    id: str
    type: Literal["BottleneckBlock"]
    graph: GraphConfig
    repeat: int = 1


class CustomBlockNode(BaseModel):
    """
    User-created block. User selects nodes, clicks 'Create Block'.
    Uses type 'Block' to distinguish from named built-in templates.
    """

    id: str
    type: Literal["Block"]
    graph: GraphConfig
    repeat: int = 1


class InputPortParams(BaseModel):
    name: str = "x"


class InputPortNode(BaseModel):
    id: str
    type: Literal["InputPort"]
    params: InputPortParams = Field(default_factory=InputPortParams)


class OutputPortParams(BaseModel):
    name: str = "out"


class OutputPortNode(BaseModel):
    id: str
    type: Literal["OutputPort"]
    params: OutputPortParams = Field(default_factory=OutputPortParams)


class InputNodeParams(BaseModel):
    name: str = "input"


class InputNode(BaseModel):
    id: str
    type: Literal["InputNode"]
    params: InputNodeParams = Field(default_factory=InputNodeParams)


class OutputNodeParams(BaseModel):
    name: str = "output"


class OutputNode(BaseModel):
    id: str
    type: Literal["OutputNode"]
    params: OutputNodeParams = Field(default_factory=OutputNodeParams)


class StackParams(BaseModel):
    count: int


class StackNode(BaseModel):
    id: str
    type: Literal["Stack"]
    params: StackParams
    graph: GraphConfig


class ConfigurableParam(BaseModel):
    inner_node_id: str
    param_name: str
    display_name: str
    default_value: Any = None


class ModuleNode(BaseModel):
    id: str
    type: Literal["Module"]
    name: str
    graph: GraphConfig
    configurable_params: list[ConfigurableParam] = []
    param_overrides: dict[str, Any] = {}



# =============================================================================
# SECTION 3 — NODE CONFIG (Discriminated Union)
# Pydantic reads the "type" field and picks the right class automatically.
# C# equivalent: abstract class + JsonConverter for polymorphic deserialization
# =============================================================================

NodeConfig = Annotated[
    Union[
        # Convolution & Pooling (2D)
        Conv2dNode,
        ConvTranspose2dNode,
        MaxPool2dNode,
        AvgPool2dNode,
        AdaptiveAvgPool2dNode,
        # Convolution & Pooling (1D)
        Conv1dNode,
        MaxPool1dNode,
        # Linear & Embedding
        LinearNode,
        EmbeddingNode,
        # Normalization
        BatchNorm2dNode,
        BatchNorm1dNode,
        LayerNormNode,
        GroupNormNode,
        # Math & Tensor Primitives
        SubNode,
        DivNode,
        SqrtNode,
        MeanNode,
        VarNode,
        MatMulNode,
        ScaleNode,
        ChannelScaleBiasNode,
        SliceNode,
        # Activations
        ReLUNode,
        GELUNode,
        SigmoidNode,
        TanhNode,
        CustomAutogradNode,
        SoftmaxNode,
        LeakyReLUNode,
        SiLUNode,
        ELUNode,
        PReLUNode,
        # Shape Manipulation
        FlattenNode,
        ReshapeNode,
        PermuteNode,
        FlattenConsecutiveNode,
        # Regularization
        DropoutNode,
        Dropout2dNode,
        # Multi-Input Operations
        AddNode,
        ConcatNode,
        MultiplyNode,
        # Transformer Primitives
        SelfAttentionNode,
        PositionalEncodingNode,
        CausalMaskNode,
        FeedForwardNode,
        # Built-in Block Templates (architecture doc section 3.3.4)
        ResidualBlockNode,
        TransformerEncoderNode,
        MultiHeadAttentionNode,
        ConvBNReLUNode,
        BottleneckBlockNode,
        # User-created blocks
        CustomBlockNode,
        # Unified Modules & Ports
        InputPortNode,
        OutputPortNode,
        InputNode,
        OutputNode,
        StackNode,
        ModuleNode,
    ],
    Field(discriminator="type"),
]


# =============================================================================
# SECTION 4 — EDGE CONFIG
# An edge is an arrow between two nodes.
# source = where the arrow comes FROM
# target = where the arrow goes TO
#
# From architecture doc section 3.2:
# {"source": "input", "target": "conv1"}
# {"source": "conv1", "target": "residual_block"}
# {"source": "residual_block", "target": "output"}
#
# "input" and "output" are virtual pseudo-nodes — just reserved strings.
# =============================================================================


class EdgeConfig(BaseModel):
    source: str
    target: str


# =============================================================================
# SECTION 5 — GRAPH CONFIG
# The complete model: all nodes + all edges.
# Used by Ahmed's compiler and inside block nodes as nested subgraphs.
# =============================================================================


class GraphConfig(BaseModel):
    nodes: list[NodeConfig]
    edges: list[EdgeConfig]


# =============================================================================
# SECTION 6 — TRANSFORM CONFIG
# FIX from previous version: We had params nested under a "params" key.
# The architecture doc (section 2.2) shows params as FLAT fields:
#
# WRONG (what we had before):
# {"type": "Resize", "params": {"size": [224, 224]}}
#
# CORRECT (what architecture doc shows):
# {"type": "Resize", "size": [224, 224]}
# {"type": "Normalize", "mean": [0.485, 0.456, 0.406], "std": [0.229, 0.224, 0.225]}
#
# ConfigDict(extra="allow") = accept ANY extra fields alongside "type".
# This handles every transform type having its own unique field names.
# =============================================================================


class TransformConfig(BaseModel):
    model_config = ConfigDict(extra="allow")
    type: str  # "Resize", "Normalize", "ToTensor", "RandomHorizontalFlip", etc.


# =============================================================================
# SECTION 7 — DATALOADER CONFIG
# From architecture doc section 2.3
# =============================================================================


class DataLoaderConfig(BaseModel):
    batch_size: int = 32
    shuffle: bool = True
    num_workers: int = 4
    pin_memory: bool = True
    drop_last: bool = False


# =============================================================================
# SECTION 8 — DATASET CONFIGS (Discriminated Union)
# FIX from previous version: We had 4 separate custom classes all with
# source="custom". Pydantic cannot discriminate between them on source alone.
# Runtime crash guaranteed.
#
# Fix: Merge all 4 custom modalities into ONE CustomDatasetConfig class
# with a "modality" field. Now the outer union discriminates cleanly on
# "source": "predefined", "image_folder", or "custom".
#
# From architecture doc section 2.1
# =============================================================================


class PredefinedDatasetConfig(BaseModel):
    """
    Built-in datasets: MNIST, FashionMNIST, CIFAR10, CIFAR100,
    ImageNet, AG News, IMDB.

    From architecture doc:
    {"source": "predefined", "name": "CIFAR10", "split": "train"}
    """

    source: Literal["predefined"]
    name: str  # "MNIST", "CIFAR10", "ImageNet", etc.
    split: str  # "train" or "test"
    transforms: list[TransformConfig] = Field(default_factory=list)
    dataloader: DataLoaderConfig = Field(default_factory=DataLoaderConfig)

    # Optional tokenizer fields for predefined text datasets
    tokenizer: str | None = None
    vocab_size: int | None = None
    max_length: int | None = None
    lowercase: bool | None = None
    remove_punctuation: bool | None = None


class ImageFolderDatasetConfig(BaseModel):
    """
    Local folder where subfolders are class names.

    From architecture doc:
    {"source": "image_folder", "root": "/data/my_dataset", "split_ratio": 0.8}
    """

    source: Literal["image_folder"]
    root: str
    split_ratio: float = 0.8
    transforms: list[TransformConfig] = Field(default_factory=list)
    dataloader: DataLoaderConfig = Field(default_factory=DataLoaderConfig)


class CustomDatasetConfig(BaseModel):
    """
    All 4 custom modalities in one class, discriminated by 'modality'.
    Sara's loader reads 'modality' to know which fields to use.

    From architecture doc section 2.1.3
    """

    source: Literal["custom"]
    modality: Literal["image", "text", "tabular", "audio"]

    # image + audio: data lives in a folder
    root: str | None = None
    label_source: str | None = None  # "csv" or "folder"

    # image specific
    label_file: str | None = None
    image_column: str | None = None
    label_column: str | None = None
    file_pattern: str = "*.jpg"

    # text + tabular: data lives in a file
    file_path: str | None = None

    # text specific
    text_column: str | None = None
    tokenizer: str = "bpe"
    vocab_size: int = 30000
    max_length: int = 512
    lowercase: bool = True
    remove_punctuation: bool = False

    # tabular specific
    feature_columns: list[str] = Field(default_factory=list)
    target_column: str | None = None
    categorical_columns: list[str] = Field(default_factory=list)
    normalize: bool = True

    # audio specific
    sample_rate: int = 16000
    max_duration_sec: float = 1.0
    feature_extraction: str = "mel_spectrogram"
    n_mels: int = 64

    # common
    transforms: list[TransformConfig] = Field(default_factory=list)
    dataloader: DataLoaderConfig = Field(default_factory=DataLoaderConfig)



class TextDatasetConfig(BaseModel):
    """
    Character-level or BPE sliding-window text dataset for language modeling.
    source = "text" distinguishes it cleanly in the discriminated union.
    """

    source: Literal["text"]
    text_source: Literal["builtin", "upload", "paste"] = "builtin"
    builtin_name: str | None = None  # "names" | "tiny_shakespeare"
    file_path: str | None = None  # for uploaded files (server-side path)
    text_content: str | None = None  # for paste mode (inline text)
    tokenization: Literal["char", "bpe"] = "char"
    bpe_vocab_size: int = 256
    context_length: int = 8
    train_split: float = 0.9
    dataloader: DataLoaderConfig = Field(default_factory=DataLoaderConfig)


# Clean discriminated union — source is now unique for all four
DatasetConfig = Annotated[
    Union[
        PredefinedDatasetConfig,  # source = "predefined"
        ImageFolderDatasetConfig,  # source = "image_folder"
        CustomDatasetConfig,  # source = "custom"
        TextDatasetConfig,  # source = "text"
    ],
    Field(discriminator="source"),
]


# =============================================================================
# SECTION 9 — LOSS CONFIG
# From architecture doc section 4
# =============================================================================


class LossConfig(BaseModel):
    type: str  # "CrossEntropyLoss", "MSELoss", "BCEWithLogitsLoss", etc.
    params: dict[str, Any] = Field(default_factory=dict)


# =============================================================================
# SECTION 10 — OPTIMIZER CONFIG
# From architecture doc section 5.1
# =============================================================================


class OptimizerConfig(BaseModel):
    type: str  # "AdamW", "SGD", "Adam", "RMSprop", "Adagrad"
    params: dict[str, Any] = Field(
        default_factory=dict
    )  # {"lr": 0.001, "weight_decay": 0.01, ...}


# =============================================================================
# SECTION 11 — SCHEDULER CONFIG
# From architecture doc section 5.2
# =============================================================================


class SchedulerConfig(BaseModel):
    type: str  # "CosineAnnealingLR", "StepLR", "OneCycleLR", etc.
    params: dict[str, Any] = Field(
        default_factory=dict
    )  # {"T_max": 100, "eta_min": 1e-6, ...}


# =============================================================================
# SECTION 12 — EARLY STOPPING CONFIG
# From architecture doc section 6.1
# =============================================================================


class EarlyStoppingConfig(BaseModel):
    enabled: bool = False
    patience: int = 10
    monitor: str = "val_loss"
    mode: str = "min"  # "min" for loss, "max" for accuracy


# =============================================================================
# SECTION 13 — CHECKPOINTING CONFIG
# From architecture doc section 6.1
# =============================================================================


class CheckpointingConfig(BaseModel):
    save_best: bool = True
    save_every_n_epochs: int = 5
    monitor: str = "val_loss"
    directory: str = "/checkpoints"


# =============================================================================
# SECTION 14 — TRAINING SETTINGS
# From architecture doc section 6.1
# =============================================================================


class TrainingSettings(BaseModel):
    epochs: int
    device: str = "cuda"  # "cuda", "cuda:0", "cuda:1", "cpu"
    mixed_precision: bool = False
    gradient_clip_norm: float = 1.0
    gradient_accumulation_steps: int = 1
    validation_frequency: int = 1
    early_stopping: EarlyStoppingConfig = EarlyStoppingConfig()
    checkpointing: CheckpointingConfig = CheckpointingConfig()


# =============================================================================
# SECTION 15 — TRAINING CONFIG (The big one)
# Everything bundled together. Sent when user clicks "Train".
# From architecture doc section 6.1
# =============================================================================


class TrainingConfig(BaseModel):
    dataset_config: DatasetConfig  # Sara uses this
    model_graph: GraphConfig  # Ahmed uses this
    loss: LossConfig  # Mahmoud uses this
    optimizer: OptimizerConfig  # Mahmoud uses this
    scheduler: SchedulerConfig | None = None
    training: TrainingSettings  # Mahmoud uses this


# =============================================================================
# SECTION 16 — REQUEST / RESPONSE SCHEMAS
# FIX: Added all missing schemas from the architecture doc.
# =============================================================================


# --- Model Builder -----------------------------------------------------------


class ShapeInferenceRequest(BaseModel):
    """POST /infer/layer — single layer shape check"""

    node: NodeConfig
    input_shape: list[int]  # e.g. [32, 3, 224, 224]
    input_shapes: list[list[int]] | None = None  # for multi-input layers (Add, Concat)


class ShapeInferenceResponse(BaseModel):
    status: str  # "success" or "error"
    output_shape: list[int] | None = None
    message: str | None = None


class DatasetShapeInferenceRequest(BaseModel):
    """POST /infer/dataset — dataset output shape check"""

    dataset_config: DatasetConfig


class DatasetShapeInferenceResponse(BaseModel):
    status: str  # "success" or "error"
    per_sample_shape: list[int] | None = None  # e.g. [3, 224, 224]
    batch_shape: list[int] | None = None  # e.g. [32, 3, 224, 224]
    num_classes: int | None = None
    message: str | None = None


class PipelineValidationRequest(BaseModel):
    """
    POST /validate_pipeline
    Called every time the user connects an edge. Returns all shapes or error.
    """

    graph: GraphConfig
    input_shape: list[int]


class PipelineValidationResponse(BaseModel):
    status: str  # "success" or "error"
    node_shapes: dict | None = None  # {"conv1": [32, 64, 112, 112], ...}
    message: str | None = None


# --- Loss --------------------------------------------------------------------


class LossSuggestionRequest(BaseModel):
    """
    POST /loss/suggest
    From architecture doc section 4.2:
    {"output_shape": [32, 10], "final_activation": "none", "task_type": "classification"}
    """

    output_shape: list[int]
    final_activation: str  # "none", "softmax", "sigmoid", "log_softmax"
    task_type: str  # "classification", "regression", "multi_label"


class LossSuggestionResponse(BaseModel):
    """
    From architecture doc section 4.2:
    {"suggested": "CrossEntropyLoss", "alternatives": ["NLLLoss", ...]}
    """

    suggested: str
    alternatives: list[str]


# --- LR Schedule Preview -----------------------------------------------------


class LRSchedulePreviewRequest(BaseModel):
    """
    POST /optimizer/preview_lr_schedule
    From architecture doc section 5.2:
    {
      "optimizer": "AdamW",
      "optimizer_params": {"lr": 0.001},
      "scheduler": "CosineAnnealingLR",
      "scheduler_params": {"T_max": 100, "eta_min": 1e-6},
      "total_steps": 1000
    }
    """

    optimizer: str
    optimizer_params: dict = Field(default_factory=dict)
    scheduler: str
    scheduler_params: dict = Field(default_factory=dict)
    total_steps: int


class LRSchedulePreviewResponse(BaseModel):
    """
    From architecture doc section 5.2:
    {"schedule": [[0, 0.001], [1, 0.000999], ...]}
    Each item is [step_number, learning_rate].
    """

    schedule: list[list[float]]


# --- Training WebSocket Messages ---------------------------------------------


class StepMetricsMessage(BaseModel):
    """
    Server → Client: sent after every batch step during training.
    From architecture doc section 6.3:
    {"type": "step_metrics", "run_id": "abc123", "epoch": 5, "step": 1250,
     "metrics": {"train_loss": 0.342, "learning_rate": 0.00087}}
    """

    type: Literal["step_metrics"]
    run_id: str
    epoch: int
    step: int
    metrics: dict
    elapsed_time: float | None = None
    eta_seconds: float | None = None
    steps_per_sec: float | None = None
    total_steps: int | None = None


class EpochMetricsMessage(BaseModel):
    """
    Server → Client: sent after every epoch.
    From architecture doc section 6.3:
    {"type": "epoch_metrics", "run_id": "abc123", "epoch": 5,
     "metrics": {"train_loss": 0.342, "val_loss": 0.401, ...}}
    """

    type: Literal["epoch_metrics"]
    run_id: str
    epoch: int
    metrics: dict


class TrainingCompleteMessage(BaseModel):
    """
    Server → Client: sent when training finishes.
    From architecture doc section 6.3:
    {"type": "training_complete", "run_id": "abc123", "best_epoch": 42, "best_val_loss": 0.312}
    """

    type: Literal["training_complete"]
    run_id: str
    best_epoch: int
    best_val_loss: float


class TrainingControlMessage(BaseModel):
    """
    Client → Server: pause, resume, or stop training.
    From architecture doc section 6.3:
    {"action": "pause"} or {"action": "resume"} or {"action": "stop"}
    """

    action: Literal["pause", "resume", "stop"]


# --- Training Status ---------------------------------------------------------


class TrainingStatusResponse(BaseModel):
    """GET /training/status/{run_id}"""

    run_id: str
    status: Literal["running", "paused", "completed", "failed", "stopped"]
    current_epoch: int | None = None
    total_epochs: int | None = None
    latest_metrics: dict | None = None
    elapsed_time: float | None = None
    eta_seconds: float | None = None
    steps_per_sec: float | None = None
    current_step: int | None = None
    total_steps: int | None = None


# --- Metrics -----------------------------------------------------------------


class MetricsSuggestionRequest(BaseModel):
    """POST /metrics/suggest — from architecture doc section 7.1"""

    task_type: str  # "classification", "regression", "multi_label"
    num_classes: int | None = None


class MetricsSuggestionResponse(BaseModel):
    suggested: list[str]  # ["Accuracy", "F1Score", "ConfusionMatrix"]


# --- Export ------------------------------------------------------------------


class ExportRequest(BaseModel):
    """
    POST /export/onnx or /export/pytorch or /export/torchscript
    From architecture doc section 8.2
    """

    graph: GraphConfig
    input_shape: list[int]
    checkpoint_path: str
    output_path: str
    opset_version: int | None = 17  # only relevant for ONNX
    dataset_config: DatasetConfig | None = None
    loss: LossConfig | None = None
    optimizer: OptimizerConfig | None = None
    training: TrainingSettings | None = None
    only_module: bool = False



class ExportResponse(BaseModel):
    status: str
    output_path: str
    message: str | None = None
    code: str | None = None


# --- Inference ---------------------------------------------------------------


class InferenceRequest(BaseModel):
    """
    POST /inference/predict
    From architecture doc section 8.3:
    {"graph": {...}, "checkpoint_path": "/checkpoints/best.pt", "input": [...]}
    """

    graph: GraphConfig
    checkpoint_path: str
    input: list  # tensor as flat or nested list


class InferenceResponse(BaseModel):
    """
    From architecture doc section 8.3:
    {"prediction": [0.1, 0.02, 0.85, ...], "predicted_class": 2}
    """

    prediction: list[float]
    predicted_class: int | None = None  # None for regression tasks


class GenerateRequest(BaseModel):
    run_id: str
    prompt: str = ""
    max_tokens: int = 100
    temperature: float = 1.0


# --- Dataset Catalog & Scan --------------------------------------------------


class DatasetCatalogEntry(BaseModel):
    """Single entry in the dataset catalog response."""

    name: str
    description: str
    tags: list[str]
    modality: str
    shape: list[int] | None = None
    num_classes: int | None = None
    size: str | None = None
    category: str | None = None


class DatasetCatalogResponse(BaseModel):
    """GET /datasets/catalog — list all predefined datasets."""

    datasets: list[DatasetCatalogEntry]


class TransformCatalogEntry(BaseModel):
    """Single entry in the transform catalog response."""

    name: str
    params: dict[str, Any]
    category: str
    description: str


class TransformCatalogResponse(BaseModel):
    """GET /transforms/catalog — list all transforms with param schemas."""

    transforms: list[TransformCatalogEntry]


class DatasetScanRequest(BaseModel):
    """POST /datasets/scan — scan a local path for data."""

    path: str
    modality: str | None = None


class DatasetScanResponse(BaseModel):
    """Response from scanning a local path."""

    status: str
    result: dict | None = None
    message: str | None = None


class DatasetPreviewRequest(BaseModel):
    """POST /datasets/preview — preview samples from a dataset config."""

    dataset_config: DatasetConfig
    num_samples: int = 5


class DatasetPreviewResponse(BaseModel):
    """Response from dataset preview."""

    status: str
    samples: list[dict[str, Any]] = Field(default_factory=list)
    total_size: int = 0
    message: str | None = None


class DatasetValidateRequest(BaseModel):
    """POST /datasets/validate — validate a dataset config."""

    dataset_config: DatasetConfig


class DatasetValidateResponse(BaseModel):
    """Response from dataset config validation."""

    valid: bool
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


# --- Experiment Tracking -----------------------------------------------------


class RunRecord(BaseModel):
    """
    Stored for every training run.
    From architecture doc section 9.1
    """

    run_id: str
    created_at: datetime
    status: Literal["running", "completed", "failed", "stopped"]
    config: dict  # full TrainingConfig snapshot
    graph_snapshot: dict  # model graph at time of training
    metrics_history: list[dict[str, Any]] = Field(
        default_factory=list
    )  # all epoch metrics
    best_metrics: dict | None = None
    checkpoint_path: str | None = None
    duration_seconds: float | None = None


class ExperimentCompareRequest(BaseModel):
    """
    POST /experiments/compare
    From architecture doc section 9.2:
    {"run_ids": ["abc123", "def456"], "metrics": ["val_loss", "val_accuracy"]}
    """

    run_ids: list[str]
    metrics: list[str]


class ExperimentCompareResponse(BaseModel):
    """
    From architecture doc section 9.2:
    {"runs": [{"run_id": "abc123", "val_loss": [...], "val_accuracy": [...]}, ...]}
    """

    runs: list[dict]


# --- Tokenizer Workspace -----------------------------------------------------


class TokenizerTrainRequest(BaseModel):
    text_source: Literal["builtin", "upload", "paste"]
    builtin_name: str | None = None
    file_path: str | None = None
    text_content: str | None = None
    vocab_size: int = 256
    special_tokens: list[str] | None = None
    pattern: str | None = None


class TokenizerTrainResponse(BaseModel):
    status: str
    tokenizer_id: str | None = None
    vocab_size: int | None = None
    message: str | None = None


class TokenizerEncodeRequest(BaseModel):
    tokenizer_id: str
    text: str


class TokenizerEncodeResponse(BaseModel):
    status: str
    tokens: list[int] | None = None
    tokens_decoded: list[str] | None = None
    message: str | None = None


class TokenizerDecodeRequest(BaseModel):
    tokenizer_id: str
    tokens: list[int]


class TokenizerDecodeResponse(BaseModel):
    status: str
    text: str | None = None
    message: str | None = None
