import types
from typing import Any, cast

import torch
from torch.utils.data import TensorDataset
from torchvision import transforms as T

import dataset.dataset_factory as dataset_factory
from dataset.dataloader import create_dataloader
from dataset.registry import list_predefined_datasets
from dataset.scanner import scan_folder
from dataset.transform_factory import build_transforms


def test_list_predefined_datasets_includes_defaults():
    datasets = list_predefined_datasets()
    assert isinstance(datasets, list)
    assert "MNIST" in datasets


def test_build_transforms_creates_compose_pipeline():
    transform_json = [
        {"type": "Resize", "params": {"size": 128}},
        {"type": "ToTensor", "params": {}},
    ]

    pipeline = build_transforms(transform_json)

    assert isinstance(pipeline, T.Compose)
    assert isinstance(pipeline.transforms[0], T.Resize)
    assert isinstance(pipeline.transforms[1], T.ToTensor)


def test_get_dataset_uses_registry_and_split(monkeypatch, tmp_path):
    class DummyDataset:
        def __init__(self, root, transform=None, train=True, download=False):
            self.root = root
            self.transform = transform
            self.train = train
            self.download = download

    fake_registry = {
        "Dummy": {
            "module": "fake.datasets",
            "class": "DummyDataset",
            "default_params": {"train": True, "download": False},
        }
    }
    fake_module = types.SimpleNamespace(DummyDataset=DummyDataset)

    monkeypatch.setattr(dataset_factory, "load_registry", lambda: fake_registry)
    monkeypatch.setattr(
        dataset_factory.importlib, "import_module", lambda _: fake_module
    )

    transform = T.Compose([])
    dataset = cast(Any, dataset_factory.get_dataset(
        "Dummy", str(tmp_path), transform=transform, split="test"
    ))

    assert dataset.root == str(tmp_path)
    assert dataset.transform is transform
    assert dataset.train is False
    assert dataset.download is False


def test_create_dataloader_returns_expected_batch_shape():
    x = torch.randn(6, 3, 32, 32)
    y = torch.randint(0, 10, (6,))
    dataset = TensorDataset(x, y)

    loader = create_dataloader(dataset, batch_size=4, shuffle=False)
    batch_x, batch_y = next(iter(loader))

    assert list(batch_x.shape) == [4, 3, 32, 32]
    assert list(batch_y.shape) == [4]


def test_scan_folder_reports_classes_and_images(tmp_path):
    class_a = tmp_path / "class_a"
    class_b = tmp_path / "class_b"
    class_a.mkdir()
    class_b.mkdir()

    (class_a / "img1.jpg").write_bytes(b"")
    (class_a / "img2.png").write_bytes(b"")
    (class_b / "note.txt").write_text("not an image")

    result = scan_folder(str(tmp_path))

    assert set(result["classes"]) == {"class_a", "class_b"}
    assert result["num_classes"] == 2
    assert result["total_images"] == 2
