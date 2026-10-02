"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface TransitionControlsProps {
  pid: number | null;
  processState: string | null;
  onTransition: () => Promise<void> | void;
  onActionStart?: (action: string) => void;
  onActionEnd?: () => void;
  onValidActions?: (actions: string[]) => void;
}

const ACTIONS = [
  ["ADMIT", "Admit"], ["DISPATCH", "Dispatch"], ["PREEMPT", "Preempt"],
  ["BLOCK", "Block"], ["WAKE", "Wake"], ["TERMINATE", "Terminate"],
] as const;
const DEMO_TRANSITION_MS = 1200;

export function TransitionControls({ pid, processState, onTransition, onActionStart, onActionEnd, onValidActions }: TransitionControlsProps) {
  const [validActions, setValidActions] = useState<string[]>([]);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setValidActions([]);
      onValidActions?.([]);
      if (!pid) return;
      try {
        setError(null);
        const response = await api.getValidActions(pid);
        if (!cancelled) {
          setValidActions(response.actions);
          onValidActions?.(response.actions);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.detail : "Failed to load valid actions");
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [pid, processState, onValidActions]);

  const executeAction = async (action: string) => {
    if (!pid || executingAction) return;
    setExecutingAction(action);
    setError(null);
    onActionStart?.(action);
    try {
      const startedAt = Date.now();
      const calls: Record<string, (processPid: number) => Promise<unknown>> = {
        ADMIT: api.admitProcess, DISPATCH: api.dispatchProcess, PREEMPT: api.preemptProcess,
        BLOCK: api.blockProcess, WAKE: api.wakeProcess, TERMINATE: api.terminateProcess,
      };
      await calls[action](pid);
      const remaining = DEMO_TRANSITION_MS - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      await onTransition();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : `Failed to execute ${action}`);
    } finally {
      setExecutingAction(null);
      onActionEnd?.();
    }
  };

  if (!pid) return <p className="ui-meta">Select a process to enable transitions.</p>;

  return (
    <div>
      {error && <div className="alert alert-error mb-2 px-2 py-1 text-xs" role="alert">{error}</div>}
      <div className="mb-2 flex items-center justify-between">
        <span className="ui-label">Current state</span>
        <span className="ui-value font-mono">{processState ?? "—"}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {ACTIONS.map(([action, label]) => {
          const isValid = validActions.includes(action);
          const isExecuting = executingAction === action;
          return <button key={action} type="button" disabled={!isValid || executingAction !== null} onClick={() => void executeAction(action)} className={`btn btn-sm min-h-9 h-9 justify-start px-2 text-sm font-medium ${isValid ? "btn-primary" : "btn-ghost text-base-content/65"}`}>
            {isExecuting && <span className="loading loading-spinner loading-xs" />}
            <span>{isExecuting ? "Executing…" : label}</span>
          </button>;
        })}
      </div>
    </div>
  );
}
