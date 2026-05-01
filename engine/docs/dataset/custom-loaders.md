# Custom Loaders

Four modality-specific PyTorch Dataset implementations for loading custom data that isn't available as a predefined torchvision dataset.

## Overview

The `custom_loaders` package provides dataset classes for the 4 modalities supported by `CustomDatasetConfig`:

| Loader | Modality | Input Format | Output |
|--------|----------|-------------|--------|
| `CSVImageDataset` | image | CSV with image paths + labels | `(PIL.Image, int)` |
| `TextDataset` | text | CSV with text column | `(tensor[token_ids], int)` |
| `TabularDataset` | tabular | CSV with feature/target columns | `(tensor[features], int)` |
| `AudioDataset` | audio | Folder of class subfolders | `(tensor[mel_spectrogram], int)` |

---

## CSVImageDataset

::: dataset.custom_loaders.csv_image_dataset
    options:
      show_source: true

Loads images from a CSV file containing image paths and labels.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `root` | `str` | — | Root directory for resolving relative image paths |
| `label_file` | `str` | — | Path to CSV file with image paths and labels |
| `image_column` | `str` | `"image"` | Column name for image paths |
| `label_column` | `str` | `"label"` | Column name for labels |
| `transform` | `callable \| None` | `None` | Transform pipeline to apply |

**CSV format example:**

```csv
image,label
images/cat1.jpg,cat
images/dog1.jpg,dog
```

**Features:**

* Builds `class_to_idx` mapping from unique labels (sorted alphabetically)
* Resolves relative image paths against `root` directory
* Raises `FileNotFoundError` if label file doesn't exist
* Raises `ValueError` if required columns are missing

---

## TextDataset

::: dataset.custom_loaders.text_dataset
    options:
      show_source: true

Loads text data from a CSV file with whitespace tokenization.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `file_path` | `str` | — | Path to CSV file |
| `text_column` | `str` | `"text"` | Column name for text data |
| `target_column` | `str \| None` | `None` | Column name for labels |
| `max_length` | `int` | `512` | Maximum sequence length |
| `transform` | `callable \| None` | `None` | Transform pipeline |

**Features:**

* Whitespace tokenization with vocabulary building
* Pads short sequences to `max_length` (pad token = 0)
* Truncates long sequences to `max_length`
* Builds `class_to_idx` mapping for target labels
* Special tokens: `<PAD>` = 0, `<UNK>` = 1

---

## TabularDataset

::: dataset.custom_loaders.tabular_dataset
    options:
      show_source: true

Loads tabular data from a CSV file with categorical encoding and normalization.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `file_path` | `str` | — | Path to CSV file |
| `feature_columns` | `list[str] \| None` | `None` | Feature column names (auto-detects if None) |
| `target_column` | `str \| None` | `None` | Target column name |
| `categorical_columns` | `list[str]` | `[]` | Categorical feature columns |
| `normalize` | `bool` | `True` | Whether to z-score normalize numerical features |

**Features:**

* Label-encodes categorical columns (sorted alphabetically: first category = 0)
* Z-score normalization of numerical features (mean=0, std=1)
* Auto-detects feature columns if not specified (all columns except target)
* Handles zero-variance features (std replaced with 1.0)

---

## AudioDataset

::: dataset.custom_loaders.audio_dataset
    options:
      show_source: true

Loads audio files from class-organized folders and computes log-mel spectrograms.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `root` | `str` | — | Root directory with class subfolders |
| `sample_rate` | `int` | `16000` | Target sample rate in Hz |
| `max_duration_sec` | `float` | `1.0` | Maximum audio duration |
| `n_mels` | `int` | `64` | Number of mel frequency bands |
| `transform` | `callable \| None` | `None` | Transform pipeline |

**Folder structure:**

```
audio_data/
├── speech/
│   ├── file1.wav
│   └── file2.wav
└── music/
    ├── file3.wav
    └── file4.wav
```

**Features:**

* Requires `torchaudio` (graceful `ImportError` if not installed)
* Resamples audio to target `sample_rate`
* Pads short audio to `max_duration_sec`
* Computes log-mel spectrograms via `torchaudio.transforms.MelSpectrogram`
* Builds `class_to_idx` from subfolder names
