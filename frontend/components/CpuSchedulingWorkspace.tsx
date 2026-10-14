"use client";

import { useMemo, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type {
  SchedulingAlgorithm,
  SchedulingComparisonResponse,
  SchedulingJobInput,
  SchedulingResult,
} from "@/types/api";

type JobDraft = {
  job_id: string;
  name: string;
  arrival_time: string;
  burst_time: string;
  priority: string;
};

const algorithmOptions: { value: SchedulingAlgorithm; label: string }[] = [
  { value: "FCFS", label: "First Come, First Served (FCFS)" },
  { value: "SJF", label: "Shortest Job First (SJF)" },
  { value: "PRIORITY", label: "Priority Scheduling" },
  { value: "ROUND_ROBIN", label: "Round Robin" },
];

const initialJobs: JobDraft[] = [
  { job_id: "job-1", name: "Compile", arrival_time: "0", burst_time: "6", priority: "50" },
  { job_id: "job-2", name: "Render", arrival_time: "1", burst_time: "3", priority: "80" },
  { job_id: "job-3", name: "Index", arrival_time: "3", burst_time: "2", priority: "30" },
];

function formatTime(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function toJobInputs(drafts: JobDraft[]): SchedulingJobInput[] | null {
  const jobs: SchedulingJobInput[] = [];
  for (const draft of drafts) {
    const arrival = Number(draft.arrival_time);
    const burst = Number(draft.burst_time);
    const priority = Number(draft.priority);
    if (!draft.name.trim() || !draft.job_id || !draft.arrival_time.trim() || !draft.burst_time.trim() ||
      !draft.priority.trim() || !Number.isInteger(arrival) || arrival < 0 ||
      !Number.isInteger(burst) || burst <= 0 || !Number.isInteger(priority) || priority < 0 || priority > 100) {
      return null;
    }
    jobs.push({ job_id: draft.job_id, name: draft.name.trim(), arrival_time: arrival, burst_time: burst, priority });
  }
  return jobs.length > 0 ? jobs : null;
}

export function CpuSchedulingWorkspace() {
  const [drafts, setDrafts] = useState<JobDraft[]>(initialJobs);
  const nextJobNumber = useRef(initialJobs.length + 1);
  const [algorithm, setAlgorithm] = useState<SchedulingAlgorithm>("FCFS");
  const [timeQuantum, setTimeQuantum] = useState("2");
  const [result, setResult] = useState<SchedulingResult | null>(null);
  const [comparison, setComparison] = useState<SchedulingComparisonResponse | null>(null);
  const [comparisonAlgorithm, setComparisonAlgorithm] = useState<SchedulingAlgorithm>("FCFS");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jobs = useMemo(() => toJobInputs(drafts), [drafts]);
  const quantum = Number(timeQuantum);
  const validQuantum = Number.isInteger(quantum) && quantum > 0;
  const activeResult = comparison?.results[comparisonAlgorithm] ?? result;

  const updateDraft = (index: number, key: keyof JobDraft, value: string) => {
    setDrafts((current) => current.map((draft, currentIndex) =>
      currentIndex === index ? { ...draft, [key]: value } : draft));
    setError(null);
    setResult(null);
    setComparison(null);
  };

  const addJob = () => {
    const jobNumber = nextJobNumber.current++;
    const id = `job-${jobNumber}`;
    setDrafts((current) => [...current, { job_id: id, name: `Process ${jobNumber}`, arrival_time: "0", burst_time: "1", priority: "50" }]);
    setError(null);
    setResult(null);
    setComparison(null);
  };

  const removeJob = (index: number) => {
    setDrafts((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setError(null);
    setResult(null);
    setComparison(null);
  };

  const runSelected = async () => {
    if (!jobs) {
      setError("Add at least one job and enter a name, nonnegative arrival, positive burst, and priority from 0 to 100.");
      return;
    }
    if (algorithm === "ROUND_ROBIN" && !validQuantum) {
      setError("Round Robin requires a positive whole-number time quantum.");
      return;
    }
    setIsRunning(true);
    setError(null);
    setComparison(null);
    try {
      const response = await api.runScheduling({
        jobs,
        algorithm,
        ...(algorithm === "ROUND_ROBIN" ? { time_quantum: quantum } : {}),
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not run the scheduling simulation.");
    } finally {
      setIsRunning(false);
    }
  };

  const compareAll = async () => {
    if (!jobs) {
      setError("Add at least one job and enter valid values before comparing algorithms.");
      return;
    }
    if (!validQuantum) {
      setError("Comparison requires a positive whole-number Round Robin time quantum.");
      return;
    }
    setIsRunning(true);
    setError(null);
    try {
      const response = await api.compareScheduling({ jobs, time_quantum: quantum });
      setComparison(response);
      setComparisonAlgorithm("FCFS");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not compare the scheduling algorithms.");
    } finally {
      setIsRunning(false);
    }
  };

  const appendBlankTimeline = (schedule: SchedulingResult) => {
    const totalTime = schedule.timeline.at(-1)?.end_time ?? 1;
    return (
      <div className="overflow-x-auto pb-2" aria-label={`${schedule.algorithm} execution timeline`}>
        <div className="flex min-w-[560px] overflow-hidden rounded-lg border border-base-300">
          {schedule.timeline.map((segment, index) => {
            const width = `${(segment.duration / totalTime) * 100}%`;
            return (
              <div
                key={`${segment.job_id ?? "idle"}-${segment.start_time}-${index}`}
                title={`${segment.name}: ${segment.start_time}–${segment.end_time} (${segment.duration} units)`}
                className={`flex min-w-[4rem] flex-col justify-center border-r border-base-100 px-2 py-2 text-center last:border-r-0 ${segment.job_id === null ? "bg-base-300 text-base-content/70" : "bg-primary/15 text-base-content"}`}
                style={{ width, flex: `0 0 ${width}` }}
              >
                <span className="truncate text-xs font-semibold">{segment.name}</span>
                <span className="font-mono text-[0.7rem]">{segment.start_time}–{segment.end_time}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between font-mono text-xs text-base-content/60">
          <span>0</span><span>{totalTime} time units</span>
        </div>
      </div>
    );
  };

  return (
    <section className="h-full overflow-y-auto bg-base-200 p-4 sm:p-6" aria-labelledby="cpu-scheduling-title">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="ui-section-label">CPU Scheduling Lab</p>
            <h2 id="cpu-scheduling-title" className="mt-1 text-xl font-semibold">Compare simulated CPU schedules</h2>
            <p className="ui-meta mt-1">Scheduling bursts are separate inputs and do not change process states or PCB values.</p>
          </div>
          <div className="rounded-md border border-base-300 bg-base-100 px-3 py-2 text-xs text-base-content/70">
            Priority: higher value wins · range 0–100
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <section className="rounded-lg border border-base-300 bg-base-100" aria-labelledby="scheduling-jobs-title">
            <div className="flex items-center justify-between border-b border-base-300 px-4 py-3">
              <div><h3 id="scheduling-jobs-title" className="ui-panel-title">Scheduling Jobs</h3><p className="ui-meta">Set arrival, CPU burst, and priority for each job.</p></div>
              <button type="button" className="btn btn-sm btn-outline" onClick={addJob}>Add job</button>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead><tr><th>Name</th><th>Arrival</th><th>CPU burst</th><th>Priority</th><th><span className="sr-only">Remove</span></th></tr></thead>
                <tbody>
                  {drafts.map((draft, index) => (
                    <tr key={draft.job_id}>
                      <td><input aria-label={`Job ${index + 1} name`} className="input input-bordered input-sm w-32" maxLength={64} value={draft.name} onChange={(event) => updateDraft(index, "name", event.target.value)} /></td>
                      <td><input aria-label={`${draft.name || `Job ${index + 1}`} arrival time`} className="input input-bordered input-sm w-20" type="number" min="0" step="1" value={draft.arrival_time} onChange={(event) => updateDraft(index, "arrival_time", event.target.value)} /></td>
                      <td><input aria-label={`${draft.name || `Job ${index + 1}`} CPU burst`} className="input input-bordered input-sm w-20" type="number" min="1" step="1" value={draft.burst_time} onChange={(event) => updateDraft(index, "burst_time", event.target.value)} /></td>
                      <td><input aria-label={`${draft.name || `Job ${index + 1}`} priority`} className="input input-bordered input-sm w-20" type="number" min="0" max="100" step="1" value={draft.priority} onChange={(event) => updateDraft(index, "priority", event.target.value)} /></td>
                      <td><button type="button" className="btn btn-ghost btn-xs" aria-label={`Remove ${draft.name || `job ${index + 1}`}`} onClick={() => removeJob(index)}>×</button></td>
                    </tr>
                  ))}
                  {drafts.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-sm text-base-content/60">No jobs yet. Add a job to start a schedule.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="px-4 pb-3 ui-meta">Time values are integer simulation units. Job IDs are generated locally.</p>
          </section>

          <section className="rounded-lg border border-base-300 bg-base-100" aria-labelledby="scheduling-controls-title">
            <div className="border-b border-base-300 px-4 py-3"><h3 id="scheduling-controls-title" className="ui-panel-title">Run schedule</h3><p className="ui-meta">Run one algorithm or compare all four on identical jobs.</p></div>
            <div className="space-y-4 p-4">
              <label className="form-control w-full">
                <span className="label-text ui-label mb-1">Algorithm</span>
                <select className="select select-bordered select-sm w-full" value={algorithm} onChange={(event) => setAlgorithm(event.target.value as SchedulingAlgorithm)}>
                  {algorithmOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className={`form-control w-full ${algorithm !== "ROUND_ROBIN" ? "opacity-60" : ""}`}>
                <span className="label-text ui-label mb-1">Round Robin time quantum</span>
                <input className="input input-bordered input-sm w-full" type="number" min="1" step="1" value={timeQuantum} onChange={(event) => setTimeQuantum(event.target.value)} disabled={algorithm !== "ROUND_ROBIN"} />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" className="btn btn-primary btn-sm" disabled={isRunning} onClick={runSelected}>
                  {isRunning && <span className="loading loading-spinner loading-xs" />}{isRunning ? "Running…" : "Run selected"}
                </button>
                <button type="button" className="btn btn-outline btn-sm" disabled={isRunning} onClick={compareAll}>
                  {isRunning && <span className="loading loading-spinner loading-xs" />}{isRunning ? "Working…" : "Compare all four"}
                </button>
              </div>
              <p className="ui-meta">Comparison uses this quantum for Round Robin and the same job input for every algorithm.</p>
              {error && <div role="alert" className="alert alert-error py-2 text-sm">{error}</div>}
            </div>
          </section>
        </div>

        {comparison && (
          <nav className="tabs tabs-boxed w-fit max-w-full overflow-x-auto" aria-label="Compared scheduling algorithms">
            {algorithmOptions.map((option) => (
              <button key={option.value} type="button" role="tab" aria-selected={comparisonAlgorithm === option.value}
                className={`tab whitespace-nowrap ${comparisonAlgorithm === option.value ? "tab-active" : ""}`}
                onClick={() => setComparisonAlgorithm(option.value)}>{option.value === "PRIORITY" ? "Priority" : option.value.replace("ROUND_ROBIN", "Round Robin")}</button>
            ))}
          </nav>
        )}

        {activeResult ? (
          <section className="space-y-4 rounded-lg border border-base-300 bg-base-100 p-4 sm:p-5" aria-live="polite" aria-labelledby="schedule-result-title">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><p className="ui-section-label">Schedule result</p><h3 id="schedule-result-title" className="ui-panel-title mt-1">{algorithmOptions.find((option) => option.value === activeResult.algorithm)?.label}</h3></div>
              <span className="rounded-md bg-base-200 px-2 py-1 font-mono text-xs">{activeResult.jobs.length} jobs · {activeResult.timeline.at(-1)?.end_time ?? 0} time units</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                ["Average waiting", activeResult.average_waiting_time],
                ["Average turnaround", activeResult.average_turnaround_time],
                ["Average response", activeResult.average_response_time],
              ].map(([label, value]) => <div key={label} className="rounded-md border border-base-300 bg-base-100 px-3 py-2"><p className="ui-meta">{label}</p><p className="mt-1 font-mono text-lg font-semibold">{formatTime(Number(value))}</p></div>)}
            </div>
            {activeResult.algorithm === "PRIORITY" && <p className="ui-meta">{activeResult.priority_convention}</p>}
            {activeResult.algorithm === "ROUND_ROBIN" && <p className="ui-meta">Time quantum: {activeResult.time_quantum} units.</p>}
            <div><h4 className="ui-section-label mb-2">Gantt timeline</h4>{appendBlankTimeline(activeResult)}<p className="ui-meta">Gray segments indicate idle CPU time.</p></div>
            <div className="overflow-x-auto">
              <table className="table table-sm table-zebra">
                <thead><tr><th>Job</th><th>Arrival</th><th>Burst</th><th>First start</th><th>Completion</th><th>Waiting</th><th>Turnaround</th><th>Response</th></tr></thead>
                <tbody>{activeResult.jobs.map((job) => <tr key={job.job_id}><th>{job.name}</th><td>{job.arrival_time}</td><td>{job.burst_time}</td><td>{job.first_start_time}</td><td>{job.completion_time}</td><td>{job.waiting_time}</td><td>{job.turnaround_time}</td><td>{job.response_time}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
        ) : (
          <div className="rounded-lg border border-dashed border-base-300 bg-base-100 px-4 py-8 text-center">
            <p className="ui-panel-title">No schedule result yet</p><p className="ui-meta mt-1">Choose an algorithm and run the simulation to see its timeline and metrics.</p>
          </div>
        )}
      </div>
    </section>
  );
}
