# Testing Guide — Process Creation and State Transition Visualizer

This document describes the automated test suite, the exact commands used to verify the
project, their verified results, and known issues. Architecture and API details live in
[TECHNICAL_DOCUMENTATION.md](TECHNICAL_DOCUMENTATION.md); the quick start lives in
[README.md](../README.md).

---

## 1. Test stack and discovery

| Item | Value |
|---|---|
| Framework | `pytest` (declared `pytest>=7.0,<9.0`; installed 8.4.2) |
| HTTP layer testing | `fastapi.testclient.TestClient` (Starlette) backed by `httpx` (0.28.1) |
| Configuration files | **None** — no `pytest.ini`, `pyproject.toml`, or `conftest.py`; pytest discovers `tests/` from the repository root |
| Test package | `tests/__init__.py` (empty) makes the suite an importable package |
| Isolation | `tests/test_api.py` uses an `autouse` fixture calling `api.routes.reset_controller()` before and after every test, so the API singleton starts empty per test |
| Frontend | No test runner; verification is `tsc --noEmit` + `next build` |

Run everything from the repository root with the virtual environment active:

```bash
source venv/bin/activate
python -m pytest tests/ -v
```

---

## 2. Test inventory

| File | Tests | Coverage |
|---|---:|---|
| `tests/test_process.py` | 11 | **PCB creation**: defaults (`state=NEW`, `priority=0`, `parent_pid=0`), priority, parent PID, creation time, simulated registers `AX/BX/CX/DX`, memory base/limit, `to_dict()`. **Process**: creation, properties, state setter, `repr`. |
| `tests/test_process_manager.py` | 9 | Creation, PID uniqueness, sequential PIDs (1, 2, 3), lookup of existing/missing PIDs, list-all, `remove_process`, `clear()` (table + PID counter back to 1), PID not recycled after removal. |
| `tests/test_state_manager.py` | 22 | All six valid transitions (`ADMIT`, `DISPATCH`, `PREEMPT`, `BLOCK`, `TERMINATE`, `WAKE`) including resulting state; seven invalid-transition tests leaving state unchanged; TERMINATED rejects all six actions; `get_valid_actions` for every state (RUNNING compared as a set because order is unspecified); `can_transition` true/false; unknown action label rejected. |
| `tests/test_controller.py` | 22 | **EventLogger (5)**: log with timestamp, multiple entries, clear, add/remove listener. **Controller (17)**: create, unique PIDs, six transition methods, invalid transition rejected with state preserved, terminated lock-out, event content (`CREATED`, `NEW -> READY`, `REJECTED`), `get_valid_actions` (present/absent), reset (clears processes, logs `RESET`), listener notification, full lifecycle. |
| `tests/test_hierarchy.py` | 28 | **ProcessManager (19)**: root and child creation, `parent_pid` stored, single/multiple/nested children, `get_parent` (child/root/missing), `get_children` (children/empty/missing), `get_process_tree`, children survive parent termination, reset clears hierarchy, self-parent rejected, nonexistent parent rejected, removal unlinks from parent but preserves grandchildren. **Controller (9)**: same rules via the controller plus hierarchy event logging (`parent: P1`). |
| `tests/test_scheduling.py` | 10 | FCFS with an idle gap and full metric verification; FCFS equal-arrival input-order tie; SJF shortest-first plus input-order tie; Priority highest-first, stable tie, `priority_convention` text; Round Robin slicing with an arrival during a slice (timeline, per-job and average metrics); Round Robin idle start; four parametrised invalid-input cases (empty jobs, duplicate `job_id`, missing quantum, zero quantum) raising `ValueError`. |
| `tests/test_api.py` | 45 | **Health (2)**, **creation (7)**: root 201 with `parent_pid: null`, child with parent, unique PIDs, 400 nonexistent parent, 400 self-parent, 422 empty name, 422 negative priority. **Scheduling (8)**: SJF run returns timeline with `IDLE` segment, metrics, and *does not change existing process state*; compare returns all four algorithms with expected timelines; six parametrised 422 cases. **Retrieval (3)**, **hierarchy (5)** incl. nested tree with stringified keys, **valid-actions (6)** for all five states plus 404, **transitions (9)**: all six succeed with correct `from_state`/`to_state`, invalid transition returns `success:false` with state unchanged, terminated process rejects every action, 404 for unknown PID. **Events (2)**, **reset (2)** (clears processes/tree, logs `RESET`, restarts PID counter at 1), **full lifecycle (1)**. |

