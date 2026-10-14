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
  ProcessTreeResponse,
  EventsResponse,
  ResetResponse,
  HealthCheckResponse,
  ApiErrorResponse,
  ApiValidationIssue,
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

/**
 * Turn an API `detail` payload into one readable line.
 *
 * FastAPI returns a plain string for `HTTPException` errors and a list of
 * validation issues for HTTP 422 request-body errors, so both shapes are
 * handled here instead of at every call site.
 */
function formatDetail(detail: ApiErrorResponse["detail"]): string | null {
  if (typeof detail === "string") {
    return detail.length > 0 ? detail : null;
  }

  if (Array.isArray(detail)) {
    const messages = detail.map(formatIssue).filter((message): message is string => Boolean(message));
    if (messages.length > 0) return messages.join("; ");
  }

  return null;
}

function formatIssue(issue: ApiValidationIssue): string {
  const message = stripValueErrorPrefix(issue.msg || "is invalid");
  const field = formatField(issue.loc);
  return field ? `${field}: ${message}` : message;
}

/** FastAPI prefixes `ValueError` messages with "Value error, ". */
function stripValueErrorPrefix(message: string): string {
  return message.startsWith("Value error, ") ? message.slice("Value error, ".length) : message;
}

/** Turn a FastAPI error location such as `["body", "jobs", 0, "burst_time"]` into `jobs[0].burst_time`. */
function formatField(loc: ApiValidationIssue["loc"]): string {
  if (!Array.isArray(loc)) return "";
  let field = "";
  for (const segment of loc.slice(1)) {
    if (typeof segment === "number") {
      field += `[${segment}]`;
    } else if (segment !== "") {
      field += field === "" ? segment : `.${segment}`;
    }
  }
  return field;
}

async function handleResponse<T>(response: Response, endpoint: string): Promise<T> {
  if (!response.ok) {
    let detail = response.statusText || `HTTP ${response.status}`;
    try {
      const errorData: ApiErrorResponse = await response.json();
      detail = formatDetail(errorData.detail) ?? detail;
    } catch {
      // Non-JSON body (for example an HTML error page) keeps the status text.
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

