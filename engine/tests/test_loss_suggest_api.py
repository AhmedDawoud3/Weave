import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_suggest_loss_classification_none(client):
    payload = {
        "output_shape": [32, 10],
        "final_activation": "none",
        "task_type": "classification",
    }
    response = client.post("/loss/suggest", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["suggested"] == "CrossEntropyLoss"
    assert "NLLLoss" in data["alternatives"]


def test_suggest_loss_classification_log_softmax(client):
    payload = {
        "output_shape": [32, 10],
        "final_activation": "log_softmax",
        "task_type": "classification",
    }
    response = client.post("/loss/suggest", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["suggested"] == "NLLLoss"
    assert "CrossEntropyLoss" in data["alternatives"]


def test_suggest_loss_multi_label(client):
    payload = {
        "output_shape": [32, 5],
        "final_activation": "sigmoid",
        "task_type": "multi_label",
    }
    response = client.post("/loss/suggest", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["suggested"] == "BCEWithLogitsLoss"
    assert "BCELoss" in data["alternatives"]


def test_suggest_loss_regression(client):
    payload = {
        "output_shape": [32, 1],
        "final_activation": "none",
        "task_type": "regression",
    }
    response = client.post("/loss/suggest", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["suggested"] == "MSELoss"
    assert "L1Loss" in data["alternatives"]
