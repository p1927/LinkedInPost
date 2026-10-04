/**
 * OrbitScene.tsx — spacecraft / orbital-mechanics explainer
 *
 * Modes:
 *   "orbit"       (default) top-down orbit diagram: rings, bodies, filled gap wedge, burns
 *   "cannon"      Newton's cannon: three shots integrated under inverse-square gravity
 *   "groundtrack" equirectangular strip: successive ground-track laps drift west, launch window over the pad
 *
 * Canvas 1080x1920, safe zone x 60-1020, y 220-1500 (word captions sit around y 1500-1600).
 * Angles: degrees, counter-clockwise, 0 = right, 90 = top. Colours come from the profile palette.
 */

import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFor } from "./theme";
import type { Palette, VisualOrbit, OrbitBody, OrbitRevealStep, OrbitShot } from "./types";

// ── Shared helpers ──────────────────────────────────────────────────────────

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Palette key ("coral") or any CSS colour. */
const palColor = (pal: Palette, c: string | undefined, fallback: string): string =>
  !c ? fallback : ((pal as Record<string, string>)[c] ?? c);

/** Add alpha to a #rrggbb colour (falls back to the colour itself). */
const withAlpha = (c: string, a: number): string =>
  /^#[0-9a-f]{6}$/i.test(c) ? c + Math.round(clamp01(a) * 255).toString(16).padStart(2, "0") : c;

/** Rough text width for a bold sans at font size fs (used for layout + collision only). */
const textW = (s: string, fs: number) => s.length * fs * 0.6;

type Box = { x: number; y: number; w: number; h: number }; // centre + size
const overlaps = (a: Box, b: Box, m = 0) =>
  Math.abs(a.x - b.x) * 2 < a.w + b.w + 2 * m && Math.abs(a.y - b.y) * 2 < a.h + b.h + 2 * m;

/** Last fired reveal step carrying `key`, plus its start frame. */
function lastWith<K extends keyof OrbitRevealStep>(reveal: OrbitRevealStep[], progress: number, key: K) {
  let found: OrbitRevealStep | undefined;
  for (const s of reveal) if (progress >= s.at && s[key] !== undefined) found = s;
  return found;
}

/** Monotone cubic (Fritsch–Carlson) interpolation; linear extrapolation outside the keys. */
function monotone(xs: number[], ys: number[], x: number): number {
  const n = xs.length;
  if (n === 0) return 0;
  if (n === 1) return ys[0];
  const m: number[] = [];
  for (let k = 0; k < n - 1; k++) m.push((ys[k + 1] - ys[k]) / Math.max(1e-9, xs[k + 1] - xs[k]));
  const t: number[] = [m[0]];
  for (let k = 1; k < n - 1; k++) t.push(m[k - 1] * m[k] <= 0 ? 0 : (m[k - 1] + m[k]) / 2);
  t.push(m[n - 2]);
  for (let k = 0; k < n - 1; k++) {
    if (m[k] === 0) { t[k] = 0; t[k + 1] = 0; continue; }
    const a = t[k] / m[k], b = t[k + 1] / m[k], s = a * a + b * b;
    if (s > 9) { const tau = 3 / Math.sqrt(s); t[k] = tau * a * m[k]; t[k + 1] = tau * b * m[k]; }
  }
  if (x <= xs[0]) return ys[0] + t[0] * (x - xs[0]);
  if (x >= xs[n - 1]) return ys[n - 1] + t[n - 1] * (x - xs[n - 1]);
  let k = 0;
  while (k < n - 2 && x > xs[k + 1]) k++;
  const h = xs[k + 1] - xs[k], u = (x - xs[k]) / h;
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
  return h00 * ys[k] + h10 * h * t[k] + h01 * ys[k + 1] + h11 * h * t[k + 1];
}

// ── Shared overlays (HTML so text auto-sizes) ────────────────────────────────

/** Scene headline at the top of the safe area; text before a colon is coloured as a kicker. */
const Headline: React.FC<{ text?: string; startFrame: number; frame: number; pal: Palette; ff: string }> = ({ text, startFrame, frame, pal, ff }) => {
  if (!text) return null;
  const p = easeOut(clamp01((frame - startFrame) / 9));
  const fs = Math.max(42, Math.min(58, 930 / Math.max(1, text.length * 0.56)));
  const i = text.indexOf(":");
  return (
    <div style={{ position: "absolute", top: 232, left: 60, right: 60, display: "flex", justifyContent: "center",
      opacity: p, transform: `translateY(${(1 - p) * 12}px)` }}>
      <div style={{ fontFamily: ff, fontSize: fs, fontWeight: 700, color: pal.ink, textAlign: "center", lineHeight: 1.15, letterSpacing: -0.5 }}>
        {i > 0 ? (<><span style={{ color: pal.coral }}>{text.slice(0, i + 1)}</span>{text.slice(i + 1)}</>) : text}
      </div>
    </div>
  );
};

const Readout: React.FC<{ label?: string; value?: string; top: number; startFrame: number; frame: number; pal: Palette; ff: string }> = ({ label, value, top, startFrame, frame, pal, ff }) => {
  if (!value) return null;
  const p = easeOut(clamp01((frame - startFrame) / 9));
  const long = value.length > 22;
  return (
    <div style={{ position: "absolute", top, left: 60, right: 60, display: "flex", justifyContent: "center", opacity: p, transform: `scale(${0.94 + 0.06 * p})` }}>
      <div style={{ maxWidth: 940, background: pal.white, border: `2px solid ${withAlpha(pal.ink, 0.12)}`, borderRadius: 24,
        boxShadow: "0 6px 24px rgba(0,0,0,0.08)", padding: "14px 36px", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: ff }}>
        {label && <div style={{ fontSize: 30, fontWeight: 600, color: withAlpha(pal.ink, 0.6), lineHeight: 1.2 }}>{label}</div>}
        <div style={{ fontSize: long ? 40 : 54, fontWeight: 700, color: pal.ink, lineHeight: 1.15, textAlign: "center" }}>{value}</div>
      </div>
    </div>
  );
};

