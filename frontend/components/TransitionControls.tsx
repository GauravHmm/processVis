"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface TransitionControlsProps {
  pid: number | null;
  processState: string | null;
  onTransition: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  ADMIT: "Admit",
  DISPATCH: "Dispatch",
  PREEMPT: "Preempt",
  BLOCK: "Block",
  WAKE: "Wake",
  TERMINATE: "Terminate",
};

const ACTION_ORDER = ["ADMIT", "DISPATCH", "PREEMPT", "BLOCK", "WAKE", "TERMINATE"];

export function TransitionControls({ pid, processState, onTransition }: TransitionControlsProps) {
  const [validActions, setValidActions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadValidActions = async () => {
    if (!pid) return;
    try {
      setError(null);
      const response = await api.getValidActions(pid);
      setValidActions(response.actions);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to load valid actions");
      }
    }
  };

  useEffect(() => {
    loadValidActions();
  }, [pid, processState]);

  const executeAction = async (action: string) => {
    if (!pid) return;
    setExecutingAction(action);
    setError(null);
    try {
      switch (action) {
        case "ADMIT":
          await api.admitProcess(pid);
          break;
        case "DISPATCH":
          await api.dispatchProcess(pid);
          break;
        case "PREEMPT":
          await api.preemptProcess(pid);
          break;
        case "BLOCK":
          await api.blockProcess(pid);
          break;
        case "WAKE":
          await api.wakeProcess(pid);
          break;
        case "TERMINATE":
          await api.terminateProcess(pid);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      onTransition();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError(`Failed to execute ${action}`);
      }
    } finally {
      setExecutingAction(null);
    }
  };

  const isExecuting = executingAction !== null;

  if (!pid) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-zinc-800/50 p-4 border border-zinc-700 text-center text-zinc-500">
          Select a process to view transition controls
        </div>
      </div>
    );
  }

  const displayActions = ACTION_ORDER.filter((a) => validActions.includes(a));

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-rose-500/10 border border-rose-500/30 p-3 text-sm text-rose-300" role="alert">
          {error}
        </div>
      )}

      <div className="rounded-lg bg-zinc-800/50 p-4 border border-zinc-700">
        <h4 className="text-sm font-medium text-zinc-300 mb-3">Current State Actions</h4>
        {displayActions.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center">
            No valid transitions from current state
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {displayActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => executeAction(action)}
                disabled={isExecuting}
                className={`px-4 py-2.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                  isExecuting
                    ? "opacity-50 cursor-wait bg-zinc-700 text-zinc-400"
                    : "bg-zinc-700 text-zinc-100 hover:bg-zinc-600 focus:ring-amber-500"
                }`}
              >
                {executingAction === action ? "Executing…" : ACTION_LABELS[action] ?? action}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg bg-zinc-800/50 p-4 border border-zinc-700">
        <h4 className="text-sm font-medium text-zinc-300 mb-3">All Actions</h4>
        <div className="grid gap-2 sm:grid-cols-3 text-xs">
          {ACTION_ORDER.map((action) => (
            <div
              key={action}
              className={`flex items-center justify-between px-3 py-2 rounded border ${
                validActions.includes(action)
                  ? "bg-zinc-700 text-zinc-100 border-zinc-600"
                  : "bg-zinc-800 text-zinc-500 border-zinc-700"
              }`}
            >
              <span>{ACTION_LABELS[action] ?? action}</span>
              <span
                className={`font-mono px-2 py-0.5 rounded text-[10px] ${
                  validActions.includes(action)
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/20 text-rose-400"
                }`}
              >
                {validActions.includes(action) ? "ENABLED" : "DISABLED"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}