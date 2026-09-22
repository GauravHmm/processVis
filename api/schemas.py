"""Pydantic schemas for the FastAPI layer."""

from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class ProcessCreate(BaseModel):
    """Request model for creating a new process."""

    name: str = Field(..., min_length=1, max_length=64)
    priority: int = Field(default=0, ge=0, le=100)
    parent_pid: int = Field(default=0, ge=0)


class PCBResponse(BaseModel):
    """Flat response model for process/PCB data."""

    pid: int
    name: str
    state: str
    priority: int
    parent_pid: Optional[int] = None
    program_counter: str
    cpu_registers: Dict[str, int]
    memory_base: str
    memory_limit: str
    creation_time: str
    children: List[int] = []


class ProcessListResponse(BaseModel):
    """Response for listing all processes."""

    processes: List[PCBResponse]


class TransitionResponse(BaseModel):
    """Response for a state transition attempt."""

    success: bool
    action: str
    from_state: Optional[str] = None
    to_state: Optional[str] = None
    message: Optional[str] = None


class ValidActionsResponse(BaseModel):
    """Response for valid actions endpoint."""

    pid: int
    actions: List[str]


class ParentResponse(BaseModel):
    """Response for parent process."""

    pid: int
    parent: Optional[PCBResponse] = None


class ChildrenResponse(BaseModel):
    """Response for child processes."""

    pid: int
    children: List[PCBResponse] = []


class ProcessTreeResponse(BaseModel):
    """Response for process tree hierarchy."""

    tree: Dict[int, List[int]]


class EventsResponse(BaseModel):
    """Response for event log."""

    events: List[str]


class ResetResponse(BaseModel):
    """Response for reset operation."""

    success: bool
    message: str


class ErrorResponse(BaseModel):
    """Standard error response."""

    detail: str