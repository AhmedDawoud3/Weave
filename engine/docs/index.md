# Weave Engine Documentation

Welcome to the **Weave Engine** — a Python backend that compiles visual neural network designs into runnable PyTorch models and provides shape inference for both model graphs and dataset configurations.

## Architecture Overview

The engine is organized in three layers — from the HTTP API surface down to the PyTorch runtime:

<div class="grid cards" markdown>

-   :material-api: __FastAPI Server__

    ---

    Three REST endpoints that serve as the entry point for all shape inference and pipeline validation requests:

    | Method | Endpoint |
    |:------:|----------|
    | `POST` | `/validate_pipeline` |
    | `POST` | `/infer/layer` |
    | `POST` | `/infer/dataset` |

-   :material-tools: __Compiler Module__

    ---

    Compiles graph configurations into executable PyTorch modules:

    - **Graph Compiler** — topological sort & tensor flow simulation
    - **Weave Block** — composite layer grouping
    - **Component Factory** — layer instantiation from config
    - **Custom Modules** — user-defined PyTorch extensions

-   :material-database: __Dataset Module__

    ---

    Loads and transforms datasets with full shape inference:

    - **Shape Inference** — static tensor shape computation
    - **Dataset Factory** — config-driven dataset creation
    - **Registry** — predefined dataset catalog
    - **Scanner** — local folder auto-discovery
    - **Transform Factory** — composable preprocessing pipelines
    - **DataLoader** — batched PyTorch data loading

-   :material-brain: __PyTorch / TorchVision__

    ---

    The runtime foundation that executes compiled models and handles all tensor operations, gradient computation, and hardware acceleration.

</div>

## Getting Started

New to Weave Engine? Follow the **[Getting Started](getting-started.md)** guide to:

- Install prerequisites (Python 3.12+, uv)
- Set up the project and install dependencies
- Run the server and send your first shape inference request
- Build the documentation locally
- Import the Postman collection

Or jump straight in if you already have uv installed:

```bash
cd engine
uv sync
uv run uvicorn main:app --reload
```

The server starts at `http://127.0.0.1:8000`. Visit `http://127.0.0.1:8000/api/docs` for the interactive Swagger UI, or `http://127.0.0.1:8000/docs` for the full documentation site.

## API Endpoints

| Method | Path | Description |
|:------:|------|-------------|
| `POST` | `/validate_pipeline` | Simulate tensor flow through a full graph, return shapes per node |
| `POST` | `/infer/layer` | Compute output shape of a single layer or block |
| `POST` | `/infer/dataset` | Compute per-sample and batch tensor shapes for a dataset config |

## Modules

| Module | Description |
|--------|-------------|
| **Compiler** | Compiles graph configurations into executable PyTorch modules using topological sort and a factory pattern |
| **Dataset** | Loads datasets from predefined registries, local folders, or custom configurations with transform pipelines |
| **Schemas** | Pydantic data contracts that validate every request before processing |

## Postman Collection

A Postman collection is available at `engine/postman/weave_engine.postman_collection.json` for testing all API endpoints. Import it into Postman or run with Newman CLI.
