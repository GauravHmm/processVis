"""Tests for process hierarchy: parent-child relationships."""

import pytest
from process.process_manager import ProcessManager
from core.controller import Controller


class TestProcessManagerHierarchy:
    def test_root_process_creation(self):
        pm = ProcessManager()
        p = pm.create_process("P1")
        assert p.pcb.parent_pid == 0
        assert pm.get_parent(p.pid) is None

    def test_child_process_creation(self):
        pm = ProcessManager()
        parent = pm.create_process("Parent")
        child = pm.create_process("Child", parent_pid=parent.pid)
        assert child.pcb.parent_pid == parent.pid

    def test_parent_pid_stored(self):
        pm = ProcessManager()
        p1 = pm.create_process("P1")
        p2 = pm.create_process("P2", parent_pid=p1.pid)
        assert p2.pcb.parent_pid == p1.pid

    def test_children_tracking(self):
        pm = ProcessManager()
        p1 = pm.create_process("P1")
        pm.create_process("P2", parent_pid=p1.pid)
        children = pm.get_children(p1.pid)
        assert len(children) == 1
        assert children[0].name == "P2"

    def test_multiple_children(self):
        pm = ProcessManager()
        p1 = pm.create_process("P1")
        pm.create_process("P2", parent_pid=p1.pid)
        pm.create_process("P3", parent_pid=p1.pid)
        pm.create_process("P4", parent_pid=p1.pid)
        children = pm.get_children(p1.pid)
        assert len(children) == 3
        names = {c.name for c in children}
        assert names == {"P2", "P3", "P4"}

    def test_nested_hierarchy(self):
        pm = ProcessManager()
        p1 = pm.create_process("P1")
        p2 = pm.create_process("P2", parent_pid=p1.pid)
        p3 = pm.create_process("P3", parent_pid=p1.pid)
        pm.create_process("P4", parent_pid=p2.pid)

        assert len(pm.get_children(p1.pid)) == 2
        assert len(pm.get_children(p2.pid)) == 1
        assert pm.get_children(p2.pid)[0].name == "P4"
        assert len(pm.get_children(p3.pid)) == 0

    def test_get_parent(self):
        pm = ProcessManager()
        p1 = pm.create_process("P1")
        p2 = pm.create_process("P2", parent_pid=p1.pid)
        parent = pm.get_parent(p2.pid)
        assert parent is not None
        assert parent.pid == p1.pid

    def test_get_parent_root(self):
        pm = ProcessManager()
        p1 = pm.create_process("P1")
        assert pm.get_parent(p1.pid) is None

    def test_get_parent_nonexistent(self):
        pm = ProcessManager()
        assert pm.get_parent(999) is None

    def test_get_children_empty(self):
        pm = ProcessManager()
        p1 = pm.create_process("P1")
        assert pm.get_children(p1.pid) == []

    def test_get_children_nonexistent(self):
        pm = ProcessManager()
        assert pm.get_children(999) == []

    def test_get_process_tree(self):
        pm = ProcessManager()
        p1 = pm.create_process("P1")
        p2 = pm.create_process("P2", parent_pid=p1.pid)
        p3 = pm.create_process("P3", parent_pid=p1.pid)
        tree = pm.get_process_tree()
        assert p1.pid in tree
        assert set(tree[p1.pid]) == {p2.pid, p3.pid}

    def test_hierarchy_after_parent_termination(self):
        pm = ProcessManager()
        p1 = pm.create_process("P1")
        p2 = pm.create_process("P2", parent_pid=p1.pid)
        p3 = pm.create_process("P3", parent_pid=p2.pid)

        from process.state_manager import StateManager
        StateManager.transition(p1, "ADMIT")
        StateManager.transition(p1, "DISPATCH")
        StateManager.transition(p1, "TERMINATE")

        assert pm.get_process(p2.pid) is not None
        assert pm.get_process(p3.pid) is not None
        assert p2.state == "NEW"
        assert p3.state == "NEW"

        assert len(pm.get_children(p1.pid)) == 1
        assert pm.get_children(p1.pid)[0].pid == p2.pid

    def test_reset_clears_hierarchy(self):
        pm = ProcessManager()
        p1 = pm.create_process("P1")
        pm.create_process("P2", parent_pid=p1.pid)
        pm.clear()
        tree = pm.get_process_tree()
        assert tree == {}
        assert pm.get_children(p1.pid) == []

    def test_self_parent_rejected(self):
        pm = ProcessManager()
        p1 = pm.create_process("P1")  # pid=1, _next_pid=2
        with pytest.raises(ValueError, match="own parent"):
            # parent_pid=2 equals _next_pid → self-parent
            pm.create_process("Self", parent_pid=pm.next_pid)

    def test_nonexistent_parent_rejected(self):
        pm = ProcessManager()
        with pytest.raises(ValueError, match="does not exist"):
            pm.create_process("P1", parent_pid=999)

    def test_remove_from_parent_children(self):
        pm = ProcessManager()
        p1 = pm.create_process("P1")
        p2 = pm.create_process("P2", parent_pid=p1.pid)
        assert len(pm.get_children(p1.pid)) == 1
        pm.remove_process(p2.pid)
        assert len(pm.get_children(p1.pid)) == 0

    def test_children_preserved_after_remove(self):
        pm = ProcessManager()
        p1 = pm.create_process("P1")
        p2 = pm.create_process("P2", parent_pid=p1.pid)
        p3 = pm.create_process("P3", parent_pid=p2.pid)

        pm.remove_process(p2.pid)
        assert pm.get_process(p3.pid) is not None
        assert p3.pcb.parent_pid == p2.pid

    def test_pid_not_self_parent_during_creation(self):
        pm = ProcessManager()
        pm.create_process("X")  # pid=1, _next_pid=2
        with pytest.raises(ValueError, match="own parent"):
            pm.create_process("Y", parent_pid=pm.next_pid)


