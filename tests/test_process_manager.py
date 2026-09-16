"""Tests for ProcessManager: creation, lookup, uniqueness, removal."""

from process.process_manager import ProcessManager


class TestProcessManager:
    def test_create_process(self):
        pm = ProcessManager()
        proc = pm.create_process("P1")
        assert proc.pid == 1
        assert proc.name == "P1"

    def test_pid_uniqueness(self):
        pm = ProcessManager()
        p1 = pm.create_process("P1")
        p2 = pm.create_process("P2")
        p3 = pm.create_process("P3")
        assert p1.pid != p2.pid
        assert p2.pid != p3.pid
        assert p1.pid != p3.pid

    def test_pid_sequential(self):
        pm = ProcessManager()
        p1 = pm.create_process("P1")
        p2 = pm.create_process("P2")
        p3 = pm.create_process("P3")
        assert p1.pid == 1
        assert p2.pid == 2
        assert p3.pid == 3

    def test_get_process(self):
        pm = ProcessManager()
        pm.create_process("P1")
        proc = pm.get_process(1)
        assert proc is not None
        assert proc.name == "P1"

    def test_get_nonexistent_process(self):
        pm = ProcessManager()
        proc = pm.get_process(999)
        assert proc is None

    def test_get_all_processes(self):
        pm = ProcessManager()
        pm.create_process("P1")
        pm.create_process("P2")
        all_procs = pm.get_all_processes()
        assert len(all_procs) == 2

    def test_remove_process(self):
        pm = ProcessManager()
        pm.create_process("P1")
        removed = pm.remove_process(1)
        assert removed is not None
        assert pm.get_process(1) is None

    def test_clear(self):
        pm = ProcessManager()
        pm.create_process("P1")
        pm.create_process("P2")
        pm.clear()
        assert pm.get_all_processes() == []
        assert pm.next_pid == 1

    def test_pid_not_recycled(self):
        pm = ProcessManager()
        p1 = pm.create_process("P1")
        pm.remove_process(1)
        p2 = pm.create_process("P2")
        assert p2.pid == 2
