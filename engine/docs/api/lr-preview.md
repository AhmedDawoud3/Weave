# Learning Rate Schedule Preview API

Simulates learning rate updates step-by-step for client-side plotting (e.g. charts, graphs).

- **Method**: `POST`
- **URL**: `/optimizer/preview_lr_schedule`
- **Request Body**: `LRSchedulePreviewRequest` JSON payload
- **Response**: `LRSchedulePreviewResponse` JSON payload

---

## Key Features & Simulation Strategy

1. **High Performance**: Since instantiating full model graphs can be computationally heavy, the simulation uses a minimal dummy model (`nn.Linear(1, 1)`) to compute parameter updates.
2. **Plateau Simulation**: For `ReduceLROnPlateau`, the simulator passes a constant validation loss value to simulate a performance plateau, allowing the learning rate decay curves to be charted accurately.

---

## Example Request & Response

### Request
```json
{
  "optimizer": "AdamW",
  "optimizer_params": {
    "lr": 0.001
  },
  "scheduler": "CosineAnnealingLR",
  "scheduler_params": {
    "T_max": 100,
    "eta_min": 0.00001
  },
  "total_steps": 100
}
```

### Response
```json
{
  "schedule": [
    [0, 0.001],
    [1, 0.00099975],
    [2, 0.00099901],
    ...
    [99, 0.00001024]
  ]
}
```
