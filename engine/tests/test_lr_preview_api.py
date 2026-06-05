import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_preview_lr_schedule_cosine(client):
    payload = {
        "optimizer": "Adam",
        "optimizer_params": {"lr": 0.01},
        "scheduler": "CosineAnnealingLR",
        "scheduler_params": {"T_max": 10},
        "total_steps": 10,
    }
    response = client.post("/optimizer/preview_lr_schedule", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "schedule" in data
    schedule = data["schedule"]
    assert len(schedule) == 10
    assert schedule[0] == [0.0, 0.01]
    # Cosine annealing should decrease LR over steps
    assert schedule[-1][1] < 0.01


def test_preview_lr_schedule_one_cycle(client):
    payload = {
        "optimizer": "SGD",
        "optimizer_params": {"lr": 0.01},
        "scheduler": "OneCycleLR",
        "scheduler_params": {"max_lr": 0.1, "total_steps": 10},
        "total_steps": 10,
    }
    response = client.post("/optimizer/preview_lr_schedule", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "schedule" in data
    schedule = data["schedule"]
    assert len(schedule) == 10
    # OneCycleLR starts low, increases to max_lr, then decreases
    lrs = [item[1] for item in schedule]
    assert max(lrs) > 0.01


def test_preview_lr_schedule_reduce_on_plateau(client):
    payload = {
        "optimizer": "Adam",
        "optimizer_params": {"lr": 0.01},
        "scheduler": "ReduceLROnPlateau",
        "scheduler_params": {"patience": 2, "factor": 0.5},
        "total_steps": 10,
    }
    response = client.post("/optimizer/preview_lr_schedule", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "schedule" in data
    schedule = data["schedule"]
    assert len(schedule) == 10
    # ReduceLROnPlateau should decrease LR once patience of constant simulated loss is exceeded
    lrs = [item[1] for item in schedule]
    assert lrs[-1] < 0.01
