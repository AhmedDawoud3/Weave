"""
Tests for expanded registry, transform_factory, scanner, preview, and validator.
"""

import pytest
import torch
from torch.utils.data import TensorDataset

from dataset.dataloader import create_dataloader_from_config, split_dataset
from dataset.registry import (
    get_dataset_metadata,
    list_transforms,
    load_registry,
    load_transforms_registry,
)
from dataset.scanner import scan_audio_folder, scan_csv, scan_text_file, smart_scan
from dataset.transform_factory import build_transforms, get_transform_catalog
from dataset.validator import validate_dataset_config
from schemas import (
    CustomDatasetConfig,
    DataLoaderConfig,
    ImageFolderDatasetConfig,
    PredefinedDatasetConfig,
    TransformConfig,
)

# ---------------------------------------------------------------------------
# registry.py — expanded
# ---------------------------------------------------------------------------


def test_load_registry_has_more_datasets():
    """Registry should now have more than the original 2 datasets."""
    registry = load_registry()
    assert len(registry) >= 6
    assert "MNIST" in registry
    assert "CIFAR10" in registry
    assert "FashionMNIST" in registry
    assert "CIFAR100" in registry


def test_registry_entries_have_ui_metadata():
    """Each registry entry should have description, tags, and modality."""
    registry = load_registry()
    for name, config in registry.items():
        assert "description" in config, f"{name} missing 'description'"
        assert "tags" in config, f"{name} missing 'tags'"
        assert "modality" in config, f"{name} missing 'modality'"


def test_get_dataset_metadata():
    """get_dataset_metadata returns the full entry for a dataset."""
    meta = get_dataset_metadata("MNIST")
    assert meta["shape"] == [1, 28, 28]
    assert meta["num_classes"] == 10
    assert "description" in meta


def test_get_dataset_metadata_unknown():
    """get_dataset_metadata raises for unknown dataset."""
    with pytest.raises(ValueError, match="not found"):
        get_dataset_metadata("NonExistentDataset")


def test_load_transforms_registry():
    """Transforms registry should load and have entries."""
    reg = load_transforms_registry()
    assert isinstance(reg, dict)
    assert "Resize" in reg
    assert "ToTensor" in reg
    assert "Normalize" in reg


def test_list_transforms():
    """list_transforms returns a list of transform names."""
    transforms = list_transforms()
    assert isinstance(transforms, list)
    assert len(transforms) >= 5
    assert "Resize" in transforms


# ---------------------------------------------------------------------------
# transform_factory.py — expanded
# ---------------------------------------------------------------------------


def test_build_transforms_center_crop():
    """CenterCrop should be buildable from the factory."""
    from torchvision import transforms as T

    result = build_transforms([{"type": "CenterCrop", "size": 224}])
    assert any(isinstance(t, T.CenterCrop) for t in result.transforms)


def test_build_transforms_color_jitter():
    """ColorJitter should be buildable from the factory."""
    from torchvision import transforms as T

    result = build_transforms([{"type": "ColorJitter", "brightness": 0.2}])
    assert any(isinstance(t, T.ColorJitter) for t in result.transforms)


def test_build_transforms_grayscale():
    """Grayscale should be buildable from the factory."""
    from torchvision import transforms as T

    result = build_transforms([{"type": "Grayscale"}])
    assert any(isinstance(t, T.Grayscale) for t in result.transforms)


def test_get_transform_catalog():
    """get_transform_catalog returns a list of catalog entries."""
    catalog = get_transform_catalog()
    assert isinstance(catalog, list)
    assert len(catalog) >= 5

    # Each entry should have required keys
    for entry in catalog:
        assert "name" in entry
        assert "params" in entry
        assert "category" in entry
        assert "description" in entry


