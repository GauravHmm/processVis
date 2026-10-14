"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PCBResponse } from "@/types/api";
import { getActionTransition, getStateSvgColors } from "@/lib/processState";
import type { ProcessAction, ProcessState } from "@/types/api";
import type { PlaybackTransitionAnimation } from "@/lib/schedulingPlayback";

/**
 * Process state machine graph.
 *
 * This component is presentation only: it draws every valid transition of the
 * OS process state machine and animates the edge of a transition that is
 * currently being executed. Whether an action is allowed is decided by the
 * backend (`GET /api/processes/{pid}/valid-actions`) and passed in via
 * `validActions`. The graph never triggers transitions itself.
 */

const NODE_RADIUS = 42;
const VIEWBOX_WIDTH = 760;
const VIEWBOX_HEIGHT = 430;
const PARTICLE_DURATION_MS = 1200;

interface NodeDef {
  state: string;
  x: number;
  y: number;
}

/**
 * Node geometry uses a centered primary column and evenly spaced side states:
 *
 *                 NEW
 *                  |
 *                READY
 *              /   |   \
 *      PREEMPT  DISPATCH  (back edge drawn separately)
 *           |     RUNNING
 *          BLOCK /    \ TERMINATE
 *        BLOCKED      TERMINATED
 *            \__ WAKE __/
 */
const NODE_DEFS: NodeDef[] = [
  { state: "NEW", x: 380, y: 68 },
  { state: "READY", x: 380, y: 196 },
  { state: "RUNNING", x: 380, y: 350 },
  { state: "BLOCKED", x: 140, y: 350 },
  { state: "TERMINATED", x: 620, y: 350 },
];

interface EdgeDef {
  action: ProcessAction;
  from: ProcessState;
  to: ProcessState;
  path: string;
  endX: number;
  endY: number;
  endAngle: number;
  labelX: number;
  labelY: number;
  labelAnchor: "start" | "middle" | "end";
}

/** All six transitions are always drawn — one definition per action. */
const EDGE_DEFS: EdgeDef[] = [
  {
    action: "ADMIT",
    from: "NEW",
    to: "READY",
    path: "M 380 110 L 380 152",
    endX: 380,
    endY: 154,
    endAngle: 90,
    labelX: 396,
    labelY: 132,
    labelAnchor: "start",
  },
  {
    action: "DISPATCH",
    from: "READY",
    to: "RUNNING",
    path: "M 380 238 L 380 306",
    endX: 380,
    endY: 306,
    endAngle: 90,
    labelX: 396,
    labelY: 273,
    labelAnchor: "start",
  },
  {
    action: "PREEMPT",
    from: "RUNNING",
    to: "READY",
    path: "M 344 328 C 286 310 286 242 346 221",
    endX: 346,
    endY: 221,
    endAngle: -19.3,
    labelX: 292,
    labelY: 276,
    labelAnchor: "end",
  },
  {
    action: "BLOCK",
    from: "RUNNING",
    to: "BLOCKED",
    path: "M 338 350 L 182 350",
    endX: 182,
    endY: 350,
    endAngle: 180,
    labelX: 260,
    labelY: 332,
    labelAnchor: "middle",
  },
  {
    action: "WAKE",
    from: "BLOCKED",
    to: "READY",
    path: "M 140 308 C 146 244 238 196 338 196",
    endX: 338,
    endY: 196,
    endAngle: 0,
    labelX: 218,
    labelY: 231,
    labelAnchor: "middle",
  },
  {
    action: "TERMINATE",
    from: "RUNNING",
    to: "TERMINATED",
    path: "M 422 350 L 578 350",
    endX: 578,
    endY: 350,
    endAngle: 0,
    labelX: 500,
    labelY: 332,
    labelAnchor: "middle",
  },
];

