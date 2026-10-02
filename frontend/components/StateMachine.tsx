"use client";

import { PCBResponse } from "@/types/api";
import { STATE_ORDER, getProcessStateConfig as getStateConfig } from "@/lib/processState";

interface StateMachineProps {
  processes: PCBResponse[];
  selectedPid: number | null;
}

export function StateMachine({ processes, selectedPid }: StateMachineProps) {
  const selectedProcess = processes.find((p) => p.pid === selectedPid);
  const currentState = selectedProcess?.state as "NEW" | "READY" | "RUNNING" | "BLOCKED" | "TERMINATED" | undefined;

  if (!selectedPid || !selectedProcess) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-base-200">
          <svg
            className="h-7 w-7 text-base-content/40"
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
        <p className="mt-3 text-sm text-base-content/60">Select a process to view its state</p>
        <p className="mt-1 text-xs text-base-content/40">Click a process in the explorer or table</p>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 border border-base-300 flex-shrink-0">
      <div className="card-header px-3 py-2 border-b border-base-300">
        <h2 className="card-title text-sm font-medium text-base-content">Process State Machine</h2>
      </div>
      <div className="card-body p-3">
        <div className="flex flex-col items-center gap-3">
          {STATE_ORDER.map((state) => {
            const config = getStateConfig(state);
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
                  className={`flex items-center justify-center w-28 h-10 rounded-lg border-2 font-medium text-xs transition-all ${
                    isCurrent
                      ? `bg-${config.statusColor}-500/20 border-${config.statusColor}-500 text-${config.statusColor}-400 shadow-lg shadow-${config.statusColor}-500/30 ring-2 ring-${config.statusColor}-500/50`
                      : `bg-base-200 border-base-300 text-base-content/50 opacity-60`
                  }`}
                  role="status"
                  aria-current={isCurrent ? "true" : undefined}
                >
                  {config.label}
                  {isCurrent && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-[10px]">
                      ●
                    </span>
                  )}
                </div>
                {state !== "TERMINATED" && (
                  <div className="flex items-center justify-center w-0.5 h-4">
                    <div className={`w-0.5 h-full ${isCurrent || isReachable ? `bg-${getStateConfig(currentState || "NEW").statusColor}-500` : "bg-base-300"}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Current Process Summary - compact */}
        <div className="mt-3 p-2 bg-base-200/50 rounded-lg border border-base-300">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className={`badge ${getStateConfig(selectedProcess.state).badge}`}>
                {selectedProcess.state}
              </span>
              <span className="font-mono text-base-content">P{selectedProcess.pid}</span>
              <span className="text-base-content/60">{selectedProcess.name}</span>
            </div>
            <span className="font-mono text-base-content/60">Pri: {selectedProcess.priority}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
