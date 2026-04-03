# Weave Project Guidelines

Weave is a modular, intelligent drag-and-drop neural network editor built for rapid prototyping and experimentation.

## Architecture & Component Boundaries
- **Frontend**: React + TypeScript with ReactFlow and Shadcn UI. Responsible for the GUI, managing the node editor visualization, and the training dashboard.
- **Backend (API Gateway)**: ASP.NET Core (C#) with SignalR. Serves as the orchestrator, handling authentication, project/file management, and state. *Never touches PyTorch directly.*
- **Engine (Python Backend)**: Python 3.11+, FastAPI + PyTorch. A persistent process that stays in memory to provide real-time (sub-200ms) shape inference. Handles dataset loading, model construction, training, evaluation, and code export.

## Engine (Python) Conventions
- **Dependency Management**: Uses `uv` (`pyproject.toml`, `uv.lock`).
- **Formatting & Linting**: Strictly adheres to `ruff`, `black` (88 chars length), `isort`, and `mypy`.
- **Testing**: Uses `pytest`.
- **Validation**: Every request/response must use Pydantic models for validation.
- **Design Philosophy**: Core logic assumes a *forward-pass-only node editor*. The graph is a DAG where `__init__` constructors are purely mechanical and auto-derived.
- **Real-Time Capabilities**: Shape inference is performed constantly on graph changes to prevent tensor shape mismatch errors before runtime.

## Cross-Service Communication
- **C# ↔ Python**: JSON over HTTP (REST).
- **Python → Frontend**: Real-time training metrics stream directly via WebSocket.

## Infrastructure
The project relies on Docker for infrastructure. Ensure proper containerization, especially for bridging the isolated services and handling GPU accessibility for the PyTorch engine.
