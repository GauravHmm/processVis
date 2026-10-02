"use client";

import { PCBResponse } from "@/types/api";
import { getProcessStateConfig, STATE_ORDER } from "@/lib/processState";

interface StateVisualizerProps {
  processes: PCBResponse[];
  selectedPid: number | null;
}

export function StateVisualizer({ processes, selectedPid }: StateVisualizerProps) {
  const selectedProcess = processes.find((p) => p.pid === selectedPid);
  const currentState = selectedProcess?.state as "NEW" | "READY" | "RUNNING" | "BLOCKED" | "TERMINATED" | undefined;

  if (!selectedPid || !selectedProcess) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-base-200">
          <svg
            className="h-8 w-8 text-base-content/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <p className="mt-4 text-base-content/60">Select a process to view its state</p>
        <p className="mt-1 text-xs text-base-content/40">Click a process in the table or hierarchy</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-4 w-full">
        {STATE_ORDER.map((state) => {
          const config = getProcessStateConfig(state);
          const isCurrent = state === currentState;
          const isReachable = isCurrent || (
            (currentState === "NEW" && state === "READY") ||
            (currentState === "READY" && state === "RUNNING") ||
            (currentState === "RUNNING" && ["READY", "BLOCKED", "TERMINATED"].includes(state)) ||
            (currentState === "BLOCKED" && state === "READY")
          );

          return (
            <div key={state} className="w-full flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-36 h-14 rounded-lg border-2 font-semibold text-sm transition-all ${
                  isCurrent
                    ? `bg-${config.statusColor}-500/20 border-${config.statusColor}-500 text-${config.statusColor}-400 shadow-lg shadow-${config.statusColor}-500/30 ring-2 ring-${config.statusColor}-500/50`
                    : `bg-base-200 border-base-300 text-base-content/50 opacity-60`
                }`}
                role="status"
                aria-current={isCurrent ? "true" : undefined}
              >
                {config.label}
                {isCurrent && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-xs">
                    ●
                  </span>
                )}
              </div>
              {state !== "TERMINATED" && (
                <div className="flex items-center justify-center w-1 h-6">
                  <div className={`w-0.5 h-full ${isCurrent || isReachable ? `bg-${getProcessStateConfig(currentState || "NEW").statusColor}-500` : "bg-base-300"}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card bg-base-100 border border-base-300 w-full max-w-xs">
        <div className="card-body">
          <h4 className="card-title text-sm font-medium text-base-content/80 mb-3">Process Info</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-base-content/60">PID</dt>
              <dd className="font-mono text-base-content">P{selectedProcess.pid}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-base-content/60">Name</dt>
              <dd className="text-base-content truncate max-w-[140px]">{selectedProcess.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-base-content/60">Current State</dt>
              <dd className={`font-medium ${getProcessStateConfig(selectedProcess.state).text}`}>
                <span className={`badge ${getProcessStateConfig(selectedProcess.state).badge}`}>
                  {selectedProcess.state}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-base-content/60">Priority</dt>
              <dd className="font-mono text-base-content/60">{selectedProcess.priority}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}