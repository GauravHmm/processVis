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
| Frontend | No test runner; verification is `pnpm lint` (`tsc --noEmit` + unused-code checks) + `pnpm build` |

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
  animation) — no GUI verification was run in this final audit.
- React/TypeScript components and `lib/` helpers — no frontend test framework exists.
- CORS behaviour, `/openapi.json` shape, and HTTP behaviour under concurrency.
- Frontend behaviour (health badge polling, rejection-message rendering, error
  normalisation, scheduling animation) — no frontend component/browser test runner exists;
  type-checking/build do not verify rendered motion.

---

## 3. Commands executed and verified results

Final audit run on **14 Oct 2026** in the repository environment (Python 3.12.3, pytest
8.4.2, Node 24.18.0, pnpm 12.4.2). Results below describe this run, not historical runs.

### 3.1 Backend

| Command | Actual result |
|---|---|
| `venv/bin/python -m pytest tests/ --collect-only -q` | 147 tests collected in 0.30 s; two Starlette/AnyIO deprecation warnings |
| `venv/bin/python -m pytest tests/test_process.py tests/test_process_manager.py tests/test_state_manager.py tests/test_controller.py tests/test_hierarchy.py tests/test_scheduling.py -q` | **102 passed in 0.07 s** |
| `venv/bin/python -m pytest tests/test_scheduling.py -q` | **10 passed in 0.01 s** |
| `timeout 25s venv/bin/python -m pytest tests/test_api.py -x -q` | timed out, exit 124, on the first health test |
| `timeout 25s venv/bin/python -m pytest tests/ -q` | timed out, exit 124, before completion; API health test is first |
| Timed faulthandler run of the first API test | confirmed the test thread waits in Starlette `TestClient`/AnyIO portal; portal thread sits in asyncio selector; app endpoint is not reached |

An async `httpx.AsyncClient` using `ASGITransport(app=app)` successfully checked health,
Round Robin schedule intervals, comparison results for all four algorithms, and that a
scheduling request leaves an existing process in `NEW`. This smoke check is **not** the
45-test synchronous API suite and is not reported as such. See §5.1.

### 3.2 Frontend and repository checks

| Command | Actual result |
|---|---|
| `cd frontend && pnpm lint` | passed, exit 0 (`tsc --noEmit`, no diagnostics) |
| `cd frontend && pnpm build` inside the sandbox | failed because Next could not spawn Node for TypeScript (`EPERM`, empty captured `--showConfig`) |
| `cd frontend && pnpm build` with approved subprocess permissions | passed: Next.js 16.3.5 compiled, type checked, generated 3 static pages, routes `/` and `/_not-found` |
| Direct Node smoke of `schedulingPlayback.ts` | passed: RR boundary order (`ADMIT`, `PREEMPT`, `DISPATCH`), exact-quantum termination, seek suppression, and final terminated snapshot; this is not an SVG/browser test |
| `git diff --check` | run at the end of the documentation/source review; see final report for status |

The first build failure was a sandbox subprocess restriction, not a TypeScript diagnostic;
the same documented build completed once subprocess execution was allowed. `pnpm lint` is
the type gate; the repository has no separate ESLint script/configuration.

### 3.3 Browser verification

No Chromium/Chrome executable or installed Playwright package was found. The lifecycle
token was **not** visually verified in this audit. Use the manual procedure in §4.5 before
demonstrating continuous motion.

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
pnpm lint             # tsc --noEmit with noUnusedLocals/noUnusedParameters (exit 0)
pnpm build            # types + production bundle (exit 0)
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

For scheduling playback in the browser:

1. Open **CPU Scheduling**, run FCFS, SJF, Priority, and Round Robin, then compare all four
   on the same job list. Switch comparison tabs and confirm each result starts at time zero.
2. Use a Round Robin quantum smaller than at least one burst. At 1×, watch an unfinished
   job travel along RUNNING → READY before it is dispatched again.
3. Include a burst exactly divisible by the quantum. Its final interval must animate
   RUNNING → TERMINATED, with no final PREEMPT. Also check an arrival at a quantum boundary
   and a CPU idle interval before the first arrival.
4. Pause during motion, resume, seek forward/backward, restart, and change speed. Confirm the
   diagram labels, Gantt playhead/highlight, event explanation, and clock agree; seeking must
   not replay past transitions.
5. Create/transition a process in the Process Simulator before and after playback. Verify
   scheduler playback does not alter its row or event log.
6. Enable reduced motion and confirm edge highlighting plus the static transition indicator
   remain clear.

The Tkinter `Dashboard` was instantiated headlessly in this environment (create a process,
read it back, destroy the window) and ran successfully, confirming the desktop entry point
works; it has no automated test coverage.

---

## 5. Known issues and caveats

### 5.1 Synchronous API test hang