const Note: React.FC<{ text?: string | false; top: number; pal: Palette; ff: string }> = ({ text, top, pal, ff }) =>
  text ? (
    <div style={{ position: "absolute", top, left: 60, right: 60, textAlign: "center", fontFamily: ff, fontSize: 28, fontWeight: 500,
      color: withAlpha(pal.ink, 0.5), fontStyle: "italic" }}>{text}</div>
  ) : null;

// ── Orbit (top-down) mode ───────────────────────────────────────────────────

const CX = 540, CY = 800, EARTH_R = 90, R_UNIT = 480, DOT_R = 15, LABEL_FS = 44, BADGE_FS = 46;
const ringPx = (r: number) => (r > 2 ? r : r * R_UNIT);
const scr = (a: number, r: number) => ({ x: CX + r * Math.cos(toRad(a)), y: CY - r * Math.sin(toRad(a)) });
const unit = (a: number) => ({ x: Math.cos(toRad(a)), y: -Math.sin(toRad(a)) });

type Track = { a: number[]; r: number[]; show: number };

function buildTracks(visual: VisualOrbit, dur: number, fps: number): Record<string, Track> {
  const rings = visual.rings ?? [];
  const reveal = visual.reveal ?? [];
  const ringR: Record<string, number> = {};
  for (const g of rings) ringR[g.id] = ringPx(g.r);
  const refR = rings.length ? ringPx(rings[0].r) : 300;
  const lapSec = visual.lapSec ?? 24;
  const out: Record<string, Track> = {};
  const inShow = new Set(reveal.flatMap((s) => s.show ?? []));

  for (const body of visual.bodies ?? []) {
    const moves = reveal.filter((s) => s.move?.body === body.id).sort((x, y) => x.at - y.at);
    const rAt = (f: number) => {
      let from = ringR[body.ring] ?? refR;
      for (const st of moves) {
        const start = Math.round(st.at * dur);
        if (f < start) break;
        const to = ringR[st.move!.toRing] ?? from;
        const p = clamp01((f - start) / Math.max(1, st.move!.over));
        if (p < 1) return from + (to - from) * easeInOut(p);
        from = to;
      }
      return from;
    };
    const omega = (r: number) => {
      if (body.speedMult !== undefined) return (body.speedMult * 360) / lapSec;
      if (body.period !== undefined) return 360 / (body.period * lapSec);
      return 360 / (lapSec * Math.pow(r / refR, 1.5)); // Kepler: higher = slower
    };
    const kf = body.keyframes?.length ? [...body.keyframes].sort((x, y) => x.at - y.at) : undefined;
    const a: number[] = [], r: number[] = [];
    let acc = body.startAngle ?? 90;
    for (let f = 0; f <= dur; f++) {
      const rr = rAt(f);
      r.push(rr);
      if (kf) a.push(monotone(kf.map((k) => k.at), kf.map((k) => k.angle), f / Math.max(1, dur)));
      else { a.push(acc); acc += omega(rr) / fps; }
    }
    const showStep = reveal.find((s) => s.show?.includes(body.id));
    out[body.id] = { a, r, show: inShow.has(body.id) && showStep ? Math.round(showStep.at * dur) : 0 };
  }
  return out;
}

const labelBox = (label: string, a: number, r: number, side: "out" | "in"): Box => {
  const w = textW(label, LABEL_FS) + 8, h = LABEL_FS + 4;
  const u = unit(a);
  const ext = Math.abs(u.x) * (w / 2) + Math.abs(u.y) * (h / 2);
  const d = side === "out" ? r + DOT_R + 12 + ext : r - DOT_R - 12 - ext;
  const x = Math.max(70 + w / 2, Math.min(1010 - w / 2, CX + d * u.x));
  return { x, y: CY + d * u.y, w, h };
};

/** Decide once per scene which labels go inward so that labels never collide (no frame-to-frame popping). */
function chooseSides(bodies: OrbitBody[], tracks: Record<string, Track>, dur: number): Record<string, "out" | "in"> {
  const side: Record<string, "out" | "in"> = {};
  for (const b of bodies) side[b.id] = b.labelSide === "in" ? "in" : "out";
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const A = bodies[i], B = bodies[j];
      if ((A.labelSide && A.labelSide !== "auto") || (B.labelSide && B.labelSide !== "auto")) continue;
      const ta = tracks[A.id], tb = tracks[B.id];
      let hit = false, rA = 0, rB = 0, aA = 0, aB = 0;
      for (let f = Math.max(ta.show, tb.show); f <= dur; f += 2) {
        const ba = labelBox(A.label, ta.a[f], ta.r[f], "out"), bb = labelBox(B.label, tb.a[f], tb.r[f], "out");
        if (overlaps(ba, bb, 30)) { hit = true; rA += ta.r[f]; rB += tb.r[f]; aA += ta.a[f]; aB += tb.a[f]; }
      }
      if (!hit) continue;
      // Inner (or, on the same ring, trailing) body takes the inside label.
      const inner = rA < rB - 1 ? A : rB < rA - 1 ? B : aA < aB ? A : B;
      side[inner.id] = "in";
    }
  }
  return side;
}

