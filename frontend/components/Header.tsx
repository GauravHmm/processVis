"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface HeaderProps {
  onReset: () => void;
  isResetting: boolean;
}

type BackendStatus = "checking" | "connected" | "disconnected";

const HEALTH_POLL_MS = 30000;

const STATUS_LABEL: Record<BackendStatus, string> = {
  checking: "Checking backend…",
  connected: "Backend connected",
  disconnected: "Backend disconnected",
};

export function Header({ onReset, isResetting }: HeaderProps) {
  const [status, setStatus] = useState<BackendStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const checkHealth = async () => {
      try {
        await api.healthCheck();
        if (!cancelled) setStatus("connected");
      } catch {
        if (!cancelled) setStatus("disconnected");
      } finally {
        if (!cancelled) timer = setTimeout(checkHealth, HEALTH_POLL_MS);
      }
    };

    void checkHealth();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <header className="navbar bg-base-100 border-b border-base-300 sticky top-0 z-40">
      <div className="mx-auto max-w-full px-4">
        <div className="flex h-12 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20">
              <svg
                className="h-4 w-4 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </div>
            <div>
              <h1 className="ui-app-title tracking-tight">
                Process Visualizer
              </h1>
              <p className="ui-meta">
                Operating Systems — Educational Simulation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              role="status"
              aria-live="polite"
              className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-md bg-base-200 border border-base-300"
              title={status === "connected" ? "FastAPI backend responded to /api/health" : STATUS_LABEL[status]}
            >
              <span className={`relative flex h-2 w-2 ${status === "connected" ? "" : "shrink-0"}`}>
                {status === "connected" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    status === "connected" ? "bg-success" : status === "checking" ? "bg-warning" : "bg-error"
                  }`}
                ></span>
              </span>
              <span className="ui-meta font-mono font-medium">{STATUS_LABEL[status]}</span>
            </div>
            <button
              type="button"
              onClick={onReset}
              disabled={isResetting}
              className="btn btn-ghost btn-sm gap-1.5"
              aria-label={isResetting ? "Resetting simulation…" : "Reset simulation"}
            >
              <span className="loading loading-spinner loading-xs" style={{ display: isResetting ? "inline-block" : "none" }} />
              {isResetting ? "Resetting…" : "Reset"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
