# Getting Started

This guide walks you through installing, running, and developing the Weave Engine from scratch.

## Prerequisites

| Requirement | Minimum Version | Installation |
|-------------|----------------|--------------|
| Python | 3.12+ | [python.org](https://www.python.org/downloads/) |
| uv | Latest | See below |
| Git | Latest | [git-scm.com](https://git-scm.com/) |

!!! note "Python version"
    The engine requires **Python 3.12 or higher** as specified in `pyproject.toml`. Check your version with:

    ```bash
    python --version
    ```

## Install uv

[uv](https://docs.astral.sh/uv/) is the fast Python package manager used throughout this project. Install it with:

=== "Windows"

    ```bash
    powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
    ```

=== "macOS / Linux"

    ```bash
    curl -LsSf https://astral.sh/uv/install.sh | sh
    ```

Verify the installation:

```bash
uv --version
```

## Clone the Repository

```bash
git clone https://github.com/Weave-Project/Weave.git
cd Weave
```

## Install Dependencies

All runtime dependencies are managed through `uv` and declared in `engine/pyproject.toml`:

| Package | Version | Purpose |
|---------|---------|---------|
| FastAPI | >=0.135.3 | Web framework and API server |
| Pydantic | >=2.12.5 | Data validation and serialization |
| PyTorch | 2.10.0 | Tensor operations and neural network modules |
| TorchVision | 0.25.0 | Dataset classes and image transforms |
| Uvicorn | >=0.44.0 | ASGI server |

From the `engine` directory, run:

```bash
cd engine
uv sync
```

This creates a virtual environment at `engine/.venv/` and installs all runtime and dev dependencies.

!!! tip "Verifying the install"
    ```bash
    uv run python -c "import torch; print(f'PyTorch {torch.__version__}')"
    ```

## Run the Server

Start the FastAPI development server with auto-reload:

```bash
uv run uvicorn main:app --reload
```

Or use the entry point directly:

```bash
uv run python main.py
```

The server starts at **`http://127.0.0.1:8000`**.

| URL | Description |
|-----|-------------|
| `http://127.0.0.1:8000/api/docs` | Swagger UI (interactive API explorer) |
| `http://127.0.0.1:8000/api/redoc` | ReDoc (alternative API docs) |
| `http://127.0.0.1:8000/api/openapi.json` | Raw OpenAPI schema |
| `http://127.0.0.1:8000/docs` | MkDocs documentation site (requires `mkdocs build` first) |

### Quick Smoke Test

Verify the server is running by hitting the root endpoint:

```bash
curl http://127.0.0.1:8000/
```

Test shape inference with a simple Conv2d layer:

```bash
curl -X POST http://127.0.0.1:8000/infer/layer \
  -H "Content-Type: application/json" \
  -d '{
    "node_type": "Conv2d",
    "params": {"in_channels": 3, "out_channels": 16, "kernel_size": 3},
    "input_shape": [1, 3, 32, 32]
  }'
```

Expected response:

```json
{
  "output_shape": [1, 16, 30, 30]
}
```

## Run the Tests

The test suite uses **pytest** and is included in the dev dependencies:

```bash
# Run all tests
uv run pytest

# Run with verbose output
uv run pytest -v

# Run a specific test file
uv run pytest tests/test_compiler.py

# Run with coverage report
uv run pytest --cov=. --cov-report=term-missing
```

## Linting & Type Checking

The project uses **ruff** for linting and **ty** for type checking:

```bash
# Lint
uv run ruff check .

# Type check
uv run ty check .
```

These also run in CI on every push and pull request.

## Build the Documentation

Documentation dependencies are managed via the `docs` dependency group in `pyproject.toml`:

```bash
# Install docs dependencies
uv sync --group docs

# Build static site (output to engine/site/)
uv run mkdocs build

# Serve with live-reload at http://127.0.0.1:8001
uv run mkdocs serve

# Strict build (fails on warnings — used in CI)
uv run mkdocs build --strict
```

## Use the Postman Collection

A Postman collection covering all endpoints is included at `postman/weave_engine.postman_collection.json`.

### Import into Postman

1. Open Postman
2. Click **Import** → select the JSON file
3. The collection variable `base_url` defaults to `http://localhost:8000`

### Run with Newman (CLI)

```bash
npx newman run postman/weave_engine.postman_collection.json
```

### Collection Structure

| Folder | Requests | Description |
|--------|----------|-------------|
| Health Check | 1 | Server root GET |
| Validate Pipeline | 5 | Success + error scenarios |
| Infer Layer Shape | 6 | Conv2d, Linear, ReLU, Concat, Add + error |
| Infer Dataset Shape | 8 | CIFAR-10, MNIST, ImageFolder, custom + error |

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
│   ├── shape_inference.py   # Dataset shape inference
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

## Troubleshooting

### `uv sync` fails with resolution error

Make sure you're in the `engine/` directory (where `pyproject.toml` and `uv.lock` live):

```bash
cd engine && uv sync
```

### PyTorch CPU-only vs CUDA

The `pyproject.toml` pins `torch==2.10.0`. If you need a CUDA-enabled build, install it separately **before** running `uv sync`:

```bash
uv pip install torch==2.10.0 --index-url https://download.pytorch.org/whl/cu124
uv sync
```

### Port already in use

If port 8000 is occupied, specify a different port:

```bash
uv run uvicorn main:app --reload --port 8002
```

### MkDocs build warnings

Run with `--strict` to catch all issues:

```bash
uv run mkdocs build --strict
```

Common fixes:

- **Broken link**: Check that the target `.md` file exists and the path in the nav matches
- **Missing docstring**: Ensure the Python symbol referenced by `::: module.symbol` exists and has a docstring
- **Unreferenced asset**: Remove unused images or files from `docs/`

## Next Steps

- [API Endpoints](api/index.md) — Detailed endpoint documentation with request/response examples
- [Schemas](schemas/index.md) — All Pydantic model definitions
- [Compiler Module](compiler/index.md) — How graphs are compiled into PyTorch modules
- [Dataset Module](dataset/index.md) — Dataset loading and shape inference
