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
      className={`card bg-base-100 border border-base-300 ${className}`}
      aria-labelledby={title.toLowerCase().replace(/\s+/g, "-")}
    >
      <div className="card-header px-5 py-4 border-b border-base-300">
        <div>
          <h2 id={title.toLowerCase().replace(/\s+/g, "-")} className="card-title text-base-content">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-sm text-base-content/60">{subtitle}</p>
          )}
        </div>
        {headerAction && (
          <div className="flex-shrink-0 ml-4">{headerAction}</div>
        )}
      </div>
      <div className="card-body p-5">{children}</div>
    </section>
  );
}