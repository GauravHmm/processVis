"""Process Table: styled Treeview displaying all processes."""

from __future__ import annotations

import tkinter as tk
import tkinter.ttk as ttk
from typing import Callable, Optional

from process.process import Process


class ProcessTable(tk.Frame):
    """Frame containing a styled ttk.Treeview process table.

    Supports row selection via click and a callback.
    """

    COLUMNS = ("pid", "name", "state", "priority")
    HEADERS = ("PID", "Name", "State", "Priority")
    COL_WIDTHS = (60, 130, 100, 70)

    def __init__(self, master: tk.Widget, on_select: Optional[Callable[[int], None]] = None, **kwargs) -> None:
        super().__init__(master, **kwargs)
        self._on_select = on_select
        self._build_ui()

    def _build_ui(self) -> None:
        header_frame = tk.Frame(self, bg="#F0F2F5")
        header_frame.pack(fill="x")
        tk.Label(
            header_frame, text="Process Table", font=("Helvetica", 10, "bold"),
            bg="#F0F2F5", fg="#212121",
        ).pack(anchor="w", padx=4, pady=(0, 4))

        tree_frame = tk.Frame(self, bg="#FFFFFF")
        tree_frame.pack(fill="both", expand=True)

        self._tree = ttk.Treeview(
            tree_frame,
            columns=self.COLUMNS,
            show="headings",
            height=10,
            selectmode="browse",
        )

        for col, header, width in zip(self.COLUMNS, self.HEADERS, self.COL_WIDTHS):
            self._tree.heading(col, text=header, anchor="w")
            self._tree.column(col, width=width, minwidth=50, anchor="center")

        scrollbar = ttk.Scrollbar(tree_frame, orient="vertical", command=self._tree.yview)
        self._tree.configure(yscrollcommand=scrollbar.set)

        self._tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        self._tree.bind("<<TreeviewSelect>>", self._on_tree_select)

    def _on_tree_select(self, event: tk.Event) -> None:
        selection = self._tree.selection()
        if selection and self._on_select:
            item = selection[0]
            values = self._tree.item(item, "values")
            if values:
                pid = int(values[0])
                self._on_select(pid)

    def update_table(self, processes: list[Process], selected_pid: Optional[int] = None) -> None:
        self._tree.delete(*self._tree.get_children())
        for i, proc in enumerate(processes):
            tag = "selected" if proc.pid == selected_pid else ("even" if i % 2 == 0 else "odd")
            self._tree.insert(
                "", "end",
                values=(proc.pid, proc.name, proc.state, proc.priority),
                tags=(tag,),
            )
        self._tree.tag_configure("selected", background="#DBEAFE", foreground="#1565C0")
        self._tree.tag_configure("even", background="#FFFFFF")
        self._tree.tag_configure("odd", background="#F8F9FA")
