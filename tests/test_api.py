"""API integration tests for the FastAPI layer."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.routes import reset_controller


client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_state():
    """Reset controller state before each test."""
    reset_controller()
    yield
    reset_controller()


class TestAPIHealth:
    def test_health_check(self):
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    def test_root_endpoint(self):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Process Creation and State Transition Visualizer API"
        assert "docs" in data


class TestProcessCreation:
    def test_create_root_process(self):
        response = client.post("/api/processes", json={"name": "P1", "priority": 0})
        assert response.status_code == 201
        data = response.json()
        assert data["pid"] == 1
        assert data["name"] == "P1"
        assert data["state"] == "NEW"
        assert data["priority"] == 0
        assert data["parent_pid"] is None
        assert "children" in data
        assert data["children"] == []

    def test_create_child_process(self):
        # Create parent
        client.post("/api/processes", json={"name": "Parent"})
        # Create child
        response = client.post("/api/processes", json={"name": "Child", "parent_pid": 1})
        assert response.status_code == 201
        data = response.json()
        assert data["pid"] == 2
        assert data["name"] == "Child"
        assert data["parent_pid"] == 1

    def test_create_multiple_processes_unique_pids(self):
        client.post("/api/processes", json={"name": "P1"})
        client.post("/api/processes", json={"name": "P2"})
        response = client.post("/api/processes", json={"name": "P3"})
        assert response.status_code == 201
        data = response.json()
        assert data["pid"] == 3

    def test_create_process_invalid_parent_nonexistent(self):
        response = client.post("/api/processes", json={"name": "Child", "parent_pid": 999})
        assert response.status_code == 400
        assert "does not exist" in response.json()["detail"]

    def test_create_process_self_parent_rejected(self):
        # Create first process (pid=1), next_pid will be 2
        client.post("/api/processes", json={"name": "P1"})
        # Try to create with parent_pid=2 (which would be self-parent)
        response = client.post("/api/processes", json={"name": "Self", "parent_pid": 2})
        assert response.status_code == 400
        assert "own parent" in response.json()["detail"]

    def test_create_process_validation_empty_name(self):
        response = client.post("/api/processes", json={"name": "", "priority": 0})
        assert response.status_code == 422

    def test_create_process_validation_negative_priority(self):
        response = client.post("/api/processes", json={"name": "P1", "priority": -1})
        assert response.status_code == 422


class TestProcessRetrieval:
    def test_get_all_processes(self):
        client.post("/api/processes", json={"name": "P1"})
        client.post("/api/processes", json={"name": "P2"})
        response = client.get("/api/processes")
        assert response.status_code == 200
        data = response.json()
        assert len(data["processes"]) == 2

    def test_get_process_by_pid(self):
        client.post("/api/processes", json={"name": "P1"})
        response = client.get("/api/processes/1")
        assert response.status_code == 200
        data = response.json()
        assert data["pid"] == 1
        assert data["name"] == "P1"

    def test_get_nonexistent_process(self):
        response = client.get("/api/processes/999")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]


class TestProcessHierarchy:
    def test_get_parent_of_root(self):
        client.post("/api/processes", json={"name": "Root"})
        response = client.get("/api/processes/1/parent")
        assert response.status_code == 200
        data = response.json()
        assert data["pid"] == 1
        assert data["parent"] is None

    def test_get_parent_of_child(self):
        client.post("/api/processes", json={"name": "Parent"})
        client.post("/api/processes", json={"name": "Child", "parent_pid": 1})
        response = client.get("/api/processes/2/parent")
        assert response.status_code == 200
        data = response.json()
        assert data["pid"] == 2
        assert data["parent"] is not None
        assert data["parent"]["pid"] == 1

    def test_get_children(self):
        client.post("/api/processes", json={"name": "Parent"})
        client.post("/api/processes", json={"name": "Child1", "parent_pid": 1})
        client.post("/api/processes", json={"name": "Child2", "parent_pid": 1})
        response = client.get("/api/processes/1/children")
        assert response.status_code == 200
        data = response.json()
        assert data["pid"] == 1
        assert len(data["children"]) == 2

    def test_get_process_tree(self):
        client.post("/api/processes", json={"name": "P1"})
        client.post("/api/processes", json={"name": "P2", "parent_pid": 1})
        client.post("/api/processes", json={"name": "P3", "parent_pid": 1})
        response = client.get("/api/process-tree")
        assert response.status_code == 200
        data = response.json()
        # JSON serializes int keys as strings
        assert "1" in data["tree"]
        assert set(data["tree"]["1"]) == {2, 3}

    def test_nested_hierarchy(self):
        client.post("/api/processes", json={"name": "P1"})
        client.post("/api/processes", json={"name": "P2", "parent_pid": 1})
        client.post("/api/processes", json={"name": "P3", "parent_pid": 2})
        response = client.get("/api/process-tree")
        assert response.status_code == 200
        data = response.json()
        # JSON serializes int keys as strings
        assert data["tree"]["1"] == [2]
        assert data["tree"]["2"] == [3]


class TestValidActions:
    def test_valid_actions_new_state(self):
        client.post("/api/processes", json={"name": "P1"})
        response = client.get("/api/processes/1/valid-actions")
        assert response.status_code == 200
        data = response.json()
        assert data["pid"] == 1
        assert data["actions"] == ["ADMIT"]

    def test_valid_actions_ready_state(self):
        client.post("/api/processes", json={"name": "P1"})
        client.post("/api/processes/1/admit")
        response = client.get("/api/processes/1/valid-actions")
        assert response.status_code == 200
        data = response.json()
        assert data["actions"] == ["DISPATCH"]

    def test_valid_actions_running_state(self):
        client.post("/api/processes", json={"name": "P1"})
        client.post("/api/processes/1/admit")
        client.post("/api/processes/1/dispatch")
        response = client.get("/api/processes/1/valid-actions")
        assert response.status_code == 200
        data = response.json()
        assert set(data["actions"]) == {"PREEMPT", "BLOCK", "TERMINATE"}

    def test_valid_actions_blocked_state(self):
        client.post("/api/processes", json={"name": "P1"})
        client.post("/api/processes/1/admit")
        client.post("/api/processes/1/dispatch")
        client.post("/api/processes/1/block")
        response = client.get("/api/processes/1/valid-actions")
        assert response.status_code == 200
        data = response.json()
        assert data["actions"] == ["WAKE"]

    def test_valid_actions_terminated_state(self):
        client.post("/api/processes", json={"name": "P1"})
        client.post("/api/processes/1/admit")
        client.post("/api/processes/1/dispatch")
        client.post("/api/processes/1/terminate")
        response = client.get("/api/processes/1/valid-actions")
        assert response.status_code == 200
        data = response.json()
        assert data["actions"] == []

    def test_valid_actions_nonexistent_process(self):
        response = client.get("/api/processes/999/valid-actions")
        assert response.status_code == 404


class TestStateTransitions:
    def test_admit_new_to_ready(self):
        client.post("/api/processes", json={"name": "P1"})
        response = client.post("/api/processes/1/admit")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["action"] == "ADMIT"
        assert data["from_state"] == "NEW"
        assert data["to_state"] == "READY"

        # Verify state changed
        get_resp = client.get("/api/processes/1")
        assert get_resp.json()["state"] == "READY"

    def test_dispatch_ready_to_running(self):
        client.post("/api/processes", json={"name": "P1"})
        client.post("/api/processes/1/admit")
        response = client.post("/api/processes/1/dispatch")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["action"] == "DISPATCH"
        assert data["from_state"] == "READY"
        assert data["to_state"] == "RUNNING"

    def test_preempt_running_to_ready(self):
        client.post("/api/processes", json={"name": "P1"})
        client.post("/api/processes/1/admit")
        client.post("/api/processes/1/dispatch")
        response = client.post("/api/processes/1/preempt")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["action"] == "PREEMPT"
        assert data["from_state"] == "RUNNING"
        assert data["to_state"] == "READY"

    def test_block_running_to_blocked(self):
        client.post("/api/processes", json={"name": "P1"})
        client.post("/api/processes/1/admit")
        client.post("/api/processes/1/dispatch")
        response = client.post("/api/processes/1/block")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["action"] == "BLOCK"
        assert data["from_state"] == "RUNNING"
        assert data["to_state"] == "BLOCKED"

    def test_wake_blocked_to_ready(self):
        client.post("/api/processes", json={"name": "P1"})
        client.post("/api/processes/1/admit")
        client.post("/api/processes/1/dispatch")
        client.post("/api/processes/1/block")
        response = client.post("/api/processes/1/wake")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["action"] == "WAKE"
        assert data["from_state"] == "BLOCKED"
        assert data["to_state"] == "READY"

    def test_terminate_running_to_terminated(self):
        client.post("/api/processes", json={"name": "P1"})
        client.post("/api/processes/1/admit")
        client.post("/api/processes/1/dispatch")
        response = client.post("/api/processes/1/terminate")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["action"] == "TERMINATE"
        assert data["from_state"] == "RUNNING"
        assert data["to_state"] == "TERMINATED"

    def test_invalid_transition_rejected(self):
        # Try to dispatch from NEW (invalid)
        client.post("/api/processes", json={"name": "P1"})
        response = client.post("/api/processes/1/dispatch")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert data["action"] == "DISPATCH"
        assert data["message"] is not None

        # State should remain NEW
        get_resp = client.get("/api/processes/1")
        assert get_resp.json()["state"] == "NEW"

    def test_terminated_no_outgoing_transitions(self):
        client.post("/api/processes", json={"name": "P1"})
        client.post("/api/processes/1/admit")
        client.post("/api/processes/1/dispatch")
        client.post("/api/processes/1/terminate")

        for action in ["admit", "dispatch", "preempt", "block", "wake", "terminate"]:
            response = client.post(f"/api/processes/1/{action}")
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is False

    def test_transition_nonexistent_process(self):
        response = client.post("/api/processes/999/admit")
        assert response.status_code == 404


class TestEventLog:
    def test_events_logged(self):
        client.post("/api/processes", json={"name": "P1"})
        client.post("/api/processes/1/admit")
        response = client.get("/api/events")
        assert response.status_code == 200
        data = response.json()
        assert len(data["events"]) >= 2
        assert any("CREATED" in e for e in data["events"])
        assert any("NEW -> READY" in e for e in data["events"])

    def test_rejected_transition_logged(self):
        client.post("/api/processes", json={"name": "P1"})
        client.post("/api/processes/1/dispatch")  # Invalid
        response = client.get("/api/events")
        assert response.status_code == 200
        data = response.json()
        assert any("REJECTED" in e for e in data["events"])


class TestReset:
    def test_reset_clears_all(self):
        client.post("/api/processes", json={"name": "P1"})
        client.post("/api/processes", json={"name": "P2", "parent_pid": 1})
        client.post("/api/processes/1/admit")

        response = client.post("/api/reset")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        # Verify all cleared
        processes_resp = client.get("/api/processes")
        assert processes_resp.json()["processes"] == []

        tree_resp = client.get("/api/process-tree")
        assert tree_resp.json()["tree"] == {}

        events_resp = client.get("/api/events")
        events = events_resp.json()["events"]
        assert any("RESET" in e for e in events)

    def test_reset_resets_pid_counter(self):
        client.post("/api/processes", json={"name": "P1"})
        client.post("/api/processes", json={"name": "P2"})
        client.post("/api/reset")
        response = client.post("/api/processes", json={"name": "NewP1"})
        assert response.status_code == 201
        data = response.json()
        assert data["pid"] == 1


class TestFullLifecycle:
    def test_full_process_lifecycle(self):
        # Create
        create_resp = client.post("/api/processes", json={"name": "Worker"})
        pid = create_resp.json()["pid"]

        # Admit
        client.post(f"/api/processes/{pid}/admit")
        # Dispatch
        client.post(f"/api/processes/{pid}/dispatch")
        # Block
        client.post(f"/api/processes/{pid}/block")
        # Wake
        client.post(f"/api/processes/{pid}/wake")
        # Dispatch again
        client.post(f"/api/processes/{pid}/dispatch")
        # Preempt
        client.post(f"/api/processes/{pid}/preempt")
        # Dispatch again
        client.post(f"/api/processes/{pid}/dispatch")
        # Terminate
        client.post(f"/api/processes/{pid}/terminate")

        # Verify final state
        get_resp = client.get(f"/api/processes/{pid}")
        assert get_resp.json()["state"] == "TERMINATED"