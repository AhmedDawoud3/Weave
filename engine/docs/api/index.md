# API Endpoints

The Weave Engine exposes three REST endpoints via FastAPI. All endpoints accept JSON request bodies and return JSON responses.

## Base URL

```
http://127.0.0.1:8000
```

## Common Patterns

### Request Format

All POST endpoints expect `Content-Type: application/json`.

### Response Format

Every response includes a `status` field:

| Status | Meaning |
|--------|---------|
| `"success"` | The operation completed successfully |
| `"error"` | The operation failed; see `message` for details |

### Error Responses

Error responses always include a `message` field with a human-readable explanation. Messages are written in accessible language — technical PyTorch details are appended but the primary message is understandable without deep ML knowledge.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | [`/validate_pipeline`](validate-pipeline.md) | Simulate tensor flow through a full graph |
| POST | [`/infer/layer`](infer-layer.md) | Compute output shape of a single layer or block |
| POST | [`/infer/dataset`](infer-dataset.md) | Compute tensor shapes for a dataset configuration |

## Interactive Docs

FastAPI auto-generates interactive documentation:

- **Swagger UI**: `http://127.0.0.1:8000/api/docs`
- **ReDoc**: `http://127.0.0.1:8000/api/redoc`
- **OpenAPI JSON**: `http://127.0.0.1:8000/api/openapi.json`
