"""Animation helper: after()-based token animation for state transitions."""

from __future__ import annotations

import tkinter as tk
from typing import Callable, Optional


class Animator:
    """Manages token animation on a Tkinter Canvas using after().

    Animates a set of canvas items from one position to another.
    Purely visual — never modifies process state.
    """

    def __init__(self, canvas: tk.Canvas) -> None:
        self._canvas = canvas
        self._after_id: Optional[str] = None
        self._running = False

    def cancel(self) -> None:
        """Cancel any running animation."""
        if self._after_id is not None:
            try:
                self._canvas.after_cancel(self._after_id)
            except TclError:
                pass
            self._after_id = None
        self._running = False

    def animate_token(
        self,
        item_ids: list[int],
        start_xy: tuple[int, int],
        end_xy: tuple[int, int],
        duration_ms: int = 400,
        steps: int = 26,
        on_complete: Optional[Callable[[], None]] = None,
    ) -> None:
        """Interpolate canvas items from start to end position.

        Args:
            item_ids: Canvas item IDs to move (e.g., oval + text).
            start_xy: Starting (x, y) center position.
            end_xy: Ending (x, y) center position.
            duration_ms: Total animation duration in milliseconds.
            steps: Number of interpolation steps.
            on_complete: Called when animation finishes.
        """
        self.cancel()
        self._running = True

        dx = (end_xy[0] - start_xy[0]) / steps
        dy = (end_xy[1] - start_xy[1]) / steps
        delay = max(1, duration_ms // steps)
        step = [0]

        def _tick() -> None:
            if not self._running:
                return
            step[0] += 1
            n = step[0]
            cx = start_xy[0] + dx * n
            cy = start_xy[1] + dy * n

            for item_id in item_ids:
                try:
                    self._canvas.move(item_id, dx, dy)
                except tk.TclError:
                    self._running = False
                    return

            if n < steps:
                self._after_id = self._canvas.after(delay, _tick)
            else:
                self._running = False
                self._after_id = None
                if on_complete:
                    on_complete()

        _tick()

    @property
    def is_running(self) -> bool:
        return self._running
