# Graph & Edges

## EdgeConfig

An edge represents a directed connection between two nodes in the graph.

| Field | Type | Description |
|-------|------|-------------|
| `source` | `str` | Where the arrow comes FROM |
| `target` | `str` | Where the arrow goes TO |

### Virtual Pseudo-Nodes

The strings `"input"` and `"output"` are reserved pseudo-nodes:

- `"input"` — represents the entry point of the graph
- `"output"` — represents the exit point of the graph

### Example

```json
{ "source": "input", "target": "conv1" }
{ "source": "conv1", "target": "relu1" }
{ "source": "relu1", "target": "output" }
```

## GraphConfig

The complete model definition: all nodes + all edges.

| Field | Type | Description |
|-------|------|-------------|
| `nodes` | `list[NodeConfig]` | All layer and block nodes in the graph |
| `edges` | `list[EdgeConfig]` | All directed connections between nodes |

### Example

```json
{
  "nodes": [
    { "id": "conv1", "type": "Conv2d", "params": { "in_channels": 3, "out_channels": 16, "kernel_size": 3, "padding": 1 } },
    { "id": "relu1", "type": "ReLU", "params": {} }
  ],
  "edges": [
    { "source": "input", "target": "conv1" },
    { "source": "conv1", "target": "relu1" },
    { "source": "relu1", "target": "output" }
  ]
}
```

## Graph Validation Rules

When a `GraphConfig` is compiled, the following rules are enforced:

1. **No duplicate node IDs** — Each `id` must be unique
2. **No cycles** — The graph must be a valid DAG (Directed Acyclic Graph)
3. **Output must be reachable** — There must be a path from `input` to `output`
4. **Output has exactly 1 incoming edge** — The `output` pseudo-node must receive from exactly one source
5. **Max 500 nodes** — Governance limit to prevent DoS attacks
6. **All edges reference valid nodes** — Source and target must exist in the graph or be pseudo-nodes

## NodeConfig Union

See [Node Types](nodes.md#nodeconfig-union) for the full discriminated union definition.
