# Layer Parameters

Each layer type has its own Pydantic params class. These define the constructor arguments for the corresponding PyTorch `nn.Module`.

## Convolution & Pooling

### Conv2dParams

Maps to `torch.nn.Conv2d`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `in_channels` | `int` | — | Number of input channels |
| `out_channels` | `int` | — | Number of output channels |
| `kernel_size` | `int` | — | Size of the convolving kernel |
| `stride` | `int` | `1` | Stride of the convolution |
| `padding` | `int` | `0` | Zero-padding added to both sides |
| `dilation` | `int` | `1` | Spacing between kernel elements |
| `groups` | `int` | `1` | Number of blocked connections |
| `bias` | `bool` | `True` | If `True`, adds a learnable bias |

### ConvTranspose2dParams

Maps to `torch.nn.ConvTranspose2d`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `in_channels` | `int` | — | Number of input channels |
| `out_channels` | `int` | — | Number of output channels |
| `kernel_size` | `int` | — | Size of the convolving kernel |
| `stride` | `int` | `1` | Stride of the convolution |
| `padding` | `int` | `0` | Zero-padding added to both sides |
| `output_padding` | `int` | `0` | Additional size added to output |
| `bias` | `bool` | `True` | If `True`, adds a learnable bias |

### MaxPool2dParams

Maps to `torch.nn.MaxPool2d`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `kernel_size` | `int` | — | Size of the window |
| `stride` | `int \| None` | `None` | Stride (defaults to `kernel_size`) |
| `padding` | `int` | `0` | Zero-padding added to both sides |

### AvgPool2dParams

Maps to `torch.nn.AvgPool2d`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `kernel_size` | `int` | — | Size of the window |
| `stride` | `int \| None` | `None` | Stride (defaults to `kernel_size`) |
| `padding` | `int` | `0` | Zero-padding added to both sides |

### AdaptiveAvgPool2dParams

Maps to `torch.nn.AdaptiveAvgPool2d`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `output_size` | `int \| list[int]` | — | Target output size (e.g. `1` or `[1, 1]`) |

## Linear & Embedding

### LinearParams

Maps to `torch.nn.Linear`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `in_features` | `int` | — | Size of each input sample |
| `out_features` | `int` | — | Size of each output sample |
| `bias` | `bool` | `True` | If `True`, adds a learnable bias |

### EmbeddingParams

Maps to `torch.nn.Embedding`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `num_embeddings` | `int` | — | Size of the embedding dictionary |
| `embedding_dim` | `int` | — | Size of each embedding vector |
| `padding_idx` | `int \| None` | `None` | If specified, pads at that index |

## Normalization

### BatchNorm2dParams

Maps to `torch.nn.BatchNorm2d`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `num_features` | `int` | — | Number of channels (C from input [N, C, H, W]) |
| `eps` | `float` | `1e-5` | Value added to denominator for numerical stability |
| `momentum` | `float` | `0.1` | Running mean/var momentum |
| `affine` | `bool` | `True` | If `True`, has learnable affine parameters |

### LayerNormParams

Maps to `torch.nn.LayerNorm`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `normalized_shape` | `int \| list[int]` | — | Input shape from an expected input |
| `eps` | `float` | `1e-5` | Value added to denominator for numerical stability |

### GroupNormParams

Maps to `torch.nn.GroupNorm`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `num_groups` | `int` | — | Number of groups to separate channels into |
| `num_channels` | `int` | — | Number of channels expected in input |
| `eps` | `float` | `1e-5` | Value added to denominator for numerical stability |

## Activations

### ReLUParams

Maps to `torch.nn.ReLU`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `inplace` | `bool` | `False` | If `True`, does the operation in-place |

### GELUParams

Maps to `torch.nn.GELU`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `approximate` | `str` | `"none"` | Approximation algorithm (`"none"` or `"tanh"`) |

### SigmoidParams

No parameters. Maps to `torch.nn.Sigmoid`.

### TanhParams

No parameters. Maps to `torch.nn.Tanh`.

### SoftmaxParams

Maps to `torch.nn.Softmax`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `dim` | `int` | — | **Required.** Dimension along which to compute softmax |

## Shape Manipulation

### FlattenParams

Maps to `torch.nn.Flatten`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `start_dim` | `int` | `1` | First dim to flatten |
| `end_dim` | `int` | `-1` | Last dim to flatten |

### ReshapeParams

Custom reshape operation.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `target_shape` | `list[int]` | — | Target shape (e.g. `[1, -1]`) |

### PermuteParams

Custom permute operation.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `dims` | `list[int]` | — | Desired ordering of dimensions |

## Regularization

### DropoutParams

Maps to `torch.nn.Dropout`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `p` | `float` | `0.5` | Probability of an element to be zeroed |
| `inplace` | `bool` | `False` | If `True`, does the operation in-place |

### Dropout2dParams

Maps to `torch.nn.Dropout2d`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `p` | `float` | `0.5` | Probability of a channel to be zeroed |
| `inplace` | `bool` | `False` | If `True`, does the operation in-place |

## Multi-Input Operations

### AddParams

No parameters. Element-wise addition of multiple inputs.

### ConcatParams

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `dim` | `int` | `1` | Dimension along which to concatenate |

### MultiplyParams

No parameters. Element-wise multiplication of multiple inputs.
