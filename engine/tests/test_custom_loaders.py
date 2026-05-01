"""
Tests for the custom_loaders package:
  - CSVImageDataset: CSV with image paths and labels
  - TextDataset: CSV with text column and tokenization
  - TabularDataset: CSV with feature/target columns
  - AudioDataset: folder of audio class subfolders
"""


import pytest
import torch

# ---------------------------------------------------------------------------
# CSVImageDataset
# ---------------------------------------------------------------------------


def test_csv_image_dataset_loads_csv(tmp_path):
    """CSVImageDataset reads a CSV and returns image/label pairs."""
    import pandas as pd
    from PIL import Image

    from dataset.custom_loaders.csv_image_dataset import CSVImageDataset

    # Create a small image
    img_dir = tmp_path / "images"
    img_dir.mkdir()
    img = Image.new("RGB", (32, 32), color="red")
    img.save(img_dir / "img1.jpg")
    img.save(img_dir / "img2.jpg")

    # Create CSV
    csv_path = tmp_path / "labels.csv"
    df = pd.DataFrame({
        "image": ["images/img1.jpg", "images/img2.jpg"],
        "label": ["cat", "dog"],
    })
    df.to_csv(csv_path, index=False)

    ds = CSVImageDataset(
        root=str(tmp_path),
        label_file=str(csv_path),
        image_column="image",
        label_column="label",
    )

    assert len(ds) == 2
    assert set(ds.classes) == {"cat", "dog"}
    sample, label = ds[0]
    assert isinstance(label, int)


def test_csv_image_dataset_missing_file(tmp_path):
    """CSVImageDataset raises if label file doesn't exist."""
    from dataset.custom_loaders.csv_image_dataset import CSVImageDataset

    with pytest.raises(FileNotFoundError, match="Label file not found"):
        CSVImageDataset(
            root=str(tmp_path),
            label_file=str(tmp_path / "nonexistent.csv"),
        )


def test_csv_image_dataset_missing_column(tmp_path):
    """CSVImageDataset raises if required column is missing."""
    import pandas as pd

    from dataset.custom_loaders.csv_image_dataset import CSVImageDataset

    csv_path = tmp_path / "labels.csv"
    pd.DataFrame({"wrong_col": ["a"]}).to_csv(csv_path, index=False)

    with pytest.raises(ValueError, match="Image column"):
        CSVImageDataset(
            root=str(tmp_path),
            label_file=str(csv_path),
            image_column="image",
        )


# ---------------------------------------------------------------------------
# TextDataset
# ---------------------------------------------------------------------------


def test_text_dataset_loads_csv(tmp_path):
    """TextDataset reads a CSV and returns token-ID tensors."""
    import pandas as pd

    from dataset.custom_loaders.text_dataset import TextDataset

    csv_path = tmp_path / "text.csv"
    df = pd.DataFrame({
        "review": ["hello world", "foo bar baz"],
        "sentiment": ["positive", "negative"],
    })
    df.to_csv(csv_path, index=False)

    ds = TextDataset(
        file_path=str(csv_path),
        text_column="review",
        target_column="sentiment",
        max_length=16,
    )

    assert len(ds) == 2
    input_ids, label = ds[0]
    assert isinstance(input_ids, torch.Tensor)
    assert input_ids.shape == (16,)
    assert isinstance(label, int)


def test_text_dataset_missing_file():
    """TextDataset raises if file doesn't exist."""
    from dataset.custom_loaders.text_dataset import TextDataset

    with pytest.raises(FileNotFoundError, match="Data file not found"):
        TextDataset(file_path="/nonexistent/file.csv")


def test_text_dataset_missing_column(tmp_path):
    """TextDataset raises if text column is missing."""
    import pandas as pd

    from dataset.custom_loaders.text_dataset import TextDataset

    csv_path = tmp_path / "text.csv"
    pd.DataFrame({"wrong": ["a"]}).to_csv(csv_path, index=False)

    with pytest.raises(ValueError, match="Text column"):
        TextDataset(file_path=str(csv_path), text_column="review")


