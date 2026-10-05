/**
 * DataScenes.tsx — information in its natural form (STYLE-IDENTITY-PLAN S2): ChartScene (line / bar / diverging bar),
 * TimelineScene (vertical spine of dated events), ForcesScene (two opposing pushes on one outcome).
 *
 * Tokens come from useLook() (fonts display/body/mono, palette roles, radius, border, stroke, shadow, spring, entrance, stagger) and
 * <Backdrop />, so each scene takes on any identity; with no identity the "off" look (profile font, episode palette) is used.
 * Tones map onto palette roles: accent = sunny, accent2 = sky, warn = coral, good = mint. Layout stays inside `safe`: text in the
 * lower frame stops at the right rail (railRight), nothing reaches the 2-line word-caption band (captionClearY). Deterministic.
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { evolvePath } from "@remotion/paths";
import type { Palette, SafeZone, Tone, VisualChart, VisualForces, VisualTimeline } from "./types";
import { DEFAULT_SAFE, captionClearY, railRight } from "./profile";
import { Backdrop, EASE, onFill, useLook, type Look } from "./identity";

// ── Shared helpers ─────────────────────────────────────────────────────────

const hex6 = (c: string) => /^#[0-9a-fA-F]{6}$/.test(c);
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string) => {
  if (!hex6(a) || !hex6(b)) return 21;
  const [p, q] = [lum(a), lum(b)];
  return (Math.max(p, q) + 0.05) / (Math.min(p, q) + 0.05);
};
/** A tone colour used as TEXT: kept if it reads on the background (>= 3:1, large text), else ink. */
const readable = (c: string, pal: Palette) => (contrast(c, pal.bg) >= 3 ? c : pal.ink);
/** Alpha tint of a 6-digit palette colour (other formats are returned unchanged). */
const tint = (c: string, a: string) => (hex6(c) ? c + a : c);
const toneColor = (pal: Palette, t: Tone | undefined, d: string) =>
  t === "accent" ? pal.sunny : t === "accent2" ? pal.sky : t === "warn" ? pal.coral : t === "good" ? pal.mint : d;
const MINUS = "−";

/** Content band: sides from the safe zone (right edge at the rail), bottom above the caption band (default captions sit at 300). */
const band = (safe: SafeZone) => ({
  x0: safe.left + 10,
  x1: railRight(safe) - 10,
  y0: safe.top,
  y1: Math.min(safe.top + safe.height, captionClearY({ ...safe, captionBottom: safe.captionBottom ?? 300 })),
});

const tok = (L: Look, pal: Palette) => ({
  muted: L.id?.palette.muted ?? tint(pal.ink, "99"),
  rule: L.id?.palette.rule ?? tint(pal.ink, "2E"),
  surface: L.id?.palette.surface ?? pal.white,
  num: { fontFamily: L.mono, fontVariantNumeric: "tabular-nums" } as React.CSSProperties,
  st: L.stagger || 4,
  ease: EASE[L.id?.motion.ease ?? "out-cubic"] ?? EASE["out-cubic"],
});

/** Entrance style for an element starting at `start` (identity: its entrance recipe; off: a soft rise). */
const entrance = (L: Look, frame: number, fps: number, start: number): React.CSSProperties => {
  const p = frame < start ? 0 : L.enter(frame, start, fps, { damping: 200, stiffness: 120 });
  return L.fx(p, { opacity: Math.min(1, Math.max(0, p) * 1.4), transform: `translateY(${(1 - Math.min(1, p)) * 24}px)` });
};

const lines = (text: string, size: number, width: number, gw = 0.55) => Math.max(1, Math.ceil((text.length * size * gw) / Math.max(1, width)));

/** Title (display, top-left) + optional subtitle; returns the element and its height. */
const header = (L: Look, pal: Palette, frame: number, fps: number, x0: number, w: number, y0: number, title?: string, sub?: React.ReactNode, subLen = 0) => {
  const ts = 60, th = title ? lines(title, ts, w, L.gw * 0.95) * ts * 1.12 : 0;
  const sh = sub ? lines("x".repeat(subLen), 34, w) * 34 * 1.3 + (title ? 10 : 0) : 0;
  const el = (
    <div style={{ position: "absolute", left: x0, top: y0, width: w }}>
      {title && (
        <div style={{ fontFamily: L.display, fontWeight: L.dw(700), fontSize: ts, lineHeight: 1.12, color: pal.ink, letterSpacing: -0.5, ...entrance(L, frame, fps, 0) }}>
          {title}
        </div>
      )}
      {sub && (
        <div style={{ fontFamily: L.body, fontWeight: L.bw(600), fontSize: 34, lineHeight: 1.3, marginTop: title ? 10 : 0, color: tok(L, pal).muted, ...entrance(L, frame, fps, tok(L, pal).st) }}>
          {sub}
        </div>
      )}
    </div>
  );
  return { el, h: th + sh };
};

