"""Process Tree: hierarchical view of parent-child relationships."""

from __future__ import annotations

import tkinter as tk
import tkinter.ttk as ttk
from typing import Callable, Dict, List, Optional

from process.process import Process


class ProcessTree(tk.Frame):
    """Frame containing a ttk.Treeview showing process hierarchy.

    Uses native Treeview hierarchy (iid-based parent/child).
    Selecting a node calls on_select(pid).
    """

    def __init__(self, master: tk.Widget, on_select: Optional[Callable[[int], None]] = None, **kwargs) -> None:
        super().__init__(master, **kwargs)
        self._on_select = on_select
        self._pid_to_iid: Dict[int, str] = {}
        self._build_ui()

    def _build_ui(self) -> None:
        header = tk.Frame(self, bg="#F0F2F5")
        header.pack(fill="x")
        tk.Label(
            header, text="Process Tree", font=("Helvetica", 10, "bold"),
            bg="#F0F2F5", fg="#212121",
        ).pack(anchor="w", padx=4, pady=(0, 4))

        tree_frame = tk.Frame(self)
        tree_frame.pack(fill="both", expand=True)

        self._tree = ttk.Treeview(
            tree_frame,
            columns=("info",),
            show="tree",
            height=6,
            selectmode="browse",
        )
        self._tree.column("#0", width=180, stretch=True)
        self._tree.column("info", width=0, stretch=False)

        scrollbar = ttk.Scrollbar(tree_frame, orient="vertical", command=self._tree.yview)
        self._tree.configure(yscrollcommand=scrollbar.set)

        self._tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        self._tree.bind("<<TreeviewSelect>>", self._on_tree_select)

    def _on_tree_select(self, event: tk.Event) -> None:
        selection = self._tree.selection()
        if selection and self._on_select:
            iid = selection[0]
            tag = self._tree.item(iid, "tags")
            if tag:
                try:
                    pid = int(tag[0])
                    self._on_select(pid)
                except (ValueError, IndexError):
                    pass

    def update_tree(
        self,
        processes: List[Process],
        tree_dict: Dict[int, List[int]],
        selected_pid: Optional[int] = None,
    ) -> None:
        """Rebuild the tree from process list and parent-child mapping.

        Args:
            processes: All current processes.
            tree_dict: Mapping from parent PID to list of child PIDs.
            selected_pid: Currently selected process PID.
        """
        self._tree.delete(*self._tree.get_children())
        self._pid_to_iid.clear()

        pid_set = {p.pid for p in processes}
        proc_map = {p.pid: p for p in processes}

        root_pids = sorted(
            [p.pid for p in processes if p.pcb.parent_pid == 0 or p.pcb.parent_pid not in pid_set]
        )

        for pid in root_pids:
            self._insert_node(pid, proc_map, tree_dict, "", selected_pid)

    def _insert_node(
        self,
        pid: int,
        proc_map: Dict[int, Process],
        tree_dict: Dict[int, List[int]],
        parent_iid: str,
        selected_pid: Optional[int],
    ) -> None:
        proc = proc_map.get(pid)
        if proc is None:
            return

        label = f"P{proc.pid} ({proc.name}) [{proc.state}]"
        is_selected = (pid == selected_pid)
        tag = str(pid)

        iid = self._tree.insert(
            parent_iid, "end",
            text=label,
            tags=(tag,),
        )
        self._pid_to_iid[pid] = iid

        if is_selected:
            self._tree.selection_set(iid)
            self._tree.see(iid)

        children = tree_dict.get(pid, [])
        for child_pid in sorted(children):
            if child_pid in proc_map:
                self._insert_node(child_pid, proc_map, tree_dict, iid, selected_pid)
