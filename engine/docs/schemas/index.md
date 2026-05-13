# Schemas Reference

The [`schemas.py`](https://github.com/Weave-Project/Weave/blob/main/engine/schemas.py) file is the single source of truth for all data contracts in the Weave Engine. Every request into the FastAPI server is validated against these Pydantic models before any other code runs.

## Organization

The schemas file is organized into 16 sections:

| Section | Topic | Page |
|---------|-------|------|
| 1 | Layer Parameters | [Layer Params](layer-params.md) |
| 2–2B | Node Types (layers + blocks) | [Node Types](nodes.md) |
| 3–5 | Graph, Edges, NodeConfig union | [Graph & Edges](graph-and-edges.md) |
| 6–8 | Transforms, DataLoader, Dataset configs | [Dataset Configs](dataset-configs.md) |
| 9–15 | Loss, Optimizer, Scheduler, Training | [Training Configs](training-configs.md) |
| 16 | Request/Response pairs | [Request & Response](request-response.md) |

## Design Principles

1. **One params class per layer type** — Required fields have no default; optional fields have defaults
2. **Literal type discrimination** — Each node class uses `Literal["TypeName"]` so Pydantic can auto-select the right class from the `type` field
3. **Discriminated unions** — `NodeConfig` and `DatasetConfig` use `Field(discriminator="type")` and `Field(discriminator="source")` respectively for clean polymorphic deserialization
4. **Forward references** — Block nodes reference `GraphConfig` before it's defined, enabled by `from __future__ import annotations`