const OrbitTopDown: React.FC<{ visual: VisualOrbit; pal: Palette; dur: number; ff: string; frame: number; fps: number }> = ({ visual, pal, dur, ff, frame, fps }) => {
  const rings = visual.rings ?? [];
  const bodies = visual.bodies ?? [];
  const reveal = visual.reveal ?? [];
  const tracks = useMemo(() => buildTracks(visual, dur, fps), [visual, dur, fps]);
  const sides = useMemo(() => chooseSides(bodies, tracks, dur), [bodies, tracks, dur]);
  const f = Math.max(0, Math.min(dur, frame));
  const progress = f / Math.max(1, dur);

  const capStep = lastWith(reveal, progress, "caption");
  const roStep = lastWith(reveal, progress, "readout");
  const hiStep = [...reveal].reverse().find((s) => progress >= s.at);
  const highlighted = new Set(hiStep?.highlight ?? []);
  const hideStep = lastWith(reveal, progress, "hideGap");
  const gapAlpha = hideStep?.hideGap ? 1 - clamp01((f - Math.round(hideStep.at * dur)) / 10) : 1;

  const color = (b: OrbitBody) => palColor(pal, b.color, pal.coral);
  const appear = (id: string) => easeOut(clamp01((f - tracks[id].show) / 10));
  const isVis = (id: string) => !!tracks[id] && f >= tracks[id].show;
  const pos = (id: string) => ({ a: tracks[id].a[f], r: tracks[id].r[f] });

  const mainRing = rings.find((g) => g.main) ?? rings[0];

  // Gap wedge
  const gap = visual.gap;
  let wedge: React.ReactNode = null;
  let badge: React.ReactNode = null;
  if (gap && isVis(gap.body1) && isVis(gap.body2) && gapAlpha > 0) {
    const p1 = pos(gap.body1), p2 = pos(gap.body2);
    let g = (p2.a - p1.a) % 360;
    if (g > 180) g -= 360;
    if (g <= -180) g += 360;
    const a1 = p1.a, a2 = p1.a + g;
    const lo = Math.min(a1, a2), hi = Math.max(a1, a2);
    const rOut = Math.max(p1.r, p2.r);
    const s = scr(lo, rOut), e = scr(hi, rOut);
    const large = hi - lo > 180 ? 1 : 0;
    const alpha = Math.min(appear(gap.body1), appear(gap.body2)) * gapAlpha;
    const d = `M ${CX} ${CY} L ${s.x} ${s.y} A ${rOut} ${rOut} 0 ${large} 0 ${e.x} ${e.y} Z`;
    wedge = (
      <g opacity={alpha}>
        <path d={d} fill={pal.coral} fillOpacity={0.18} />
        <path d={`M ${s.x} ${s.y} A ${rOut} ${rOut} 0 ${large} 0 ${e.x} ${e.y}`} stroke={pal.coral} strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.85} />
        <line x1={CX} y1={CY} x2={s.x} y2={s.y} stroke={pal.coral} strokeWidth={2.5} opacity={0.7} />
        <line x1={CX} y1={CY} x2={e.x} y2={e.y} stroke={pal.coral} strokeWidth={2.5} opacity={0.7} />
      </g>
    );
    // Badge just outside the ring at the wedge midpoint; pushed outward only if it would hit an outside label.
    const mid = (a1 + a2) / 2, u = unit(mid);
    const txt = `${Math.round(Math.abs(g))}°`;
    const bw = textW(txt, BADGE_FS) + 44, bh = BADGE_FS + 22;
    const ext = Math.abs(u.x) * (bw / 2) + Math.abs(u.y) * (bh / 2);
    const outs = bodies.filter((b) => isVis(b.id) && sides[b.id] === "out").map((b) => labelBox(b.label, pos(b.id).a, pos(b.id).r, "out"));
    let dist = rOut + 22 + ext, box: Box = { x: 0, y: 0, w: bw, h: bh };
    for (let k = 0; k < 40; k++) {
      box = { x: CX + dist * u.x, y: CY + dist * u.y, w: bw, h: bh };
      box.x = Math.max(70 + bw / 2, Math.min(1010 - bw / 2, box.x));
      if (!outs.some((o) => overlaps(o, box, 8))) break;
      dist += 5;
    }
    const tick = scr(mid, rOut);
    badge = (
      <g opacity={alpha}>
        <line x1={tick.x} y1={tick.y} x2={box.x - u.x * (bh / 2)} y2={box.y - u.y * (bh / 2)} stroke={pal.coral} strokeWidth={2} opacity={0.6} />
        <rect x={box.x - bw / 2} y={box.y - bh / 2} width={bw} height={bh} rx={bh / 2} fill={pal.white} stroke={pal.coral} strokeWidth={3} />
        <text x={box.x} y={box.y + BADGE_FS * 0.36} textAnchor="middle" fontFamily={ff} fontSize={BADGE_FS} fontWeight={700} fill={pal.coral}>{txt}</text>
      </g>
    );
  }

  const arrows = visual.arrows === false ? [] : (visual.arrows ?? [215, 270, 325]);
  const noteText = visual.note === undefined ? (gap ? "Not to scale: gap exaggerated" : "Not to scale") : visual.note;

  return (
    <>
      <svg viewBox="0 0 1080 1920" style={{ position: "absolute", width: "100%", height: "100%" }}>
        <defs>
          <radialGradient id="orbEarth" cx="38%" cy="34%" r="70%">
            <stop offset="0%" stopColor={pal.sky} />
            <stop offset="100%" stopColor={pal.mint} />
          </radialGradient>
        </defs>

        {wedge}

        {/* Rings */}
        {rings.map((g) => {
          const isMain = g === mainRing;
          return (
            <circle key={g.id} cx={CX} cy={CY} r={ringPx(g.r)} fill="none" stroke={pal.ink}
              strokeOpacity={isMain ? 0.5 : 0.36} strokeWidth={isMain ? 3 : 2.5}
              strokeDasharray={!isMain && g.dashed !== false ? "14 10" : undefined} />
          );
        })}

        {/* Direction-of-travel chevrons on the main ring */}
        {mainRing && arrows.map((a) => {
          const R = ringPx(mainRing.r), p = scr(a, R);
          const t = { x: -Math.sin(toRad(a)), y: -Math.cos(toRad(a)) }; // CCW tangent in screen space
          const n = unit(a);
          const L = 14, W = 11;
          const pts = [
            [p.x - t.x * L + n.x * W, p.y - t.y * L + n.y * W],
            [p.x + t.x * L * 0.4, p.y + t.y * L * 0.4],
            [p.x - t.x * L - n.x * W, p.y - t.y * L - n.y * W],
          ].map((q) => q.join(",")).join(" ");
          return <polyline key={a} points={pts} fill="none" stroke={pal.ink} strokeOpacity={0.5} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />;
        })}

        {/* Earth (drawn over the wedge apex) */}
        <circle cx={CX} cy={CY} r={EARTH_R} fill="url(#orbEarth)" />
        <circle cx={CX} cy={CY} r={EARTH_R} fill="none" stroke={pal.ink} strokeOpacity={0.25} strokeWidth={3} />
        <text x={CX} y={CY + 11} textAnchor="middle" fontFamily={ff} fontSize={32} fontWeight={700} fill={pal.white}>Earth</text>

        {/* Trails: real recent path, ~50° long, fading */}
        {bodies.map((b) => {
          if (!b.trail || !isVis(b.id)) return null;
          const tr = tracks[b.id];
          const segs: React.ReactNode[] = [];
          let acc = 0;
          for (let k = f; k > tr.show && acc < 50; k--) {
            const d = Math.abs(tr.a[k] - tr.a[k - 1]);
            const p0 = scr(tr.a[k], tr.r[k]), p1 = scr(tr.a[k - 1], tr.r[k - 1]);
            segs.push(<line key={k} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={color(b)} strokeWidth={8} strokeLinecap="round" opacity={0.5 * (1 - acc / 50)} />);
            acc += d;
          }
          return <g key={"tr" + b.id} opacity={appear(b.id)}>{segs}</g>;
        })}

        {/* Burns */}
        {reveal.map((st, i) => {
          if (!st.burn || !isVis(st.burn.body)) return null;
          const el = f - Math.round(st.at * dur);
          if (el < 0 || el > 30) return null;
          const p = el / 30;
          const b = pos(st.burn.body), c = scr(b.a, b.r);
          const dir = st.burn.dir === "retrograde" ? -1 : 1;
          const t = { x: -Math.sin(toRad(b.a)) * dir, y: -Math.cos(toRad(b.a)) * dir }; // thrust direction
          const n = unit(b.a);
          const L = 70 * (1 - p) + 10, W = 14 * (1 - p) + 4;
          const base = { x: c.x - t.x * (DOT_R + 2), y: c.y - t.y * (DOT_R + 2) };
          const tip = { x: base.x - t.x * L, y: base.y - t.y * L };
          return (
            <g key={"burn" + i}>
              <circle cx={c.x} cy={c.y} r={DOT_R + 10 + 46 * p} fill="none" stroke={pal.coral} strokeWidth={6 * (1 - p) + 1} opacity={0.8 * (1 - p)} />
              <circle cx={c.x} cy={c.y} r={DOT_R + 18} fill={pal.coral} opacity={0.25 * (1 - p)} />
              <polygon points={`${base.x + n.x * W},${base.y + n.y * W} ${tip.x},${tip.y} ${base.x - n.x * W},${base.y - n.y * W}`} fill={pal.coral} opacity={0.9 * (1 - p * 0.6)} />
            </g>
          );
        })}

        {/* Bodies */}
        {bodies.map((b) => {
          if (!isVis(b.id)) return null;
          const p = pos(b.id), c = scr(p.a, p.r), s = appear(b.id);
          const hi = highlighted.has(b.id);
          return (
            <g key={b.id} opacity={s}>
              {hi && <circle cx={c.x} cy={c.y} r={DOT_R + 12 + 3 * Math.sin(f / 4)} fill="none" stroke={color(b)} strokeWidth={3} opacity={0.7} />}
              <circle cx={c.x} cy={c.y + 2} r={DOT_R + 3} fill="#000" opacity={0.12} />
              <circle cx={c.x} cy={c.y} r={DOT_R * (0.6 + 0.4 * s)} fill={color(b)} stroke={pal.white} strokeWidth={4} />
            </g>
          );
        })}

        {badge}

        {/* Labels */}
        {bodies.map((b) => {
          if (!isVis(b.id)) return null;
          const p = pos(b.id), box = labelBox(b.label, p.a, p.r, sides[b.id]);
          return (
            <text key={"lb" + b.id} x={box.x} y={box.y + LABEL_FS * 0.35} textAnchor="middle" fontFamily={ff} fontSize={LABEL_FS} fontWeight={700}
              fill={pal.ink} stroke={pal.bg} strokeWidth={10} paintOrder="stroke" strokeLinejoin="round" opacity={appear(b.id)}>
              {b.label}
            </text>
          );
        })}
      </svg>
      <Headline text={capStep?.caption} startFrame={capStep ? Math.round(capStep.at * dur) : 0} frame={f} pal={pal} ff={ff} />
      <Readout label={roStep?.readout?.label} value={roStep?.readout?.value} top={1205} startFrame={roStep ? Math.round(roStep.at * dur) : 0} frame={f} pal={pal} ff={ff} />
      <Note text={noteText} top={1362} pal={pal} ff={ff} />
    </>
  );
};

