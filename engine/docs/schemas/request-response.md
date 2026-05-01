# Request & Response Schemas

All request/response schemas for the API endpoints and future endpoints.

## Model Builder Endpoints

### ShapeInferenceRequest

`POST /infer/layer` — single layer shape check.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `node` | `NodeConfig` | ✅ | The layer or block node to evaluate |
| `input_shape` | `list[int]` | ⚠️ | Input tensor shape (required for single-input layers) |
| `input_shapes` | `list[list[int]] \| None` | ⚠️ | Multiple input shapes (required for multi-input layers) |

### ShapeInferenceResponse

| Field | Type | Description |
|-------|------|-------------|
| `status` | `str` | `"success"` or `"error"` |
| `output_shape` | `list[int] \| None` | Output tensor shape |
| `message` | `str \| None` | Error message |

### DatasetShapeInferenceRequest

`POST /infer/dataset` — dataset output shape check.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dataset_config` | `DatasetConfig` | ✅ | Dataset configuration |

### DatasetShapeInferenceResponse

| Field | Type | Description |
|-------|------|-------------|
| `status` | `str` | `"success"` or `"error"` |
| `per_sample_shape` | `list[int] \| None` | Shape of one sample (e.g. `[3, 224, 224]`) |
| `batch_shape` | `list[int] \| None` | Shape with batch dim (e.g. `[32, 3, 224, 224]`) |
| `num_classes` | `int \| None` | Number of output classes |
| `message` | `str \| None` | Error message |

### PipelineValidationRequest

`POST /validate_pipeline` — full graph validation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `graph` | `GraphConfig` | ✅ | The complete model graph |
| `input_shape` | `list[int]` | ✅ | Input tensor shape |

### PipelineValidationResponse

| Field | Type | Description |
|-------|------|-------------|
| `status` | `str` | `"success"` or `"error"` |
| `node_shapes` | `dict \| None` | Map of node ID → output shape |
| `message` | `str \| None` | Error message |

## Loss Suggestion (Future)

### LossSuggestionRequest

`POST /loss/suggest`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `output_shape` | `list[int]` | ✅ | Shape of the model output |
| `final_activation` | `str` | ✅ | `"none"`, `"softmax"`, `"sigmoid"`, `"log_softmax"` |
| `task_type` | `str` | ✅ | `"classification"`, `"regression"`, `"multi_label"` |

### LossSuggestionResponse

| Field | Type | Description |
|-------|------|-------------|
| `suggested` | `str` | Primary suggested loss function |
| `alternatives` | `list[str]` | Alternative loss functions |

## LR Schedule Preview (Future)

### LRSchedulePreviewRequest

`POST /optimizer/preview_lr_schedule`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `optimizer` | `str` | ✅ | Optimizer name |
| `optimizer_params` | `dict` | `{}` | Optimizer parameters |
| `scheduler` | `str` | ✅ | Scheduler name |
| `scheduler_params` | `dict` | `{}` | Scheduler parameters |
| `total_steps` | `int` | ✅ | Total training steps |

### LRSchedulePreviewResponse

| Field | Type | Description |
|-------|------|-------------|
| `schedule` | `list[list[float]]` | Each item is `[step_number, learning_rate]` |

## Training WebSocket Messages (Future)

### StepMetricsMessage

Server → Client, sent after every batch step.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `Literal["step_metrics"]` | Message type |
| `run_id` | `str` | Training run identifier |
| `epoch` | `int` | Current epoch |
| `step` | `int` | Current step within epoch |
| `metrics` | `dict` | Step metrics (e.g. `{"train_loss": 0.342}`) |

### EpochMetricsMessage

Server → Client, sent after every epoch.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `Literal["epoch_metrics"]` | Message type |
| `run_id` | `str` | Training run identifier |
| `epoch` | `int` | Completed epoch number |
| `metrics` | `dict` | Epoch metrics (e.g. `{"train_loss": 0.342, "val_loss": 0.401}`) |

### TrainingCompleteMessage

Server → Client, sent when training finishes.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `Literal["training_complete"]` | Message type |
| `run_id` | `str` | Training run identifier |
| `best_epoch` | `int` | Epoch with best validation metric |
| `best_val_loss` | `float` | Best validation loss achieved |

### TrainingControlMessage

Client → Server, to control training execution.

| Field | Type | Description |
|-------|------|-------------|
| `action` | `Literal["pause", "resume", "stop"]` | Control action |

## Training Status (Future)

### TrainingStatusResponse

`GET /training/status/{run_id}`

| Field | Type | Description |
|-------|------|-------------|
| `run_id` | `str` | Training run identifier |
| `status` | `Literal["running", "paused", "completed", "failed", "stopped"]` | Current status |
| `current_epoch` | `int \| None` | Current epoch number |
| `total_epochs` | `int \| None` | Total epochs configured |
| `latest_metrics` | `dict \| None` | Most recent metrics |

## Metrics Suggestion (Future)

### MetricsSuggestionRequest

`POST /metrics/suggest`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task_type` | `str` | ✅ | `"classification"`, `"regression"`, `"multi_label"` |
| `num_classes` | `int \| None` | `None` | Number of classes (for classification) |

### MetricsSuggestionResponse

