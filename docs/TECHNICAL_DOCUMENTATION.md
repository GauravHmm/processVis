# Technical Documentation — Process Creation and State Transition Visualizer

This document is the complete technical reference for the project. It is derived directly
from the source code and from commands executed against the working tree; every route,
field, and behaviour described here exists in the implementation.

Companion documents:

- [README.md](../README.md) — overview and quick start
- [TESTING.md](TESTING.md) — test inventory, verified command results, known issues

---

## 1. Project Overview

### 1.1 Purpose and intended educational use

The application is a university Operating Systems project: a **desktop/web simulator of OS
process management** used to teach and demonstrate

- what a Process Control Block contains and why,
- how a process moves through the classic five-state lifecycle,
- which state transitions are legal and how illegal ones are rejected,
- how parent/child process hierarchies are represented, and
- how classical CPU scheduling algorithms order jobs and produce waiting/turnaround/response
  metrics.

It is deliberately deterministic and inspectable: state changes are explicit user actions,
every action is logged with a timestamp, and every scheduling run is a pure computation over
user-supplied inputs.

### 1.2 Simulation versus real operating-system process management

This project **simulates** process management. It does **not**:

- create, enumerate, signal, suspend, or terminate real OS processes (no `ps`, no signals,
  no `multiprocessing`, no `subprocess` process management),
- read or write real CPU registers, program counters, or memory addresses,
- measure real CPU utilisation or real execution time.

All PCB values shown in the interfaces are educational placeholders (randomised registers,
randomised memory base/limit, a zeroed program counter, wall-clock creation timestamps). The
scheduling engine computes over integer *simulation time units*, not real elapsed time.

### 1.3 Main capabilities

| Area | Capability |
|------|------------|
| Process management | Create processes with a unique PID, name, priority, optional parent; inspect the process table; view PCB details |
| State machine | Five states, six valid transitions, validation and rejection of everything else |
| Hierarchy | Parent/child links, process tree view, parent and children lookups |
| Observability | Timestamped event log of creation, transitions, rejections, reset |
| Reset | Clears processes, hierarchy, events, and restarts PID generation at 1 |
| CPU scheduling | FCFS, non-preemptive SJF, non-preemptive Priority, Round Robin; single run or four-way comparison with Gantt timeline and averages |
| Interfaces | Next.js web UI over REST; Tkinter desktop UI over the same in-process controller |
| Quality | 147 pytest tests; TypeScript type checking; production build |

### 1.4 Current limitations and future scope