// ── Cannon mode (Newton's cannon) ───────────────────────────────────────────

const PC = { x: 540, y: 800 }, PLANET_R = 280, LAUNCH_R = 370;
const SIM_DT = 0.002;
const LAP_FRAMES = 96; // frames for one circular lap at launch height

type Shot = { pts: { x: number; y: number }[]; landed: boolean };

/** Inverse-square gravity, units GM = 1, launch radius = 1 (circular speed = 1). Velocity Verlet. */
function simulateShot(k: number): Shot {
  const surf = PLANET_R / LAUNCH_R;
  let x = 0, y = 1, vx = k, vy = 0;
  const acc = (px: number, py: number) => { const r3 = Math.pow(px * px + py * py, 1.5); return [-px / r3, -py / r3]; };
  let [ax, ay] = acc(x, y);
  const pts = [{ x, y }];
  const tMax = 2 * Math.PI + 0.01;
  for (let t = 0; t < tMax; t += SIM_DT) {
    x += vx * SIM_DT + 0.5 * ax * SIM_DT * SIM_DT;
    y += vy * SIM_DT + 0.5 * ay * SIM_DT * SIM_DT;
    const [nx, ny] = acc(x, y);
    vx += 0.5 * (ax + nx) * SIM_DT; vy += 0.5 * (ay + ny) * SIM_DT;
    ax = nx; ay = ny;
    const r = Math.hypot(x, y);
    if (r <= surf) { pts.push({ x: (x / r) * surf, y: (y / r) * surf }); return { pts, landed: true }; }
    pts.push({ x, y });
  }
  return { pts, landed: false };
}