**Total: 147 tests** — 45 + 22 + 28 + 11 + 9 + 10 + 22.

### What is *not* covered

- `gui/` Tkinter modules (dashboard, state canvas, PCB viewer, table, tree, theme,
  animation) — verified manually (see §4.5).
- React/TypeScript components and `lib/` helpers — no frontend test framework exists.
- CORS behaviour, `/openapi.json` shape, and HTTP behaviour under concurrency.
- `pnpm lint` (currently non-functional, see §5.2).

---

## 3. Commands executed and verified results

All commands were run on the working tree on **13 Oct 2026** (Python 3.12.3, pytest 8.4.2,
Node 24.18.0, pnpm 12.4.2).

### 3.1 Backend — full suite

```bash
venv/bin/python -m pytest tests/ -v
```

```
=============================== warnings summary ========================
.../fastapi/testclient.py:1 StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.
.../starlette/testclient.py:53 DeprecationWarning: The anyio.abc.BlockingPortal alias is deprecated, use anyio.from_thread.BlockingPortal instead.
======================= 147 passed, 2 warnings in 0.60s ========================
```

Re-run in quiet mode: `147 passed, 2 warnings in 0.55s`. No failures, no skips, no errors.
`.pytest_cache/v/cache/lastfailed` is empty (`{}`).

### 3.2 Backend — per-file runs

| Command | Result |
|---|---|
| `venv/bin/python -m pytest tests/test_api.py -q` | `45 passed, 2 warnings in 0.46s` |
| `venv/bin/python -m pytest tests/test_controller.py -q` | `22 passed in 0.01s` |
| `venv/bin/python -m pytest tests/test_hierarchy.py -q` | `28 passed in 0.02s` |
| `venv/bin/python -m pytest tests/test_process.py -q` | `11 passed in 0.01s` |
| `venv/bin/python -m pytest tests/test_process_manager.py -q` | `9 passed in 0.01s` |
| `venv/bin/python -m pytest tests/test_scheduling.py -q` | `10 passed in 0.01s` |
| `venv/bin/python -m pytest tests/test_state_manager.py -q` | `22 passed in 0.02s` |
| `venv/bin/python -m pytest` (no arguments, root discovery) | `147 passed, 2 warnings in 0.55s` |
| `venv/bin/python -m pytest tests/ --collect-only -q` | `147 tests collected in 0.31s` |

Each file also ran standalone with a 60 s shell timeout and completed in well under a
second — in particular `tests/test_api.py`, the module historically reported as hanging
(see §5.1).

### 3.3 Frontend — type check, build, dev server

| Command | Result |
|---|---|
| `cd frontend && pnpm exec tsc --noEmit` | exit code **0**, no diagnostics |
| `cd frontend && pnpm build` | exit code **0**: Next.js 16.3.5 (Turbopack), `✓ Compiled successfully`, `Running TypeScript … Finished`, `Generating static pages … (3/3)`, routes `/` and `/_not-found` |
| `cd frontend && pnpm dev` then `GET http://localhost:3000/` | server ready in 242 ms, HTTP **200** |
| `cd frontend && pnpm lint` | **fails**, exit code 1 (see §5.2) |

