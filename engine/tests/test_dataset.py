"""
Tests for the engine/dataset module:
  - registry loading and path resolution
  - list_predefined_datasets returns a list
  - transform factory: flat schema, nested params, and unsupported type
  - scanner: non-directory input, image-extension filtering, path normalisation
  - dataset_factory: unsupported dataset name, split parameter
"""

import os
import tempfile

import pytest

from dataset.registry import list_predefined_datasets, load_registry
from dataset.transform_factory import build_transforms
from dataset.scanner import scan_folder


# ---------------------------------------------------------------------------
# registry.py
# ---------------------------------------------------------------------------


def test_load_registry_returns_dict():
    registry = load_registry()
    assert isinstance(registry, dict)
    assert len(registry) > 0


def test_list_predefined_datasets_returns_list():
    datasets = list_predefined_datasets()
    assert isinstance(datasets, list)
    assert "MNIST" in datasets
    assert "CIFAR10" in datasets


def test_registry_contains_required_keys():
    registry = load_registry()
    for name, config in registry.items():
        assert "module" in config, f"{name} missing 'module'"
        assert "class" in config, f"{name} missing 'class'"


# ---------------------------------------------------------------------------
# transform_factory.py
# ---------------------------------------------------------------------------


def test_build_transforms_flat_schema():
    """Flat schema: params are fields alongside 'type'."""
    transforms = build_transforms([{"type": "ToTensor"}])
    # Should compose without error and return a Compose object
    from torchvision import transforms as T

    assert hasattr(transforms, "transforms")
    assert any(isinstance(t, T.ToTensor) for t in transforms.transforms)


def test_build_transforms_nested_params():
    """Legacy nested params schema should still work."""
    from torchvision import transforms as T

    result = build_transforms([{"type": "Resize", "params": {"size": 64}}])
    assert any(isinstance(t, T.Resize) for t in result.transforms)


def test_build_transforms_flat_with_param():
    """Flat schema with an actual parameter."""
    from torchvision import transforms as T

    result = build_transforms([{"type": "Resize", "size": 64}])
    assert any(isinstance(t, T.Resize) for t in result.transforms)


def test_build_transforms_unsupported_type():
    with pytest.raises(ValueError, match="not supported"):
        build_transforms([{"type": "NonExistentTransform"}])


# ---------------------------------------------------------------------------
# scanner.py
# ---------------------------------------------------------------------------


def test_scan_folder_raises_on_non_directory():
    with pytest.raises(ValueError):
        scan_folder("/tmp/this_path_does_not_exist_xyz")


def test_scan_folder_raises_on_file(tmp_path):
    f = tmp_path / "file.txt"
    f.write_text("hello")
    with pytest.raises(ValueError):
        scan_folder(str(f))


def test_scan_folder_detects_classes(tmp_path):
    (tmp_path / "cat").mkdir()
    (tmp_path / "dog").mkdir()
    result = scan_folder(str(tmp_path))
    assert set(result["classes"]) == {"cat", "dog"}
    assert result["num_classes"] == 2


def test_scan_folder_counts_only_images(tmp_path):
    cls_dir = tmp_path / "cat"
    cls_dir.mkdir()
    (cls_dir / "img1.jpg").write_bytes(b"")
    (cls_dir / "img2.png").write_bytes(b"")
    (cls_dir / "meta.json").write_bytes(b"")  # not an image
    result = scan_folder(str(tmp_path))
    assert result["total_images"] == 2


def test_scan_folder_normalises_path(tmp_path):
    """Trailing slash should not break class detection."""
    (tmp_path / "class_a").mkdir()
    result = scan_folder(str(tmp_path) + os.sep)
    assert "class_a" in result["classes"]


# ---------------------------------------------------------------------------
# dataset_factory.py
# ---------------------------------------------------------------------------


def test_get_dataset_unsupported_name():
    from dataset.dataset_factory import get_dataset

    with pytest.raises(ValueError, match="not supported"):
        get_dataset("NonExistentDataset", "/tmp")
