# WeaveBlock

::: compiler.block.WeaveBlock
    options:
      show_source: true

## Overview

`WeaveBlock` is a dynamically constructed `nn.Module` that executes the forward pass following a pre-calculated topological order. It is the output of `GraphCompiler.compile()`.

## Constructor

```python
WeaveBlock(
    exec_order: list[str],
    node_map: dict[str, NodeConfig],
    incoming_edges: dict[str, list[str]],
)
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `exec_order` | `list[str]` | Topologically sorted list of node IDs (including `"input"` and `"output"`) |
| `node_map` | `dict[str, NodeConfig]` | Mapping from node ID to node configuration |
| `incoming_edges` | `dict[str, list[str]]` | Mapping from node ID to its source node IDs |

## Internal Structure

### `self.operations: nn.ModuleDict`

All PyTorch modules are registered in an `nn.ModuleDict`, keyed by node ID. This ensures:

- `.cuda()`, `.parameters()`, `.state_dict()` work correctly
- Submodules are properly registered for gradient computation
- The model can be serialized/deserialized

### `self.exec_order: list[str]`

The execution order computed by Kahn's algorithm. Includes `"input"` and `"output"` pseudo-nodes.

### `self.incoming_edges: dict[str, list[str]]`

Maps each node ID to the list of source node IDs that feed into it. Used during the forward pass to gather inputs.

## Forward Pass

```python
def forward(self, x: torch.Tensor) -> torch.Tensor
```

The forward pass maintains a **tensor state dictionary** (`tensors: dict[str, torch.Tensor]`) that maps node IDs to their output tensors.

**Algorithm:**

1. Initialize `tensors["input"] = x`
2. For each `node_id` in `exec_order`:
    - Skip `"input"` (already set)
    - For `"output"`: return the tensor from its single source
    - For other nodes:
        1. Gather all input tensors from `incoming_edges`
        2. Look up the layer in `self.operations`
        3. If the layer is `AddModule` or `ConcatModule`, pass the list of tensors
        4. Otherwise, pass the single tensor
        5. Store the output in `tensors[node_id]`
3. If the loop completes without hitting `"output"`, raise `RuntimeError`

**Raises:**

| Exception | Condition |
|-----------|-----------|
| `RuntimeError` | Output node has ≠1 incoming edge |
| `RuntimeError` | Output source was not computed |
| `RuntimeError` | Single-input node received multiple inputs |
| `RuntimeError` | Reached end without hitting output node |
