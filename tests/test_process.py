"""Tests for PCB creation and Process creation."""

from process.pcb import PCB
from process.process import Process


class TestPCB:
    def test_pcb_creation(self):
        pcb = PCB(pid=1, name="Test")
        assert pcb.pid == 1
        assert pcb.name == "Test"
        assert pcb.state == "NEW"
        assert pcb.priority == 0
        assert pcb.parent_pid == 0

    def test_pcb_priority(self):
        pcb = PCB(pid=1, name="Test", priority=5)
        assert pcb.priority == 5

    def test_pcb_parent_pid(self):
        pcb = PCB(pid=2, name="Child", parent_pid=1)
        assert pcb.parent_pid == 1

    def test_pcb_creation_time(self):
        pcb = PCB(pid=1, name="Test")
        assert pcb.creation_time != ""

    def test_pcb_cpu_registers(self):
        pcb = PCB(pid=1, name="Test")
        assert "AX" in pcb.cpu_registers
        assert "BX" in pcb.cpu_registers
        assert "CX" in pcb.cpu_registers
        assert "DX" in pcb.cpu_registers

    def test_pcb_memory(self):
        pcb = PCB(pid=1, name="Test")
        assert pcb.memory_base > 0
        assert pcb.memory_limit > 0

    def test_pcb_to_dict(self):
        pcb = PCB(pid=1, name="Test", priority=3)
        d = pcb.to_dict()
        assert d["PID"] == 1
        assert d["Process Name"] == "Test"
        assert d["Priority"] == 3
        assert d["State"] == "NEW"


class TestProcess:
    def test_process_creation(self):
        proc = Process(pid=1, name="P1")
        assert proc.pid == 1
        assert proc.name == "P1"
        assert proc.state == "NEW"

    def test_process_priority(self):
        proc = Process(pid=1, name="P1", priority=7)
        assert proc.priority == 7

    def test_process_state_setter(self):
        proc = Process(pid=1, name="P1")
        proc.state = "READY"
        assert proc.state == "READY"
        assert proc.pcb.state == "READY"

    def test_process_repr(self):
        proc = Process(pid=1, name="P1")
        r = repr(proc)
        assert "pid=1" in r
        assert "P1" in r
