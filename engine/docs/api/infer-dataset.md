# POST /infer/dataset

Compute the per-sample and batch tensor shapes for a dataset configuration. Does not require actual data download or loading — uses the registry and transform pipeline for static inference.

## Request

**Content-Type**: `application/json`

### Schema: [`DatasetShapeInferenceRequest`](../schemas/request-response.md#datasetshapeinferencerequest)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dataset_config` | [`DatasetConfig`](../schemas/dataset-configs.md#datasetconfig-union) | ✅ | Dataset configuration (predefined, image_folder, or custom) |

## Response

### Schema: [`DatasetShapeInferenceResponse`](../schemas/request-response.md#datasetshapeinferenceresponse)

| Field | Type | Description |
|-------|------|-------------|
| `status` | `str` | `"success"` or `"error"` |
| `per_sample_shape` | `list[int]` or `null` | Shape of a single sample, e.g. `[3, 224, 224]` |
| `batch_shape` | `list[int]` or `null` | Shape including batch dimension, e.g. `[32, 3, 224, 224]` |
| `num_classes` | `int` or `null` | Number of output classes (if known) |
| `message` | `str` or `null` | Error description (only on error) |

## Examples

### Predefined Dataset: CIFAR10

```json
{
  "dataset_config": {
    "source": "predefined",
    "name": "CIFAR10",
    "split": "train"
  }
}
```

**Response:**

```json
{
  "status": "success",
  "per_sample_shape": [3, 32, 32],
  "batch_shape": [32, 3, 32, 32],
  "num_classes": 10
}
```

### Predefined Dataset: MNIST with Transforms

```json
{
  "dataset_config": {
    "source": "predefined",
    "name": "MNIST",
    "split": "train",
    "transforms": [
      { "type": "Resize", "size": [32, 32] },
      { "type": "Normalize", "mean": [0.1307], "std": [0.3081] }
    ],
    "dataloader": {
      "batch_size": 64,
      "shuffle": true,
      "num_workers": 2
    }
  }
}
```

**Response:**

```json
{
  "status": "success",
  "per_sample_shape": [1, 32, 32],
  "batch_shape": [64, 1, 32, 32],
  "num_classes": 10
}
```

### ImageFolder Dataset

```json
{
  "dataset_config": {
    "source": "image_folder",
    "root": "/data/my_dataset",
    "split_ratio": 0.8,
    "transforms": [
      { "type": "Resize", "size": [224, 224] },
      { "type": "Normalize", "mean": [0.485, 0.456, 0.406], "std": [0.229, 0.224, 0.225] }
    ]
  }
}
```

**Response:**

```json
{
  "status": "success",
  "per_sample_shape": [3, 224, 224],
  "batch_shape": [32, 3, 224, 224],
  "num_classes": null
}
```

!!! note "num_classes for ImageFolder"
    `num_classes` is only populated when the folder path exists and can be scanned. During configuration (before data exists), it returns `null`.

### Custom Dataset: Image Modality

```json
{
  "dataset_config": {
    "source": "custom",
    "modality": "image",
    "root": "/data/custom_images",
    "label_source": "csv",
    "label_file": "labels.csv",
    "image_column": "filename",
    "label_column": "label",
    "transforms": [
      { "type": "Resize", "size": [128, 128] }
    ]
  }
}
```

**Response:**

```json
{
  "status": "success",
  "per_sample_shape": [3, 128, 128],
  "batch_shape": [32, 3, 128, 128],
  "num_classes": null
}
```

### Custom Dataset: Text Modality

```json
{
  "dataset_config": {
    "source": "custom",
    "modality": "text",
    "file_path": "/data/reviews.csv",
    "text_column": "review",
    "tokenizer": "bpe",
    "vocab_size": 30000,
    "max_length": 256
  }
}
```

**Response:**

```json
{
  "status": "success",
  "per_sample_shape": [256],
  "batch_shape": [32, 256],
  "num_classes": null
}
```

### Custom Dataset: Tabular Modality

```json
{
  "dataset_config": {
    "source": "custom",
    "modality": "tabular",
    "file_path": "/data/housing.csv",
    "feature_columns": ["area", "bedrooms", "bathrooms", "age"],
    "target_column": "price",
    "normalize": true
  }
}
```

**Response:**

```json
{
  "status": "success",
  "per_sample_shape": [4],
  "batch_shape": [32, 4],
  "num_classes": null
}
```

### Custom Dataset: Audio Modality

```json
{
  "dataset_config": {
    "source": "custom",
    "modality": "audio",
    "root": "/data/audio_files",
    "sample_rate": 16000,
    "max_duration_sec": 2.0,
    "feature_extraction": "mel_spectrogram",
    "n_mels": 64
  }
}
```

**Response:**

```json
{
  "status": "success",
  "per_sample_shape": [64, 63],
  "batch_shape": [32, 64, 63],
  "num_classes": null
}
```

!!! tip "Audio shape calculation"
    Time frames = `sample_rate × max_duration_sec / hop_length + 1` where `hop_length = 512` (default). For the example above: `16000 × 2.0 / 512 + 1 = 63`.

## Error Responses

### Unknown predefined dataset

```json
{
  "status": "error",
  "message": "Dataset 'ImageNet' not found in registry. Available: ['MNIST', 'CIFAR10']"
}
```

### Unknown custom modality

```json
{
  "status": "error",
  "message": "Unknown custom dataset modality: 'video'."
}
```

## How It Works

1. **Dispatch** based on `source` type (predefined, image_folder, custom)
2. **Predefined**: Look up base shape from the registry, then apply transforms
3. **ImageFolder**: Default to `[3, 256, 256]`, apply transforms, optionally scan for `num_classes`
4. **Custom**: Compute shape based on `modality`:
    - **image**: `[3, 256, 256]` + transforms
    - **text**: `[max_length]`
    - **tabular**: `[len(feature_columns)]`
    - **audio**: `[n_mels, time_frames]`
5. **Prepend** batch size from dataloader config to get `batch_shape`