def test_get_transform_catalog_includes_all_map_entries():
    """Every entry in TRANSFORM_MAP should appear in the catalog."""
    from dataset.transform_factory import TRANSFORM_MAP

    catalog = get_transform_catalog()
    catalog_names = {e["name"] for e in catalog}
    for name in TRANSFORM_MAP:
        assert name in catalog_names, f"{name} missing from catalog"


# ---------------------------------------------------------------------------
# scanner.py — expanded
# ---------------------------------------------------------------------------


def test_scan_csv(tmp_path):
    """scan_csv returns column info and row count."""
    import pandas as pd

    csv_path = tmp_path / "data.csv"
    df = pd.DataFrame({"a": [1, 2, 3], "b": ["x", "y", "z"]})
    df.to_csv(csv_path, index=False)

    result = scan_csv(str(csv_path))
    assert "columns" in result
    assert "num_rows" in result
    assert "dtypes" in result
    assert result["num_rows"] == 3
    assert set(result["columns"]) == {"a", "b"}


def test_scan_csv_missing_file():
    """scan_csv raises for missing file."""
    with pytest.raises(ValueError, match="does not exist"):
        scan_csv("/nonexistent/file.csv")


def test_scan_text_file_csv(tmp_path):
    """scan_text_file handles CSV files."""
    import pandas as pd

    csv_path = tmp_path / "text.csv"
    df = pd.DataFrame({"review": ["hello", "world"], "label": [0, 1]})
    df.to_csv(csv_path, index=False)

    result = scan_text_file(str(csv_path))
    assert "columns" in result
    assert result["num_rows"] == 2


def test_scan_text_file_plain(tmp_path):
    """scan_text_file handles plain text files."""
    txt_path = tmp_path / "data.txt"
    txt_path.write_text("line1\nline2\nline3\n")

    result = scan_text_file(str(txt_path))
    assert result["num_rows"] == 3
    assert len(result["text_preview"]) == 3


def test_scan_audio_folder(tmp_path):
    """scan_audio_folder detects class folders and audio files."""
    cls_dir = tmp_path / "speech"
    cls_dir.mkdir()
    (cls_dir / "file1.wav").write_bytes(b"")
    (cls_dir / "file2.mp3").write_bytes(b"")
    (cls_dir / "readme.txt").write_bytes(b"")

    result = scan_audio_folder(str(tmp_path))
    assert "speech" in result["classes"]
    assert result["total_files"] == 2
    assert ".wav" in result["extensions_found"]


def test_scan_audio_folder_missing():
    """scan_audio_folder raises for missing directory."""
    with pytest.raises(ValueError, match="does not exist"):
        scan_audio_folder("/nonexistent/path")


def test_smart_scan_image_folder(tmp_path):
    """smart_scan auto-detects image folder."""
    (tmp_path / "cat").mkdir()
    (tmp_path / "cat" / "img.jpg").write_bytes(b"")
    result = smart_scan(str(tmp_path))
    assert "classes" in result


def test_smart_scan_csv_file(tmp_path):
    """smart_scan auto-detects CSV file."""
    import pandas as pd

    csv_path = tmp_path / "data.csv"
    pd.DataFrame({"x": [1]}).to_csv(csv_path, index=False)
    result = smart_scan(str(csv_path))
    assert "columns" in result


def test_smart_scan_with_modality_hint(tmp_path):
    """smart_scan uses modality hint when provided."""
    (tmp_path / "cat").mkdir()
    result = smart_scan(str(tmp_path), modality="image")
    assert "classes" in result


# ---------------------------------------------------------------------------
# dataloader.py — expanded
# ---------------------------------------------------------------------------


def test_create_dataloader_from_config():
    """create_dataloader_from_config creates a DataLoader from schema."""
    config = DataLoaderConfig(batch_size=4, shuffle=False, num_workers=0)
    x = torch.randn(8, 3)
    y = torch.randint(0, 2, (8,))
    ds = TensorDataset(x, y)

    loader = create_dataloader_from_config(ds, config)
    batch_x, batch_y = next(iter(loader))
    assert batch_x.shape[0] == 4


