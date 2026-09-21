"""PCB Viewer: grouped card layout showing PCB details and children."""

from __future__ import annotations

import tkinter as tk
from typing import List, Optional

from process.process import Process


class PCBViewer(tk.Frame):
    """Frame that displays PCB details in grouped sections."""

    def __init__(self, master: tk.Widget, **kwargs) -> None:
        super().__init__(master, **kwargs)
        self._labels: dict[str, tk.Label] = {}
        self._build_ui()

    def _build_ui(self) -> None:
        header = tk.Frame(self, bg="#F0F2F5")
        header.pack(fill="x")
        tk.Label(
            header, text="Process Control Block", font=("Helvetica", 10, "bold"),
            bg="#F0F2F5", fg="#212121",
        ).pack(anchor="w", padx=4, pady=(0, 4))

        card = tk.Frame(self, bg="#FFFFFF", relief="solid", bd=1)
        card.pack(fill="x", pady=(0, 2))

        self._build_section(card, "Identity", [
            "PID", "Process Name", "State", "Priority", "Parent PID", "Children",
        ], 0)

        sep1 = tk.Frame(card, bg="#E0E0E0", height=1)
        sep1.grid(row=100, column=0, columnspan=2, sticky="ew", padx=8, pady=4)

        self._build_section(card, "CPU", [
            "Program Counter", "CPU Registers",
        ], 101)

        sep2 = tk.Frame(card, bg="#E0E0E0", height=1)
        sep2.grid(row=200, column=0, columnspan=2, sticky="ew", padx=8, pady=4)

        self._build_section(card, "Memory", [
            "Memory Base", "Memory Limit", "Creation Time",
        ], 201)

    def _build_section(self, parent: tk.Widget, title: str, fields: list[str], row_start: int) -> None:
        lbl = tk.Label(
            parent, text=title, font=("Helvetica", 9, "bold"),
            bg="#FFFFFF", fg="#616161", anchor="w",
        )
        lbl.grid(row=row_start, column=0, columnspan=2, sticky="w", padx=8, pady=(6, 2))

        for i, field_name in enumerate(fields):
            r = row_start + 1 + i
            name_lbl = tk.Label(
                parent, text=f"{field_name}:", anchor="w",
                font=("Helvetica", 9), bg="#FFFFFF", fg="#616161",
            )
            name_lbl.grid(row=r, column=0, sticky="w", padx=(16, 8), pady=1)

            val_lbl = tk.Label(
                parent, text="--", anchor="w",
                font=("Courier", 9, "bold"), bg="#FFFFFF", fg="#212121",
            )
            val_lbl.grid(row=r, column=1, sticky="w", pady=1)
            self._labels[field_name] = val_lbl

    def display(self, process: Optional[Process], children_pids: Optional[List[int]] = None) -> None:
        if process is None:
            for lbl in self._labels.values():
                lbl.config(text="--")
            return

        if children_pids is None:
            children_pids = []

        pcb = process.pcb
        reg_str = ", ".join(f"{k}={v}" for k, v in pcb.cpu_registers.items())
        children_str = ", ".join(f"P{c}" for c in children_pids) if children_pids else "None"

        data = {
            "PID": str(pcb.pid),
            "Process Name": pcb.name,
            "State": pcb.state,
            "Priority": str(pcb.priority),
            "Parent PID": str(pcb.parent_pid) if pcb.parent_pid != 0 else "None (root)",
            "Children": children_str,
            "Program Counter": f"0x{pcb.program_counter:08X}",
            "CPU Registers": reg_str,
            "Memory Base": f"0x{pcb.memory_base:08X}",
            "Memory Limit": f"0x{pcb.memory_limit:08X}",
            "Creation Time": pcb.creation_time,
        }
        for field_name, value in data.items():
            if field_name in self._labels:
                self._labels[field_name].config(text=value)
