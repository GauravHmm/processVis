"""Process Table: displays all processes in a scrollable table."""

from __future__ import annotations

import tkinter as tk
import tkinter.ttk as ttk
from typing import Callable, Optional

from process.process import Process


class ProcessTable(tk.Frame):
    """Frame containing a Treeview-style process table.

    Supports row selection via click and a callback.
    """

    COLUMNS = ("pid", "name", "state", "priority")
    HEADERS = ("PID", "Name", "State", "Priority")

    def __init__(self, master: tk.Widget, on_select: Optional[Callable[[int], None]] = None, **kwargs) -> None:
        super().__init__(master, **kwargs)
        self._on_select = on_select
        self._build_ui()

    def _build_ui(self) -> None:
        title = tk.Label(self, text="Process Table", font=("Helvetica", 11, "bold"))
        title.pack(anchor="w", pady=(0, 4))

        tree_frame = tk.Frame(self)
        tree_frame.pack(fill="both", expand=True)

        self._tree = ttk.Treeview(
            tree_frame,
            columns=self.COLUMNS,
            show="headings",
            height=10,
            selectmode="browse",
        )

        for col, header in zip(self.COLUMNS, self.HEADERS):
            self._tree.heading(col, text=header)
            self._tree.column(col, width=80, anchor="center")

        scrollbar = ttk.Scrollbar(tree_frame, orient="vertical", command=self._tree.yview)
        self._tree.configure(yscrollcommand=scrollbar.set)

        self._tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        self._tree.bind("<<TreeviewSelect>>", self._on_tree_select)

    def _on_tree_select(self, event: tk.Event) -> None:
        """Handle row selection."""
        selection = self._tree.selection()
        if selection and self._on_select:
            item = selection[0]
            values = self._tree.item(item, "values")
            if values:
                pid = int(values[0])
                self._on_select(pid)

    def update_table(self, processes: list[Process], selected_pid: Optional[int] = None) -> None:
        """Refresh the table contents."""
        self._tree.delete(*self._tree.get_children())
        for proc in processes:
            tag = "selected" if proc.pid == selected_pid else ()
            self._tree.insert(
                "", "end",
                values=(proc.pid, proc.name, proc.state, proc.priority),
                tags=(tag,),
            )
        self._tree.tag_configure("selected", background="#BBDEFB")
