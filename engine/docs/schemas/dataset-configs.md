# Dataset Configs

## TransformConfig

Defines a single preprocessing transform. Uses `ConfigDict(extra="allow")` to accept any extra fields alongside `"type"`, since each transform type has its own unique parameter names.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `str` | Transform name (e.g. `"Resize"`, `"Normalize"`, `"ToTensor"`) |
| *(extra fields)* | any | Transform-specific parameters as flat fields |

### Supported Transforms

| Type | Extra Fields | PyTorch Transform | Category |
|------|-------------|-------------------|----------|
| `Resize` | `size: int \| list[int]` | `transforms.Resize` | geometric |
| `CenterCrop` | `size: int \| list[int]` | `transforms.CenterCrop` | geometric |
| `RandomResizedCrop` | `size: int`, `scale: list[float]` | `transforms.RandomResizedCrop` | augmentation |
| `RandomHorizontalFlip` | `p: float = 0.5` | `transforms.RandomHorizontalFlip` | augmentation |
| `RandomVerticalFlip` | `p: float = 0.5` | `transforms.RandomVerticalFlip` | augmentation |
| `RandomRotation` | `degrees: float \| list[float]` | `transforms.RandomRotation` | augmentation |
| `ColorJitter` | `brightness`, `contrast`, `saturation`, `hue: float` | `transforms.ColorJitter` | color |
| `GaussianBlur` | `kernel_size: int \| list[int]`, `sigma: list[float]` | `transforms.GaussianBlur` | color |
| `RandomErasing` | `p: float = 0.5`, `scale: list[float]` | `transforms.RandomErasing` | augmentation |
| `Grayscale` | `num_output_channels: int = 1` | `transforms.Grayscale` | color |
| `Normalize` | `mean: list[float]`, `std: list[float]` | `transforms.Normalize` | normalization |
| `ToTensor` | *(none)* | `transforms.ToTensor` | normalization |

### Example: Flat schema (preferred)

```json
{ "type": "Resize", "size": [224, 224] }
```

### Example: Nested params (also supported)

```json
{ "type": "Resize", "params": { "size": [224, 224] } }
```

## DataLoaderConfig

Configuration for the PyTorch DataLoader wrapper.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `batch_size` | `int` | `32` | Number of samples per batch |
| `shuffle` | `bool` | `True` | Whether to shuffle data at every epoch |
| `num_workers` | `int` | `4` | Number of subprocesses for data loading |
| `pin_memory` | `bool` | `True` | If `True`, copies data into pinned memory |
| `drop_last` | `bool` | `False` | If `True`, drops the last incomplete batch |

## DatasetConfig Union

A discriminated union that selects on the `source` field:

```python
DatasetConfig = Annotated[
    Union[
        PredefinedDatasetConfig,   # source = "predefined"
        ImageFolderDatasetConfig,  # source = "image_folder"
        CustomDatasetConfig,       # source = "custom"
    ],
    Field(discriminator="source"),
]
```

## PredefinedDatasetConfig

Built-in datasets from torchvision: MNIST, FashionMNIST, CIFAR10, CIFAR100, ImageNet, AG News, IMDB.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `source` | `Literal["predefined"]` | — | Discriminator |
| `name` | `str` | — | Dataset name (e.g. `"CIFAR10"`) |
| `split` | `str` | — | `"train"` or `"test"` |
| `transforms` | `list[TransformConfig]` | `[]` | Preprocessing pipeline |
| `dataloader` | `DataLoaderConfig` | defaults | DataLoader settings |

### Example

```json
{
  "source": "predefined",
  "name": "CIFAR10",
  "split": "train",
  "transforms": [
    { "type": "Resize", "size": [224, 224] },
    { "type": "Normalize", "mean": [0.485, 0.456, 0.406], "std": [0.229, 0.224, 0.225] }
  ],
  "dataloader": { "batch_size": 64, "shuffle": true }
}
```

## ImageFolderDatasetConfig

Local folder where subfolders are class names (standard torchvision ImageFolder structure).

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `source` | `Literal["image_folder"]` | — | Discriminator |
| `root` | `str` | — | Path to the image folder |
| `split_ratio` | `float` | `0.8` | Train/test split ratio |
| `transforms` | `list[TransformConfig]` | `[]` | Preprocessing pipeline |
| `dataloader` | `DataLoaderConfig` | defaults | DataLoader settings |

### Example

```json
{
  "source": "image_folder",
  "root": "/data/my_dataset",
  "split_ratio": 0.8,
  "transforms": [
    { "type": "Resize", "size": [224, 224] }
  ]
}
```

## CustomDatasetConfig

All 4 custom modalities in one class, discriminated by the `modality` field.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `source` | `Literal["custom"]` | — | Discriminator |
| `modality` | `Literal["image", "text", "tabular", "audio"]` | — | Data modality |
| `root` | `str \| None` | `None` | Root folder (image + audio) |
| `label_source` | `str \| None` | `None` | `"csv"` or `"folder"` (image) |
| `label_file` | `str \| None` | `None` | CSV file with labels (image) |
| `image_column` | `str \| None` | `None` | Column name for image paths (image) |
| `label_column` | `str \| None` | `None` | Column name for labels (image) |
| `file_pattern` | `str` | `"*.jpg"` | Glob pattern for image files |
| `file_path` | `str \| None` | `None` | Data file path (text + tabular) |
| `text_column` | `str \| None` | `None` | Column with text data (text) |
| `tokenizer` | `str` | `"bpe"` | Tokenizer type (text) |
| `vocab_size` | `int` | `30000` | Vocabulary size (text) |
| `max_length` | `int` | `512` | Max sequence length (text) |
| `feature_columns` | `list[str]` | `[]` | Feature column names (tabular) |
| `target_column` | `str \| None` | `None` | Target column name (tabular) |
| `categorical_columns` | `list[str]` | `[]` | Categorical feature columns (tabular) |
| `normalize` | `bool` | `True` | Whether to normalize features (tabular) |
| `sample_rate` | `int` | `16000` | Audio sample rate in Hz (audio) |
| `max_duration_sec` | `float` | `1.0` | Max audio duration in seconds (audio) |
| `feature_extraction` | `str` | `"mel_spectrogram"` | Feature extraction method (audio) |
| `n_mels` | `int` | `64` | Number of mel bands (audio) |
| `transforms` | `list[TransformConfig]` | `[]` | Preprocessing pipeline |
| `dataloader` | `DataLoaderConfig` | defaults | DataLoader settings |

### Example: Text modality

```json
{
  "source": "custom",
  "modality": "text",
  "file_path": "/data/reviews.csv",
  "text_column": "review",
  "max_length": 256,
  "vocab_size": 20000
}
```

### Example: Audio modality

```json
{
  "source": "custom",
  "modality": "audio",
  "root": "/data/audio_files",
  "sample_rate": 22050,
  "max_duration_sec": 3.0,
  "n_mels": 128
}
```
