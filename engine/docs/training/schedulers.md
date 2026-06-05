# Training Schedulers

The Weave Training Engine supports dynamic instantiation of PyTorch learning rate (LR) schedulers based on user configurations. This allows training runs to adjust their learning rate schedules dynamically.

## Supported Schedulers

Weave supports the following standard PyTorch learning rate schedulers:

| Scheduler Name | Description | Key Configuration Parameters |
|----------------|-------------|------------------------------|
| `CosineAnnealingLR` | Adjusts learning rate using a cosine annealing schedule. | `T_max` (max iterations), `eta_min` (min learning rate) |
| `StepLR` | Decays the learning rate by `gamma` every `step_size` epochs. | `step_size` (decay interval), `gamma` (decay factor) |
| `OneCycleLR` | Sets learning rate using the 1cycle learning rate policy. | `max_lr` (peak learning rate), `total_steps`, `pct_start` |
| `ExponentialLR` | Decays the learning rate by `gamma` every epoch. | `gamma` (decay factor) |
| `ReduceLROnPlateau` | Reduces learning rate when a metric (e.g., validation loss) has stopped improving. | `mode` (`min`/`max`), `factor` (decay factor), `patience` |

---

## Scheduler Configuration Schema

Schedulers are configured via the `SchedulerConfig` model defined in `schemas.py`:

```python
class SchedulerConfig(BaseModel):
    type: str  # "CosineAnnealingLR", "StepLR", "OneCycleLR", etc.
    params: dict[str, Any] = Field(default_factory=dict)
```

---

## Scheduler Factory API

The scheduler factory is located in `training/scheduler_factory.py`.

::: training.scheduler_factory.create_scheduler
    options:
      show_root_heading: true
      show_source: true

---

## Key Features & Special Logic

### 1. OneCycleLR Auto-Step Calculation
PyTorch's `OneCycleLR` requires either `total_steps` or `epochs` and `steps_per_epoch` to be explicitly provided. 
- If `total_steps` is omitted from `params` but both `epochs` and `steps_per_epoch` are provided as arguments to the factory, the factory computes:
  $$\text{total\_steps} = \text{epochs} \times \text{steps\_per\_epoch}$$
- If `max_lr` is not provided in `params`, the factory automatically deduces it from the optimizer param groups.

### 2. ReduceLROnPlateau Interface
Unlike other schedulers, `ReduceLROnPlateau` requires a monitoring metric (e.g., validation loss) during each step update (i.e. `scheduler.step(val_loss)` instead of `scheduler.step()`). The training runner handles this difference dynamically.

---

## Example Configurations

### Cosine Annealing LR
```json
{
  "type": "CosineAnnealingLR",
  "params": {
    "T_max": 100,
    "eta_min": 0.00001
  }
}
```

### OneCycleLR
```json
{
  "type": "OneCycleLR",
  "params": {
    "max_lr": 0.01
  }
}
```
