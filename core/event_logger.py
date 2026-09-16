"""Event Logger: records simulation events with timestamps."""

from __future__ import annotations

from datetime import datetime
from typing import Callable, List


class EventLogger:
    """Maintains an ordered list of simulation events."""

    def __init__(self) -> None:
        self._events: List[str] = []
        self._listeners: List[Callable[[str], None]] = []

    def log(self, message: str) -> None:
        """Record an event with a timestamp."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        entry = f"[{timestamp}] {message}"
        self._events.append(entry)
        for listener in self._listeners:
            listener(entry)

    def get_events(self) -> List[str]:
        """Return all logged events."""
        return list(self._events)

    def clear(self) -> None:
        """Clear all events."""
        self._events.clear()

    def add_listener(self, callback: Callable[[str], None]) -> None:
        """Register a callback to be notified of new events."""
        self._listeners.append(callback)

    def remove_listener(self, callback: Callable[[str], None]) -> None:
        """Unregister a callback."""
        self._listeners.remove(callback)
