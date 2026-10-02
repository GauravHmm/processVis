"use client";

import type { ProcessAction } from "@/types/api";

export type ProcessState = "NEW" | "READY" | "RUNNING" | "BLOCKED" | "TERMINATED";

export interface ProcessStateConfig {
  label: string;
  badge: string;
  badgeOutline: string;
  badgeSoft: string;
  text: string;
  border: string;
  bg: string;
  ring: string;
  statusColor: string;
  iconBg: string;
  iconColor: string;
}

export const PROCESS_STATE_CONFIG: Record<ProcessState, ProcessStateConfig> = {
  NEW: {
    label: "NEW",
    badge: "badge-emerald",
    badgeOutline: "badge-outline badge-emerald",
    badgeSoft: "badge-ghost badge-emerald",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/15",
    ring: "ring-emerald-500/40",
    statusColor: "emerald",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
  },
  READY: {
    label: "READY",
    badge: "badge-blue",
    badgeOutline: "badge-outline badge-blue",
    badgeSoft: "badge-ghost badge-blue",
    text: "text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/15",
    ring: "ring-blue-500/40",
    statusColor: "blue",
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
  },
  RUNNING: {
    label: "RUNNING",
    badge: "badge-amber",
    badgeOutline: "badge-outline badge-amber",
    badgeSoft: "badge-ghost badge-amber",
    text: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/15",
    ring: "ring-amber-500/40",
    statusColor: "amber",
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-400",
  },
  BLOCKED: {
    label: "BLOCKED",
    badge: "badge-rose",
    badgeOutline: "badge-outline badge-rose",
    badgeSoft: "badge-ghost badge-rose",
    text: "text-rose-400",
    border: "border-rose-500/30",
    bg: "bg-rose-500/15",
    ring: "ring-rose-500/40",
    statusColor: "rose",
    iconBg: "bg-rose-500/20",
    iconColor: "text-rose-400",
  },
  TERMINATED: {
    label: "TERMINATED",
    badge: "badge-violet",
    badgeOutline: "badge-outline badge-violet",
    badgeSoft: "badge-ghost badge-violet",
    text: "text-violet-400",
    border: "border-violet-500/30",
    bg: "bg-violet-500/15",
    ring: "ring-violet-500/40",
    statusColor: "violet",
    iconBg: "bg-violet-500/20",
    iconColor: "text-violet-400",
  },
};

export const STATE_ORDER: ProcessState[] = ["NEW", "READY", "RUNNING", "BLOCKED", "TERMINATED"];

export function getProcessStateConfig(state: string): ProcessStateConfig {
  return PROCESS_STATE_CONFIG[state as ProcessState] ?? {
    label: state,
    badge: "badge-neutral",
    badgeOutline: "badge-outline badge-neutral",
    badgeSoft: "badge-ghost badge-neutral",
    text: "text-zinc-400",
    border: "border-zinc-600",
    bg: "bg-zinc-700/50",
    ring: "ring-zinc-500/40",
    statusColor: "neutral",
    iconBg: "bg-zinc-700/50",
    iconColor: "text-zinc-400",
  };
}

export function getStateBadgeClasses(state: string): string {
  const config = getProcessStateConfig(state);
  return config.badge;
}

export function getStateBadgeOutlineClasses(state: string): string {
  const config = getProcessStateConfig(state);
  return config.badgeOutline;
}

export function getStateTextClasses(state: string): string {
  const config = getProcessStateConfig(state);
  return config.text;
}

export function getStateBorderClasses(state: string): string {
  const config = getProcessStateConfig(state);
  return config.border;
}

export function getStateBgClasses(state: string): string {
  const config = getProcessStateConfig(state);
  return config.bg;
}

export function getStateRingClasses(state: string): string {
  const config = getProcessStateConfig(state);
  return config.ring;
}

export function getStateIconClasses(state: string): { bg: string; color: string } {
  const config = getProcessStateConfig(state);
  return { bg: config.iconBg, color: config.iconColor };
}

export function getStateStatusDotClasses(state: string): string {
  const config = getProcessStateConfig(state);
  return `status-${config.statusColor}`;
}

export function getStateProgressClasses(state: string): string {
  const config = getProcessStateConfig(state);
  return `progress-${config.statusColor}`;
}

export function isTerminalState(state: string): boolean {
  return state === "TERMINATED";
}

export function isRunningState(state: string): boolean {
  return state === "RUNNING";
}

