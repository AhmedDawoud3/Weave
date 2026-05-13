# Training Configs

These schemas define the training pipeline configuration — loss function, optimizer, learning rate scheduler, early stopping, checkpointing, and overall training settings.

## LossConfig

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `str` | — | Loss function name (e.g. `"CrossEntropyLoss"`, `"MSELoss"`, `"BCEWithLogitsLoss"`) |
| `params` | `dict[str, Any]` | `{}` | Loss function keyword arguments |

### Example

```json
{
  "type": "CrossEntropyLoss",
  "params": {}
}
```

## OptimizerConfig

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `str` | — | Optimizer name (`"AdamW"`, `"SGD"`, `"Adam"`, `"RMSprop"`, `"Adagrad"`) |
| `params` | `dict[str, Any]` | `{}` | Optimizer keyword arguments (e.g. `{"lr": 0.001, "weight_decay": 0.01}`) |

### Example

```json
{
  "type": "AdamW",
  "params": { "lr": 0.001, "weight_decay": 0.01 }
}
```

## SchedulerConfig

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `str` | — | Scheduler name (`"CosineAnnealingLR"`, `"StepLR"`, `"OneCycleLR"`) |
| `params` | `dict[str, Any]` | `{}` | Scheduler keyword arguments |

### Example

```json
{
  "type": "CosineAnnealingLR",
  "params": { "T_max": 100, "eta_min": 1e-6 }
}
```

## EarlyStoppingConfig

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `bool` | `False` | Whether early stopping is active |
| `patience` | `int` | `10` | Number of epochs to wait for improvement |
| `monitor` | `str` | `"val_loss"` | Metric to monitor |
| `mode` | `str` | `"min"` | `"min"` for loss, `"max"` for accuracy |

## CheckpointingConfig

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `save_best` | `bool` | `True` | Save the best model checkpoint |
| `save_every_n_epochs` | `int` | `5` | Save a checkpoint every N epochs |
| `monitor` | `str` | `"val_loss"` | Metric to determine "best" |
| `directory` | `str` | `"/checkpoints"` | Directory to save checkpoints |

## TrainingSettings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `epochs` | `int` | — | **Required.** Total number of training epochs |
| `device` | `str` | `"cuda"` | Compute device (`"cuda"`, `"cuda:0"`, `"cpu"`) |
| `mixed_precision` | `bool` | `False` | Enable automatic mixed precision (AMP) |
| `gradient_clip_norm` | `float` | `1.0` | Max gradient norm for clipping |
| `gradient_accumulation_steps` | `int` | `1` | Number of steps to accumulate gradients |
| `validation_frequency` | `int` | `1` | Run validation every N epochs |
| `early_stopping` | `EarlyStoppingConfig` | defaults | Early stopping configuration |
| `checkpointing` | `CheckpointingConfig` | defaults | Checkpointing configuration |

## TrainingConfig

The top-level training configuration — everything bundled together. Sent when the user clicks "Train".

| Field | Type | Description |
|-------|------|-------------|
| `dataset_config` | `DatasetConfig` | Dataset configuration |
| `model_graph` | `GraphConfig` | Model graph definition |
| `loss` | `LossConfig` | Loss function configuration |
| `optimizer` | `OptimizerConfig` | Optimizer configuration |
| `scheduler` | `SchedulerConfig \| None` | Optional LR scheduler |
| `training` | `TrainingSettings` | Training settings |

### Example

```json
{
  "dataset_config": {
    "source": "predefined",
    "name": "CIFAR10",
    "split": "train"
  },
  "model_graph": {
    "nodes": [
      { "id": "conv1", "type": "Conv2d", "params": { "in_channels": 3, "out_channels": 16, "kernel_size": 3, "padding": 1 } },
      { "id": "relu1", "type": "ReLU", "params": {} },
      { "id": "pool1", "type": "MaxPool2d", "params": { "kernel_size": 2 } },
      { "id": "flat1", "type": "Flatten", "params": {} },
      { "id": "fc1", "type": "Linear", "params": { "in_features": 4096, "out_features": 10 } }
    ],
    "edges": [
      { "source": "input", "target": "conv1" },
      { "source": "conv1", "target": "relu1" },
      { "source": "relu1", "target": "pool1" },
      { "source": "pool1", "target": "flat1" },
      { "source": "flat1", "target": "fc1" },
      { "source": "fc1", "target": "output" }
    ]
  },
  "loss": { "type": "CrossEntropyLoss" },
  "optimizer": { "type": "AdamW", "params": { "lr": 0.001 } },
  "scheduler": { "type": "CosineAnnealingLR", "params": { "T_max": 50 } },
  "training": {
    "epochs": 50,
    "device": "cuda",
    "mixed_precision": true,
    "early_stopping": { "enabled": true, "patience": 5 }
  }
}
```
