# Process Creation and State Transition Visualizer

A web-based educational simulation of operating-system process management. Demonstrates process creation, PCB representation, the classic 5-state process lifecycle, and parent-child process hierarchy.

> **Note:** This is a *simulation* for academic purposes. It does **not** manipulate real OS processes.

## OS Concepts Demonstrated

- Process Control Block (PCB) and its fields
- Process states: NEW, READY, RUNNING, BLOCKED, TERMINATED
- State transitions and their legal mappings
- Process admission, dispatching, preemption, blocking, waking, and termination
- Process table management with unique PID generation
- Parent-child process hierarchy (process tree)
- Event logging of all state changes

## Features

- **Process creation** with name, priority, and optional parent selection
- **Unique PID generation** (PIDs never recycled)
- **Parent-child hierarchy** with process tree visualization
- **PCB viewer** showing all simulated fields including children
- **Process table** with row selection and alternating row colors
- **State diagram visualizer** with highlighted current state and transition arrows
- **Transition controls** (ADMIT, DISPATCH, PREEMPT, BLOCK, WAKE, TERMINATE) enabled/disabled based on valid transitions
- **Event log** with timestamped entries (created/transitions/rejected/reset)
- **Reset** clears all processes, hierarchy, events, and PID counter
- **Modern web UI** with dark theme, card layout, and responsive design
- **129 automated tests** covering all backend logic, hierarchy, and API

## State Transition Table

| From      | To         | Action    |
|-----------|------------|-----------|
| NEW       | READY      | ADMIT     |
| READY     | RUNNING    | DISPATCH  |
| RUNNING   | READY      | PREEMPT   |
| RUNNING   | BLOCKED    | BLOCK     |
| RUNNING   | TERMINATED | TERMINATE |
| BLOCKED   | READY      | WAKE      |

All other transitions are rejected and logged.

## Hierarchy Rules

- A process may have zero or one parent
- A process may have zero or more children
- Root processes have no parent (parent PID = null)
- A process cannot be its own parent
- Terminating a parent does NOT terminate its children
- Children remain visible in the hierarchy after parent termination
- Reset clears all hierarchy data

## Architecture

```
Next.js Frontend (React + TypeScript + Tailwind)
        ↓ HTTP/JSON
FastAPI Backend (Python)
        ↓
Controller / ProcessManager / StateManager / EventLogger
        ↓
Process / PCB
```

The frontend never directly modifies process state. All mutations flow through the FastAPI backend.

## Project Structure

```
process-creation-visualizer/
├── api/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── routes.py               # REST API routes
│   └── schemas.py              # Pydantic request/response models
├── core/
│   ├── __init__.py
│   ├── controller.py           # Orchestrates all backend operations
│   └── event_logger.py         # Timestamped event logging
├── process/
│   ├── __init__.py
│   ├── pcb.py                  # PCB dataclass
│   ├── process.py              # Process wrapper
│   ├── process_manager.py      # Process table, PID generation, hierarchy
│   └── state_manager.py        # State transition logic
├── frontend/
│   ├── app/                    # Next.js App Router pages
│   ├── components/             # React components
│   ├── lib/                    # API client
│   ├── types/                  # TypeScript types
│   └── package.json
├── gui/                        # Legacy Tkinter GUI (retained for reference)
├── tests/
│   ├── __init__.py
│   ├── test_api.py             # API integration tests
│   ├── test_process.py         # PCB and Process tests
│   ├── test_process_manager.py # ProcessManager tests
│   ├── test_state_manager.py   # State transition tests
│   ├── test_controller.py      # Controller and EventLogger tests
│   └── test_hierarchy.py       # Parent-child hierarchy tests
├── requirements.txt
└── README.md
```

## Installation

### Backend (Python + FastAPI)

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Frontend (Next.js + React + TypeScript + Tailwind)

```bash
cd frontend
pnpm install
```

## Running the Application

### Start Backend

```bash
source venv/bin/activate
uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
```

- API: http://127.0.0.1:8000
- Swagger docs: http://127.0.0.1:8000/docs

### Start Frontend

```bash
cd frontend
pnpm dev
```

- Frontend: http://localhost:3000

## Running Tests

### Backend Tests

```bash
source venv/bin/activate
python -m pytest tests/ -v
```

All 129 tests should pass.

### Frontend Type Checking & Build

```bash
cd frontend
pnpm exec tsc --noEmit
pnpm build
```

## API Endpoints

### Process Management
- `GET /api/processes` - List all processes
- `POST /api/processes` - Create process (name, priority?, parent_pid?)
- `GET /api/processes/{pid}` - Get process by PID
- `GET /api/processes/{pid}/valid-actions` - Get valid actions for process

### State Transitions
- `POST /api/processes/{pid}/admit` - NEW → READY
- `POST /api/processes/{pid}/dispatch` - READY → RUNNING
- `POST /api/processes/{pid}/preempt` - RUNNING → READY
- `POST /api/processes/{pid}/block` - RUNNING → BLOCKED
- `POST /api/processes/{pid}/wake` - BLOCKED → READY
- `POST /api/processes/{pid}/terminate` - RUNNING → TERMINATED

### Hierarchy
- `GET /api/processes/{pid}/parent` - Get parent process
- `GET /api/processes/{pid}/children` - Get child processes
- `GET /api/process-tree` - Get full hierarchy tree

### Events & Reset
- `GET /api/events` - Get event log
- `POST /api/reset` - Reset simulation

### Health
- `GET /api/health` - Health check

## Technology Stack

**Backend:**
- Python 3.12+
- FastAPI 0.109+
- Uvicorn
- Pydantic 2

**Frontend:**
- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 3
- pnpm

**Testing:**
- pytest (backend)
- TypeScript type checking (frontend)

## Limitations

- No scheduling algorithms (round-robin, priority, etc.)
- No CPU utilization or performance metrics
- No IPC, synchronization, or shared memory
- No virtual memory management
- No real process monitoring or manipulation
- Single-process execution model (one process can be RUNNING at a time conceptually)
- PCB fields (registers, memory, program counter) are simulated/randomized educational values
- Parent termination does not cascade to children (by design)
- No authentication, database, WebSockets, or external dependencies

## License

Educational academic project.