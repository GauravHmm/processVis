"use client";

interface HeaderProps {
  onReset: () => void;
  isResetting: boolean;
}

export function Header({ onReset, isResetting }: HeaderProps) {
  return (
    <header className="bg-zinc-950 border-b border-zinc-800 sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600/20">
              <svg
                className="h-5 w-5 text-amber-400"
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
              <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
                Process Creation & State Transition Visualizer
              </h1>
              <p className="text-xs text-zinc-500">
                Operating Systems — Educational Simulation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-sm text-zinc-300 font-mono">Backend Connected</span>
            </div>
            <button
              type="button"
              onClick={onReset}
              disabled={isResetting}
              className="px-3 py-1.5 text-sm font-medium text-zinc-300 bg-zinc-900 border border-zinc-700 rounded-md hover:bg-zinc-800 hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={isResetting ? "Resetting simulation…" : "Reset simulation"}
            >
              {isResetting ? "Resetting…" : "Reset"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}