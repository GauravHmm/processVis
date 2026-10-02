"use client";

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
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="ui-meta">Loading events…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="alert alert-error" role="alert">
          <svg className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m-2 2l2 2m-2 2l-2 2m2 2l2 2m-2 2l-2 2m2 2l2 2m-2 2l-2 2m2 2l2 2m-2 2l-2 2m2 2l2 2m-2 2l-2 2m2 2l2 2m-2 2l-2 2m2 2l2 2m-2 2l-2 2" /></svg>
          <div>
            <p className="font-medium">Unable to load events</p>
            <p>{error}</p>
          </div>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="btn btn-primary btn-sm"
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="ui-body mt-4">No Events</p>
        <p className="ui-meta mt-1">Simulation events will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto font-mono text-sm">
      {events.map((event: string, index: number) => (
        <div
          key={index}
          className="px-3 py-1.5 rounded border-l-2 border-base-300 hover:bg-base-200/50 transition-colors"
        >
          <span className="ui-meta mr-2">[{index + 1}]</span>
          <span className="text-base-content">{event}</span>
        </div>
      ))}
    </div>
  );
}
