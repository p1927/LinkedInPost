/**
 * NewScenes.tsx — mechanism explainer scene components
 * Types: DiagramScene | StepsScene | NumberScene | CompareScene | PhotoScene
 *
 * Safe zone (1080×1920 canvas):
 *   x : 60 – 1020   (960 px wide)
 *   y : 220 – 1500
 * Diagram content is kept inside x:80-1000, y:240-1180 to leave room for captions.
 */

import React from "react";
import {
  AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig,
} from "remotion";
import { evolvePath } from "@remotion/paths";
import type { DiagramEdge, DiagramNode, DiagramRevealStep, Palette, SceneVisual } from "./types";
import { gradeCss, Vignette, TermSticker } from "./Scenes";
import { Icon } from "./Icons";
import { fontFor } from "./theme";

// ── Diagram helpers ────────────────────────────────────────────────────────

const NODE_W = 220;
const NODE_H = 120;

// Vertical content band for text scenes: safe area top, ending well above the word captions (~y 1480+).
const SAFE_TOP = 220;
const SAFE_H = 1240;

function computePositions(
  nodes: DiagramNode[],
  layout?: "row" | "column" | "cycle",
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const n = nodes.length;

  nodes.forEach((node, i) => {
    // Explicit coordinates override layout
    if (node.x !== undefined && node.y !== undefined) {
      positions[node.id] = { x: node.x, y: node.y };
      return;
    }

    switch (layout) {
      case "row": {
        const leftX = 180, rightX = 900;
        const x = n <= 1 ? 540 : leftX + (rightX - leftX) * (i / (n - 1));
        positions[node.id] = { x, y: 860 };
        break;
      }
      case "column": {
        const topY = 360, botY = 1120;
        const y = n <= 1 ? 730 : topY + (botY - topY) * (i / (n - 1));
        positions[node.id] = { x: 540, y };
        break;
      }
      case "cycle": {
        const cx = 540, cy = 710;
        // Minimum radius so adjacent nodes stay >= NODE_W+40 apart
        const minR = n <= 1 ? 0 : (NODE_W + 40) / (2 * Math.sin(Math.PI / n));
        const r = Math.min(320, Math.max(minR, 160));
        const angle = (2 * Math.PI * i / n) - Math.PI / 2;
        positions[node.id] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
        break;
      }
      default: {
        // Auto-grid fallback
        const cols = Math.ceil(Math.sqrt(n));
        const colCount = Math.min(n, cols);
        const col = i % cols, row = Math.floor(i / cols);
        const gapX = colCount <= 1 ? 0 : 760 / (colCount - 1);
        const gapY = 280;
        positions[node.id] = {
          x: 160 + col * gapX,
          y: 380 + row * gapY,
        };
      }
    }
  });
  return positions;
}

function getRevealState(
  reveal: DiagramRevealStep[],
  progress: number,
  allNodes: DiagramNode[],
): { visible: Set<string>; highlighted: Set<string>; caption: string | undefined } {
  if (reveal.length === 0) {
    // All visible immediately
    return { visible: new Set(allNodes.map((n) => n.id)), highlighted: new Set(), caption: undefined };
  }

  const fired = reveal.filter((s) => progress >= s.at);
  const visible = new Set<string>();
  for (const step of fired) for (const id of step.show ?? []) visible.add(id);

  const last = fired[fired.length - 1];
  const highlighted = new Set<string>(last?.highlight ?? []);
  return { visible, highlighted, caption: last?.caption };
}

function getNodeRevealFrame(nodeId: string, reveal: DiagramRevealStep[], dur: number): number {
  for (const step of reveal) {
    if (step.show?.includes(nodeId)) return Math.round(step.at * dur);
  }
  return 0;
}

/** Clip a straight line so it starts/ends at the node box edge, not center. */
function clipEdge(
  sx: number, sy: number, tx: number, ty: number, buffer = 60,
): [number, number, number, number] {
  const dx = tx - sx, dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = dx / len, ny = dy / len;
  return [sx + nx * buffer, sy + ny * buffer, tx - nx * buffer, ty - ny * buffer];
}

