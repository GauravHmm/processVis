"use client";

import type { PCBResponse } from "@/types/api";
import { ProcessHierarchy } from "./ProcessHierarchy";

interface ProcessExplorerProps {
  processes: PCBResponse[];
  selectedPid: number | null;
  onSelect: (pid: number) => void;
  onCreate: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function ProcessExplorer({ processes, selectedPid, onSelect, onCreate, isLoading = false, error }: ProcessExplorerProps) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between border-b border-base-300 px-3 py-2">
        <div>
          <h2 className="ui-panel-title">Process Explorer</h2>
          <p className="ui-meta">{processes.length} simulated process{processes.length === 1 ? "" : "es"}</p>
        </div>
        <button type="button" className="btn btn-primary btn-xs gap-1" onClick={onCreate}>
          <span className="text-sm leading-none">+</span> Create
        </button>
      </div>
      <div className="px-2 py-2">
        <div className="ui-section-label mb-1 px-2">Hierarchy</div>
        <ProcessHierarchy processes={processes} selectedPid={selectedPid} onSelect={onSelect} isLoading={isLoading} error={error} />
      </div>
      <div className="ui-meta border-t border-base-300 px-3 py-2">
        Select a process to inspect its PCB and available transitions.
      </div>
    </div>
  );
}
