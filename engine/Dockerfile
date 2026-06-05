FROM python:3.12-slim

# Copy uv binary from official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency files for caching
COPY pyproject.toml uv.lock ./

# Install dependencies only (cached by Docker layer caching & uv cache mount)
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

# Copy the rest of the engine source code
COPY . .

# Install the engine project itself (takes less than a second)
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# Expose FastAPI port
EXPOSE 8000

# Run the API directly from the virtual environment (prevents runtime sync of dev dependencies)
CMD ["/app/.venv/bin/uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

