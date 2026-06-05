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

        # 1. Event loop registration
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        event_queue = asyncio.Queue()

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
            event_queue=event_queue,
        )

        self.active_runs[run_id] = trainer
        self.event_queues[run_id] = event_queue

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
