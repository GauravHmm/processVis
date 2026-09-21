"""Dashboard: main application window with modern styling, animation, and hierarchy."""

from __future__ import annotations

import tkinter as tk
import tkinter.ttk as ttk
from typing import Optional

from core.controller import Controller
from gui.pcb_viewer import PCBViewer
from gui.process_table import ProcessTable
from gui.process_tree import ProcessTree
from gui.state_visualizer import StateVisualizer
import gui.theme as T


class Dashboard(tk.Tk):
    """Main application window for V1.1.

    Layout:
      Header bar
      Left panel:  Create form | Transitions | Process tree
      Right panel: State diagram | PCB viewer
      Bottom:      Process table | Reset button
      Footer:      Event log
    """

    def __init__(self) -> None:
        super().__init__()
        self.title("Process Creation and State Transition Visualizer")
        self.geometry("1140x780")
        self.minsize(960, 640)
        self.configure(bg=T.BG_WINDOW)

        self.style = ttk.Style(self)
        T.apply_theme(self.style)

        self.controller = Controller()
        self.controller.add_listener(self._refresh)

        self._selected_pid: Optional[int] = None
        self._pending_animation: Optional[tuple] = None
        self._refreshing: bool = False

        self._build_ui()
        self._refresh()

    # ── UI Construction ────────────────────────────────────────────

    def _build_ui(self) -> None:
        self._build_header()
        main = tk.Frame(self, bg=T.BG_WINDOW)
        main.pack(fill="both", expand=True, padx=T.PAD_LG, pady=(T.PAD_MD, 0))

        left = tk.Frame(main, bg=T.BG_WINDOW)
        left.pack(side="left", fill="both", expand=True, padx=(0, T.PAD_MD))

        right = tk.Frame(main, bg=T.BG_WINDOW)
        right.pack(side="right", fill="both", expand=True, padx=(T.PAD_MD, 0))

        self._build_creation_form(left)
        self._build_transition_controls(left)
        self._build_process_tree(left)

        self._build_state_visualizer(right)
        self._build_pcb_viewer(right)

        self._build_bottom_bar()
        self._build_event_log()

    def _build_header(self) -> None:
        header = tk.Frame(self, bg=T.BG_HEADER, height=52)
        header.pack(fill="x")
        header.pack_propagate(False)
        tk.Label(
            header, text="Process Creation and State Transition Visualizer",
            bg=T.BG_HEADER, fg=T.TEXT_LIGHT, font=T.FONT_HEADER,
        ).pack(side="left", padx=T.PAD_XL, pady=T.PAD_MD)
        tk.Label(
            header, text="Operating Systems — Educational Simulation",
            bg=T.BG_HEADER, fg="#78909C", font=T.FONT_SMALL,
        ).pack(side="left", padx=(0, T.PAD_XL), pady=T.PAD_MD)

    def _build_creation_form(self, parent: tk.Widget) -> None:
        card = tk.Frame(parent, bg=T.BG_CARD, relief="solid", bd=1)
        card.pack(fill="x", pady=(0, T.PAD_MD))

        tk.Label(
            card, text="Create Process", font=T.FONT_SECTION,
            bg=T.BG_CARD, fg=T.TEXT_PRIMARY,
        ).pack(anchor="w", padx=T.PAD_LG, pady=(T.PAD_MD, T.PAD_SM))

        row1 = tk.Frame(card, bg=T.BG_CARD)
        row1.pack(fill="x", padx=T.PAD_LG, pady=(0, T.PAD_SM))
        tk.Label(row1, text="Name:", bg=T.BG_CARD, font=T.FONT_SMALL, fg=T.TEXT_SECONDARY).pack(side="left")
        self._entry_name = tk.Entry(row1, width=12, font=T.FONT_BODY)
        self._entry_name.pack(side="left", padx=(T.PAD_SM, T.PAD_LG))
        self._entry_name.insert(0, "P1")

        tk.Label(row1, text="Priority:", bg=T.BG_CARD, font=T.FONT_SMALL, fg=T.TEXT_SECONDARY).pack(side="left")
        self._entry_priority = tk.Entry(row1, width=5, font=T.FONT_BODY)
        self._entry_priority.pack(side="left", padx=(T.PAD_SM, T.PAD_LG))
        self._entry_priority.insert(0, "0")

        row2 = tk.Frame(card, bg=T.BG_CARD)
        row2.pack(fill="x", padx=T.PAD_LG, pady=(0, T.PAD_MD))
        tk.Label(row2, text="Parent:", bg=T.BG_CARD, font=T.FONT_SMALL, fg=T.TEXT_SECONDARY).pack(side="left")
        self._parent_var = tk.StringVar(value="None (root)")
        self._parent_combo = ttk.Combobox(
            row2, textvariable=self._parent_var,
            values=["None (root)"], state="readonly", width=14, font=T.FONT_BODY,
        )
        self._parent_combo.pack(side="left", padx=(T.PAD_SM, T.PAD_LG))

        ttk.Button(
            row2, text="+ Create", style="Green.TButton",
            command=self._on_create,
        ).pack(side="left", padx=T.PAD_SM)

    def _build_transition_controls(self, parent: tk.Widget) -> None:
        card = tk.Frame(parent, bg=T.BG_CARD, relief="solid", bd=1)
        card.pack(fill="x", pady=(0, T.PAD_MD))

        tk.Label(
            card, text="State Transitions", font=T.FONT_SECTION,
            bg=T.BG_CARD, fg=T.TEXT_PRIMARY,
        ).pack(anchor="w", padx=T.PAD_LG, pady=(T.PAD_MD, T.PAD_SM))

        grid = tk.Frame(card, bg=T.BG_CARD)
        grid.pack(fill="x", padx=T.PAD_LG, pady=(0, T.PAD_MD))

        self._buttons: dict[str, ttk.Button] = {}
        actions = [
            ("ADMIT", "Accent.TButton"),
            ("DISPATCH", "Orange.TButton"),
            ("PREEMPT", "Orange.TButton"),
            ("BLOCK", "Red.TButton"),
            ("WAKE", "Teal.TButton"),
            ("TERMINATE", "Purple.TButton"),
        ]
        for i, (action, style_name) in enumerate(actions):
            btn = ttk.Button(
                grid, text=action, style=style_name,
                command=lambda a=action: self._on_transition(a),
            )
            btn.grid(row=i // 3, column=i % 3, padx=T.PAD_XS, pady=T.PAD_XS, sticky="ew")
            self._buttons[action] = btn

        for c in range(3):
            grid.columnconfigure(c, weight=1)

    def _build_process_tree(self, parent: tk.Widget) -> None:
        card = tk.Frame(parent, bg=T.BG_CARD, relief="solid", bd=1)
        card.pack(fill="both", expand=True)
        self._process_tree = ProcessTree(card, on_select=self._on_select_process)
        self._process_tree.pack(fill="both", expand=True, padx=T.PAD_SM, pady=T.PAD_SM)

    def _build_state_visualizer(self, parent: tk.Widget) -> None:
        card = tk.Frame(parent, bg=T.BG_CARD, relief="solid", bd=1)
        card.pack(fill="x", pady=(0, T.PAD_MD))

        tk.Label(
            card, text="State Diagram", font=T.FONT_SECTION,
            bg=T.BG_CARD, fg=T.TEXT_PRIMARY,
        ).pack(anchor="w", padx=T.PAD_LG, pady=(T.PAD_MD, T.PAD_SM))

        self._state_viz = StateVisualizer(card)
        self._state_viz.pack(fill="x", padx=T.PAD_SM, pady=(0, T.PAD_SM), ipady=4)

    def _build_pcb_viewer(self, parent: tk.Widget) -> None:
        card = tk.Frame(parent, bg=T.BG_CARD, relief="solid", bd=1)
        card.pack(fill="both", expand=True)
        self._pcb_viewer = PCBViewer(card)
        self._pcb_viewer.pack(fill="both", expand=True, padx=T.PAD_SM, pady=T.PAD_SM)

    def _build_bottom_bar(self) -> None:
        bar = tk.Frame(self, bg=T.BG_WINDOW)
        bar.pack(fill="x", padx=T.PAD_LG, pady=(T.PAD_MD, 0))

        self._process_table = ProcessTable(bar, on_select=self._on_select_process)
        self._process_table.pack(side="left", fill="both", expand=True, padx=(0, T.PAD_MD))

        right_side = tk.Frame(bar, bg=T.BG_WINDOW)
        right_side.pack(side="right", fill="y")

        ttk.Button(
            right_side, text="Reset Simulation", style="Danger.TButton",
            command=self._on_reset,
        ).pack(anchor="ne")

    def _build_event_log(self) -> None:
        footer = tk.Frame(self, bg=T.BG_WINDOW)
        footer.pack(fill="x", padx=T.PAD_LG, pady=(T.PAD_MD, T.PAD_LG))

        card = tk.Frame(footer, bg=T.BG_CARD, relief="solid", bd=1)
        card.pack(fill="both", expand=True)

        tk.Label(
            card, text="Event Log", font=T.FONT_SECTION,
            bg=T.BG_CARD, fg=T.TEXT_PRIMARY,
        ).pack(anchor="w", padx=T.PAD_LG, pady=(T.PAD_MD, T.PAD_SM))

        log_frame = tk.Frame(card, bg=T.BG_CARD)
        log_frame.pack(fill="both", expand=True, padx=T.PAD_SM, pady=(0, T.PAD_SM))

        self._log_text = tk.Text(
            log_frame, height=8, state="disabled",
            font=T.FONT_MONO_SMALL, bg="#FAFAFA", fg=T.TEXT_PRIMARY,
            wrap="word", relief="solid", bd=1, padx=T.PAD_SM, pady=T.PAD_SM,
        )
        scroll = ttk.Scrollbar(log_frame, command=self._log_text.yview)
        self._log_text.configure(yscrollcommand=scroll.set)
        self._log_text.pack(side="left", fill="both", expand=True)
        scroll.pack(side="right", fill="y")

        # Log entry color tags
        self._log_text.tag_configure("created", foreground=T.LOG_CREATED)
        self._log_text.tag_configure("transition", foreground=T.LOG_TRANSITION)
        self._log_text.tag_configure("rejected", foreground=T.LOG_REJECTED)
        self._log_text.tag_configure("reset", foreground=T.LOG_RESET)
        self._log_text.tag_configure("timestamp", foreground=T.TEXT_MUTED)

    # ── Event Handlers ─────────────────────────────────────────────

    def _on_create(self) -> None:
        name = self._entry_name.get().strip()
        if not name:
            return
        try:
            priority = int(self._entry_priority.get().strip())
        except ValueError:
            priority = 0

        parent_pid = 0
        parent_str = self._parent_var.get()
        if parent_str != "None (root)":
            try:
                parent_pid = int(parent_str.split()[0][1:])
            except (IndexError, ValueError):
                parent_pid = 0

        self.controller.create_process(name=name, priority=priority, parent_pid=parent_pid)
        self._auto_increment_name()
        self._refresh()

    def _on_transition(self, action: str) -> None:
        if self._selected_pid is None:
            return

        process = self.controller.get_process(self._selected_pid)
        if process is None:
            return

        from_state = process.state

        action_map = {
            "ADMIT": self.controller.admit,
            "DISPATCH": self.controller.dispatch,
            "PREEMPT": self.controller.preempt,
            "BLOCK": self.controller.block,
            "WAKE": self.controller.wake,
            "TERMINATE": self.controller.terminate,
        }
        fn = action_map.get(action)
        if fn:
            success, _ = fn(self._selected_pid)
            if success:
                to_state = process.state
                label = f"P{process.pid}"
                self._state_viz.animate_transition(from_state, to_state, label)

    def _on_select_process(self, pid: int) -> None:
        if self._refreshing:
            return
        self._selected_pid = pid
        self._refresh()

    def _on_reset(self) -> None:
        self.controller.reset()
        self._selected_pid = None
        self._entry_name.delete(0, "end")
        self._entry_name.insert(0, "P1")
        self._state_viz._animator.cancel()
        self._refresh()

    # ── Refresh ────────────────────────────────────────────────────

    def _refresh(self) -> None:
        self._refreshing = True
        try:
            self._do_refresh()
        finally:
            self._refreshing = False

    def _do_refresh(self) -> None:
        processes = self.controller.get_all_processes()
        tree = self.controller.get_process_tree()

        # Process table
        self._process_table.update_table(processes, self._selected_pid)

        # Process tree
        self._process_tree.update_tree(processes, tree, self._selected_pid)

        # Parent combobox
        current_parent = self._parent_var.get()
        parent_values = ["None (root)"]
        for p in processes:
            parent_values.append(f"P{p.pid} ({p.name})")
        self._parent_combo["values"] = parent_values
        if current_parent not in parent_values:
            self._parent_var.set("None (root)")

        # Selected process
        selected_process = None
        children_pids = []
        if self._selected_pid is not None:
            selected_process = self.controller.get_process(self._selected_pid)
            if selected_process:
                children = self.controller.get_children(self._selected_pid)
                children_pids = [c.pid for c in children]

        # PCB viewer
        self._pcb_viewer.display(selected_process, children_pids)

        # State visualizer
        if selected_process:
            label = f"P{selected_process.pid} ({selected_process.name})"
            self._state_viz.set_state(selected_process.state, label)
        else:
            self._state_viz.set_state(None, "")

        # Transition buttons
        if selected_process and selected_process.state != "TERMINATED":
            valid_actions = set(self.controller.get_valid_actions(selected_process.pid))
            for action, btn in self._buttons.items():
                btn.configure(state="normal" if action in valid_actions else "disabled")
        else:
            for btn in self._buttons.values():
                btn.configure(state="disabled")

        # Event log
        self._refresh_log()

    def _refresh_log(self) -> None:
        events = self.controller.event_logger.get_events()
        self._log_text.config(state="normal")
        self._log_text.delete("1.0", "end")
        for event in events:
            if "CREATED" in event and "REJECTED" not in event:
                tag = "created"
            elif "REJECTED" in event:
                tag = "rejected"
            elif "->" in event:
                tag = "transition"
            elif "RESET" in event:
                tag = "reset"
            else:
                tag = None

            if tag:
                self._log_text.insert("end", event + "\n", tag)
            else:
                self._log_text.insert("end", event + "\n")

        self._log_text.see("end")
        self._log_text.config(state="disabled")

    def _auto_increment_name(self) -> None:
        name = self._entry_name.get().strip()
        if name and name[-1].isdigit():
            prefix = name.rstrip("0123456789")
            num_part = name[len(prefix):]
            try:
                next_num = int(num_part) + 1
                self._entry_name.delete(0, "end")
                self._entry_name.insert(0, f"{prefix}{next_num}")
            except ValueError:
                pass