const toScreenC = (p: { x: number; y: number }) => ({ x: PC.x + p.x * LAUNCH_R, y: PC.y - p.y * LAUNCH_R });

const DEFAULT_SHOTS: OrbitShot[] = [
  { speed: 0.55, label: "Too slow: lands", at: 0.08, color: "coral" },
  { speed: 0.88, label: "Faster: lands farther", at: 0.24, color: "sky" },
  { speed: 1.0, label: "Fast enough: keeps missing", at: 0.42, color: "mint" },
];

const CannonMode: React.FC<{ visual: VisualOrbit; pal: Palette; ff: string; frame: number; dur: number }> = ({ visual, pal, ff, frame, dur }) => {
  const shots = visual.shots ?? DEFAULT_SHOTS;
  const sims = useMemo(() => shots.map((s) => simulateShot(s.speed)), [shots]);
  const reveal = visual.reveal ?? [];
  const progress = frame / Math.max(1, dur);
  const capStep = lastWith(reveal, progress, "caption");
  const framesPerT = LAP_FRAMES / (2 * Math.PI);

  // Mountain on top of the planet, cannon on the peak pointing right (tangential).
  const peak = { x: PC.x, y: PC.y - LAUNCH_R };
  const mL = { x: PC.x - PLANET_R * Math.sin(toRad(13)), y: PC.y - PLANET_R * Math.cos(toRad(13)) };
  const mR = { x: PC.x + PLANET_R * Math.sin(toRad(13)), y: PC.y - PLANET_R * Math.cos(toRad(13)) };

  return (
    <>
      <svg viewBox="0 0 1080 1920" style={{ position: "absolute", width: "100%", height: "100%" }}>
        <defs>
          <radialGradient id="cannonPlanet" cx="40%" cy="35%" r="75%">
            <stop offset="0%" stopColor={pal.sky} stopOpacity={0.35} />
            <stop offset="100%" stopColor={pal.mint} stopOpacity={0.35} />
          </radialGradient>
        </defs>
        <circle cx={PC.x} cy={PC.y} r={PLANET_R} fill="url(#cannonPlanet)" stroke={pal.ink} strokeOpacity={0.45} strokeWidth={4} />
        <text x={PC.x} y={PC.y + 16} textAnchor="middle" fontFamily={ff} fontSize={46} fontWeight={700} fill={pal.ink} opacity={0.35}>Earth</text>
        <polygon points={`${mL.x},${mL.y} ${peak.x - 10},${peak.y + 6} ${peak.x + 10},${peak.y + 6} ${mR.x},${mR.y}`} fill={pal.ink} opacity={0.28} />
        <rect x={peak.x - 8} y={peak.y - 13} width={46} height={20} rx={6} fill={pal.ink} />
        <circle cx={peak.x - 4} cy={peak.y + 6} r={10} fill={pal.ink} />

        {shots.map((s, i) => {
          const start = Math.round((s.at ?? 0.08 + i * 0.17) * dur);
          if (frame < start) return null;
          const sim = sims[i];
          const col = palColor(pal, s.color, pal.coral);
          const tau = (frame - start) / framesPerT;
          const nAll = sim.pts.length;
          let idx = Math.min(nAll - 1, Math.floor(tau / SIM_DT));
          const lapped = !sim.landed && tau / SIM_DT >= nAll - 1;
          const ballIdx = lapped ? Math.floor((tau / SIM_DT) % (nAll - 1)) : idx;
          if (lapped) idx = nAll - 1;
          const drawn = sim.pts.slice(0, idx + 1).filter((_, j) => j % 6 === 0 || j === idx).map(toScreenC);
          const d = drawn.map((p, j) => `${j ? "L" : "M"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
          const ball = toScreenC(sim.pts[ballIdx]);
          const done = sim.landed && idx >= nAll - 1;
          const landT = done ? frame - start - Math.round(((nAll - 1) * SIM_DT) * framesPerT) : 0;
          return (
            <g key={i}>
              <path d={d} stroke={col} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={sim.landed ? "2 14" : undefined} />
              {!done && <circle cx={ball.x} cy={ball.y} r={15} fill={col} stroke={pal.white} strokeWidth={4} />}
              {done && (
                <g>
                  <circle cx={ball.x} cy={ball.y} r={14 + 30 * clamp01(landT / 14)} fill="none" stroke={col} strokeWidth={4} opacity={1 - clamp01(landT / 14)} />
                  <circle cx={ball.x} cy={ball.y} r={22} fill={col} stroke={pal.white} strokeWidth={4} />
                  <text x={ball.x} y={ball.y + 10} textAnchor="middle" fontFamily={ff} fontSize={28} fontWeight={700} fill={pal.white}>{i + 1}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <Headline text={capStep?.caption} startFrame={capStep ? Math.round(capStep.at * dur) : 0} frame={frame} pal={pal} ff={ff} />
      {/* Legend: one row per shot, appearing with its shot */}
      <div style={{ position: "absolute", top: 1206, left: 60, right: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        {shots.map((s, i) => {
          const start = Math.round((s.at ?? 0.08 + i * 0.17) * dur);
          const p = easeOut(clamp01((frame - start) / 9));
          const col = palColor(pal, s.color, pal.coral);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, opacity: p, transform: `translateY(${(1 - p) * 10}px)`, width: 760 }}>
              <div style={{ width: 46, height: 46, borderRadius: 23, background: col, color: pal.white, fontFamily: ff, fontWeight: 700, fontSize: 28,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
              <div style={{ fontFamily: ff, fontSize: 44, fontWeight: 600, color: pal.ink, whiteSpace: "nowrap" }}>{s.label}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ── Ground-track mode ───────────────────────────────────────────────────────

const GT = { lon0: -140, lon1: -10, latMax: 58, x: 60, w: 960, y: 392 };
const GK = GT.w / (GT.lon1 - GT.lon0);
const GH = 2 * GT.latMax * GK;
const lonX = (lon: number) => GT.x + (lon - GT.lon0) * GK;
const latY = (lat: number) => GT.y + (GT.latMax - lat) * GK;

// Very simplified coastlines (lon, lat), clipped to the map window. Coarse but geographically placed.
const COAST: [number, number][][] = [
  // North + Central America (top edge cut at 58°N, Hudson Bay notch)
  [[-136.5, 58], [-134, 56.5], [-131, 54.6], [-128, 51.5], [-127.5, 50.1], [-124.7, 48.4], [-124.1, 46.2], [-124.5, 42.8], [-124.4, 40.4],
   [-122.5, 37.8], [-121.9, 36.6], [-120.6, 34.6], [-118.5, 34], [-117.2, 32.7], [-116, 30.5], [-114.2, 28], [-112.1, 24.8], [-110, 22.9],
   [-110.3, 24.2], [-111.7, 26.5], [-112.9, 29], [-114.6, 31.8], [-112.2, 29], [-110.9, 27.9], [-109.4, 25.6], [-107.4, 24.6], [-106.4, 23.2],
   [-105.3, 21.5], [-105.6, 20.4], [-104.3, 19.1], [-101.9, 17.9], [-99.9, 16.8], [-96.5, 15.7], [-94.8, 16.2], [-92.2, 14.5], [-89.5, 13.4],
   [-87.6, 13.2], [-85.8, 11], [-85.7, 9.9], [-83.6, 8.5], [-80.4, 7.3], [-79.5, 8.9], [-77.4, 7.9],
   [-77.4, 8.7], [-79.5, 9.6], [-82, 9.3], [-83.6, 10.7], [-83.8, 12.1], [-83.2, 15], [-86, 15.9], [-88.6, 15.7], [-88.2, 17.5], [-87.4, 18.5],
   [-86.8, 21.2], [-88.2, 21.6], [-90.3, 21.1], [-90.7, 19.6], [-91.8, 18.6], [-94.4, 18.2], [-96.1, 19.2], [-97.8, 22.3], [-97.2, 25.9],
   [-97.4, 27.8], [-94.8, 29.3], [-93.3, 29.8], [-91.5, 29.4], [-89.2, 29.1], [-89.6, 30.2], [-88, 30.7], [-86.5, 30.4], [-85, 29.7],
   [-84, 30], [-82.8, 28.9], [-82.7, 27.6], [-81.8, 26.1], [-81, 25.2], [-80.4, 25.2], [-80.1, 26.7], [-80.55, 28.4], [-81.4, 30.4],
   [-81.1, 32], [-79.9, 32.8], [-77.9, 33.9], [-75.5, 35.2], [-76, 36.9], [-75, 38.8], [-74, 40.5], [-71.9, 41.1], [-70, 41.7], [-70.6, 42.6],
   [-70.2, 43.7], [-67, 44.8], [-65.7, 43.5], [-60, 45.9], [-64.3, 48.7], [-66.5, 50.1], [-59.5, 50.3], [-57.1, 51.4], [-55.7, 52.2],
   [-56.2, 53.6], [-57.3, 54.6], [-60.1, 55.5], [-61.6, 56.5], [-62.5, 58], [-77.5, 58], [-77.8, 55.3], [-79, 52], [-80, 51.3], [-82.3, 52.9],
   [-82.3, 55.1], [-85, 55.3], [-88.8, 56.8], [-92.4, 57.1], [-94, 58]],
  // South America
  [[-77.4, 7.9], [-77.3, 3.9], [-78.9, 1.8], [-80.1, 0], [-81.1, -2.2], [-81.3, -4.7], [-79.9, -6.8], [-77.1, -12.1], [-76.2, -13.7],
   [-75.1, -15.4], [-71.4, -17.6], [-70.3, -18.5], [-70.2, -23.6], [-71.3, -29.9], [-71.6, -33], [-73.1, -36.8], [-73.5, -41.5], [-74.5, -44],
   [-75.5, -48], [-74.5, -52], [-71, -54], [-67.3, -55.9], [-65, -55], [-68.4, -52.3], [-69.2, -50.3], [-67.5, -46], [-65.5, -43],
   [-63.5, -42.7], [-65, -41], [-62.3, -38.9], [-57.5, -38.2], [-56.7, -36.4], [-58.4, -34.6], [-57, -34.5], [-54.9, -34.9], [-53.4, -33.7],
   [-50.8, -30.5], [-48.6, -27.6], [-48.3, -25.5], [-46.3, -24], [-43.2, -22.9], [-42, -23], [-40.3, -20.3], [-39, -17.5], [-38.5, -13],
   [-35.7, -9.6], [-34.8, -7.1], [-35.2, -5.8], [-38.5, -3.7], [-41.5, -2.9], [-44.3, -2.5], [-48.5, -1.2], [-50, 0.5], [-51.1, 3.9],
   [-52.3, 4.9], [-55.2, 5.9], [-58.2, 6.8], [-61, 8.5], [-62, 10.6], [-64.2, 10.5], [-67, 10.6], [-68.3, 10.5], [-70.2, 11.6],
   [-71.3, 12.4], [-74.2, 11.2], [-75.5, 10.4], [-76.8, 8.6]],
  // Cuba, Hispaniola
  [[-84.95, 21.86], [-83, 22.98], [-80.9, 23.15], [-78.2, 22.4], [-75.6, 21.1], [-74.13, 20.22], [-77.1, 19.9], [-77.9, 20.7], [-80.5, 21.8], [-82.5, 22.2], [-84.4, 21.6]],
  [[-74.4, 18.4], [-72.8, 19.9], [-70, 19.7], [-68.3, 18.6], [-70, 18.2], [-71.4, 17.6], [-72.8, 18.1]],
  // West Africa bulge (cut at the map's east edge)
  [[-10, 30.4], [-13, 27.5], [-17, 21], [-17.5, 14.7], [-16.7, 12.5], [-15, 11], [-13.3, 9], [-11.5, 7], [-10, 6]],
];

type GPt = { lon: number; lat: number };

/** One lap of ground track: node longitude `node`, inclination `inc`, westward drift `shift` per lap. */
function lapTrack(node: number, inc: number, shift: number): GPt[] {
  const pts: GPt[] = [];
  for (let u = -220; u <= 220; u += 1) {
    const ur = toRad(u);
    const lat = toDeg(Math.asin(Math.sin(toRad(inc)) * Math.sin(ur)));
    let rel = toDeg(Math.atan2(Math.cos(toRad(inc)) * Math.sin(ur), Math.cos(ur)));
    while (rel - u > 180) rel -= 360; // unwrap: in-plane longitude stays within ±90° of u
    while (rel - u < -180) rel += 360;
    pts.push({ lon: node + rel - (u / 360) * shift, lat });
  }
  return pts;
}

/** Node longitude so that the ascending pass crosses (lon, lat). */
function nodeFor(lon: number, lat: number, inc: number, shift: number): number {
  const u = toDeg(Math.asin(Math.min(1, Math.sin(toRad(lat)) / Math.sin(toRad(inc)))));
  const rel = toDeg(Math.atan2(Math.cos(toRad(inc)) * Math.sin(toRad(u)), Math.cos(toRad(u))));
  return lon - rel + (u / 360) * shift;
}

const latAtLon = (pts: GPt[], lon: number): number => {
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].lon >= lon) { const a = pts[i - 1], b = pts[i]; return a.lat + ((lon - a.lon) / Math.max(1e-9, b.lon - a.lon)) * (b.lat - a.lat); }
  }
  return pts[pts.length - 1].lat;
};

const GroundTrackMode: React.FC<{ visual: VisualOrbit; pal: Palette; ff: string; frame: number; dur: number }> = ({ visual, pal, ff, frame, dur }) => {
  const inc = visual.inclination ?? 51.6;
  const shift = visual.lapShift ?? 23.2;
  const nLaps = visual.laps ?? 3;
  const site = visual.site ?? { lon: -80.6, lat: 28.5, label: "Florida launch pad" };
  const reveal = visual.reveal ?? [];
  const progress = frame / Math.max(1, dur);
  const capStep = lastWith(reveal, progress, "caption");
  const roStep = lastWith(reveal, progress, "readout");

  // Last lap passes over the site; earlier laps crossed the same latitude further east.
  const laps = useMemo(() => {
    const lastNode = nodeFor(site.lon, site.lat, inc, shift);
    return Array.from({ length: nLaps }, (_, i) => {
      const node = lastNode + (nLaps - 1 - i) * shift;
      return { node, pts: lapTrack(node, inc, shift).filter((p) => p.lon >= GT.lon0 - 1 && p.lon <= GT.lon1 + 1) };
    });
  }, [inc, shift, nLaps, site.lon, site.lat]);

  // Timing: earlier laps quick, the final (pad-crossing) lap slower.
  const slots = Array.from({ length: nLaps }, (_, i) => {
    const s0 = 0.04, last = 0.3, gapT = 0.01;
    const each = (0.42 - s0) / Math.max(1, nLaps - 1) - gapT;
    return i < nLaps - 1 ? [s0 + i * (each + gapT), s0 + i * (each + gapT) + each] : [0.42, 0.42 + last];
  });
  const siteFrac = (site.lon - GT.lon0) / (GT.lon1 - GT.lon0);
  const lastSlot = slots[nLaps - 1];
  const crossFrame = Math.round((lastSlot[0] + siteFrac * (lastSlot[1] - lastSlot[0])) * dur);
  const crossed = frame >= crossFrame;
  const windowA = easeOut(clamp01((frame - crossFrame + 4) / 10));

  const path = (pts: GPt[]) => pts.map((p, j) => `${j ? "L" : "M"} ${lonX(p.lon).toFixed(1)} ${latY(p.lat).toFixed(1)}`).join(" ");
  const clipId = "gtClip";

  // Active lap + head position
  let active = -1, headLon = GT.lon0;
  for (let i = 0; i < nLaps; i++) {
    const [a, b] = slots[i];
    if (progress >= a) { active = i; headLon = GT.lon0 + (GT.lon1 - GT.lon0) * clamp01((progress - a) / (b - a)); }
  }

  const sx = lonX(site.lon), sy = latY(site.lat);
  const grat: React.ReactNode[] = [];
  for (let lon = -130; lon <= -20; lon += 30) grat.push(<line key={"lo" + lon} x1={lonX(lon)} y1={GT.y} x2={lonX(lon)} y2={GT.y + GH} stroke={pal.ink} strokeOpacity={0.1} strokeWidth={1.5} />);
  for (let lat = -45; lat <= 45; lat += 15) if (lat !== 0) grat.push(<line key={"la" + lat} x1={GT.x} y1={latY(lat)} x2={GT.x + GT.w} y2={latY(lat)} stroke={pal.ink} strokeOpacity={0.1} strokeWidth={1.5} />);

  // West-drift arrow at 20°S between the first and last laps' ascending passes
  const arrowLat = -20;
  const descLon = (pts: GPt[]) => { for (let i = 1; i < pts.length; i++) if (pts[i - 1].lat < arrowLat && pts[i].lat >= arrowLat) return pts[i].lon; return NaN; };
  const ax1 = lonX(descLon(laps[0].pts)), ax2 = lonX(descLon(laps[nLaps - 1].pts)), ay = latY(arrowLat);
  const arrowA = nLaps > 1 ? easeOut(clamp01((progress - slots[1][0]) / 0.05)) : 0;

  return (
    <>
      <svg viewBox="0 0 1080 1920" style={{ position: "absolute", width: "100%", height: "100%" }}>
        <defs>
          <clipPath id={clipId}><rect x={GT.x} y={GT.y} width={GT.w} height={GH} rx={20} /></clipPath>
        </defs>
        <rect x={GT.x} y={GT.y} width={GT.w} height={GH} rx={20} fill={withAlpha(pal.sky, 0.09)} />
        <g clipPath={`url(#${clipId})`}>
          {COAST.map((poly, i) => (
            <polygon key={i} points={poly.map(([lo, la]) => `${lonX(lo).toFixed(1)},${latY(la).toFixed(1)}`).join(" ")}
              fill={withAlpha(pal.ink, 0.1)} stroke={withAlpha(pal.ink, 0.28)} strokeWidth={2} strokeLinejoin="round" />
          ))}
          {grat}
          <line x1={GT.x} y1={latY(0)} x2={GT.x + GT.w} y2={latY(0)} stroke={pal.ink} strokeOpacity={0.4} strokeWidth={2.5} />
          {[inc, -inc].map((l) => (
            <line key={l} x1={GT.x} y1={latY(l)} x2={GT.x + GT.w} y2={latY(l)} stroke={pal.coral} strokeOpacity={0.55} strokeWidth={2.5} strokeDasharray="12 9" />
          ))}

          {/* Launch window band */}
          {crossed && <rect x={sx - 3.5 * GK} y={GT.y} width={7 * GK} height={GH} fill={pal.mint} opacity={0.22 * windowA} />}

          {/* Laps */}
          {laps.map((lap, i) => {
            if (i > active) return null;
            const pts = i === active ? lap.pts.filter((p) => p.lon <= headLon) : lap.pts;
            const isLast = i === nLaps - 1;
            const col = isLast && crossed ? pal.coral : i === active ? pal.sky : pal.ink;
            const op = i === active || (isLast && crossed) ? 1 : 0.32;
            return <path key={i} d={path(pts)} stroke={col} strokeOpacity={op} strokeWidth={i === active ? 7 : 5} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
          })}
        </g>
        <rect x={GT.x} y={GT.y} width={GT.w} height={GH} rx={20} fill="none" stroke={pal.ink} strokeOpacity={0.25} strokeWidth={2} />

        {/* Lat labels */}
        <text x={GT.x + 16} y={latY(0) - 12} fontFamily={ff} fontSize={28} fontWeight={600} fill={pal.ink} opacity={0.6}>Equator</text>
        <text x={GT.x + GT.w - 16} y={latY(inc) - 12} textAnchor="end" fontFamily={ff} fontSize={28} fontWeight={600} fill={pal.coral}>51.6° N</text>
        <text x={GT.x + GT.w - 16} y={latY(-inc) + 34} textAnchor="end" fontFamily={ff} fontSize={28} fontWeight={600} fill={pal.coral}>51.6° S</text>

        {/* Lap tags at the ascending node */}
        {laps.map((lap, i) => {
          const a = easeOut(clamp01((progress - slots[i][0]) / 0.04));
          if (i > active || lonX(lap.node) < GT.x + 40) return null;
          return (
            <text key={"lt" + i} x={lonX(lap.node) + 14} y={latY(0) + 40} fontFamily={ff} fontSize={30} fontWeight={700}
              fill={i === nLaps - 1 && crossed ? pal.coral : pal.ink} opacity={a * (i === active || (i === nLaps - 1 && crossed) ? 1 : 0.55)}
              stroke={pal.bg} strokeWidth={7} paintOrder="stroke">Lap {i + 1}</text>
          );
        })}

        {/* West-drift arrow */}
        {nLaps > 1 && isFinite(ax1) && isFinite(ax2) && (
          <g opacity={arrowA}>
            <line x1={ax1 - 14} y1={ay} x2={ax2 + 24} y2={ay} stroke={pal.ink} strokeWidth={4} strokeOpacity={0.75} />
            <polygon points={`${ax2 + 8},${ay} ${ax2 + 30},${ay - 12} ${ax2 + 30},${ay + 12}`} fill={pal.ink} fillOpacity={0.75} />
            <text x={(ax1 + ax2) / 2} y={ay + 44} textAnchor="middle" fontFamily={ff} fontSize={32} fontWeight={700} fill={pal.ink}
              stroke={pal.bg} strokeWidth={8} paintOrder="stroke">each lap ≈ 23° farther west</text>
          </g>
        )}

        {/* Launch pad */}
        {crossed && <circle cx={sx} cy={sy} r={18 + 40 * clamp01((frame - crossFrame) / 18)} fill="none" stroke={pal.mint} strokeWidth={5} opacity={1 - clamp01((frame - crossFrame) / 18)} />}
        <circle cx={sx} cy={sy} r={14} fill={crossed ? pal.mint : pal.ink} stroke={pal.white} strokeWidth={4} />
        <text x={sx + 26} y={sy - 18} fontFamily={ff} fontSize={34} fontWeight={700} fill={pal.ink} stroke={pal.bg} strokeWidth={8} paintOrder="stroke">{site.label ?? "Launch pad"}</text>
        {crossed && (
          <text x={sx} y={GT.y + 44} textAnchor="middle" fontFamily={ff} fontSize={32} fontWeight={700} fill={pal.mint} opacity={windowA}
            stroke={pal.bg} strokeWidth={8} paintOrder="stroke">Launch window</text>
        )}

        {/* Station */}
        {active >= 0 && progress <= slots[active][1] + 0.02 && (() => {
          const lat = latAtLon(laps[active].pts, headLon);
          return <circle cx={lonX(headLon)} cy={latY(lat)} r={16} fill={pal.sky} stroke={pal.white} strokeWidth={4} />;
        })()}
      </svg>
      <Headline text={capStep?.caption} startFrame={capStep ? Math.round(capStep.at * dur) : 0} frame={frame} pal={pal} ff={ff} />
      <Readout label={roStep?.readout?.label} value={roStep?.readout?.value} top={GT.y + GH + 26} startFrame={roStep ? Math.round(roStep.at * dur) : 0} frame={frame} pal={pal} ff={ff} />
    </>
  );
};

// ── Main OrbitScene ───────────────────────────────────────────────────────

export const OrbitScene: React.FC<{ visual: VisualOrbit; pal: Palette; dur: number; font?: string }> = ({ visual, pal, dur, font }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ff = fontFor(font);
  const mode = visual.mode ?? "orbit";
  return (
    <AbsoluteFill style={{ background: pal.bg }}>
      {mode === "cannon" && <CannonMode visual={visual} pal={pal} ff={ff} frame={frame} dur={dur} />}
      {mode === "groundtrack" && <GroundTrackMode visual={visual} pal={pal} ff={ff} frame={frame} dur={dur} />}
      {mode === "orbit" && <OrbitTopDown visual={visual} pal={pal} dur={dur} ff={ff} frame={frame} fps={fps} />}
    </AbsoluteFill>
  );
};
