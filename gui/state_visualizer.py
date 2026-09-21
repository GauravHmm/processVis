"""State Diagram Visualizer: responsive Canvas with rounded boxes, shadows, and animation."""

from __future__ import annotations

import tkinter as tk
import math
from typing import Dict, Optional, Tuple, List

from gui.animation import Animator
from gui.theme import STATE_COLORS, TEXT_PRIMARY, TEXT_SECONDARY, BORDER


# Relative positions (fractions of canvas size)
STATE_RELPOS: Dict[str, Tuple[float, float]] = {
    "NEW": (0.10, 0.22),
    "READY": (0.40, 0.22),
    "RUNNING": (0.40, 0.68),
    "BLOCKED": (0.10, 0.68),
    "TERMINATED": (0.72, 0.68),
}

ARROWS: List[Tuple[str, str, str]] = [
    ("NEW", "READY", "ADMIT"),
    ("READY", "RUNNING", "DISPATCH"),
    ("RUNNING", "READY", "PREEMPT"),
    ("RUNNING", "BLOCKED", "BLOCK"),
    ("RUNNING", "TERMINATED", "TERMINATE"),
    ("BLOCKED", "READY", "WAKE"),
]


class StateVisualizer(tk.Canvas):
    """Canvas widget that draws a responsive process state diagram.

    Features:
    - Responsive sizing (recalculates on resize)
    - Rounded boxes with drop shadows
    - Current-state glow highlight
    - Arrow labels for transitions
    - Token animation support
    """

    def __init__(self, master: tk.Widget, **kwargs) -> None:
        kwargs.setdefault("width", 620)
        kwargs.setdefault("height", 320)
        kwargs.setdefault("bg", "#FFFFFF")
        kwargs.setdefault("highlightthickness", 0)
        super().__init__(master, **kwargs)

        self._current_state: Optional[str] = None
        self._process_label: str = ""
        self._animator = Animator(self)
        self._box_rects: Dict[str, Tuple[int, int, int, int]] = {}
        self._token_items: List[int] = []

        self.bind("<Configure>", self._on_resize)

    def _on_resize(self, event: tk.Event) -> None:
        self._draw()

    def _draw(self) -> None:
        self.delete("all")
        self._box_rects.clear()
        self._draw_arrows()
        self._draw_states()

    def _get_box_rect(self, state: str) -> Tuple[int, int, int, int]:
        w = self.winfo_width()
        h = self.winfo_height()
        bx, by = STATE_RELPOS[state]
        box_w = max(90, int(w * 0.15))
        box_h = max(44, int(h * 0.18))
        cx = int(bx * w)
        cy = int(by * h)
        return (cx - box_w // 2, cy - box_h // 2, cx + box_w // 2, cy + box_h // 2)

    def _get_box_center(self, state: str) -> Tuple[int, int]:
        x1, y1, x2, y2 = self._get_box_rect(state)
        return (x1 + x2) // 2, (y1 + y2) // 2

    def _rounded_rect(self, x1: int, y1: int, x2: int, y2: int, r: int, **kwargs) -> int:
        """Draw a rounded rectangle and return the item group."""
        points = [
            x1 + r, y1,
            x2 - r, y1,
            x2, y1,
            x2, y1 + r,
            x2, y2 - r,
            x2, y2,
            x2 - r, y2,
            x1 + r, y2,
            x1, y2,
            x1, y2 - r,
            x1, y1 + r,
            x1, y1,
        ]
        return self.create_polygon(points, smooth=True, **kwargs)

    def _draw_arrows(self) -> None:
        w = self.winfo_width()
        if w < 10:
            return

        for src, dst, label in ARROWS:
            sx, sy = self._get_box_center(src)
            dx, dy = self._get_box_center(dst)

            # Offset for bidirectional arrows
            if (src, dst) == ("READY", "RUNNING"):
                sx2, sy2 = sx, sy - 6
                dx2, dy2 = dx, dy - 6
            elif (src, dst) == ("RUNNING", "READY"):
                sx2, sy2 = sx, sy + 6
                dx2, dy2 = dx, dy + 6
            else:
                sx2, sy2 = sx, sy
                dx2, dy2 = dx, dy

            # Compute edge points
            ex1, ey1 = self._edge_point(src, dx2, dy2)
            ex2, ey2 = self._edge_point(dst, sx2, sy2)

            self.create_line(
                ex1, ey1, ex2, ey2,
                arrow=tk.LAST,
                arrowshape=(8, 10, 4),
                fill="#90A4AE",
                width=1.8,
            )

            # Arrow label
            mx = (ex1 + ex2) // 2
            my = (ey1 + ey2) // 2
            # Offset label perpendicular to arrow
            adx = ex2 - ex1
            ady = ey2 - ey1
            length = math.sqrt(adx * adx + ady * ady)
            if length > 0:
                nx = -ady / length * 12
                ny = adx / length * 12
            else:
                nx, ny = 0, -12

            self.create_text(
                int(mx + nx), int(my + ny),
                text=label,
                fill="#78909C",
                font=("Helvetica", 7),
            )

    def _edge_point(self, state: str, tx: int, ty: int) -> Tuple[int, int]:
        x1, y1, x2, y2 = self._get_box_rect(state)
        cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
        dx = tx - cx
        dy = ty - cy
        if dx == 0 and dy == 0:
            return cx, cy
        hw = (x2 - x1) // 2
        hh = (y2 - y1) // 2
        if dx == 0:
            return cx, cy + (hh if dy > 0 else -hh)
        if dy == 0:
            return cx + (hw if dx > 0 else -hw), cy
        sx = hw / abs(dx)
        sy = hh / abs(dy)
        s = min(sx, sy)
        return int(cx + dx * s), int(cy + dy * s)

    def _draw_states(self) -> None:
        w = self.winfo_width()
        if w < 10:
            return

        for state in STATE_COLORS:
            bg, border = STATE_COLORS[state]
            is_current = (state == self._current_state)
            x1, y1, x2, y2 = self._get_box_rect(state)
            self._box_rects[state] = (x1, y1, x2, y2)
            r = 10

            # Shadow
            self._rounded_rect(x1 + 2, y1 + 2, x2 + 2, y2 + 2, r,
                               fill="#E0E0E0", outline="")

            if is_current:
                # Glow
                self._rounded_rect(x1 - 3, y1 - 3, x2 + 3, y2 + 3, r + 3,
                                   fill="", outline=border, width=3)
                self._rounded_rect(x1, y1, x2, y2, r,
                                   fill=border, outline=border, width=2)
                text_color = "#FFFFFF"
                state_font = ("Helvetica", 11, "bold")
            else:
                self._rounded_rect(x1, y1, x2, y2, r,
                                   fill=bg, outline=BORDER, width=1)
                text_color = border
                state_font = ("Helvetica", 10, "bold")

            # State name
            cy_offset = -8 if (is_current and self._process_label) else 0
            self.create_text(
                (x1 + x2) // 2, (y1 + y2) // 2 + cy_offset,
                text=state,
                fill=text_color,
                font=state_font,
            )

            # Process label inside current state
            if is_current and self._process_label:
                self.create_text(
                    (x1 + x2) // 2, (y1 + y2) // 2 + 12,
                    text=self._process_label,
                    fill="#FFFFFF",
                    font=("Helvetica", 8),
                )

    def set_state(self, state: Optional[str], process_label: str = "") -> None:
        self._current_state = state
        self._process_label = process_label
        self._draw()

    def animate_transition(
        self,
        from_state: str,
        to_state: str,
        process_label: str,
        on_complete: Optional[callable] = None,
    ) -> None:
        """Animate a token moving from one state to another."""
        self._animator.cancel()

        # Remove old token
        for item in self._token_items:
            try:
                self.delete(item)
            except tk.TclError:
                pass
        self._token_items.clear()

        sx, sy = self._get_box_center(from_state)
        ex, ey = self._get_box_center(to_state)

        _, token_border = STATE_COLORS.get(to_state, ("#E0E0E0", "#666666"))

        # Create token (oval + text)
        r = 12
        oval_id = self.create_oval(sx - r, sy - r, sx + r, sy + r,
                                   fill=token_border, outline="#FFFFFF", width=2)
        text_id = self.create_text(sx, sy, text=process_label,
                                   fill="#FFFFFF", font=("Helvetica", 7, "bold"))
        self._token_items = [oval_id, text_id]

        def _on_done() -> None:
            # Remove token after arrival
            for item in self._token_items:
                try:
                    self.delete(item)
                except tk.TclError:
                    pass
            self._token_items.clear()
            if on_complete:
                on_complete()

        self._animator.animate_token(
            self._token_items,
            start_xy=(sx, sy),
            end_xy=(ex, ey),
            duration_ms=350,
            steps=22,
            on_complete=_on_done,
        )
