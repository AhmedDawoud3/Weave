# Weave Engine

FastAPI service that compiles neural-network graphs into runnable PyTorch modules and infers tensor shapes — without touching a GPU or loading real data.

## Quick Start

```bash
# Install dependencies (requires uv)
uv sync

# Run the server
uv run uvicorn main:app --reload
```

The API is available at `http://localhost:8000`. Swagger UI at `http://localhost:8000/api/docs`, MkDocs documentation at `http://localhost:8000/docs` (requires `mkdocs build` first).

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/validate_pipeline` | POST | Validate a full graph and simulate tensor flow |
| `/infer/layer` | POST | Compute output shape for a single layer or block |
| `/infer/dataset` | POST | Compute per-sample and batch shapes for a dataset |

## Documentation (MkDocs)

Full documentation is available as a MkDocs site with hand-written guides and auto-generated API reference.

### Install docs dependencies

```bash
uv sync --group docs
```

### Build the docs

```bash
uv run mkdocs build
```

Output is written to `engine/site/`.

### Serve docs locally with live-reload

```bash
uv run mkdocs serve
```

Opens at `http://localhost:8001` with automatic reload on changes.

### Strict build (CI mode)

```bash
uv run mkdocs build --strict
```

Fails on any warnings — used in CI to catch broken links or missing references.

### Hosted docs

Documentation is automatically built and deployed to **GitHub Pages** on every push to `main` that touches docs-related files. See `.github/workflows/docs.yml` for details.

## Postman Collection

A Postman collection covering all endpoints is included at [`postman/weave_engine.postman_collection.json`](postman/weave_engine.postman_collection.json).

### Import into Postman

1. Open Postman → **Import**
2. Select the `weave_engine.postman_collection.json` file
3. The collection variable `base_url` defaults to `http://localhost:8000`

### Collection structure

| Folder | Requests | Description |
|--------|----------|-------------|
| Health Check | 1 | Server root GET |
| Validate Pipeline | 5 | Success cases (Conv2d→ReLU, multi-input Concat) + error cases (shape mismatch, disconnected output, cycle) |
| Infer Layer Shape | 6 | Conv2d, Linear, ReLU, Concat, Add + error (missing input_shape) |
| Infer Dataset Shape | 8 | CIFAR-10, MNIST+transforms, ImageFolder, custom (image/text/tabular/audio) + error (unknown dataset) |

### Run with Newman CLI

```bash
npx newman run postman/weave_engine.postman_collection.json
```

## Project Structure

```
engine/
├── main.py                  # FastAPI application and endpoints
├── schemas.py               # Pydantic models (988 lines, 16 sections)
├── compiler/
│   ├── compiler.py          # GraphCompiler — topological sort + shape inference
│   ├── block.py             # WeaveBlock — nn.Module wrapper
│   ├── factory.py           # ComponentFactory — layer registry pattern
│   └── modules.py           # AddModule, ConcatModule, MultiplyModule
├── dataset/
│   ├── shape_inference.py   # Dataset shape inference (predefined, ImageFolder, custom)
│   ├── dataset_factory.py   # Dynamic dataset instantiation
│   ├── registry.py          # JSON registry loader
│   ├── scanner.py           # Folder scanner for ImageFolder
│   ├── transform_factory.py # Transform pipeline builder
│   └── dataloader.py        # DataLoader wrapper
├── docs/                    # MkDocs documentation source
├── postman/                 # Postman collection
├── tests/                   # pytest test suite
├── mkdocs.yml               # MkDocs configuration
└── pyproject.toml           # Project config (deps, tools, docs group)
```

## Development

```bash
# Lint
uv run ruff check .

# Type check
uv run ty check .

# Test
uv run pytest
```
