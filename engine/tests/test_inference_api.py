import pytest
import torch
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def classification_checkpoint(tmp_path):
    from compiler.compiler import GraphCompiler
    graph_data = {
        "nodes": [
            {
                "id": "fc1",
                "type": "Linear",
                "params": {"in_features": 10, "out_features": 3},
            }
        ],
        "edges": [
            {"source": "input", "target": "fc1"},
            {"source": "fc1", "target": "output"},
        ],
    }
    compiler = GraphCompiler()
    model = compiler.compile(graph_data)

    # Set weights to make a specific output high so argmax is deterministic
    with torch.no_grad():
        # Make node 2 have very high bias/weights
        model.operations["fc1"].weight.fill_(0.0)
        model.operations["fc1"].bias.fill_(0.0)
        model.operations["fc1"].bias[2] = 10.0

    checkpoint_dir = tmp_path / "checkpoints"
    checkpoint_dir.mkdir()
    checkpoint_path = checkpoint_dir / "best_clf.pt"

    state = {
        "model_state_dict": model.state_dict(),
    }
    torch.save(state, checkpoint_path)
    return str(checkpoint_path)


@pytest.fixture
def regression_checkpoint(tmp_path):
    from compiler.compiler import GraphCompiler
    graph_data = {
        "nodes": [
            {
                "id": "fc1",
                "type": "Linear",
                "params": {"in_features": 5, "out_features": 1},
            }
        ],
        "edges": [
            {"source": "input", "target": "fc1"},
            {"source": "fc1", "target": "output"},
        ],
    }
    compiler = GraphCompiler()
    model = compiler.compile(graph_data)

    # Set bias to a specific value
    with torch.no_grad():
        model.operations["fc1"].weight.fill_(0.0)
        model.operations["fc1"].bias.fill_(4.5)

    checkpoint_dir = tmp_path / "checkpoints"
    checkpoint_dir.mkdir()
    checkpoint_path = checkpoint_dir / "best_reg.pt"

    state = {
        "model_state_dict": model.state_dict(),
    }
    torch.save(state, checkpoint_path)
    return str(checkpoint_path)


def test_predict_classification_success(client, classification_checkpoint):
    graph_data = {
        "nodes": [
            {
                "id": "fc1",
                "type": "Linear",
                "params": {"in_features": 10, "out_features": 3},
            }
        ],
        "edges": [
            {"source": "input", "target": "fc1"},
            {"source": "fc1", "target": "output"},
        ],
    }
    payload = {
        "graph": graph_data,
        "checkpoint_path": classification_checkpoint,
        "input": [[1.0] * 10]
    }
    response = client.post("/inference/predict", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert "prediction" in res_data
    assert "predicted_class" in res_data
    assert len(res_data["prediction"]) == 3
    # Bias element 2 is 10.0, others are 0.0, so output should be [0.0, 0.0, 10.0]
    assert res_data["prediction"][2] == pytest.approx(10.0)
    assert res_data["predicted_class"] == 2


def test_predict_regression_success(client, regression_checkpoint):
    graph_data = {
        "nodes": [
            {
                "id": "fc1",
                "type": "Linear",
                "params": {"in_features": 5, "out_features": 1},
            }
        ],
        "edges": [
            {"source": "input", "target": "fc1"},
            {"source": "fc1", "target": "output"},
        ],
    }
    payload = {
        "graph": graph_data,
        "checkpoint_path": regression_checkpoint,
        "input": [[1.0] * 5]
    }
    response = client.post("/inference/predict", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert "prediction" in res_data
    assert "predicted_class" in res_data
    assert len(res_data["prediction"]) == 1
    assert res_data["prediction"][0] == pytest.approx(4.5)
    assert res_data["predicted_class"] is None


def test_predict_invalid_checkpoint(client):
    graph_data = {
        "nodes": [
            {
                "id": "fc1",
                "type": "Linear",
                "params": {"in_features": 10, "out_features": 3},
            }
        ],
        "edges": [
            {"source": "input", "target": "fc1"},
            {"source": "fc1", "target": "output"},
        ],
    }
    payload = {
        "graph": graph_data,
        "checkpoint_path": "nonexistent_checkpoint.pt",
        "input": [[1.0] * 10]
    }
    response = client.post("/inference/predict", json=payload)
    assert response.status_code == 400
    assert "detail" in response.json()