// ── Single diagram node ────────────────────────────────────────────────────

const NodeView: React.FC<{
  node: DiagramNode; pos: { x: number; y: number };
  isHighlighted: boolean; pal: Palette; ff: string;
  frame: number; fps: number; revealFrame: number;
}> = ({ node, pos, isHighlighted, pal, ff, frame, fps, revealFrame }) => {
  const s = spring({ frame: frame - revealFrame, fps, config: { damping: 14, stiffness: 150 }, from: 0, to: 1 });
  const pulse = isHighlighted ? 1 + 0.035 * Math.sin((frame / 6) * Math.PI) : 1;

  return (
    <div
      style={{
        position: "absolute",
        left: pos.x - NODE_W / 2,
        top: pos.y - NODE_H / 2,
        width: NODE_W,
        height: NODE_H,
        transform: `scale(${Math.max(0, s) * pulse})`,
        transformOrigin: "center center",
        opacity: Math.min(1, s * 1.6),
        background: isHighlighted ? pal.sunny : pal.white,
        border: `6px solid ${isHighlighted ? pal.coral : pal.ink}`,
        borderRadius: 28,
        boxShadow: isHighlighted
          ? `0 8px 32px rgba(0,0,0,0.28), 0 0 0 4px ${pal.coral}44`
          : "0 4px 18px rgba(0,0,0,0.16)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        fontFamily: ff,
      }}
    >
      {node.icon && (
        <Icon name={node.icon} size={40} color={isHighlighted ? pal.ink : pal.sky} />
      )}
      <div
        style={{
          fontSize: 44,
          fontWeight: 700,
          lineHeight: 1.1,
          color: pal.ink,
          textAlign: "center",
          padding: "0 10px",
          wordBreak: "break-word",
        }}
      >
        {node.label}
      </div>
    </div>
  );
};

// ── Flow particle along a straight edge ───────────────────────────────────

const FlowParticle: React.FC<{
  x1: number; y1: number; x2: number; y2: number;
  frame: number; color: string;
}> = ({ x1, y1, x2, y2, frame, color }) => {
  const t = ((frame * 1.5) % 60) / 60;
  const px = x1 + (x2 - x1) * t;
  const py = y1 + (y2 - y1) * t;
  const alpha = t < 0.1 ? t / 0.1 : t > 0.9 ? (1 - t) / 0.1 : 1;
  return <circle cx={px} cy={py} r={10} fill={color} opacity={alpha} />;
};

// ── Arrowhead drawn at tip of edge ────────────────────────────────────────

const Arrowhead: React.FC<{
  x1: number; y1: number; x2: number; y2: number; color: string; progress: number;
}> = ({ x1, y1, x2, y2, color, progress }) => {
  if (progress < 0.98) return null;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = dx / len, ny = dy / len;
  const px = nx * 18, py = ny * 18;
  const lx = -ny * 10, ly = nx * 10;
  const pts = `${x2},${y2} ${x2 - px + lx},${y2 - py + ly} ${x2 - px - lx},${y2 - py - ly}`;
  return <polygon points={pts} fill={color} />;
};

// ── DiagramScene ──────────────────────────────────────────────────────────

