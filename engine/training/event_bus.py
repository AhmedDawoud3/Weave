import asyncio
import json
import logging
import os
import threading
from typing import Any

logger = logging.getLogger(__name__)


class EventBus:
    """Thread-safe, replayable event store for SSE streaming.

    Events are appended to an internal list, written to an append-only JSONL
    file on disk, and kept in memory during active runs. Each SSE consumer calls
    ``iter_events()`` which yields every event from a given cursor position,
    then waits for new ones.

    Thread safety:
        - ``push()`` may be called from any thread (the trainer's
          background thread). It uses a lock to guard the list and
          ``loop.call_soon_threadsafe`` to set the asyncio Event on the main loop.
        - ``iter_events()`` is an async generator consumed by the
          FastAPI SSE endpoint on the main event loop.
    """

    def __init__(self, run_id: str, loop: asyncio.AbstractEventLoop):
        self.run_id = run_id
        self._loop = loop
        self._events: list[dict[str, Any]] = []
        self._lock = threading.Lock()
        # Lazily initialized on the loop consuming the stream (main ASGI loop)
        self._notify: asyncio.Event | None = None
        self._finished = False

    # -- Producer API (called from trainer thread) --------------------------

    def push(self, msg: dict[str, Any]) -> None:
        """Append an event and wake any waiting consumers.

        Safe to call from any thread. Writes to both the in-memory event log
        and the append-only JSONL steps file on disk.
        """
        with self._lock:
            self._events.append(msg)
            self._write_to_disk(msg)

        # Wake up async consumers on the event loop thread
        if self._notify is not None and not self._loop.is_closed():
            try:
                self._loop.call_soon_threadsafe(self._notify.set)
            except RuntimeError as e:
                if "closed" in str(e).lower():
                    logger.debug("Event loop closed; ignoring notification set.")
                else:
                    raise

    def mark_finished(self) -> None:
        """Signal that no more events will be produced."""
        self._finished = True
        if self._notify is not None and not self._loop.is_closed():
            try:
                self._loop.call_soon_threadsafe(self._notify.set)
            except RuntimeError as e:
                if "closed" in str(e).lower():
                    logger.debug(
                        "Event loop closed; ignoring finished notification set."
                    )
                else:
                    raise

    def _write_to_disk(self, msg: dict[str, Any]) -> None:
        """Appends the event message to the step metrics JSONL file on disk."""
        try:
            from training.experiments import get_runs_dir

            runs_dir = get_runs_dir()
            filepath = os.path.join(runs_dir, f"{self.run_id}.steps.jsonl")
            with open(filepath, "a", encoding="utf-8") as f:
                f.write(json.dumps(msg) + "\n")
        except Exception as e:
            logger.error(f"Failed to write event to disk for run {self.run_id}: {e}")

    # -- Consumer API (called from async SSE handler) -----------------------

    @property
    def finished(self) -> bool:
        return self._finished

    def snapshot(self) -> list[dict[str, Any]]:
        """Return a copy of all events so far."""
        with self._lock:
            return list(self._events)

    async def iter_events(self, start: int = 0):
        """Async generator that yields events from ``start`` onward.

        Yields all buffered events immediately, then waits for new ones.
        Stops when a terminal event (training_complete, training_failed,
        stopped) is encountered or the bus is marked finished.
        """
        # Dynamically create the event on the loop executing the generator
        if self._notify is None:
            self._notify = asyncio.Event()

        cursor = start
        terminal_types = {"training_complete", "training_failed", "stopped"}

        while True:
            # Clear notification first to avoid race conditions with incoming pushes
            self._notify.clear()

            with self._lock:
                pending = self._events[cursor:]

            if pending:
                for event in pending:
                    yield event
                    cursor += 1
                    if event.get("type") in terminal_types:
                        return
                continue

            if self._finished:
                return

            await self._notify.wait()
