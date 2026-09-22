"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { PCBResponse } from "@/types/api";
import { Panel } from "./Panel";
import { ProcessCreationForm } from "./ProcessCreationForm";
import { ProcessTable } from "./ProcessTable";

function PlaceholderPanel({ title, description }: { title: string; description: string }) {
  return (
    <Panel title={title} subtitle={description}>
      <div className="flex flex-col items-center justify-center h-48 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-800/50">
          <svg
            className="h-6 w-6 text-zinc-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        </div>
        <p className="mt-4 text-zinc-400">Coming in a later phase</p>
      </div>
    </Panel>
  );
}

function ProcessHierarchyPlaceholder() {
  return (
    <Panel title="Process Hierarchy" subtitle="Parent-child process tree with expand/collapse">
      <div className="font-mono text-sm text-zinc-400 space-y-1">
        <div className="flex items-center gap-1">
          <span className="text-zinc-500">├─</span>
          <span className="text-zinc-600">(empty)</span>
        </div>
        <p className="text-xs text-zinc-500 mt-4">
          Process tree will display here once processes are created
        </p>
      </div>
    </Panel>
  );
}

function StateVisualizerPlaceholder() {
  const states = [
    { id: "NEW", label: "NEW", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    { id: "READY", label: "READY", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    { id: "RUNNING", label: "RUNNING", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    { id: "BLOCKED", label: "BLOCKED", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
    { id: "TERMINATED", label: "TERMINATED", color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  ];

  return (
    <Panel title="Process State Machine" subtitle="Current process state and valid transitions">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {states.map((state) => (
            <div
              key={state.id}
              className={`px-4 py-2 rounded-lg border text-sm font-medium ${state.color}`}
            >
              {state.label}
            </div>
          ))}
        </div>
        <div className="text-center text-zinc-500">
          <p className="text-sm">Select a process to highlight its current state</p>
          <p className="text-xs mt-1">Valid transitions will be enabled based on state</p>
        </div>
        <div className="rounded-lg bg-zinc-800/50 p-4 border border-zinc-700">
          <p className="text-xs text-zinc-500 mb-2">Transition diagram (placeholder)</p>
          <div className="flex items-center justify-center h-32">
            <svg
              className="w-full max-w-md text-zinc-600"
              viewBox="0 0 400 200"
              fill="none"
              aria-hidden="true"
            >
              <path
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="4,4"
                d="M50,100 L150,100 M200,100 L300,100 M150,100 L150,50 M150,100 L150,150 M200,50 L200,150 M300,50 L300,150"
              />
              <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth="1" />
              <circle cx="250" cy="100" r="30" stroke="currentColor" strokeWidth="1" />
              <text x="100" y="105" textAnchor="middle" fontSize="10" fill="currentColor">NEW</text>
              <text x="250" y="105" textAnchor="middle" fontSize="10" fill="currentColor">READY</text>
            </svg>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function PCBViewerPlaceholder() {
  const sections = [
    { title: "Identity", fields: ["PID", "Name", "State", "Priority", "Parent PID", "Children"] },
    { title: "CPU", fields: ["Program Counter", "Registers (AX, BX, CX, DX)"] },
    { title: "Memory", fields: ["Base Address", "Limit", "Creation Time"] },
  ];

  return (
    <Panel title="Process Control Block" subtitle="Detailed PCB information for selected process">
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="rounded-lg bg-zinc-800/50 p-4 border border-zinc-700">
            <h4 className="text-sm font-medium text-zinc-300 mb-3">{section.title}</h4>
            <dl className="grid gap-2 sm:grid-cols-2 text-sm">
              {section.fields.map((field) => (
                <div key={field} className="flex justify-between">
                  <dt className="text-zinc-500">{field}</dt>
                  <dd className="text-zinc-400 font-mono">—</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
        <p className="text-xs text-zinc-500 text-center">
          Select a process from the table or tree to view its PCB
        </p>
      </div>
    </Panel>
  );
}

function EventLogPlaceholder() {
  return (
    <Panel title="Event Log" subtitle="Timestamped simulation events">
      <div className="font-mono text-xs space-y-1 max-h-64 overflow-y-auto">
        <div className="text-zinc-600">(no events yet)</div>
        <p className="text-zinc-500 mt-4 text-center">
          Events will appear here as processes are created and transition
        </p>
      </div>
    </Panel>
  );
}

export function Dashboard() {
  const [processes, setProcesses] = useState<PCBResponse[]>([]);
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProcesses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getProcesses();
      setProcesses(response.processes);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to load processes");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessCreated = () => {
    loadProcesses();
  };

  const handleSelectProcess = (pid: number) => {
    setSelectedPid(pid);
  };

  useEffect(() => {
    loadProcesses();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="space-y-6 lg:col-span-1">
            <Panel
              title="Process Creation"
              subtitle="Create new processes with name, priority, and optional parent"
            >
              <ProcessCreationForm
                processes={processes}
                onCreated={handleProcessCreated}
              />
            </Panel>
            <Panel
              title="Process Table"
              subtitle="All processes with PID, name, state, priority, and parent"
            >
              <ProcessTable
                processes={processes}
                selectedPid={selectedPid}
                onSelect={handleSelectProcess}
                isLoading={isLoading}
                error={error}
              />
            </Panel>
            <ProcessHierarchyPlaceholder />
          </div>
          <div className="space-y-6 lg:col-span-1">
            <StateVisualizerPlaceholder />
            <PCBViewerPlaceholder />
            <EventLogPlaceholder />
          </div>
        </div>
      </main>
    </div>
  );
}