# Training Execution API Endpoints

Weave provides standard REST and streaming endpoints to start training runs, stream execution progress metrics, control active training threads, and query run statuses.

---

## 1. Start Training Run

Starts a training execution thread in the background.

- **Method**: `POST`
- **URL**: `/training/start`
- **Request Body**: `TrainingConfig` JSON structure
- **Response**: `{"run_id": "string"}`

### Request Payload Example
```json
{
  "dataset_config": {
    "source": "predefined",
    "name": "MNIST",
    "root_dir": "./data",
    "batch_size": 32,
    "split": "train"
  },
  "model_graph": {
    "nodes": [
      {
        "id": "fc1",
        "type": "Linear",
        "params": {
          "in_features": 784,
          "out_features": 10
        }
      }
    ],
    "edges": [
      {"source": "input", "target": "fc1"},
      {"source": "fc1", "target": "output"}
    ]
  },
  "loss": {
    "type": "CrossEntropyLoss",
    "params": {}
  },
  "optimizer": {
    "type": "Adam",
    "params": {
      "lr": 0.001
    }
  },
  "training": {
    "epochs": 10,
    "device": "cuda",
    "mixed_precision": true,
    "gradient_clip_norm": 1.0,
    "gradient_accumulation_steps": 1,
    "validation_frequency": 1,
    "early_stopping": {
      "enabled": true,
      "patience": 3,
      "monitor": "val_loss",
      "mode": "min"
    },
    "checkpointing": {
      "save_best": true,
      "save_every_n_epochs": 2,
      "monitor": "val_loss",
      "directory": "/checkpoints"
    }
  }
}
```

---

## 2. Stream Training Metrics

Streams real-time metrics logs (step metrics, epoch summaries, and training finish details) from the active runner queue using Server-Sent Events (SSE).

- **Method**: `GET`
- **URL**: `/training/stream/{run_id}`
- **Response**: `text/event-stream` stream chunks

### Stream Event Types

#### `step_metrics`
Fired at the end of every batch iteration:
```
event: step_metrics
data: {"type": "step_metrics", "run_id": "...", "epoch": 1, "step": 150, "metrics": {"train_loss": 0.42, "learning_rate": 0.001}}
```

#### `epoch_metrics`
Fired at the end of every epoch boundary:
```
event: epoch_metrics
data: {"type": "epoch_metrics", "run_id": "...", "epoch": 1, "metrics": {"train_loss": 0.38, "val_loss": 0.39, "train_accuracy": 89.2, "val_accuracy": 88.5}}
```

#### `training_complete`
Fired when training finishes successfully or early stops:
```
event: training_complete
data: {"type": "training_complete", "run_id": "...", "best_epoch": 8, "best_val_loss": 0.31}
```

---

## 3. Control Training Run

Controls active background thread transitions.

- **Method**: `POST`
- **URL**: `/training/control/{run_id}`
- **Request Body**: `TrainingControlMessage`
- **Response**: `{"status": "success", "action": "pause"|"resume"|"stop"}`

### Request Payload Example
```json
{
  "action": "pause"
}
```

---

## 4. Query Training Status

Queries the execution state and latest recorded metrics.

- **Method**: `GET`
- **URL**: `/training/status/{run_id}`
- **Response**: `TrainingStatusResponse` JSON payload

### Response Example
```json
{
  "run_id": "...",
  "status": "running",
  "current_epoch": 3,
  "total_epochs": 10,
  "latest_metrics": {
    "train_loss": 0.28,
    "val_loss": 0.31,
    "train_accuracy": 92.1,
    "val_accuracy": 91.4
  }
}
```
