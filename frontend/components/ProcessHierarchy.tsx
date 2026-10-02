"use client";

import { useMemo } from "react";
import { PCBResponse } from "@/types/api";

interface TreeNodeProps {
  pid: number;
  name: string;
  depth: number;
  isSelected: boolean;
  onSelect: (pid: number) => void;
  children: TreeNodeProps[];
  processNameMap: Map<number, string>;
}

function TreeNode({
  pid,
  name,
  depth,
  isSelected,
  onSelect,
  children,
  processNameMap,
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
            ? "bg-amber-500/20 text-amber-300"
            : "hover:bg-zinc-800/50 text-zinc-200"
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {hasChildren && (
          <span className="text-zinc-500 select-none" aria-hidden="true">
            ▼
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-sm text-zinc-400">P{pid}</span>
          <span className="text-sm">{displayName}</span>
        </span>
      </div>
      {hasChildren && (
        <div
          role="group"
          aria-label={`Children of P${pid}`}
          className="border-l border-zinc-800 ml-4"
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

    const buildTree = (parentPid: number, depth: number): TreeNodeProps[] => {
      const children = tree[String(parentPid)] ?? [];
      return children.map((pid) => ({
        pid,
        name: processNameMap.get(pid) ?? `P${pid}`,
        depth,
        isSelected: selectedPid === pid,
        onSelect,
        children: buildTree(pid, depth + 1),
        processNameMap,
      }));
    };

    return rootPids.map((pid) => ({
      pid,
      name: processNameMap.get(pid) ?? `P${pid}`,
      depth: 0,
      isSelected: selectedPid === pid,
      onSelect,
      children: buildTree(pid, 1),
      processNameMap,
    }));
  }, [processes, selectedPid, onSelect, processNameMap, tree]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        Loading process hierarchy…
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
      <div className="flex flex-col items-center justify-center h-64 text-center">
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
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <p className="mt-4 text-zinc-400">No processes — create a process to build the hierarchy</p>
      </div>
    );
  }

  const allPids = new Set(processes.map((p) => p.pid));
  const rootPids = processes
    .filter((p) => p.parent_pid === null || !allPids.has(p.parent_pid ?? 0))
    .map((p) => p.pid);

  if (rootPids.length === 0 && processes.length > 0) {
    return (
      <div className="flex items-center justify-center h-64 text-center">
        <p className="text-zinc-500">Unable to determine root processes</p>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto" role="tree" aria-label="Process hierarchy">
      {rootNodes.map((node) => (
        <TreeNode key={node.pid} {...node} />
      ))}
    </div>
  );
}