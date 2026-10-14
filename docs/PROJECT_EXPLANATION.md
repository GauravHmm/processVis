# Project Explanation

A beginner-friendly walkthrough of the Process Creation and State Transition
Visualizer, written so you can explain the project yourself — in class, in a
report, or at a viva.

Companion documents: [README](../README.md),
[USER_GUIDE](USER_GUIDE.md) (how to operate the UI),
[TECHNICAL_DOCUMENTATION](TECHNICAL_DOCUMENTATION.md) (architecture and API),
[TESTING](TESTING.md) (test evidence).

## 1. What the project does, and why it is useful

The application is a **simulation of operating-system process management**. It
lets a student create simulated processes, watch them move through the classic
five-state lifecycle, inspect their Process Control Blocks (PCBs), see a
parent–child process tree, and then compare four classical CPU scheduling
algorithms on the same set of jobs.

It is useful because operating-system theory is normally invisible: a real OS
schedules thousands of threads and you cannot pause it to look at a PCB. Here
everything is:

- **observable** — every state, field, and decision is on screen,
- **safe** — nothing touches real processes, real registers, or real memory,
- **repeatable** — the same inputs always produce the same schedule, so you can
  predict an answer before you run it.

The learning goals are to identify PCB fields, distinguish the five lifecycle
states, apply only legal transitions, understand parent-child relationships, and
compare how arrival time, burst length, priority, and a time quantum change a CPU
schedule. The lifecycle animation makes the state changes observable alongside
the execution timeline instead of leaving students to infer transitions from a
static schedule.

Two front ends exist: a **Next.js web interface** (the primary one) and a
**Tkinter desktop interface**. Both drive the same Python core.

## 2. The architecture in simple terms

```
  Web UI (React/TS)  ──HTTP/JSON──►  FastAPI routes  ──►  Controller
  Tkinter UI        ─────────────────────────────────►      │
                                                            ├─► ProcessManager  (process table, PIDs, tree)
                                                            ├─► StateManager     (which transitions are legal)
                                                            └─► EventLogger      (timestamped log)
```

Read it as four layers:

1. **Presentation** — the browser or the Tkinter window. It *never* changes a
   process state directly; it only sends requests and draws what comes back.
2. **API** (`api/`) — thin adapters. Each route parses input, calls the
   controller, and formats a response.
3. **Core** (`core/`, `process/`) — the actual rules of the simulation. This is
   where the state machine, PID generation, and hierarchy live.
4. **Scheduling engine** (`scheduling/engine.py`) — a completely separate,
   stateless calculator for FCFS / SJF / Priority / Round Robin.

Two rules hold the design together:

- **One entry point.** All mutations go through `Controller`, so there is
  exactly one place where a state can change and one place that logs it.
- **Scheduling is isolated.** `POST /api/scheduling/*` takes job rows, returns
  metrics, and shares *no* state with the interactive simulator. Running a
  schedule can never move a simulated process to another state.

Why Tkinter still exists: the project started as a desktop app. The core was
kept UI-independent, so the same `Controller` could later be exposed over HTTP.

## 3. Each major section of the web interface

| Section | Where | What it is for |
|---------|-------|----------------|
| Header | top | title, **backend status badge**, **Reset** button |
| Workspace tabs | under the header | switch between **Process Simulator** and **CPU Scheduling** |
| Process Explorer | left | process hierarchy tree, selection, **+ Create** button |
| Process State Machine | centre | SVG diagram of the 5 states and 6 transitions; highlights the selected process's current state and its currently legal outgoing edges; animates a token while a transition runs |
| Inspector (PCB viewer) | right | the selected process's PCB, split into Overview / Cpu / Memory tabs |
| Transition Controls | right, below the inspector | the six action buttons; enabled only when the backend says the action is legal |
| Process Table | bottom tab | flat table of all processes; clicking a row selects it |
| Event Timeline | bottom tab | timestamped log of creations, transitions, rejections, reset |
| CPU Scheduling workspace | second workspace tab | job table, algorithm choice, time quantum, run/compare buttons, animated lifecycle diagram, synchronized Gantt chart and metrics |
| Backend status badge | header | polls `GET /api/health` every 30 s: *connected* / *disconnected* / *checking* |