The hang reproduces in the final audit environment. The targeted health test and full test
suite both time out on their first API request. A timed faulthandler trace showed the test
thread waiting in `concurrent.futures.Future.result()` through AnyIO
`run_sync_from_thread` and Starlette `TestClient.handle_request`, while the portal thread
waits in the asyncio selector. The call stack remains at
`tests/test_api.py::TestAPIHealth::test_health_check`; the endpoint is not reached.

`api/main.py` has no lifespan handler, startup hook, background task, or network request.
The installed stack is FastAPI 0.141.1, Starlette 1.6.0, httpx 0.28.1, and AnyIO 4.15.1.
Collection also emits deprecation warnings for Starlette's httpx/TestClient integration and
AnyIO's `BlockingPortal` alias. The exact compatibility or environment trigger is unresolved;
no speculative API or startup changes were made.

The established alternative is an `httpx.AsyncClient` with
`httpx.ASGITransport(app=app)`. During this audit it verified `/api/health`, a Round Robin
schedule, comparison results for all four algorithms, and that scheduling left an existing
simulated process in `NEW`. This targeted smoke check is useful API evidence, but **does not
replace or count as passing** the 45 synchronous API tests.

The same in-process check can be repeated without starting a server:

```bash
venv/bin/python - <<'PY'
import asyncio
import httpx
from api.main import app
from api.routes import reset_controller

async def main():
    reset_controller()
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        assert (await client.get("/api/health")).json() == {"status": "ok"}
        await client.post("/api/processes", json={"name": "Existing"})
        response = await client.post("/api/scheduling/run", json={
            "algorithm": "ROUND_ROBIN", "time_quantum": 2,
            "jobs": [
                {"job_id": "a", "name": "A", "arrival_time": 0,
                 "burst_time": 3, "priority": 5},
                {"job_id": "b", "name": "B", "arrival_time": 1,
                 "burst_time": 1, "priority": 9},
            ],
        })
        assert response.status_code == 200
        state = await client.get("/api/processes/1")
        assert state.json()["state"] == "NEW"

asyncio.run(main())
PY
```

To retest after the environment changes, use a bounded command:

```bash
timeout 25s venv/bin/python -m pytest tests/test_api.py -x -q
```

### 5.2 `pnpm lint` — now functional

`pnpm lint` in `frontend/package.json` now runs `tsc --noEmit` with `noUnusedLocals` and
`noUnusedParameters` enabled, replacing the removed `next lint` subcommand. It passes with
exit code 0 and no diagnostics. See [TECHNICAL_DOCUMENTATION.md §6.5](TECHNICAL_DOCUMENTATION.md)
for full detail.

### 5.3 Warnings in the passing suite

Two warnings are produced by installed dependencies, not by project code:

- `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated;
  install httpx2 instead` (from `fastapi/testclient.py`).
- `DeprecationWarning: The anyio.abc.BlockingPortal alias is deprecated …` (from
  `starlette/testclient.py`).

The precise hang cause remains unresolved (§5.1); these warnings alone do not establish its
cause.

### 5.4 Behavioural assertions worth knowing when writing tests

- Rejected transitions are **HTTP 200** with `success: false` (only unknown PIDs are 404).
  The `message` now includes a human-readable reason and the currently valid actions, e.g.
  `DISPATCH requires state READY, but P1 is NEW; valid actions now: ADMIT`. Tests should
  assert that `message` is a non-empty string; do not pin the full sentence.
- `get_valid_actions` for `RUNNING` has unspecified ordering — compare with `set(...)`.
- `GET /api/process-tree` keys arrive as **strings** in JSON.
- API tests must account for the shared singleton: use the provided `reset_state` fixture
  (already `autouse` in `test_api.py`) or call `api.routes.reset_controller()`.
- Scheduling tests should assert timeline segments as `(job_id, start, end)` tuples; the
  engine is deterministic, so exact equality is safe.
- Validation errors on `POST /api/processes` are `422` with a **list-shaped** `detail`
  (FastAPI's `HTTPValidationError`), not the string `detail` used for `400` errors.

---

## 6. Adding tests

| Target | Location | Conventions in this repo |
|---|---|---|
| Pure logic (`process/`, `core/`, `scheduling/`) | New `tests/test_<module>.py` | Plain `def test_...` functions or `class TestX:` groupings; import directly from the package (`from scheduling.engine import JobInput, run_schedule`); use `pytest.raises(ValueError)` for invalid inputs |
| HTTP surface | `tests/test_api.py` | Module-level `client = TestClient(app)`; rely on the autouse `reset_state` fixture; assert status code *and* body fields |
| Frontend | — | Not established; would require adding a runner (e.g. Vitest) to `frontend/package.json` |

After adding tests, re-run the full suite and the frontend checks, then keep the counts in
[README.md](../README.md), this file, and
[TECHNICAL_DOCUMENTATION.md](TECHNICAL_DOCUMENTATION.md) in sync:

```bash
source venv/bin/activate
python -m pytest tests/ -v
cd frontend && pnpm lint && pnpm build
```
