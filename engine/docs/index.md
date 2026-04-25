# Weave Engine Documentation

Welcome to the **Weave Engine** — a Python backend that compiles visual neural network designs into runnable PyTorch models and provides shape inference for both model graphs and dataset configurations.

## Architecture Overview

The engine is built on three layers:

```
┌─────────────────────────────────────────────┐
│              FastAPI Server                  │
│         (main.py — 3 endpoints)             │
├──────────────────┬──────────────────────────┤
│  Compiler Module │    Dataset Module        │
│  ┌────────────┐  │  ┌──────────────────┐   │
│  │ GraphComp. │  │  │ Shape Inference  │   │
│  │ WeaveBlock │  │  │ Dataset Factory  │   │
│  │ Factory    │  │  │ Registry         │   │
│  │ Modules    │  │  │ Scanner          │   │
│  └────────────┘  │  │ Transform Factory│   │
│                  │  │ DataLoader       │   │
│                  │  └──────────────────┘   │
├──────────────────┴──────────────────────────┤
│              PyTorch / TorchVision           │
└─────────────────────────────────────────────┘
```

## Getting Started

New to Weave Engine? Follow the **[Getting Started](getting-started.md)** guide to:

- Install prerequisites (Python 3.12+, uv)
- Set up the project and install dependencies
- Run the server and run your first shape inference request
- Build the documentation locally
- Import the Postman collection

Or jump straight in if you already have uv installed:

```bash
cd engine
uv sync
uv run uvicorn main:app --reload
```

The server starts at `http://127.0.0.1:8000`. Visit `http://127.0.0.1:8000/api/docs` for the interactive Swagger UI, or `http://127.0.0.1:8000/docs` for the full documentation site.

## What's Inside

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/validate_pipeline` | Simulate tensor flow through a full graph, return shapes per node |
| POST | `/infer/layer` | Compute output shape of a single layer or block |
| POST | `/infer/dataset` | Compute per-sample and batch tensor shapes for a dataset config |

### Modules

- **Compiler** — Compiles graph configurations into executable PyTorch modules using topological sort and a factory pattern
- **Dataset** — Loads datasets from predefined registries, local folders, or custom configurations with transform pipelines
- **Schemas** — Pydantic data contracts that validate every request before processing

## Postman Collection

A Postman collection is available at `engine/postman/weave_engine.postman_collection.json` for testing all API endpoints. Import it into Postman or run with Newman CLI.