class TestControllerHierarchy:
    def test_create_root_process(self):
        ctrl = Controller()
        p = ctrl.create_process("P1")
        assert p.pcb.parent_pid == 0
        assert ctrl.get_parent(p.pid) is None

    def test_create_child_process(self):
        ctrl = Controller()
        parent = ctrl.create_process("Parent")
        child = ctrl.create_process("Child", parent_pid=parent.pid)
        assert child.pcb.parent_pid == parent.pid

    def test_get_parent(self):
        ctrl = Controller()
        p1 = ctrl.create_process("P1")
        p2 = ctrl.create_process("P2", parent_pid=p1.pid)
        parent = ctrl.get_parent(p2.pid)
        assert parent is not None
        assert parent.pid == p1.pid

    def test_get_children(self):
        ctrl = Controller()
        p1 = ctrl.create_process("P1")
        ctrl.create_process("P2", parent_pid=p1.pid)
        ctrl.create_process("P3", parent_pid=p1.pid)
        children = ctrl.get_children(p1.pid)
        assert len(children) == 2

    def test_get_process_tree(self):
        ctrl = Controller()
        p1 = ctrl.create_process("P1")
        ctrl.create_process("P2", parent_pid=p1.pid)
        tree = ctrl.get_process_tree()
        assert p1.pid in tree
        assert len(tree[p1.pid]) == 1

    def test_hierarchy_event_logging(self):
        ctrl = Controller()
        p1 = ctrl.create_process("P1")
        ctrl.create_process("P2", parent_pid=p1.pid)
        events = ctrl.event_logger.get_events()
        assert any("parent: P1" in e for e in events)

    def test_self_parent_rejected(self):
        ctrl = Controller()
        p1 = ctrl.create_process("P1")  # pid=1, _next_pid=2
        with pytest.raises(ValueError, match="own parent"):
            ctrl.create_process("Self", parent_pid=ctrl.process_manager.next_pid)

    def test_hierarchy_after_parent_termination(self):
        ctrl = Controller()
        p1 = ctrl.create_process("P1")
        p2 = ctrl.create_process("P2", parent_pid=p1.pid)
        ctrl.admit(p1.pid)
        ctrl.dispatch(p1.pid)
        ctrl.terminate(p1.pid)

        assert ctrl.get_process(p2.pid) is not None
        assert ctrl.get_parent(p2.pid) is not None

    def test_reset_clears_hierarchy(self):
        ctrl = Controller()
        p1 = ctrl.create_process("P1")
        ctrl.create_process("P2", parent_pid=p1.pid)
        ctrl.reset()
        assert ctrl.get_process_tree() == {}
