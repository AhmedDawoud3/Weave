# Architecture

## Overview

Weave Frontend is a React-based neural network architecture designer. It provides a visual drag-and-drop canvas for building deep learning models, similar to tools like Netron or the TensorFlow Playground.

## Project Structure

```
Frontend/
├── src/
│   ├── App.tsx              # Root component, stage router
│   ├── main.tsx             # Entry point
│   ├── index.css            # Global styles (Tailwind + tw-animate-css)
│   ├── types/               # TypeScript type definitions
│   │   ├── index.ts         # Re-exports
│   │   ├── layer.ts         # LayerType enum + LayerParams
│   │   ├── graph.ts         # NodeData, EdgeData, Project
│   │   └── ui.ts            # AppStage union type
│   ├── config/
│   │   └── index.ts         # Runtime config (API base URL, app name)
│   ├── lib/
│   │   └── utils.ts         # cn() utility (clsx + tailwind-merge)
│   ├── pages/
│   │   ├── SplashPage.tsx   # Animated intro screen
│   │   ├── LoginPage.tsx    # Authentication screen
│   │   ├── DashboardPage.tsx# Project listing grid
│   │   └── StudioPage.tsx   # Main canvas workspace
│   ├── components/
│   │   ├── Sidebar.tsx      # Draggable layer palette
│   │   ├── PropertiesPanel.tsx # Selected node inspector
│   │   ├── LayerNode.tsx    # Custom ReactFlow node
│   │   └── ui/              # shadcn/ui primitives
│   └── test/
│       ├── setup.ts         # Test environment setup
│       ├── utils.test.ts    # cn() unit tests
│       ├── LayerNode.test.tsx
│       ├── Sidebar.test.tsx
│       └── App.test.tsx
├── docs/                    # Documentation
├── .env.example             # Environment variable template
├── vite.config.ts           # Build + test configuration
└── package.json
```

## Component Hierarchy

```
App
├── SplashPage           (stage === 'splash')
├── LoginPage            (stage === 'login')
├── DashboardPage        (stage === 'dashboard')
│   └── Project cards (mapped from projects[])
└── StudioPage           (stage === 'main')
    ├── Sidebar
    │   └── LayerType items (draggable)
    ├── ReactFlow canvas
    │   └── LayerNode instances (custom nodes)
    └── PropertiesPanel
```

## Data Flow

1. **Stage Routing**: `App` manages a single `AppStage` state (`'splash' | 'login' | 'dashboard' | 'main'`). Only one page renders at a time via `AnimatePresence`.

2. **Project State**: Projects are stored in `App` state as an array of `Project` objects. They are passed down to `DashboardPage` and mutated via callbacks (`onAddProject`, `onDeleteProject`).

3. **Canvas State**: `StudioPage` manages its own `nodes` and `edges` arrays (ReactFlow state). Drag-and-drop from `Sidebar` creates new nodes. Clicking a node selects it and opens `PropertiesPanel`.

4. **Configuration**: Runtime settings are in `src/config/index.ts`, reading `VITE_API_URL` from `import.meta.env`.

## Stage Mapping

| Stage       | Page                | Description            | Entry Trigger          |
|-------------|---------------------|------------------------|------------------------|
| `splash`    | `SplashPage`        | Brand animation        | Initial mount (3.5s)   |
| `login`     | `LoginPage`         | Auth screen            | After splash timeout   |
| `dashboard` | `DashboardPage`     | Project selection      | After login            |
| `main`      | `StudioPage`        | Visual canvas builder  | After project open     |
