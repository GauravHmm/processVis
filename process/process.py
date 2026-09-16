"""Process representation for the simulation."""

from __future__ import annotations

from process.pcb import PCB


class Process:
    """Simulated process wrapping a PCB."""

    def __init__(self, pid: int, name: str, priority: int = 0, parent_pid: int = 0) -> None:
        self.pcb = PCB(
            pid=pid,
            name=name,
            priority=priority,
            parent_pid=parent_pid,
        )

    @property
    def pid(self) -> int:
        return self.pcb.pid

    @property
    def name(self) -> str:
        return self.pcb.name

    @property
    def state(self) -> str:
        return self.pcb.state

    @state.setter
    def state(self, value: str) -> None:
        self.pcb.state = value

    @property
    def priority(self) -> int:
        return self.pcb.priority

    def __repr__(self) -> str:
        return f"Process(pid={self.pid}, name='{self.name}', state='{self.state}')"
