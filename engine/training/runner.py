"""
runner.py — Training Runner management.
=======================================
Coordinates model compilation, dataset parsing, optimizer setup, learning rate
scheduler creation, and device fallbacks. Tracks active background training jobs.
"""

import asyncio
import logging
import uuid

import torch

from compiler.compiler import GraphCompiler
from compiler.factory import get_loss_function, get_optimizer
from dataset import get_dataset_from_config
from dataset.dataloader import create_dataloader, split_dataset
from schemas import TrainingConfig
from training.scheduler_factory import create_scheduler
from training.trainer import Trainer

logger = logging.getLogger(__name__)


class TrainingRunner:
    """Manages active training runs and background training execution threads."""

    def __init__(self):
        """Initializes the training runner state."""
        # Maps run_id -> Trainer instance
        self.active_runs: dict[str, Trainer] = {}
        # Maps run_id -> asyncio.Queue
        self.event_queues: dict[str, asyncio.Queue] = {}

    def start_run(self, config: TrainingConfig) -> str:
        """Starts a background training run.

        Args:
            config (TrainingConfig): Complete training configuration.

        Returns:
            str: Generated unique run_id.

        Raises:
            Exception: If setup or model compilation fails.
        """
        run_id = str(uuid.uuid4())
        logger.info(f"Initiating training run. Assigned run_id: {run_id}")

        # 1. Device selection with fallback warning
        requested_device = config.training.device
        if "cuda" in requested_device:
            if torch.cuda.is_available():
                device = torch.device(requested_device)
            else:
                logger.warning(
                    f"CUDA requested ('{requested_device}'), but CUDA is not available. "
                    "Falling back to 'cpu'."
                )
                device = torch.device("cpu")
        else:
            device = torch.device(requested_device)
        logger.info(f"Run {run_id}: Target device configured as: {device}")

        # 2. Model compilation
        compiler = GraphCompiler()
        model = compiler.compile(config.model_graph)
        logger.info(f"Run {run_id}: Model graph compiled successfully.")

        # 3. Dataset loading and splitting
        full_dataset = get_dataset_from_config(config.dataset_config)
        train_ds, val_ds = split_dataset(full_dataset, split_ratio=0.8)

        # Get batch size configuration from config or default to 32
        batch_size = 32
        if hasattr(config.dataset_config, "batch_size"):
            batch_size = int(config.dataset_config.batch_size)  # type: ignore
        elif (
            hasattr(config.dataset_config, "loader_config")
            and config.dataset_config.loader_config
        ):
            batch_size = int(config.dataset_config.loader_config.batch_size)  # type: ignore

        train_loader = create_dataloader(train_ds, batch_size=batch_size, shuffle=True)
        val_loader = create_dataloader(val_ds, batch_size=batch_size, shuffle=False)
        logger.info(
            f"Run {run_id}: Dataset loaded and split. Train size={len(train_ds)}, Val size={len(val_ds)}, Batch size={batch_size}"
        )

        # 4. Loss and Optimizer
        loss_fn = get_loss_function(config.loss.model_dump())
        optimizer = get_optimizer(model.parameters(), config.optimizer.model_dump())
        logger.info(
            f"Run {run_id}: Instantiated loss function '{config.loss.type}' and optimizer '{config.optimizer.type}'"
        )

        # 5. Step calculations and Scheduler instantiation
        steps_per_epoch = len(train_loader)
        scheduler = create_scheduler(
            optimizer,
            config.scheduler,
            epochs=config.training.epochs,
            steps_per_epoch=steps_per_epoch,
        )

        # 6. Event loop registration
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        event_queue = asyncio.Queue()

        # 7. Trainer instantiation
        trainer = Trainer(
            run_id=run_id,
            config=config,
            model=model,
            train_loader=train_loader,
            val_loader=val_loader,
            optimizer=optimizer,
            loss_fn=loss_fn,
            scheduler=scheduler,
            device=device,
            loop=loop,
            event_queue=event_queue,
        )

        self.active_runs[run_id] = trainer
        self.event_queues[run_id] = event_queue

        trainer.start()
        logger.info(f"Run {run_id}: Background training thread spawned and started.")
        return run_id

    def pause_run(self, run_id: str) -> bool:
        """Pauses a training run.

        Args:
            run_id (str): The run identifier.

        Returns:
            bool: True if run exists and was paused, False otherwise.
        """
        if run_id in self.active_runs:
            self.active_runs[run_id].pause()
            logger.info(f"Run {run_id}: Training run successfully paused.")
            return True
        logger.warning(f"Run {run_id}: Pause requested, but no active run was found.")
        return False

    def resume_run(self, run_id: str) -> bool:
        """Resumes a paused training run.

        Args:
            run_id (str): The run identifier.

        Returns:
            bool: True if run exists and was resumed, False otherwise.
        """
        if run_id in self.active_runs:
            self.active_runs[run_id].resume()
            logger.info(f"Run {run_id}: Training run successfully resumed.")
            return True
        logger.warning(f"Run {run_id}: Resume requested, but no active run was found.")
        return False

    def stop_run(self, run_id: str) -> bool:
        """Stops a running training run.

        Args:
            run_id (str): The run identifier.

        Returns:
            bool: True if run exists and was stopped, False otherwise.
        """
        if run_id in self.active_runs:
            self.active_runs[run_id].stop()
            logger.info(f"Run {run_id}: Training run successfully stopped.")
            return True
        logger.warning(f"Run {run_id}: Stop requested, but no active run was found.")
        return False

    def get_trainer(self, run_id: str) -> Trainer | None:
        """Gets the trainer instance for a run.

        Args:
            run_id (str): The run identifier.

        Returns:
            Optional[Trainer]: The trainer instance, or None if not found.
        """
        return self.active_runs.get(run_id)

    def get_queue(self, run_id: str) -> asyncio.Queue | None:
        """Gets the asyncio event queue for streaming.

        Args:
            run_id (str): The run identifier.

        Returns:
            Optional[asyncio.Queue]: The queue, or None if not found.
        """
        return self.event_queues.get(run_id)

    def cleanup_run(self, run_id: str) -> None:
        """Removes run state tracking.

        Args:
            run_id (str): The run identifier.
        """
        if run_id in self.active_runs:
            del self.active_runs[run_id]
        if run_id in self.event_queues:
            del self.event_queues[run_id]
        logger.info(
            f"Run {run_id}: State cleaned up successfully from runner tracking."
        )
