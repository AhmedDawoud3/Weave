# Training Module

The training module manages the background training execution engine, metrics computation, checkpoints, early stopping, and training runners.

## Architecture

```
training/
├── __init__.py          # Public exports
├── scheduler_factory.py # Instantiate PyTorch schedulers from configurations
├── metrics.py           # Compute loss, accuracy, and learning rates
├── callbacks.py         # Checkpointing and early stopping
├── trainer.py           # Background training thread logic
└── runner.py            # Training execution state and thread pool runner
```

## Workflow

1. A client initiates training via `POST /training/start`.
2. The `TrainingRunner` compiles the `WeaveBlock` model, sets up the dataset, optimizer, loss function, and learning rate scheduler.
3. The training executes in a separate background thread inside the `Trainer`.
4. Steps and epoch metrics are pushed to an asynchronous event queue in a thread-safe manner.
5. Endpoints stream the queue events using Server-Sent Events (SSE).
6. Control actions (pause, resume, stop) are received via HTTP POST endpoints and propagated to the training thread.

## Components

| Component | Description | Details |
|-----------|-------------|---------|
| [Training Schedulers](schedulers.md) | Learning rate schedulers | CosineAnnealingLR, OneCycleLR, ReduceLROnPlateau, etc. |