The **Dashboard** owns the shared simulator state (process list, events,
selection) and hands it to the other components as props. Individual components
still call the API for their own narrow job — the creation form posts a process,
the transition controls fetch valid actions and post an action, the scheduling
workspace posts jobs — and report results back to the Dashboard so everything
re-renders from one source.

The scheduling workspace has a separate local playback clock and a derived event
timeline. Scheduler job IDs and reconstructed states are presentation data only;
they are never inserted into the simulator's PID table or event log.

## 4. Process states and PCB fields

### The five states

| State | Meaning in the simulation |
|-------|---------------------------|
| NEW | just created, not yet admitted |
| READY | admitted and waiting in the ready queue |
| RUNNING | dispatched — "holding the CPU" in the simulation |
| BLOCKED | waiting for simulated I/O |
| TERMINATED | finished; no outgoing transitions exist |

### The six legal transitions

| From → To | Action button | OS meaning |
|-----------|---------------|------------|
| NEW → READY | **Admit** | admission/scheduling into the ready queue |
| READY → RUNNING | **Dispatch** | the scheduler picked it |
| RUNNING → READY | **Preempt** | time slice expired / higher-priority arrival |
| RUNNING → BLOCKED | **Block** | it requested I/O |
| BLOCKED → READY | **Wake** | I/O completed |
| RUNNING → TERMINATED | **Terminate** | it exited |

Anything else is rejected: the state does not change, the event log gets a
`REJECTED` entry, and the response explains why, for example
`DISPATCH requires state READY, but P1 is NEW; valid actions now: ADMIT`.

### The PCB fields

| Field | Value shown | Notes |
|-------|-------------|-------|
| PID | 1, 2, 3, … | assigned by a counter, never reused until reset |
| name | user-entered | |
| state | one of the five | the only mutable field that matters here |
| priority | 0–100 | stored on the PCB; *not* consumed by the scheduler |
| parent PID | PID or null | `0` internally, `null` in API responses |
| program counter | `0x........` | **simulated**, random at creation |
| CPU registers | AX, BX, CX, DX | **simulated**, random 0–255 at creation |
| memory base / limit | `0x........` | **simulated**, random at creation |
| creation time | `HH:MM:SS` | wall-clock time when it was created |
| children | list of PIDs | derived from the hierarchy |

The rule to remember for a viva: *every PCB value except PID, name, state,
priority, parent, and creation time is a random educational placeholder.* The
program counter never advances because there is no instruction interpreter.

## 5. How the scheduling algorithms work

Jobs are plain rows: `job_id`, `name`, `arrival_time`, `burst_time`,
`priority`. The CPU starts idle at time 0. Tie-breaking is deterministic: FCFS
uses arrival then request order; SJF uses burst, arrival, then request order;
Priority uses descending priority, arrival, then request order; Round Robin
starts and adds arrivals in arrival/request order.

- **FCFS** — among jobs that have arrived, take the one with the earliest
  arrival time; run it to completion (non-preemptive). If nobody has arrived,
  the timeline records idle time until the first arrival.
- **SJF (non-preemptive)** — among arrived jobs, take the shortest burst; run
  it to completion. Classic SJF minimises average waiting time but can starve
  long jobs.
- **Priority (non-preemptive)** — among arrived jobs, take the highest priority
  number (**higher value = higher priority**, 0–100) and run it to completion.
- **Round Robin** — a FIFO ready queue and a fixed **time quantum**. Each job
  runs for at most the quantum; if it still has burst left it goes to the back
  of the queue. Jobs that arrive during a slice are queued *before* the sliced
  job is re-queued, which is the usual textbook ordering.

The Gantt chart is the algorithm's timeline: one block per uninterrupted run,
plus gray **IDLE** blocks when no job can run. In the web workspace, an animated
token follows the existing state diagram edge for admission, dispatch, Round
Robin preemption, or completion while the Gantt playhead advances on the same
simulation clock. The right-side controls support play/pause, restart, event
stepping, arbitrary seeking, and 0.5×–4× speed. Seeking reconstructs the state
at the selected time instead of replaying prior changes. BLOCKED and WAKE remain
visible diagram concepts but the current scheduler has no I/O events to animate.

