# GraphCompiler

::: compiler.GraphCompiler
    options:
      show_source: true
      members:
        - compile
        - validate_pipeline
        - infer_layer_shape
        - _infer_single_input_layer
        - _infer_multi_input_layer

## Overview

`GraphCompiler` is the main entry point for compiling and validating neural network graphs. It takes a `GraphConfig` (validated by Pydantic) and produces a `WeaveBlock` — a runnable PyTorch module.

## Methods

### `compile(graph_json)`

Compiles a graph configuration into a `WeaveBlock`.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `graph_json` | `dict \| GraphConfig` | Graph configuration (dict or Pydantic model) |

**Returns:** `WeaveBlock`

**Process:**

1. **Validate schema** — If a raw dict is provided, parse it through `GraphConfig`
2. **Check for duplicate node IDs** — Each `id` must be unique
3. **Governance check** — Reject graphs with more than 500 nodes
4. **Build adjacency list** — From the edges configuration
5. **Topological sort** — Using Kahn's algorithm
6. **Cycle detection** — If not all nodes are visited, a cycle exists
7. **Reachability check** — Ensure `output` is reachable from `input`
8. **Construct** `WeaveBlock` with execution order and node map

**Raises:**

| Exception | Condition |
|-----------|-----------|
| `ValueError` | Duplicate node IDs |
| `ValueError` | Graph exceeds 500 nodes |
| `ValueError` | Cycle detected |
| `ValueError` | No path to output |

### `validate_pipeline(graph, input_shape)`

Simulates a dummy tensor through the full graph to evaluate shapes block-by-block.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `graph` | `GraphConfig` | The model graph |
| `input_shape` | `list[int]` | Input tensor shape |

**Returns:** `dict` with keys:

| Key | Type | Description |
|-----|------|-------------|
| `status` | `str` | `"success"` or `"error"` |
| `node_shapes` | `dict \| None` | Map of node ID → shape (on success) |
| `message` | `str \| None` | Error description (on error) |

**Governance Controls:**

- **OOM Guard**: Rejects input shapes with more than 100,000,000 elements (~400MB float32)
- **Max Nodes**: 500 node limit enforced during compilation

### `infer_layer_shape(node, input_shape, input_shapes)`

Computes the output shape of a single layer or block without requiring a fully connected graph.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `node` | `NodeConfig` | The layer or block node |
| `input_shape` | `list[int] \| None` | Single input shape (for single-input layers) |
| `input_shapes` | `list[list[int]] \| None` | Multiple input shapes (for Add, Concat, Multiply) |

**Returns:** `dict` with keys:

| Key | Type | Description |
|-----|------|-------------|
| `status` | `str` | `"success"` or `"error"` |
| `output_shape` | `list[int] \| None` | Output shape (on success) |
| `message` | `str \| None` | Error description (on error) |

**Dispatch Logic:**

1. **Block nodes** → delegates to `validate_pipeline()` on the nested subgraph
2. **Multi-input layers** (Add, Concat, Multiply) → `_infer_multi_input_layer()`
3. **Single-input layers** → `_infer_single_input_layer()`

## Class Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `MULTI_INPUT_TYPES` | `{"Add", "Concat", "Multiply"}` | Layer types that accept multiple inputs |
| `BLOCK_TYPES` | `{"ResidualBlock", "TransformerEncoder", "MultiHeadAttention", "ConvBNReLU", "BottleneckBlock", "Block"}` | Layer types with nested subgraphs |
