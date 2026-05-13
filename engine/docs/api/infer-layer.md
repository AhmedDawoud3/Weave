# POST /infer/layer

Compute the output shape of a single layer or block given its input shape. Supports multi-input layers (Add, Concat, Multiply) via `input_shapes`.

## Request

**Content-Type**: `application/json`

### Schema: [`ShapeInferenceRequest`](../schemas/request-response.md#shapeinferencerequest)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `node` | [`NodeConfig`](../schemas/nodes.md#nodeconfig-union) | ✅ | The layer or block node to evaluate |
| `input_shape` | `list[int]` | ⚠️ Conditional | Required for single-input layers and blocks |
| `input_shapes` | `list[list[int]]` | ⚠️ Conditional | Required for multi-input layers (Add, Concat, Multiply) |

!!! note "Either `input_shape` or `input_shapes` must be provided"
    - Single-input layers (Conv2d, Linear, ReLU, etc.) require `input_shape`
    - Multi-input layers (Add, Concat, Multiply) require `input_shapes`
    - Block nodes require `input_shape` (delegates to validate_pipeline on the subgraph)

## Response

### Schema: [`ShapeInferenceResponse`](../schemas/request-response.md#shapeinferenceresponse)

| Field | Type | Description |
|-------|------|-------------|
| `status` | `str` | `"success"` or `"error"` |
| `output_shape` | `list[int]` or `null` | Output tensor shape (only on success) |
| `message` | `str` or `null` | Error description (only on error) |

## Examples

### Single-Input: Conv2d

```json
{
  "node": {
    "id": "conv1",
    "type": "Conv2d",
    "params": {
      "in_channels": 3,
      "out_channels": 64,
      "kernel_size": 3,
      "stride": 1,
      "padding": 1
    }
  },
  "input_shape": [1, 3, 32, 32]
}
```

**Response:**

```json
{
  "status": "success",
  "output_shape": [1, 64, 32, 32]
}
```

### Single-Input: Linear

```json
{
  "node": {
    "id": "fc1",
    "type": "Linear",
    "params": {
      "in_features": 128,
      "out_features": 10
    }
  },
  "input_shape": [32, 128]
}
```

**Response:**

```json
{
  "status": "success",
  "output_shape": [32, 10]
}
```

### Single-Input: ReLU (with default params)

```json
{
  "node": {
    "id": "relu1",
    "type": "ReLU",
    "params": {}
  },
  "input_shape": [1, 64, 32, 32]
}
```

**Response:**

```json
{
  "status": "success",
  "output_shape": [1, 64, 32, 32]
}
```

### Multi-Input: Concat

```json
{
  "node": {
    "id": "cat1",
    "type": "Concat",
    "params": {
      "dim": 1
    }
  },
  "input_shapes": [[1, 32, 16, 16], [1, 64, 16, 16]]
}
```

**Response:**

```json
{
  "status": "success",
  "output_shape": [1, 96, 16, 16]
}
```

### Multi-Input: Add

```json
{
  "node": {
    "id": "add1",
    "type": "Add",
    "params": {}
  },
  "input_shapes": [[1, 64, 16, 16], [1, 64, 16, 16]]
}
```

**Response:**

```json
{
  "status": "success",
  "output_shape": [1, 64, 16, 16]
}
```

### Block: ResidualBlock

Block nodes contain a nested `graph` and delegate to [`validate_pipeline`](validate-pipeline.md) internally:

```json
{
  "node": {
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
  },
  "input_shape": [1, 64, 32, 32]
}
```

## Error Responses

### Missing input_shape for single-input layer

```json
{
  "status": "error",
  "message": "Layer type 'Conv2d' requires input_shape."
}
```

### Missing input_shapes for multi-input layer

```json
{
  "status": "error",
  "message": "Layer type 'Add' requires input_shapes (list of shapes), not a single input_shape."
}
```

### Unsupported layer type

```json
{
  "status": "error",
  "message": "Compilation for layer type FooBar is not yet implemented."
}
```

### Shape mismatch

```json
{
  "status": "error",
  "message": "Shape mismatch at 'Conv2d'. The input shape [32, 64] doesn't work for this operation. Technical detail: ..."
}
```
