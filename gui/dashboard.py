"""Dashboard: main application window tying all GUI components together."""

from __future__ import annotations

import tkinter as tk
import tkinter.ttk as ttk

from core.controller import Controller
from gui.pcb_viewer import PCBViewer
from gui.process_table import ProcessTable
from gui.state_visualizer import StateVisualizer


class Dashboard(tk.Tk):
    """Main application window.

    Composes the process table, PCB viewer, state visualizer,
    transition controls, event log, and creation form.
    All state mutations go through the Controller.
    """

    def __init__(self) -> None:
        super().__init__()
        self.title("Process Creation and State Transition Visualizer")
        self.geometry("1100x720")
        self.minsize(900, 600)

        self.controller = Controller()
        self.controller.add_listener(self._refresh)

        self._selected_pid: int | None = None

        self._build_ui()
        self._refresh()

    # ── UI construction ────────────────────────────────────────────

    def _build_ui(self) -> None:
        # Top bar
        top_bar = tk.Frame(self, bg="#1565C0", height=40)
        top_bar.pack(fill="x")
        tk.Label(
            top_bar, text="Process Creation and State Transition Visualizer",
            fg="white", bg="#1565C0", font=("Helvetica", 14, "bold"),
        ).pack(side="left", padx=12, pady=6)

        # Main content area
        main = tk.Frame(self)
        main.pack(fill="both", expand=True, padx=8, pady=8)

        left = tk.Frame(main)
        left.pack(side="left", fill="both", expand=True)

        right = tk.Frame(main)
        right.pack(side="right", fill="both", expand=True, padx=(8, 0))

        # ── Left column ────────────────────────────────────────
        self._build_creation_form(left)
        self._build_transition_controls(left)
        self._build_process_table(left)

        # ── Right column ───────────────────────────────────────
        self._build_state_visualizer(right)
        self._build_pcb_viewer(right)
        self._build_event_log(right)

        # Reset button at the bottom
        bottom = tk.Frame(self)
        bottom.pack(fill="x", padx=8, pady=(0, 8))
        tk.Button(
            bottom, text="RESET SIMULATION", command=self._on_reset,
            bg="#C62828", fg="white", font=("Helvetica", 10, "bold"),
            relief="flat", padx=16, pady=4,
        ).pack(side="right")

    def _build_creation_form(self, parent: tk.Widget) -> None:
        frame = tk.LabelFrame(parent, text="Create Process", padx=8, pady=6)
        frame.pack(fill="x", pady=(0, 8))

        row = tk.Frame(frame)
        row.pack(fill="x")

        tk.Label(row, text="Name:").pack(side="left")
        self._entry_name = tk.Entry(row, width=14)
        self._entry_name.pack(side="left", padx=(4, 12))
        self._entry_name.insert(0, "P1")

        tk.Label(row, text="Priority:").pack(side="left")
        self._entry_priority = tk.Entry(row, width=6)
        self._entry_priority.pack(side="left", padx=(4, 12))
        self._entry_priority.insert(0, "0")

        tk.Button(row, text="CREATE", command=self._on_create,
                  bg="#2E7D32", fg="white", relief="flat", padx=10).pack(side="left")

    def _build_transition_controls(self, parent: tk.Widget) -> None:
        frame = tk.LabelFrame(parent, text="State Transitions", padx=8, pady=6)
        frame.pack(fill="x", pady=(0, 8))

        self._buttons: dict[str, tk.Button] = {}
        actions = [
            ("ADMIT", "#1565C0"),
            ("DISPATCH", "#E65100"),
            ("PREEMPT", "#F57F17"),
            ("BLOCK", "#C62828"),
            ("WAKE", "#00838F"),
            ("TERMINATE", "#6A1B9A"),
        ]
        row = tk.Frame(frame)
        row.pack(fill="x")
        for action, color in actions:
            btn = tk.Button(
                row, text=action, command=lambda a=action: self._on_transition(a),
                bg=color, fg="white", relief="flat", padx=8, pady=2,
                font=("Helvetica", 9),
            )
            btn.pack(side="left", padx=2)
            self._buttons[action] = btn

    def _build_process_table(self, parent: tk.Widget) -> None:
        self._process_table = ProcessTable(parent, on_select=self._on_select_process)
        self._process_table.pack(fill="both", expand=True, pady=(0, 4))

    def _build_state_visualizer(self, parent: tk.Widget) -> None:
        frame = tk.LabelFrame(parent, text="State Diagram", padx=4, pady=4)
        frame.pack(fill="x", pady=(0, 8))
        self._state_viz = StateVisualizer(frame)
        self._state_viz.pack(fill="x")

    def _build_pcb_viewer(self, parent: tk.Widget) -> None:
        frame = tk.LabelFrame(parent, text="PCB Details", padx=8, pady=6)
        frame.pack(fill="x", pady=(0, 8))
        self._pcb_viewer = PCBViewer(frame)
        self._pcb_viewer.pack(fill="x")

    def _build_event_log(self, parent: tk.Widget) -> None:
        frame = tk.LabelFrame(parent, text="Event Log", padx=4, pady=4)
        frame.pack(fill="both", expand=True)

        self._log_text = tk.Text(
            frame, height=10, state="disabled",
            font=("Courier", 9), bg="#FAFAFA", wrap="word",
        )
        scroll = tk.Scrollbar(frame, command=self._log_text.yview)
        self._log_text.configure(yscrollcommand=scroll.set)
        self._log_text.pack(side="left", fill="both", expand=True)
        scroll.pack(side="right", fill="y")

    # ── Event handlers ─────────────────────────────────────────

    def _on_create(self) -> None:
        name = self._entry_name.get().strip()
        if not name:
            return
        try:
            priority = int(self._entry_priority.get().strip())
        except ValueError:
            priority = 0
        self.controller.create_process(name=name, priority=priority)
        # Auto-increment name for convenience
        self._auto_increment_name()

    def _on_transition(self, action: str) -> None:
        if self._selected_pid is None:
            return
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
            fn(self._selected_pid)

    def _on_select_process(self, pid: int) -> None:
        self._selected_pid = pid
        self._refresh()

    def _on_reset(self) -> None:
        self.controller.reset()
        self._selected_pid = None
        self._entry_name.delete(0, "end")
        self._entry_name.insert(0, "P1")
        self._refresh()

    # ── Refresh ────────────────────────────────────────────────

    def _refresh(self) -> None:
        """Update all GUI elements from the controller state."""
        processes = self.controller.get_all_processes()
        self._process_table.update_table(processes, self._selected_pid)

        # PCB viewer
        selected_process = None
        if self._selected_pid is not None:
            selected_process = self.controller.get_process(self._selected_pid)
        self._pcb_viewer.display(selected_process)

        # State visualizer
        if selected_process:
            label = f"P{selected_process.pid} ({selected_process.name})"
            self._state_viz.set_state(selected_process.state, label)
        else:
            self._state_viz.set_state(None, "")

        # Transition buttons
        if selected_process:
            valid_actions = set(self.controller.get_valid_actions(selected_process.pid))
            for action, btn in self._buttons.items():
                btn.config(state="normal" if action in valid_actions else "disabled")
        else:
            for btn in self._buttons.values():
                btn.config(state="disabled")

        # Event log
        self._refresh_log()

    def _refresh_log(self) -> None:
        """Update the event log text widget."""
        events = self.controller.event_logger.get_events()
        self._log_text.config(state="normal")
        self._log_text.delete("1.0", "end")
        for event in events:
            self._log_text.insert("end", event + "\n")
        self._log_text.see("end")
        self._log_text.config(state="disabled")

    def _auto_increment_name(self) -> None:
        """Try to auto-increment the process name (e.g. P1 -> P2)."""
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
