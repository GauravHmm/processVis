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
        <div className="alert alert-error" role="alert">
          <svg className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2m-2 2l2 2" /></svg>
          <span>{error}</span>
        </div>
      )}

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Process Details</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="form-control">
            <label htmlFor="process-name" className="label">
              <span className="label-text">Process Name</span>
            </label>
            <input
              id="process-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="P1"
              className={`input input-bordered ${name && !isValidName ? "border-error" : ""}`}
              disabled={isSubmitting}
              autoComplete="off"
            />
          </div>
          <div className="form-control">
            <label htmlFor="process-priority" className="label">
              <span className="label-text">Priority</span>
            </label>
            <input
              id="process-priority"
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              placeholder="0"
              min="0"
              className={`input input-bordered ${priority && !isValidPriority ? "border-error" : ""}`}
              disabled={isSubmitting}
            />
          </div>
          <div className="form-control sm:col-span-2">
            <label htmlFor="process-parent" className="label">
              <span className="label-text">Parent Process (optional)</span>
            </label>
            <select
              id="process-parent"
              value={parentPid ?? ""}
              onChange={(e) => setParentPid(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="select select-bordered"
              disabled={isSubmitting}
            >
              {parentOptions.map((opt) => (
                <option key={opt.pid ?? "root"} value={opt.pid ?? ""}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-base-content/60">
              Processes cannot be their own parent. Backend will reject invalid hierarchies.
            </p>
          </div>
        </div>
      </fieldset>

      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={isSubmitting || !isValidName || !isValidPriority}
      >
        {isSubmitting ? (
          <>
            <span className="loading loading-spinner loading-sm mr-2" />
            Creating…
          </>
        ) : (
          "Create Process"
        )}
      </button>
    </form>
  );
}