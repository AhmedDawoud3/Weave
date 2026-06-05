import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_suggest_metrics_classification(client):
    payload = {"task_type": "classification", "num_classes": 10}
    response = client.post("/metrics/suggest", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["suggested"] == ["Accuracy", "F1Score", "ConfusionMatrix"]


def test_suggest_metrics_regression(client):
    payload = {"task_type": "regression"}
    response = client.post("/metrics/suggest", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["suggested"] == ["MSE", "MAE", "R2Score"]


def test_suggest_metrics_multi_label(client):
    payload = {"task_type": "multi_label"}
    response = client.post("/metrics/suggest", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["suggested"] == ["Accuracy", "F1Score", "Precision", "Recall"]
