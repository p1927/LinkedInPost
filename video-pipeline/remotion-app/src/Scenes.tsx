import React from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Star } from "@remotion/shapes";
import { evolvePath } from "@remotion/paths";
import { noise2D } from "@remotion/noise";
import { ding } from "@remotion/sfx";
import type { Palette, SafeZone, Term } from "./types";
import { onFill, useLook } from "./identity";

export const gradeCss = (g?: { saturate?: number; contrast?: number }) =>
  g && (g.saturate != null || g.contrast != null) ? `saturate(${g.saturate ?? 1}) contrast(${g.contrast ?? 1})` : undefined;

export const Vignette: React.FC<{ amount?: number }> = ({ amount = 0 }) =>
  amount > 0 ? <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(10,14,30,${amount}) 100%)` }} /> : null;

// Decorations stay inside the art-bleed box (config/safe_zones.yaml art_bleed x 24-1056) even at max scale + rotation
// (measured by tools/check_safe_zones.py; was x 30/960/24/975, which poked 8-27 px past it).
const SPARKS = [
  { x: 46, y: 560, s: 46 }, { x: 930, y: 520, s: 52 }, { x: 44, y: 1010, s: 40 }, { x: 930, y: 1090, s: 44 },
];

export const Sparkles: React.FC<{ pal: Palette; count?: number; seed?: number }> = ({ pal, count = 4, seed = 0 }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {SPARKS.slice(0, count).map((p0, i) => {
        const p = { ...p0, y: p0.y + ((seed * 53 + i * 97) % 90) - 45 };  // per-scene jitter so scenes differ
        const n = noise2D("sp" + i + seed, frame / 40, i);
        const scale = 0.75 + 0.35 * (n * 0.5 + 0.5);
        return (
          <div key={i} data-safe-kind="art" style={{ position: "absolute", left: p.x, top: p.y + n * 18, transform: `scale(${scale}) rotate(${frame * (i % 2 ? 1.2 : -1.2)}deg)`, opacity: 0.9 }}>
            <Star points={4} innerRadius={p.s * 0.28} outerRadius={p.s} fill={i % 2 ? pal.sunny : pal.white} stroke={pal.ink} strokeWidth={5} strokeLinejoin="round" cornerRadius={4} />
          </div>
        );
      })}
    </>
  );
};

// `top`/`left`/`right` = the safe zone (safe.top/left/right); the card variant sits 20 px lower. Without them the original 150/170 and 60 are used.
// Variants: sticker | card (profile termStyle) + tag | stamp (identity.term only). Identity sets fonts (display label, body sub) and shape tokens.
export const TermSticker: React.FC<{ term: Term; pal: Palette; delay: number; variant?: "sticker" | "card" | "tag" | "stamp"; font?: string; sfx?: any; top?: number; left?: number; right?: number }> = ({ term, pal, delay, variant: v0 = "sticker", font, sfx = ding, top, left = 60, right = 60 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLook(font);
  const variant = L.id?.term ?? v0;
  const s = spring({ frame: frame - delay, fps, config: L.cfg({ damping: 9, stiffness: 160 }) });
  const color = pal[term.color ?? (L.on ? "sunny" : "coral")];
  const ding0 = frame >= delay && frame < delay + 3 && sfx ? <Sequence from={0} layout="none"><Audio src={sfx} volume={0.3} /></Sequence> : null;
  if (variant === "tag" || variant === "stamp") {
    const t = L.enter(frame, delay, fps, { damping: 12, stiffness: 160 });
    if (variant === "tag") return (  // newsroom tag: accent block label (mono, caps) + plain sub line, top-left
      <>
        {ding0}
        <div style={{ position: "absolute", top: (top ?? 150) + 20, left, maxWidth: 1080 - left - right, ...L.fx(t, {}) }}>
          <div style={{ display: "inline-block", background: color, color: onFill(color, pal.ink, pal.white), fontFamily: L.mono, fontWeight: 700, fontSize: 64, lineHeight: 1.1, padding: "12px 26px", borderRadius: L.r(6), textTransform: "uppercase", letterSpacing: 2 }}>{term.label}</div>
          {term.sub && <div style={{ marginTop: 10, display: "inline-block", background: pal.white, color: pal.ink, fontFamily: L.body, fontWeight: L.bw(500), fontSize: 40, padding: "8px 22px", borderRadius: L.r(6), borderLeft: `${Math.max(4, L.b(4) * 2)}px solid ${color}` }}>{term.sub}</div>}
        </div>
      </>
    );
    return (  // stamp: slams down from 1.8x with a tilt, double rule
      <>
        {ding0}
        <div style={{ position: "absolute", top: (top ?? 150) + 30, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: Math.min(1, t * 3), transform: `scale(${1.8 - 0.8 * Math.min(1, t)}) rotate(-6deg)` }}>
          <div style={{ border: `10px double ${pal.coral}`, borderRadius: L.r(10), background: `${pal.white}EE`, padding: "18px 44px", textAlign: "center", maxWidth: 1080 - left - right - 60, boxShadow: L.shadow("none") }}>
            <div style={{ fontFamily: L.display, fontWeight: L.dw(800), fontSize: 84, lineHeight: 1, color: pal.coral, textTransform: "uppercase", letterSpacing: 4 }}>{term.label}</div>
            {term.sub && <div style={{ fontFamily: L.mono, fontWeight: 600, fontSize: 36, color: pal.ink, marginTop: 10, textTransform: "uppercase", letterSpacing: 2 }}>{term.sub}</div>}
          </div>
        </div>
      </>
    );
  }
  const underline = evolvePath(interpolate(frame - delay - 6, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), "M 8 14 Q 70 -4 130 14 T 252 14 T 372 14 T 492 14");
  if (variant === "card") {
    const ff = L.body;
    const t = interpolate(frame - delay, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return (
      <>
        {frame >= delay && frame < delay + 3 && sfx && <Sequence from={0} layout="none"><Audio src={sfx} volume={0.3} /></Sequence>}
        <div style={{ position: "absolute", top: top !== undefined ? top + 20 : 170, left, maxWidth: 1080 - left - right, opacity: t, transform: `translateY(${(1 - t) * -24}px)`, fontFamily: ff }}>
          <div style={{ background: L.on ? pal.white : "rgba(255,255,255,0.96)", borderRadius: L.r(22), padding: "22px 40px 24px 34px", borderLeft: `${L.on ? Math.max(6, L.b(14) * 3) : 14}px solid ${color}`, boxShadow: L.shadow("0 14px 40px rgba(20,30,60,0.28)") }}>
            <div style={{ fontWeight: L.dw(700), fontSize: 78, lineHeight: 1.05, color: pal.ink, letterSpacing: -1, fontFamily: L.on ? L.display : undefined, ...L.caps }}>{term.label}</div>
            {term.sub && <div style={{ fontWeight: L.bw(500), fontSize: 40, color, marginTop: 6 }}>{term.sub}</div>}
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      {frame >= delay && frame < delay + 3 && <Sequence from={0} layout="none">{sfx && <Audio src={sfx} volume={0.35} />}</Sequence>}
      <div style={{ position: "absolute", top: top ?? 150, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${s}) rotate(${interpolate(s, [0, 1], [-14, -3])}deg)`, opacity: Math.min(1, s * 1.4) }}>
        <div style={{ background: pal.white, border: `${L.on ? Math.max(4, L.b(10) * 3) : 10}px solid ${pal.ink}`, borderRadius: L.on ? L.r(48) : 48, padding: "26px 52px 30px", boxShadow: L.on && L.id!.shape.shadow !== "paper" ? L.shadow("") : `0 16px 0 ${pal.ink}`, textAlign: "center", fontFamily: L.on ? L.display : L.body /* was always Fredoka: now the profile font */ }}>
          <div style={{ fontWeight: L.dw(700), fontSize: 92, lineHeight: 1, color, letterSpacing: 1 }}>{term.label}</div>
          <svg width="500" height="30" viewBox="0 0 500 30" style={{ display: "block", margin: "6px auto 0" }}>
            <path d="M 8 14 Q 70 -4 130 14 T 252 14 T 372 14 T 492 14" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" {...underline} />
          </svg>
          {term.sub && <div style={{ fontWeight: L.bw(600), fontSize: 46, color: pal.ink, marginTop: 4, fontFamily: L.on ? L.body : undefined }}>{term.sub}</div>}
        </div>
      </div>
    </>
  );
};

