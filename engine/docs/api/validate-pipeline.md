# POST /validate_pipeline

Simulates dummy tensor passing through the graph to evaluate shapes block-by-block. Called every time the user connects an edge in the visual editor.

## Request

**Content-Type**: `application/json`

### Schema: [`PipelineValidationRequest`](../schemas/request-response.md#pipelinevalidationrequest)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `graph` | [`GraphConfig`](../schemas/graph-and-edges.md#graphconfig) | ✅ | The complete model graph (nodes + edges) |
| `input_shape` | `list[int]` | ✅ | Shape of the input tensor, e.g. `[1, 3, 224, 224]` |

### Example Request: Conv2d → ReLU Pipeline

```json
{
  "graph": {
    "nodes": [
      {
        "id": "conv1",
        "type": "Conv2d",
        "params": {
          "in_channels": 3,
          "out_channels": 16,
          "kernel_size": 3,
          "stride": 1,
          "padding": 1
        }
      },
      {
        "id": "relu1",
        "type": "ReLU",
        "params": {}
      }
    ],
    "edges": [
      { "source": "input", "target": "conv1" },
      { "source": "conv1", "target": "relu1" },
      { "source": "relu1", "target": "output" }
    ]
  },
  "input_shape": [1, 3, 32, 32]
}
```

## Response

### Schema: [`PipelineValidationResponse`](../schemas/request-response.md#pipelinevalidationresponse)

| Field | Type | Description |
|-------|------|-------------|
| `status` | `str` | `"success"` or `"error"` |
| `node_shapes` | `dict` or `null` | Map of node ID → output shape (only on success) |
| `message` | `str` or `null` | Error description (only on error) |

### Success Response

```json
{
  "status": "success",
  "node_shapes": {
    "input": [1, 3, 32, 32],
    "conv1": [1, 16, 32, 32],
    "relu1": [1, 16, 32, 32],
    "output": [1, 16, 32, 32]
  }
}
```

### Error Response: Shape Mismatch

When a layer receives an incompatible input shape (e.g., Linear with wrong `in_features`):

```json
{
  "status": "error",
  "message": "Shape mismatch at 'fc1'. The shapes of the matrices don't match for this operation. Technical detail: ..."
}
```

### Error Response: Disconnected Output

When no path leads from `input` to `output`:

```json
{
  "status": "error",
  "message": "Graph connection issue: No path leads to 'output' node."
}
```

### Error Response: Cycle Detected

When the graph contains a cycle (not a valid DAG):

```json
{
  "status": "error",
  "message": "Graph connection issue: Cycle detected! Completed mapping 3 of 4 nodes. Non-DAG loops are not permitted."
}
```

### Error Response: OOM Guard

When the input shape exceeds the governance limit (100M elements ≈ 400MB float32):

```json
{
  "status": "error",
  "message": "Whoa, that matrix is way too big! The input shape [1, 3, 10000, 10000] is mathematically huge. Try shrinking your image dimensions or channel sizes."
}
```

## How It Works

1. **Compile** the graph using topological sort (Kahn's algorithm)
2. **Validate** DAG structure: cycle detection, reachability from input to output
3. **Create** a dummy zero-tensor of the specified `input_shape`
4. **Simulate** the forward pass, recording the output shape at each node
5. **Return** all node shapes on success, or an error message on failure

## Governance Controls

| Control | Limit | Purpose |
|---------|-------|---------|
| Max nodes | 500 | Prevent DoS via unbounded graph compilation |
| Max tensor elements | 100,000,000 | Prevent OOM from oversized dummy tensors |