Current limitations (details in [§8](#8-quality-and-limitations)):

- No real process interaction of any kind; no persistence (in-memory only).
- The scheduling workspace and the interactive process simulator are independent; running a
  schedule does not change any process state, and PCB priority is not consumed by the
  scheduler.
- The simulator does not enforce that only one process is RUNNING at a time.
- No IPC, synchronization, shared memory, virtual memory, multi-level feedback queues, or
  preemptive scheduling variants (SJF/Priority are non-preemptive by design).
- No frontend automated tests; the `pnpm lint` script is currently non-functional.

Realistic future improvements: a scheduler that drives the interactive simulator's states,
a documented preemptive SJF/Priority variant, frontend component tests, removal of dead
components, and a working lint configuration for Next.js 16.

---

## 2. Architecture

### 2.1 Overall component architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                Clients                                   │
│                                                                          │
│  Next.js web UI (frontend/)             Tkinter desktop UI (gui/, main.py)│
│  React 19 + TypeScript + Tailwind        runs in its own process          │
└───────────────┬──────────────────────────────────────┬───────────────────┘
                │ HTTP/JSON (fetch)                    │ direct method calls
                ▼                                      ▼
┌───────────────────────────────┐        ┌──────────────────────────────────┐
│  FastAPI layer (api/)         │        │  gui/dashboard.py                │
│  main.py  – app, CORS, root   │        │  builds widgets, calls           │
│  routes.py – thin adapters    │        │  Controller methods directly     │
│  schemas.py – Pydantic models │        └───────────────┬──────────────────┘
└───────────────┬───────────────┘                        │
                │                                        │
                └───────────────────┬────────────────────┘
                                    ▼
                ┌───────────────────────────────────────────┐
                │  core/controller.py  (single entry point)  │
                │   ├─► process/process_manager.py           │
                │   │      process table, PID, hierarchy     │
                │   ├─► process/state_manager.py             │
                │   │      transition validation             │
                │   └─► core/event_logger.py                 │
                │          timestamped log                   │
                └───────────────────┬───────────────────────┘
                                    ▼
                ┌───────────────────────────────────────────┐
                │  process/process.py  →  process/pcb.py     │
                └───────────────────────────────────────────┘

                ┌───────────────────────────────────────────┐
                │  scheduling/engine.py  (stateless)         │
                │  reached only by POST /api/scheduling/*    │
                │  shares no state with the simulator above  │
                └───────────────────────────────────────────┘
```

### 2.2 Interfaces: Tkinter desktop and Next.js web

Both interfaces remain present and are both usable:

| | Tkinter desktop | Next.js web |
|---|---|---|
| Entry point | `python main.py` → `gui/dashboard.py` | `pnpm dev` → `frontend/app/page.tsx` |
| Transport | In-process `Controller` calls | HTTP/JSON to FastAPI (`/api/*`) |
| State owner | Its own `Controller` instance | Server-side singleton `Controller` in `api/routes.py` |
| Scheduling workspace | Not present | `CpuSchedulingWorkspace` component |
| Extra requirements | A graphical display | Running backend on port 8000 |

Because the two entry points construct separate `Controller` instances in separate
processes, running the desktop app and the API server at the same time yields **two
independent simulations**.

### 2.3 FastAPI routes and request/response flow

Routes live in `api/routes.py` and are mounted with prefix `/api` in `api/main.py`. The
routes are deliberately thin: validate the payload (Pydantic), delegate to `Controller` or
`run_schedule`, map the result onto a response model.

Interactive mutation flow (example: dispatch):

```
Browser  POST /api/processes/3/dispatch
   │
   ▼
FastAPI route dispatch(pid=3)
   │  1. get_controller()            → singleton Controller
   │  2. ctrl.get_process(3)         → None ⇒ HTTP 404 {"detail": "Process P3 not found"}
   │  3. ctrl.dispatch(3)
   │        └► StateManager.transition(process, "DISPATCH")
   │              ├─ valid   ⇒ process.state = "RUNNING", log "P3 (name) READY -> RUNNING"
   │              └─ invalid ⇒ state unchanged, log "P3 (name) REJECTED: <state> -> DISPATCH"
   ▼
HTTP 200 TransitionResponse {success, action, from_state, to_state, message}
   │
   ▼
Frontend refreshSimulation() → GET /api/processes + GET /api/events
```

Scheduling flow (no shared state):

```
Browser  POST /api/scheduling/run  {algorithm, time_quantum?, jobs[]}
   │
   ▼
Pydantic SchedulingRequest validates:  jobs ≥ 1, unique job_id,
   arrival ≥ 0, burst > 0, 0 ≤ priority ≤ 100,
   ROUND_ROBIN ⇒ time_quantum > 0            → otherwise HTTP 422
   │
   ▼
_schedule() → [JobInput(**job) for job in jobs] → run_schedule(jobs, algorithm, quantum)
   │
   ▼
SchedulingResultResponse {algorithm, time_quantum, priority_convention,
                          jobs[], timeline[], averages}
```

`api/routes.py` exposes `get_controller()` (lazily created singleton) and
`reset_controller()` (used by tests to drop the singleton between test cases).

### 2.4 Component responsibilities

| Component | File | Responsibility |
|---|---|---|
| Tkinter GUI | `gui/dashboard.py` + `gui/*.py` | Desktop presentation only. Builds the form, transition buttons, process tree, state canvas, PCB viewer, process table, event log. Calls `Controller` methods; never assigns `process.state` directly. |
| Web UI | `frontend/` | Presentation and user input. All mutations go through `lib/api.ts` → REST. |
| FastAPI routes | `api/routes.py` | HTTP adaptation: payload validation, status codes, response models, controller singleton. |
| Pydantic schemas | `api/schemas.py` | Request/response contracts for the API, including scheduling models. |
| Controller | `core/controller.py` | Single entry point for GUI/API. Creates processes, runs the six transition actions, queries process/hierarchy data, logs every outcome, notifies registered listeners. |
| ProcessManager | `process/process_manager.py` | Process table (`dict[pid, Process]`), sequential unique PID generation, parent/child index, tree query, clear/reset. |
| StateManager | `process/state_manager.py` | Owns `VALID_TRANSITIONS` and `ACTION_LABELS`; validates and applies transitions; reports valid actions for a state. Static methods, no state of its own. |
| Process | `process/process.py` | Thin wrapper exposing `pid`, `name`, `state` (property with setter), `priority` over its PCB. |
| PCB | `process/pcb.py` | Dataclass holding the simulated control-block fields; randomises registers/memory in `__post_init__`; `to_dict()` for display. |
| EventLogger | `core/event_logger.py` | Ordered `[HH:MM:SS] message` strings, `clear()`, listener callbacks. |
| Scheduling engine | `scheduling/engine.py` | Pure functions/dataclasses: `JobInput`, `TimelineSegment`, `JobMetrics`, `ScheduleResult`, `run_schedule()`, `ALGORITHMS`, `PRIORITY_CONVENTION`. |

Layering rule: **GUI → Controller → ProcessManager/StateManager → Process/PCB →
EventLogger**. The GUI and the HTTP layer must not assign process state; only
`StateManager.transition()` writes `process.state`.

### 2.5 CPU scheduling engine and its separation

The engine is isolated in its own package (`scheduling/`) and is reachable only through the
two scheduling routes:

- It accepts its **own input model** (`JobInput`: `job_id`, `name`, `arrival_time`,
  `burst_time`, `priority`) — never a `Process` or `PCB`.
- It holds **no state**: each call computes a fresh `ScheduleResult` from its arguments.
- It never imports `core`, `process`, or `api`, and no simulator code imports
  `scheduling.engine` except `api/routes.py`.
- `POST /api/scheduling/*` does not call the `Controller` at all, therefore scheduling runs
  cannot create, transition, or remove simulated processes. This is asserted by
  `tests/test_api.py::TestSchedulingAPI::test_run_sjf_returns_metrics_and_idle_timeline_without_changing_processes`.

The two domains only *look* similar: both use an integer `priority` in 0–100, but PCB
priority is inert metadata, while scheduling priority drives job order (higher wins).

---

## 3. Process Simulator

### 3.1 Process creation and PID generation

`ProcessManager.create_process(name, priority=0, parent_pid=0)`:

1. If `parent_pid != 0`:
   - `parent_pid == self._next_pid` → `ValueError("A process cannot be its own parent")`
     (the parent would be the process about to be created),
   - otherwise the parent must already exist → `ValueError("Parent process P{n} does not exist")`.
2. `pid = self._next_pid`, then `_next_pid += 1`. PID 1 is issued first; generation is
   strictly sequential.
3. The `Process` (and its PCB) is stored in `_processes[pid]`, an entry is opened in
   `_children[pid]`, and for a non-root creation the PID is appended to
   `_children[parent_pid]`.

Guarantees:

- **Unique** PIDs within a simulation (dictionary key).
- **Never recycled**: `remove_process(pid)` frees the table slot but not the number;
  `test_pid_not_recycled` locks this in. PID reuse happens only after
  `ProcessManager.clear()` (reset), which sets `_next_pid = 1`.
- The controller logs creation as `P{pid} ({name}) CREATED`, or
  `P{pid} ({name}) CREATED (parent: P{parent})` for children.

### 3.2 PCB fields and their meanings

Defined in `process/pcb.py`. **All values are simulated educational data.**

| Field | Type / default | Meaning | API representation |
|---|---|---|---|
| `pid` | `int`, required | Unique process identifier | `pid` (int) |
| `name` | `str`, required | Human-readable process name (1–64 chars via API) | `name` |
| `state` | `str = "NEW"` | One of NEW, READY, RUNNING, BLOCKED, TERMINATED | `state` |
| `priority` | `int = 0` | Static priority label (0–100 via API); not used for scheduling | `priority` |
| `parent_pid` | `int = 0` | Parent PID; **0 means root** | `parent_pid`: `null` for root, else int |
| `program_counter` | `int = 0` | Simulated instruction pointer, never executed | `program_counter`: `"0x00000000"` style hex string |
| `cpu_registers` | `dict` | Simulated AX/BX/CX/DX, each random 0–255 at creation | `cpu_registers`: `{"AX": 22, ...}` |
| `memory_base` | `int` | Simulated base address: `random(0x1000..0x7FFF) * 4096` | `memory_base`: 8-digit hex string |
| `memory_limit` | `int` | Simulated limit, chosen from 4096/8192/16384/32768 | `memory_limit`: 8-digit hex string |
| `creation_time` | `str` | Wall-clock `HH:MM:SS` at creation | `creation_time` |

The API adds one derived field: `children` — the list of child PIDs, obtained from
`Controller.get_children()` at response time (not stored in the PCB).

`PCB.to_dict()` produces a display-oriented mapping (`"PID"`, `"Process Name"`, …) used by
the Tkinter PCB viewer.

### 3.3 Process table

- Storage: `ProcessManager._processes: dict[int, Process]`.
- `get_process(pid)` → `dict.get` (returns `None` if absent).
- `get_all_processes()` → list in insertion (PID) order.
- `remove_process(pid)` → pops the process, unlinks it from its parent's child list, and
  **preserves** its own children (they keep `parent_pid` pointing at the removed PID).
  This method is exercised by tests only; the API exposes no delete operation, so in a
  running simulation processes remain in the table, including TERMINATED ones.
- `clear()` empties table, hierarchy index, and resets PID generation.
- The API exposes the table as `GET /api/processes` (`ProcessListResponse`).

### 3.4 The five states and six valid transitions

States: `NEW`, `READY`, `RUNNING`, `BLOCKED`, `TERMINATED`.

`process/state_manager.py` defines the complete transition relation:

```
            ADMIT
   NEW ─────────────► READY ◄────────────┐
                     │  ▲                │ WAKE
                DISPATCH││PREEMPT         │
                     ▼  │           ┌────┴────┐
                  RUNNING ─────────►│ BLOCKED │
                     │              └─────────┘
        ┌────────────┼─────────────┐
        │ BLOCK      │ TERMINATE   │
        ▼            ▼             │
   BLOCKED      TERMINATED ◄───────┘ (only from RUNNING)
```

| From | Action | To | Meaning in OS terms |
|---|---|---|---|
| NEW | ADMIT | READY | Admission to the ready queue |
| READY | DISPATCH | RUNNING | Dispatch to the CPU |
| RUNNING | PREEMPT | READY | Time-slice expiration / preemption |
| RUNNING | BLOCK | BLOCKED | Waiting for I/O |
| RUNNING | TERMINATE | TERMINATED | Process exit |
| BLOCKED | READY | WAKE | I/O completion |

`TERMINATED` has no outgoing edges. The exact table is `VALID_TRANSITIONS`; the action
names are `ACTION_LABELS`.

### 3.5 Transition validation and invalid-operation handling

`StateManager.transition(process, action)`:

1. Maps the action label to a target state (`ADMIT→READY`, `DISPATCH→RUNNING`,
   `PREEMPT→READY`, `BLOCK→BLOCKED`, `WAKE→READY`, `TERMINATE→TERMINATED`); unknown labels
   (e.g. `BOGUS`) map to `None`.
2. If `(current_state, target_state)` is not in `VALID_TRANSITIONS`, returns
   `(False, from_state, None)` and **does not touch** `process.state`.
3. Otherwise assigns `process.state = target_state` and returns `(True, from, to)`.

`StateManager.get_valid_actions(process)` returns the action labels whose source state
matches the current state; it iterates a `set`, so for RUNNING the three returned actions
(`PREEMPT`, `BLOCK`, `TERMINATE`) have **unspecified order** — clients must treat the list
as a set (the tests do).

Controller behaviour (`core/controller.py::_do_transition`):

- Success → log `P{pid} ({name}) {FROM} -> {TO}`.
- Rejection → log `P{pid} ({name}) REJECTED: {state} -> {ACTION}`.
- Returns `(success, action)`; the HTTP layer turns this into a `TransitionResponse`.

API behaviour: a rejected transition is **HTTP 200** with
`{"success": false, "action": "DISPATCH", "from_state": null, "to_state": null,
"message": "DISPATCH"}` — see the known-issues note in [§8.2](#82-known-issues). Unknown
PIDs are HTTP 404. The state never changes on rejection (asserted by tests).

### 3.6 Parent-child relationships and process hierarchy

- Root ⇔ `parent_pid == 0` internally, exposed as `null`.
- Child creation requires an existing parent PID and forbids self-parenting (see §3.1).
- `get_parent(pid)` → `None` for roots and unknown PIDs.
- `get_children(pid)` → list of `Process` (order = creation order).
- `get_process_tree()` → copy of the parent→children mapping, filtered to PIDs that still
  exist. JSON serialisation turns the integer keys into strings
  (`{"1": [2, 3], "2": []}`), which the TypeScript type reflects
  (`Record<string, number[]>`).
- Termination does **not** cascade: children of a terminated parent keep running and stay
  in the tree (`test_hierarchy_after_parent_termination`).
- Reset clears the entire hierarchy.

### 3.7 Event logging and reset behaviour

`EventLogger.log(message)` prepends `[HH:MM:SS] ` (local time) and appends to an ordered
list; it also notifies optional listeners. Message vocabulary:

| Event | Example |
|---|---|
| Creation (root) | `[16:32:40] P1 (Shell) CREATED` |
| Creation (child) | `[16:32:40] P2 (Worker) CREATED (parent: P1)` |
| Successful transition | `[16:32:40] P1 (Shell) NEW -> READY` |
| Rejected transition | `[16:32:40] P2 (Worker) REJECTED: NEW -> DISPATCH` |
| Reset | `[16:32:40] SIMULATION RESET` |

`Controller.reset()`:

1. `process_manager.clear()` — empty table, empty hierarchy, `_next_pid = 1`.
2. `event_logger.clear()` — drop previous events.
3. `log("SIMULATION RESET")` — the log restarts with exactly this entry.
4. Notify listeners (Tkinter refreshes; the web client refetches after `POST /api/reset`).

`POST /api/reset` responds `{"success": true, "message": "Simulation reset"}`.

---

## 4. CPU Scheduling

### 4.1 Algorithms

`run_schedule(jobs, algorithm, time_quantum=None)` in `scheduling/engine.py` implements four
**deterministic** algorithms over integer simulation time.

| Algorithm (`algorithm`) | Behaviour |
|---|---|
| `FCFS` | Non-preemptive; among arrived jobs selects the one with the smallest `arrival_time`. |
| `SJF` | Non-preemptive Shortest Job First; among arrived jobs selects the smallest `burst_time`. |
| `PRIORITY` | Non-preemptive priority scheduling; among arrived jobs selects the largest `priority`. |
| `ROUND_ROBIN` | Preemptive round robin with a fixed time quantum taken from a FIFO ready queue. |

For `FCFS`, `SJF`, and `PRIORITY` the main loop is: filter jobs with `arrival_time <= time`;
if none have arrived, emit an `IDLE` segment up to the earliest remaining arrival; select
one job; run it for its full burst; record completion; repeat until no jobs remain.

Round Robin specifics:

- Jobs not yet arrived are kept in a list sorted by `(arrival_time, request index)`; the
  ready queue is filled from it whenever the simulation clock reaches an arrival time.
- The queue is FIFO. On each turn a job runs for `min(time_quantum, remaining_burst)`.
- **Jobs that arrive during a slice are appended to the queue before the sliced job is
  re-appended**, so a job that still has burst left is placed behind the newcomers.
- A job's `first_start_time` is recorded the first time it is dequeued (never reset).

### 4.2 Tie-breaking rules and priority convention

Ties are resolved deterministically by *request order* (the index of the job inside the
`jobs` array), after the primary keys:

| Algorithm | Selection key (in order) |
|---|---|
| FCFS | `arrival_time`, then request index |
| SJF | `burst_time`, `arrival_time`, then request index |
| PRIORITY | `-priority` (larger number first), `arrival_time`, then request index |
| ROUND_ROBIN | FIFO; initial order `arrival_time`, then request index |

Priority convention (returned in every response as `priority_convention`):

> "Higher numeric values (0-100) mean higher priority."

So priority `90` preempts nothing (scheduling is non-preemptive) but is selected before
priority `2` when both have arrived.

### 4.3 Inputs: arrival time, burst time, time quantum, idle CPU periods

| Input | Constraint | Meaning |
|---|---|---|
| `job_id` | non-empty, ≤ 64 chars, unique per request | Stable identifier echoed in metrics/timeline |
| `name` | non-empty, ≤ 64 chars | Display name (the workspace generates `job-N` IDs locally) |
| `arrival_time` | integer ≥ 0 | Simulation time unit at which the job becomes eligible |
| `burst_time` | integer > 0 | Total CPU time the job needs |
| `priority` | integer 0–100 | Used only by `PRIORITY` |
| `time_quantum` | integer > 0, **required for `ROUND_ROBIN`** | Max continuous run time per turn |

All times are integer **simulation units**, not seconds. If the CPU has nothing to run
between time `t` and the next arrival, the engine emits an idle segment
(`job_id: null`, `name: "IDLE"`); this happens both at the start (job arrives at 4 ⇒
`0–4 IDLE`) and mid-schedule (FCFS example below).

Validation happens twice: Pydantic schemas reject malformed HTTP payloads with **422**, and
`run_schedule` itself raises `ValueError` for empty/duplicate/non-positive inputs or an
unsupported algorithm (defensive; not reachable through a valid API request).

### 4.4 Gantt timeline representation

The response field `timeline` is an ordered list of contiguous segments covering
`[0, makespan]` with no gaps or overlaps:

```json
{"job_id": "a", "name": "Compile", "start_time": 0, "end_time": 4, "duration": 4}
{"job_id": null, "name": "IDLE",   "start_time": 1, "end_time": 4, "duration": 3}
```

- `duration == end_time - start_time` (zero-length segments are never emitted).
- `job_id: null` ⇔ idle CPU.
- The web UI renders each segment as a flex box whose width is proportional to
  `duration / total`, labels it with `name` and `start–end`, and greys idle segments.

### 4.5 Waiting, turnaround, response time, and averages

Computed per job in `run_schedule`:

```
turnaround_time = completion_time - arrival_time
waiting_time    = turnaround_time - burst_time
response_time   = first_start_time - arrival_time
```

Averages are arithmetic means over all jobs, returned as floats
(`average_waiting_time`, `average_turnaround_time`, `average_response_time`).

Worked example (FCFS, verified against the running API):

- Jobs: `a` (arrival 0, burst 4), `b` (arrival 1, burst 3)
- Timeline: `a 0–4`, `b 4–7`
- `a`: turnaround 4, waiting 0, response 0 — `b`: turnaround 6, waiting 3, response 3
- Averages: waiting 1.5, turnaround 5.0, response 1.5

### 4.6 Scheduling endpoints, example requests and responses

#### `POST /api/scheduling/run`

Request:

```json
{
  "algorithm": "FCFS",
  "time_quantum": null,
  "jobs": [
    {"job_id": "a", "name": "Compile", "arrival_time": 0, "burst_time": 4, "priority": 50},
    {"job_id": "b", "name": "Render",  "arrival_time": 1, "burst_time": 3, "priority": 80}
  ]
}
```

(`time_quantum` may be omitted for non-RR algorithms; if given it is ignored and echoed as
`null` unless the algorithm is `ROUND_ROBIN`.)

Response `200` (captured from the live server):

```json
{
  "algorithm": "FCFS",
  "time_quantum": null,
  "priority_convention": "Higher numeric values (0-100) mean higher priority.",
  "jobs": [
    {"job_id": "a", "name": "Compile", "arrival_time": 0, "burst_time": 4, "priority": 50,
     "first_start_time": 0, "completion_time": 4, "waiting_time": 0,
     "turnaround_time": 4, "response_time": 0},
    {"job_id": "b", "name": "Render", "arrival_time": 1, "burst_time": 3, "priority": 80,
     "first_start_time": 4, "completion_time": 7, "waiting_time": 3,
     "turnaround_time": 6, "response_time": 3}
  ],
  "timeline": [
    {"job_id": "a", "name": "Compile", "start_time": 0, "end_time": 4, "duration": 4},
    {"job_id": "b", "name": "Render",  "start_time": 4, "end_time": 7, "duration": 3}
  ],
  "average_waiting_time": 1.5,
  "average_turnaround_time": 5.0,
  "average_response_time": 1.5
}
```

Round Robin example (`time_quantum: 2`, jobs `a` burst 5 arrival 0 and `b` burst 2 arrival
1) yields timeline `a 0–2, b 2–4, a 4–6, a 6–7` — `b` arrived during `a`'s first slice and
therefore ran before `a` resumed.

#### `POST /api/scheduling/compare`

Request: `{"time_quantum": 2, "jobs": [ ... ]}` — `time_quantum` is **required** (it feeds
Round Robin) and `jobs` must be non-empty with unique `job_id`s.

Response `200`:

```json
{
  "results": {
    "FCFS":        { ...SchedulingResultResponse... },
    "SJF":         { ...SchedulingResultResponse... },
    "PRIORITY":    { ...SchedulingResultResponse... },
    "ROUND_ROBIN": { ...SchedulingResultResponse... }
  }
}
```

All four results are computed from the identical job list; only `ROUND_ROBIN` carries a
`time_quantum`.

#### Errors

| Condition | Status | Body |
|---|---|---|
| Empty `jobs`, duplicate `job_id`, `arrival_time < 0`, `burst_time ≤ 0`, `priority` outside 0–100, `ROUND_ROBIN` without positive `time_quantum`, unknown `algorithm` | 422 | FastAPI validation-error `detail` array |

### 4.7 Separation between scheduling inputs and simulated PCB fields

| | Scheduling job (`SchedulingJob` / `JobInput`) | Simulated PCB field |
|---|---|---|
| Identity | `job_id: str` — request-local label | `pid: int` — simulator-wide unique |
| Time | `arrival_time`, `burst_time` (units) | `creation_time` (wall clock), no burst |
| Priority | drives selection in `PRIORITY` | inert metadata |
| State | none — jobs have no lifecycle state | NEW/READY/RUNNING/BLOCKED/TERMINATED |
| Storage | not stored; one request = one computation | stored in the controller's process table |
| Effect on simulator | none | n/a |

The web UI states this explicitly above the job table: *"Scheduling bursts are separate
inputs and do not change process states or PCB values."*

---

## 5. API Reference

Base URL for all examples: `http://127.0.0.1:8000`. All bodies are JSON. The OpenAPI
document (19 operations including `/`) is served at `/openapi.json`, with Swagger UI at
`/docs` and ReDoc at `/redoc`.

### 5.1 Endpoint summary

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | API name/version/docs links |
| GET | `/api/health` | Health check |
| GET | `/api/processes` | List all processes |
| POST | `/api/processes` | Create a process (201) |
| GET | `/api/processes/{pid}` | Get one process |
| GET | `/api/processes/{pid}/valid-actions` | Valid actions for the process's state |
| POST | `/api/processes/{pid}/admit` | NEW → READY |
| POST | `/api/processes/{pid}/dispatch` | READY → RUNNING |
| POST | `/api/processes/{pid}/preempt` | RUNNING → READY |
| POST | `/api/processes/{pid}/block` | RUNNING → BLOCKED |
| POST | `/api/processes/{pid}/wake` | BLOCKED → READY |
| POST | `/api/processes/{pid}/terminate` | RUNNING → TERMINATED |
| GET | `/api/processes/{pid}/parent` | Parent process |
| GET | `/api/processes/{pid}/children` | Child processes |
| GET | `/api/process-tree` | Full parent → children map |
| GET | `/api/events` | Event log |
| POST | `/api/reset` | Reset the simulation |
| POST | `/api/scheduling/run` | Run one scheduling algorithm |
| POST | `/api/scheduling/compare` | Run all four algorithms |

### 5.2 Process object (`PCBResponse`)

Every process-returning endpoint uses this flat shape:

```json
{
  "pid": 1,
  "name": "Shell",
  "state": "NEW",
  "priority": 5,
  "parent_pid": null,
  "program_counter": "0x00000000",
  "cpu_registers": {"AX": 22, "BX": 92, "CX": 202, "DX": 74},
  "memory_base": "0x05C98000",
  "memory_limit": "0x00004000",
  "creation_time": "16:32:40",
  "children": [2]
}
```

### 5.3 Endpoints in detail

#### `GET /`

Response `200`:
`{"name": "Process Creation and State Transition Visualizer API", "version": "1.0.0",
"docs": "/docs", "redoc": "/redoc"}`

#### `GET /api/health`

Response `200`: `{"status": "ok"}`

#### `GET /api/processes`

Response `200`: `{"processes": [PCBResponse, ...]}` (empty list when the simulation is
fresh).

#### `POST /api/processes`

Request fields (`ProcessCreate`):

| Field | Type | Required | Constraint | Default |
|---|---|---|---|---|
| `name` | string | yes | 1–64 characters | — |
| `priority` | integer | no | 0–100 | `0` |
| `parent_pid` | integer | no | ≥ 0; `0` = root; must exist and ≠ new PID | `0` |

Responses:

- `201` — the created `PCBResponse` (always starts in `NEW`).
- `400` — `{"detail": "Parent process P999 does not exist"}` or
  `{"detail": "A process cannot be its own parent"}` (raised as `ValueError` in the
  controller and mapped by the route).
- `422` — schema violation, e.g. empty name:
  `{"detail": [{"type": "string_too_short", "loc": ["body", "name"], "msg": "String should have at least 1 character", "input": "", "ctx": {"min_length": 1}}]}`.

#### `GET /api/processes/{pid}`

`200` → `PCBResponse`; `404` → `{"detail": "Process P999 not found"}`.

#### `GET /api/processes/{pid}/valid-actions`

`200` → `{"pid": 1, "actions": ["ADMIT"]}`; `404` if the PID is unknown.
Expected values per state: NEW `["ADMIT"]`, READY `["DISPATCH"]`,
RUNNING `["PREEMPT","BLOCK","TERMINATE"]` (order unspecified),
BLOCKED `["WAKE"]`, TERMINATED `[]`.

#### `POST /api/processes/{pid}/{admit|dispatch|preempt|block|wake|terminate}`

No request body. Responses:

- `404` — unknown PID: `{"detail": "Process P999 not found"}`.
- `200` — `TransitionResponse`:

```json
{"success": true, "action": "ADMIT", "from_state": "NEW", "to_state": "READY", "message": null}
```

```json
{"success": false, "action": "DISPATCH", "from_state": null, "to_state": null, "message": "DISPATCH"}
```

An invalid transition is therefore reported with HTTP 200 and `success: false`; the
process state is unchanged and a `REJECTED` entry appears in the event log.

#### `GET /api/processes/{pid}/parent`

`200` → `{"pid": 2, "parent": PCBResponse | null}`; `404` unknown PID. Root processes
return `"parent": null`.

#### `GET /api/processes/{pid}/children`

`200` → `{"pid": 1, "children": [PCBResponse, ...]}`; `404` unknown PID.

#### `GET /api/process-tree`

`200` → `{"tree": {"1": [2], "2": []}}`. Keys are PIDs (JSON object keys, hence strings);
values are arrays of child PIDs. Empty simulation → `{"tree": {}}`.

#### `GET /api/events`

`200` → `{"events": ["[16:32:40] P1 (Shell) CREATED", ...]}` — newest appended last.

#### `POST /api/reset`

No body. `200` → `{"success": true, "message": "Simulation reset"}`. Clears processes,
hierarchy, and events; the log restarts with `SIMULATION RESET`; PID generation restarts at
1.

#### `POST /api/scheduling/run` and `POST /api/scheduling/compare`

See [§4.6](#46-scheduling-endpoints-example-requests-and-responses).

### 5.4 Validation and error handling

| Layer | Behaviour |
|---|---|
| Pydantic request models | Field-level constraints and model-level rules (unique `job_id`, RR quantum) → **422** with FastAPI's standard `detail` array |
| Controller | `ValueError` on invalid parent → route converts to **400** with a string `detail` |
| Route lookups | Missing PID → **404** with a string `detail` |
| State transitions | Never raise; return `success: false` with HTTP **200** |
| Scheduling engine | Raises `ValueError` for logically invalid inputs (defensive; normally intercepted by schema validation) |

Note: `api/schemas.py` documents a 422 `ErrorResponse` model (`{"detail": "..."}`) for
`POST /api/processes`, but FastAPI always emits its own list-shaped validation payload for
422 — see [§8.2](#82-known-issues).

### 5.5 CORS configuration

Configured in `api/main.py`:

```python
allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"]
allow_credentials=True
allow_methods=["*"]
allow_headers=["*"]
```

Verified behaviour:

- Preflight from `http://localhost:3000` → `200` with
  `access-control-allow-origin: http://localhost:3000` and
  `access-control-allow-credentials: true`.
- Preflight from any other origin (e.g. `http://evil.example`) → `400 Disallowed CORS
  origin`.

Only the Next.js dev/prod origins are allowed; other origins must be added to the list
before the browser will accept their responses.

---

## 6. Frontend

### 6.1 Pages and navigation

Next.js 16 App Router, single route:

| Route | File | Content |
|---|---|---|
| `/` | `frontend/app/page.tsx` | Renders `<Dashboard />` |
| (layout) | `frontend/app/layout.tsx` | Root layout, page metadata (`title`, `description`), base body classes |
| `/_not-found` | framework-generated | Default 404 |

Navigation is entirely component-level, using daisyUI tabs:

1. **Workspace tabs** (top): `Process Simulator` ⇄ `CPU Scheduling`
   (`workspaceTab` state in `Dashboard`).
2. **Auxiliary tabs** (bottom of the simulator): `Process Table` ⇄ `Event Timeline`
   (`bottomTab`).
3. **Inspector tabs** inside `ProcessInspector`: `overview` / `cpu` / `memory`.
4. **Comparison tabs** inside `CpuSchedulingWorkspace` after `Compare all four`
   (`comparisonAlgorithm`).
5. **Create Process** opens as a modal `<dialog>` (`isCreateOpen`).

### 6.2 Components

| Component | Role |
|---|---|
| `Dashboard` | Top-level client component; owns all simulation state, fetch orchestration, tab layout, reset handling |
| `Header` | Title bar, static "Backend Connected" indicator, Reset button |
| `ProcessExplorer` | Left rail: create button + process count, embeds `ProcessHierarchy` |
| `ProcessHierarchy` | Recursive tree built from `parent_pid` relations; selection + keyboard access |
| `ProcessStateGraph` | SVG state machine (see §6.4) |
| `ProcessInspector` | PCB details for the selected process in three tabs |
| `TransitionControls` | Fetches `valid-actions` from the backend, enables only valid buttons, executes a transition, triggers a refresh |
| `ProcessTable` | Tabular process list with row selection |
| `EventLog` | Timestamped event list with empty/loading/error states and a retry button |
| `ProcessCreationForm` | Name / priority / optional parent form → `POST /api/processes` |
| `CpuSchedulingWorkspace` | Job table, algorithm + quantum controls, run/compare actions, Gantt timeline, metrics table |
| `PCBViewer`, `Panel`, `StateMachine`, `StateVisualizer` | **Not imported anywhere** — retained from earlier iterations (dead code) |

### 6.3 State management and API client

- No global store or context. `Dashboard` holds `processes`, `events`, `selectedPid`,
  `validActions`, `pendingAction`, tab state, loading/error flags in `useState`.
- Every mutation ends with `refreshSimulation()` = `Promise.all([getProcesses,
  getEvents])`; there is no polling or websocket — the client refetches after actions.
- `lib/api.ts` wraps `fetch` with `fetchJson`/`handleResponse`, sets
  `Content-Type: application/json`, and throws an `ApiError` carrying `status`, `endpoint`,
  and `detail` (parsed from `{"detail": ...}` responses).
- Base URL: `process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"`.
- `types/api.ts` mirrors every backend schema (`PCBResponse`, `TransitionResponse`,
  `SchedulingResult`, …) and declares `ProcessState` / `ProcessAction` unions.
- Unused client helpers: `healthCheck`, `getProcess`, `getParent`, `getChildren` (defined,
  not called by any component; the hierarchy tree is derived client-side from
  `parent_pid`).
- `lib/processState.ts` is presentation-only: state colours/badges, SVG palette, the static
  `ACTION_TRANSITIONS` map, and helpers such as `isValidTransition`. Comment and code both
  enforce that *allowability* comes from the backend, not from this file.

### 6.4 Visualizations

**State machine (`ProcessStateGraph`)** — pure SVG, `viewBox 0 0 760 430`:

- Five nodes (`NEW` top, `READY`, `RUNNING`, `BLOCKED`, `TERMINATED`) with a per-state
  colour palette from `lib/processState.ts`.
- Six edges — one per action — always drawn; edges valid from the selected process's
  current state are emphasised, invalid ones dimmed (opacity 0.55).
- Selected state gets a glow ring; each node shows a badge with the number of processes
  currently in that state.
- While an action executes, `pendingAction` drives a `requestAnimationFrame` particle that
  travels along the edge (1200 ms) plus a pulsing ring on the destination node; CSS
  animations are disabled under `prefers-reduced-motion`.

**Gantt timeline (`CpuSchedulingWorkspace`)** — proportional-width flex segments, idle
segments greyed, axis label showing total time units, plus a metrics table
(arrival, burst, first start, completion, waiting, turnaround, response) and three average
cards.

### 6.5 Configuration and styling

| File | Contents |
|---|---|
| `frontend/package.json` | Scripts: `dev`, `build`, `start`, `lint` (broken, see §8.2); deps: `next ^16`, `react ^19`, `react-dom ^19`, `daisyui ^5`; dev deps: Tailwind 4 toolchain, TypeScript `^5.6` |
| `frontend/next.config.js` | `reactStrictMode: true` only |
| `frontend/tsconfig.json` | `strict: true`, `noEmit`, path alias `@/*` → `./*` |
| `frontend/postcss.config.mjs` | `@tailwindcss/postcss` + `autoprefixer` |
| `frontend/tailwind.config.ts` | Content globs for `app/` and `components/` |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` (git-ignored) |

Styling: Tailwind CSS 4 CSS-first configuration (`@import "tailwindcss"`), daisyUI 5 loaded
via `@plugin "daisyui"` with a custom default theme named `process-lab` (light,
`oklch` colour tokens for base/primary/status colours). A small shared type scale is defined
as `.ui-app-title`, `.ui-panel-title`, `.ui-section-label`, `.ui-body`, `.ui-label`,
`.ui-value`, `.ui-meta`, `.ui-table-header`, plus keyframes for the state-graph animations
and focus-visible outlines for buttons/tabs/tree items.

Installed versions (from `node_modules`): Next.js 16.3.5, React 19.3.0, TypeScript 5.9.3,
Tailwind CSS 4.3.3, daisyUI 5.7.47, pnpm 12.4.2.

---

## 7. Setup and Operation

### 7.1 Prerequisites

| Requirement | Notes |
|---|---|
| Python 3.12+ | Verified with Python 3.12.3 |
| `venv` + `pip` | Standard CPython distribution |
| Node.js 18+ | Verified with Node 24.18.0 |
| pnpm 12 | Declared in `package.json` (`"packageManager": "pnpm@12.4.2"`); verified with pnpm 12.4.2 |
| Graphical display | Only for the Tkinter app (`python main.py`) |
| Free ports | 8000 (backend), 3000 (frontend) |

### 7.2 Virtual environment and backend installation

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

`requirements.txt` pins the ranges: `pytest>=7.0,<9.0`, `fastapi>=0.109.0`,
`uvicorn[standard]>=0.27.0`, `pydantic>=2.5.0`, `httpx>=0.26.0`.

### 7.3 Backend startup

```bash
source venv/bin/activate
uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
```

- API root: http://127.0.0.1:8000 · Swagger: http://127.0.0.1:8000/docs ·
  ReDoc: http://127.0.0.1:8000/redoc
- Simulation state lives in a module-level singleton inside `api/routes.py`; it is lost
  when the server stops (there is no database).

### 7.4 Frontend installation and startup

```bash
cd frontend
pnpm install     # or: pnpm install --frozen-lockfile
pnpm dev         # http://localhost:3000
```

Production build and serve:

```bash
cd frontend
pnpm build
pnpm start       # serves the optimized build on port 3000
```

### 7.5 Environment variables

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | `http://127.0.0.1:8000` | Base URL used by `lib/api.ts` |

The file `frontend/.env.local` exists only locally (matched by `.env*.local` in
`frontend/.gitignore`) and is **not** committed — create it if it is missing. The backend
reads no environment variables of its own; CORS origins are hard-coded in `api/main.py`.

### 7.6 Running tests and the production build

```bash
# backend (from the repository root, with the venv active)
python -m pytest tests/ -v          # 147 tests

# frontend
cd frontend
pnpm exec tsc --noEmit               # type check
pnpm build                           # production build
```

Detailed inventories, verified outputs, and caveats are in [TESTING.md](TESTING.md).

### 7.7 Troubleshooting common failures

| Symptom | Cause | Fix |
|---|---|---|
| Frontend shows "Failed to load processes" | Backend not running, or wrong URL | Start uvicorn on 8000; check `NEXT_PUBLIC_API_URL` |
| Browser console: CORS error | Request from an origin not in `allow_origins` | Use `localhost:3000` / `127.0.0.1:3000`, or extend the list in `api/main.py` |
| `error while attempting to bind on address … already in use` | Port 8000/3000 occupied | Stop the other process or change the port (and `NEXT_PUBLIC_API_URL`) |
| `pnpm lint` fails with "Invalid project directory … /lint" | Next.js 16 removed `next lint` | Use `pnpm exec tsc --noEmit` |
| Warning "Next.js ignored pnpm-lock.yaml in /home/lenovowsl …" | A stray `pnpm-lock.yaml` outside the repository (workspace home) | Harmless; remove it or set `turbopack.root` in `next.config.js` |
| `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated` | Installed starlette/httpx generation skew | Informational; see [TESTING.md](TESTING.md) for impact on tests |
| `python main.py` raises `TclError: no display name` | Headless environment | Run on a machine with a display (`DISPLAY` set) |
| `ModuleNotFoundError: No module named 'api'` | Wrong working directory | Run commands from the repository root |
| Stale/odd simulation state | State is in-memory | `POST /api/reset` or restart the backend |

---

## 8. Quality and Limitations

### 8.1 Existing automated tests

147 pytest tests in `tests/` (no `pytest.ini`/`conftest.py`; plain discovery from the repo
root):

| File | Tests | What it covers |
|---|---:|---|
| `test_process.py` | 11 | PCB creation and defaults, priority/parent fields, registers, memory values, `to_dict()`; `Process` construction, properties, state setter, `repr` |
| `test_process_manager.py` | 9 | Creation, PID uniqueness/sequence, lookup (present/absent), list-all, removal, clear, no PID recycling |
| `test_state_manager.py` | 22 | All six valid transitions; seven invalid-transition tests; TERMINATED has no outgoing transitions; `get_valid_actions` per state; `can_transition`; unknown action label |
| `test_controller.py` | 22 | `EventLogger` (log/list/clear/listeners) and `Controller` (create, six actions, rejection, terminated lock-out, event content, reset, listener notification, full lifecycle) |
| `test_hierarchy.py` | 28 | `ProcessManager` hierarchy rules (root/child/nested, parents, children, tree, termination survival, self-parent, nonexistent parent, removal semantics, reset) and the same through `Controller` |
| `test_scheduling.py` | 10 | FCFS with idle gap and metrics, FCFS input-order tie, SJF selection + tie, Priority order + convention, Round Robin slicing with mid-slice arrival, RR idle start, four invalid-input cases |
| `test_api.py` | 45 | Health/root, creation (root/child/unique/400/422), scheduling run + compare + 422 cases, retrieval, hierarchy endpoints, valid-actions per state, all six transition endpoints, rejections, event log, reset (state + PID counter), full lifecycle |

Not covered by automated tests: the Tkinter GUI, the React components (no frontend test
runner), visual rendering, CORS behaviour, and the `pnpm build` output (verified manually).

### 8.2 Known issues

1. **API test hang (previously reported)** — a hang in `tests/test_api.py` was reported
   earlier in the project. It is **not reproducible in the current environment**: on
   13 Oct 2026 `python -m pytest tests/test_api.py -v` completed 45 tests in ~0.5 s and the
   full suite completed 147 tests in 0.55–0.60 s across repeated runs (see [TESTING.md](TESTING.md)). If
   it recurs, run the module alone under a shell timeout
   (`timeout 120 python -m pytest tests/test_api.py -v`) to confirm, then check the
   starlette/httpx versions — the suite currently emits
   `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated;
   install httpx2 instead`, and running with `-W error::DeprecationWarning` turns the anyio
   deprecation warning into a **collection error** in `test_api.py`. Residual risk:
   unresolved until a scenario that reproduces the hang is identified.
2. **`pnpm lint` is broken** — `next lint` was removed in Next.js 16, so the `lint` script
   fails with `Invalid project directory provided, no such directory: …/frontend/lint`.
3. **Rejected transitions echo the action as `message`** — for `success: false` the API
   returns `message: "DISPATCH"` (the action name) rather than a human-readable reason,
   because `Controller._do_transition` returns the action as its message.
4. **Declared 422 schema ≠ actual payload** — `ErrorResponse` documents
   `{"detail": "…"}`, but FastAPI emits a list-shaped `detail` for 422. The frontend
   client types `detail` as a string, so a 422 reaching the UI would render as
   `[object Object]` (currently masked by client-side validation in the scheduling and
   creation forms).
5. **Static "Backend Connected" indicator** — the header badge is decorative; it does not
   call `/api/health` (though `api.healthCheck` exists).
6. **Dead frontend components** — `PCBViewer`, `Panel`, `StateMachine`, and
   `StateVisualizer` are not imported by any page or component.
7. **Deprecation warnings during pytest** — two warnings originate from the installed
   starlette/httpx/anyio stack, not from project code.
8. **No lint/type gate in CI** — checks are manual (`tsc`, `pytest`, `pnpm build`).

### 8.3 Missing functionality and realistic future improvements

| Missing today | Realistic improvement |
|---|---|
| Link between the scheduler and the process simulator | Add an opt-in mode where a chosen schedule drives READY/RUNNING transitions, keeping the engine stateless |
| Preemptive SJF/Priority, MLFQ, FCFS with context-switch cost | Extend `scheduling/engine.py` behind new `algorithm` literals + schema updates + tests |
| Persistence of simulation state | Optional JSON snapshot/restore endpoint |
| Deletion/GC of TERMINATED processes | `DELETE /api/processes/{pid}` reusing `ProcessManager.remove_process`, plus tests |
| Frontend tests | Add Vitest/React Testing Library for `CpuSchedulingWorkspace` and `TransitionControls` |
| Working lint | Replace `next lint` with ESLint 9 flat config or remove the script |
| Health-driven UI status | Wire the header badge to `api.healthCheck()` |
| GUI coverage | The Tkinter path has no automated tests; consider smoke-testing widget construction |
