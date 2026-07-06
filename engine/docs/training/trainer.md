# Background Trainer & Runner

Weave uses a concurrent, multi-threaded background execution system to manage neural network training runs while keeping the main FastAPI ASGI application completely non-blocking.

## Execution Architecture

```mermaid
sequenceDiagram
    participant Client
    participant API as FastAPI (Main ASGI Loop)
    participant Runner as TrainingRunner
    participant Trainer as Trainer Thread
    participant Bus as EventBus (Main Loop)
    participant Disk as steps.jsonl File

    Client->>API: POST /training/start
    Note over API: Runs as async def
    API->>Runner: start_run(config, loop)
    Runner->>Trainer: start() (Spawns Thread)
    Runner-->>API: run_id
    API-->>Client: run_id

    loop Every Step / Batch
        Trainer->>Trainer: Forward & Backward pass
        Trainer->>Disk: Append event to {run_id}.steps.jsonl
        Trainer->>Bus: push(event)
        Note over Bus: loop.call_soon_threadsafe(notify.set)
    end

    Client->>API: GET /training/stream/{run_id}
    Note over API: Replays history first
    API->>Disk: Read past steps
    Disk-->>Client: Stream past events (SSE)
    Note over API: Subscribes to live stream
    Bus-->>Client: Stream live metrics (SSE)
```

---

## The TrainingRunner

The `TrainingRunner` class is a singleton-like manager that handles:
- Generating unique `run_id` strings (UUIDs) for every run.
- Instantiating datasets, optimizers, loss functions, and learning rate schedulers.
- Spawning background `Trainer` threads.
- Maintaining mapping associations between `run_id` and active thread states / asyncio event buses.

### CUDA Device Fallback
If the user configuration requests `"cuda"` but `torch.cuda.is_available()` is false, the runner automatically falls back to `"cpu"` after logging a warning.

---

## The Trainer

The `Trainer` class encapsulates the background training loop that runs inside a spawned thread.

### Key Features

1. **GIL Yielding**: Since deep learning code can block the GIL and starve Python's event loop, the trainer forces a brief `time.sleep(0.001)` sleep inside batch loops to yield CPU cycles.
2. **Mixed Precision**: The trainer uses PyTorch's native `torch.amp.autococast` and `torch.amp.GradScaler` APIs to perform half-precision training on GPU.
3. **Gradient Accumulation**: Step updates are executed only once every $N$ batches based on the configured `gradient_accumulation_steps`.
4. **EventBus Loop Safety**: Since the main thread operates asynchronously, the trainer thread must not invoke loop operations directly. It delegates to the `EventBus`, which schedules notifications on the main ASGI event loop thread using `loop.call_soon_threadsafe(self._notify.set)`.
5. **Control Flags**: At step and epoch boundaries, the trainer checks flag registers (`is_paused`, `is_stopped`) and yields execution or stops accordingly.

---

## Exception Traceback Capture

To improve frontend debugging and visibility, any unhandled exception in the background `Trainer` thread is caught. 
The trainer uses `traceback.format_exc()` to build a detailed error message and dispatches it:
1. To the `EventBus` as a `setup_status` warning so it renders directly inside the React frontend's logs terminal.
2. As the final `training_failed` payload event to cleanly terminate the stream connection.
3. Into the persisted run record on disk as part of the run's metadata.

---

## API Reference

::: training.runner.TrainingRunner
    options:
      show_root_heading: true

::: training.trainer.Trainer
    options:
      show_root_heading: true
