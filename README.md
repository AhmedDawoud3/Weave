# Weave

A modular drag-and-drop neural network editor for rapid prototyping and experimentation.

## Overview

Weave lets you visually design neural network architectures by connecting nodes on a graph canvas, then compile them into runnable PyTorch modules — no coding required.

## Project Structure

```
weave/
├── Frontend/       # React + Vite + TypeScript UI
│   ├── src/
│   ├── docs/       # Frontend-specific documentation
│   └── package.json
├── engine/         # Python + FastAPI compilation engine
│   ├── main.py
│   ├── schemas.py
│   ├── compiler/   # Graph compiler that produces PyTorch modules
│   ├── dataset/    # Dataset shape inference and loading
│   ├── tests/
│   └── README.md
└── backend/        # (WIP — to be added)
```

## Getting Started

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

See [Frontend docs](Frontend/docs/setup.md) for detailed setup and available scripts.

### Engine

```bash
cd engine
uv sync
uv run uvicorn main:app --reload
```

The API is available at `http://localhost:8000`. See [Engine README](engine/README.md) for full documentation, endpoint reference, and Postman collection.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Flow, Framer Motion
- **Engine:** Python, FastAPI, PyTorch
- **Infrastructure:** Docker, Render (deployment)

## Development

| What | Where | Command |
|------|-------|---------|
| Frontend dev server | `Frontend/` | `npm run dev` |
| Frontend build | `Frontend/` | `npm run build` |
| Frontend tests | `Frontend/` | `npm run test` |
| Engine API server | `engine/` | `uv run uvicorn main:app --reload` |
| Engine tests | `engine/` | `uv run pytest` |
| Engine docs | `engine/` | `uv run mkdocs serve` |

## License

MIT
