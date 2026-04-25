# Shape Inference

::: dataset.shape_inference
    options:
      show_source: true

## Overview

The shape inference module computes per-sample and batch tensor shapes for dataset configurations **without requiring actual data download or loading**. This is the backend for the `POST /infer/dataset` endpoint.

## Main Function

### `infer_dataset_shape(config)`

Infer the tensor shape produced by a dataset configuration.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `DatasetConfig` | Dataset configuration (discriminated union) |

**Returns:** `dict` with keys:

| Key | Type | Description |
|-----|------|-------------|
| `status` | `str` | `"success"` or `"error"` |
| `per_sample_shape` | `list[int] \| None` | Shape of one sample |
| `batch_shape` | `list[int] \| None` | Shape with batch dimension |
| `num_classes` | `int \| None` | Number of output classes |
| `message` | `str \| None` | Error description |

**Dispatch logic:**

| Source Type | Handler | Method |
|-------------|---------|--------|
| `predefined` | `_infer_predefined()` | Registry lookup + transforms |
| `image_folder` | `_infer_image_folder()` | Default `[3, 256, 256]` + scanner |
| `custom` | `_infer_custom()` | Modality-specific computation |

## Internal Functions

### `_infer_predefined(config)`

Look up the base shape from the registry, then apply transforms.

1. Load registry via `load_registry()`
2. Look up `config.name` in the registry
3. Get `base_shape` and `num_classes` from the registry entry
4. Apply transforms via `_apply_transforms_to_shape()`
5. Prepend batch size to get `batch_shape`

### `_infer_image_folder(config)`

ImageFolder datasets default to `[3, 256, 256]`, then apply transforms.

1. Set `base_shape = [3, 256, 256]` (standard RGB assumption)
2. Apply transforms via `_apply_transforms_to_shape()`
3. Try to get `num_classes` from `scan_folder()` (gracefully handles missing paths)
4. Prepend batch size to get `batch_shape`

### `_infer_custom(config)`

Infer shape based on the custom dataset modality.

| Modality | Base Shape | Notes |
|----------|-----------|-------|
| `image` | `[3, 256, 256]` | + transforms applied |
| `text` | `[max_length]` | Tokenized sequence length |
| `tabular` | `[len(feature_columns)]` | One feature per column |
| `audio` | `[n_mels, time_frames]` | Mel spectrogram; `time_frames = sample_rate × max_duration_sec / 512 + 1` |

### `_apply_transforms_to_shape(base_shape, transforms)`

Pass a dummy tensor through the transform pipeline to determine the output shape.

1. If no transforms, return `base_shape` unchanged
2. Convert `TransformConfig` objects to dicts
3. Build transform pipeline via `build_transforms()`
4. Create `torch.zeros(base_shape)` dummy tensor
5. Apply transforms and return the resulting shape
6. On failure, fall back to `base_shape`
