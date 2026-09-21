"""Controller: orchestrates process management, state transitions, and logging."""

from __future__ import annotations

from typing import Callable, Dict, List, Optional, Tuple

from core.event_logger import EventLogger
from process.process import Process
from process.process_manager import ProcessManager
from process.state_manager import StateManager


class Controller:
    """Single entry point between GUI and backend logic.

    The GUI calls controller methods; the controller delegates to
    ProcessManager and StateManager, and logs all events.
    """

    def __init__(self) -> None:
        self.process_manager = ProcessManager()
        self.state_manager = StateManager()
        self.event_logger = EventLogger()
        self._listeners: List[Callable[[], None]] = []

    def create_process(
        self,
        name: str,
        priority: int = 0,
        parent_pid: int = 0,
    ) -> Process:
        """Create a new process in NEW state.

        Args:
            name: Process name.
            priority: Process priority.
            parent_pid: PID of parent (0 for root process).

        Returns:
            The newly created Process.

        Raises:
            ValueError: If parent is invalid (nonexistent or self).
        """
        process = self.process_manager.create_process(
            name=name, priority=priority, parent_pid=parent_pid,
        )
        if parent_pid != 0:
            self.event_logger.log(
                f"P{process.pid} ({process.name}) CREATED (parent: P{parent_pid})"
            )
        else:
            self.event_logger.log(f"P{process.pid} ({process.name}) CREATED")
        self._notify()
        return process

    def admit(self, pid: int) -> Tuple[bool, str]:
        """Transition process from NEW to READY."""
        return self._do_transition(pid, "ADMIT")

    def dispatch(self, pid: int) -> Tuple[bool, str]:
        """Transition process from READY to RUNNING."""
        return self._do_transition(pid, "DISPATCH")

    def preempt(self, pid: int) -> Tuple[bool, str]:
        """Transition process from RUNNING to READY."""
        return self._do_transition(pid, "PREEMPT")

    def block(self, pid: int) -> Tuple[bool, str]:
        """Transition process from RUNNING to BLOCKED."""
        return self._do_transition(pid, "BLOCK")

    def wake(self, pid: int) -> Tuple[bool, str]:
        """Transition process from BLOCKED to READY."""
        return self._do_transition(pid, "WAKE")

    def terminate(self, pid: int) -> Tuple[bool, str]:
        """Transition process from RUNNING to TERMINATED."""
        return self._do_transition(pid, "TERMINATE")

    def get_process(self, pid: int) -> Optional[Process]:
        """Retrieve a process by PID."""
        return self.process_manager.get_process(pid)

    def get_all_processes(self) -> List[Process]:
        """Return all processes."""
        return self.process_manager.get_all_processes()

    def get_valid_actions(self, pid: int) -> List[str]:
        """Return valid actions for a process."""
        process = self.process_manager.get_process(pid)
        if process is None:
            return []
        return self.state_manager.get_valid_actions(process)

    def get_parent(self, pid: int) -> Optional[Process]:
        """Return the parent process, or None if root."""
        return self.process_manager.get_parent(pid)

    def get_children(self, pid: int) -> List[Process]:
        """Return the list of child processes."""
        return self.process_manager.get_children(pid)

    def get_process_tree(self) -> Dict[int, List[int]]:
        """Return the parent-to-children PID mapping."""
        return self.process_manager.get_process_tree()

    def reset(self) -> None:
        """Clear all processes, events, and reset PID generation."""
        self.process_manager.clear()
        self.event_logger.clear()
        self.event_logger.log("SIMULATION RESET")
        self._notify()

    def add_listener(self, callback: Callable[[], None]) -> None:
        """Register a callback to be notified when state changes."""
        self._listeners.append(callback)

    def remove_listener(self, callback: Callable[[], None]) -> None:
        """Unregister a callback."""
        self._listeners.remove(callback)

    def _do_transition(self, pid: int, action: str) -> Tuple[bool, str]:
        """Perform a state transition and log the result."""
        process = self.process_manager.get_process(pid)
        if process is None:
            return False, f"Process P{pid} not found"

        success, from_state, to_state = self.state_manager.transition(process, action)

        if success:
            self.event_logger.log(
                f"P{process.pid} ({process.name}) {from_state} -> {to_state}"
            )
        else:
            self.event_logger.log(
                f"P{process.pid} ({process.name}) REJECTED: {process.state} -> {action}"
            )

        self._notify()
        return success, action

    def _notify(self) -> None:
        """Notify all registered listeners."""
        for listener in self._listeners:
            listener()
