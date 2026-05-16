# Preview

::: dataset.preview
    options:
      show_source: true

## Overview

Preview dataset samples in a frontend-friendly format. Used by the `POST /datasets/preview` endpoint to show users what their data looks like before training.

## Function

### `preview_dataset(config, num_samples)`

Preview samples from a dataset configuration.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `config` | `DatasetConfig` | — | Dataset configuration |
| `num_samples` | `int` | `5` | Number of samples to preview |

**Returns:** `dict` with keys:

| Key | Type | Description |
|-----|------|-------------|
| `status` | `str` | `"success"` or `"error"` |
| `modality` | `str` | Detected modality |
| `num_samples` | `int` | Number of samples returned |
| `samples` | `list[dict]` | Preview samples (format varies by modality) |
| `message` | `str \| None` | Error message |

## Sample Formats by Modality

### Image modality

Each sample contains a base64-encoded thumbnail:

```json
{
    "image": "data:image/jpeg;base64,/9j/4AAQ...",
    "label": "cat",
    "label_index": 0
}
```

### Text modality

Each sample contains the tokenized sequence:

```json
{
    "text": "hello world",
    "input_ids": [1, 5, 10, 0, 0, ...],
    "label": "positive",
    "label_index": 1
}
```

### Tabular modality

Each sample contains the feature vector:

```json
{
    "features": [25.0, 50000.0, 0.0],
    "feature_names": ["age", "income", "category_encoded"],
    "label": 1
}
```

### Audio modality

Each sample contains spectrogram statistics:

```json
{
    "file": "audio_001.wav",
    "spectrogram_shape": [64, 32],
    "spectrogram_mean": -3.42,
    "spectrogram_std": 2.15,
    "label": "speech",
    "label_index": 0
}
```

## Example

```python
from dataset.preview import preview_dataset
from schemas import PredefinedDatasetConfig

config = PredefinedDatasetConfig(name="CIFAR10", split="train")
result = preview_dataset(config, num_samples=3)
# {
#     "status": "success",
#     "modality": "image",
#     "num_samples": 3,
#     "samples": [...]
# }
```
