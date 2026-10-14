"""Deterministic tests for the independent CPU scheduling engine."""

import pytest

from scheduling.engine import JobInput, run_schedule


def job(job_id, arrival, burst, priority=0):
    return JobInput(job_id, job_id, arrival, burst, priority)


def test_fcfs_arrivals_and_idle_metrics():
    result = run_schedule([job("late", 5, 2), job("early", 0, 3)], "FCFS")
    assert [(s.job_id, s.start_time, s.end_time) for s in result.timeline] == [
        ("early", 0, 3), (None, 3, 5), ("late", 5, 7)]
    late = result.jobs[0]
    assert (late.first_start_time, late.completion_time, late.waiting_time,
            late.turnaround_time, late.response_time) == (5, 7, 0, 2, 0)
    assert (result.average_waiting_time, result.average_turnaround_time,
            result.average_response_time) == (0, 2.5, 0)


def test_fcfs_equal_arrival_preserves_input_order():
    result = run_schedule([job("b", 0, 2), job("a", 0, 1)], "FCFS")
    assert [s.job_id for s in result.timeline] == ["b", "a"]


def test_sjf_selects_shortest_available_and_uses_input_order_tie():
    result = run_schedule([job("long", 0, 5), job("tie1", 0, 2), job("tie2", 0, 2)], "SJF")
    assert [s.job_id for s in result.timeline] == ["tie1", "tie2", "long"]
    assert result.jobs[0].waiting_time == 4


def test_priority_higher_number_first_and_stable_tie():
    result = run_schedule([job("low", 0, 1, 2), job("high1", 0, 1, 90),
                           job("high2", 0, 2, 90)], "PRIORITY")
    assert [s.job_id for s in result.timeline] == ["high1", "high2", "low"]
    assert "Higher numeric" in result.priority_convention


def test_round_robin_slices_and_arrivals_during_slice():
    result = run_schedule([job("a", 0, 5), job("b", 1, 2)], "ROUND_ROBIN", 3)
    assert [(s.job_id, s.start_time, s.end_time) for s in result.timeline] == [
        ("a", 0, 3), ("b", 3, 5), ("a", 5, 7)]
    assert [(m.job_id, m.first_start_time, m.completion_time, m.waiting_time,
             m.turnaround_time, m.response_time) for m in result.jobs] == [
                 ("a", 0, 7, 2, 7, 0), ("b", 3, 5, 2, 4, 2)]
    assert (result.average_waiting_time, result.average_turnaround_time,
            result.average_response_time) == (2, 5.5, 1)


def test_round_robin_idle_then_arrival():
    result = run_schedule([job("x", 4, 1)], "ROUND_ROBIN", 2)
    assert [(s.job_id, s.start_time, s.end_time) for s in result.timeline] == [(None, 0, 4), ("x", 4, 5)]


@pytest.mark.parametrize("jobs,algorithm,quantum", [([], "FCFS", None), ([job("x", 0, 1), job("x", 1, 2)], "FCFS", None),
                                                      ([job("x", 0, 1)], "ROUND_ROBIN", None),
                                                      ([job("x", 0, 1)], "ROUND_ROBIN", 0)])
def test_invalid_engine_inputs(jobs, algorithm, quantum):
    with pytest.raises(ValueError):
        run_schedule(jobs, algorithm, quantum)