## 6. Waiting, turnaround, and response time

For a job with arrival `A`, burst `B`, first start `F`, completion `C`:

| Metric | Formula | Plain-English meaning |
|--------|---------|-----------------------|
| Turnaround time | `C − A` | total time the job spent in the system |
| Waiting time | `(C − A) − B` | time it sat ready but not running |
| Response time | `F − A` | delay before it ran **for the first time** |

Example: arrival 2, burst 4, first start 5, completion 9
→ turnaround `9−2 = 7`, waiting `7−4 = 3`, response `5−2 = 3`.

Averages are the arithmetic mean over all jobs. These definitions are the
standard textbook ones; note that turnaround and waiting are related only for
non-preemptive runs with no blocking, which is what this simulator models.

## 7. What is simulated versus what a real OS does

| This project does | A real OS does |
|-------------------|----------------|
| keeps processes in a Python dictionary | keeps task structs in kernel memory |
| moves states only when *you* click a button | moves states on interrupts, syscalls, I/O completion |
| assigns random program counters and registers | saves and restores real CPU registers on context switch |
| "runs" a schedule by arithmetic on burst times | actually executes instructions, counts cycles |
| blocks a process by changing a field | puts a task on a wait queue and re-schedules |
| logs events to an in-memory list | logs to kernel trace buffers / journals |
| stores everything in memory, lost on exit | persists process tables across reboots |
| several processes may be marked RUNNING at once (no single-CPU enforcement) | typically one task per CPU core at a time |
| no context switches are performed | performs real context switches with save/restore cost |

The scheduling workspace is even more abstract: it never interacts with the
simulated processes at all. It answers *"if these jobs arrived and these were
their bursts, what would each algorithm produce?"*

## 8. Important design decisions and limitations

**Decisions**

1. **Separation of concerns** — UI, API, controller, and models are separate
   layers; the GUI never assigns `process.state` directly.
2. **Single mutation path** — every state change goes through
   `StateManager.transition`, so validity rules exist in exactly one set.
3. **Rejections are HTTP 200 with `success: false`** — a rejected transition is
   a legitimate answer from a simulation, not a protocol failure; reserving
   4xx/5xx for malformed requests keeps the client code simple.
4. **PIDs are never recycled** — reused identifiers would make logs ambiguous.
5. **Scheduling is a pure function** — `run_schedule(jobs, algorithm, quantum)`
   has no side effects, which is what makes it trivially testable.
6. **Deterministic tie-breaks** — equal arrivals/priorities/bursts resolve by
   input order, so results are reproducible during a demo.
7. **In-memory state, no database** — the whole point is to be inspectable and
   dependency-light.

**Limitations (be honest about these)**

- No real processes, threads, syscalls, context-switch cost, or CPU time.
- The simulator does **not** enforce a single RUNNING process.
- SJF and Priority are non-preemptive; only Round Robin slices.
- Simulator priorities and scheduler priorities are **not linked** — they are
  separate demonstrations.
- State is in memory: restarting the API clears everything.
- Rejected transitions do not consume the CPU or advance any clock; there is no
  global simulation time.
- No IPC, synchronization, paging, virtual memory, authentication, or
  networking beyond localhost CORS.
- Frontend has no automated tests (type check + production build instead).

## 9. Short presentation script (~2 minutes)

