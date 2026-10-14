"""Pydantic schemas for the FastAPI layer."""

from __future__ import annotations

from typing import Dict, List, Optional, Literal

from pydantic import BaseModel, Field, model_validator


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


class SchedulingJob(BaseModel):
    """CPU burst input, independent of simulated PCB execution fields."""

    job_id: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=64)
    arrival_time: int = Field(..., ge=0)
    burst_time: int = Field(..., gt=0)
    priority: int = Field(..., ge=0, le=100)


class SchedulingRequest(BaseModel):
    jobs: List[SchedulingJob] = Field(..., min_length=1)
    algorithm: Literal["FCFS", "SJF", "PRIORITY", "ROUND_ROBIN"]
    time_quantum: Optional[int] = Field(default=None, gt=0)

    @model_validator(mode="after")
    def validate_request(self):
        ids = [job.job_id for job in self.jobs]
        if len(ids) != len(set(ids)):
            raise ValueError("job_id values must be unique within a scheduling request")
        if self.algorithm == "ROUND_ROBIN" and self.time_quantum is None:
            raise ValueError("Round Robin requires a positive integer time_quantum")
        return self


class SchedulingComparisonRequest(BaseModel):
    jobs: List[SchedulingJob] = Field(..., min_length=1)
    time_quantum: int = Field(..., gt=0)

    @model_validator(mode="after")
    def validate_jobs(self):
        ids = [job.job_id for job in self.jobs]
        if len(ids) != len(set(ids)):
            raise ValueError("job_id values must be unique within a scheduling request")
        return self


class TimelineSegmentResponse(BaseModel):
    job_id: Optional[str]
    name: str
    start_time: int
    end_time: int
    duration: int


class JobMetricsResponse(BaseModel):
    job_id: str
    name: str
    arrival_time: int
    burst_time: int
    priority: int
    first_start_time: int
    completion_time: int
    waiting_time: int
    turnaround_time: int
    response_time: int


class SchedulingResultResponse(BaseModel):
    algorithm: str
    time_quantum: Optional[int]
    priority_convention: str
    jobs: List[JobMetricsResponse]
    timeline: List[TimelineSegmentResponse]
    average_waiting_time: float
    average_turnaround_time: float
    average_response_time: float


class SchedulingComparisonResponse(BaseModel):
    results: Dict[str, SchedulingResultResponse]
