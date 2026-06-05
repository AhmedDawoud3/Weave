import os

import pytest
import torch
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def dummy_checkpoint(tmp_path):
    # Create a compiled dummy model and save state_dict
    from compiler.compiler import GraphCompiler

    graph_data = {
        "nodes": [
            {
                "id": "fc1",
                "type": "Linear",
                "params": {"in_features": 10, "out_features": 2},
            }
        ],
        "edges": [
            {"source": "input", "target": "fc1"},
            {"source": "fc1", "target": "output"},
        ],
    }
    compiler = GraphCompiler()
    model = compiler.compile(graph_data)

    checkpoint_dir = tmp_path / "checkpoints"
    checkpoint_dir.mkdir()
    checkpoint_path = checkpoint_dir / "best.pt"

    # Save state dict
    state = {
        "epoch": 5,
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": {},
        "metrics": {"val_loss": 0.3},
    }
    torch.save(state, checkpoint_path)
    return str(checkpoint_path)


def test_export_endpoints_success(client, dummy_checkpoint, tmp_path):
    graph_data = {
        "nodes": [
            {
                "id": "fc1",
                "type": "Linear",
                "params": {"in_features": 10, "out_features": 2},
            }
        ],
        "edges": [
            {"source": "input", "target": "fc1"},
            {"source": "fc1", "target": "output"},
        ],
    }

    # 1. Export PyTorch
    py_output = str(tmp_path / "model.pt")
    payload = {
        "graph": graph_data,
        "input_shape": [1, 10],
        "checkpoint_path": dummy_checkpoint,
        "output_path": py_output,
    }
    response = client.post("/export/pytorch", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert os.path.exists(py_output)
    # Check loaded weights
    loaded = torch.load(py_output, map_location="cpu")
    assert "operations.fc1.weight" in loaded

    # 2. Export ONNX
    onnx_output = str(tmp_path / "model.onnx")
    payload["output_path"] = onnx_output
    response = client.post("/export/onnx", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert os.path.exists(onnx_output)

    # 3. Export TorchScript
    ts_output = str(tmp_path / "model.ts")
    payload["output_path"] = ts_output
    response = client.post("/export/torchscript", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert os.path.exists(ts_output)


def test_export_invalid_checkpoint_returns_error(client, tmp_path):
    graph_data = {
        "nodes": [
            {
                "id": "fc1",
                "type": "Linear",
                "params": {"in_features": 10, "out_features": 2},
            }
        ],
        "edges": [
            {"source": "input", "target": "fc1"},
            {"source": "fc1", "target": "output"},
        ],
    }

    py_output = str(tmp_path / "model.pt")
    payload = {
        "graph": graph_data,
        "input_shape": [1, 10],
        "checkpoint_path": "/nonexistent/path/best.pt",
        "output_path": py_output,
    }
    response = client.post("/export/pytorch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert "Failed to load checkpoint" in data["message"]
