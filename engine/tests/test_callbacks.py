import os
import shutil
import pytest
import torch
import torch.nn as nn
import torch.optim as optim
from schemas import CheckpointingConfig, EarlyStoppingConfig
from training.callbacks import Checkpointing, EarlyStopping


@pytest.fixture
def dummy_setup():
    model = nn.Linear(5, 1)
    optimizer = optim.SGD(model.parameters(), lr=0.1)
    return model, optimizer


@pytest.fixture
def clean_checkpoints_dir():
    # Make sure we use a temporary directory under engine/tests/data/checkpoints/
    test_dir = os.path.join("tests", "data", "checkpoints")
    if os.path.exists(test_dir):
        shutil.rmtree(test_dir)
    yield test_dir
    if os.path.exists(test_dir):
        shutil.rmtree(test_dir)


def test_early_stopping_disabled():
    config = EarlyStoppingConfig(enabled=False, patience=2, monitor="val_loss")
    es = EarlyStopping(config)
    assert not es.step({"val_loss": 1.0})
    assert not es.step({"val_loss": 1.1})
    assert not es.step({"val_loss": 1.2})
    assert not es.should_stop


def test_early_stopping_min_mode():
    # val_loss -> min mode
    config = EarlyStoppingConfig(
        enabled=True, patience=2, monitor="val_loss", mode="min"
    )
    es = EarlyStopping(config)

    assert not es.step({"val_loss": 0.5})  # best becomes 0.5, wait = 0
    assert not es.step({"val_loss": 0.6})  # no improvement, wait = 1
    assert es.step({"val_loss": 0.7})  # no improvement, wait = 2 -> stop!
    assert es.should_stop


def test_early_stopping_max_mode():
    # val_accuracy -> max mode
    config = EarlyStoppingConfig(
        enabled=True, patience=2, monitor="val_accuracy", mode="max"
    )
    es = EarlyStopping(config)

    assert not es.step({"val_accuracy": 80.0})  # best = 80.0, wait = 0
    assert not es.step({"val_accuracy": 79.0})  # wait = 1
    assert es.step({"val_accuracy": 78.0})  # wait = 2 -> stop!
    assert es.should_stop


def test_early_stopping_auto_mode():
    # Test auto detection of mode from metric names
    config_loss = EarlyStoppingConfig(
        enabled=True, patience=2, monitor="loss", mode="auto"
    )
    es_loss = EarlyStopping(config_loss)
    assert es_loss.mode == "min"

    config_acc = EarlyStoppingConfig(
        enabled=True, patience=2, monitor="accuracy", mode="auto"
    )
    es_acc = EarlyStopping(config_acc)
    assert es_acc.mode == "max"


def test_checkpointing_save_best(dummy_setup, clean_checkpoints_dir):
    model, optimizer = dummy_setup
    config = CheckpointingConfig(
        save_best=True,
        save_every_n_epochs=0,
        monitor="val_loss",
        directory=clean_checkpoints_dir,
    )
    checkpointing = Checkpointing(config)

    # First epoch, metric is 0.5 -> saves best.pt
    path1 = checkpointing.step(1, model, optimizer, {"val_loss": 0.5})
    assert path1 is not None
    assert os.path.exists(path1)
    assert path1.endswith("best.pt")

    # Second epoch, no improvement (0.6) -> does not save
    path2 = checkpointing.step(2, model, optimizer, {"val_loss": 0.6})
    assert path2 is None

    # Third epoch, improvement (0.4) -> saves best.pt
    path3 = checkpointing.step(3, model, optimizer, {"val_loss": 0.4})
    assert path3 is not None
    assert os.path.exists(path3)

    # Load and verify content
    loaded = torch.load(path3)
    assert loaded["epoch"] == 3
    assert "model_state_dict" in loaded
    assert "optimizer_state_dict" in loaded
    assert loaded["metrics"]["val_loss"] == 0.4


def test_checkpointing_periodic(dummy_setup, clean_checkpoints_dir):
    model, optimizer = dummy_setup
    config = CheckpointingConfig(
        save_best=False,
        save_every_n_epochs=3,
        monitor="val_loss",
        directory=clean_checkpoints_dir,
    )
    checkpointing = Checkpointing(config)

    # Epoch 1 -> no periodic save
    assert checkpointing.step(1, model, optimizer, {"val_loss": 0.5}) is None
    # Epoch 2 -> no periodic save
    assert checkpointing.step(2, model, optimizer, {"val_loss": 0.5}) is None
    # Epoch 3 -> saves periodic checkpoint epoch_3.pt
    path = checkpointing.step(3, model, optimizer, {"val_loss": 0.5})
    assert path is not None
    assert os.path.exists(path)
    assert path.endswith("epoch_3.pt")
