"""Process Manager: maintains the process table and PID generation."""

from __future__ import annotations

from typing import Dict, Optional

from process.process import Process


class ProcessManager:
    """Manages process creation, lookup, and storage.

    Uses a dictionary keyed by PID. PIDs are never recycled in V1.0.
    """

    def __init__(self) -> None:
        self._processes: Dict[int, Process] = {}
        self._next_pid: int = 1

    def create_process(self, name: str, priority: int = 0, parent_pid: int = 0) -> Process:
        """Create a new process with a unique PID. Starts in NEW state."""
        pid = self._next_pid
        self._next_pid += 1
        process = Process(pid=pid, name=name, priority=priority, parent_pid=parent_pid)
        self._processes[pid] = process
        return process

    def get_process(self, pid: int) -> Optional[Process]:
        """Retrieve a process by PID."""
        return self._processes.get(pid)

    def get_all_processes(self) -> list[Process]:
        """Return all processes as a list."""
        return list(self._processes.values())

    def remove_process(self, pid: int) -> Optional[Process]:
        """Remove and return a process by PID."""
        return self._processes.pop(pid, None)

    def clear(self) -> None:
        """Remove all processes and reset PID generation."""
        self._processes.clear()
        self._next_pid = 1

    @property
    def next_pid(self) -> int:
        return self._next_pid
