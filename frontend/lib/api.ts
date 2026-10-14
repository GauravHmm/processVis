/**
 * API client for the Process Creation and State Transition Visualizer.
 * Uses native fetch() with typed request/response handling.
 */

import type {
  PCBResponse,
  ProcessListResponse,
  ProcessCreateRequest,
  TransitionResponse,
  ValidActionsResponse,
  ParentResponse,
  ChildrenResponse,
  ProcessTreeResponse,
  EventsResponse,
  ResetResponse,
  HealthCheckResponse,
  ApiErrorResponse,
  SchedulingRequest,
  SchedulingComparisonRequest,
  SchedulingResult,
  SchedulingComparisonResponse,
} from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  public readonly status: number;
  public readonly endpoint: string;
  public readonly detail: string;

  constructor(status: number, endpoint: string, detail: string) {
    super(`API Error (${status}) ${endpoint}: ${detail}`);
    this.name = "ApiError";
    this.status = status;
    this.endpoint = endpoint;
    this.detail = detail;
  }
}

async function handleResponse<T>(response: Response, endpoint: string): Promise<T> {
  if (!response.ok) {
    let detail: string;
    try {
      const errorData: ApiErrorResponse = await response.json();
      detail = errorData.detail ?? response.statusText;
    } catch {
      detail = response.statusText;
    }
    throw new ApiError(response.status, endpoint, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

async function fetchJson<T>(
  url: string,
  options: RequestInit = {},
  endpoint: string
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  return handleResponse<T>(response, endpoint);
}

export const api = {
  healthCheck: (): Promise<HealthCheckResponse> =>
    fetchJson<HealthCheckResponse>(`${API_BASE_URL}/api/health`, {}, "GET /api/health"),

  runScheduling: (data: SchedulingRequest): Promise<SchedulingResult> =>
    fetchJson<SchedulingResult>(`${API_BASE_URL}/api/scheduling/run`,
      { method: "POST", body: JSON.stringify(data) }, "POST /api/scheduling/run"),

  compareScheduling: (data: SchedulingComparisonRequest): Promise<SchedulingComparisonResponse> =>
    fetchJson<SchedulingComparisonResponse>(`${API_BASE_URL}/api/scheduling/compare`,
      { method: "POST", body: JSON.stringify(data) }, "POST /api/scheduling/compare"),

  // Process listing and creation
  getProcesses: (): Promise<ProcessListResponse> =>
    fetchJson<ProcessListResponse>(`${API_BASE_URL}/api/processes`, {}, "GET /api/processes"),

  getProcess: (pid: number): Promise<PCBResponse> =>
    fetchJson<PCBResponse>(`${API_BASE_URL}/api/processes/${pid}`, {}, `GET /api/processes/${pid}`),

  createProcess: (data: ProcessCreateRequest): Promise<PCBResponse> =>
    fetchJson<PCBResponse>(
      `${API_BASE_URL}/api/processes`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      "POST /api/processes"
    ),

  // Valid actions
  getValidActions: (pid: number): Promise<ValidActionsResponse> =>
    fetchJson<ValidActionsResponse>(
      `${API_BASE_URL}/api/processes/${pid}/valid-actions`,
      {},
      `GET /api/processes/${pid}/valid-actions`
    ),

  // State transitions
  admitProcess: (pid: number): Promise<TransitionResponse> =>
    fetchJson<TransitionResponse>(
      `${API_BASE_URL}/api/processes/${pid}/admit`,
      { method: "POST" },
      `POST /api/processes/${pid}/admit`
    ),

  dispatchProcess: (pid: number): Promise<TransitionResponse> =>
    fetchJson<TransitionResponse>(
      `${API_BASE_URL}/api/processes/${pid}/dispatch`,
      { method: "POST" },
      `POST /api/processes/${pid}/dispatch`
    ),

  preemptProcess: (pid: number): Promise<TransitionResponse> =>
    fetchJson<TransitionResponse>(
      `${API_BASE_URL}/api/processes/${pid}/preempt`,
      { method: "POST" },
      `POST /api/processes/${pid}/preempt`
    ),

  blockProcess: (pid: number): Promise<TransitionResponse> =>
    fetchJson<TransitionResponse>(
      `${API_BASE_URL}/api/processes/${pid}/block`,
      { method: "POST" },
      `POST /api/processes/${pid}/block`
    ),

  wakeProcess: (pid: number): Promise<TransitionResponse> =>
    fetchJson<TransitionResponse>(
      `${API_BASE_URL}/api/processes/${pid}/wake`,
      { method: "POST" },
      `POST /api/processes/${pid}/wake`
    ),

  terminateProcess: (pid: number): Promise<TransitionResponse> =>
    fetchJson<TransitionResponse>(
      `${API_BASE_URL}/api/processes/${pid}/terminate`,
      { method: "POST" },
      `POST /api/processes/${pid}/terminate`
    ),

  // Hierarchy
  getParent: (pid: number): Promise<ParentResponse> =>
    fetchJson<ParentResponse>(
      `${API_BASE_URL}/api/processes/${pid}/parent`,
      {},
      `GET /api/processes/${pid}/parent`
    ),

  getChildren: (pid: number): Promise<ChildrenResponse> =>
    fetchJson<ChildrenResponse>(
      `${API_BASE_URL}/api/processes/${pid}/children`,
      {},
      `GET /api/processes/${pid}/children`
    ),

  getProcessTree: (): Promise<ProcessTreeResponse> =>
    fetchJson<ProcessTreeResponse>(
      `${API_BASE_URL}/api/process-tree`,
      {},
      "GET /api/process-tree"
    ),

  // Events
  getEvents: (): Promise<EventsResponse> =>
    fetchJson<EventsResponse>(
      `${API_BASE_URL}/api/events`,
      {},
      "GET /api/events"
    ),

  // Reset
  resetSimulation: (): Promise<ResetResponse> =>
    fetchJson<ResetResponse>(
      `${API_BASE_URL}/api/reset`,
      { method: "POST" },
      "POST /api/reset"
    ),
};

