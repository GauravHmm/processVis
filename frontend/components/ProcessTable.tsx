"use client";

import { PCBResponse } from "@/types/api";
import { getProcessStateConfig } from "@/lib/processState";

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
  const formatParent = (parentPid: number | null, allProcesses: PCBResponse[]) => {
    if (parentPid === null) return "Root";
    const parent = allProcesses.find((p) => p.pid === parentPid);
    return parent ? `P${parent.pid} — ${parent.name}` : `P${parentPid}`;
  };

  const formatTime = (timeStr: string) => {
    return timeStr;
  };

  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full text-sm" role="table" aria-busy="true">
          <thead>
            <tr className="ui-table-header text-left uppercase tracking-wide">
              <th className="pb-3 px-4">PID</th>
              <th className="pb-3 px-4">Name</th>
              <th className="pb-3 px-4">State</th>
              <th className="pb-3 px-4">Priority</th>
              <th className="pb-3 px-4">Parent</th>
              <th className="pb-3 px-4">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base-300">
            <tr>
              <td className="ui-meta py-4 px-4 text-center" colSpan={6}>
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
      <div className="alert alert-error" role="alert">
        <svg className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2" /></svg>
        <span>{error}</span>
      </div>
    );
  }

  if (processes.length === 0) {
    return (
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full text-sm" role="table">
          <thead>
            <tr className="ui-table-header text-left uppercase tracking-wide">
              <th className="pb-3 px-4">PID</th>
              <th className="pb-3 px-4">Name</th>
              <th className="pb-3 px-4">State</th>
              <th className="pb-3 px-4">Priority</th>
              <th className="pb-3 px-4">Parent</th>
              <th className="pb-3 px-4">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base-300">
            <tr>
              <td className="ui-meta py-8 px-4 text-center font-mono" colSpan={6}>
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
      <table className="table table-zebra w-full text-sm" role="table">
        <thead>
          <tr className="ui-table-header text-left uppercase tracking-wide">
            <th className="pb-3 px-4">PID</th>
            <th className="pb-3 px-4">Name</th>
            <th className="pb-3 px-4">State</th>
            <th className="pb-3 px-4">Priority</th>
            <th className="pb-3 px-4">Parent</th>
            <th className="pb-3 px-4">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-base-300">
          {processes.map((proc) => (
            <tr
              key={proc.pid}
              onClick={() => onSelect(proc.pid)}
              className={`cursor-pointer transition-colors ${
                proc.pid === selectedPid
                  ? "bg-primary/10"
                  : "hover:bg-base-200/50"
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
              <td className="py-2.5 px-4 font-mono font-medium text-base-content/80">
                P{proc.pid}
              </td>
              <td className="ui-body py-2.5 px-4 font-medium">{proc.name}</td>
              <td className="py-3 px-4">
                <span className={`badge ${getProcessStateConfig(proc.state).badge}`}>
                  {proc.state}
                </span>
              </td>
              <td className="ui-value py-2.5 px-4 font-mono">{proc.priority}</td>
              <td className="ui-label py-2.5 px-4 font-mono">
                {formatParent(proc.parent_pid, processes)}
              </td>
              <td className="ui-label py-2.5 px-4 font-mono">{formatTime(proc.creation_time)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
