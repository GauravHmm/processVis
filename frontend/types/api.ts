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

export interface ApiErrorResponse {
  detail: string;
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