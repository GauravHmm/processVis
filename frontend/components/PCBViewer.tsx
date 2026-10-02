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

interface PCBViewerProps {
  process: PCBResponse | null;
}

function StateBadge({ state }: { state: string }) {
  const config = STATE_CONFIG[state as StateKey] ?? { bg: "bg-zinc-700", text: "text-zinc-400", border: "border-zinc-600" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      {state}
    </span>
  );
}

function FieldRow({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-baseline gap-3 ${className}`}>
      <dt className="text-zinc-500 w-36 flex-shrink-0">{label}</dt>
      <dd className="font-mono text-zinc-100 break-all">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-zinc-800/50 p-4 border border-zinc-700">
      <h4 className="text-sm font-medium text-zinc-300 mb-3">{title}</h4>
      <dl className="space-y-2 text-sm">{children}</dl>
    </div>
  );
}

function RegistersTable({ registers }: { registers: Record<string, number> }) {
  if (!registers || Object.keys(registers).length === 0) {
    return <p className="text-zinc-500 text-sm">No register data</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table">
        <thead>
          <tr className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
            <th className="pb-2 px-3">Register</th>
            <th className="pb-2 px-3 text-right">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {Object.entries(registers).map(([name, value]) => (
            <tr key={name} className="hover:bg-zinc-800/50">
              <td className="py-1.5 px-3 font-mono text-zinc-400">{name}</td>
              <td className="py-1.5 px-3 text-right font-mono text-zinc-100">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PCBViewer({ process }: PCBViewerProps) {
  if (!process) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="mt-4 text-zinc-400">No Process Selected</p>
        <p className="mt-1 text-xs text-zinc-500">Select a process from the Process Table or Process Hierarchy to inspect its PCB</p>
      </div>
    );
  }

  const parentDisplay = process.parent_pid === null ? "None" : `P${process.parent_pid}`;

  return (
    <div className="space-y-4">
      <Section title="Process Identity">
        <FieldRow label="PID" value={`P${process.pid}`} />
        <FieldRow label="Process Name" value={process.name} />
        <FieldRow label="State" value={<StateBadge state={process.state} />} />
        <FieldRow label="Priority" value={process.priority.toString()} />
        <FieldRow label="Parent PID" value={parentDisplay} />
        {process.children.length > 0 && (
          <FieldRow label="Children" value={process.children.map(c => `P${c}`).join(", ")} />
        )}
      </Section>

      <Section title="Execution">
        <FieldRow label="Program Counter" value={process.program_counter} />
      </Section>

      <Section title="CPU Registers">
        <RegistersTable registers={process.cpu_registers} />
      </Section>

      <Section title="Memory">
        <FieldRow label="Memory Base" value={process.memory_base} />
        <FieldRow label="Memory Limit" value={process.memory_limit} />
      </Section>

      <Section title="Metadata">
        <FieldRow label="Creation Time" value={process.creation_time} />
      </Section>
    </div>
  );
}