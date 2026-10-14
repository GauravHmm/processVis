"""Process Manager: maintains the process table, PID generation, and hierarchy."""

from __future__ import annotations

from typing import Dict, List, Optional

from process.process import Process


class ProcessManager:
    """Manages process creation, lookup, storage, and parent-child hierarchy.

    Uses a dictionary keyed by PID. PIDs are never recycled once issued.
    A process may have zero or one parent and zero or more children.
    """

    def __init__(self) -> None:
        self._processes: Dict[int, Process] = {}
        self._children: Dict[int, List[int]] = {}
        self._next_pid: int = 1

    def create_process(
        self,
        name: str,
        priority: int = 0,
        parent_pid: int = 0,
    ) -> Process:
        """Create a new process with a unique PID. Starts in NEW state.

        Args:
            name: Process name.
            priority: Process priority.
            parent_pid: PID of parent process (0 for root process).

        Returns:
            The newly created Process.

        Raises:
            ValueError: If parent_pid refers to a nonexistent process,
                        or if a process is its own parent.
        """
        if parent_pid != 0:
            if parent_pid == self._next_pid:
                raise ValueError("A process cannot be its own parent")
            if parent_pid not in self._processes:
                raise ValueError(f"Parent process P{parent_pid} does not exist")

        pid = self._next_pid
        self._next_pid += 1
        process = Process(pid=pid, name=name, priority=priority, parent_pid=parent_pid)
        self._processes[pid] = process
        self._children.setdefault(pid, [])

        if parent_pid != 0:
            self._children.setdefault(parent_pid, [])
            self._children[parent_pid].append(pid)

        return process

    def get_process(self, pid: int) -> Optional[Process]:
        """Retrieve a process by PID."""
        return self._processes.get(pid)

    def get_parent(self, pid: int) -> Optional[Process]:
        """Return the parent process, or None if root or not found."""
        process = self._processes.get(pid)
        if process is None or process.pcb.parent_pid == 0:
            return None
        return self._processes.get(process.pcb.parent_pid)

    def get_children(self, pid: int) -> List[Process]:
        """Return the list of child processes for a given PID."""
        child_pids = self._children.get(pid, [])
        return [self._processes[p] for p in child_pids if p in self._processes]

    def get_process_tree(self) -> Dict[int, List[int]]:
        """Return the parent-to-children mapping.

        Returns a copy of the internal children dictionary.
        Keys are PIDs, values are lists of child PIDs.
        Only includes PIDs that still exist in the process table.
        """
        return {
            pid: [c for c in children if c in self._processes]
            for pid, children in self._children.items()
            if pid in self._processes
        }

    def get_all_processes(self) -> List[Process]:
        """Return all processes as a list."""
        return list(self._processes.values())

    def remove_process(self, pid: int) -> Optional[Process]:
        """Remove and return a process by PID.

        Removes from parent's children list but preserves
        the removed process's own children list (children stay alive).
        """
        process = self._processes.pop(pid, None)
        if process is None:
            return None

        # Remove from parent's children list
        parent_pid = process.pcb.parent_pid
        if parent_pid != 0 and parent_pid in self._children:
            self._children[parent_pid] = [
                c for c in self._children[parent_pid] if c != pid
            ]

        return process

    def clear(self) -> None:
        """Remove all processes, hierarchy, and reset PID generation."""
        self._processes.clear()
        self._children.clear()
        self._next_pid = 1

    @property
    def next_pid(self) -> int:
        return self._next_pid
