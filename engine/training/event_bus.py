"""
event_bus.py — Thread-safe event store with cursor-based consumption.
====================================================================
Replaces asyncio.Queue for SSE streaming. Buffers all events so
late-connecting clients can replay from the beginning, and multiple
consumers can each read at their own pace.
"""

import asyncio
import logging
import threading
from typing import Any

logger = logging.getLogger(__name__)


class EventBus:
    """Thread-safe, replayable event store for SSE streaming.

    Events are appended to an internal list and never discarded (until
    the bus is cleaned up). Each SSE consumer calls ``iter_events()``
    which yields every event from a given cursor position, then waits
    for new ones.

    Thread safety:
        - ``push()`` may be called from any thread (the trainer's
          background thread). It uses a lock to guard the list and
          ``loop.call_soon_threadsafe`` to set the asyncio Event.
        - ``iter_events()`` is an async generator consumed by the
          FastAPI SSE endpoint on the main event loop.
    """

    def __init__(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop
        self._events: list[dict[str, Any]] = []
        self._lock = threading.Lock()
        # Signalled whenever a new event is pushed
        self._notify = asyncio.Event()
        self._finished = False

    # -- Producer API (called from trainer thread) --------------------------

    def push(self, msg: dict[str, Any]) -> None:
        """Append an event and wake any waiting consumers.

        Safe to call from any thread.
        """
        with self._lock:
            self._events.append(msg)
        # Wake up async consumers on the event loop thread
        self._loop.call_soon_threadsafe(self._notify.set)

    def mark_finished(self) -> None:
        """Signal that no more events will be produced."""
        self._finished = True
        self._loop.call_soon_threadsafe(self._notify.set)

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