export const DiagramScene: React.FC<{
  visual: Extract<SceneVisual, { type: "diagram" }>;
  pal: Palette; dur: number; font?: string;
}> = ({ visual, pal, dur, font }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = Math.min(1, frame / Math.max(1, dur));
  const ff = fontFor(font);

  const positions = computePositions(visual.nodes, visual.layout);
  const { visible, highlighted, caption } = getRevealState(visual.reveal ?? [], progress, visual.nodes);

  return (
    <AbsoluteFill style={{ background: pal.bg }}>
      {/* SVG layer: edges */}
      <svg
        viewBox="0 0 1080 1920"
        style={{ position: "absolute", width: "100%", height: "100%", pointerEvents: "none" }}
      >
        <defs>
          {/* subtle grid bg for the diagram area */}
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke={pal.ink} strokeWidth="0.4" opacity="0.12" />
          </pattern>
        </defs>
        <rect x="60" y="220" width="960" height="960" fill="url(#grid)" rx="0" />

        {(visual.edges ?? []).map((edge, i) => {
          const srcPos = positions[edge.from];
          const dstPos = positions[edge.to];
          if (!srcPos || !dstPos) return null;

          const srcVisible = visible.has(edge.from);
          const dstVisible = visible.has(edge.to);
          if (!srcVisible) return null;

          // Edge draws on fully when dst node appears
          const edgeProgress = srcVisible && dstVisible ? 1 : 0.55;
          const [ex1, ey1, ex2, ey2] = clipEdge(srcPos.x, srcPos.y, dstPos.x, dstPos.y);
          const pathStr = `M ${ex1} ${ey1} L ${ex2} ${ey2}`;
          const evolved = evolvePath(edgeProgress, pathStr);
          const isHi = highlighted.has(edge.from) || highlighted.has(edge.to);
          const strokeColor = isHi ? pal.coral : pal.ink;
          const sw = isHi ? 8 : 5;

          return (
            <g key={i}>
              <path
                d={pathStr}
                stroke={strokeColor}
                strokeWidth={sw}
                strokeLinecap="round"
                strokeDasharray={evolved.strokeDasharray}
                strokeDashoffset={evolved.strokeDashoffset}
                fill="none"
              />
              <Arrowhead x1={ex1} y1={ey1} x2={ex2} y2={ey2} color={strokeColor} progress={edgeProgress} />
              {edge.flow && srcVisible && dstVisible && (
                <FlowParticle x1={ex1} y1={ey1} x2={ex2} y2={ey2} frame={frame} color={pal.sky} />
              )}
              {edge.label && srcVisible && dstVisible && (
                <text
                  x={(srcPos.x + dstPos.x) / 2 + 12}
                  y={(srcPos.y + dstPos.y) / 2 - 22}
                  textAnchor="middle"
                  fill={pal.ink}
                  fontSize={36}
                  fontFamily={ff}
                  fontWeight="600"
                  stroke={pal.bg}
                  strokeWidth={8}
                  paintOrder="stroke"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Node divs */}
      {visual.nodes.map((node) => {
        const pos = positions[node.id];
        if (!pos || !visible.has(node.id)) return null;
        const revealFrame = getNodeRevealFrame(node.id, visual.reveal ?? [], dur);
        return (
          <NodeView
            key={node.id}
            node={node} pos={pos}
            isHighlighted={highlighted.has(node.id)}
            pal={pal} ff={ff}
            frame={frame} fps={fps} revealFrame={revealFrame}
          />
        );
      })}

      {/* Reveal caption (inside diagram safe area, above main captions) */}
      {caption && (
        <div
          style={{
            position: "absolute",
            left: 80, right: 80,
            bottom: 520,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: pal.ink,
              color: pal.white,
              borderRadius: 18,
              padding: "12px 32px",
              fontSize: 46,
              fontWeight: 600,
              fontFamily: ff,
              opacity: 0.92,
              textAlign: "center",
            }}
          >
            {caption}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ── StepsScene ─────────────────────────────────────────────────────────────

export const StepsScene: React.FC<{
  visual: Extract<SceneVisual, { type: "steps" }>;
  pal: Palette; dur: number; font?: string;
}> = ({ visual, pal, dur, font }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ff = fontFor(font);
  const n = visual.steps.length;

  // Current "active" step: advances through the scene
  const currentIdx = Math.min(n - 1, Math.floor((frame / dur) * n * 1.02));

  return (
    <AbsoluteFill style={{ background: pal.bg }}>
    <div
      style={{
        position: "absolute", left: 80, right: 80, top: SAFE_TOP, height: SAFE_H,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: 74,
          fontWeight: 700,
          color: pal.ink,
          fontFamily: ff,
          lineHeight: 1.15,
          letterSpacing: -1,
        }}
      >
        {visual.title}
      </div>

      {/* Accent rule */}
      <div style={{ width: 120, height: 8, background: pal.coral, borderRadius: 4, marginTop: 24, marginBottom: 48 }} />

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {visual.steps.map((step, i) => {
          const revealFrame = Math.round(dur * (i / n) * 0.9);
          const shown = frame >= revealFrame;

          const s = !shown ? 0 : spring({ frame: frame - revealFrame, fps, config: { damping: 14, stiffness: 160 }, from: 0, to: 1 });
          const isCurrent = i === currentIdx;

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 32,
                transform: `translateX(${interpolate(s, [0, 1], [-40, 0])}px)`,
                opacity: Math.min(1, s * 1.5),
                visibility: shown ? "visible" : "hidden",
              }}
            >
              {/* Number badge */}
              <div
                style={{
                  minWidth: 88,
                  height: 88,
                  borderRadius: "50%",
                  background: isCurrent ? pal.coral : pal.ink,
                  color: pal.white,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 52,
                  fontWeight: 700,
                  fontFamily: ff,
                  boxShadow: isCurrent ? `0 6px 24px ${pal.coral}88` : "none",
                  transform: isCurrent ? "scale(1.12)" : "scale(1)",
                  transition: "transform 0.3s",
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>

              {/* Step text */}
              <div
                style={{
                  fontSize: 54,
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? pal.ink : `${pal.ink}99`,
                  fontFamily: ff,
                  lineHeight: 1.25,
                  borderLeft: isCurrent ? `6px solid ${pal.coral}` : "6px solid transparent",
                  paddingLeft: 24,
                }}
              >
                {step}
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </AbsoluteFill>
  );
};

// ── NumberScene ────────────────────────────────────────────────────────────

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function formatAnimatedNumber(current: number, target: number): string {
  const abs = Math.abs(target);
  if (abs >= 1e12) return (current / 1e12).toFixed(abs >= 10e12 ? 1 : 2) + "T";
  if (abs >= 1e9)  return (current / 1e9).toFixed(abs >= 10e9 ? 1 : 2) + "B";
  if (abs >= 1e6)  return (current / 1e6).toFixed(abs >= 10e6 ? 1 : 2) + "M";
  if (abs >= 1e3)  return (current / 1e3).toFixed(abs >= 10e3 ? 0 : 1) + "K";
  return Math.round(current).toLocaleString();
}

export const NumberScene: React.FC<{
  visual: Extract<SceneVisual, { type: "number" }>;
  pal: Palette; dur: number; font?: string;
}> = ({ visual, pal, dur, font }) => {
  const frame = useCurrentFrame();
  const ff = fontFor(font);

  // Numbers (or purely numeric strings like "12,000") count up; any other string renders as text.
  const raw = visual.value;
  const numericStr = typeof raw === "string" && /^\s*-?[\d,]*\.?\d+\s*$/.test(raw);
  const targetNum = typeof raw === "number" ? raw : numericStr ? parseFloat(String(raw).replace(/,/g, "")) : NaN;
  const isNumber = Number.isFinite(targetNum);
  const isCountup = visual.animation !== "bar";
  const countProgress = easeOutCubic(Math.min(1, frame / Math.max(1, dur * 0.72)));
  const textProgress = easeOutCubic(Math.min(1, frame / Math.max(1, dur * 0.25)));

  const displayStr = !isNumber
    ? String(raw)
    : isCountup
      ? formatAnimatedNumber(targetNum * countProgress, targetNum)
      : formatAnimatedNumber(targetNum, targetNum);
  // Auto-shrink to fit the 920 px content width (approx. 0.6 em per glyph for bold sans).
  const valueSize = Math.round(Math.max(72, Math.min(260, 920 / Math.max(1, displayStr.length * 0.6))));
  const revealP = isNumber ? countProgress : textProgress;

  const barFill = visual.animation === "bar" ? Math.min(100, countProgress * 100) : 0;

  // Entrance spring
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14, stiffness: 100 }, from: 0, to: 1 });

  return (
    <AbsoluteFill style={{ background: pal.bg }}>
    <div
      style={{
        position: "absolute", left: 60, right: 60, top: SAFE_TOP, height: SAFE_H,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Large number / value text */}
      <div
        style={{
          fontSize: valueSize,
          whiteSpace: "nowrap",
          fontWeight: 700,
          fontFamily: ff,
          color: pal.coral,
          lineHeight: 1,
          letterSpacing: valueSize > 160 ? -4 : -1,
          transform: `scale(${0.7 + 0.3 * pop})`,
          opacity: pop,
          textAlign: "center",
        }}
      >
        {displayStr}
      </div>

      {/* Unit */}
      {visual.unit && (
        <div
          style={{
            fontSize: 72,
            fontWeight: 600,
            fontFamily: ff,
            color: pal.ink,
            marginTop: isNumber ? -12 : 16,
            textAlign: "center",
            opacity: revealP,
          }}
        >
          {visual.unit}
        </div>
      )}

      {/* Bar mode */}
      {visual.animation === "bar" && (
        <div
          style={{
            width: 760,
            height: 40,
            background: `${pal.ink}22`,
            borderRadius: 20,
            marginTop: 40,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${barFill}%`,
              height: "100%",
              background: pal.coral,
              borderRadius: 20,
            }}
          />
        </div>
      )}

      {/* Label */}
      <div
        style={{
          fontSize: 68,
          fontWeight: 600,
          fontFamily: ff,
          color: pal.ink,
          marginTop: 32,
          textAlign: "center",
          maxWidth: 800,
          lineHeight: 1.2,
          opacity: revealP,
        }}
      >
        {visual.label}
      </div>

      {/* Source */}
      {visual.source && (
        <div
          style={{
            fontSize: 38,
            fontWeight: 500,
            fontFamily: ff,
            color: `${pal.ink}66`,
            marginTop: 24,
            maxWidth: 900,
            textAlign: "center",
            opacity: revealP > 0.6 ? 1 : 0,
          }}
        >
          {visual.source}
        </div>
      )}
    </div>
    </AbsoluteFill>
  );
};

// ── CompareScene ───────────────────────────────────────────────────────────

export const CompareScene: React.FC<{
  visual: Extract<SceneVisual, { type: "compare" }>;
  pal: Palette; dur: number; font?: string;
}> = ({ visual, pal, dur, font }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ff = fontFor(font);
  const n = visual.rows.length;

  // Column header entrance
  const headS = spring({ frame, fps, config: { damping: 14, stiffness: 120 }, from: 0, to: 1 });

  // Winner revealed at 90% of dur
  const winnerVisible = frame >= dur * 0.88;

  const colW = 420;
  const isWinnerA = visual.winner === "A";
  const isWinnerB = visual.winner === "B";

  const header = (label: string, win: boolean) => (
    <div
      style={{
        width: colW,
        background: winnerVisible && win ? pal.mint : `${pal.ink}11`,
        borderRadius: 24,
        padding: "20px 32px",
        fontSize: 64,
        fontWeight: 700,
        color: pal.ink,
        textAlign: "center",
        border: winnerVisible && win ? `4px solid ${pal.mint}` : "4px solid transparent",
        boxSizing: "border-box",
      }}
    >
      {label}
      {winnerVisible && win && (
        <div style={{ fontSize: 36, fontWeight: 600, color: pal.ink, marginTop: 4 }}>✓ Winner</div>
      )}
    </div>
  );
  const cell = (text: string) => (
    <div
      style={{
        width: colW,
        background: pal.white,
        borderRadius: 18,
        padding: "22px 28px",
        fontSize: 52,
        fontWeight: 500,
        color: pal.ink,
        textAlign: "center",
        boxShadow: "0 3px 12px rgba(0,0,0,0.09)",
        lineHeight: 1.2,
        boxSizing: "border-box",
      }}
    >
      {text}
    </div>
  );

  return (
    <AbsoluteFill style={{ background: pal.bg, fontFamily: ff }}>
      {/* Content block centred vertically in the safe band; hidden rows keep their space so nothing jumps */}
      <div
        style={{
          position: "absolute", left: 60, right: 60, top: SAFE_TOP, height: SAFE_H,
          display: "flex", flexDirection: "column", justifyContent: "center",
        }}
      >
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 28 }}>
          {/* VS divider line */}
          <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 4, background: `${pal.ink}22`, transform: "translateX(-2px)" }} />
          <div
            style={{
              display: "flex", justifyContent: "space-between", marginBottom: 20,
              transform: `translateY(${interpolate(headS, [0, 1], [-30, 0])}px)`, opacity: headS,
            }}
          >
            {header(visual.colA, isWinnerA)}
            {header(visual.colB, isWinnerB)}
          </div>
          {visual.rows.map((row, i) => {
            const revealFrame = Math.round(dur * (i / n) * 0.88);
            const shown = frame >= revealFrame;
            const s = !shown ? 0 : spring({ frame: frame - revealFrame, fps, config: { damping: 14, stiffness: 150 }, from: 0, to: 1 });
            return (
              <div
                key={i}
                style={{
                  display: "flex", justifyContent: "space-between", gap: 20,
                  opacity: Math.min(1, s * 1.4), transform: `scale(${0.92 + 0.08 * s})`,
                  visibility: shown ? "visible" : "hidden",
                }}
              >
                {cell(row.a)}
                {cell(row.b)}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── PhotoScene ─────────────────────────────────────────────────────────────

export const PhotoScene: React.FC<{
  visual: Extract<SceneVisual, { type: "photo" }>;
  pal: Palette; dur: number; index: number; font?: string;
  grade?: { saturate?: number; contrast?: number; vignette?: number };
}> = ({ visual, pal, dur, index, font, grade }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ff = fontFor(font);

  const zoom: [number, number] = visual.zoom ?? [1.04, 1.12];
  const dir = index % 2 ? 1 : -1;
  const z = interpolate(frame, [0, dur], zoom);
  const tx = interpolate(frame, [0, dur], [-16 * dir, 16 * dir]);

  // Label chip fade-in
  const labelFade = interpolate(frame, [8, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: pal.ink }}>
      {/* Ken Burns photo */}
      <AbsoluteFill style={{ transform: `scale(${z}) translateX(${tx}px)`, filter: gradeCss(grade) }}>
        <Img src={staticFile(visual.still)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>

      {/* Gradient scrim */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)" }} />
      <Vignette amount={grade?.vignette} />

      {/* Label chip — top-left, within safe zone */}
      {visual.label && (
        <div
          style={{
            position: "absolute",
            top: 248,
            left: 72,
            opacity: labelFade,
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(8px)",
            borderRadius: 16,
            padding: "12px 28px",
            color: "#ffffff",
            fontSize: 46,
            fontWeight: 600,
            fontFamily: ff,
          }}
        >
          {visual.label}
        </div>
      )}

      {/* Lower-third */}
      {visual.lowerThird && (
        <div
          style={{
            position: "absolute",
            bottom: 560,
            left: 72,
            right: 72,
            opacity: labelFade,
            color: "rgba(255,255,255,0.72)",
            fontSize: 38,
            fontWeight: 500,
            fontFamily: ff,
          }}
        >
          {visual.lowerThird}
        </div>
      )}

      {/* Optional term sticker */}
      {visual.term && (
        <TermSticker term={visual.term} pal={pal} delay={Math.round(dur * 0.22)} font={font} />
      )}
    </AbsoluteFill>
  );
};