export const IllustrationScene: React.FC<{ still: string; term?: Term; pal: Palette; dur: number; index: number; zoom?: [number, number]; punch?: number; sparkles?: number; termStyle?: "sticker" | "card"; font?: string; termSfx?: any; grade?: { saturate?: number; contrast?: number; vignette?: number }; safe?: SafeZone }> = ({ still, term, pal, dur, index, zoom = [1.04, 1.16], punch = 0, sparkles = 4, termStyle = "sticker", font, termSfx, grade, safe }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = punch ? punch * (1 - spring({ frame, fps, config: { damping: 14, stiffness: 120 } })) : 0;
  const z = interpolate(frame, [0, dur], zoom) + pop;
  const dir = index % 2 ? 1 : -1;
  const tx = interpolate(frame, [0, dur], [-18 * dir, 18 * dir]);
  return (
    <AbsoluteFill style={{ background: pal.bg }}>
      <AbsoluteFill style={{ transform: `scale(${z}) translateX(${tx}px)`, filter: gradeCss(grade) }}>
        <Img src={staticFile(still)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(59,47,47,0) 55%, rgba(59,47,47,0.35) 100%)" }} />
      <Vignette amount={grade?.vignette} />
      {sparkles > 0 && <Sparkles pal={pal} count={sparkles} seed={index} />}
      {term && <TermSticker term={term} pal={pal} delay={Math.round(dur * 0.22)} variant={termStyle} font={font} sfx={termSfx} top={safe?.top} left={safe?.left} right={safe?.right} />}
    </AbsoluteFill>
  );
};

export const ClipScene: React.FC<{ src?: string; dur: number; rate?: number; pal: Palette; punch?: number; grade?: { saturate?: number; contrast?: number; vignette?: number } }> = ({ src, dur, rate = 1, pal, punch = 0, grade }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = punch ? punch * (1 - spring({ frame, fps, config: { damping: 14, stiffness: 120 } })) : 0;
  const z = interpolate(frame, [0, dur], [1.0, 1.06]) + pop;
  return (
    <AbsoluteFill style={{ background: pal.ink }}>
      <AbsoluteFill style={{ transform: `scale(${z})`, filter: gradeCss(grade) }}>
        {src && <OffthreadVideo src={staticFile(src)} muted playbackRate={rate} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(59,47,47,0) 50%, rgba(59,47,47,0.55) 100%)" }} />
      <Vignette amount={grade?.vignette} />
    </AbsoluteFill>
  );
};
