"""State Diagram Visualizer: Canvas-based process state machine."""

from __future__ import annotations

import tkinter as tk
from typing import Dict, Optional, Tuple


# State positions and colors
STATE_CONFIG: Dict[str, Tuple[int, int, str, str]] = {
    "NEW": (80, 60, "#E8F5E9", "#2E7D32"),
    "READY": (280, 60, "#E3F2FD", "#1565C0"),
    "RUNNING": (280, 200, "#FFF3E0", "#E65100"),
    "BLOCKED": (80, 200, "#FCE4EC", "#C62828"),
    "TERMINATED": (480, 200, "#F3E5F5", "#6A1B9A"),
}

BOX_W = 100
BOX_H = 50


class StateVisualizer(tk.Canvas):
    """Canvas widget that draws the process state diagram.

    Highlights the current state of the selected process and shows
    process name/PID inside or beside the current state box.
    """

    def __init__(self, master: tk.Widget, **kwargs) -> None:
        kwargs.setdefault("width", 600)
        kwargs.setdefault("height", 300)
        kwargs.setdefault("bg", "white")
        kwargs.setdefault("highlightthickness", 0)
        super().__init__(master, **kwargs)
        self._current_state: Optional[str] = None
        self._process_label: str = ""
        self._draw()

    def _draw(self) -> None:
        """Draw the complete state diagram."""
        self.delete("all")
        self._draw_arrows()
        self._draw_states()

    def _draw_arrows(self) -> None:
        """Draw all legal transition arrows."""
        arrows: list[Tuple[str, str, str]] = [
            ("NEW", "READY", ""),
            ("READY", "RUNNING", ""),
            ("RUNNING", "READY", ""),
            ("RUNNING", "BLOCKED", ""),
            ("RUNNING", "TERMINATED", ""),
            ("BLOCKED", "READY", ""),
        ]
        for src, dst, label in arrows:
            x1, y1, _, _ = STATE_CONFIG[src]
            x2, y2, _, _ = STATE_CONFIG[dst]
            sx = x1 + BOX_W // 2
            sy = y1 + BOX_H // 2
            ex = x2 + BOX_W // 2
            ey = y2 + BOX_H // 2

            # Offset start/end to box edges
            sx2, sy2 = self._edge_point(x1, y1, ex, ey)
            ex2, ey2 = self._edge_point(x2, y2, sx, sy)

            # Curved arrows for bidirectional pairs
            if (src, dst) in [("READY", "RUNNING"), ("RUNNING", "READY")]:
                if src == "READY":
                    sx2, sy2 = x1 + BOX_W, y1 + BOX_H // 4
                    ex2, ey2 = x2, y2 + BOX_H // 4
                else:
                    sx2, sy2 = x2, y2 + BOX_H * 3 // 4
                    ex2, ey2 = x1 + BOX_W, y1 + BOX_H * 3 // 4

            self.create_line(
                sx2, sy2, ex2, ey2,
                arrow=tk.LAST,
                arrowshape=(10, 12, 5),
                fill="#555555",
                width=1.5,
                smooth=True,
            )

    def _edge_point(self, bx: int, by: int, tx: int, ty: int) -> Tuple[int, int]:
        """Compute the point on the edge of a box closest to the target."""
        cx = bx + BOX_W // 2
        cy = by + BOX_H // 2
        dx = tx - cx
        dy = ty - cy
        if dx == 0 and dy == 0:
            return cx, cy

        # Check horizontal / vertical intersection
        half_w = BOX_W // 2
        half_h = BOX_H // 2

        if dx == 0:
            return cx, by + (half_h if dy > 0 else 0)
        if dy == 0:
            return bx + (half_w if dx > 0 else 0), cy

        # Diagonal: find which edge it hits first
        scale_x = half_w / abs(dx)
        scale_y = half_h / abs(dy)
        scale = min(scale_x, scale_y)
        return int(cx + dx * scale), int(cy + dy * scale)

    def _draw_states(self) -> None:
        """Draw state boxes, highlighting the current state."""
        for state, (x, y, bg, border) in STATE_CONFIG.items():
            is_current = (state == self._current_state)
            fill = border if is_current else bg
            outline = border
            width = 3 if is_current else 1

            self.create_rectangle(
                x, y, x + BOX_W, y + BOX_H,
                fill=fill,
                outline=outline,
                width=width,
            )

            text_color = "white" if is_current else "#333333"
            self.create_text(
                x + BOX_W // 2,
                y + BOX_H // 2 - (10 if self._process_label and is_current else 0),
                text=state,
                fill=text_color,
                font=("Helvetica", 10, "bold" if is_current else "normal"),
            )

            if is_current and self._process_label:
                self.create_text(
                    x + BOX_W // 2,
                    y + BOX_H // 2 + 10,
                    text=self._process_label,
                    fill="white",
                    font=("Helvetica", 8),
                )

    def set_state(self, state: Optional[str], process_label: str = "") -> None:
        """Update the highlighted state and process label."""
        self._current_state = state
        self._process_label = process_label
        self._draw()
