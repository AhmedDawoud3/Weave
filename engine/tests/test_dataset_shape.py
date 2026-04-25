"""
Tests for dataset.shape_inference — dataset output shape inference.
"""

import pytest

from dataset.shape_inference import infer_dataset_shape
from schemas import (
    CustomDatasetConfig,
    DataLoaderConfig,
    ImageFolderDatasetConfig,
    PredefinedDatasetConfig,
    TransformConfig,
)


# ---------------------------------------------------------------------------
# Predefined datasets
# ---------------------------------------------------------------------------


def test_predefined_mnist_shape():
    config = PredefinedDatasetConfig(
        source="predefined",
        name="MNIST",
        split="train",
    )
    result = infer_dataset_shape(config)

    assert result["status"] == "success"
    assert result["per_sample_shape"] == [1, 28, 28]
    assert result["batch_shape"] == [32, 1, 28, 28]  # default batch_size=32
    assert result["num_classes"] == 10


def test_predefined_cifar10_shape():
    config = PredefinedDatasetConfig(
        source="predefined",
        name="CIFAR10",
        split="train",
    )
    result = infer_dataset_shape(config)

    assert result["status"] == "success"
    assert result["per_sample_shape"] == [3, 32, 32]
    assert result["num_classes"] == 10


def test_predefined_with_resize_transform():
    config = PredefinedDatasetConfig(
        source="predefined",
        name="MNIST",
        split="train",
        transforms=[TransformConfig(type="Resize", size=224)],
    )
    result = infer_dataset_shape(config)

    assert result["status"] == "success"
    assert result["per_sample_shape"] == [1, 224, 224]


def test_predefined_batch_shape_custom_batch_size():
    config = PredefinedDatasetConfig(
        source="predefined",
        name="MNIST",
        split="train",
        dataloader=DataLoaderConfig(batch_size=64),
    )
    result = infer_dataset_shape(config)

    assert result["status"] == "success"
    assert result["batch_shape"] == [64, 1, 28, 28]


def test_predefined_unknown_dataset():
    config = PredefinedDatasetConfig(
        source="predefined",
        name="NonExistentDataset",
        split="train",
    )
    result = infer_dataset_shape(config)

    assert result["status"] == "error"
    assert "not found" in result["message"]


# ---------------------------------------------------------------------------
# Image Folder datasets
# ---------------------------------------------------------------------------


def test_image_folder_default_shape():
    config = ImageFolderDatasetConfig(
        source="image_folder",
        root="/nonexistent/path",
    )
    result = infer_dataset_shape(config)

    assert result["status"] == "success"
    # Default shape before transforms
    assert result["per_sample_shape"] == [3, 256, 256]
    assert result["batch_shape"] == [32, 3, 256, 256]


def test_image_folder_with_resize(tmp_path):
    """ImageFolder with Resize transform should update the shape."""
    config = ImageFolderDatasetConfig(
        source="image_folder",
        root=str(tmp_path),
        transforms=[TransformConfig(type="Resize", size=128)],
    )
    result = infer_dataset_shape(config)

    assert result["status"] == "success"
    assert result["per_sample_shape"] == [3, 128, 128]


def test_image_folder_num_classes(tmp_path):
    """ImageFolder should detect num_classes from subfolders."""
    (tmp_path / "cat").mkdir()
    (tmp_path / "dog").mkdir()

    config = ImageFolderDatasetConfig(
        source="image_folder",
        root=str(tmp_path),
    )
    result = infer_dataset_shape(config)

    assert result["status"] == "success"
    assert result["num_classes"] == 2


# ---------------------------------------------------------------------------
# Custom datasets
# ---------------------------------------------------------------------------


def test_custom_tabular_shape():
    config = CustomDatasetConfig(
        source="custom",
        modality="tabular",
        feature_columns=["age", "income", "score"],
        target_column="label",
    )
    result = infer_dataset_shape(config)

    assert result["status"] == "success"
    assert result["per_sample_shape"] == [3]  # 3 feature columns
    assert result["batch_shape"] == [32, 3]


def test_custom_audio_shape():
    config = CustomDatasetConfig(
        source="custom",
        modality="audio",
        sample_rate=16000,
        max_duration_sec=1.0,
        n_mels=64,
    )
    result = infer_dataset_shape(config)

    assert result["status"] == "success"
    assert result["per_sample_shape"][0] == 64  # n_mels
    # time_frames = int(16000 * 1.0 / 512) + 1 = 32
    assert result["per_sample_shape"][1] == 32


def test_custom_text_shape():
    config = CustomDatasetConfig(
        source="custom",
        modality="text",
        max_length=512,
    )
    result = infer_dataset_shape(config)

    assert result["status"] == "success"
    assert result["per_sample_shape"] == [512]


def test_custom_image_with_transforms():
    config = CustomDatasetConfig(
        source="custom",
        modality="image",
        transforms=[TransformConfig(type="Resize", size=224)],
    )
    result = infer_dataset_shape(config)

    assert result["status"] == "success"
    assert result["per_sample_shape"] == [3, 224, 224]


def test_custom_tabular_empty_features():
    config = CustomDatasetConfig(
        source="custom",
        modality="tabular",
        feature_columns=[],
    )
    result = infer_dataset_shape(config)

    assert result["status"] == "success"
    assert result["per_sample_shape"] == [1]  # minimum 1 feature
