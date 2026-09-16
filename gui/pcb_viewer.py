"""PCB Viewer: displays the selected process's PCB fields."""

from __future__ import annotations

import tkinter as tk
from typing import Optional

from process.process import Process


class PCBViewer(tk.Frame):
    """Frame that displays PCB details for the selected process."""

    def __init__(self, master: tk.Widget, **kwargs) -> None:
        super().__init__(master, **kwargs)
        self._build_ui()

    def _build_ui(self) -> None:
        title = tk.Label(self, text="Process Control Block", font=("Helvetica", 11, "bold"))
        title.pack(anchor="w", pady=(0, 4))

        self._fields_frame = tk.Frame(self)
        self._fields_frame.pack(fill="both", expand=True)

        self._labels: dict[str, tk.Label] = {}
        fields = [
            "PID", "Process Name", "State", "Priority", "Parent PID",
            "Program Counter", "CPU Registers", "Memory Base",
            "Memory Limit", "Creation Time",
        ]
        for i, field_name in enumerate(fields):
            lbl_name = tk.Label(
                self._fields_frame, text=f"{field_name}:", anchor="w",
                font=("Helvetica", 9, "bold"),
            )
            lbl_name.grid(row=i, column=0, sticky="w", padx=(0, 8), pady=1)
            lbl_val = tk.Label(
                self._fields_frame, text="--", anchor="w",
                font=("Courier", 9),
            )
            lbl_val.grid(row=i, column=1, sticky="w", pady=1)
            self._labels[field_name] = lbl_val

    def display(self, process: Optional[Process]) -> None:
        """Update the viewer with a process's PCB data."""
        if process is None:
            for lbl in self._labels.values():
                lbl.config(text="--")
            return

        pcb = process.pcb
        reg_str = ", ".join(f"{k}={v}" for k, v in pcb.cpu_registers.items())
        data = {
            "PID": str(pcb.pid),
            "Process Name": pcb.name,
            "State": pcb.state,
            "Priority": str(pcb.priority),
            "Parent PID": str(pcb.parent_pid),
            "Program Counter": f"0x{pcb.program_counter:08X}",
            "CPU Registers": reg_str,
            "Memory Base": f"0x{pcb.memory_base:08X}",
            "Memory Limit": f"0x{pcb.memory_limit:08X}",
            "Creation Time": pcb.creation_time,
        }
        for field_name, value in data.items():
            if field_name in self._labels:
                self._labels[field_name].config(text=value)
