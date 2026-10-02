"use client";

import { PCBResponse } from "@/types/api";

const STATE_CONFIG = {
  NEW: { label: "NEW", color: "bg-emerald-500", border: "border-emerald-500", bg: "bg-emerald-500/20", text: "text-emerald-400" },
  READY: { label: "READY", color: "bg-blue-500", border: "border-blue-500", bg: "bg-blue-500/20", text: "text-blue-400" },
  RUNNING: { label: "RUNNING", color: "bg-amber-500", border: "border-amber-500", bg: "bg-amber-500/20", text: "text-amber-400" },
  BLOCKED: { label: "BLOCKED", color: "bg-rose-500", border: "border-rose-500", bg: "bg-rose-500/20", text: "text-rose-400" },
  TERMINATED: { label: "TERMINATED", color: "bg-violet-500", border: "border-violet-500", bg: "bg-violet-500/20", text: "text-violet-400" },
} as const;

type StateKey = keyof typeof STATE_CONFIG;

const STATE_ORDER: StateKey[] = ["NEW", "READY", "RUNNING", "BLOCKED", "TERMINATED"];

interface StateVisualizerProps {
  processes: PCBResponse[];
  selectedPid: number | null;
}

export function StateVisualizer({ processes, selectedPid }: StateVisualizerProps) {
  const selectedProcess = processes.find((p) => p.pid === selectedPid);
  const currentState = selectedProcess?.state as StateKey | undefined;

  if (!selectedPid || !selectedProcess) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-zinc-800/50">
          <svg
            className="h-8 w-8 text-zinc-500"
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
        <p className="mt-4 text-zinc-400">Select a process to view its state</p>
        <p className="mt-1 text-xs text-zinc-500">Click a process in the table or hierarchy</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-4 w-full">
        {STATE_ORDER.map((state) => {
          const config = STATE_CONFIG[state];
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
                    ? `${config.bg} ${config.border} ${config.text} shadow-lg shadow-${config.color.replace("bg-", "")}/30 ring-2 ring-${config.color.replace("bg-", "")}/50`
                    : `${config.bg} ${config.border} ${config.text} opacity-60`
                }`}
                role="status"
                aria-current={isCurrent ? "true" : undefined}
              >
                {config.label}
                {isCurrent && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs">
                    ●
                  </span>
                )}
              </div>
              {state !== "TERMINATED" && (
                <div className="flex items-center justify-center w-1 h-6">
                  <div className={`w-0.5 h-full ${isCurrent || isReachable ? config.color : "bg-zinc-700"}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg bg-zinc-800/50 p-4 border border-zinc-700 w-full max-w-xs">
        <h4 className="text-sm font-medium text-zinc-300 mb-3">Process Info</h4>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">PID</dt>
            <dd className="font-mono text-zinc-100">P{selectedProcess.pid}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Name</dt>
            <dd className="text-zinc-100 truncate max-w-[140px]">{selectedProcess.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Current State</dt>
            <dd className={`font-medium ${STATE_CONFIG[currentState as StateKey]?.text ?? "text-zinc-100"}`}>
              {selectedProcess.state}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Priority</dt>
            <dd className="font-mono text-zinc-400">{selectedProcess.priority}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}