"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { ProcessStateGraph } from "@/components/ProcessStateGraph";
import {
  derivePlaybackEvents,
  getPlaybackEventTimes,
  getPlaybackSnapshot,
  getPlaybackTransitionsBetween,
  getPlaybackTotalTime,
} from "@/lib/schedulingPlayback";
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
  const [playbackTime, setPlaybackTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [animationResetKey, setAnimationResetKey] = useState(0);
  const [animationEvents, setAnimationEvents] = useState<ReturnType<typeof getPlaybackTransitionsBetween>>([]);
  const playbackTimeRef = useRef(0);
  const hasStartedTimelineRef = useRef(false);

  const jobs = useMemo(() => toJobInputs(drafts), [drafts]);
  const quantum = Number(timeQuantum);
  const validQuantum = Number.isInteger(quantum) && quantum > 0;
  const activeResult = comparison?.results[comparisonAlgorithm] ?? result;
  const playbackEvents = useMemo(() => activeResult ? derivePlaybackEvents(activeResult) : [], [activeResult]);
  const eventTimes = useMemo(() => getPlaybackEventTimes(playbackEvents), [playbackEvents]);
  const totalTime = activeResult ? getPlaybackTotalTime(activeResult) : 0;
  const playbackSnapshot = activeResult
    ? getPlaybackSnapshot(activeResult, playbackEvents, playbackTime)
    : null;
  const seekTo = (time: number, replayFromStart = false) => {
    const nextTime = Math.max(0, Math.min(totalTime, time));
    hasStartedTimelineRef.current = !replayFromStart;
    setAnimationEvents([]);
    setAnimationResetKey((key) => key + 1);
    playbackTimeRef.current = nextTime;
    setPlaybackTime(nextTime);
  };

  useEffect(() => {
    playbackTimeRef.current = playbackTime;
  }, [playbackTime]);

  useEffect(() => {
    setIsPlaying(false);
    hasStartedTimelineRef.current = false;
    setAnimationEvents([]);
    setAnimationResetKey((key) => key + 1);
    playbackTimeRef.current = 0;
    setPlaybackTime(0);
  }, [activeResult]);

  useEffect(() => {
    if (!isPlaying || totalTime <= 0) return;
    let frame = 0;
    let previousFrame: number | null = null;
    const advance = (now: number) => {
      if (previousFrame === null) previousFrame = now;
      const elapsedSeconds = (now - previousFrame) / 1000;
      previousFrame = now;
      const nextTime = playbackTimeRef.current + elapsedSeconds * playbackSpeed;
      const previousTime = playbackTimeRef.current;
      const crossed = getPlaybackTransitionsBetween(
        playbackEvents,
        previousTime,
        Math.min(nextTime, totalTime),
        !hasStartedTimelineRef.current && previousTime === 0,
      );
      if (crossed.length > 0) setAnimationEvents((current) => [...current, ...crossed]);
      hasStartedTimelineRef.current = true;
      if (nextTime >= totalTime) {
        playbackTimeRef.current = totalTime;
        setPlaybackTime(totalTime);
        setIsPlaying(false);
        return;
      }
      playbackTimeRef.current = nextTime;
      setPlaybackTime(nextTime);
      frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, playbackSpeed, totalTime, playbackEvents]);

  const updateDraft = (index: number, key: keyof JobDraft, value: string) => {
    setIsPlaying(false);
    seekTo(0);
    setDrafts((current) => current.map((draft, currentIndex) =>
      currentIndex === index ? { ...draft, [key]: value } : draft));
    setError(null);
    setResult(null);
    setComparison(null);
  };

  const addJob = () => {
    setIsPlaying(false);
    seekTo(0);
    const jobNumber = nextJobNumber.current++;
    const id = `job-${jobNumber}`;
    setDrafts((current) => [...current, { job_id: id, name: `Process ${jobNumber}`, arrival_time: "0", burst_time: "1", priority: "50" }]);
    setError(null);
    setResult(null);
    setComparison(null);
  };

  const removeJob = (index: number) => {
    setIsPlaying(false);
    seekTo(0);
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
    setIsPlaying(false);
    seekTo(0);
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
    setIsPlaying(false);
    seekTo(0);
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
    const timelineTotal = getPlaybackTotalTime(schedule) || 1;
    const currentSegment = playbackSnapshot?.segment;
    const timelineWidth = Math.max(700, Math.min(2400, timelineTotal * 30));
    return (
      <div className="overflow-x-auto pb-2" aria-label={`${schedule.algorithm} execution timeline`}>
        <div style={{ width: `${timelineWidth}px` }}>
          <div className="relative overflow-hidden rounded-lg border border-base-300">
            <div className="flex">
              {schedule.timeline.map((segment, index) => {
                const width = `${(segment.duration / timelineTotal) * 100}%`;
                const isCurrent = currentSegment === segment && playbackTime < totalTime;
                return (
                  <div
                    key={`${segment.job_id ?? "idle"}-${segment.start_time}-${index}`}
                    title={`${segment.name}: ${segment.start_time}–${segment.end_time} (${segment.duration} units)`}
                    className={`flex min-h-14 min-w-0 flex-col justify-center border-r border-base-100 px-2 py-2 text-center last:border-r-0 ${segment.job_id === null ? "bg-base-300 text-base-content/70" : isCurrent ? "bg-primary/35 text-base-content ring-2 ring-inset ring-primary" : "bg-primary/15 text-base-content"}`}
                    style={{ width, flex: `0 0 ${width}` }}
                  >
                    <span className="truncate text-xs font-semibold">{segment.name}</span>
                    <span className="truncate font-mono text-[0.7rem]">{segment.start_time}–{segment.end_time}</span>
                  </div>
                );
              })}
            </div>
            {activeResult && playbackTime <= totalTime && (
              <div aria-hidden="true" className="pointer-events-none absolute bottom-0 top-0 z-10 w-0.5 bg-error shadow-[0_0_5px_rgba(0,0,0,0.35)]" style={{ left: `${(playbackTime / timelineTotal) * 100}%` }} />
            )}
          </div>
          <div className="relative mt-2 h-5 font-mono text-xs text-base-content/60">
            {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
              <span key={fraction} className={`absolute whitespace-nowrap ${fraction === 0 ? "" : fraction === 1 ? "-translate-x-full" : "-translate-x-1/2"}`} style={{ left: `${fraction * 100}%` }}>
                {formatTime(timelineTotal * fraction)}
              </span>
            ))}
            <span className="sr-only">time units</span>
          </div>
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
                <select className="select select-bordered select-sm w-full" value={algorithm} onChange={(event) => { setIsPlaying(false); seekTo(0); setAlgorithm(event.target.value as SchedulingAlgorithm); }}>
                  {algorithmOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className={`form-control w-full ${algorithm !== "ROUND_ROBIN" ? "opacity-60" : ""}`}>
                <span className="label-text ui-label mb-1">Round Robin time quantum</span>
                <input className="input input-bordered input-sm w-full" type="number" min="1" step="1" value={timeQuantum} onChange={(event) => { setIsPlaying(false); seekTo(0); setResult(null); setComparison(null); setTimeQuantum(event.target.value); }} disabled={algorithm !== "ROUND_ROBIN"} />
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
                onClick={() => { setIsPlaying(false); seekTo(0); setComparisonAlgorithm(option.value); }}>{option.value === "PRIORITY" ? "Priority" : option.value.replace("ROUND_ROBIN", "Round Robin")}</button>
            ))}
          </nav>
        )}

        {activeResult ? (
          <section className="space-y-4 rounded-lg border border-base-300 bg-base-100 p-4 sm:p-5" aria-labelledby="schedule-result-title">
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
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)]">
              <div className="min-w-0 space-y-4">
                <section className="rounded-lg border border-base-300 bg-base-100 p-3 sm:p-4" aria-label="Interactive scheduling playback">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div><h4 className="ui-section-label">Process lifecycle</h4><p className="ui-meta">Follow each job through admission, dispatch, preemption, and completion.</p></div>
                    <span className="rounded-md bg-base-200 px-3 py-2 font-mono text-lg font-bold" aria-label="Current simulated time">t = {formatTime(playbackTime)}</span>
                  </div>
                  <div className="h-[min(60vh,600px)] min-h-[390px] w-full">
                    <ProcessStateGraph
                      processes={[]}
                      selectedPid={null}
                      validActions={[]}
                      pendingAction={null}
                      playback={{
                        jobs: activeResult.jobs.map((job) => ({ job_id: job.job_id, name: job.name, state: playbackSnapshot?.states[job.job_id] ?? "NEW" })),
                        activeAction: playbackSnapshot?.event?.action ?? null,
                        activeJobId: playbackSnapshot?.event?.job_id ?? null,
                        runningJobId: playbackSnapshot?.runningJobId ?? null,
                        animationEvents,
                        animationResetKey,
                        isPlaying,
                        playbackSpeed,
                        isAtEnd: playbackTime >= totalTime,
                      }}
                    />
                  </div>
                </section>

                <section className="rounded-lg border border-base-300 bg-base-100 p-3 sm:p-4" aria-label="Scheduling Gantt chart">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div><h4 className="ui-section-label">Gantt timeline</h4><p className="ui-meta">The highlighted interval and playhead use the lifecycle clock.</p></div>
                    <span className="ui-meta">Gray = CPU idle</span>
                  </div>
                  {appendBlankTimeline(activeResult)}
                </section>
              </div>

              <aside className="min-w-0 space-y-4 rounded-lg border border-base-300 bg-base-100 p-4 lg:sticky lg:top-4" aria-label="Playback controls and events">
                <div className="flex items-end justify-between gap-2">
                  <div><p className="ui-section-label">Playback</p><p className="mt-1 font-mono text-2xl font-bold">{formatTime(playbackTime)}<span className="ml-1 text-sm font-medium text-base-content/60">/ {formatTime(totalTime)}</span></p></div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${playbackTime >= totalTime ? "bg-success/15 text-success" : playbackSnapshot?.runningJobId ? "bg-amber-500/15 text-amber-800" : "bg-base-200 text-base-content/70"}`}>
                    {playbackTime >= totalTime ? "COMPLETE" : playbackSnapshot?.runningJobId ? `RUNNING · ${playbackSnapshot.runningJobId}` : "CPU IDLE"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="btn btn-primary col-span-2" disabled={(!isPlaying && playbackTime >= totalTime) || totalTime <= 0} onClick={() => setIsPlaying((playing) => !playing)}>{isPlaying ? "Pause" : "Play"}</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { setIsPlaying(false); seekTo(0, true); }}>Restart</button>
                  <label className="form-control">
                    <span className="sr-only">Playback speed</span>
                    <select aria-label="Playback speed" className="select select-bordered select-sm w-full" value={playbackSpeed} onChange={(event) => setPlaybackSpeed(Number(event.target.value))}>
                      {[0.5, 1, 2, 4].map((speed) => <option key={speed} value={speed}>{speed}× speed</option>)}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="btn btn-outline btn-sm" disabled={!eventTimes.some((time) => time < playbackTime)} onClick={() => { setIsPlaying(false); seekTo([...eventTimes].reverse().find((time) => time < playbackTime) ?? 0); }}>← Previous event</button>
                  <button type="button" className="btn btn-outline btn-sm" disabled={!eventTimes.some((time) => time > playbackTime)} onClick={() => { setIsPlaying(false); seekTo(eventTimes.find((time) => time > playbackTime) ?? totalTime); }}>Next event →</button>
                </div>

                <label className="block space-y-1">
                  <span className="sr-only">Seek simulation time</span>
                  <input aria-label="Seek simulation time" className="range range-primary range-sm w-full" type="range" min="0" max={totalTime || 1} step="0.01" value={playbackTime} onChange={(event) => { setIsPlaying(false); seekTo(Number(event.target.value)); }} />
                  <span className="flex justify-between font-mono text-xs text-base-content/60"><span>0</span><span>{formatTime(totalTime)} units</span></span>
                </label>

                <section className="rounded-md border border-primary/30 bg-primary/5 p-3" aria-live="polite" aria-atomic="true">
                  <p className="ui-section-label">Current event</p>
                  <p className="mt-1 font-semibold">{playbackSnapshot?.event ? `${playbackSnapshot.event.action} · ${playbackSnapshot.event.from} → ${playbackSnapshot.event.to}` : playbackTime >= totalTime ? "Schedule complete" : playbackSnapshot?.segment?.job_id === null ? "CPU idle" : "Simulation ready"}</p>
                  <p className="ui-body mt-1">{playbackSnapshot?.explanation}</p>
                </section>

                <section aria-label="Recent scheduling events">
                  <h4 className="ui-section-label mb-2">Recent events</h4>
                  <ol className="space-y-2">
                    {playbackEvents.filter((event) => event.time <= playbackTime).slice(-6).reverse().map((event, index) => (
                      <li key={`${event.time}-${event.job_id}-${event.action}-${index}`} className="flex items-start gap-2 border-l-2 border-base-300 pl-2 text-xs">
                        <span className="shrink-0 font-mono text-base-content/60">{formatTime(event.time)}</span>
                        <span className="min-w-0"><strong>{event.job_id}</strong><span className="ml-1">{event.from} → {event.to}</span><span className="ml-1 text-base-content/60">{event.action}</span></span>
                      </li>
                    ))}
                    {playbackEvents.every((event) => event.time > playbackTime) && <li className="ui-meta">Events will appear here during playback.</li>}
                  </ol>
                </section>
              </aside>
            </div>
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
