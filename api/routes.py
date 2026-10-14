"""FastAPI routes - thin adapter over the existing Controller."""

from __future__ import annotations

from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, status

from api.schemas import (
    ChildrenResponse,
    ErrorResponse,
    EventsResponse,
    ParentResponse,
    PCBResponse,
    ProcessCreate,
    ProcessListResponse,
    ProcessTreeResponse,
    ResetResponse,
    SchedulingComparisonRequest,
    SchedulingComparisonResponse,
    SchedulingRequest,
    SchedulingResultResponse,
    TransitionResponse,
    ValidActionsResponse,
)
from core.controller import Controller
from scheduling.engine import ALGORITHMS, JobInput, run_schedule


router = APIRouter()


def _schedule(payload_jobs, algorithm: str, time_quantum: Optional[int]) -> SchedulingResultResponse:
    jobs = [JobInput(**job.model_dump()) for job in payload_jobs]
    result = run_schedule(jobs, algorithm, time_quantum)
    return SchedulingResultResponse(**{
        "algorithm": result.algorithm,
        "time_quantum": result.time_quantum,
        "priority_convention": result.priority_convention,
        "jobs": [job.__dict__ for job in result.jobs],
        "timeline": [segment.__dict__ for segment in result.timeline],
        "average_waiting_time": result.average_waiting_time,
        "average_turnaround_time": result.average_turnaround_time,
        "average_response_time": result.average_response_time,
    })


@router.post("/scheduling/run", response_model=SchedulingResultResponse)
async def run_scheduling(payload: SchedulingRequest) -> SchedulingResultResponse:
    """Run one scheduling algorithm without changing interactive processes."""
    return _schedule(payload.jobs, payload.algorithm, payload.time_quantum)


@router.post("/scheduling/compare", response_model=SchedulingComparisonResponse)
async def compare_scheduling(payload: SchedulingComparisonRequest) -> SchedulingComparisonResponse:
    """Run all four algorithms against the exact same job inputs."""
    return SchedulingComparisonResponse(results={
        algorithm: _schedule(payload.jobs, algorithm,
                             payload.time_quantum if algorithm == "ROUND_ROBIN" else None)
        for algorithm in ALGORITHMS
    })

# Single controller instance (simulation state)
_controller: Optional[Controller] = None


def get_controller() -> Controller:
    """Get or create the singleton controller."""
    global _controller
    if _controller is None:
        _controller = Controller()
    return _controller


def reset_controller() -> None:
    """Reset the controller instance (for testing)."""
    global _controller
    _controller = None


def _process_to_response(process) -> PCBResponse:
    """Convert a Process to a flat PCBResponse."""
    pcb = process.pcb
    ctrl = get_controller()
    children = ctrl.get_children(process.pid)
    children_pids = [c.pid for c in children]

    parent_pid = pcb.parent_pid if pcb.parent_pid != 0 else None

    return PCBResponse(
        pid=pcb.pid,
        name=pcb.name,
        state=pcb.state,
        priority=pcb.priority,
        parent_pid=parent_pid,
        program_counter=f"0x{pcb.program_counter:08X}",
        cpu_registers=pcb.cpu_registers,
        memory_base=f"0x{pcb.memory_base:08X}",
        memory_limit=f"0x{pcb.memory_limit:08X}",
        creation_time=pcb.creation_time,
        children=children_pids,
    )


@router.get("/processes", response_model=ProcessListResponse)
async def list_processes() -> ProcessListResponse:
    """Get all processes."""
    ctrl = get_controller()
    processes = ctrl.get_all_processes()
    return ProcessListResponse(processes=[_process_to_response(p) for p in processes])


