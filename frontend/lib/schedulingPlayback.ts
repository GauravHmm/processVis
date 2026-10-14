import type {
  ProcessAction,
  ProcessState,
  SchedulingResult,
  SchedulingTimelineSegment,
} from "@/types/api";

export interface PlaybackEvent {
  time: number;
  phase: number;
  job_id: string;
  action: ProcessAction;
  from: ProcessState;
  to: ProcessState;
  explanation: string;
}

export interface PlaybackSnapshot {
  states: Record<string, ProcessState>;
  event: PlaybackEvent | null;
  eventsAtTime: PlaybackEvent[];
  runningJobId: string | null;
  segment: SchedulingTimelineSegment | null;
  explanation: string;
}

export interface PlaybackTransitionAnimation {
  eventId: string;
  time: number;
  phase: number;
  action: ProcessAction;
  jobId: string;
  from: ProcessState;
  to: ProcessState;
}

/** Return only events crossed by the playback clock, retaining stable ties. */
export function getPlaybackTransitionsBetween(
  events: PlaybackEvent[],
  fromTime: number,
  toTime: number,
  includeFromTime = false,
): PlaybackTransitionAnimation[] {
  return events
    .filter((event) => (event.time > fromTime || (includeFromTime && event.time === fromTime)) && event.time <= toTime)
    .map((event) => ({
      eventId: `${event.time}:${event.phase}:${event.job_id}:${event.action}`,
      time: event.time,
      phase: event.phase,
      action: event.action,
      jobId: event.job_id,
      from: event.from,
      to: event.to,
    }));
}

/** Derive lifecycle transitions from the backend's immutable intervals and metrics. */
export function derivePlaybackEvents(result: SchedulingResult): PlaybackEvent[] {
  const events: PlaybackEvent[] = [];
  for (const job of result.jobs) {
    events.push({
      time: job.arrival_time,
      phase: 1,
      job_id: job.job_id,
      action: "ADMIT",
      from: "NEW",
      to: "READY",
      explanation: `${job.name} arrived and entered READY.`,
    });
  }

  for (const segment of result.timeline) {
    if (!segment.job_id) continue;
    const job = result.jobs.find((item) => item.job_id === segment.job_id);
    if (!job) continue;
    events.push({
      time: segment.start_time,
      // At an RR boundary, arrivals are admitted before the unfinished slice
      // is requeued; dispatch follows both queue updates.
      phase: result.algorithm === "ROUND_ROBIN" ? 3 : 2,
      job_id: job.job_id,
      action: "DISPATCH",
      from: "READY",
      to: "RUNNING",
      explanation: `${job.name} was dispatched to RUNNING.`,
    });
    const completed = segment.end_time === job.completion_time;
    const action: ProcessAction = completed ? "TERMINATE" : "PREEMPT";
    events.push({
      time: segment.end_time,
      phase: completed ? 0 : result.algorithm === "ROUND_ROBIN" ? 2 : 0,
      job_id: job.job_id,
      action,
      from: "RUNNING",
      to: completed ? "TERMINATED" : "READY",
      explanation: completed
        ? `${job.name} completed execution and entered TERMINATED.`
        : result.algorithm === "ROUND_ROBIN"
          ? `${job.name}'s Round Robin quantum expired; it returned to READY.`
          : `${job.name} returned to READY.`,
    });
  }

  return events.sort((a, b) => a.time - b.time || a.phase - b.phase);
}

export function getPlaybackTotalTime(result: SchedulingResult): number {
  return result.timeline.at(-1)?.end_time ?? 0;
}

export function getPlaybackEventTimes(events: PlaybackEvent[]): number[] {
  return [...new Set(events.map((event) => event.time))].sort((a, b) => a - b);
}

/** Rebuild state at a right-continuous time: all events at t have been applied. */
export function getPlaybackSnapshot(
  result: SchedulingResult,
  events: PlaybackEvent[],
  time: number,
): PlaybackSnapshot {
  const states: Record<string, ProcessState> = Object.fromEntries(
    result.jobs.map((job) => [job.job_id, "NEW" as ProcessState]),
  );
  let currentEvent: PlaybackEvent | null = null;
  let eventsAtTime: PlaybackEvent[] = [];
  for (const event of events) {
    if (event.time > time) break;
    states[event.job_id] = event.to;
    eventsAtTime = currentEvent?.time === event.time ? [...eventsAtTime, event] : [event];
    currentEvent = event;
  }

  const total = getPlaybackTotalTime(result);
  const segment = time >= total
    ? null
    : result.timeline.find((item) => item.start_time <= time && time < item.end_time) ?? null;
  const runningJobId = segment?.job_id ?? null;
  let explanation = eventsAtTime.length > 0
    ? eventsAtTime.map((event) => event.explanation).join(" ")
    : "Simulation ready. Press Play or step to the next event.";
  if (segment?.job_id === null) {
    const nextArrival = result.jobs
      .filter((job) => job.arrival_time > time)
      .reduce<number | null>((next, job) => next === null || job.arrival_time < next ? job.arrival_time : next, null);
    explanation = nextArrival === null
      ? "CPU is idle."
      : `CPU is idle until the next process arrives at time ${nextArrival}.`;
  } else if (!segment && time >= total) {
    explanation = "All jobs have completed; the schedule is finished.";
  }

  return { states, event: currentEvent, eventsAtTime, runningJobId, segment, explanation };
}