const footer = (L: Look, pal: Palette, x0: number, w: number, y1: number, source: string | undefined, op: number) =>
  source ? (
    <div style={{ position: "absolute", left: x0, width: w, top: y1 - 40, fontFamily: L.mono, fontSize: 28, lineHeight: 1.2, color: tok(L, pal).muted, opacity: op,
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", ...(L.caps ? { textTransform: "uppercase", letterSpacing: 1 } : {}) }}>
      {/^source/i.test(source) ? source : `Source: ${source}`}
    </div>
  ) : null;

// ── Number formatting (shared by chart and forces) ─────────────────────────

const makeFmt = (values: number[], unit?: string) => {
  const maxAbs = Math.max(0, ...values.map(Math.abs));
  const dec = values.some((v) => Math.abs(v - Math.round(v)) > 1e-9) ? 1 : 0;
  const compact = maxAbs >= 100000;
  const pct = unit?.trim() === "%";
  const body = (a: number, tick: boolean) => {
    if (compact && a >= 1000) {
      const [d, s] = a >= 1e9 ? [1e9, "B"] : a >= 1e6 ? [1e6, "M"] : [1e3, "K"];
      const t = (a / d).toFixed(1);
      return (tick ? t.replace(/\.0$/, "") : t) + s;
    }
    return a.toLocaleString("en-US", { minimumFractionDigits: tick ? 0 : dec, maximumFractionDigits: tick ? 2 : dec });
  };
  return (v: number, signed = false, tick = false) => {
    const a = Math.abs(v), s = v < 0 && a > 1e-12 ? MINUS : signed && v > 0 ? "+" : "";
    return s + body(a, tick) + (pct ? "%" : "");
  };
};

/** 3-4 round values inside [lo, hi] (the smallest round step that gives at most 4). */
const ticksFor = (lo: number, hi: number) => {
  const span = hi - lo || 1, base = 10 ** Math.floor(Math.log10(span));
  for (const m of [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10]) {
    const st = base * m, t0 = Math.ceil(lo / st - 1e-9) * st, n = Math.floor((hi - t0) / st + 1e-9) + 1;
    if (n <= 4) return Array.from({ length: n }, (_, i) => +(t0 + i * st).toFixed(10));
  }
  return [lo, hi];
};

type Box = { x: number; y: number; w: number; h: number };
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

// ── ChartScene ─────────────────────────────────────────────────────────────

export const ChartScene: React.FC<{ visual: VisualChart; pal: Palette; dur: number; font?: string; safe?: SafeZone }> = ({ visual, pal, dur, font, safe = DEFAULT_SAFE }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLook(font);
  const T = tok(L, pal);
  const { x0, x1, y0, y1 } = band(safe);
  const W = x1 - x0;
  const bar = visual.kind === "bar";
  const series = (visual.series ?? []).filter((s) => s.points?.length);
  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))];
  const nx = Math.max(1, xs.length), ns = Math.max(1, series.length);
  const focal = Math.max(0, series.findIndex((s) => s.label === visual.highlight?.series));
  const all = series.flatMap((s) => s.points.map((p) => p.y));
  const hasNeg = all.some((v) => v < 0), hasPos = all.some((v) => v > 0);
  const diverging = bar && series.length === 1 && !series[0].tone && hasNeg && hasPos;
  const fmt = makeFmt(all, visual.unit);
  const signed = hasNeg && hasPos;
  const colorOf = (si: number, v: number) =>
    diverging ? (v < 0 ? pal.coral : pal.mint) : si === focal ? toneColor(pal, series[si].tone, pal.sunny) : series[si].tone ? toneColor(pal, series[si].tone, T.muted) : T.muted;

  // Header: title + direct series label(s) and unit (no legend box: single series = one coloured line under the title)
  const unitTxt = visual.unit && visual.unit.trim() !== "%" ? visual.unit : "";
  const subParts = series.map((s, si) => (
    <span key={si} style={{ color: diverging ? pal.ink : readable(colorOf(si, 1), pal) }}>{si ? "  vs  " : ""}{s.label}</span>
  ));
  const subLen = series.reduce((n, s) => n + s.label.length + 6, 0) + unitTxt.length + 3;
  const head = header(L, pal, frame, fps, x0, W, y0, visual.title, series.length ? <>{subParts}{unitTxt ? <span>{"  ·  "}{unitTxt}</span> : null}</> : undefined, subLen);

  // Vertical scale. Bars always include zero (no truncated bar axis); lines only with zero: true.
  let lo = Math.min(...all, bar || visual.zero ? 0 : Infinity), hi = Math.max(...all, bar || visual.zero ? 0 : -Infinity);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) { lo = 0; hi = 1; }
  if (hi - lo < 1e-9) { hi += 1; if (!bar) lo -= 1; }
  if (!bar && !visual.zero) { const pad = (hi - lo) * 0.1; lo -= pad; hi += pad; }
  const ticks = ticksFor(lo, hi);
  const footH = visual.source ? 64 : 0;
  const plotTop = y0 + head.h + 40;
  const plotBottom = y1 - footH - (bar ? (hasNeg ? 8 : 52) : 58);   // bars: x labels sit at the baseline; lines: below the plot
  const innerTop = plotTop + 52;                                   // room for value labels above the highest mark
  const innerBottom = plotBottom - (bar ? (hasNeg ? 52 : 0) : 48);
  const y = (v: number) => innerBottom - ((v - lo) / (hi - lo)) * (innerBottom - innerTop);
  const tickSize = 28;
  const gutter = Math.max(...ticks.map((t) => fmt(t, false, true).length)) * tickSize * 0.6 + 18;
  const px0 = x0 + gutter;
  const slot = (x1 - px0) / nx;
  const cx = (i: number) => px0 + slot * (i + 0.5);
  const valSize = Math.max(28, Math.min(36, (slot * (bar ? 0.98 : 0.9)) / (Math.max(...all.map((v) => fmt(v, signed).length)) * 0.6)));
  const gridW = Math.max(2, L.sw(3));

  // Timing
  const bst = Math.max(2, Math.min(T.st * 2, Math.floor((dur * 0.4) / nx)));
  const barStart = (i: number) => 8 + i * bst;
  const drawEnd = Math.max(40, Math.round(dur * 0.5));
  const lp = bar ? 1 : interpolate(frame, [8, drawEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: T.ease });
  const hlStart = Math.min(Math.round(dur * 0.7), bar ? barStart(nx - 1) + 26 : drawEnd + 6);
  const axisOp = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  // Marks + obstacle boxes (for placing the highlight callout)
  const obstacles: Box[] = [];
  const marks: React.ReactNode[] = [];
  const labels: React.ReactNode[] = [];
  const hl = visual.highlight;
  const hlIdx = hl ? xs.indexOf(hl.x) : -1;
  let anchor: { x: number; y: number } | null = null;
  const dim = hl && hlIdx >= 0 ? interpolate(frame, [hlStart, hlStart + 12], [1, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const y0px = y(0);

  if (bar) {
    const groupW = slot * (ns > 1 ? 0.78 : 0.62), bw = groupW / ns;
    xs.forEach((x, i) => {
      const p = Math.max(0, L.enter(frame, barStart(i), fps, { damping: 200, stiffness: 110 }));
      const groupSum = series.reduce((s, se) => s + (se.points.find((q) => q.x === x)?.y ?? 0), 0);
      series.forEach((s, si) => {
        const pt = s.points.find((q) => q.x === x);
        if (!pt) return;
        const bx = cx(i) - groupW / 2 + si * bw + bw * 0.06, w = bw * 0.88;
        const end = y0px + (y(pt.y) - y0px) * Math.min(1.06, p);
        const top = Math.min(y0px, end), h = Math.abs(end - y0px);
        const c = colorOf(si, pt.y);
        const isHl = i === hlIdx && si === focal;
        marks.push(<rect key={`b${i}-${si}`} x={bx} y={top} width={w} height={Math.max(0, h)} fill={c} rx={Math.min(L.r(6), w / 4)} opacity={isHl ? 1 : dim} />);
        const vy = pt.y < 0 ? y(pt.y) + valSize + 8 : y(pt.y) - 12;
        const vop = interpolate(p, [0.8, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        labels.push(
          <text key={`v${i}-${si}`} x={bx + w / 2} y={vy} textAnchor="middle" fontSize={valSize} fontWeight={700} fill={readable(c, pal)} opacity={vop} style={T.num}>
            {fmt(pt.y, signed)}
          </text>,
        );
        obstacles.push({ x: bx, y: Math.min(y0px, y(pt.y)), w, h: Math.abs(y(pt.y) - y0px) }, { x: bx + w / 2 - 70, y: vy - valSize, w: 140, h: valSize + 6 });
        if (isHl) anchor = { x: bx + w / 2, y: y(pt.y) };
      });
      // x label on the opposite side of the baseline from the bar (diverging style); all-positive: below the baseline
      const ly = groupSum < 0 ? y0px - 16 : y0px + 40;
      labels.push(
        <text key={`x${i}`} x={cx(i)} y={ly} textAnchor="middle" fontSize={30} fontWeight={L.bw(600)} fontFamily={L.body} fill={pal.ink} opacity={axisOp}>
          {x}
        </text>,
      );
      obstacles.push({ x: cx(i) - 50, y: ly - 30, w: 100, h: 36 });
    });
  } else {
    series.forEach((s, si) => {
      const pts = s.points.map((q) => ({ x: cx(xs.indexOf(q.x)), y: y(q.y), v: q.y, k: q.x }));
      const d = pts.map((q, k) => `${k ? "L" : "M"} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" ");
      const c = colorOf(si, 1);
      const isF = si === focal;
      const ev = pts.length > 1 ? evolvePath(lp, d) : { strokeDasharray: "none", strokeDashoffset: 0 };
      marks.push(
        <path key={`l${si}`} d={d} fill="none" stroke={c} strokeWidth={isF ? L.sw(8) : L.sw(5)} strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />,
      );
      pts.forEach((q, k) => {
        const op = interpolate(lp * Math.max(1, pts.length - 1) - k, [-0.25, 0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        marks.push(<circle key={`d${si}-${k}`} cx={q.x} cy={q.y} r={isF ? 12 : 8} fill={c} stroke={pal.bg} strokeWidth={4} opacity={op} />);
        obstacles.push({ x: q.x - 22, y: q.y - 22, w: 44, h: 44 });
        if (k) for (let t = 0.1; t < 1; t += 0.1) obstacles.push({ x: pts[k - 1].x + (q.x - pts[k - 1].x) * t - 8, y: pts[k - 1].y + (q.y - pts[k - 1].y) * t - 8, w: 16, h: 16 });
        if (isF && pts.length <= 8) {
          // value label: above a local high, below a local low
          const nb = [pts[k - 1], pts[k + 1]].filter(Boolean).map((z) => z!.v);
          const above = nb.length === 0 || q.v >= Math.max(...nb) || (q.v > Math.min(...nb) && q.v >= nb.reduce((a, b) => a + b, 0) / nb.length);
          const vy = above ? q.y - 26 : q.y + valSize + 18;
          labels.push(
            <text key={`v${si}-${k}`} x={q.x} y={vy} textAnchor="middle" fontSize={valSize} fontWeight={700} fill={readable(c, pal)} opacity={op} style={T.num}
              stroke={pal.bg} strokeWidth={8} paintOrder="stroke">
              {fmt(q.v, signed)}
            </text>,
          );
          obstacles.push({ x: q.x - 70, y: vy - valSize, w: 140, h: valSize + 6 });
        }
        if (isF && q.k === hl?.x) anchor = { x: q.x, y: q.y };
      });
    });
    xs.forEach((x, i) =>
      labels.push(
        <text key={`x${i}`} x={cx(i)} y={plotBottom + 42} textAnchor="middle" fontSize={30} fontWeight={L.bw(600)} fontFamily={L.body} fill={pal.ink} opacity={axisOp}>
          {x}
        </text>,
      ),
    );
  }

  // Highlight callout: the free spot nearest the mark (least overlap with marks/labels), thin leader line, AFTER the mark is drawn
  let callout: React.ReactNode = null;
  if (hl && anchor) {
    const a = anchor as { x: number; y: number };
    const fs = 32, maxW = Math.min(560, W * 0.78);
    const bw = Math.min(maxW, hl.label.length * fs * 0.6 + 52);
    const bh = lines(hl.label, fs, bw - 52, 0.6) * fs * 1.25 + 34;
    let best: Box = { x: x0, y: plotTop, w: bw, h: bh }, bestS = Infinity;
    for (let bx = x0; bx <= x1 - bw; bx += 10) {
      for (let by = plotTop; by <= plotBottom - bh; by += 10) {
        const b = { x: bx, y: by, w: bw, h: bh };
        const ov = obstacles.reduce((s, o) => s + overlap(b, o), 0) + overlap(b, { x: a.x - 30, y: a.y - 30, w: 60, h: 60 }) * 4;
        const dx = Math.max(b.x - a.x, 0, a.x - (b.x + b.w)), dy = Math.max(b.y - a.y, 0, a.y - (b.y + b.h));
        const s = ov * 3 + Math.hypot(dx, dy) * 2 + (dx + dy < 24 ? 400 : 0);
        if (s < bestS) { bestS = s; best = b; }
      }
    }
    const sx = Math.max(best.x, Math.min(a.x, best.x + best.w)), sy = Math.max(best.y, Math.min(a.y, best.y + best.h));
    const len = Math.hypot(a.x - sx, a.y - sy) || 1;
    const ex = a.x - ((a.x - sx) / len) * 16, ey = a.y - ((a.y - sy) / len) * 16;
    const leadP = interpolate(frame, [hlStart, hlStart + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: T.ease });
    const ld = `M ${sx.toFixed(1)} ${sy.toFixed(1)} L ${ex.toFixed(1)} ${ey.toFixed(1)}`;
    const lev = evolvePath(leadP, ld);
    const c = colorOf(focal, 1);
    callout = (
      <>
        <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          <path d={ld} stroke={pal.ink} strokeWidth={Math.max(2, L.sw(3))} fill="none" strokeDasharray={lev.strokeDasharray} strokeDashoffset={lev.strokeDashoffset} opacity={leadP > 0 ? 0.85 : 0} />
          <circle cx={a.x} cy={a.y} r={leadP >= 1 && !bar ? 22 : 0} fill="none" stroke={pal.ink} strokeWidth={Math.max(2, L.sw(3))} opacity={0.85} />
        </svg>
        <div style={{ position: "absolute", left: best.x, top: best.y, width: best.w, height: best.h, boxSizing: "border-box", padding: "14px 22px",
          background: T.surface, border: `${Math.max(2, L.b(3))}px solid ${pal.ink}`, borderLeft: `${Math.max(6, L.sw(8))}px solid ${readable(c, pal)}`, borderRadius: L.r(14),
          boxShadow: L.shadow("0 6px 18px rgba(0,0,0,0.14)"), fontFamily: L.body, fontWeight: L.bw(600), fontSize: fs, lineHeight: 1.25, color: pal.ink,
          display: "flex", alignItems: "center", ...entrance(L, frame, fps, hlStart + 6) }}>
          {hl.label}
        </div>
      </>
    );
  }

  return (
    <AbsoluteFill style={{ background: pal.bg }}>
      <Backdrop />
      {head.el}
      <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <g opacity={axisOp}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={px0} x2={x1} y1={y(t)} y2={y(t)} stroke={Math.abs(t) < 1e-12 && lo < 0 ? pal.ink : T.rule} strokeWidth={Math.abs(t) < 1e-12 ? gridW + 1 : gridW} opacity={Math.abs(t) < 1e-12 ? 0.8 : 1} />
              <text x={px0 - 14} y={y(t) + 10} textAnchor="end" fontSize={tickSize} fill={T.muted} style={T.num}>{fmt(t, false, true)}</text>
            </g>
          ))}
          {bar && !ticks.some((t) => Math.abs(t) < 1e-12) && <line x1={px0} x2={x1} y1={y0px} y2={y0px} stroke={pal.ink} strokeWidth={gridW + 1} opacity={0.8} />}
        </g>
        {marks}
        {labels}
      </svg>
      {callout}
      {footer(L, pal, x0, W, y1, visual.source, axisOp)}
    </AbsoluteFill>
  );
};

// ── TimelineScene ──────────────────────────────────────────────────────────

export const TimelineScene: React.FC<{ visual: VisualTimeline; pal: Palette; dur: number; font?: string; safe?: SafeZone }> = ({ visual, pal, dur, font, safe = DEFAULT_SAFE }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLook(font);
  const T = tok(L, pal);
  const { x0, x1, y0, y1 } = band(safe);
  const W = x1 - x0;
  const ev = visual.events ?? [];
  const n = ev.length;
  const head = header(L, pal, frame, fps, x0, W, y0, visual.title);
  const yA = y0 + head.h + (visual.title ? 56 : 0), yB = y1 - (visual.source ? 64 : 0) - 10;

  // Columns: `when` (mono, right-aligned) | spine | text
  const whenSize = 30;
  const whenW = Math.min(230, Math.max(90, ...ev.map((e) => e.when.length * whenSize * 0.66)));
  const spineX = x0 + whenW + 46, tx = spineX + 44, tw = x1 - tx;

  // Sizes: shrink to fit the band (never below 28 px)
  const fit = (s: number) => {
    const fsOf = (e: VisualTimeline["events"][number]) => Math.max(28, (e.emphasis ? 54 : 44) * s), dsz = Math.max(28, 32 * s);
    const hs = ev.map((e) => {
      const fs = fsOf(e), pad = e.emphasis ? 36 : 0;
      return lines(e.label, fs, tw - pad, 0.54) * fs * 1.15 + (e.detail ? 8 + lines(e.detail, dsz, tw - pad, 0.52) * dsz * 1.25 : 0) + pad;
    });
    return { fsOf, dsz, hs, sum: hs.reduce((a, b) => a + b, 0) };
  };
  let sz = fit(1);
  const minGap = 24;
  for (let s = 0.95; s >= 0.6 && sz.sum + minGap * (n - 1) > yB - yA; s -= 0.05) sz = fit(s);
  const gap = n > 1 ? Math.max(minGap, Math.min(84, (yB - yA - sz.sum) / (n - 1))) : 0;
  const total = sz.sum + gap * (n - 1);
  let cy = yA + Math.max(0, (yB - yA - total) / 2);
  const tops = sz.hs.map((h) => { const t = cy; cy += h + gap; return t; });

  // Reveal: one event at a time across the scene; inside an event the parts follow the identity stagger
  const step = n > 1 ? (dur * 0.68) / (n - 1) : 0;
  const at = (i: number) => Math.round(10 + i * step);
  const dotY = (i: number) => tops[i] + (ev[i].emphasis ? 18 : 0) + sz.fsOf(ev[i]) * 0.6;
  const cur = ev.reduce((k, _e, i) => (frame >= at(i) ? i : k), -1);
  const spineEnd = cur < 0 ? dotY(0) : cur >= n - 1 ? dotY(n - 1)
    : interpolate(frame, [at(cur), at(cur + 1)], [dotY(cur), dotY(cur + 1)], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: T.ease });
  const spineW = Math.max(3, L.sw(5));

  return (
    <AbsoluteFill style={{ background: pal.bg }}>
      <Backdrop />
      {head.el}
      {n > 0 && (
        <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <line x1={spineX} x2={spineX} y1={dotY(0)} y2={dotY(n - 1)} stroke={T.rule} strokeWidth={spineW} strokeLinecap="round" />
          <line x1={spineX} x2={spineX} y1={dotY(0)} y2={spineEnd} stroke={pal.ink} strokeWidth={spineW} strokeLinecap="round" opacity={cur >= 0 ? 0.8 : 0} />
          {ev.map((e, i) => {
            const p = frame < at(i) ? 0 : Math.max(0, L.enter(frame, at(i), fps, { damping: 14, stiffness: 160 }));
            const c = toneColor(pal, e.tone, pal.ink);
            const r = e.emphasis ? 20 : 13;
            return (
              <g key={i} opacity={Math.min(1, p * 2)}>
                {e.emphasis && <circle cx={spineX} cy={dotY(i)} r={(r + 12) * Math.min(1.1, p)} fill="none" stroke={c} strokeWidth={Math.max(2, L.sw(4))} />}
                <circle cx={spineX} cy={dotY(i)} r={r * Math.min(1.15, p)} fill={c} stroke={pal.bg} strokeWidth={4} />
              </g>
            );
          })}
        </svg>
      )}
      {ev.map((e, i) => {
        const c = toneColor(pal, e.tone, pal.ink);
        const fs = sz.fsOf(e);
        const showWhen = i === 0 || ev[i - 1].when !== e.when;
        const card = e.emphasis;
        return (
          <React.Fragment key={i}>
            {showWhen && (
              <div style={{ position: "absolute", left: x0, width: whenW, top: dotY(i) - whenSize * 0.62, textAlign: "right", fontSize: whenSize, lineHeight: 1.2, fontWeight: 600,
                color: e.emphasis ? readable(c, pal) : T.muted, whiteSpace: "nowrap", ...T.num, ...(L.caps ? { textTransform: "uppercase", letterSpacing: 1 } : {}), ...entrance(L, frame, fps, at(i)) }}>
                {e.when}
              </div>
            )}
            <div style={{ position: "absolute", left: tx, width: tw, top: tops[i], boxSizing: "border-box", padding: card ? "18px 18px" : 0,
              background: card ? tint(c, "1F") : undefined, borderRadius: card ? L.r(16) : 0, borderLeft: card ? `${Math.max(4, L.sw(6))}px solid ${c}` : undefined,
              ...entrance(L, frame, fps, at(i) + T.st) }}>
              <div style={{ fontFamily: card ? L.display : L.body, fontWeight: card ? L.dw(700) : L.bw(600), fontSize: fs, lineHeight: 1.15, color: card ? readable(c, pal) : pal.ink }}>
                {e.label}
              </div>
              {e.detail && (
                <div style={{ fontFamily: L.body, fontWeight: L.bw(500), fontSize: sz.dsz, lineHeight: 1.25, marginTop: 8, color: T.muted, ...entrance(L, frame, fps, at(i) + 2 * T.st) }}>
                  {e.detail}
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}
      {footer(L, pal, x0, W, y1, visual.source, interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" }))}
    </AbsoluteFill>
  );
};

// ── ForcesScene ────────────────────────────────────────────────────────────

export const ForcesScene: React.FC<{ visual: VisualForces; pal: Palette; dur: number; font?: string; safe?: SafeZone }> = ({ visual, pal, dur, font, safe = DEFAULT_SAFE }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLook(font);
  const T = tok(L, pal);
  const { x0, x1, y0, y1 } = band(safe);
  const { left: A, right: B, center: C } = visual;
  // The arrow row sits above the rail notch, so it may use the full width between the side insets.
  const xL = safe.left + 10, xR = 1080 - safe.right - 10, mid = (xL + xR) / 2;
  const head = header(L, pal, frame, fps, xL, xR - xL, y0, visual.title);
  const yA = y0 + head.h + (visual.title ? 48 : 0), yB = y1 - (visual.source ? 64 : 0) - 10;

  const vmax = Math.max(Math.abs(A.value), Math.abs(B.value), 1e-9);
  const k = (v: number) => Math.max(0.4, Math.abs(v) / vmax);    // normalised to the larger force, sensible minimum
  const R = 118, gap = 10, Tmax = 150, head_ = 64;
  const Lmax = mid - R - gap - xL;
  const lenL = Lmax * k(A.value), lenR = Lmax * k(B.value), tL = Tmax * k(A.value), tR = Tmax * k(B.value);
  const fmt = makeFmt([A.value, B.value]);
  const labelSize = 46;
  const labelH = Math.max(lines(A.label, labelSize, Lmax), lines(B.label, labelSize, Lmax)) * labelSize * 1.15;
  const outcomeW = Math.min(xR - xL, 2 * (railRight(safe) - mid) - 20);
  const outH = (C.outcome ? lines(C.outcome, 50, outcomeW) * 50 * 1.2 + 36 : 0);
  const groupH = labelH + 24 + Math.max(Tmax + 44, 2 * R) + outH;
  let ay = yA + Math.max(0, (yB - yA - groupH) / 2) + labelH + 24 + Math.max(Tmax + 44, 2 * R) / 2;
  if (safe.railFromY !== undefined) ay = Math.min(ay, safe.railFromY - 12 - (Tmax + 44) / 2); // the full-width arrow row stays above the rail

  // Motion: arrows slide in from the edges and press on the marker; the marker gives way toward the weaker side, then settles
  const push = interpolate(frame, [8, 8 + Math.max(24, dur * 0.3)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: T.ease });
  const pressAt = 8 + Math.round(Math.max(24, dur * 0.3) * 0.8);
  const giveP = frame < pressAt ? 0 : L.enter(frame, pressAt, fps, { damping: 12, stiffness: 90 });
  const diff = (Math.abs(B.value) - Math.abs(A.value)) / vmax;    // > 0: right stronger, the marker moves left
  const nudge = diff === 0 ? 0 : Math.sign(diff) * -(18 + 60 * Math.min(1, Math.abs(diff) * 4));
  const mx = mid + nudge * giveP;
  const markerP = L.enter(frame, 0, fps, { damping: 200, stiffness: 120 });

  const arrow = (side: "l" | "r", f: VisualForces["left"], len: number, th: number) => {
    const c = toneColor(pal, f.tone, side === "l" ? pal.coral : pal.mint);
    const tip0 = side === "l" ? mx - R - gap : mx + R + gap;
    const off = (1 - push) * (len + 120) * (side === "l" ? -1 : 1); // starts outside the frame edge
    const tip = tip0 + off, dir = side === "l" ? 1 : -1;
    const tail = tip - dir * len, neck = tip - dir * head_;
    const hh = th / 2 + 22;
    const pts = [[tail, ay - th / 2], [neck, ay - th / 2], [neck, ay - hh], [tip, ay], [neck, ay + hh], [neck, ay + th / 2], [tail, ay + th / 2]]
      .map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
    const valTxt = fmt(f.value);
    const vSize = 56, unit = f.unit ?? "";
    const bodyLen = len - head_;
    const inside = th >= 104 && bodyLen >= Math.max(valTxt.length * vSize * 0.6, unit.length * 28 * 0.6) + 28;
    const tc = onFill(c, pal.ink, pal.bg);
    const bodyMid = (tail + neck) / 2;
    return (
      <g key={side}>
        <polygon points={pts} fill={c} stroke={L.on && L.id!.shape.border > 0 ? pal.ink : "none"} strokeWidth={L.on ? L.b(2) : 0} strokeLinejoin="round" />
        {inside ? (
          <g opacity={push > 0.85 ? 1 : 0}>
            <text x={bodyMid} y={ay + (unit ? 6 : 20)} textAnchor="middle" fontSize={vSize} fontWeight={700} fill={tc} style={T.num}>{valTxt}</text>
            {unit && <text x={bodyMid} y={ay + 46} textAnchor="middle" fontSize={30} fontWeight={600} fontFamily={L.body} fill={tc}>{unit}</text>}
          </g>
        ) : (
          <text x={bodyMid} y={ay + hh + 44} textAnchor="middle" fontSize={40} fontWeight={700} fill={readable(c, pal)} opacity={push > 0.85 ? 1 : 0} style={T.num}>
            {valTxt}{unit ? ` ${unit}` : ""}
          </text>
        )}
      </g>
    );
  };

  const dirC = C.direction === "up" ? pal.mint : C.direction === "down" ? pal.coral : T.muted;
  const chev = C.direction === "up" ? "M -22 10 L 0 -12 L 22 10" : C.direction === "down" ? "M -22 -10 L 0 12 L 22 -10" : "M -22 0 L 22 0";
  const cSize = Math.max(28, Math.min(54, (2 * R - 30) / Math.max(1, C.label.length * L.gw)));
  const mr = Math.min(R, L.r(R)); // identity radius: circle for soft looks, squarer for ledger/blueprint
  const sideLabel = (f: VisualForces["left"], side: "l" | "r", th: number) => (
    <div style={{ position: "absolute", top: ay - Math.max(th / 2 + 22, R) - 18 - labelH, height: labelH, width: Lmax, display: "flex", alignItems: "flex-end",
      ...(side === "l" ? { left: xL } : { left: xR - Lmax, justifyContent: "flex-end", textAlign: "right" }),
      fontFamily: L.body, fontWeight: L.bw(700) >= 600 ? L.bw(700) : 700, fontSize: labelSize, lineHeight: 1.15,
      color: readable(toneColor(pal, f.tone, side === "l" ? pal.coral : pal.mint), pal), ...entrance(L, frame, fps, side === "l" ? 4 : 4 + T.st) }}>
      {f.label}
    </div>
  );

  return (
    <AbsoluteFill style={{ background: pal.bg }}>
      <Backdrop />
      {head.el}
      {sideLabel(A, "l", tL)}
      {sideLabel(B, "r", tR)}
      <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <line x1={xL} x2={xR} y1={ay} y2={ay} stroke={T.rule} strokeWidth={Math.max(2, L.sw(3))} opacity={0.8} />
        {arrow("l", A, lenL, tL)}
        {arrow("r", B, lenR, tR)}
        <g transform={`translate(${mx.toFixed(1)} ${ay}) scale(${(0.7 + 0.3 * Math.min(1, markerP)).toFixed(3)})`} opacity={Math.min(1, markerP * 1.5)}>
          <rect x={-R} y={-R} width={2 * R} height={2 * R} rx={mr} fill={T.surface} stroke={pal.ink} strokeWidth={Math.max(3, L.sw(5))} />
          <text x={0} y={C.direction ? -6 : cSize * 0.35} textAnchor="middle" fontSize={cSize} fontWeight={L.dw(700)} fontFamily={L.display} fill={pal.ink}>{C.label}</text>
          {C.direction && (
            <path d={chev} transform={`translate(0 ${46})`} fill="none" stroke={dirC} strokeWidth={Math.max(6, L.sw(8))} strokeLinecap="round" strokeLinejoin="round"
              opacity={giveP > 0.2 ? 1 : 0} />
          )}
        </g>
      </svg>
      {C.outcome && (
        <div style={{ position: "absolute", left: mid - outcomeW / 2, width: outcomeW, top: ay + Math.max(R, Tmax / 2 + 22) + 36, textAlign: "center",
          fontFamily: L.display, fontWeight: L.dw(700), fontSize: 50, lineHeight: 1.2, color: pal.ink, ...entrance(L, frame, fps, pressAt + 6) }}>
          {C.outcome}
        </div>
      )}
      {footer(L, pal, x0, x1 - x0, y1, visual.source, interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" }))}
    </AbsoluteFill>
  );
};