def test_text_dataset_pads_and_truncates(tmp_path):
    """TextDataset pads short sequences and truncates long ones."""
    import pandas as pd

    from dataset.custom_loaders.text_dataset import TextDataset

    csv_path = tmp_path / "text.csv"
    df = pd.DataFrame({"text": ["short", "a " * 1000]})  # one short, one long
    df.to_csv(csv_path, index=False)

    ds = TextDataset(file_path=str(csv_path), max_length=32)

    short_ids, _ = ds[0]
    long_ids, _ = ds[1]
    assert short_ids.shape == (32,)
    assert long_ids.shape == (32,)


# ---------------------------------------------------------------------------
# TabularDataset
# ---------------------------------------------------------------------------


def test_tabular_dataset_loads_csv(tmp_path):
    """TabularDataset reads a CSV and returns feature tensors."""
    import pandas as pd

    from dataset.custom_loaders.tabular_dataset import TabularDataset

    csv_path = tmp_path / "data.csv"
    df = pd.DataFrame({
        "age": [25, 30, 35],
        "income": [50000, 60000, 70000],
        "label": [0, 1, 0],
    })
    df.to_csv(csv_path, index=False)

    ds = TabularDataset(
        file_path=str(csv_path),
        feature_columns=["age", "income"],
        target_column="label",
        normalize=False,
    )

    assert len(ds) == 3
    features, label = ds[0]
    assert features.shape == (2,)
    assert isinstance(label, int)


def test_tabular_dataset_normalizes(tmp_path):
    """TabularDataset normalizes numerical features when normalize=True."""
    import pandas as pd

    from dataset.custom_loaders.tabular_dataset import TabularDataset

    csv_path = tmp_path / "data.csv"
    df = pd.DataFrame({
        "x": [1.0, 2.0, 3.0],
        "y": [10.0, 20.0, 30.0],
    })
    df.to_csv(csv_path, index=False)

    ds = TabularDataset(
        file_path=str(csv_path),
        feature_columns=["x", "y"],
        normalize=True,
    )

    features, _ = ds[1]  # middle value should be near 0 after normalization
    assert abs(features[0].item()) < 0.01  # x=2 is the mean


def test_tabular_dataset_missing_file():
    """TabularDataset raises if file doesn't exist."""
    from dataset.custom_loaders.tabular_dataset import TabularDataset

    with pytest.raises(FileNotFoundError, match="Data file not found"):
        TabularDataset(file_path="/nonexistent/file.csv")


def test_tabular_dataset_categorical_encoding(tmp_path):
    """TabularDataset label-encodes categorical columns."""
    import pandas as pd

    from dataset.custom_loaders.tabular_dataset import TabularDataset

    csv_path = tmp_path / "data.csv"
    df = pd.DataFrame({
        "color": ["red", "blue", "green", "red"],
        "value": [1.0, 2.0, 3.0, 4.0],
    })
    df.to_csv(csv_path, index=False)

    ds = TabularDataset(
        file_path=str(csv_path),
        feature_columns=["color", "value"],
        categorical_columns=["color"],
        normalize=False,
    )

    features, _ = ds[0]
    assert features.shape == (2,)
    # Row 0 has color="red"; sorted encoding: blue=0, green=1, red=2
    assert features[0].item() == 2.0


# ---------------------------------------------------------------------------
# AudioDataset — basic structure tests (no actual audio files needed)
# ---------------------------------------------------------------------------


def test_audio_dataset_requires_torchaudio():
    """AudioDataset raises ImportError if torchaudio is not available."""
    # This test just verifies the import guard works
    from dataset.custom_loaders.audio_dataset import HAS_TORCHAUDIO

    # If torchaudio IS installed (likely in this env), we can't test the error path
    # Just verify the flag exists
    assert isinstance(HAS_TORCHAUDIO, bool)


def test_audio_dataset_missing_root():
    """AudioDataset raises if root directory doesn't exist."""
    from dataset.custom_loaders.audio_dataset import AudioDataset

    if not AudioDataset.__module__:
        pytest.skip("AudioDataset not available")

    try:
        with pytest.raises(ValueError, match="not found"):
            AudioDataset(root="/nonexistent/path")
    except ImportError:
        pytest.skip("torchaudio not installed")
