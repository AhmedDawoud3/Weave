import pytest
import torch
from training.metrics import compute_batch_metrics, EpochMetricsTracker


def test_compute_batch_metrics_classification():
    outputs = torch.tensor([[2.0, 0.5, 0.1], [0.1, 3.0, 0.5]])  # argmax: 0, 1
    targets = torch.tensor([0, 1])  # 100% correct
    metrics = compute_batch_metrics(outputs, targets, 0.45, "classification")
    assert metrics["loss"] == 0.45
    assert metrics["accuracy"] == 100.0
    assert isinstance(metrics["accuracy"], float)

    targets_wrong = torch.tensor([1, 1])  # 50% correct
    metrics_wrong = compute_batch_metrics(
        outputs, targets_wrong, 1.2, "classification"
    )
    assert metrics_wrong["accuracy"] == 50.0


def test_compute_batch_metrics_multi_label():
    # Sigmoids or logits threshold tests
    # Let's pass logits
    outputs = torch.tensor([[1.5, -0.2], [-1.0, 2.0]])  # preds: [[1, 0], [0, 1]]
    targets = torch.tensor([[1.0, 0.0], [0.0, 1.0]])  # 100% match
    metrics = compute_batch_metrics(outputs, targets, 0.25, "multi_label")
    assert metrics["accuracy"] == 100.0

    targets_mixed = torch.tensor([[1.0, 1.0], [0.0, 1.0]])  # 3/4 correct = 75%
    metrics_mixed = compute_batch_metrics(
        outputs, targets_mixed, 0.5, "multi_label"
    )
    assert metrics_mixed["accuracy"] == 75.0


def test_compute_batch_metrics_regression():
    outputs = torch.tensor([[1.0, 2.0], [3.0, 4.0]])
    targets = torch.tensor([[1.5, 2.5], [2.5, 3.5]])
    # diffs: [[-0.5, -0.5], [0.5, 0.5]]
    # squared: 0.25 everywhere -> mean = 0.25
    # absolute: 0.5 everywhere -> mean = 0.5
    metrics = compute_batch_metrics(outputs, targets, 0.5, "regression")
    assert metrics["mse"] == 0.25
    assert metrics["mae"] == 0.5
    assert isinstance(metrics["mse"], float)
    assert isinstance(metrics["mae"], float)


def test_epoch_metrics_tracker():
    tracker = EpochMetricsTracker("classification")
    tracker.reset()

    tracker.update({"loss": 0.4, "accuracy": 80.0}, batch_size=10)
    tracker.update({"loss": 0.2, "accuracy": 90.0}, batch_size=20)

    epoch_metrics = tracker.get_epoch_metrics()
    # Total samples = 30
    # loss sum = 0.4*10 + 0.2*20 = 8.0 -> avg = 8.0/30 = 0.2666...
    # accuracy sum = 80.0*10 + 90.0*20 = 2600.0 -> avg = 2600.0/30 = 86.666...
    assert pytest.approx(epoch_metrics["loss"]) == 8.0 / 30.0
    assert pytest.approx(epoch_metrics["accuracy"]) == 2600.0 / 30.0
