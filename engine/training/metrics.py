"""
metrics.py — Metrics computation and aggregation.
==================================================
Calculates step and epoch-level loss, accuracy, and learning rates.
"""

import torch


def compute_batch_metrics(
    outputs: torch.Tensor,
    targets: torch.Tensor,
    loss_val: float,
    task_type: str,
) -> dict[str, float]:
    """Computes batch-level metrics based on task type.

    Args:
        outputs (torch.Tensor): Model predictions.
        targets (torch.Tensor): Ground truth labels.
        loss_val (float): Pre-computed loss value for the batch.
        task_type (str): Task type, one of "classification", "regression",
            "multi_label".

    Returns:
        Dict[str, float]: Batch-level metrics.
    """
    outputs_detached = outputs.detach().cpu()
    targets_detached = targets.detach().cpu()

    metrics = {"loss": float(loss_val)}

    if task_type == "classification":
        preds = outputs_detached.argmax(dim=1)
        acc = (preds == targets_detached).float().mean().item() * 100.0
        metrics["accuracy"] = float(acc)
    elif task_type == "multi_label":
        # Check if outputs are logits or probabilities
        is_logit = torch.any(outputs_detached < 0.0) or torch.any(
            outputs_detached > 1.0
        )
        preds = (
            (outputs_detached > 0.0).float()
            if is_logit
            else (outputs_detached > 0.5).float()
        )
        acc = (preds == targets_detached.float()).float().mean().item() * 100.0
        metrics["accuracy"] = float(acc)
    elif task_type == "regression":
        mse = torch.mean((outputs_detached - targets_detached) ** 2).item()
        mae = torch.mean(torch.abs(outputs_detached - targets_detached)).item()
        metrics["mse"] = float(mse)
        metrics["mae"] = float(mae)

    return metrics


class EpochMetricsTracker:
    """Tracks and aggregates batch-level metrics to compute epoch-level metrics."""

    def __init__(self, task_type: str):
        """Initializes the metrics tracker.

        Args:
            task_type (str): The task type ("classification", "regression", etc.)
        """
        self.task_type = task_type
        self.reset()

    def reset(self) -> None:
        """Resets the internal accumulators."""
        self.total_samples = 0
        self.metric_sums: dict[str, float] = {}

    def update(self, batch_metrics: dict[str, float], batch_size: int) -> None:
        """Updates internal accumulators with batch-level metrics.

        Args:
            batch_metrics (Dict[str, float]): Metrics from the current batch.
            batch_size (int): Number of samples in the current batch.
        """
        self.total_samples += batch_size
        for k, v in batch_metrics.items():
            self.metric_sums[k] = self.metric_sums.get(k, 0.0) + v * batch_size

    def get_epoch_metrics(self) -> dict[str, float]:
        """Computes the weighted average of accumulated metrics.

        Returns:
            Dict[str, float]: Epoch-level aggregated metrics.
        """
        if self.total_samples == 0:
            return {}
        return {k: v / self.total_samples for k, v in self.metric_sums.items()}
