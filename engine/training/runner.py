"""
runner.py — Training Runner management.
=======================================
Coordinates model compilation, dataset parsing, optimizer setup, learning rate
scheduler creation, and device fallbacks. Tracks active background training jobs.
"""

import asyncio
import logging
import uuid

from schemas import TrainingConfig
from training.event_bus import EventBus
from training.trainer import Trainer

logger = logging.getLogger(__name__)


class TrainingRunner:
    """Manages active training runs and background training execution threads."""

    def __init__(self):
        """Initializes the training runner state."""
        # Maps run_id -> Trainer instance
        self.active_runs: dict[str, Trainer] = {}
        # Maps run_id -> EventBus
        self.event_buses: dict[str, EventBus] = {}

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

        # Redirect checkpoints from watched "data/" directory to parent "../data/" directory
        # to prevent Uvicorn auto-reload from restarting the server and killing the background run.
        if config.training and config.training.checkpointing:
            directory = config.training.checkpointing.directory
            if directory.startswith("data"):
                config.training.checkpointing.directory = directory.replace("data", "../data", 1)

        # 1. Event loop registration
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        event_bus = EventBus(loop)

        # 2. Trainer instantiation with deferred parameters
        trainer = Trainer(
            run_id=run_id,
            config=config,
            model=None,
            train_loader=None,
            val_loader=None,
            optimizer=None,
            loss_fn=None,
            scheduler=None,
            device=None,
            loop=loop,
            event_bus=event_bus,
        )

        self.active_runs[run_id] = trainer
        self.event_buses[run_id] = event_bus

        trainer.start()
        logger.info(
            f"Run {run_id}: Background training thread spawned with deferred configuration setup."
        )
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

    def get_event_bus(self, run_id: str) -> EventBus | None:
        """Gets the EventBus for streaming.

        Args:
            run_id (str): The run identifier.

        Returns:
            Optional[EventBus]: The event bus, or None if not found.
        """
        return self.event_buses.get(run_id)

    def cleanup_run(self, run_id: str) -> None:
        """Removes run state tracking.

        Args:
            run_id (str): The run identifier.
        """
        if run_id in self.active_runs:
            del self.active_runs[run_id]
        if run_id in self.event_buses:
            del self.event_buses[run_id]
        logger.info(
            f"Run {run_id}: State cleaned up successfully from runner tracking."
        )
