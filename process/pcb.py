"""Process Control Block (PCB) representation for the simulation."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict


@dataclass
class PCB:
    """Simulated Process Control Block.

    Contains educational/simulated values for process metadata.
    These are NOT real CPU registers or real memory addresses.
    """

    pid: int
    name: str
    state: str = "NEW"
    priority: int = 0
    parent_pid: int = 0
    program_counter: int = 0
    cpu_registers: Dict[str, int] = field(default_factory=dict)
    memory_base: int = 0
    memory_limit: int = 0
    creation_time: str = field(default_factory=lambda: datetime.now().strftime("%H:%M:%S"))

    def __post_init__(self) -> None:
        if not self.cpu_registers:
            self.cpu_registers = {
                "AX": random.randint(0, 255),
                "BX": random.randint(0, 255),
                "CX": random.randint(0, 255),
                "DX": random.randint(0, 255),
            }
        if self.memory_base == 0 and self.memory_limit == 0:
            self.memory_base = random.randint(0x1000, 0x7FFF) * 4096
            self.memory_limit = random.choice([4096, 8192, 16384, 32768])

    def to_dict(self) -> Dict[str, object]:
        """Return PCB contents as a dictionary for display."""
        return {
            "PID": self.pid,
            "Process Name": self.name,
            "State": self.state,
            "Priority": self.priority,
            "Parent PID": self.parent_pid,
            "Program Counter": f"0x{self.program_counter:08X}",
            "CPU Registers": self.cpu_registers,
            "Memory Base": f"0x{self.memory_base:08X}",
            "Memory Limit": f"0x{self.memory_limit:08X}",
            "Creation Time": self.creation_time,
        }
