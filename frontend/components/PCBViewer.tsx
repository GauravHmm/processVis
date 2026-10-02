"use client";

import { PCBResponse } from "@/types/api";
import { getProcessStateConfig } from "@/lib/processState";

interface PCBViewerProps {
  process: PCBResponse | null;
}

export function PCBViewer({ process }: PCBViewerProps) {
  if (!process) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="mt-4 text-base-content/60">No Process Selected</p>
        <p className="mt-1 text-xs text-base-content/40">Select a process from the Process Table or Process Hierarchy to inspect its PCB</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h4 className="card-title text-sm font-medium text-base-content/80 mb-3">Process Identity</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-base-content/60 w-36 flex-shrink-0">PID</dt>
              <dd className="font-mono text-base-content break-all">P{process.pid}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-base-content/60 w-36 flex-shrink-0">Process Name</dt>
              <dd className="font-mono text-base-content break-all">{process.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-base-content/60 w-36 flex-shrink-0">State</dt>
              <dd className="font-mono text-base-content break-all">
                <span className={`badge ${getProcessStateConfig(process.state).badge}`}>
                  {process.state}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-base-content/60 w-36 flex-shrink-0">Priority</dt>
              <dd className="font-mono text-base-content break-all">{process.priority}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-base-content/60 w-36 flex-shrink-0">Parent PID</dt>
              <dd className="font-mono text-base-content break-all">{process.parent_pid === null ? "None" : `P${process.parent_pid}`}</dd>
            </div>
            {process.children.length > 0 && (
              <div className="flex justify-between">
                <dt className="text-base-content/60 w-36 flex-shrink-0">Children</dt>
                <dd className="font-mono text-base-content break-all">{process.children.map(c => `P${c}`).join(", ")}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h4 className="card-title text-sm font-medium text-base-content/80 mb-3">Execution</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-base-content/60 w-36 flex-shrink-0">Program Counter</dt>
              <dd className="font-mono text-base-content break-all">{process.program_counter}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h4 className="card-title text-sm font-medium text-base-content/80 mb-3">CPU Registers</h4>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full text-sm" role="table">
              <thead>
                <tr className="text-left text-xs font-medium text-base-content/60 uppercase tracking-wider">
                  <th className="pb-2 px-3">Register</th>
                  <th className="pb-2 px-3 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300">
                {Object.entries(process.cpu_registers).map(([name, value]) => (
                  <tr key={name} className="hover:bg-base-200/50">
                    <td className="py-1.5 px-3 font-mono text-base-content/60">{name}</td>
                    <td className="py-1.5 px-3 text-right font-mono text-base-content">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h4 className="card-title text-sm font-medium text-base-content/80 mb-3">Memory</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-base-content/60 w-36 flex-shrink-0">Memory Base</dt>
              <dd className="font-mono text-base-content break-all">{process.memory_base}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-base-content/60 w-36 flex-shrink-0">Memory Limit</dt>
              <dd className="font-mono text-base-content break-all">{process.memory_limit}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h4 className="card-title text-sm font-medium text-base-content/80 mb-3">Metadata</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-base-content/60 w-36 flex-shrink-0">Creation Time</dt>
              <dd className="font-mono text-base-content break-all">{process.creation_time}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
