"use client";

import { useState, FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import type { PCBResponse } from "@/types/api";

interface ProcessCreationFormProps {
  processes: PCBResponse[];
  onCreated?: () => void;
}

export function ProcessCreationForm({ processes, onCreated }: ProcessCreationFormProps) {
  const [name, setName] = useState("");
  const [priority, setPriority] = useState("");
  const [parentPid, setParentPid] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const isValidName = trimmedName.length > 0;
  const parsedPriority = parseInt(priority, 10);
  const isValidPriority = priority === "" || (!isNaN(parsedPriority) && parsedPriority >= 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValidName || !isValidPriority || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await api.createProcess({
        name: trimmedName,
        priority: isNaN(parsedPriority) ? 0 : parsedPriority,
        parent_pid: parentPid ?? 0,
      });
      setName("");
      setPriority("");
      setParentPid(null);
      onCreated?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to create process");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const parentOptions = [
    { pid: null, label: "None (root process)" },
    ...processes.map((p) => ({ pid: p.pid, label: `P${p.pid} — ${p.name}` })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-rose-500/10 border border-rose-500/30 p-3 text-sm text-rose-300" role="alert">
          {error}
        </div>
      )}

      <div className="rounded-lg bg-zinc-800/50 p-4 border border-zinc-700">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="process-name" className="block text-xs text-zinc-500 mb-1">
              Process Name
            </label>
            <input
              id="process-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="P1"
              className={`w-full px-3 py-2 text-sm bg-zinc-900 border rounded-md text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                name && !isValidName ? "border-rose-500" : "border-zinc-700"
              }`}
              disabled={isSubmitting}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="process-priority" className="block text-xs text-zinc-500 mb-1">
              Priority
            </label>
            <input
              id="process-priority"
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              placeholder="0"
              min="0"
              className={`w-full px-3 py-2 text-sm bg-zinc-900 border rounded-md text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                priority && !isValidPriority ? "border-rose-500" : "border-zinc-700"
              }`}
              disabled={isSubmitting}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="process-parent" className="block text-xs text-zinc-500 mb-1">
              Parent Process (optional)
            </label>
            <select
              id="process-parent"
              value={parentPid ?? ""}
              onChange={(e) => setParentPid(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              disabled={isSubmitting}
            >
              {parentOptions.map((opt) => (
                <option key={opt.pid ?? "root"} value={opt.pid ?? ""}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500">
              Processes cannot be their own parent. Backend will reject invalid hierarchies.
            </p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="w-full px-4 py-2.5 text-sm font-medium text-zinc-900 bg-amber-500 rounded-md hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        disabled={isSubmitting || !isValidName || !isValidPriority}
      >
        {isSubmitting ? "Creating…" : "Create Process"}
      </button>
    </form>
  );
}