interface ProcessStateGraphProps {
  processes: PCBResponse[];
  selectedPid: number | null;
  /** Valid actions from the backend for the selected process. */
  validActions: string[];
  /** Action currently being executed, if any (drives the flow animation). */
  pendingAction: string | null;
  /** Optional independent job state used by scheduling playback. */
  playback?: {
    jobs: { job_id: string; name: string; state: ProcessState }[];
    activeAction: ProcessAction | null;
    activeJobId: string | null;
    runningJobId: string | null;
    animationEvents: PlaybackTransitionAnimation[];
    animationResetKey: number;
    isPlaying: boolean;
    playbackSpeed: number;
    isAtEnd: boolean;
  };
}

function arrowPolygon(x: number, y: number, angleDeg: number): string {
  const size = 11;
  const spread = 0.42;
  const theta = (angleDeg * Math.PI) / 180;
  const p1x = x - size * Math.cos(theta - spread);
  const p1y = y - size * Math.sin(theta - spread);
  const p2x = x - size * Math.cos(theta + spread);
  const p2y = y - size * Math.sin(theta + spread);
  return `${x},${y} ${p1x},${p1y} ${p2x},${p2y}`;
}

export function ProcessStateGraph({
  processes,
  selectedPid,
  validActions,
  pendingAction,
  playback,
}: ProcessStateGraphProps) {
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const particleRef = useRef<SVGGElement | null>(null);
  const [movingTransition, setMovingTransition] = useState<PlaybackTransitionAnimation | null>(null);
  const [fallbackTransition, setFallbackTransition] = useState<PlaybackTransitionAnimation | null>(null);
  const transitionQueueRef = useRef<PlaybackTransitionAnimation[]>([]);
  const activeTransitionRef = useRef<PlaybackTransitionAnimation | null>(null);
  const observedEventIdsRef = useRef<Set<string>>(new Set());
  const animationProgressRef = useRef(0);

  const selectedProcess = processes.find((p) => p.pid === selectedPid) ?? null;
  const currentState = selectedProcess?.state ?? null;
  const displayProcesses = playback?.jobs ?? processes.map((process) => ({
    job_id: `P${process.pid}`,
    name: process.name,
    state: process.state as ProcessState,
  }));
  const displayCurrentState = playback
    ? playback.jobs.find((job) => job.job_id === playback.runningJobId)?.state
      ?? playback.jobs.find((job) => job.job_id === playback.activeJobId)?.state
      ?? null
    : currentState;
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const proc of displayProcesses) {
      counts[proc.state] = (counts[proc.state] ?? 0) + 1;
    }
    return counts;
  }, [displayProcesses]);

  const action = playback
    ? movingTransition?.action ?? playback.activeAction
    : pendingAction;
  const activeEdge = action
    ? EDGE_DEFS.find((edge) => edge.action === action)
    : undefined;

  // A seek or schedule change cancels all pending visual transitions.
  useEffect(() => {
    if (!playback) return;
    transitionQueueRef.current = [];
    activeTransitionRef.current = null;
    observedEventIdsRef.current.clear();
    animationProgressRef.current = 0;
    setMovingTransition(null);
    setFallbackTransition(null);
    if (particleRef.current) particleRef.current.style.visibility = "hidden";
  }, [Boolean(playback), playback?.animationResetKey]);

  // Record each newly selected event once. Simultaneous events queue in the
  // stable order supplied by schedulingPlayback.ts instead of overwriting.
  useEffect(() => {
    if (!playback) return;
    const unseen = playback.animationEvents.filter((transition) => !observedEventIdsRef.current.has(transition.eventId));
    for (const transition of unseen) {
      observedEventIdsRef.current.add(transition.eventId);
      if (activeTransitionRef.current) {
        transitionQueueRef.current.push(transition);
      } else {
        activeTransitionRef.current = transition;
        animationProgressRef.current = 0;
        setMovingTransition(transition);
      }
    }
    if (unseen.length > 0) setFallbackTransition(null);
  }, [playback?.animationResetKey, playback?.animationEvents]);

  // Animate independently from playback-time sampling. The rAF loop only
  // touches the particle's SVG transform and is not restarted by React renders.
  useEffect(() => {
    if (!playback || !movingTransition || (!playback.isPlaying && !playback.isAtEnd)) return;

    const transition = movingTransition;
    const path = activeEdge ? pathRefs.current[activeEdge.action] : null;
    const particle = particleRef.current;
    const durationMs = Math.max(350, 450 / playback.playbackSpeed);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let startTime: number | null = null;
    const startingProgress = animationProgressRef.current;
    const start = (now: number) => now - startingProgress * durationMs;

    let pathLength = 0;
    if (!reducedMotion && path && particle) {
      try {
        pathLength = path.getTotalLength();
        if (!Number.isFinite(pathLength) || pathLength <= 0) pathLength = 0;
      } catch {
        pathLength = 0;
      }
    }

    if (reducedMotion || !path || !particle || pathLength === 0) {
      // This also covers missing/unmounted SVG geometry without silently
      // snapping: the active edge and explicit source→destination marker stay visible.
      setFallbackTransition(transition);
    } else {
      setFallbackTransition(null);
      // React reuses this SVG group as queued events advance. Place it at this
      // event's own path position before the next paint so the previous event's
      // endpoint cannot flash while the new rAF loop is waiting for its first frame.
      try {
        const point = path.getPointAtLength(startingProgress * pathLength);
        particle.setAttribute("transform", `translate(${point.x} ${point.y})`);
        particle.style.visibility = "visible";
      } catch {
        pathLength = 0;
        particle.style.visibility = "hidden";
        setFallbackTransition(transition);
      }
    }

    const finish = () => {
      if (activeTransitionRef.current?.eventId !== transition.eventId) return;
      animationProgressRef.current = 0;
      activeTransitionRef.current = null;
      const next = transitionQueueRef.current.shift() ?? null;
      if (next) {
        activeTransitionRef.current = next;
        setMovingTransition(next);
        setFallbackTransition(null);
      } else {
        setMovingTransition(null);
        setFallbackTransition(null);
      }
    };

    const step = (now: number) => {
      if (startTime === null) startTime = start(now);
      const progress = Math.min(1, (now - startTime) / durationMs);
      animationProgressRef.current = progress;

      if (pathLength > 0 && path && particle) {
        try {
          const point = path.getPointAtLength(progress * pathLength);
          particle.setAttribute("transform", `translate(${point.x} ${point.y})`);
          particle.style.visibility = "visible";
        } catch {
          pathLength = 0;
          particle.style.visibility = "hidden";
          setFallbackTransition(transition);
        }
      }

      if (progress >= 1) finish();
      else frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [
    Boolean(playback),
    playback?.animationResetKey,
    playback?.isPlaying,
    playback?.isAtEnd,
    playback?.playbackSpeed,
    movingTransition?.eventId,
    activeEdge,
  ]);

  // The main simulator retains its original elapsed-time particle behavior.
  useEffect(() => {
    if (playback) return;
    const path = activeEdge ? pathRefs.current[activeEdge.action] : null;
    const particle = particleRef.current;

    if (!activeEdge || !path || !particle) {
      if (particle) particle.style.display = "none";
      return;
    }

    const totalLength = path.getTotalLength();
    let frame = 0;
    let startTime: number | null = null;

    particle.style.display = "";

    const step = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / PARTICLE_DURATION_MS, 1);
      const point = path.getPointAtLength(progress * totalLength);
      particle.setAttribute("transform", `translate(${point.x} ${point.y})`);
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frame);
      particle.style.display = "none";
    };
  }, [
    activeEdge,
    Boolean(playback),
  ]);

  const targetNode = activeEdge
    ? NODE_DEFS.find((node) => node.state === activeEdge.to)
    : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          className={`h-full w-full ${playback ? "scheduler-playback-svg" : ""}`}
          role="img"
          aria-label="Process state machine showing NEW, READY, RUNNING, BLOCKED and TERMINATED states and every valid transition"
        >
          {/* Edges */}
          {EDGE_DEFS.map((edge) => {
            const transition = getActionTransition(edge.action);
            if (!transition) return null;

            const isActive = activeEdge?.action === edge.action;
            const animateEdge = isActive && (
              !playback || movingTransition?.action === edge.action
            );
            const is_valid = playback
              ? edge.action === "BLOCK" || edge.action === "WAKE"
                ? false
                : displayProcesses.some((process) => process.state === edge.from)
              : currentState !== null && validActions.includes(edge.action);
            const sourceColors = getStateSvgColors(transition.from);

            const stroke = isActive
              ? "var(--color-primary, #d97706)"
              : is_valid
                ? sourceColors.stroke
                : "#94a3b8";
            const strokeWidth = isActive ? 3 : is_valid ? 2.25 : 1.75;
            const labelFill = isActive
              ? "var(--color-primary, #d97706)"
              : is_valid
                ? sourceColors.stroke
                : "#64748b";

            return (
              <g key={edge.action}>
                <path
                  ref={(el) => {
                    pathRefs.current[edge.action] = el;
                  }}
                  d={edge.path}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  className={animateEdge ? "state-edge-active" : undefined}
                  opacity={playback ? (edge.action === "BLOCK" || edge.action === "WAKE" ? 0.35 : 1) : currentState === null || currentState === transition.from || is_valid || isActive ? 1 : 0.55}
                  style={{ transition: "stroke 250ms ease, stroke-width 250ms ease, opacity 250ms ease" }}
                />
                <polygon
                  points={arrowPolygon(edge.endX, edge.endY, edge.endAngle)}
                  fill={stroke}
                  opacity={playback ? (edge.action === "BLOCK" || edge.action === "WAKE" ? 0.35 : 1) : currentState === null || currentState === transition.from || is_valid || isActive ? 1 : 0.55}
                  style={{ transition: "fill 250ms ease, opacity 250ms ease" }}
                />
                <text
                  x={edge.labelX}
                  y={edge.labelY}
                  textAnchor={edge.labelAnchor}
                  dominantBaseline="middle"
                  fontSize={14}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fontWeight={isActive ? 700 : is_valid ? 600 : 500}
                  fill={labelFill}
                  stroke="#f8fafc"
                  strokeWidth={5}
                  opacity={playback ? (edge.action === "BLOCK" || edge.action === "WAKE" ? 0.35 : 1) : currentState === null || currentState === transition.from || is_valid || isActive ? 1 : 0.55}
                  style={{ paintOrder: "stroke", transition: "fill 250ms ease, opacity 250ms ease" }}
                >
                  {edge.action}
                </text>
              </g>
            );
          })}

          {/* Destination pulse while a transition is animating */}
          {targetNode && (!playback || movingTransition) && (
            <circle
              key={`target-${targetNode.state}`}
              cx={targetNode.x}
              cy={targetNode.y}
              r={NODE_RADIUS + 7}
              fill="none"
              stroke="var(--color-primary, #d97706)"
              strokeWidth={3}
              strokeDasharray="7 7"
              className="node-target-pulse"
            />
          )}

          {/* State nodes */}
          {NODE_DEFS.map((node) => {
            const colors = getStateSvgColors(node.state);
            const isCurrent = displayCurrentState === node.state;
            const count = stateCounts[node.state] ?? 0;
            const tokenBox = node.state === "NEW"
              ? { x: node.x + 47, y: node.y - 32, width: 190, height: 68 }
              : node.state === "READY"
                ? { x: node.x + 47, y: node.y - 48, width: 250, height: 96 }
                : node.state === "TERMINATED"
                  ? { x: node.x + 45, y: node.y - 42, width: 92, height: 84 }
                  : { x: node.x - 58, y: node.y + 9, width: 116, height: 58 };
            const stateJobs = displayProcesses.filter((process) => process.state === node.state);

            return (
              <g key={node.state}>
                {isCurrent && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={NODE_RADIUS + 6}
                    fill="none"
                    stroke={colors.glow}
                    strokeWidth={7}
                  />
                )}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={NODE_RADIUS}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={2.25}
                  opacity={playback ? 1 : currentState === null || isCurrent ? 1 : 0.62}
                  style={{ transition: "opacity 250ms ease" }}
                />
                <text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={14}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fontWeight={700}
                  fill={colors.text}
                >
                  <title>{node.state}</title>
                  {node.state}
                </text>
                {playback && stateJobs.length > 0 && (
                  <foreignObject {...tokenBox}>
                    <div className="flex max-h-full flex-wrap content-start justify-center gap-1 overflow-y-auto text-sm leading-6">
                      {stateJobs.map((process) => (
                        <span
                          key={process.job_id}
                          title={`${process.name} (${process.job_id})`}
                          className={`scheduling-job-token rounded px-2.5 py-0.5 font-mono font-bold shadow-sm ${process.job_id === movingTransition?.jobId ? "is-moving" : ""} ${process.job_id === playback.runningJobId ? "bg-amber-600 text-white ring-2 ring-amber-200" : "bg-white/95 text-slate-800"}`}
                        >
                          {process.job_id}
                        </span>
                      ))}
                    </div>
                  </foreignObject>
                )}
                {count > 0 && (
                  <g>
                    <circle
                      cx={node.x + NODE_RADIUS - 3}
                      cy={node.y - NODE_RADIUS + 3}
                      r={11}
                      fill={colors.stroke}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                    <text
                      x={node.x + NODE_RADIUS - 3}
                      y={node.y - NODE_RADIUS + 3}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={11}
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      fontWeight={700}
                      fill="#fff"
                    >
                      {count}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* This independent SVG token stays mounted for the whole animation. */}
          {playback && movingTransition && !fallbackTransition && (
            <g
              ref={particleRef}
              className="scheduling-transition-token"
              style={{ visibility: "hidden", pointerEvents: "none" }}
            >
              <circle r={22} fill="var(--color-primary, #d97706)" opacity={0.4} />
              <circle r={14} fill="var(--color-primary, #d97706)" stroke="#fff" strokeWidth={2.5} />
              <text x={16} y={-12} fontSize={12} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight={800} fill="#172033" stroke="#fff" strokeWidth={4} paintOrder="stroke">
                {movingTransition.jobId}
              </text>
            </g>
          )}
          {playback && fallbackTransition && (
            <text x={380} y={410} textAnchor="middle" fontSize={13} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight={800} fill="#172033" stroke="#fff" strokeWidth={5} paintOrder="stroke">
              {fallbackTransition.jobId}: {fallbackTransition.from} → {fallbackTransition.to}
            </text>
          )}
          {!playback && (
            <g ref={particleRef} style={{ display: "none", pointerEvents: "none" }}>
              <circle r={18} fill="var(--color-primary, #d97706)" opacity={0.3} />
              <circle r={8} fill="var(--color-primary, #d97706)" stroke="#fff" strokeWidth={2} />
            </g>
          )}
        </svg>
      </div>

      <footer className="ui-meta mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-base-300 pt-2">
        {playback ? (
          <span>Scheduling jobs are shown by job ID. BLOCKED and WAKE are inactive because this schedule has no I/O events.</span>
        ) : selectedProcess ? (
          <span>
            Selected process{" "}
            <span className="ui-value font-mono">
              P{selectedProcess.pid} {selectedProcess.name}
            </span>{" "}
            — state{" "}
            <span className="ui-value font-mono">
              {currentState}
            </span>
          </span>
        ) : (
          <span>
            Select a process in the Process Table or Process Hierarchy to
            highlight its state and valid transitions
          </span>
        )}
        <span className="ui-meta font-mono font-medium">
          {NODE_DEFS.length} states · {EDGE_DEFS.length} transitions
        </span>
      </footer>
    </div>
  );
}
