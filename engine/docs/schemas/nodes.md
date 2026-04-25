# Node Types

Each node type gets its own Pydantic class with a `Literal` type field. Pydantic reads the `"type"` field and automatically selects the correct class — this is called **discriminated union** deserialization.

## Common Structure

Every node has:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `str` | Unique identifier within the graph |
| `type` | `Literal["..."]` | Exact type name (used for discrimination) |
| `params` | `*Params` | Layer-specific parameters (varies by type) |

## Convolution & Pooling Nodes

| Node Type | Params Class | PyTorch Module |
|-----------|-------------|----------------|
| `Conv2d` | `Conv2dParams` | `nn.Conv2d` |
| `ConvTranspose2d` | `ConvTranspose2dParams` | `nn.ConvTranspose2d` |
| `MaxPool2d` | `MaxPool2dParams` | `nn.MaxPool2d` |
| `AvgPool2d` | `AvgPool2dParams` | `nn.AvgPool2d` |
| `AdaptiveAvgPool2d` | `AdaptiveAvgPool2dParams` | `nn.AdaptiveAvgPool2d` |

### Example

```json
{
  "id": "conv1",
  "type": "Conv2d",
  "params": {
    "in_channels": 3,
    "out_channels": 64,
    "kernel_size": 3,
    "stride": 1,
    "padding": 1
  }
}
```

## Linear & Embedding Nodes

| Node Type | Params Class | PyTorch Module |
|-----------|-------------|----------------|
| `Linear` | `LinearParams` | `nn.Linear` |
| `Embedding` | `EmbeddingParams` | `nn.Embedding` |

## Normalization Nodes

| Node Type | Params Class | PyTorch Module |
|-----------|-------------|----------------|
| `BatchNorm2d` | `BatchNorm2dParams` | `nn.BatchNorm2d` |
| `LayerNorm` | `LayerNormParams` | `nn.LayerNorm` |
| `GroupNorm` | `GroupNormParams` | `nn.GroupNorm` |

## Activation Nodes

| Node Type | Params Class | Default Params | PyTorch Module |
|-----------|-------------|----------------|----------------|
| `ReLU` | `ReLUParams` | `inplace=False` | `nn.ReLU` |
| `GELU` | `GELUParams` | `approximate="none"` | `nn.GELU` |
| `Sigmoid` | `SigmoidParams` | *(empty)* | `nn.Sigmoid` |
| `Tanh` | `TanhParams` | *(empty)* | `nn.Tanh` |
| `Softmax` | `SoftmaxParams` | — **required** | `nn.Softmax` |

!!! note "Activation defaults"
    ReLU, GELU, Sigmoid, and Tanh nodes can be sent with `"params": {}` since all fields have defaults. Softmax requires `dim`.

### Example with default params

```json
{
  "id": "relu1",
  "type": "ReLU",
  "params": {}
}
```

## Shape Manipulation Nodes

| Node Type | Params Class | PyTorch Module |
|-----------|-------------|----------------|
| `Flatten` | `FlattenParams` | `nn.Flatten` |
| `Reshape` | `ReshapeParams` | Custom reshape |
| `Permute` | `PermuteParams` | Custom permute |

## Regularization Nodes

| Node Type | Params Class | Default Params | PyTorch Module |
|-----------|-------------|----------------|----------------|
| `Dropout` | `DropoutParams` | `p=0.5, inplace=False` | `nn.Dropout` |
| `Dropout2d` | `Dropout2dParams` | `p=0.5, inplace=False` | `nn.Dropout2d` |

## Multi-Input Operation Nodes

| Node Type | Params Class | Default Params | Description |
|-----------|-------------|----------------|-------------|
| `Add` | `AddParams` | *(empty)* | Element-wise sum of multiple inputs |
| `Concat` | `ConcatParams` | `dim=1` | Concatenate along a dimension |
| `Multiply` | `MultiplyParams` | *(empty)* | Element-wise product of multiple inputs |

!!! warning "Multi-input nodes require multiple edges"
    These nodes must have **2 or more incoming edges** in the graph. Single-input connections will produce an error.

## Block Template Nodes

Block nodes contain a nested `graph` (subgraph) and a `repeat` count. They use their template name as the `type` field.

### Common Block Structure

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `str` | — | Unique identifier |
| `type` | `Literal["..."]` | — | Block template name |
| `graph` | `GraphConfig` | — | Nested subgraph definition |
| `repeat` | `int` | `1` | Number of times to stack this block |

### Available Block Templates

| Node Type | Description | Architecture |
|-----------|-------------|--------------|
| `ResidualBlock` | Skip connection block | Conv → BN → ReLU → Conv → Add |
| `TransformerEncoder` | Full transformer encoder | MultiHeadAttn → Add → LN → FFN → Add → LN |
| `MultiHeadAttention` | Multi-head self-attention | Linear(Q,K,V) → ScaledDotProduct → Linear |
| `ConvBNReLU` | Conv + activation block | Conv2d → BatchNorm2d → ReLU |
| `BottleneckBlock` | ResNet-style bottleneck | 1×1 Conv → 3×3 Conv → 1×1 Conv → Add |
| `Block` | User-created custom block | User-defined subgraph |

### Example: ResidualBlock

```json
{
  "id": "res1",
  "type": "ResidualBlock",
  "graph": {
    "nodes": [
      { "id": "conv1", "type": "Conv2d", "params": { "in_channels": 64, "out_channels": 64, "kernel_size": 3, "padding": 1 } },
      { "id": "bn1", "type": "BatchNorm2d", "params": { "num_features": 64 } },
      { "id": "relu1", "type": "ReLU", "params": {} },
      { "id": "conv2", "type": "Conv2d", "params": { "in_channels": 64, "out_channels": 64, "kernel_size": 3, "padding": 1 } },
      { "id": "add1", "type": "Add", "params": {} }
    ],
    "edges": [
      { "source": "input", "target": "conv1" },
      { "source": "conv1", "target": "bn1" },
      { "source": "bn1", "target": "relu1" },
      { "source": "relu1", "target": "conv2" },
      { "source": "conv2", "target": "add1" },
      { "source": "input", "target": "add1" },
      { "source": "add1", "target": "output" }
    ]
  },
  "repeat": 1
}
```

## NodeConfig Union

The `NodeConfig` type is a discriminated union of all node types. Pydantic automatically selects the correct class based on the `type` field:

```python
NodeConfig = Annotated[
    Union[
        Conv2dNode, ConvTranspose2dNode, MaxPool2dNode, AvgPool2dNode, AdaptiveAvgPool2dNode,
        LinearNode, EmbeddingNode,
        BatchNorm2dNode, LayerNormNode, GroupNormNode,
        ReLUNode, GELUNode, SigmoidNode, TanhNode, SoftmaxNode,
        FlattenNode, ReshapeNode, PermuteNode,
        DropoutNode, Dropout2dNode,
        AddNode, ConcatNode, MultiplyNode,
        ResidualBlockNode, TransformerEncoderNode, MultiHeadAttentionNode,
        ConvBNReLUNode, BottleneckBlockNode,
        CustomBlockNode,
    ],
    Field(discriminator="type"),
]
```