Build/dev output also prints an informational warning: *Next.js ignored pnpm-lock.yaml in
/home/lenovowsl because it is outside the current Git repository* (a stray lockfile in the
workspace home directory, unrelated to `frontend/pnpm-lock.yaml`).

### 3.4 Backend — live API smoke test

Started `venv/bin/uvicorn api.main:app --host 127.0.0.1 --port 8000` and exercised the API
with `curl`:

| Request | Verified response |
|---|---|
| `GET /api/health` | `200 {"status":"ok"}` |
| `GET /` | `200 {"name":"…API","version":"1.0.0","docs":"/docs","redoc":"/redoc"}` |
| `POST /api/processes` `{"name":"Shell","priority":5}` | `201` full `PCBResponse`, `parent_pid: null`, `children: []` |
| `POST /api/processes` `{"name":"Worker","parent_pid":1}` | `201`, `parent_pid: 1` |
| `GET /api/processes` | both processes; parent shows `"children":[2]` |
| `GET /api/processes/1/valid-actions` | `{"pid":1,"actions":["ADMIT"]}` |
| `POST /api/processes/1/admit` | `{"success":true,"action":"ADMIT","from_state":"NEW","to_state":"READY"}` |
| `POST /api/processes/2/dispatch` (from NEW) | `200 {"success":false,…,"message":"DISPATCH"}` + `REJECTED` event |
| `GET /api/processes/999` | `404 {"detail":"Process P999 not found"}` |
| `POST /api/processes` with `parent_pid: 3` (self) | `400 {"detail":"A process cannot be its own parent"}` |
| `POST /api/processes` with `{"name":""}` | `422` with list-shaped `detail` |
| `GET /api/process-tree` | `{"tree":{"1":[2],"2":[]}}` |
| `GET /api/events` | four timestamped entries (2× CREATED, 1× `NEW -> READY`, 1× `REJECTED`) |
| `POST /api/scheduling/run` (FCFS) | full metrics/timeline, averages `1.5 / 5.0 / 1.5` |
| `POST /api/scheduling/run` (ROUND_ROBIN, quantum 2) | timeline `a 0–2, b 2–4, a 4–6, a 6–7` |
| `POST /api/scheduling/run` (RR without quantum) | `422` |
| `POST /api/scheduling/compare` | `200` |
| `OPTIONS` preflight from `http://localhost:3000` | `200`, `access-control-allow-origin: http://localhost:3000` |
| `OPTIONS` preflight from `http://evil.example` | `400 Disallowed CORS origin` |

The server was shut down after the smoke test; no application code was modified.

---

## 4. How to run specific checks

### 4.1 One test file

```bash
source venv/bin/activate
python -m pytest tests/test_scheduling.py -v
```

### 4.2 One test / keyword filter

```bash
python -m pytest tests/test_api.py -k "scheduling" -v
python -m pytest tests/test_state_manager.py::TestStateManager::test_valid_actions_running -v
```

### 4.3 Stop at the first failure

```bash
python -m pytest tests/ -x -q
```

### 4.4 Frontend checks

```bash
cd frontend
pnpm exec tsc --noEmit      # types only
pnpm build                  # types + production bundle
```

### 4.5 Manual checks that replace missing automation

```bash
# Tkinter desktop app (requires a display)
python main.py

# Live API (then click through http://127.0.0.1:8000/docs)
source venv/bin/activate && uvicorn api.main:app --reload --port 8000

# Web client
cd frontend && pnpm dev     # http://localhost:3000
```

The Tkinter `Dashboard` was instantiated headlessly in this environment (create a process,
read it back, destroy the window) and ran successfully, confirming the desktop entry point
works; it has no automated test coverage.

---

## 5. Known issues and caveats

### 5.1 API test hang (previously reported) — not reproducible

A hang affecting `tests/test_api.py` was reported earlier in the project. Verification on
13 Oct 2026 found **no hang**:

