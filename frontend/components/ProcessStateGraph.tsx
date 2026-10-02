"use client";

import { useEffect, useMemo, useRef } from "react";
import type { PCBResponse } from "@/types/api";
import { getActionTransition, getStateSvgColors } from "@/lib/processState";
import type { ProcessAction, ProcessState } from "@/types/api";

/**
 * Process state machine graph.
 *
 * This component is presentation only: it draws every valid transition of the
 * OS process state machine and animates the edge of a transition that is
 * currently being executed. Whether an action is allowed is decided by the
 * backend (`GET /api/processes/{pid}/valid-actions`) and passed in via
 * `validActions`. The graph never triggers transitions itself.
 */

const NODE_RADIUS = 44;
const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 430;
const PARTICLE_DURATION_MS = 1200;

interface NodeDef {
  state: string;
  x: number;
  y: number;
}

/**
 * Node geometry, laid out to use the wide (≈70%) state-machine column:
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
  { state: "NEW", x: 500, y: 52 },
  { state: "READY", x: 500, y: 158 },
  { state: "RUNNING", x: 500, y: 316 },
  { state: "BLOCKED", x: 150, y: 316 },
  { state: "TERMINATED", x: 850, y: 316 },
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
    path: "M 500 96 L 500 114",
    endX: 500,
    endY: 114,
    endAngle: 90,
    labelX: 516,
    labelY: 105,
    labelAnchor: "start",
  },
  {
    action: "DISPATCH",
    from: "READY",
    to: "RUNNING",
    path: "M 500 202 L 500 272",
    endX: 500,
    endY: 272,
    endAngle: 90,
    labelX: 516,
    labelY: 238,
    labelAnchor: "start",
  },
  {
    action: "PREEMPT",
    from: "RUNNING",
    to: "READY",
    path: "M 456 288 C 330 282 328 208 456 198",
    endX: 456,
    endY: 198,
    endAngle: -3.5,
    labelX: 336,
    labelY: 253,
    labelAnchor: "end",
  },
  {
    action: "BLOCK",
    from: "RUNNING",
    to: "BLOCKED",
    path: "M 456 316 L 194 316",
    endX: 194,
    endY: 316,
    endAngle: 180,
    labelX: 325,
    labelY: 300,
    labelAnchor: "middle",
  },
  {
    action: "WAKE",
    from: "BLOCKED",
    to: "READY",
    path: "M 150 272 C 150 204 300 158 456 158",
    endX: 456,
    endY: 158,
    endAngle: 0,
    labelX: 243,
    labelY: 217,
    labelAnchor: "middle",
  },
  {
    action: "TERMINATE",
    from: "RUNNING",
    to: "TERMINATED",
    path: "M 544 316 L 806 316",
    endX: 806,
    endY: 316,
    endAngle: 0,
    labelX: 675,
    labelY: 300,
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
}: ProcessStateGraphProps) {
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const particleRef = useRef<SVGGElement | null>(null);

  const selectedProcess = processes.find((p) => p.pid === selectedPid) ?? null;
  const currentState = selectedProcess?.state ?? null;

  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const proc of processes) {
      counts[proc.state] = (counts[proc.state] ?? 0) + 1;
    }
    return counts;
  }, [processes]);

  const activeEdge = pendingAction
    ? EDGE_DEFS.find((edge) => edge.action === pendingAction)
    : undefined;

  // Particle travelling along the active edge (data/process flow).
  useEffect(() => {
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
  }, [activeEdge]);

  const targetNode = activeEdge
    ? NODE_DEFS.find((node) => node.state === activeEdge.to)
    : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full"
          role="img"
          aria-label="Process state machine showing NEW, READY, RUNNING, BLOCKED and TERMINATED states and every valid transition"
        >
          {/* Edges */}
          {EDGE_DEFS.map((edge) => {
            const transition = getActionTransition(edge.action);
            if (!transition) return null;

            const isActive = activeEdge?.action === edge.action;
            const is_valid =
              currentState !== null && validActions.includes(edge.action);
            const sourceColors = getStateSvgColors(transition.from);

            const stroke = isActive
              ? "var(--color-primary, #d97706)"
              : is_valid
                ? sourceColors.stroke
                : "#94a3b8";
            const strokeWidth = isActive ? 3.5 : is_valid ? 2.5 : 1.75;
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
                  className={isActive ? "state-edge-active" : undefined}
                  opacity={currentState === null || currentState === transition.from || is_valid || isActive ? 1 : 0.55}
                  style={{ transition: "stroke 250ms ease, stroke-width 250ms ease, opacity 250ms ease" }}
                />
                <polygon
                  points={arrowPolygon(edge.endX, edge.endY, edge.endAngle)}
                  fill={stroke}
                  opacity={currentState === null || currentState === transition.from || is_valid || isActive ? 1 : 0.55}
                  style={{ transition: "fill 250ms ease, opacity 250ms ease" }}
                />
                <text
                  x={edge.labelX}
                  y={edge.labelY}
                  textAnchor={edge.labelAnchor}
                  dominantBaseline="middle"
                  fontSize={15}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fontWeight={isActive ? 700 : is_valid ? 600 : 500}
                  fill={labelFill}
                  stroke="#fff"
                  strokeWidth={4}
                  opacity={currentState === null || currentState === transition.from || is_valid || isActive ? 1 : 0.55}
                  style={{ paintOrder: "stroke", transition: "fill 250ms ease, opacity 250ms ease" }}
                >
                  {edge.action}
                </text>
              </g>
            );
          })}

          {/* Destination pulse while a transition is animating */}
          {targetNode && (
            <circle
              key={`target-${targetNode.state}`}
              cx={targetNode.x}
              cy={targetNode.y}
              r={NODE_RADIUS + 8}
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
            const isCurrent = currentState === node.state;
            const count = stateCounts[node.state] ?? 0;

            return (
              <g key={node.state}>
                {isCurrent && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={NODE_RADIUS + 10}
                    fill={colors.glow}
                  />
                )}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={NODE_RADIUS}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={isCurrent ? 3.5 : 2}
                  opacity={currentState === null || isCurrent ? 1 : 0.62}
                  style={{ transition: "stroke-width 250ms ease, opacity 250ms ease" }}
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
                {count > 0 && (
                  <g>
                    <circle
                      cx={node.x + NODE_RADIUS - 6}
                      cy={node.y + NODE_RADIUS - 6}
                      r={13}
                      fill={colors.stroke}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                    <text
                      x={node.x + NODE_RADIUS - 6}
                      y={node.y + NODE_RADIUS - 6}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={12}
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      fontWeight={700}
                      fill="#fff"
                    >
                      {count}
                    </text>
                  </g>
                )}
                {isCurrent && (
                  <circle
                    cx={node.x}
                    cy={node.y - NODE_RADIUS}
                    r={6}
                    fill={colors.stroke}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )}
              </g>
            );
          })}

          {/* Particle / data flow along the active edge */}
          <g ref={particleRef} style={{ display: "none", pointerEvents: "none" }}>
            <circle r={18} fill="var(--color-primary, #d97706)" opacity={0.3} />
            <circle
              r={8}
              fill="var(--color-primary, #d97706)"
              stroke="#fff"
              strokeWidth={2}
            />
          </g>
        </svg>
      </div>

      <footer className="ui-meta mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-base-300 pt-2">
        {selectedProcess ? (
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
