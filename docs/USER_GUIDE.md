# User Guide

How to use the Process Creation and State Transition Visualizer as a student or
demonstrator. Every control described here exists in the current build; nothing is
speculative.

Related documents: [README](../README.md) (quick start),
[TECHNICAL_DOCUMENTATION](TECHNICAL_DOCUMENTATION.md) (architecture and API),
[PROJECT_EXPLANATION](PROJECT_EXPLANATION.md) (viva preparation),
[TESTING](TESTING.md) (test commands and results).

## 1. Before you start

Start the backend first, then the frontend:

```bash
# terminal 1 — API on port 8000
source venv/bin/activate
uvicorn api.main:app --reload --host 127.0.0.1 --port 8000

# terminal 2 — web UI on port 3000
cd frontend
pnpm dev
```

Open <http://localhost:3000>. The header badge shows whether the web UI can reach
the API (see [§9](#9-common-errors-and-troubleshooting)).

Optional desktop interface (separate simulation state, no HTTP):

```bash
source venv/bin/activate
python main.py
```

## 2. Workspace navigation

The area directly under the header has two workspace tabs:

| Tab | What it contains |
|-----|------------------|
| **Process Simulator** | process creation, state machine, PCB inspection, hierarchy, event log |
| **CPU Scheduling** | job inputs, algorithm selection, lifecycle playback, Gantt chart, scheduling metrics |

In the Process Simulator, a second tab row at the bottom switches between
**Process Table** and **Event Timeline**. The header always shows the backend
status badge and the **Reset** button.

## 3. Process Simulator workspace

### 3.1 Process Explorer (left column)

- Shows **"Process Explorer"** with the number of simulated processes and a
  **+ Create** button.
- **Hierarchy** lists every process as a tree, one state badge per row. Click a
  row (or focus it and press Enter/Space) to select it; the selected row is
  highlighted. Processes that have children show a `▼` marker and their
  children are listed indented underneath.
- Empty state: *"No processes — create a process to build the hierarchy"*.

### 3.2 Creating a process

1. Click **+ Create**. A **Create Process** dialog opens.
2. Fill in:
   - **Process Name** — required, non-empty.
   - **Priority** — integer; the backend accepts `0`–`100`.
   - **Parent Process (optional)** — defaults to *None (root process)*; other
     options list the processes that currently exist.
3. Click **Create Process**.

The new process starts in the **NEW** state and receives the next free PID.
PIDs are never reused until you reset. Errors from the backend (for example a
priority above 100) are shown in a red alert inside the dialog.

### 3.3 Selecting and inspecting a process (PCB viewer)

Select a process in the hierarchy or in the Process Table. The **Inspector**
panel (right column) shows it:

- **Overview** — PID, process name, state, priority, parent PID, children,
  creation time.
- **Cpu** — program counter and the simulated CPU registers (AX, BX, CX, DX).
- **Memory** — simulated memory base and memory limit.

These are educational values produced by the simulation, not real hardware
state. With nothing selected the panel says *"No process selected. Select one
from the explorer or table."*

### 3.4 State machine graph (centre)

The SVG graph draws the five states (NEW, READY, RUNNING, BLOCKED, TERMINATED)
and all six legal transitions. It shows:

- the state of the selected process as the current node,
- the outgoing edges that are valid **right now** as active,
- an animated token travelling along the edge while a transition is executing.

The graph is display-only: clicking it never changes a state. Validity is
decided by the backend through `GET /api/processes/{pid}/valid-actions`.

### 3.5 Transition controls (right column)

Six buttons: **Admit, Dispatch, Preempt, Block, Wake, Terminate**.

- Buttons are enabled only when the backend reports the action as valid for the
  selected process's current state, so an illegal combination is simply not
  clickable.
- The panel shows **Current state** above the buttons; without a selection it
  says *"Select a process to enable transitions."*
- If the backend rejects an action anyway (for example because the state
  changed in between), an error appears explaining why, such as
  `DISPATCH requires state READY, but P1 is NEW; valid actions now: ADMIT`.
  The process keeps its state and the rejection is added to the event log.

### 3.6 Process Table and Event Timeline (bottom)

- **Process Table** — columns PID, Name, State, Priority, Parent, Created.
  Click a row to select that process.
- **Event Timeline** — timestamped log entries: creations, every successful
  transition (`NEW -> READY`, …), rejections, and the reset marker. If loading
  fails, the panel offers a **Retry** button.

### 3.7 Reset

The **Reset** button in the header clears the simulation: all processes,
hierarchy links, and events are removed and PID generation restarts at 1. The
button shows *Resetting…* while the request is in flight. Your CPU Scheduling
workspace inputs and results are **not** affected.

## 4. CPU Scheduling workspace

Switch to the **CPU Scheduling** tab. Scheduling jobs are independent inputs:
they are not PCB records, and running a schedule never changes any simulated
process state.

### 4.1 Job inputs

The **Scheduling Jobs** table has a row per job with four fields:

| Field | Meaning | Accepted values |
|-------|---------|-----------------|
| Name | label shown in the Gantt chart | non-empty |
| Arrival | arrival time | integer ≥ 0 |
| CPU burst | units of CPU time | integer > 0 |
| Priority | scheduling priority | integer 0–100, higher wins |

Use **Add job** to append a row and **×** to remove one. Job IDs are generated
in the browser. Time values are integer simulation units (not seconds).

A sample set of three jobs is pre-filled.

### 4.2 Algorithm selection

Choose one of:

- **First Come, First Served (FCFS)**
- **Shortest Job First (SJF)** — non-preemptive
- **Priority Scheduling** — non-preemptive
- **Round Robin**

All choices use deterministic backend tie rules: FCFS selects earliest arrival then request
order; SJF selects shortest burst, then earliest arrival and request order; Priority selects
the largest priority number, then earliest arrival and request order. Higher priority values
(0–100) mean higher priority. Round Robin is FIFO; arrivals during a slice enter the queue
before the unfinished process is requeued.

### 4.3 Round Robin time quantum

The **Round Robin time quantum** field is enabled only when Round Robin is
selected. It must be a positive whole number (the default is `2`). Other
algorithms ignore it.

### 4.4 Running one algorithm

Click **Run selected**. The result panel shows:

- algorithm name, job count, and total makespan,
- **Average waiting**, **Average turnaround**, **Average response**,
- the **Gantt timeline** (gray segments are idle CPU),
- the five-state lifecycle diagram with each job's ID, its current state, and an animated
  token travelling on the transition edge as playback crosses events,
- playback controls and the current event explanation,
- a per-job table: Arrival, Burst, First start, Completion, Waiting,
  Turnaround, Response,
- for Priority runs, the convention: *"Higher numeric values (0-100) mean
  higher priority."*
- for Round Robin runs, the quantum used.

### 4.5 Comparing all four algorithms

Click **Compare all four**. All four algorithms run on exactly the same job
list; the value in the quantum field is used for Round Robin. A tab row appears
so you can switch between FCFS, SJF, Priority, and Round Robin results, each
with its own lifecycle playback, timeline, and metrics. Selecting a different result
restarts playback at time zero.

### 4.6 Controlling lifecycle playback

The lifecycle diagram is the main view; its job labels represent state at the displayed
simulation time. The separate moving token shows the transition currently being animated.
The diagram and Gantt playhead use the same clock.

- **Play / Pause** — advance or hold the simulation clock. Resume continues from the held
  time.
- **Restart** — return to time zero and reset the diagram and Gantt playhead.
- **Previous event / Next event** — jump to the previous or next distinct transition time.
- **Seekbar** — drag to any time, including a fractional time between events. Seeking
  reconstructs all states directly and does not replay earlier transitions.
- **Playback speed** — choose 0.5×, 1×, 2×, or 4×.

The panel shows the simulated time and schedule duration, a concise explanation of the
current event, and up to six recent events. At the beginning and end, step controls and Play
are disabled when there is no preceding/following event or no remaining schedule.

Scheduling playback models arrivals/admission (`NEW → READY`), dispatch (`READY → RUNNING`),
Round Robin preemption (`RUNNING → READY`), and completion (`RUNNING → TERMINATED`). An
unfinished Round Robin slice is preemption; a job finishing exactly at its quantum boundary
terminates instead. FCFS, SJF, and Priority are non-preemptive. The scheduler has no I/O
events, so **BLOCKED** and **WAKE** stay visible in the diagram but remain inactive.

### 4.7 Reading the Gantt chart

Each block is one uninterrupted CPU segment: `start–end` is printed on the
block and the job name inside it. Block width is proportional to duration.
The playhead and active-segment highlight follow the lifecycle clock. Gray blocks are
intervals where no job is running (including periods before an arrival or while the ready
queue is empty). Hover a block to see its exact interval and length.

### 4.8 Reading the metrics

For every job:

- **Waiting time** = turnaround − burst (time spent in the ready queue),
- **Turnaround time** = completion − arrival (total time in the system),
- **Response time** = first start − arrival (delay before the first run).

The three averages are the mean of the per-job values.

Editing any job, adding a job, or removing a job clears the current result —
run again to see the effect of your change.

## 5. Tkinter desktop interface

`python main.py` opens a window with:

- a **Create Process** form (name, priority, parent dropdown, **+ Create**),
- **State Transitions** buttons — enabled only for valid actions,
- a **process tree**,
- the **state diagram** (with the same transition token animation),
- a **PCB viewer** for the selected process,
- a **process table**, **Reset Simulation** button, and a colour-coded
  **Event Log** footer.

It runs its own `Controller` in-process, so its simulation state is completely
independent of the API server.

## 6. What each state means

| State | Meaning |
|-------|---------|
| NEW | created, admitted yet to be admitted |
| READY | in the ready queue, waiting for the CPU |
| RUNNING | currently dispatched |
| BLOCKED | waiting for I/O (simulated) |
| TERMINATED | finished; no further transitions are possible |

Valid transitions: `NEW→READY` (Admit), `READY→RUNNING` (Dispatch),
`RUNNING→READY` (Preempt), `RUNNING→BLOCKED` (Block), `BLOCKED→READY` (Wake),
`RUNNING→TERMINATED` (Terminate).

## 7. Reset behaviour — what is and is not cleared

| Cleared by **Reset** | Not cleared |
|----------------------|-------------|
| all processes and PCBs | CPU Scheduling job inputs |
| parent/child hierarchy | Scheduling results and comparisons |
| event log entries | Algorithm and quantum selection |
| PID counter (restarts at 1) | |

Reset cannot be undone.

## 8. Keyboard and accessibility notes

- All controls are buttons/inputs and work with the keyboard; focus rings are
  provided by the theme.
- The hierarchy is exposed as a tree, tabs carry `role="tab"`, and the backend
  status badge is a live region.
- On narrow screens (<640 px) the backend status badge is hidden; everything
  else remains available.

## 9. Common errors and troubleshooting

| Symptom | Cause | What to do |
|---------|-------|------------|
| Badge shows *Backend disconnected*, and panels say *Failed to load processes* | API not running | Start `uvicorn api.main:app --reload --host 127.0.0.1 --port 8000` |
| Requests blocked in the browser console (CORS) | UI served from an origin the API does not allow | Use <http://localhost:3000> or <http://127.0.0.1:3000>; the API allows exactly those two |
| *priority: Input should be less than or equal to 100* | priority outside the accepted range | Enter 0–100 |
| *name: String should have at least 1 character* | empty process name | Enter a name |
| Red alert on a transition, e.g. *ADMIT requires state NEW, but P1 is READY* | action not legal in the current state | Follow the hint — the message lists the actions valid right now |
| *Round Robin requires a positive integer time_quantum* | missing/invalid quantum | Enter a positive whole number in the quantum field |
| Job validation message on **Run selected** / **Compare all four** | bad job row (empty name, burst ≤ 0, arrival < 0, priority outside 0–100) | Fix the highlighted row and run again |
| *job_id values must be unique within a scheduling request* | duplicate generated IDs (only reachable outside the UI) | Reload the page to restore the default job rows |
| Frontend build warns or fails on a port conflict | port 3000 or 8000 already in use | Stop the other process or use another port consistently |
| Page is blank/stale after changes | cached build | Restart `pnpm dev`; for production output run `pnpm build` |

The API also serves interactive documentation at <http://127.0.0.1:8000/docs>.
