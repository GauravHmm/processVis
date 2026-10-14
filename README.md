# Process Creation and State Transition Visualizer

An educational simulation of operating-system process management. It demonstrates process
creation, PCB representation, the classic five-state process lifecycle, parent-child process
hierarchy, and classical CPU scheduling algorithms (FCFS, SJF, Priority, Round Robin).

Two interfaces are provided:

- **Next.js web interface** (primary) served by a FastAPI backend over a REST API
- **Tkinter desktop interface** (`main.py`) that talks to the same backend logic in-process

> **Note:** this is a *simulation* for academic purposes. It does **not** create, inspect,
> suspend, or terminate real operating-system processes, and it never touches real CPU
> registers or real memory. Every register, memory address, and program-counter value shown
> is a simulated educational value.

## OS Concepts Demonstrated

- Process Control Block (PCB) and its fields
- Process states: NEW, READY, RUNNING, BLOCKED, TERMINATED
- State transitions and their legal mappings (six valid transitions)
- Process admission, dispatching, preemption, blocking, waking, and termination
- Process table management with unique PID generation (PIDs are never recycled)
- Parent-child process hierarchy (process tree)
- Event logging of creations, transitions, rejected transitions, and reset
- Classical CPU scheduling: FCFS, non-preemptive SJF, non-preemptive Priority, Round Robin
- Scheduling metrics: waiting time, turnaround time, response time, and Gantt timeline

## Features

- **Process creation** with name, priority, and optional parent selection
- **Unique PID generation** (PIDs never recycled until reset)
- **Parent-child hierarchy** with a process-tree visualization
- **PCB viewer/inspector** showing all simulated fields including children
- **Process table** with row selection
- **State-machine visualization** (SVG) with the selected state highlighted, valid outgoing
  transitions emphasized, and an animated token for the transition being executed
- **Transition controls** (ADMIT, DISPATCH, PREEMPT, BLOCK, WAKE, TERMINATE) enabled only
  for actions the backend reports as valid
- **Event log** with timestamped entries (created / transitions / rejected / reset)
- **Reset** clears all processes, hierarchy, events, and the PID counter
- **CPU Scheduling workspace** with job input table, single-algorithm run, four-algorithm
  comparison, Gantt timeline, per-job metrics, and averages
- **147 automated tests** covering the backend logic, hierarchy, scheduling engine, and API

## State Transition Table

| From      | To         | Action    |
|-----------|------------|-----------|
| NEW       | READY      | ADMIT     |
| READY     | RUNNING    | DISPATCH  |
| RUNNING   | READY      | PREEMPT   |
| RUNNING   | BLOCKED    | BLOCK     |
| RUNNING   | TERMINATED | TERMINATE |
| BLOCKED   | READY      | WAKE      |

All other transitions are rejected, logged as `REJECTED`, and reported with
`success: false` while the process keeps its current state. TERMINATED has no outgoing
transitions.

## Hierarchy Rules

- A process may have zero or one parent
- A process may have zero or more children
- Root processes have no parent (`parent_pid: null` in API responses; `0` internally)
- A process cannot be its own parent, and a parent must already exist
- Terminating a parent does **not** terminate its children
- Children remain visible in the hierarchy after parent termination
- Reset clears all hierarchy data

## CPU Scheduling

| Algorithm        | Selection rule                                    | Tie-break (in order)              |
|------------------|---------------------------------------------------|-----------------------------------|
| FCFS             | smallest arrival time among arrived jobs          | arrival time, then request order  |
| SJF (non-preemptive) | smallest burst among arrived jobs             | burst, arrival, then request order|
| Priority (non-preemptive) | highest priority number among arrived jobs | arrival, then request order       |
| Round Robin      | fixed time quantum from a FIFO ready queue        | request order                     |

- Priority convention: **higher numeric value (0–100) means higher priority**
- Inputs are independent scheduling jobs (`job_id`, `name`, `arrival_time`, `burst_time`,
  `priority`) — they are **not** PCB records and running a schedule never changes any
  simulated process state
- Idle CPU time appears in the timeline as `job_id: null`, name `IDLE`
- Metrics: `waiting = turnaround − burst`, `turnaround = completion − arrival`,
  `response = first_start − arrival`, plus averages across all jobs

