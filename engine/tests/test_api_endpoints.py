"""
Tests for the new API endpoints:
  - GET /datasets/catalog
  - GET /transforms/catalog
  - POST /datasets/scan
  - POST /datasets/validate
"""

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    return TestClient(app)


# ---------------------------------------------------------------------------
# GET /datasets/catalog
# ---------------------------------------------------------------------------


def test_datasets_catalog_returns_list(client):
    """GET /datasets/catalog returns a list of dataset entries."""
    response = client.get("/datasets/catalog")
    assert response.status_code == 200

    data = response.json()
    assert "datasets" in data
    assert isinstance(data["datasets"], list)
    assert len(data["datasets"]) >= 6  # We added 7 datasets


def test_datasets_catalog_entry_structure(client):
    """Each catalog entry has the expected fields."""
    response = client.get("/datasets/catalog")
    data = response.json()

    for entry in data["datasets"]:
        assert "name" in entry
        assert "description" in entry
        assert "tags" in entry
        assert "modality" in entry


def test_datasets_catalog_includes_mnist(client):
    """Catalog should include MNIST with correct metadata."""
    response = client.get("/datasets/catalog")
    data = response.json()

    mnist = next(e for e in data["datasets"] if e["name"] == "MNIST")
    assert mnist["shape"] == [1, 28, 28]
    assert mnist["num_classes"] == 10
    assert "grayscale" in mnist["tags"]


# ---------------------------------------------------------------------------
# GET /transforms/catalog
# ---------------------------------------------------------------------------


def test_transforms_catalog_returns_list(client):
    """GET /transforms/catalog returns a list of transform entries."""
    response = client.get("/transforms/catalog")
    assert response.status_code == 200

    data = response.json()
    assert "transforms" in data
    assert isinstance(data["transforms"], list)
    assert len(data["transforms"]) >= 5


def test_transforms_catalog_entry_structure(client):
    """Each catalog entry has the expected fields."""
    response = client.get("/transforms/catalog")
    data = response.json()

    for entry in data["transforms"]:
        assert "name" in entry
        assert "params" in entry
        assert "category" in entry
        assert "description" in entry


def test_transforms_catalog_resize_has_params(client):
    """Resize entry should have a 'size' parameter."""
    response = client.get("/transforms/catalog")
    data = response.json()

    resize = next(e for e in data["transforms"] if e["name"] == "Resize")
    assert "size" in resize["params"]


# ---------------------------------------------------------------------------
# POST /datasets/scan
# ---------------------------------------------------------------------------


def test_datasets_scan_nonexistent_path(client):
    """Scanning a nonexistent path should return an error."""
    response = client.post(
        "/datasets/scan",
        json={"path": "/nonexistent/path", "modality": None},
    )
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "error"


def test_datasets_scan_with_modality(client, tmp_path):
    """Scanning with modality hint should work."""
    (tmp_path / "cat").mkdir()

    response = client.post(
        "/datasets/scan",
        json={"path": str(tmp_path), "modality": "image"},
    )
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "success"
    assert "classes" in data["result"]


# ---------------------------------------------------------------------------
# POST /datasets/validate
# ---------------------------------------------------------------------------


def test_datasets_validate_valid_config(client):
    """Validating a valid predefined config should return valid=True."""
    response = client.post(
        "/datasets/validate",
        json={
            "dataset_config": {
                "source": "predefined",
                "name": "MNIST",
                "split": "train",
            }
        },
    )
    assert response.status_code == 200

    data = response.json()
    assert data["valid"] is True
    assert len(data["errors"]) == 0


def test_datasets_validate_invalid_config(client):
    """Validating an invalid config should return valid=False with errors."""
    response = client.post(
        "/datasets/validate",
        json={
            "dataset_config": {
                "source": "predefined",
                "name": "FakeDataset",
                "split": "train",
            }
        },
    )
    assert response.status_code == 200

    data = response.json()
    assert data["valid"] is False
    assert len(data["errors"]) > 0


def test_datasets_validate_custom_text(client):
    """Validating custom text without file_path should return errors."""
    response = client.post(
        "/datasets/validate",
        json={
            "dataset_config": {
                "source": "custom",
                "modality": "text",
            }
        },
    )
    assert response.status_code == 200

    data = response.json()
    assert data["valid"] is False
    assert any("file_path" in e for e in data["errors"])
