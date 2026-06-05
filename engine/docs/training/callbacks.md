# Checkpointing & Early Stopping

Weave provides built-in mechanisms to monitor training performance, save model weights, and stop training early when the model's metrics stop improving.

## Early Stopping

The `EarlyStopping` callback monitors a specified metric. If that metric does not improve for a configurable number of validation checks (`patience`), it sets a `should_stop = True` flag, indicating that the training execution loop should break early.

### Configuration

Early stopping is configured via the `EarlyStoppingConfig` model:

```python
class EarlyStoppingConfig(BaseModel):
    enabled: bool = False
    patience: int = 10
    monitor: str = "val_loss"
    mode: str = "min"  # "min" for loss, "max" for accuracy, "auto"
```

- **Metric Directionality**: Schedulers like loss should be minimized, while accuracy must be maximized. If `mode` is set to `"auto"`, Weave automatically infers the correct optimization direction from the monitored metric name (e.g., any metric containing `"loss"` uses `min`, others use `max`).

---

## Checkpointing

The `Checkpointing` callback manages saving checkpoints (`.pt` files containing model state dict, optimizer state dict, current epoch number, and epoch metrics) during training.

### Configuration

Checkpointing is configured via the `CheckpointingConfig` model:

```python
class CheckpointingConfig(BaseModel):
    save_best: bool = True
    save_every_n_epochs: int = 5
    monitor: str = "val_loss"
    directory: str = "/checkpoints"
```

- **Relative Normalization**: If the `directory` is set to `/checkpoints` (absolute path), Weave normalizes it to write to `data/checkpoints/` inside the local project workspace.
- **Atomic Writes**: To prevent state corruption if a write is interrupted (e.g., system reboot or process termination), checkpoints are written to a temporary file in the same directory first, then renamed atomically using `os.replace()`.

---

## API Reference

::: training.callbacks.EarlyStopping
    options:
      show_root_heading: true

::: training.callbacks.Checkpointing
    options:
      show_root_heading: true
