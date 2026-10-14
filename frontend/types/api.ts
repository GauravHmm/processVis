/**
 * TypeScript types mirroring the FastAPI backend schemas.
 * These are the source of truth for frontend data structures.
 */

export interface PCBResponse {
  pid: number;
  name: string;
  state: string;
  priority: number;
  parent_pid: number | null;
  program_counter: string;
  cpu_registers: Record<string, number>;
  memory_base: string;
  memory_limit: string;
  creation_time: string;
  children: number[];
}

export interface ProcessListResponse {
  processes: PCBResponse[];
}

export interface ProcessCreateRequest {
  name: string;
  priority?: number;
  parent_pid?: number;
}

export interface TransitionResponse {
  success: boolean;
  action: string;
  from_state: string | null;
  to_state: string | null;
  message: string | null;
}

export interface ValidActionsResponse {
  pid: number;
  actions: string[];
}

export interface ParentResponse {
  pid: number;
  parent: PCBResponse | null;
}

export interface ChildrenResponse {
  pid: number;
  children: PCBResponse[];
}

export interface ProcessTreeResponse {
  tree: Record<string, number[]>;
}

export interface EventsResponse {
  events: string[];
}

export interface ResetResponse {
  success: boolean;
  message: string;
}

export interface HealthCheckResponse {
  status: string;
}

/**
 * Error body returned by the API.
 *
 * Application errors raised through `HTTPException` carry a plain string in
 * `detail`. Request-body validation failures (HTTP 422) carry FastAPI's list of
 * validation issues instead; the client normalises both into a readable string.
 */
export interface ApiValidationIssue {
  type?: string;
  loc?: (string | number)[];
  msg: string;
  input?: unknown;
}

export interface ApiErrorResponse {
  detail: string | ApiValidationIssue[];
}

export type SchedulingAlgorithm = "FCFS" | "SJF" | "PRIORITY" | "ROUND_ROBIN";

export interface SchedulingJobInput {
  job_id: string;
  name: string;
  arrival_time: number;
  burst_time: number;
  priority: number;
}

export interface SchedulingRequest {
  jobs: SchedulingJobInput[];
  algorithm: SchedulingAlgorithm;
  time_quantum?: number;
}

export interface SchedulingComparisonRequest {
  jobs: SchedulingJobInput[];
  time_quantum: number;
}

export interface SchedulingTimelineSegment {
  job_id: string | null;
  name: string;
  start_time: number;
  end_time: number;
  duration: number;
}

export interface SchedulingJobMetrics extends SchedulingJobInput {
  first_start_time: number;
  completion_time: number;
  waiting_time: number;
  turnaround_time: number;
  response_time: number;
}

export interface SchedulingResult {
  algorithm: SchedulingAlgorithm;
  time_quantum: number | null;
  priority_convention: string;
  jobs: SchedulingJobMetrics[];
  timeline: SchedulingTimelineSegment[];
  average_waiting_time: number;
  average_turnaround_time: number;
  average_response_time: number;
}

export interface SchedulingComparisonResponse {
  results: Record<SchedulingAlgorithm, SchedulingResult>;
}

export type ProcessState =
  | "NEW"
  | "READY"
  | "RUNNING"
  | "BLOCKED"
  | "TERMINATED";

export type ProcessAction =
  | "ADMIT"
  | "DISPATCH"
  | "PREEMPT"
  | "BLOCK"
  | "WAKE"
  | "TERMINATE";
