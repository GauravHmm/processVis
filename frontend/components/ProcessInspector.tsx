"use client";

import { useState } from "react";
import type { PCBResponse } from "@/types/api";
import { getProcessStateConfig } from "@/lib/processState";

interface ProcessInspectorProps {
  process: PCBResponse | null;
}

type InspectorTab = "overview" | "cpu" | "memory";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-2 border-b border-base-300/70 py-1.5 last:border-0"><dt className="ui-label">{label}</dt><dd className="ui-value max-w-[65%] break-all text-right font-mono">{children}</dd></div>;
}

export function ProcessInspector({ process }: ProcessInspectorProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>("overview");

  if (!process) {
    return <div className="ui-meta py-4">No process selected. Select one from the explorer or table.</div>;
  }

  const stateConfig = getProcessStateConfig(process.state);
  return (
    <div className="pt-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0"><h2 className="ui-panel-title truncate"><span className="font-mono">P{process.pid}</span> {process.name}</h2><p className="ui-meta">Selected process</p></div>
        <span className={`badge badge-sm ${stateConfig.badge}`}>{process.state}</span>
      </div>
      <div className="tabs tabs-boxed mb-2 h-7 w-full bg-base-200 p-0.5" role="tablist" aria-label="Process inspector tabs">
        {(["overview", "cpu", "memory"] as InspectorTab[]).map((tab) => <button key={tab} role="tab" aria-selected={activeTab === tab} className={`tab h-7 min-h-0 flex-1 px-1 text-xs font-medium capitalize ${activeTab === tab ? "tab-active" : ""}`} onClick={() => setActiveTab(tab)}>{tab}</button>)}
      </div>
      <dl className="rounded border border-base-300 bg-base-200/60 px-2">
        {activeTab === "overview" && <>
          <Row label="PID">P{process.pid}</Row><Row label="Process name">{process.name}</Row><Row label="State">{process.state}</Row><Row label="Priority">{process.priority}</Row><Row label="Parent PID">{process.parent_pid === null ? "Root" : `P${process.parent_pid}`}</Row><Row label="Children">{process.children.length ? process.children.map((pid) => `P${pid}`).join(", ") : "None"}</Row><Row label="Created">{process.creation_time}</Row>
        </>}
        {activeTab === "cpu" && <>
          <Row label="Program counter">{process.program_counter}</Row>
          {Object.entries(process.cpu_registers).map(([name, value]) => <Row key={name} label={name}>{value}</Row>)}
        </>}
        {activeTab === "memory" && <>
          <Row label="Memory base">{process.memory_base}</Row><Row label="Memory limit">{process.memory_limit}</Row>
        </>}
      </dl>
    </div>
  );
}
