"use client";

interface HeaderProps {
  onReset: () => void;
  isResetting: boolean;
}

export function Header({ onReset, isResetting }: HeaderProps) {
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
            <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-md bg-base-200 border border-base-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span className="ui-meta font-mono font-medium">Backend Connected</span>
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