@router.post(
    "/processes",
    response_model=PCBResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid parent or self-parent"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
async def create_process(payload: ProcessCreate) -> PCBResponse:
    """Create a new process."""
    ctrl = get_controller()
    try:
        process = ctrl.create_process(
            name=payload.name,
            priority=payload.priority,
            parent_pid=payload.parent_pid,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return _process_to_response(process)


@router.get("/processes/{pid}", response_model=PCBResponse)
async def get_process(pid: int) -> PCBResponse:
    """Get a process by PID."""
    ctrl = get_controller()
    process = ctrl.get_process(pid)
    if process is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Process P{pid} not found")
    return _process_to_response(process)


@router.get("/processes/{pid}/valid-actions", response_model=ValidActionsResponse)
async def get_valid_actions(pid: int) -> ValidActionsResponse:
    """Get valid actions for a process."""
    ctrl = get_controller()
    process = ctrl.get_process(pid)
    if process is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Process P{pid} not found")

    actions = ctrl.get_valid_actions(pid)
    return ValidActionsResponse(pid=pid, actions=actions)


@router.post("/processes/{pid}/admit", response_model=TransitionResponse)
async def admit(pid: int) -> TransitionResponse:
    """Transition process from NEW to READY."""
    ctrl = get_controller()
    process = ctrl.get_process(pid)
    if process is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Process P{pid} not found")

    success, msg = ctrl.admit(pid)
    if not success:
        return TransitionResponse(success=False, action="ADMIT", message=msg)

    updated = ctrl.get_process(pid)
    return TransitionResponse(
        success=True,
        action="ADMIT",
        from_state="NEW",
        to_state=updated.state if updated else "READY",
    )


@router.post("/processes/{pid}/dispatch", response_model=TransitionResponse)
async def dispatch(pid: int) -> TransitionResponse:
    """Transition process from READY to RUNNING."""
    ctrl = get_controller()
    process = ctrl.get_process(pid)
    if process is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Process P{pid} not found")

    success, msg = ctrl.dispatch(pid)
    if not success:
        return TransitionResponse(success=False, action="DISPATCH", message=msg)

    updated = ctrl.get_process(pid)
    return TransitionResponse(
        success=True,
        action="DISPATCH",
        from_state="READY",
        to_state=updated.state if updated else "RUNNING",
    )


@router.post("/processes/{pid}/preempt", response_model=TransitionResponse)
async def preempt(pid: int) -> TransitionResponse:
    """Transition process from RUNNING to READY."""
    ctrl = get_controller()
    process = ctrl.get_process(pid)
    if process is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Process P{pid} not found")

    success, msg = ctrl.preempt(pid)
    if not success:
        return TransitionResponse(success=False, action="PREEMPT", message=msg)

    updated = ctrl.get_process(pid)
    return TransitionResponse(
        success=True,
        action="PREEMPT",
        from_state="RUNNING",
        to_state=updated.state if updated else "READY",
    )


@router.post("/processes/{pid}/block", response_model=TransitionResponse)
async def block(pid: int) -> TransitionResponse:
    """Transition process from RUNNING to BLOCKED."""
    ctrl = get_controller()
    process = ctrl.get_process(pid)
    if process is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Process P{pid} not found")

    success, msg = ctrl.block(pid)
    if not success:
        return TransitionResponse(success=False, action="BLOCK", message=msg)

    updated = ctrl.get_process(pid)
    return TransitionResponse(
        success=True,
        action="BLOCK",
        from_state="RUNNING",
        to_state=updated.state if updated else "BLOCKED",
    )


@router.post("/processes/{pid}/wake", response_model=TransitionResponse)
async def wake(pid: int) -> TransitionResponse:
    """Transition process from BLOCKED to READY."""
    ctrl = get_controller()
    process = ctrl.get_process(pid)
    if process is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Process P{pid} not found")

    success, msg = ctrl.wake(pid)
    if not success:
        return TransitionResponse(success=False, action="WAKE", message=msg)

    updated = ctrl.get_process(pid)
    return TransitionResponse(
        success=True,
        action="WAKE",
        from_state="BLOCKED",
        to_state=updated.state if updated else "READY",
    )


@router.post("/processes/{pid}/terminate", response_model=TransitionResponse)
async def terminate(pid: int) -> TransitionResponse:
    """Transition process from RUNNING to TERMINATED."""
    ctrl = get_controller()
    process = ctrl.get_process(pid)
    if process is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Process P{pid} not found")

    success, msg = ctrl.terminate(pid)
    if not success:
        return TransitionResponse(success=False, action="TERMINATE", message=msg)

    updated = ctrl.get_process(pid)
    return TransitionResponse(
        success=True,
        action="TERMINATE",
        from_state="RUNNING",
        to_state=updated.state if updated else "TERMINATED",
    )


@router.get("/processes/{pid}/parent", response_model=ParentResponse)
async def get_parent(pid: int) -> ParentResponse:
    """Get the parent process of a given process."""
    ctrl = get_controller()
    process = ctrl.get_process(pid)
    if process is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Process P{pid} not found")

    parent = ctrl.get_parent(pid)
    parent_resp = _process_to_response(parent) if parent else None
    return ParentResponse(pid=pid, parent=parent_resp)


@router.get("/processes/{pid}/children", response_model=ChildrenResponse)
async def get_children(pid: int) -> ChildrenResponse:
    """Get the child processes of a given process."""
    ctrl = get_controller()
    process = ctrl.get_process(pid)
    if process is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Process P{pid} not found")

    children = ctrl.get_children(pid)
    return ChildrenResponse(pid=pid, children=[_process_to_response(c) for c in children])


@router.get("/process-tree", response_model=ProcessTreeResponse)
async def get_process_tree() -> ProcessTreeResponse:
    """Get the full process hierarchy as a parent->children mapping."""
    ctrl = get_controller()
    tree = ctrl.get_process_tree()
    return ProcessTreeResponse(tree=tree)


@router.get("/events", response_model=EventsResponse)
async def get_events() -> EventsResponse:
    """Get all logged events."""
    ctrl = get_controller()
    events = ctrl.event_logger.get_events()
    return EventsResponse(events=events)


@router.post("/reset", response_model=ResetResponse)
async def reset_simulation() -> ResetResponse:
    """Reset the entire simulation."""
    ctrl = get_controller()
    ctrl.reset()
    return ResetResponse(success=True, message="Simulation reset")


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}
