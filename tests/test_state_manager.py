"""Tests for StateManager: all valid transitions, invalid transitions, termination."""

from process.process import Process
from process.state_manager import StateManager


class TestStateManager:
    def _make_process(self, state: str = "NEW") -> Process:
        p = Process(pid=1, name="T1")
        p.state = state
        return p

    # --- Valid transitions ---

    def test_new_to_ready(self):
        p = self._make_process("NEW")
        ok, frm, to = StateManager.transition(p, "ADMIT")
        assert ok is True
        assert frm == "NEW"
        assert to == "READY"
        assert p.state == "READY"

    def test_ready_to_running(self):
        p = self._make_process("READY")
        ok, frm, to = StateManager.transition(p, "DISPATCH")
        assert ok is True
        assert frm == "READY"
        assert to == "RUNNING"
        assert p.state == "RUNNING"

    def test_running_to_ready(self):
        p = self._make_process("RUNNING")
        ok, frm, to = StateManager.transition(p, "PREEMPT")
        assert ok is True
        assert frm == "RUNNING"
        assert to == "READY"
        assert p.state == "READY"

    def test_running_to_blocked(self):
        p = self._make_process("RUNNING")
        ok, frm, to = StateManager.transition(p, "BLOCK")
        assert ok is True
        assert frm == "RUNNING"
        assert to == "BLOCKED"
        assert p.state == "BLOCKED"

    def test_running_to_terminated(self):
        p = self._make_process("RUNNING")
        ok, frm, to = StateManager.transition(p, "TERMINATE")
        assert ok is True
        assert frm == "RUNNING"
        assert to == "TERMINATED"
        assert p.state == "TERMINATED"

    def test_blocked_to_ready(self):
        p = self._make_process("BLOCKED")
        ok, frm, to = StateManager.transition(p, "WAKE")
        assert ok is True
        assert frm == "BLOCKED"
        assert to == "READY"
        assert p.state == "READY"

    # --- Invalid transitions ---

    def test_new_to_running_invalid(self):
        p = self._make_process("NEW")
        ok, frm, to = StateManager.transition(p, "DISPATCH")
        assert ok is False
        assert p.state == "NEW"

    def test_new_to_blocked_invalid(self):
        p = self._make_process("NEW")
        ok, frm, to = StateManager.transition(p, "BLOCK")
        assert ok is False
        assert p.state == "NEW"

    def test_new_to_terminated_invalid(self):
        p = self._make_process("NEW")
        ok, frm, to = StateManager.transition(p, "TERMINATE")
        assert ok is False
        assert p.state == "NEW"

    def test_ready_to_terminated_invalid(self):
        p = self._make_process("READY")
        ok, frm, to = StateManager.transition(p, "TERMINATE")
        assert ok is False
        assert p.state == "READY"

    def test_ready_to_blocked_invalid(self):
        p = self._make_process("READY")
        ok, frm, to = StateManager.transition(p, "BLOCK")
        assert ok is False
        assert p.state == "READY"

    def test_blocked_to_running_invalid(self):
        p = self._make_process("BLOCKED")
        ok, frm, to = StateManager.transition(p, "DISPATCH")
        assert ok is False
        assert p.state == "BLOCKED"

    def test_blocked_to_terminated_invalid(self):
        p = self._make_process("BLOCKED")
        ok, frm, to = StateManager.transition(p, "TERMINATE")
        assert ok is False
        assert p.state == "BLOCKED"

    # --- Terminated has no outgoing transitions ---

    def test_terminated_no_transitions(self):
        p = self._make_process("TERMINATED")
        for action in ["ADMIT", "DISPATCH", "PREEMPT", "BLOCK", "WAKE", "TERMINATE"]:
            ok, _, _ = StateManager.transition(p, action)
            assert ok is False, f"Transition from TERMINATED via {action} should fail"
        assert p.state == "TERMINATED"

    # --- get_valid_actions ---

    def test_valid_actions_new(self):
        p = self._make_process("NEW")
        actions = StateManager.get_valid_actions(p)
        assert actions == ["ADMIT"]

    def test_valid_actions_ready(self):
        p = self._make_process("READY")
        actions = StateManager.get_valid_actions(p)
        assert actions == ["DISPATCH"]

    def test_valid_actions_running(self):
        p = self._make_process("RUNNING")
        actions = StateManager.get_valid_actions(p)
        assert set(actions) == {"PREEMPT", "BLOCK", "TERMINATE"}

    def test_valid_actions_blocked(self):
        p = self._make_process("BLOCKED")
        actions = StateManager.get_valid_actions(p)
        assert actions == ["WAKE"]

    def test_valid_actions_terminated(self):
        p = self._make_process("TERMINATED")
        actions = StateManager.get_valid_actions(p)
        assert actions == []

    # --- can_transition ---

    def test_can_transition_true(self):
        p = self._make_process("NEW")
        assert StateManager.can_transition(p, "ADMIT") is True

    def test_can_transition_false(self):
        p = self._make_process("NEW")
        assert StateManager.can_transition(p, "DISPATCH") is False

    def test_invalid_action(self):
        p = self._make_process("NEW")
        ok, _, _ = StateManager.transition(p, "BOGUS")
        assert ok is False