def test_split_dataset():
    """split_dataset produces correct split sizes."""
    x = torch.randn(100, 3)
    y = torch.randint(0, 2, (100,))
    ds = TensorDataset(x, y)

    train, val = split_dataset(ds, split_ratio=0.8)
    assert len(train) == 80
    assert len(val) == 20


def test_split_dataset_custom_ratio():
    """split_dataset respects custom ratio."""
    x = torch.randn(50, 3)
    y = torch.randint(0, 2, (50,))
    ds = TensorDataset(x, y)

    train, val = split_dataset(ds, split_ratio=0.6)
    assert len(train) == 30
    assert len(val) == 20


# ---------------------------------------------------------------------------
# validator.py
# ---------------------------------------------------------------------------


def test_validate_predefined_valid():
    """Valid predefined config should pass validation."""
    config = PredefinedDatasetConfig(source="predefined", name="MNIST", split="train")
    result = validate_dataset_config(config)
    assert result["valid"] is True
    assert len(result["errors"]) == 0


def test_validate_predefined_unknown_dataset():
    """Unknown dataset name should produce an error."""
    config = PredefinedDatasetConfig(
        source="predefined", name="FakeDataset", split="train"
    )
    result = validate_dataset_config(config)
    assert result["valid"] is False
    assert any("not found" in e for e in result["errors"])


def test_validate_predefined_invalid_split():
    """Invalid split should produce an error."""
    config = PredefinedDatasetConfig(
        source="predefined", name="MNIST", split="validate"
    )
    result = validate_dataset_config(config)
    assert result["valid"] is False
    assert any("split" in e.lower() for e in result["errors"])


def test_validate_image_folder_missing_root():
    """Missing root path should produce a warning (not error — user may still be configuring)."""
    config = ImageFolderDatasetConfig(source="image_folder", root="/nonexistent/path")
    result = validate_dataset_config(config)
    assert len(result["warnings"]) > 0


def test_validate_image_folder_no_subdirs(tmp_path):
    """Image folder with no class subdirs should produce an error."""
    config = ImageFolderDatasetConfig(source="image_folder", root=str(tmp_path))
    result = validate_dataset_config(config)
    assert result["valid"] is False
    assert any("subfolder" in e.lower() for e in result["errors"])


def test_validate_custom_text_missing_file():
    """Custom text without file_path should produce an error."""
    config = CustomDatasetConfig(source="custom", modality="text")
    result = validate_dataset_config(config)
    assert result["valid"] is False
    assert any("file_path" in e for e in result["errors"])


def test_validate_custom_tabular_missing_file():
    """Custom tabular without file_path should produce an error."""
    config = CustomDatasetConfig(source="custom", modality="tabular")
    result = validate_dataset_config(config)
    assert result["valid"] is False
    assert any("file_path" in e for e in result["errors"])


def test_validate_custom_audio_missing_root():
    """Custom audio without root should produce an error."""
    config = CustomDatasetConfig(source="custom", modality="audio")
    result = validate_dataset_config(config)
    assert result["valid"] is False
    assert any("root" in e for e in result["errors"])


def test_validate_transforms_missing_to_tensor_warning():
    """Image dataset with transforms but no ToTensor should warn."""
    config = PredefinedDatasetConfig(
        source="predefined",
        name="MNIST",
        split="train",
        transforms=[TransformConfig.model_validate({"type": "Resize", "size": 224})],
    )
    result = validate_dataset_config(config)
    assert any("ToTensor" in w for w in result["warnings"])


def test_validate_custom_image_csv_missing_label_file():
    """Custom image with CSV source but no label_file should produce an error."""
    config = CustomDatasetConfig(
        source="custom",
        modality="image",
        label_source="csv",
    )
    result = validate_dataset_config(config)
    assert result["valid"] is False
    assert any("label_file" in e for e in result["errors"])
