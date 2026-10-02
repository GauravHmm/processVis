"use client";

import { api, ApiError } from "@/lib/api";
import type { EventsResponse } from "@/types/api";

interface EventLogProps {
  events: string[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export function EventLog({ events, isLoading = false, error, onRefresh }: EventLogProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-center">
        <div className="space-y-2">
          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <p className="text-sm text-zinc-500">Loading events…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="rounded-md bg-rose-500/10 border border-rose-500/30 p-3 text-sm text-rose-300" role="alert">
          <p className="font-medium">Unable to load events</p>
          <p>{error}</p>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-1.5 text-sm font-medium text-zinc-900 bg-amber-500 rounded-md hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="mt-4 text-zinc-400">No Events</p>
        <p className="mt-1 text-xs text-zinc-500">Simulation events will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto font-mono text-xs">
      {events.map((event, index) => (
        <div
          key={index}
          className="px-3 py-1.5 rounded border-l-2 border-zinc-700 hover:bg-zinc-800/50 transition-colors"
        >
          <span className="text-zinc-500 mr-2">[{index + 1}]</span>
          <span className="text-zinc-300">{event}</span>
        </div>
      ))}
    </div>
  );
}