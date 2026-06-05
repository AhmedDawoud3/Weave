"""
callbacks.py — Callbacks for checkpointing and early stopping.
==============================================================
Manages saving model states and early termination of training.
"""

import os

import torch
import torch.nn as nn
import torch.optim as optim

from schemas import CheckpointingConfig, EarlyStoppingConfig


class EarlyStopping:
    """Monitors a metric and signals when training should stop due to lack of improvement."""

    def __init__(self, config: EarlyStoppingConfig):
        """Initializes the EarlyStopping callback.

        Args:
            config (EarlyStoppingConfig): Early stopping configuration.
        """
        self.enabled = config.enabled
        self.patience = config.patience
        self.monitor = config.monitor
        self.mode = config.mode

        # Auto-detect mode if not min/max
        if self.mode not in ["min", "max"]:
            if "loss" in self.monitor.lower():
                self.mode = "min"
            else:
                self.mode = "max"

        self.best_metric = float("inf") if self.mode == "min" else float("-inf")
        self.wait = 0
        self.should_stop = False

    def step(self, epoch_metrics: dict[str, float]) -> bool:
        """Updates tracking and checks if patience has been exceeded.

        Args:
            epoch_metrics (Dict[str, float]): Metrics from the current epoch.

        Returns:
            bool: True if training should halt, False otherwise.
        """
        if not self.enabled:
            return False

        current = epoch_metrics.get(self.monitor)
        if current is None:
            return False

        improved = False
        if self.mode == "min":
            if current < self.best_metric:
                self.best_metric = current
                improved = True
        else:
            if current > self.best_metric:
                self.best_metric = current
                improved = True

        if improved:
            self.wait = 0
        else:
            self.wait += 1
            if self.wait >= self.patience:
                self.should_stop = True

        return self.should_stop


class Checkpointing:
    """Manages atomic saving of model weights and optimizer state to disk."""

    def __init__(self, config: CheckpointingConfig):
        """Initializes the Checkpointing callback.

        Args:
            config (CheckpointingConfig): Checkpoint configuration settings.
        """
        self.save_best = config.save_best
        self.save_every_n_epochs = config.save_every_n_epochs
        self.monitor = config.monitor

        # Auto-detect mode based on monitored metric name
        if "loss" in self.monitor.lower():
            self.mode = "min"
        else:
            self.mode = "max"

        self.best_metric = float("inf") if self.mode == "min" else float("-inf")

        # Resolve relative directories to avoid system root write issues
        self.directory = config.directory
        if self.directory == "/checkpoints" or self.directory.startswith("/"):
            self.directory = os.path.join("data", "checkpoints")

        os.makedirs(self.directory, exist_ok=True)

    def step(
        self,
        epoch: int,
        model: nn.Module,
        optimizer: optim.Optimizer,
        epoch_metrics: dict[str, float],
    ) -> str | None:
        """Saves checkpoints atomically if the monitored metric improves or epoch count matches.

        Args:
            epoch (int): The current epoch number.
            model (nn.Module): The PyTorch model to serialize.
            optimizer (optim.Optimizer): The optimizer to save.
            epoch_metrics (Dict[str, float]): The metrics calculated for this epoch.

        Returns:
            Optional[str]: Path to the saved checkpoint, or None.
        """
        current = epoch_metrics.get(self.monitor)
        saved_path = None

        state = {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "metrics": epoch_metrics,
        }

        improved = False
        if current is not None:
            if self.mode == "min":
                if current < self.best_metric:
                    self.best_metric = current
                    improved = True
            else:
                if current > self.best_metric:
                    self.best_metric = current
                    improved = True

        # Save best checkpoint
        if self.save_best and improved:
            path = os.path.join(self.directory, "best.pt")
            temp_path = path + ".tmp"
            torch.save(state, temp_path)
            os.replace(temp_path, path)
            saved_path = path

        # Save periodic checkpoint
        if (
            self.save_every_n_epochs > 0
            and epoch % self.save_every_n_epochs == 0
        ):
            path = os.path.join(self.directory, f"epoch_{epoch}.pt")
            temp_path = path + ".tmp"
            torch.save(state, temp_path)
            os.replace(temp_path, path)
            saved_path = path

        return saved_path
