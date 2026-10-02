"use client";

import { useMemo } from "react";
import { PCBResponse } from "@/types/api";
import { getProcessStateConfig } from "@/lib/processState";

interface TreeNodeProps {
  pid: number;
  name: string;
  depth: number;
  isSelected: boolean;
  onSelect: (pid: number) => void;
  children: TreeNodeProps[];
  processNameMap: Map<number, string>;
  processState: string;
}

function TreeNode({
  pid,
  name,
  depth,
  isSelected,
  onSelect,
  children,
  processNameMap,
  processState,
}: TreeNodeProps) {
  const displayName = processNameMap.get(pid) ?? name;
  const hasChildren = children.length > 0;

  return (
    <div className="select-none">
      <div
        role="treeitem"
        aria-selected={isSelected}
        aria-level={depth + 1}
        aria-expanded={hasChildren}
        tabIndex={0}
        onClick={() => onSelect(pid)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(pid);
          }
        }}
        className={`flex items-center gap-1 py-1 px-2 rounded transition-colors ${
          isSelected
            ? "bg-primary/20 text-primary"
            : "hover:bg-base-200/50 text-base-content"
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {hasChildren && (
          <span className="text-base-content/60 select-none" aria-hidden="true">
            ▼
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-sm font-medium text-base-content/75">P{pid}</span>
          <span className="ui-body">{displayName}</span>
          <span className={`badge badge-xs ${getProcessStateConfig(processState).badge}`}>
            {processState}
          </span>
        </span>
      </div>
      {hasChildren && (
        <div
          role="group"
          aria-label={`Children of P${pid}`}
          className="border-l border-base-300 ml-4"
        >
          {children.map((child) => (
            <TreeNode key={child.pid} {...child} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ProcessHierarchyProps {
  processes: PCBResponse[];
  selectedPid: number | null;
  onSelect: (pid: number) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function ProcessHierarchy({
  processes,
  selectedPid,
  onSelect,
  isLoading = false,
  error,
}: ProcessHierarchyProps) {
  const processNameMap = useMemo(
    () => new Map(processes.map((p) => [p.pid, p.name])),
    [processes]
  );
  const processByPid = useMemo(
    () => new Map(processes.map((process) => [process.pid, process])),
    [processes]
  );

  const tree = useMemo(
    () =>
      processes.reduce((acc, proc) => {
        const parentKey = String(proc.parent_pid ?? 0);
        if (!acc[parentKey]) acc[parentKey] = [];
        acc[parentKey].push(proc.pid);
        return acc;
      }, {} as Record<string, number[]>),
    [processes]
  );

  const rootNodes = useMemo(() => {
    const allPids = new Set(processes.map((p) => p.pid));
    const rootPids = processes
      .filter((p) => p.parent_pid === null || !allPids.has(p.parent_pid ?? 0))
      .map((p) => p.pid);

    const visited = new Set<number>();
    const buildTree = (parentPid: number, depth: number): TreeNodeProps[] => {
      const children = tree[String(parentPid)] ?? [];
      return children.flatMap((pid) => {
        if (visited.has(pid)) return [];
        visited.add(pid);
        const process = processByPid.get(pid);
        return [{
          pid,
          name: processNameMap.get(pid) ?? `P${pid}`,
          depth,
          isSelected: selectedPid === pid,
          onSelect,
          children: buildTree(pid, depth + 1),
          processNameMap,
          processState: process?.state ?? "UNKNOWN",
        }];
      });
    };

    const roots = rootPids.flatMap((pid) => {
      if (visited.has(pid)) return [];
      visited.add(pid);
      const process = processByPid.get(pid);
      return [{
        pid,
        name: processNameMap.get(pid) ?? `P${pid}`,
        depth: 0,
        isSelected: selectedPid === pid,
        onSelect,
        children: buildTree(pid, 1),
        processNameMap,
        processState: process?.state ?? "UNKNOWN",
      }];
    });

    // Keep malformed/cyclic data visible instead of silently dropping it.
    for (const process of processes) {
      if (!visited.has(process.pid)) {
        visited.add(process.pid);
        roots.push({
          pid: process.pid,
          name: process.name,
          depth: 0,
          isSelected: selectedPid === process.pid,
          onSelect,
          children: buildTree(process.pid, 1),
          processNameMap,
          processState: process.state,
        });
      }
    }
    return roots;
  }, [processes, selectedPid, onSelect, processNameMap, processByPid, tree]);

  if (isLoading) {
    return (
      <div className="flex min-h-24 items-center justify-center px-2 py-5 text-center ui-meta">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error" role="alert">
        <svg className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2" /></svg>
        <span>{error}</span>
      </div>
    );
  }

  if (processes.length === 0) {
    return (
      <div className="flex min-h-24 flex-col items-center justify-center px-2 py-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-base-200">
          <svg
            className="h-6 w-6 text-base-content/55"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <p className="ui-body mt-4">No processes — create a process to build the hierarchy</p>
      </div>
    );
  }

  if (rootNodes.length === 0 && processes.length > 0) {
    return (
      <div className="flex items-center justify-center px-2 py-5 text-center text-xs">
        <p className="ui-meta">Unable to determine root processes</p>
      </div>
    );
  }

  return (
    <div className="max-h-[calc(100vh-180px)] overflow-y-auto" role="tree" aria-label="Process hierarchy">
      {rootNodes.map((node) => (
        <TreeNode key={node.pid} {...node} />
      ))}
    </div>
  );
}