export function getStateTransitions(state: ProcessState): ProcessState[] {
  const transitions: Record<ProcessState, ProcessState[]> = {
    NEW: ["READY"],
    READY: ["RUNNING"],
    RUNNING: ["READY", "BLOCKED", "TERMINATED"],
    BLOCKED: ["READY"],
    TERMINATED: [],
  };
  return transitions[state] ?? [];
}

export function isValidTransition(from: ProcessState, to: ProcessState): boolean {
  return getStateTransitions(from).includes(to);
}

export function getStateConfig(state: ProcessState): ProcessStateConfig {
  return PROCESS_STATE_CONFIG[state];
}

export function getAllStateConfigs(): ProcessStateConfig[] {
  return STATE_ORDER.map((state) => PROCESS_STATE_CONFIG[state]);
}

/**
 * SVG color palette for the process state graph.
 *
 * The badge/text classes above are tuned for the card surfaces, while the
 * graph needs explicit hex values that stay readable on the light graph
 * background. The hues intentionally match the centralized state colors:
 * NEW = emerald, READY = blue, RUNNING = amber, BLOCKED = rose,
 * TERMINATED = violet.
 */
export interface ProcessStateSvgColors {
  /** Node outline and emphasis color. */
  stroke: string;
  /** Soft node fill. */
  fill: string;
  /** Node label text color (kept dark enough for the light background). */
  text: string;
  /** Semi-transparent halo used behind the current state. */
  glow: string;
}

export const PROCESS_STATE_SVG: Record<ProcessState, ProcessStateSvgColors> = {
  NEW: {
    stroke: "#059669",
    fill: "#ecfdf5",
    text: "#047857",
    glow: "rgba(5, 150, 105, 0.22)",
  },
  READY: {
    stroke: "#2563eb",
    fill: "#eff6ff",
    text: "#1d4ed8",
    glow: "rgba(37, 99, 235, 0.22)",
  },
  RUNNING: {
    stroke: "#d97706",
    fill: "#fffbeb",
    text: "#b45309",
    glow: "rgba(217, 119, 6, 0.22)",
  },
  BLOCKED: {
    stroke: "#e11d48",
    fill: "#fff1f2",
    text: "#be123c",
    glow: "rgba(225, 29, 72, 0.22)",
  },
  TERMINATED: {
    stroke: "#7c3aed",
    fill: "#f5f3ff",
    text: "#6d28d9",
    glow: "rgba(124, 58, 237, 0.22)",
  },
};

export function getStateSvgColors(state: string): ProcessStateSvgColors {
  return PROCESS_STATE_SVG[state as ProcessState] ?? {
    stroke: "#64748b",
    fill: "#f8fafc",
    text: "#334155",
    glow: "rgba(100, 116, 139, 0.22)",
  };
}

/**
 * Static description of each transition action.
 *
 * This describes the shape of the state diagram only. Whether an action is
 * currently allowed is always decided by the backend
 * (GET /api/processes/{pid}/valid-actions) — never by the frontend.
 */
export interface ActionTransition {
  action: ProcessAction;
  from: ProcessState;
  to: ProcessState;
  label: string;
}

export const ACTION_ORDER: ProcessAction[] = [
  "ADMIT",
  "DISPATCH",
  "PREEMPT",
  "BLOCK",
  "WAKE",
  "TERMINATE",
];

export const ACTION_TRANSITIONS: Record<ProcessAction, ActionTransition> = {
  ADMIT: { action: "ADMIT", from: "NEW", to: "READY", label: "NEW → READY" },
  DISPATCH: { action: "DISPATCH", from: "READY", to: "RUNNING", label: "READY → RUNNING" },
  PREEMPT: { action: "PREEMPT", from: "RUNNING", to: "READY", label: "RUNNING → READY" },
  BLOCK: { action: "BLOCK", from: "RUNNING", to: "BLOCKED", label: "RUNNING → BLOCKED" },
  WAKE: { action: "WAKE", from: "BLOCKED", to: "READY", label: "BLOCKED → READY" },
  TERMINATE: { action: "TERMINATE", from: "RUNNING", to: "TERMINATED", label: "RUNNING → TERMINATED" },
};

export const ACTION_LABELS: Record<ProcessAction, string> = {
  ADMIT: "Admit",
  DISPATCH: "Dispatch",
  PREEMPT: "Preempt",
  BLOCK: "Block",
  WAKE: "Wake",
  TERMINATE: "Terminate",
};

export function getActionTransition(action: string): ActionTransition | undefined {
  return ACTION_TRANSITIONS[action as ProcessAction];
}
