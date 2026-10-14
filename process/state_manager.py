"""State Manager: enforces valid process-state transitions."""

from __future__ import annotations

from typing import Optional, Tuple

from process.process import Process


# Valid state transitions: (from_state, to_state)
VALID_TRANSITIONS: set[Tuple[str, str]] = {
    ("NEW", "READY"),
    ("READY", "RUNNING"),
    ("RUNNING", "READY"),
    ("RUNNING", "BLOCKED"),
    ("RUNNING", "TERMINATED"),
    ("BLOCKED", "READY"),
}

# Human-readable action labels for each transition
ACTION_LABELS: dict[Tuple[str, str], str] = {
    ("NEW", "READY"): "ADMIT",
    ("READY", "RUNNING"): "DISPATCH",
    ("RUNNING", "READY"): "PREEMPT",
    ("RUNNING", "BLOCKED"): "BLOCK",
    ("RUNNING", "TERMINATED"): "TERMINATE",
    ("BLOCKED", "READY"): "WAKE",
}


class StateManager:
    """Validates and applies state transitions on processes."""

    @staticmethod
    def can_transition(process: Process, action: str) -> bool:
        """Check if a given action is valid for the process's current state."""
        from_state = process.state
        to_state = _action_to_target(action)
        if to_state is None:
            return False
        return (from_state, to_state) in VALID_TRANSITIONS

    @staticmethod
    def get_valid_actions(process: Process) -> list[str]:
        """Return a list of valid action names for the process's current state."""
        actions = []
        for (src, dst) in VALID_TRANSITIONS:
            if src == process.state:
                label = ACTION_LABELS.get((src, dst), dst)
                actions.append(label)
        return actions

    @staticmethod
    def rejection_reason(process: Process, action: str) -> str:
        """Explain why an action cannot be applied in the process's current state.

        Args:
            process: The process the action was requested for.
            action: The action name (for example ``DISPATCH``).

        Returns:
            A human-readable reason naming the required state, the process's
            current state, and the actions that are valid right now.
        """
        label = action.upper()
        target = _action_to_target(label)
        if target is None:
            return f"Unknown action {action!r}"

        required = next(
            (src for (src, dst), name in ACTION_LABELS.items() if name == label),
            target,
        )
        valid = ", ".join(StateManager.get_valid_actions(process)) or "none"
        return (
            f"{label} requires state {required}, but P{process.pid} is "
            f"{process.state}; valid actions now: {valid}"
        )

    @staticmethod
    def transition(process: Process, action: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """Attempt a state transition.

        Returns:
            (success, from_state, to_state)
            If the transition is invalid, returns (False, current_state, None).
        """
        from_state = process.state
        to_state = _action_to_target(action)

        if to_state is None:
            return False, from_state, None

        if (from_state, to_state) not in VALID_TRANSITIONS:
            return False, from_state, None

        process.state = to_state
        return True, from_state, to_state


def _action_to_target(action: str) -> Optional[str]:
    """Map an action label to its target state."""
    action_map = {
        "ADMIT": "READY",
        "DISPATCH": "RUNNING",
        "PREEMPT": "READY",
        "BLOCK": "BLOCKED",
        "WAKE": "READY",
        "TERMINATE": "TERMINATED",
    }
    return action_map.get(action.upper())
