# Process Creation and State Transition Visualizer

A Tkinter-based educational simulation of operating-system process management. Demonstrates process creation, PCB representation, the classic 5-state process lifecycle, and parent-child process hierarchy.

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
- **State diagram visualizer** (responsive Canvas) with rounded boxes, shadows, transition labels, and animated tokens
- **Transition controls** (ADMIT, DISPATCH, PREEMPT, BLOCK, WAKE, TERMINATE) enabled/disabled based on valid transitions
- **Event log** with color-coded entries (created/transitions/rejected/reset)
- **Reset** clears all processes, hierarchy, events, and PID counter
- **Modern GUI** with consistent design system, card layout, and ttk theming
- **92 automated tests** covering all backend logic and hierarchy

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
- Root processes have no parent (parent PID = 0)
- A process cannot be its own parent
- Terminating a parent does NOT terminate its children
- Children remain visible in the hierarchy after parent termination
- Reset clears all hierarchy data

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
│   ├── process_manager.py     # Process table, PID generation, hierarchy
│   └── state_manager.py       # State transition logic
├── core/
│   ├── __init__.py
│   ├── controller.py          # Orchestrates all backend operations
│   └── event_logger.py        # Timestamped event logging
├── gui/
│   ├── __init__.py
│   ├── theme.py               # Design system (colors, fonts, ttk styles)
│   ├── animation.py           # after()-based token animation
│   ├── dashboard.py           # Main application window
│   ├── process_table.py       # Styled Treeview process table
│   ├── process_tree.py        # Hierarchical Treeview for parent-child
│   ├── state_visualizer.py    # Responsive Canvas state diagram
│   └── pcb_viewer.py          # Grouped PCB details panel
└── tests/
    ├── __init__.py
    ├── test_process.py        # PCB and Process tests
    ├── test_process_manager.py # ProcessManager tests
    ├── test_state_manager.py  # State transition tests
    ├── test_controller.py     # Controller and EventLogger tests
    └── test_hierarchy.py      # Parent-child hierarchy tests
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

All 92 tests should pass.

## V1.1 Changes

### GUI Modernization
- Consistent design system with unified color palette and typography
- Card/panel layout with visual hierarchy
- ttk theming using `clam` theme for cross-platform consistency
- Responsive state diagram that scales with window size
- Rounded boxes with drop shadows in the state diagram
- Animated token movement on state transitions (via `after()`)
- Color-coded event log entries
- Styled process table with alternating row colors
- Grouped PCB viewer sections (Identity, CPU, Memory)

### Process Hierarchy
- Parent-child relationships between processes
- Process tree view using native ttk.Treeview hierarchy
- Parent selection dropdown when creating processes
- Children displayed in PCB viewer
- Hierarchy preserved after parent termination
- Self-parent and invalid parent validation

### Hierarchy Semantics
- Terminating a parent does NOT terminate children (intentional simulation simplification)
- Children remain alive and visible after parent termination
- Reset clears all processes and hierarchy data

## Limitations

- No scheduling algorithms (round-robin, priority, etc.)
- No CPU utilization or performance metrics
- No IPC, synchronization, or shared memory
- No virtual memory management
- No real process monitoring or manipulation
- Single-process execution model (one process can be RUNNING at a time conceptually)
- PCB fields (registers, memory, program counter) are simulated/randomized educational values
- Parent termination does not cascade to children (by design)