- `python -m pytest tests/test_api.py -v` → `45 passed … in 0.46–0.50 s`
- `python -m pytest tests/ -v` → `147 passed … in 0.55–0.60 s` (repeated runs)
- `.pytest_cache/v/cache/lastfailed` is empty, i.e. no recorded failures

Relevant risk factors if it reappears (all observed, none currently causing failures):

1. **Client/stack skew.** The suite emits
   `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated;
   install httpx2 instead` and a DeprecationWarning about the anyio `BlockingPortal` alias.
   The `TestClient` runs the ASGI app through an anyio blocking portal; a mismatch between
   `starlette` (1.6.0), `httpx` (0.28.1), and `anyio` (4.15.1) is the most plausible cause
   of a blocked portal (a hang rather than an error).
2. **Strict warning filters break collection.**
   `python -m pytest tests/ -q -W error::DeprecationWarning` fails during collection of
   `tests/test_api.py` with `DeprecationWarning: The anyio.abc.BlockingPortal alias is
   deprecated …` — i.e. anyone adding `filterwarnings = error` (or running with that flag)
   will see `test_api.py` fail at import time. This is the closest observed relative of the
   reported "hang" and remains unresolved.
3. **Module-level `TestClient(app)`** in `tests/test_api.py` is constructed at import; if
   the environment ever changes to run the lifespan on import, that is where a stall would
   occur.

Recommended triage if the hang returns: run the module alone under a shell timeout to
confirm (`timeout 120 python -m pytest tests/test_api.py -v`), then compare installed
`starlette`/`httpx`/`anyio` versions against `requirements.txt`. No project source change is
required to reproduce the current passing behaviour.

### 5.2 `pnpm lint` is non-functional

```
$ pnpm lint
$ next lint
Invalid project directory provided, no such directory: .../frontend/lint
[ELIFECYCLE] Command failed with exit code 1.
```

Next.js 16 removed the `next lint` subcommand, so the script in `frontend/package.json`
fails. Use `pnpm exec tsc --noEmit` (verified passing) for the type gate.

### 5.3 Warnings in the passing suite

Two warnings are produced by installed dependencies, not by project code:

- `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated;
  install httpx2 instead` (from `fastapi/testclient.py`).
- `DeprecationWarning: The anyio.abc.BlockingPortal alias is deprecated …` (from
  `starlette/testclient.py`).

They do not affect results but make `-W error::DeprecationWarning` unusable (§5.1).

### 5.4 Behavioural assertions worth knowing when writing tests

- Rejected transitions are **HTTP 200** with `success: false` (only unknown PIDs are 404).
- `get_valid_actions` for `RUNNING` has unspecified ordering — compare with `set(...)`.
- `GET /api/process-tree` keys arrive as **strings** in JSON.
- API tests must account for the shared singleton: use the provided `reset_state` fixture
  (already `autouse` in `test_api.py`) or call `api.routes.reset_controller()`.
- Scheduling tests should assert timeline segments as `(job_id, start, end)` tuples; the
  engine is deterministic, so exact equality is safe.

---

## 6. Adding tests

| Target | Location | Conventions in this repo |
|---|---|---|
| Pure logic (`process/`, `core/`, `scheduling/`) | New `tests/test_<module>.py` | Plain `def test_...` functions or `class TestX:` groupings; import directly from the package (`from scheduling.engine import JobInput, run_schedule`); use `pytest.raises(ValueError)` for invalid inputs |
| HTTP surface | `tests/test_api.py` | Module-level `client = TestClient(app)`; rely on the autouse `reset_state` fixture; assert status code *and* body fields |
| Frontend | — | Not established; would require adding a runner (e.g. Vitest) to `frontend/package.json` |

After adding tests, re-run the full suite and keep the counts in
[README.md](../README.md), this file, and
[TECHNICAL_DOCUMENTATION.md](TECHNICAL_DOCUMENTATION.md) in sync:

```bash
source venv/bin/activate
python -m pytest tests/ -v
```
