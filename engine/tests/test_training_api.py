import asyncio
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from main import app, runner


@pytest.fixture
def client():
    return TestClient(app)


def test_start_training_api_success(client):
    # Construct a simple request payload
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

    dataset_config = {
        "source": "predefined",
        "name": "MNIST",
        "root_dir": "./data",
        "batch_size": 16,
        "split": "train",
    }

    payload = {
        "dataset_config": dataset_config,
        "model_graph": graph_data,
        "loss": {"type": "CrossEntropyLoss", "params": {}},
        "optimizer": {"type": "Adam", "params": {"lr": 0.01}},
        "training": {
            "epochs": 2,
            "device": "cpu",
            "mixed_precision": False,
            "gradient_clip_norm": 1.0,
            "gradient_accumulation_steps": 1,
            "validation_frequency": 1,
            "early_stopping": {"enabled": False},
            "checkpointing": {
                "save_best": False,
                "save_every_n_epochs": 0,
                "directory": "tests/data/checkpoints",
            },
        },
    }

    with patch.object(runner, "start_run", return_value="test-run-123") as mock_start:
        response = client.post("/training/start", json=payload)
        assert response.status_code == 200
        assert response.json() == {"run_id": "test-run-123"}
        mock_start.assert_called_once()


def test_control_training_api_success(client):
    with patch.object(runner, "pause_run", return_value=True) as mock_pause:
        response = client.post(
            "/training/control/test-run-123", json={"action": "pause"}
        )
        assert response.status_code == 200
        assert response.json() == {"status": "success", "action": "pause"}
        mock_pause.assert_called_once_with("test-run-123")


def test_get_training_status_api_success(client):
    # Setup mock trainer
    mock_trainer = MagicMock()
    mock_trainer.status = "running"
    mock_trainer.current_epoch = 2
    mock_trainer.total_epochs = 10
    mock_trainer.latest_metrics = {"train_loss": 0.25}

    with patch.object(runner, "get_trainer", return_value=mock_trainer) as mock_get:
        response = client.get("/training/status/test-run-123")
        assert response.status_code == 200
        data = response.json()
        assert data["run_id"] == "test-run-123"
        assert data["status"] == "running"
        assert data["current_epoch"] == 2
        assert data["total_epochs"] == 10
        assert data["latest_metrics"] == {"train_loss": 0.25}
        mock_get.assert_called_once_with("test-run-123")


@pytest.mark.anyio
async def test_stream_training_api_success():
    # SSE testing using async client
    from httpx import ASGITransport, AsyncClient

    from training.event_bus import EventBus

    # Create an EventBus pre-loaded with events
    loop = asyncio.get_running_loop()
    event_bus = EventBus("test-run-123", loop)
    event_bus.push({"type": "step_metrics", "step": 1, "metrics": {"loss": 0.5}})
    event_bus.push({"type": "training_complete", "best_epoch": 1, "best_val_loss": 0.5})
    event_bus.mark_finished()

    with (
        patch.object(runner, "get_event_bus", return_value=event_bus),
        patch.object(runner, "get_trainer", return_value=None),
        patch.object(runner, "cleanup_run"),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.get("/training/stream/test-run-123")
            assert response.status_code == 200

            # Read streaming response lines
            lines = []
            async for line in response.aiter_lines():
                if line:
                    lines.append(line)

            assert len(lines) >= 4
            assert "event: step_metrics" in lines[0]
            assert "data:" in lines[1]
            assert "event: training_complete" in lines[2]
            assert "data:" in lines[3]
