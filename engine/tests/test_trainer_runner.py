import asyncio
import time
from unittest.mock import patch

import pytest
import torch
import torch.utils.data as data

from schemas import TrainingConfig
from training.runner import TrainingRunner


@pytest.fixture
def dummy_dataset():
    # 100 samples, 10 inputs, classification target (0 or 1)
    x = torch.randn(100, 10)
    y = torch.randint(0, 2, (100,))
    return data.TensorDataset(x, y)


@pytest.fixture
def training_config():
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

    loss = {"type": "CrossEntropyLoss", "params": {}}
    optimizer = {"type": "Adam", "params": {"lr": 0.01}}
    training = {
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
    }

    return TrainingConfig.model_validate(
        {
            "dataset_config": dataset_config,
            "model_graph": graph_data,
            "loss": loss,
            "optimizer": optimizer,
            "training": training,
        }
    )


@pytest.mark.anyio
async def test_training_runner_success(training_config, dummy_dataset):
    runner = TrainingRunner()

    with patch("training.runner.get_dataset_from_config") as mock_get_ds:
        mock_get_ds.return_value = dummy_dataset

        # Start background run
        run_id = runner.start_run(training_config)
        assert run_id is not None

        # Verify state exists
        trainer = runner.get_trainer(run_id)
        queue = runner.get_queue(run_id)
        assert trainer is not None
        assert queue is not None

        # Collect event messages from the queue
        events = []
        start_time = time.time()
        while time.time() - start_time < 5.0:
            if not queue.empty():
                msg = await queue.get()
                events.append(msg)
                if msg["type"] == "training_complete":
                    break
            await asyncio.sleep(0.05)

        # Assert correct messages were streamed
        assert len(events) > 0
        step_events = [e for e in events if e["type"] == "step_metrics"]
        epoch_events = [e for e in events if e["type"] == "epoch_metrics"]
        complete_events = [e for e in events if e["type"] == "training_complete"]

        assert len(step_events) > 0
        assert len(epoch_events) == 2  # epochs=2
        assert len(complete_events) == 1

        assert trainer.status == "completed"
        runner.cleanup_run(run_id)


@pytest.mark.anyio
async def test_training_runner_pause_resume_stop(training_config, dummy_dataset):
    runner = TrainingRunner()
    # Set high epoch count to keep it running
    training_config.training.epochs = 50

    with patch("training.runner.get_dataset_from_config") as mock_get_ds:
        mock_get_ds.return_value = dummy_dataset

        run_id = runner.start_run(training_config)
        trainer = runner.get_trainer(run_id)
        assert trainer.status == "running"

        # Pause
        assert runner.pause_run(run_id)
        # Give thread time to check flag
        await asyncio.sleep(0.2)
        assert trainer.status == "paused"

        # Resume
        assert runner.resume_run(run_id)
        await asyncio.sleep(0.2)
        assert trainer.status == "running"

        # Stop
        assert runner.stop_run(run_id)
        await asyncio.sleep(0.2)
        assert trainer.status == "stopped"

        runner.cleanup_run(run_id)


def test_device_fallback(training_config, dummy_dataset):
    runner = TrainingRunner()
    # Request cuda when cuda is not available
    training_config.training.device = "cuda"

    with patch("training.runner.get_dataset_from_config") as mock_get_ds, patch(
        "torch.cuda.is_available"
    ) as mock_cuda:
        mock_get_ds.return_value = dummy_dataset
        mock_cuda.return_value = False  # mock CUDA unavailable

        # This should log warning and fallback to CPU without error
        run_id = runner.start_run(training_config)
        trainer = runner.get_trainer(run_id)
        assert trainer.device.type == "cpu"

        runner.stop_run(run_id)
        runner.cleanup_run(run_id)
