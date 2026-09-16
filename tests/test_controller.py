"""Tests for Controller and EventLogger."""

from core.controller import Controller
from core.event_logger import EventLogger


class TestEventLogger:
    def test_log_event(self):
        logger = EventLogger()
        logger.log("TEST EVENT")
        events = logger.get_events()
        assert len(events) == 1
        assert "TEST EVENT" in events[0]
        assert "[" in events[0]

    def test_log_multiple(self):
        logger = EventLogger()
        logger.log("E1")
        logger.log("E2")
        logger.log("E3")
        assert len(logger.get_events()) == 3

    def test_clear(self):
        logger = EventLogger()
        logger.log("E1")
        logger.clear()
        assert logger.get_events() == []

    def test_listener(self):
        logger = EventLogger()
        received = []
        logger.add_listener(lambda e: received.append(e))
        logger.log("TEST")
        assert len(received) == 1
        assert "TEST" in received[0]

    def test_remove_listener(self):
        logger = EventLogger()
        received = []
        cb = lambda e: received.append(e)
        logger.add_listener(cb)
        logger.remove_listener(cb)
        logger.log("TEST")
        assert len(received) == 0


class TestController:
    def test_create_process(self):
        ctrl = Controller()
        p = ctrl.create_process("P1")
        assert p.pid == 1
        assert p.name == "P1"
        assert p.state == "NEW"

    def test_create_multiple(self):
        ctrl = Controller()
        p1 = ctrl.create_process("P1")
        p2 = ctrl.create_process("P2")
        assert p1.pid != p2.pid

    def test_admit(self):
        ctrl = Controller()
        p = ctrl.create_process("P1")
        ok, _ = ctrl.admit(p.pid)
        assert ok is True
        assert ctrl.get_process(p.pid).state == "READY"

    def test_dispatch(self):
        ctrl = Controller()
        p = ctrl.create_process("P1")
        ctrl.admit(p.pid)
        ok, _ = ctrl.dispatch(p.pid)
        assert ok is True
        assert ctrl.get_process(p.pid).state == "RUNNING"

    def test_preempt(self):
        ctrl = Controller()
        p = ctrl.create_process("P1")
        ctrl.admit(p.pid)
        ctrl.dispatch(p.pid)
        ok, _ = ctrl.preempt(p.pid)
        assert ok is True
        assert ctrl.get_process(p.pid).state == "READY"

    def test_block(self):
        ctrl = Controller()
        p = ctrl.create_process("P1")
        ctrl.admit(p.pid)
        ctrl.dispatch(p.pid)
        ok, _ = ctrl.block(p.pid)
        assert ok is True
        assert ctrl.get_process(p.pid).state == "BLOCKED"

    def test_wake(self):
        ctrl = Controller()
        p = ctrl.create_process("P1")
        ctrl.admit(p.pid)
        ctrl.dispatch(p.pid)
        ctrl.block(p.pid)
        ok, _ = ctrl.wake(p.pid)
        assert ok is True
        assert ctrl.get_process(p.pid).state == "READY"

    def test_terminate(self):
        ctrl = Controller()
        p = ctrl.create_process("P1")
        ctrl.admit(p.pid)
        ctrl.dispatch(p.pid)
        ok, _ = ctrl.terminate(p.pid)
        assert ok is True
        assert ctrl.get_process(p.pid).state == "TERMINATED"

    def test_invalid_transition_rejected(self):
        ctrl = Controller()
        p = ctrl.create_process("P1")
        ok, _ = ctrl.dispatch(p.pid)
        assert ok is False
        assert ctrl.get_process(p.pid).state == "NEW"

    def test_terminated_no_transitions(self):
        ctrl = Controller()
        p = ctrl.create_process("P1")
        ctrl.admit(p.pid)
        ctrl.dispatch(p.pid)
        ctrl.terminate(p.pid)
        for action_name in ["admit", "dispatch", "preempt", "block", "wake", "terminate"]:
            ok, _ = getattr(ctrl, action_name)(p.pid)
            assert ok is False

    def test_event_logging(self):
        ctrl = Controller()
        p = ctrl.create_process("P1")
        ctrl.admit(p.pid)
        events = ctrl.event_logger.get_events()
        assert len(events) >= 2
        assert "CREATED" in events[0]
        assert "NEW -> READY" in events[1]

    def test_rejected_transition_logged(self):
        ctrl = Controller()
        p = ctrl.create_process("P1")
        ctrl.dispatch(p.pid)
        events = ctrl.event_logger.get_events()
        assert any("REJECTED" in e for e in events)

    def test_get_valid_actions(self):
        ctrl = Controller()
        p = ctrl.create_process("P1")
        actions = ctrl.get_valid_actions(p.pid)
        assert actions == ["ADMIT"]

    def test_get_valid_actions_nonexistent(self):
        ctrl = Controller()
        actions = ctrl.get_valid_actions(999)
        assert actions == []

    def test_reset(self):
        ctrl = Controller()
        ctrl.create_process("P1")
        ctrl.create_process("P2")
        ctrl.reset()
        assert ctrl.get_all_processes() == []
        events = ctrl.event_logger.get_events()
        assert any("RESET" in e for e in events)

    def test_listener_notification(self):
        ctrl = Controller()
        notified = []
        ctrl.add_listener(lambda: notified.append(True))
        ctrl.create_process("P1")
        assert len(notified) == 1

    def test_full_lifecycle(self):
        ctrl = Controller()
        p = ctrl.create_process("Worker")
        ctrl.admit(p.pid)
        ctrl.dispatch(p.pid)
        ctrl.block(p.pid)
        ctrl.wake(p.pid)
        ctrl.dispatch(p.pid)
        ctrl.preempt(p.pid)
        ctrl.dispatch(p.pid)
        ctrl.terminate(p.pid)
        assert ctrl.get_process(p.pid).state == "TERMINATED"
