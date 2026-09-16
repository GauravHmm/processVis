# Process Creation and State Transition Visualizer

## Project

This is a 2-person academic Operating Systems project.

The application is a SIMULATION of OS process management.
It must NOT manipulate real operating-system processes.

Technology:
- Python 3
- Tkinter
- Python standard library wherever possible
- pytest for tests

## V1.0 Scope

V1.0 MUST contain:

1. Process creation
2. Unique PID generation
3. PCB representation
4. Process table
5. Process states:
   - NEW
   - READY
   - RUNNING
   - BLOCKED
   - TERMINATED
6. Valid state transitions
7. Invalid transition rejection
8. Process selection
9. PCB viewer
10. State transition visualization
11. Event/transition log
12. Reset simulation
13. Automated tests for core logic

## State Machine

Valid transitions:

NEW -> READY

READY -> RUNNING

RUNNING -> READY
RUNNING -> BLOCKED
RUNNING -> TERMINATED

BLOCKED -> READY

TERMINATED has no outgoing transitions.

Interpretation:

NEW -> READY:
Process admission.

READY -> RUNNING:
Dispatch.

RUNNING -> READY:
Preemption/time-slice expiration in the simulation.

RUNNING -> BLOCKED:
Process waits for I/O.

BLOCKED -> READY:
I/O completion.

RUNNING -> TERMINATED:
Process exits.

Do not allow arbitrary state changes.

## Architecture

Use separation of concerns:

GUI
    ↓
Controller
    ↓
Process Manager / State Manager
    ↓
Process / PCB
    ↓
Event Logger

The GUI must never directly modify process state.

For example, do NOT do:

process.state = RUNNING

inside GUI code.

Instead use controller/state-manager methods.

## PCB

The PCB should contain simulated values for:

- PID
- process name
- state
- priority
- parent PID
- program counter
- CPU registers
- memory base
- memory limit
- creation time

These are simulated educational values.
They are NOT real CPU registers or real memory addresses.

## Process Manager

Maintain processes using a dictionary keyed by PID.

Example:

{
    1: Process(...),
    2: Process(...),
    3: Process(...)
}

PID generation must guarantee uniqueness during a simulation.

Do not recycle terminated PIDs in V1.0.

## Event Logger

Log:

- process creation
- successful transitions
- rejected transitions
- termination
- reset

Each event should include a timestamp.

Example:

[12:41:03] P1 CREATED
[12:41:05] P1 NEW -> READY
[12:41:08] P1 READY -> RUNNING
[12:41:11] P1 RUNNING -> BLOCKED

## GUI

The GUI should contain:

1. Application title
2. Process creation form
3. State-machine visualization
4. Process table
5. PCB viewer
6. State transition controls
7. Event log
8. Reset button

The currently selected process should be visually clear.

The currently occupied state should be highlighted.

Buttons should be enabled/disabled according to valid transitions.

## UI

Prioritize:

- clarity
- readability
- functional visualization
- simple professional appearance

Do NOT introduce:
- React
- web frameworks
- databases
- authentication
- networking
- unnecessary dependencies
- multiprocessing
- threading
- real OS process manipulation

## Code Quality

Prefer small, understandable classes.

Avoid unnecessary abstraction.

Avoid premature optimization.

Use type hints where useful.

Use docstrings for important public classes and methods.

Keep OS terminology accurate.

## Testing

Tests must cover:

- PCB creation
- process creation
- PID uniqueness
- process lookup
- all valid transitions
- invalid transitions
- termination
- event logging

Do not consider V1.0 complete until tests pass.

## Development Rule

Before adding optional features, make the complete V1.0 work.

Do NOT implement:

- process tree
- scheduling algorithms
- CPU utilization
- IPC
- synchronization
- virtual memory
- real process monitoring
- animations

unless explicitly requested after V1.0 is complete.