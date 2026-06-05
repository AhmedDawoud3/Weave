import asyncio
import time
from unittest.mock import patch

import pytest
import torch
import torch.nn as nn
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
def dummy_loaders(dummy_dataset):
    """Creates train/val DataLoaders from the dummy dataset."""
    train_size = 80
    val_size = len(dummy_dataset) - train_size
    train_ds, val_ds = data.random_split(dummy_dataset, [train_size, val_size])
    train_loader = data.DataLoader(train_ds, batch_size=16, shuffle=True)
    val_loader = data.DataLoader(val_ds, batch_size=16, shuffle=False)
    return train_loader, val_loader


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


def _create_pre_configured_runner(
    training_config, dummy_loaders
) -> tuple[TrainingRunner, str]:
    """Helper that starts a run with pre-built model/loaders injected into the Trainer,
    bypassing the deferred setup in _run_loop."""
    runner = TrainingRunner()
    train_loader, val_loader = dummy_loaders

    # Build model and training components directly
    model = nn.Linear(10, 2)
    loss_fn = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    device = torch.device("cpu")

    loop = asyncio.get_running_loop()
    event_queue = asyncio.Queue()

    from training.trainer import Trainer

    trainer = Trainer(
        run_id="test-run",
        config=training_config,
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        optimizer=optimizer,
        loss_fn=loss_fn,
        scheduler=None,
        device=device,
        loop=loop,
        event_queue=event_queue,
    )

    run_id = "test-run"
    runner.active_runs[run_id] = trainer
    runner.event_queues[run_id] = event_queue

    return runner, run_id, trainer


@pytest.mark.anyio
async def test_training_runner_success(training_config, dummy_loaders):
    runner, run_id, trainer = _create_pre_configured_runner(
        training_config, dummy_loaders
    )
    queue = runner.get_queue(run_id)

    # Start the trainer thread
    trainer.start()

    # Collect event messages from the queue
    events = []
    start_time = time.time()
    while time.time() - start_time < 10.0:
        if not queue.empty():
            msg = await queue.get()
            events.append(msg)
            if msg["type"] in ("training_complete", "training_failed"):
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
async def test_training_runner_pause_resume_stop(training_config, dummy_loaders):
    # Set very high epoch count and use larger dataset to ensure training runs long enough
    training_config.training.epochs = 500

    # Create a larger dataset that takes longer per epoch
    large_x = torch.randn(1000, 10)
    large_y = torch.randint(0, 2, (1000,))
    large_ds = data.TensorDataset(large_x, large_y)
    train_ds, val_ds = data.random_split(large_ds, [800, 200])
    large_train_loader = data.DataLoader(train_ds, batch_size=16, shuffle=True)
    large_val_loader = data.DataLoader(val_ds, batch_size=16, shuffle=False)

    runner, run_id, trainer = _create_pre_configured_runner(
        training_config, (large_train_loader, large_val_loader)
    )

    # Start the trainer thread
    trainer.start()
    assert trainer.status == "running"

    # Give the thread time to begin processing
    await asyncio.sleep(0.3)

    # Pause
    assert runner.pause_run(run_id)
    await asyncio.sleep(0.3)
    assert trainer.status == "paused"

    # Resume
    assert runner.resume_run(run_id)
    await asyncio.sleep(0.3)
    assert trainer.status == "running"

    # Stop
    assert runner.stop_run(run_id)
    await asyncio.sleep(0.3)
    assert trainer.status == "stopped"

    runner.cleanup_run(run_id)


@pytest.mark.anyio
async def test_device_fallback(training_config, dummy_dataset):
    """Test that the trainer falls back to CPU when CUDA is unavailable."""
    runner = TrainingRunner()
    training_config.training.device = "cuda"

    with patch("torch.cuda.is_available", return_value=False):
        run_id = runner.start_run(training_config)
        trainer = runner.get_trainer(run_id)
        queue = runner.get_queue(run_id)

        # Wait for the trainer thread to set up and reach the device selection
        start_time = time.time()
        while time.time() - start_time < 10.0:
            if trainer.device is not None:
                break
            if not queue.empty():
                msg = await queue.get()
                if msg.get("type") == "training_failed":
                    break
            await asyncio.sleep(0.1)

        assert trainer.device is not None
        assert trainer.device.type == "cpu"

        runner.stop_run(run_id)
        await asyncio.sleep(0.2)
        runner.cleanup_run(run_id)
