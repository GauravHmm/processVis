"use client";

import { PCBResponse } from "@/types/api";

const STATE_BADGES: Record<string, string> = {
  NEW: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  READY: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  RUNNING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  BLOCKED: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  TERMINATED: "bg-violet-500/20 text-violet-400 border-violet-500/30",
};

interface ProcessTableProps {
  processes: PCBResponse[];
  selectedPid: number | null;
  onSelect: (pid: number) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function ProcessTable({
  processes,
  selectedPid,
  onSelect,
  isLoading = false,
  error,
}: ProcessTableProps) {
  const getStateBadgeClass = (state: string) =>
    STATE_BADGES[state] ?? "bg-zinc-700 text-zinc-300 border-zinc-600";

  const formatParent = (parentPid: number | null, allProcesses: PCBResponse[]) => {
    if (parentPid === null) return "Root";
    const parent = allProcesses.find((p) => p.pid === parentPid);
    return parent ? `P${parent.pid} — ${parent.name}` : `P${parentPid}`;
  };

  const formatTime = (timeStr: string) => {
    // Backend returns HH:MM:SS format
    return timeStr;
  };

  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table" aria-busy="true">
          <thead>
            <tr className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
              <th className="pb-3 px-4">PID</th>
              <th className="pb-3 px-4">Name</th>
              <th className="pb-3 px-4">State</th>
              <th className="pb-3 px-4">Priority</th>
              <th className="pb-3 px-4">Parent</th>
              <th className="pb-3 px-4">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            <tr>
              <td className="py-4 px-4 text-center text-zinc-500" colSpan={6}>
                Loading processes…
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-300" role="alert">
        {error}
      </div>
    );
  }

  if (processes.length === 0) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
              <th className="pb-3 px-4">PID</th>
              <th className="pb-3 px-4">Name</th>
              <th className="pb-3 px-4">State</th>
              <th className="pb-3 px-4">Priority</th>
              <th className="pb-3 px-4">Parent</th>
              <th className="pb-3 px-4">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            <tr>
              <td className="py-8 px-4 text-center text-zinc-500 font-mono" colSpan={6}>
                No processes — create a process to populate the table
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table">
        <thead>
          <tr className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
            <th className="pb-3 px-4">PID</th>
            <th className="pb-3 px-4">Name</th>
            <th className="pb-3 px-4">State</th>
            <th className="pb-3 px-4">Priority</th>
            <th className="pb-3 px-4">Parent</th>
            <th className="pb-3 px-4">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {processes.map((proc) => (
            <tr
              key={proc.pid}
              onClick={() => onSelect(proc.pid)}
              className={`cursor-pointer transition-colors ${
                proc.pid === selectedPid
                  ? "bg-amber-500/10"
                  : "hover:bg-zinc-800/50"
              }`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(proc.pid);
                }
              }}
              aria-selected={proc.pid === selectedPid}
            >
              <td className="py-3 px-4 font-mono text-zinc-300">
                P{proc.pid}
              </td>
              <td className="py-3 px-4 text-zinc-100 font-medium">{proc.name}</td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStateBadgeClass(proc.state)}`}
                >
                  {proc.state}
                </span>
              </td>
              <td className="py-3 px-4 text-zinc-400 font-mono">{proc.priority}</td>
              <td className="py-3 px-4 text-zinc-400 font-mono">
                {formatParent(proc.parent_pid, processes)}
              </td>
              <td className="py-3 px-4 text-zinc-500 font-mono">{formatTime(proc.creation_time)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}