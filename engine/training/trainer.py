"""
trainer.py — Background Trainer execution loop.
===============================================
Runs the neural network training loop in a background thread, handles mixed
precision, gradient accumulation, and control commands (pause/resume/stop).
"""

import asyncio
import logging
import threading
import time
from typing import Any, Dict, Optional
import torch
import torch.nn as nn
import torch.optim as optim
from schemas import TrainingConfig
from training.callbacks import Checkpointing, EarlyStopping
from training.metrics import EpochMetricsTracker, compute_batch_metrics

logger = logging.getLogger(__name__)


class Trainer:
    """Manages the training execution loop for a model in a background thread."""

    def __init__(
        self,
        run_id: str,
        config: TrainingConfig,
        model: nn.Module,
        train_loader: Any,
        val_loader: Any,
        optimizer: optim.Optimizer,
        loss_fn: nn.Module,
        scheduler: Any,
        device: torch.device,
        loop: asyncio.AbstractEventLoop,
        event_queue: asyncio.Queue,
    ):
        """Initializes the background trainer.

        Args:
            run_id (str): Unique run identifier.
            config (TrainingConfig): Complete training configuration.
            model (nn.Module): Compiled WeaveBlock model.
            train_loader (Any): DataLoader for training data.
            val_loader (Any): DataLoader for validation data.
            optimizer (optim.Optimizer): Model parameters optimizer.
            loss_fn (nn.Module): Loss function module.
            scheduler (Any): Learning rate scheduler instance.
            device (torch.device): Device to execute computations on.
            loop (asyncio.AbstractEventLoop): Main event loop.
            event_queue (asyncio.Queue): Thread-safe queue for metrics.
        """
        self.run_id = run_id
        self.config = config
        self.settings = config.training
        self.model = model
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.optimizer = optimizer
        self.loss_fn = loss_fn
        self.scheduler = scheduler
        self.device = device
        self.loop = loop
        self.event_queue = event_queue

        # Callbacks
        self.early_stopping = EarlyStopping(self.settings.early_stopping)
        self.checkpointing = Checkpointing(self.settings.checkpointing)

        # Threading/Control Flags
        self.is_paused = False
        self.is_stopped = False
        self.status = "running"
        self.thread: Optional[threading.Thread] = None

        # State tracking for API status requests
        self.current_epoch = 0
        self.total_epochs = self.settings.epochs
        self.latest_metrics: Dict[str, float] = {}

        # Best metrics tracker
        self.best_epoch = 0
        self.best_val_loss = float("inf")

    def start(self) -> None:
        """Spawns the background execution thread."""
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()

    def pause(self) -> None:
        """Pauses training execution."""
        self.is_paused = True
        self.status = "paused"

    def resume(self) -> None:
        """Resumes training execution."""
        self.is_paused = False
        self.status = "running"

    def stop(self) -> None:
        """Stops training execution permanently."""
        self.is_stopped = True
        self.status = "stopped"

    def _push_event(self, msg: Dict[str, Any]) -> None:
        """Pushes a message to the asyncio queue in a thread-safe way.

        Args:
            msg (Dict[str, Any]): Dictionary message to enqueue.
        """
        self.loop.call_soon_threadsafe(self.event_queue.put_nowait, msg)

    def _run_loop(self) -> None:
        """Main training thread function."""
        # 1. Determine task type based on loss class name
        loss_name = self.loss_fn.__class__.__name__
        if loss_name in ["MSELoss", "L1Loss"]:
            task_type = "regression"
        elif loss_name in ["BCEWithLogitsLoss", "BCELoss"]:
            task_type = "multi_label"
        else:
            task_type = "classification"

        # 2. Mixed Precision Setup
        scaler = torch.amp.GradScaler(
            "cuda",
            enabled=self.settings.mixed_precision
            and self.device.type == "cuda"
        )

        global_step = 0
        best_val_loss = float("inf")
        best_epoch = 0

        try:
            self.model.to(self.device)

            for epoch in range(1, self.settings.epochs + 1):
                if self.is_stopped:
                    break

                # Handle pause state
                while self.is_paused and not self.is_stopped:
                    time.sleep(0.1)

                if self.is_stopped:
                    break

                self.current_epoch = epoch
                self.model.train()
                train_tracker = EpochMetricsTracker(task_type)

                for batch_idx, (inputs, targets) in enumerate(
                    self.train_loader
                ):
                    if self.is_stopped:
                        break

                    while self.is_paused and not self.is_stopped:
                        time.sleep(0.1)

                    if self.is_stopped:
                        break

                    inputs = inputs.to(self.device)
                    targets = targets.to(self.device)

                    # Mixed precision forward pass
                    with torch.amp.autocast(
                        "cuda",
                        enabled=self.settings.mixed_precision
                        and self.device.type == "cuda"
                    ):
                        outputs = self.model(inputs)
                        loss = self.loss_fn(outputs, targets)
                        loss_for_accum = (
                            loss / self.settings.gradient_accumulation_steps
                        )

                    # Backward pass
                    scaler.scale(loss_for_accum).backward()

                    # Gradient step under accumulation
                    if (
                        (batch_idx + 1)
                        % self.settings.gradient_accumulation_steps
                        == 0
                        or (batch_idx + 1) == len(self.train_loader)
                    ):
                        if self.settings.gradient_clip_norm > 0:
                            scaler.unscale_(self.optimizer)
                            nn.utils.clip_grad_norm_(
                                self.model.parameters(),
                                self.settings.gradient_clip_norm,
                            )

                        scaler.step(self.optimizer)
                        scaler.update()
                        self.optimizer.zero_grad()

                        # Step-based scheduler step
                        if self.scheduler is not None and not isinstance(
                            self.scheduler, optim.lr_scheduler.ReduceLROnPlateau
                        ):
                            if (
                                self.config.scheduler
                                and self.config.scheduler.type
                                in ["OneCycleLR", "CosineAnnealingLR"]
                            ):
                                self.scheduler.step()

                    global_step += 1

                    # Compute step metrics
                    batch_size = inputs.size(0)
                    batch_loss = loss.detach().cpu().item()
                    batch_metrics = compute_batch_metrics(
                        outputs, targets, batch_loss, task_type
                    )
                    train_tracker.update(batch_metrics, batch_size)

                    # LR tracking
                    current_lr = self.optimizer.param_groups[0]["lr"]

                    step_metrics = {
                        "train_loss": batch_loss,
                        "learning_rate": current_lr,
                        **{
                            f"train_{k}": v
                            for k, v in batch_metrics.items()
                            if k != "loss"
                        },
                    }

                    # Push step event
                    step_msg = {
                        "type": "step_metrics",
                        "run_id": self.run_id,
                        "epoch": epoch,
                        "step": global_step,
                        "metrics": step_metrics,
                    }
                    self._push_event(step_msg)

                    # Yield CPU control to avoid event loop starvation (GIL yielding)
                    time.sleep(0.001)

                if self.is_stopped:
                    break

                # Epoch summary
                epoch_train_metrics = train_tracker.get_epoch_metrics()

                # Validation step
                epoch_val_metrics = {}
                if self.val_loader is not None and (
                    epoch % self.settings.validation_frequency == 0
                ):
                    self.model.eval()
                    val_tracker = EpochMetricsTracker(task_type)
                    with torch.no_grad():
                        for val_inputs, val_targets in self.val_loader:
                            val_inputs = val_inputs.to(self.device)
                            val_targets = val_targets.to(self.device)

                            val_outputs = self.model(val_inputs)
                            val_loss = self.loss_fn(val_outputs, val_targets)

                            v_size = val_inputs.size(0)
                            v_loss = val_loss.detach().cpu().item()
                            v_metrics = compute_batch_metrics(
                                val_outputs, val_targets, v_loss, task_type
                            )
                            val_tracker.update(v_metrics, v_size)

                    epoch_val_metrics = val_tracker.get_epoch_metrics()

                # Epoch-based scheduler step
                if self.scheduler is not None:
                    if isinstance(
                        self.scheduler, optim.lr_scheduler.ReduceLROnPlateau
                    ):
                        monitor_val = epoch_val_metrics.get(
                            self.scheduler.mode or "loss",
                            epoch_val_metrics.get(
                                "loss", epoch_train_metrics["loss"]
                            ),
                        )
                        self.scheduler.step(monitor_val)
                    else:
                        if (
                            self.config.scheduler
                            and self.config.scheduler.type
                            in ["StepLR", "ExponentialLR"]
                        ):
                            self.scheduler.step()

                # Combine epoch metrics
                epoch_combined_metrics = {
                    **{
                        f"train_{k}": v
                        for k, v in epoch_train_metrics.items()
                    },
                    **{f"val_{k}": v for k, v in epoch_val_metrics.items()},
                }

                self.latest_metrics = epoch_combined_metrics

                # Push epoch metrics event
                epoch_msg = {
                    "type": "epoch_metrics",
                    "run_id": self.run_id,
                    "epoch": epoch,
                    "metrics": epoch_combined_metrics,
                }
                self._push_event(epoch_msg)

                # Early Stopping callback
                if self.early_stopping.step(epoch_combined_metrics):
                    self.status = "stopped"
                    break

                # Checkpointing callback
                self.checkpointing.step(
                    epoch, self.model, self.optimizer, epoch_combined_metrics
                )

                # Track best
                val_loss_key = (
                    "val_loss"
                    if "val_loss" in epoch_combined_metrics
                    else "train_loss"
                )
                val_loss_val = epoch_combined_metrics.get(val_loss_key, 0.0)
                if val_loss_val < best_val_loss:
                    best_val_loss = val_loss_val
                    best_epoch = epoch

            # Mark completed
            if self.status not in ["stopped", "failed"]:
                self.status = "completed"

            # Push complete event
            complete_msg = {
                "type": "training_complete",
                "run_id": self.run_id,
                "best_epoch": best_epoch,
                "best_val_loss": best_val_loss,
            }
            self._push_event(complete_msg)

        except Exception as e:
            logger.exception("Error in training thread loop.")
            self.status = "failed"
            fail_msg = {
                "type": "training_failed",
                "run_id": self.run_id,
                "error": str(e),
            }
            self._push_event(fail_msg)
            raise e
