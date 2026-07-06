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

    def start_run(self, config: TrainingConfig, loop: asyncio.AbstractEventLoop) -> str:
        """Starts a background training run.

        Args:
            config (TrainingConfig): Complete training configuration.
            loop (asyncio.AbstractEventLoop): The main ASGI event loop.

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
                config.training.checkpointing.directory = directory.replace(
                    "data", "../data", 1
                )

        event_bus = EventBus(run_id, loop)

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

    def get_event_bus(
        self, run_id: str, loop: asyncio.AbstractEventLoop | None = None
    ) -> EventBus | None:
        """Gets the EventBus for streaming. If the run is not active, loads historical
        metrics from disk and returns a completed/playback EventBus.
        """
        if run_id in self.event_buses:
            return self.event_buses[run_id]

        # Not in memory: check if it exists on disk
        import json
        import os

        from training.experiments import get_run, get_runs_dir, save_run

        runs_dir = get_runs_dir()
        filepath = os.path.join(runs_dir, f"{run_id}.json")
        steps_path = os.path.join(runs_dir, f"{run_id}.steps.jsonl")

        if not os.path.exists(filepath):
            return None

        # Load run record to check status
        record = get_run(run_id)
        if not record:
            return None

        # Graceful Crash Recovery: If status is running/paused, but it's not active in memory,
        # it means the server restarted while the run was ongoing. Mark it as stopped.
        if record.status in ["running", "paused"]:
            record.status = "stopped"
            save_run(record)

            # Append final stopped event to JSONL file to signal end of stream
            stopped_msg = {
                "type": "stopped",
                "run_id": run_id,
                "message": "Engine restarted. Training stopped.",
            }
            try:
                with open(steps_path, "a", encoding="utf-8") as f:
                    f.write(json.dumps(stopped_msg) + "\n")
            except Exception:
                pass

        # Create a playback EventBus
        current_loop = loop or asyncio.get_event_loop()
        playback_bus = EventBus(run_id, current_loop)

        # Load all step events from JSONL file
        if os.path.exists(steps_path):
            try:
                with open(steps_path, encoding="utf-8") as f:
                    for line in f:
                        if line.strip():
                            playback_bus._events.append(json.loads(line))
            except Exception as e:
                logger.error(f"Failed to read historical events from {steps_path}: {e}")

        # Mark finished so iter_events finishes immediately after yielding history
        playback_bus.mark_finished()
        return playback_bus

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
