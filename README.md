# Process Creation and State Transition Visualizer

A Tkinter-based educational simulation of operating-system process management. Demonstrates process creation, PCB representation, and the classic 5-state process lifecycle.

> **Note:** This is a *simulation* for academic purposes. It does **not** manipulate real OS processes.

## OS Concepts Demonstrated

- Process Control Block (PCB) and its fields
- Process states: NEW, READY, RUNNING, BLOCKED, TERMINATED
- State transitions and their legal mappings
- Process admission, dispatching, preemption, blocking, waking, and termination
- Process table management with unique PID generation
- Event logging of all state changes

## Features

- **Process creation** with name and priority input
- **Unique PID generation** (PIDs never recycled in V1.0)
- **PCB viewer** showing all simulated fields (PID, name, state, priority, parent PID, program counter, CPU registers, memory base/limit, creation time)
- **Process table** with row selection
- **State diagram visualizer** (Tkinter Canvas) highlighting the current state of the selected process
- **Transition controls** (ADMIT, DISPATCH, PREEMPT, BLOCK, WAKE, TERMINATE) enabled/disabled based on valid transitions
- **Event log** with timestamps for every operation
- **Reset** clears all processes, events, and PID counter
- **64 automated tests** covering all backend logic

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

## Architecture

```
GUI (Tkinter)
    |
Controller
    |
ProcessManager / StateManager
    |
Process / PCB
    |
EventLogger
```

The GUI never directly modifies process state. All mutations flow through the Controller.

## Project Structure

```
process-creation-visualizer/
├── main.py                    # Entry point
├── requirements.txt
├── process/
│   ├── __init__.py
│   ├── pcb.py                 # PCB dataclass
│   ├── process.py             # Process wrapper
│   ├── process_manager.py     # Process table & PID generation
│   └── state_manager.py       # State transition logic
├── core/
│   ├── __init__.py
│   ├── controller.py          # Orchestrates all backend operations
│   └── event_logger.py        # Timestamped event logging
├── gui/
│   ├── __init__.py
│   ├── dashboard.py           # Main application window
│   ├── process_table.py       # Treeview process table
│   ├── state_visualizer.py    # Canvas state diagram
│   └── pcb_viewer.py          # PCB details panel
└── tests/
    ├── __init__.py
    ├── test_process.py
    ├── test_process_manager.py
    ├── test_state_manager.py
    └── test_controller.py
```

## Installation

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies (tkinter is part of the Python standard library)
pip install -r requirements.txt
```

**System requirement:** `python3-tk` must be installed for the GUI:

```bash
# Debian/Ubuntu
sudo apt-get install python3-tk

# macOS (usually included)
brew install python-tk

# Windows (usually included with Python installer)
```

## Running the Application

```bash
python main.py
```

## Running Tests

```bash
python -m pytest tests/ -v
```

All 64 tests should pass.

## V1.0 Scope

V1.0 includes:
- Process creation with unique PID generation
- PCB representation with all specified fields
- 5-state process model (NEW, READY, RUNNING, BLOCKED, TERMINATED)
- All valid state transitions enforced
- Invalid transition rejection with logging
- GUI with state diagram, process table, PCB viewer, transition controls, and event log
- Reset functionality
- Automated test suite

## Limitations

- No scheduling algorithms (round-robin, priority, etc.)
- No process tree or parent-child relationships beyond PID tracking
- No CPU utilization or performance metrics
- No IPC, synchronization, or shared memory
- No virtual memory management
- No real process monitoring or manipulation
- Single-process execution model (one process can be RUNNING at a time conceptually)
- PCB fields (registers, memory, program counter) are simulated/randomized educational values
