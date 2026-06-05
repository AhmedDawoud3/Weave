"""
trainer.py — Background Trainer execution loop.
===============================================
Runs the neural network training loop in a background thread, handles mixed
precision, gradient accumulation, and control commands (pause/resume/stop).
"""

import logging
import threading
import time
from typing import Any

import torch
import torch.nn as nn
import torch.optim as optim

from schemas import TrainingConfig
from training.callbacks import Checkpointing, EarlyStopping
from training.event_bus import EventBus
from training.metrics import EpochMetricsTracker, compute_batch_metrics

logger = logging.getLogger(__name__)


class Trainer:
    """Manages the training execution loop for a model in a background thread."""

    def __init__(
        self,
        run_id: str,
        config: TrainingConfig,
        model: nn.Module | None = None,
        train_loader: Any = None,
        val_loader: Any = None,
        optimizer: optim.Optimizer | None = None,
        loss_fn: nn.Module | None = None,
        scheduler: Any = None,
        device: torch.device | None = None,
        loop: Any = None,
        event_bus: EventBus | None = None,
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
            loop: Deprecated, kept for backward compat (unused).
            event_bus (EventBus): Thread-safe event store for metrics streaming.
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
        self.event_bus = event_bus

        # Callbacks
        self.early_stopping = EarlyStopping(self.settings.early_stopping)
        self.checkpointing = Checkpointing(self.settings.checkpointing)

        # Threading/Control Flags
        self.is_paused = False
        self.is_stopped = False
        self.status = "running"
        self.thread: threading.Thread | None = None

        # State tracking for API status requests
        self.current_epoch = 0
        self.total_epochs = self.settings.epochs
        self.latest_metrics: dict[str, float] = {}

        # Best metrics tracker
        self.best_epoch = 0
        self.best_val_loss = float("inf")

        # Experiment tracking
        from datetime import datetime

        self.created_at = datetime.now()
        self.start_time: float | None = None
        self.metrics_history: list[dict[str, Any]] = []

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

    def _push_event(self, msg: dict[str, Any]) -> None:
        """Pushes an event to the EventBus (thread-safe).

        Args:
            msg (Dict[str, Any]): Dictionary message to store.
        """
        if self.event_bus:
            self.event_bus.push(msg)

    def _run_loop(self) -> None:
        """Main training thread function."""
        try:
            self.start_time = time.time()

            if self.model is None:
                # Import dependencies dynamically to keep trainer imports clean
                from compiler.compiler import GraphCompiler
                from compiler.factory import get_loss_function, get_optimizer
                from dataset import get_dataset_from_config
                from dataset.dataloader import create_dataloader, split_dataset
                from training.scheduler_factory import create_scheduler

                # 1. Device selection
                requested_device = self.config.training.device
                if "cuda" in requested_device:
                    if torch.cuda.is_available():
                        self.device = torch.device(requested_device)
                    else:
                        logger.warning(
                            f"CUDA requested ('{requested_device}'), but CUDA is not available. "
                            "Falling back to 'cpu'."
                        )
                        self.device = torch.device("cpu")
                else:
                    self.device = torch.device(requested_device)
                logger.info(
                    f"Run {self.run_id}: Target device configured as: {self.device}"
                )

                # Notify setup status: compiling model
                self._push_event(
                    {
                        "type": "setup_status",
                        "run_id": self.run_id,
                        "status": "compiling_model",
                        "message": "Compiling neural network model graph...",
                    }
                )

                # 2. Model compilation
                compiler = GraphCompiler()
                self.model = compiler.compile(self.config.model_graph)
                logger.info(f"Run {self.run_id}: Model graph compiled successfully.")

                # Notify setup status: loading dataset
                self._push_event(
                    {
                        "type": "setup_status",
                        "run_id": self.run_id,
                        "status": "loading_dataset",
                        "message": "Loading and preparing dataset (downloading if necessary)...",
                    }
                )

                # 3. Dataset loading and splitting
                full_dataset = get_dataset_from_config(self.config.dataset_config)
                train_ds, val_ds = split_dataset(full_dataset, split_ratio=0.8)

                batch_size = 32
                ds_config = self.config.dataset_config
                if hasattr(ds_config, "dataloader") and getattr(ds_config, "dataloader") is not None:
                    batch_size = int(getattr(ds_config, "dataloader").batch_size)
                elif hasattr(ds_config, "batch_size") and getattr(ds_config, "batch_size") is not None:
                    batch_size = int(getattr(ds_config, "batch_size"))
                elif hasattr(ds_config, "loader_config") and getattr(ds_config, "loader_config") is not None:
                    loader_cfg = getattr(ds_config, "loader_config")
                    if hasattr(loader_cfg, "batch_size") and getattr(loader_cfg, "batch_size") is not None:
                        batch_size = int(getattr(loader_cfg, "batch_size"))

                self.train_loader = create_dataloader(
                    train_ds, batch_size=batch_size, shuffle=True
                )
                self.val_loader = create_dataloader(
                    val_ds, batch_size=batch_size, shuffle=False
                )
                logger.info(
                    f"Run {self.run_id}: Dataset loaded and split. Train size={len(train_ds)}, Val size={len(val_ds)}, Batch size={batch_size}"
                )

                # Notify setup status: initializing training
                self._push_event(
                    {
                        "type": "setup_status",
                        "run_id": self.run_id,
                        "status": "initializing_training",
                        "message": "Initializing loss, optimizer, and scheduler...",
                    }
                )

                # 4. Loss and Optimizer
                self.loss_fn = get_loss_function(self.config.loss.model_dump())
                self.optimizer = get_optimizer(
                    self.model.parameters(), self.config.optimizer.model_dump()
                )
                logger.info(
                    f"Run {self.run_id}: Instantiated loss function '{self.config.loss.type}' and optimizer '{self.config.optimizer.type}'"
                )

                # 5. Step calculations and Scheduler instantiation
                steps_per_epoch = len(self.train_loader)
                self.scheduler = create_scheduler(
                    self.optimizer,
                    self.config.scheduler,
                    epochs=self.config.training.epochs,
                    steps_per_epoch=steps_per_epoch,
                )

            # Refine types for static analysis
            assert self.model is not None
            assert self.device is not None
            assert self.loss_fn is not None
            assert self.optimizer is not None

            # Determine task type based on loss class name
            loss_name = self.loss_fn.__class__.__name__
            if loss_name in ["MSELoss", "L1Loss"]:
                task_type = "regression"
            elif loss_name in ["BCEWithLogitsLoss", "BCELoss"]:
                task_type = "multi_label"
            else:
                task_type = "classification"

            # Mixed Precision Setup
            scaler = torch.amp.GradScaler(
                "cuda",
                enabled=self.settings.mixed_precision and self.device.type == "cuda",
            )

            global_step = 0
            best_val_loss = float("inf")
            best_epoch = 0

            self._save_experiment_run()
            self.model.to(self.device)
            logger.info(
                f"Run {self.run_id}: Starting training loop on device '{self.device}' for {self.settings.epochs} epochs."
            )

            for epoch in range(1, self.settings.epochs + 1):
                if self.is_stopped:
                    logger.info(
                        f"Run {self.run_id}: Stop signal detected at epoch {epoch}."
                    )
                    break

                # Handle pause state
                if self.is_paused and not self.is_stopped:
                    logger.info(f"Run {self.run_id}: Training paused at epoch {epoch}.")
                while self.is_paused and not self.is_stopped:
                    time.sleep(0.1)

                if self.is_stopped:
                    logger.info(
                        f"Run {self.run_id}: Stop signal detected during pause at epoch {epoch}."
                    )
                    break

                self.current_epoch = epoch
                self.model.train()
                logger.info(
                    f"Run {self.run_id}: Starting epoch {epoch}/{self.settings.epochs}..."
                )
                train_tracker = EpochMetricsTracker(task_type)

                for batch_idx, (inputs, targets) in enumerate(self.train_loader):
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
                        and self.device.type == "cuda",
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
                        batch_idx + 1
                    ) % self.settings.gradient_accumulation_steps == 0 or (
                        batch_idx + 1
                    ) == len(self.train_loader):
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
                            if self.config.scheduler and self.config.scheduler.type in [
                                "OneCycleLR",
                                "CosineAnnealingLR",
                            ]:
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
                    logger.info(
                        f"Run {self.run_id}: Running validation for epoch {epoch}..."
                    )
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
                    if isinstance(self.scheduler, optim.lr_scheduler.ReduceLROnPlateau):
                        monitor_val = epoch_val_metrics.get(
                            self.scheduler.mode or "loss",
                            epoch_val_metrics.get("loss", epoch_train_metrics["loss"]),
                        )
                        self.scheduler.step(monitor_val)
                    else:
                        if self.config.scheduler and self.config.scheduler.type in [
                            "StepLR",
                            "ExponentialLR",
                        ]:
                            self.scheduler.step()

                # Combine epoch metrics
                epoch_combined_metrics = {
                    **{f"train_{k}": v for k, v in epoch_train_metrics.items()},
                    **{f"val_{k}": v for k, v in epoch_val_metrics.items()},
                }
                logger.info(
                    f"Run {self.run_id}: Epoch {epoch} completed. Metrics: {epoch_combined_metrics}"
                )

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
                    "val_loss" if "val_loss" in epoch_combined_metrics else "train_loss"
                )
                val_loss_val = epoch_combined_metrics.get(val_loss_key, 0.0)
                if val_loss_val < best_val_loss:
                    best_val_loss = val_loss_val
                    best_epoch = epoch

                # Save epoch history to RunRecord
                self.metrics_history.append({"epoch": epoch, **epoch_combined_metrics})
                self._save_experiment_run()

            # Mark completed
            if self.status not in ["stopped", "failed"]:
                self.status = "completed"
            logger.info(
                f"Run {self.run_id}: Training finished loop. Status={self.status}, Best Epoch={best_epoch}, Best Val Loss={best_val_loss:.6f}"
            )

            # Push complete event
            complete_msg = {
                "type": "training_complete",
                "run_id": self.run_id,
                "best_epoch": best_epoch,
                "best_val_loss": best_val_loss,
            }
            self._push_event(complete_msg)
            if self.event_bus:
                self.event_bus.mark_finished()
            self._save_experiment_run()

        except Exception as e:
            logger.exception(
                f"Run {self.run_id}: Exception occurred in training thread loop: {e}"
            )
            self.status = "failed"
            fail_msg = {
                "type": "training_failed",
                "run_id": self.run_id,
                "error": str(e),
            }
            self._push_event(fail_msg)
            if self.event_bus:
                self.event_bus.mark_finished()
            try:
                self._save_experiment_run()
            except Exception:
                pass
            raise e

    def _save_experiment_run(self) -> None:
        """Saves or updates the current run record in local disk storage."""
        import os

        from schemas import RunRecord
        from training.experiments import save_run

        duration = None
        if self.start_time is not None:
            duration = time.time() - self.start_time

        checkpoint_path = None
        if self.checkpointing:
            checkpoint_path = os.path.abspath(
                os.path.join(self.checkpointing.directory, "best.pt")
            )

        best_metrics = None
        if self.early_stopping and self.early_stopping.best_metric not in [
            float("inf"),
            float("-inf"),
        ]:
            best_metrics = {
                self.early_stopping.monitor: self.early_stopping.best_metric
            }

        status = self.status
        if status not in ["running", "completed", "failed", "stopped"]:
            status = "stopped"

        record = RunRecord(
            run_id=self.run_id,
            created_at=self.created_at,
            status=status,  # type: ignore
            config=self.config.model_dump(),
            graph_snapshot=self.config.model_graph.model_dump(),
            metrics_history=self.metrics_history,
            best_metrics=best_metrics,
            checkpoint_path=checkpoint_path,
            duration_seconds=duration,
        )
        try:
            save_run(record)
        except Exception as e:
            logger.error(f"Failed to auto-save run record: {e}")