| Field | Type | Description |
|-------|------|-------------|
| `suggested` | `list[str]` | Suggested metric names (e.g. `["Accuracy", "F1Score"]`) |

## Export (Future)

### ExportRequest

`POST /export/onnx` or `/export/pytorch` or `/export/torchscript`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `graph` | `GraphConfig` | ✅ | Model graph |
| `input_shape` | `list[int]` | ✅ | Input tensor shape |
| `checkpoint_path` | `str` | ✅ | Path to model checkpoint |
| `output_path` | `str` | ✅ | Where to save the export |
| `opset_version` | `int \| None` | `17` | ONNX opset version |

### ExportResponse

| Field | Type | Description |
|-------|------|-------------|
| `status` | `str` | `"success"` or `"error"` |
| `output_path` | `str` | Path to exported model |
| `message` | `str \| None` | Error or info message |

## Inference (Future)

### InferenceRequest

`POST /inference/predict`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `graph` | `GraphConfig` | ✅ | Model graph |
| `checkpoint_path` | `str` | ✅ | Path to model checkpoint |
| `input` | `list` | ✅ | Input tensor as flat or nested list |

### InferenceResponse

| Field | Type | Description |
|-------|------|-------------|
| `prediction` | `list[float]` | Model output probabilities/values |
| `predicted_class` | `int \| None` | Predicted class index (None for regression) |

## Experiment Tracking (Future)

### RunRecord

Stored for every training run.

| Field | Type | Description |
|-------|------|-------------|
| `run_id` | `str` | Unique run identifier |
| `created_at` | `datetime` | Timestamp of run creation |
| `status` | `Literal["running", "completed", "failed", "stopped"]` | Run status |
| `config` | `dict` | Full TrainingConfig snapshot |
| `graph_snapshot` | `dict` | Model graph at time of training |
| `metrics_history` | `list[dict[str, Any]]` | All epoch metrics |
| `best_metrics` | `dict \| None` | Best metrics achieved |
| `checkpoint_path` | `str \| None` | Path to best checkpoint |
| `duration_seconds` | `float \| None` | Total training duration |

### ExperimentCompareRequest

`POST /experiments/compare`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `run_ids` | `list[str]` | ✅ | Run IDs to compare |
| `metrics` | `list[str]` | ✅ | Metric names to compare |

### ExperimentCompareResponse

| Field | Type | Description |
|-------|------|-------------|
| `runs` | `list[dict]` | Per-run metric histories |

## Dataset Catalog & Management

### DatasetCatalogResponse

`GET /datasets/catalog` — list all predefined datasets with UI metadata.

| Field | Type | Description |
|-------|------|-------------|
| `datasets` | `list[DatasetCatalogEntry]` | Available datasets |

#### DatasetCatalogEntry

| Field | Type | Description |
|-------|------|-------------|
| `name` | `str` | Dataset name |
| `shape` | `list[int]` | Per-sample tensor shape |
| `num_classes` | `int` | Number of output classes |
| `description` | `str` | Human-readable description |
| `tags` | `list[str]` | Search/filter tags |
| `modality` | `str` | Data modality |

### TransformCatalogResponse

`GET /transforms/catalog` — list all transforms with parameter schemas.

| Field | Type | Description |
|-------|------|-------------|
| `transforms` | `list[TransformCatalogEntry]` | Available transforms |

#### TransformCatalogEntry

| Field | Type | Description |
|-------|------|-------------|
| `name` | `str` | Transform name |
| `description` | `str` | Human-readable description |
| `category` | `str` | Category (`"geometric"`, `"color"`, `"normalization"`, `"augmentation"`) |
| `params` | `dict` | Parameter name → parameter schema |

### DatasetScanRequest

`POST /datasets/scan` — scan a local path for data.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | `str` | ✅ | Path to scan |
| `modality` | `str \| None` | ❌ | Hint: `"image"`, `"text"`, `"tabular"`, `"audio"` |

### DatasetScanResponse

| Field | Type | Description |
|-------|------|-------------|
| `status` | `str` | `"success"` or `"error"` |
| `result` | `dict \| None` | Scan results (format varies by modality) |
| `message` | `str \| None` | Error message |

### DatasetPreviewRequest

`POST /datasets/preview` — preview samples from a dataset.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dataset_config` | `DatasetConfig` | ✅ | Dataset configuration |
| `num_samples` | `int` | ❌ | Number of samples (default: 5) |

### DatasetPreviewResponse

| Field | Type | Description |
|-------|------|-------------|
| `status` | `str` | `"success"` or `"error"` |
| `modality` | `str \| None` | Detected modality |
| `num_samples` | `int \| None` | Number of samples returned |
| `samples` | `list[dict] \| None` | Preview samples |
| `message` | `str \| None` | Error message |

### DatasetValidateRequest

`POST /datasets/validate` — validate a dataset configuration.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dataset_config` | `DatasetConfig` | ✅ | Dataset configuration to validate |

### DatasetValidateResponse

| Field | Type | Description |
|-------|------|-------------|
| `valid` | `bool` | Whether the config is valid |
| `errors` | `list[str]` | Blocking issues |
| `warnings` | `list[str]` | Non-blocking issues |
