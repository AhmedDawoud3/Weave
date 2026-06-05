# Docker Build Optimization Report: Weave Engine

We have successfully optimized the Docker Compose build process for the **Python engine** service. 

By resolving two major bottlenecks—**unnecessary CUDA dependencies (2.5+ GB)** and **lack of Docker layer caching/ignored directories (7.6+ GB context upload)**—we reduced the build time from **847.3s (~14 minutes)** to **~67s** on initial cache miss, and **under 1s** for subsequent builds when source files are modified.

---

## Key Optimization Steps

### 1. PyTorch CPU-Only Configuration for Docker
Since the Docker Compose environment does not expose GPU/CUDA devices to the engine container, installing the full CUDA-enabled version of PyTorch and its associated NVIDIA runtimes (`nvidia-cublas-cu12`, `nvidia-cusolver-cu12`, etc.) was redundant.
- Modified [pyproject.toml](file:///mnt/20EA0923EA08F736/Project/Weave/engine/pyproject.toml) to map `torch`, `torchaudio`, and `torchvision` to the PyTorch CPU wheels repository (`https://download.pytorch.org/whl/cpu`) using PEP 508 environment markers.
- Platform marker targeting: `sys_platform == 'linux' and platform_machine == 'x86_64'`. This ensures that local macOS/Windows environments still fall back to standard PyPI wheels while the Docker container uses the lightweight CPU-only wheels.
- Re-locked dependencies via `uv lock --python 3.12`. This purged all `nvidia-*` and `cuda-*` packages from the dependency tree for Linux targets.

### 2. Implementation of Docker Layer Caching
In the original [Dockerfile](file:///mnt/20EA0923EA08F736/Project/Weave/engine/Dockerfile), the command `COPY . .` ran *before* package synchronization. Any source code change invalidated the cache for everything after, forcing a full dependency download every build.
- Updated the Dockerfile to first copy only `pyproject.toml` and `uv.lock` to run a pre-synchronization step (`uv sync --frozen --no-install-project --no-dev`).
- After the dependency layer is cached, we copy the rest of the application files and run `uv sync --frozen --no-dev`. Changes to python code files now skip package downloads completely.

### 3. Exclude Local Virtual Environments and Cache Files (`.dockerignore`)
Without `.dockerignore`, Docker was uploading the local virtual environment (`.venv`) and temporary caches from the host system directly into the Docker build context.
- The build context transfer was **7.64 GB**, which took over a minute just to copy to the daemon.
- Created [engine/.dockerignore](file:///mnt/20EA0923EA08F736/Project/Weave/engine/.dockerignore) to ignore `.venv`, `__pycache__`, `.mypy_cache`, `.pytest_cache`, `.ruff_cache`, and docs.
- Created [frontend/.dockerignore](file:///mnt/20EA0923EA08F736/Project/Weave/frontend/.dockerignore) to ignore `node_modules` and build assets.
- This shrank the engine build context from **7.64 GB** to **1.08 MB**.

### 4. BuildKit Cache Mounting & Production Target Syncing
- Leveraged BuildKit cache mounts (`--mount=type=cache,target=/root/.cache/uv`) so that even if the lockfile changes, `uv` reuses previously cached downloads across builds.
- Used `--no-dev` flag during `uv sync` to skip local development dependencies like `ruff`, `pytest`, `black`, and `mypy` that aren't needed to run the runtime engine.
- Bypassed the runtime check step in the container `CMD` by invoking the virtual environment uvicorn directly (`/app/.venv/bin/uvicorn`) instead of `uv run uvicorn`. This prevents `uv` from attempting to download the excluded dev dependencies at container startup.

---

## Comparison Summary

| Metric | Before Optimization | After Optimization | Improvement |
| :--- | :--- | :--- | :--- |
| **Build Context Upload Size** | **7.64 GB** | **1.08 MB** | **99.9% smaller** |
| **PyTorch Package Size** | ~2.5 GB (CUDA + Torch) | ~170 MB (CPU Only) | **~93% smaller** |
| **Initial Build Time** | 847.3s (~14 mins) | ~67s (~1.1 mins) | **12.6x faster** |
| **Subsequent Build Time (Code Change)** | 847.3s (~14 mins) | **< 1 second (Cached)** | **Instantaneous** |
| **Container Startup Time** | Slow (downloads dev deps) | Instant | **No runtime downloads** |

---

> [!NOTE]
> All changes have been built and tested successfully. The engine service runs normally on `http://localhost:8000`.