See [docs/TECHNICAL_DOCUMENTATION.md](docs/TECHNICAL_DOCUMENTATION.md#4-cpu-scheduling) for
the full specification, formulas, and example requests.

## Architecture

```
Next.js frontend (React + TypeScript + Tailwind CSS + daisyUI)
        │  HTTP / JSON
        ▼
FastAPI (api/main.py, api/routes.py, api/schemas.py)
        │
        ▼
Controller ──► ProcessManager ──► Process / PCB
   │      └──► StateManager  ──► Process / PCB
   └──────────► EventLogger

FastAPI POST /api/scheduling/*  ──►  scheduling/engine.py  (stateless, separate input model)
```

- The frontend never modifies process state; every mutation flows through the REST API and
  then through the `Controller`.
- The CPU scheduling engine is a pure function of its request payload. It shares no state
  with the interactive process simulator.
- The Tkinter GUI (`gui/`, launched by `main.py`) calls the same `Controller` directly in
  the same process; it does not use HTTP.

Full diagrams, component responsibilities, and request flows are in
[docs/TECHNICAL_DOCUMENTATION.md](docs/TECHNICAL_DOCUMENTATION.md).

## Project Structure

```
process-creation-visualizer/
├── api/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app, CORS, root endpoint
│   ├── routes.py               # REST API routes (processes, scheduling, events)
│   └── schemas.py              # Pydantic request/response models
├── core/
│   ├── controller.py           # Orchestrates all backend operations
│   └── event_logger.py         # Timestamped event logging
├── process/
│   ├── pcb.py                  # PCB dataclass (simulated fields)
│   ├── process.py              # Process wrapper around a PCB
│   ├── process_manager.py      # Process table, PID generation, hierarchy
│   └── state_manager.py        # State transition validation and application
├── scheduling/
│   └── engine.py               # FCFS / SJF / Priority / Round Robin engine
├── frontend/                   # Next.js App Router application
│   ├── app/                    # Layout and single page
│   ├── components/             # React components
│   ├── lib/                    # API client, state/action helpers
│   ├── types/                  # TypeScript types mirroring the API
│   └── package.json
├── gui/                        # Tkinter desktop interface
├── tests/                      # pytest suite (147 tests)
├── docs/                       # Technical documentation and testing guide
├── main.py                     # Tkinter entry point
└── requirements.txt
```

## Installation

### Backend (Python + FastAPI)

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend (Next.js + React + TypeScript + Tailwind)

```bash
cd frontend
pnpm install
```

## Running the Application

### Start the backend

```bash
source venv/bin/activate
uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
```

- API: http://127.0.0.1:8000
- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

### Start the frontend

```bash
cd frontend
pnpm dev
```

- Frontend: http://localhost:3000

The frontend reads `NEXT_PUBLIC_API_URL` from `frontend/.env.local` (default
`http://127.0.0.1:8000`). The backend allows CORS only from `http://localhost:3000` and
`http://127.0.0.1:3000`.

### Run the Tkinter desktop interface

```bash
source venv/bin/activate
python main.py
```

The desktop app requires a graphical display. It maintains its own simulation state,
independent of the FastAPI server.

## Running Tests

```bash
source venv/bin/activate
python -m pytest tests/ -v
```

All **147** tests are expected to pass. Frontend type checking and production build:

```bash
cd frontend
pnpm exec tsc --noEmit
pnpm build
```

See [docs/TESTING.md](docs/TESTING.md) for the per-file inventory, verified command
results, and known issues.

## API Endpoints

### Process management
- `GET /api/processes` — list all processes
- `POST /api/processes` — create process (`name`, `priority?`, `parent_pid?`)
- `GET /api/processes/{pid}` — get process by PID
- `GET /api/processes/{pid}/valid-actions` — valid actions for the process

### State transitions
- `POST /api/processes/{pid}/admit` — NEW → READY
- `POST /api/processes/{pid}/dispatch` — READY → RUNNING
- `POST /api/processes/{pid}/preempt` — RUNNING → READY
- `POST /api/processes/{pid}/block` — RUNNING → BLOCKED
- `POST /api/processes/{pid}/wake` — BLOCKED → READY
- `POST /api/processes/{pid}/terminate` — RUNNING → TERMINATED

### Hierarchy
- `GET /api/processes/{pid}/parent` — parent process
- `GET /api/processes/{pid}/children` — child processes
- `GET /api/process-tree` — full parent → children mapping

### CPU scheduling
- `POST /api/scheduling/run` — run one algorithm over a job list
- `POST /api/scheduling/compare` — run all four algorithms on identical jobs

### Events, reset, health
- `GET /api/events` — event log
- `POST /api/reset` — reset the simulation
- `GET /api/health` — health check

Request/response bodies, status codes, and error behavior are documented in
[docs/TECHNICAL_DOCUMENTATION.md](docs/TECHNICAL_DOCUMENTATION.md#5-api-reference).

## Technology Stack

**Backend:** Python 3.12, FastAPI, Uvicorn, Pydantic 2, pytest, httpx (test client)

**Frontend:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, daisyUI 5,
pnpm

**Desktop:** Python Tkinter (standard library)

## Documentation

| Document | Contents |
|----------|----------|
| [README.md](README.md) | Overview, quick start, feature summary |
| [docs/TECHNICAL_DOCUMENTATION.md](docs/TECHNICAL_DOCUMENTATION.md) | Architecture, simulator, scheduling engine, full API reference, frontend, setup and troubleshooting |
| [docs/TESTING.md](docs/TESTING.md) | Test inventory, commands and verified results, known issues |

## Limitations

- Simulation only: no real process creation, monitoring, or manipulation
- PCB fields (program counter, registers, memory base/limit) are randomized simulated
  values, not hardware state
- No scheduling feedback loop: the CPU scheduling workspace does not change the state of
  the interactive process simulator, and process priorities are not consumed by the
  scheduler
- The simulator does not enforce a single RUNNING process; several processes may be
  RUNNING at once
- Terminated processes stay in the process table (no removal endpoint); PIDs are recycled
  only on reset
- No IPC, synchronization, shared memory, virtual memory, databases, authentication,
  WebSockets, or persistence — all state is in-memory and lost when the backend stops
- No frontend automated tests (type checking and production build only)
- `pnpm lint` is currently broken (Next.js 16 removed `next lint`); use
  `pnpm exec tsc --noEmit` instead

## License

Educational academic project.
