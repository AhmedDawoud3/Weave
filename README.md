<<<<<<< HEAD
# Weave - Convex + PyTorch Hackathon Project

A modular drag-and-drop neural network editor built for rapid prototyping and experimentation.

## Architecture (Hybrid)

1. **Frontend (UI):** React + Vite + Tailwind + @xyflow/react
2. **Backend (Logic & State):** Convex (TypeScript) - Handles saving graphs and generating PyTorch code
3. **Runner (Execution):** Python + FastAPI + UV - Local service that executes generated code

## Quick Start

### Frontend

```bash
cd frontend
npm install
npx convex dev  # Follow the login prompts
npm run dev
```

### Backend (Python Execution Engine)

```bash
cd backend
uv sync          # Install dependencies
uv run python main.py  # Start the server on port 8000
```

## Deployment (Netlify + Render + Convex)

This setup deploys the frontend to Netlify, the Convex backend in Convex Cloud, and the FastAPI
runner on Render (free tier).

### 1) Deploy Convex

```bash
cd frontend
npx convex deploy
```

Copy the deployment URL (looks like `https://<name>.convex.cloud`).

### 2) Deploy the FastAPI runner on Render

- Create a new Render service from the repo root using the included `render.yaml` blueprint.
- Set the environment variable `ALLOWED_ORIGINS` to your Netlify site URL, for example:
  `https://your-site.netlify.app`
- Deploy and copy the service URL (looks like `https://<service>.onrender.com`).

### 3) Deploy the frontend on Netlify

- New site from Git
  - Base directory: `frontend`
  - Build command: `npm run build`
  - Publish directory: `frontend/dist`
- Set these environment variables:
  - `VITE_CONVEX_URL` = your Convex deployment URL
  - `VITE_RUNNER_URL` = your Render service URL

If you use a custom domain, add it to `ALLOWED_ORIGINS` on Render (comma-separated list).

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Flow, Lucide Icons
- **Backend State:** Convex
- **Execution Engine:** Python 3.11+, FastAPI, PyTorch
- **Package Manager:** npm (frontend), uv (backend)

## MVP Node Types

- Dataset
- Transform
- Model
- Loss
- Optimizer
- Trainer

## Project Structure

```
weave/
├── frontend/           # React + Vite + Convex frontend
│   ├── src/
│   ├── convex/         # Convex functions (auto-created)
│   └── package.json
├── backend/            # Python execution engine
│   ├── main.py
│   ├── requirements.txt
│   └── pyproject.toml
└── README.md
```

## License

Hackathon Project - MIT
=======
# Weave

A modular drag-and-drop neural network editor built for rapid prototyping and experimentation.


## Tech Stack

* **Frontend:** React + TypeScript
* **Backend:** ASP.NET Core (C#)
* **Engine:** Python
* **Infrastructure:** Docker
>>>>>>> 1adbf742ce7746bfc6642c7f6d966da381f14943
