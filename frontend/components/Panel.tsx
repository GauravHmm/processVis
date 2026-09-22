"use client";

import { ReactNode } from "react";

interface PanelProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
}

export function Panel({
  title,
  subtitle,
  children,
  className = "",
  headerAction,
}: PanelProps) {
  return (
    <section
      className={`bg-zinc-900 border border-zinc-700 rounded-lg ${className}`}
      aria-labelledby={title.toLowerCase().replace(/\s+/g, "-")}
    >
      <header className="flex items-center justify-between px-5 py-4 border-b border-zinc-700">
        <div>
          <h2 id={title.toLowerCase().replace(/\s+/g, "-")} className="text-lg font-semibold text-zinc-100">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>
          )}
        </div>
        {headerAction && (
          <div className="flex-shrink-0 ml-4">{headerAction}</div>
        )}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}