"""Pure CPU scheduling simulations, independent of interactive process state."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Algorithm = Literal["FCFS", "SJF", "PRIORITY", "ROUND_ROBIN"]
ALGORITHMS: tuple[Algorithm, ...] = ("FCFS", "SJF", "PRIORITY", "ROUND_ROBIN")
PRIORITY_CONVENTION = "Higher numeric values (0-100) mean higher priority."


@dataclass(frozen=True)
class JobInput:
    """One independent scheduling job; burst is simulated CPU time."""

    job_id: str
    name: str
    arrival_time: int
    burst_time: int
    priority: int


@dataclass(frozen=True)
class TimelineSegment:
    job_id: str | None
    name: str
    start_time: int
    end_time: int
    duration: int


@dataclass(frozen=True)
class JobMetrics:
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


@dataclass(frozen=True)
class ScheduleResult:
    algorithm: Algorithm
    time_quantum: int | None
    priority_convention: str
    jobs: list[JobMetrics]
    timeline: list[TimelineSegment]
    average_waiting_time: float
    average_turnaround_time: float
    average_response_time: float


def run_schedule(jobs: list[JobInput], algorithm: Algorithm, time_quantum: int | None = None) -> ScheduleResult:
    """Run a deterministic scheduling simulation and calculate standard metrics.

    Ties use request order after the primary selection rule. FCFS orders by
    arrival then request order; SJF orders available jobs by burst, arrival,
    then request order; priority orders by descending priority, arrival, then
    request order. Round Robin initially queues by arrival then request order,
    and queues arrivals during a slice before re-queuing the sliced job.
    """
    if not jobs:
        raise ValueError("At least one scheduling job is required")
    if len({job.job_id for job in jobs}) != len(jobs):
        raise ValueError("job_id values must be unique within a scheduling request")
    for job in jobs:
        if not job.job_id or not job.name:
            raise ValueError("job_id and name must not be empty")
        if job.arrival_time < 0 or job.burst_time <= 0:
            raise ValueError("arrival_time must be nonnegative and burst_time must be positive")
        if not 0 <= job.priority <= 100:
            raise ValueError("priority must be between 0 and 100")
    if algorithm not in ALGORITHMS:
        raise ValueError(f"Unsupported scheduling algorithm: {algorithm}")
    if algorithm == "ROUND_ROBIN" and (time_quantum is None or time_quantum <= 0):
        raise ValueError("Round Robin requires a positive integer time_quantum")

    indexed = list(enumerate(jobs))
    remaining = {job.job_id: job.burst_time for job in jobs}
    first_start: dict[str, int] = {}
    completion: dict[str, int] = {}
    timeline: list[TimelineSegment] = []
    time = 0

    def add_segment(job: JobInput | None, start: int, end: int) -> None:
        if end <= start:
            return
        timeline.append(TimelineSegment(job.job_id if job else None, job.name if job else "IDLE", start, end, end - start))

    if algorithm in ("FCFS", "SJF", "PRIORITY"):
        pending = list(indexed)
        while pending:
            available = [(i, job) for i, job in pending if job.arrival_time <= time]
            if not available:
                next_time = min(job.arrival_time for _, job in pending)
                add_segment(None, time, next_time)
                time = next_time
                available = [(i, job) for i, job in pending if job.arrival_time <= time]
            if algorithm == "FCFS":
                selected = min(available, key=lambda pair: (pair[1].arrival_time, pair[0]))
            elif algorithm == "SJF":
                selected = min(available, key=lambda pair: (pair[1].burst_time, pair[1].arrival_time, pair[0]))
            else:
                selected = min(available, key=lambda pair: (-pair[1].priority, pair[1].arrival_time, pair[0]))
            i, job = selected
            pending.remove(selected)
            first_start[job.job_id] = time
            end = time + job.burst_time
            add_segment(job, time, end)
            time = end
            completion[job.job_id] = time
    else:
        # RR queue is ordered by arrival then request order; newly arrived jobs
        # during a slice are enqueued before the running job is requeued.
        queue: list[tuple[int, JobInput]] = []
        not_arrived = sorted(indexed, key=lambda pair: (pair[1].arrival_time, pair[0]))
        while queue or not_arrived:
            if not queue:
                next_time = not_arrived[0][1].arrival_time
                add_segment(None, time, next_time)
                time = next_time
                while not_arrived and not_arrived[0][1].arrival_time <= time:
                    queue.append(not_arrived.pop(0))
            i, job = queue.pop(0)
            first_start.setdefault(job.job_id, time)
            end = time + min(time_quantum or 0, remaining[job.job_id])
            add_segment(job, time, end)
            while not_arrived and not_arrived[0][1].arrival_time <= end:
                queue.append(not_arrived.pop(0))
            remaining[job.job_id] -= end - time
            time = end
            if remaining[job.job_id] == 0:
                completion[job.job_id] = time
            else:
                queue.append((i, job))

    metrics: list[JobMetrics] = []
    for job in jobs:
        turn = completion[job.job_id] - job.arrival_time
        metrics.append(JobMetrics(job.job_id, job.name, job.arrival_time, job.burst_time, job.priority,
                                  first_start[job.job_id], completion[job.job_id], turn - job.burst_time,
                                  turn, first_start[job.job_id] - job.arrival_time))
    count = len(metrics)
    return ScheduleResult(algorithm, time_quantum if algorithm == "ROUND_ROBIN" else None,
                          PRIORITY_CONVENTION, metrics, timeline,
                          sum(m.waiting_time for m in metrics) / count,
                          sum(m.turnaround_time for m in metrics) / count,
                          sum(m.response_time for m in metrics) / count)