> "This project simulates how an operating system manages processes.
>
> On the left is the process explorer: I create a process, it gets a unique PID
> and starts in the NEW state with a full PCB — name, priority, parent, program
> counter, registers, and memory fields. All of those values are simulated.
>
> In the centre is the state machine with the five textbook states. Only the six
> legal transitions are possible: admit, dispatch, preempt, block, wake,
> terminate. The buttons are enabled only when the backend says an action is
> legal, and if a transition is rejected anyway the log explains exactly why and
> the state does not change.
>
> On the right is the PCB inspector, and at the bottom the process table and the
> timestamped event log. Everything the UI does goes through one controller, so
> the rules live in one place.
>
> The second tab is the CPU scheduling lab. I enter jobs with an arrival time, a
> burst, and a priority, then run FCFS, SJF, Priority, or Round Robin — or
> compare all four at once. I can watch the jobs travel through the lifecycle
> diagram while the Gantt playhead follows the same clock. I can pause, step
> between event times, seek, and compare waiting, turnaround, and response times
> for the complete schedule.
>
> Importantly, scheduling is completely separate from the simulator: it
> calculates results from my inputs and never changes a simulated process's
> state. Nothing here touches real OS processes — it is a safe, repeatable
> teaching tool, verified by 147 automated tests."

## 10. Likely viva questions

**Q: What is a PCB?**
A: The Process Control Block — the kernel's data structure holding everything it
knows about one process: identifiers, state, priority, parent, program counter,
registers, memory bounds. Our `PCB` dataclass mirrors those fields with
simulated values.

**Q: Why five states? Where is the "blocked" state used?**
A: It is the standard five-state model. BLOCKED represents a process waiting for
I/O; BLOCK moves RUNNING → BLOCKED and WAKE moves BLOCKED → READY, so a process
must be re-dispatched after waking.

**Q: Why is TERMINATED kept in the table?**
A: So the log and hierarchy stay inspectable after exit. TERMINATED has no
outgoing transitions; only a reset removes processes.

**Q: Why never reuse a PID?**
A: Reused identifiers make logs and parent links ambiguous — the same "P3"
meaning two different processes. PIDs restart only on reset.

**Q: What happens when I click a disabled transition button?**
A: You can't — the UI enables only actions from `GET .../valid-actions`. If the
state changes between that check and the click, the API rejects it with a
reason, the state stays put, and a `REJECTED` entry is logged.

**Q: FCFS vs SJF vs Priority vs Round Robin — when is each bad?**
A: FCFS suffers convoy effects (long job blocks short ones); SJF can starve long
jobs and needs burst estimates; Priority can starve low-priority jobs; Round
Robin gives fast response but wastes time on very short jobs through extra
switches.

**Q: Why is higher priority a bigger number here?**
A: A convention choice, documented in the API response
(`priority_convention`) and shown in the UI, so nobody misreads the result.

**Q: How is waiting time calculated?**
A: `turnaround − burst`, where `turnaround = completion − arrival`. Response
time is `first start − arrival`.

**Q: Does running a schedule affect the processes on the left?**
A: No. Scheduling takes its own job list, is a pure function, and returns
metrics. It shares no state with the simulator.

**Q: Why does a rejected transition return HTTP 200?**
A: Because it is a valid application-level answer (`success: false` plus a
message), not a client or server fault. 4xx is reserved for malformed requests
(validation) or a missing process (404).

**Q: What happens if the backend is not running?**
A: The header badge turns red ("Backend disconnected"), panels show load
errors, and no state changes are possible until the API is reachable.

**Q: Why FastAPI and not Flask/Django?**
A: Pydantic models give request validation and OpenAPI documentation for free,
async routes suit the small in-memory app, and it keeps dependencies minimal.

**Q: How do you know it works?**
A: The repository contains 147 tests over PCB creation, PID uniqueness, every
valid and invalid transition, hierarchy rules, event logging, reset, scheduling
metrics for all four algorithms, and HTTP behavior. In the current audit
environment, 102 non-API tests pass; synchronous API tests hang inside the
Starlette/AnyIO `TestClient` portal before endpoint handling. An async ASGI smoke
check passed, but it does not replace the API test suite. See [TESTING.md](TESTING.md)
for exact commands and results.

**Q: What would you add next?**
A: Natural extensions: a preemptive SJF/Priority variant, linking PCB priority
to the scheduler, persisting state, or a per-process timeline view — each is
additive because the layers are already separated.

**Q: Is anything here real?**
A: No. Real OS process control requires kernel syscalls and privileges. This is
a model that reproduces the *rules* and *terminology* of process management, not
its mechanism.
