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
    metrics = {"loss": float(loss_val)}
    import math

    # Calculate perplexity only for 3D sequence outputs or language modeling tasks
    if outputs.dim() >= 3 or task_type in ("text", "lm", "language_modeling"):
        try:
            metrics["perplexity"] = float(math.exp(min(loss_val, 20.0)))
        except (OverflowError, ValueError):
            metrics["perplexity"] = float("inf")

    with torch.no_grad():
        if task_type == "classification":
            if outputs.dim() == 3 and targets.dim() == 1:
                outputs = outputs.mean(dim=1)
            preds = outputs.argmax(dim=-1)
            if targets.dim() > 1 and preds.dim() != targets.dim():
                targets = targets.view(-1)
                preds = preds.view(-1)
            acc = (preds == targets).float().mean().item() * 100.0
            metrics["accuracy"] = float(acc)
        elif task_type == "multi_label":
            if outputs.dim() == 3 and targets.dim() == 1:
                outputs = outputs.mean(dim=1)
            is_logit = torch.any(outputs < 0.0) or torch.any(outputs > 1.0)
            preds = (
                (outputs > 0.0).float()
                if is_logit
                else (outputs > 0.5).float()
            )
            acc = (preds == targets.float()).float().mean().item() * 100.0
            metrics["accuracy"] = float(acc)
        elif task_type == "regression":
            if outputs.dim() == 3 and targets.dim() < 3:
                outputs = outputs.mean(dim=1)
            mse = torch.mean((outputs - targets) ** 2).item()
            mae = torch.mean(torch.abs(outputs - targets)).item()
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
