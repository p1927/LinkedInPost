/**
 * identity.tsx — per-episode visual identity (docs/plans/youtube-automation/STYLE-IDENTITY-PLAN.md).
 * props.identity -> <IdentityProvider> -> useLook(font) in every scene. Without an identity, useLook() returns the "off" look whose
 * helpers hand back each component's own literal (d => d), so episodes without `identity` render exactly as before.
 */
import React, { createContext, useContext, useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import * as AtkinsonHyperlegible from "@remotion/google-fonts/AtkinsonHyperlegible";
import * as BarlowCondensed from "@remotion/google-fonts/BarlowCondensed";
import * as BigShoulders from "@remotion/google-fonts/BigShoulders";
import * as BricolageGrotesque from "@remotion/google-fonts/BricolageGrotesque";
import * as Caveat from "@remotion/google-fonts/Caveat";
import * as CormorantGaramond from "@remotion/google-fonts/CormorantGaramond";
import * as CourierPrime from "@remotion/google-fonts/CourierPrime";
import * as DMSerifDisplay from "@remotion/google-fonts/DMSerifDisplay";
import * as Fraunces from "@remotion/google-fonts/Fraunces";
import * as IBMPlexMono from "@remotion/google-fonts/IBMPlexMono";
import * as IBMPlexSans from "@remotion/google-fonts/IBMPlexSans";
import * as Inter from "@remotion/google-fonts/Inter";
import * as JetBrainsMono from "@remotion/google-fonts/JetBrainsMono";
import * as Lato from "@remotion/google-fonts/Lato";
import * as LibreCaslonText from "@remotion/google-fonts/LibreCaslonText";
import * as Newsreader from "@remotion/google-fonts/Newsreader";
import * as Nunito from "@remotion/google-fonts/Nunito";
import * as Oswald from "@remotion/google-fonts/Oswald";
import * as PlayfairDisplay from "@remotion/google-fonts/PlayfairDisplay";
import * as PlusJakartaSans from "@remotion/google-fonts/PlusJakartaSans";
import * as Rubik from "@remotion/google-fonts/Rubik";
import * as SourceSans3 from "@remotion/google-fonts/SourceSans3";
import * as SourceSerif4 from "@remotion/google-fonts/SourceSerif4";
import * as SpaceGrotesk from "@remotion/google-fonts/SpaceGrotesk";
import type { Identity, Palette } from "./types";
import { fontFor } from "./theme";
import { presentationByName } from "./profile";

// ── Font registry: catalog family name -> @remotion/google-fonts module + average bold glyph width (em, for fit-to-width maths) ──
type FontMod = { loadFont: (...a: any[]) => { fontFamily: string }; getInfo: () => { fonts: Record<string, Record<string, unknown>> } };
const REG: Record<string, [FontMod, number]> = {
  "Atkinson Hyperlegible": [AtkinsonHyperlegible, 0.6], "Barlow Condensed": [BarlowCondensed, 0.46], "Big Shoulders Display": [BigShoulders, 0.44],
  "Big Shoulders": [BigShoulders, 0.44], "Bricolage Grotesque": [BricolageGrotesque, 0.58], "Caveat": [Caveat, 0.45],
  "Cormorant Garamond": [CormorantGaramond, 0.5], "Courier Prime": [CourierPrime, 0.62], "DM Serif Display": [DMSerifDisplay, 0.56],
  "Fraunces": [Fraunces, 0.6], "IBM Plex Mono": [IBMPlexMono, 0.62], "IBM Plex Sans": [IBMPlexSans, 0.58], "Inter": [Inter, 0.6],
  "JetBrains Mono": [JetBrainsMono, 0.62], "Lato": [Lato, 0.58], "Libre Caslon Text": [LibreCaslonText, 0.62], "Newsreader": [Newsreader, 0.54],
  "Nunito": [Nunito, 0.6], "Oswald": [Oswald, 0.5], "Playfair Display": [PlayfairDisplay, 0.6], "Plus Jakarta Sans": [PlusJakartaSans, 0.6],
  "Rubik": [Rubik, 0.6], "Source Sans 3": [SourceSans3, 0.54], "Source Serif 4": [SourceSerif4, 0.56], "Space Grotesk": [SpaceGrotesk, 0.6],
};
const loaded = new Map<string, string>();
/** Loads ONE family (latin, weights 400-800 that exist). loadFont() itself holds a delayRender until the files are in and dedupes repeats. */
export const loadFamily = (name: string): string => {
  const hit = loaded.get(name);
  if (hit) return hit;
  const e = REG[name];
  let fam = `"${name}", sans-serif`; // unknown family: let the browser fall back rather than fail the render
  if (e) {
    const avail = Object.keys(e[0].getInfo().fonts.normal ?? {});
    const want = ["400", "500", "600", "700", "800"].filter((w) => avail.includes(w));
    fam = e[0].loadFont("normal", { weights: want.length ? want : avail, subsets: ["latin"] }).fontFamily;
  }
  loaded.set(name, fam);
  return fam;
};

// ── Tokens -> helpers ─────────────────────────────────────────────────────
export type SpringCfg = { damping?: number; stiffness?: number; mass?: number };
export const EASE = {
  linear: Easing.linear,
  "out-cubic": Easing.bezier(0.33, 1, 0.68, 1),
  "in-out": Easing.bezier(0.65, 0, 0.35, 1),
  "expo-out": Easing.bezier(0.16, 1, 0.3, 1),
} as const;
/** Deterministic RNG (mulberry32) so starfields/jitter are identical on every render. */
export const seeded = (seed: number) => {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
const lum = (hex: string) => {
  const h = hex.replace("#", "");
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const isDark = (hex: string) => lum(hex) < 0.2;
/** Of a and b, the colour that reads better on `fill` (WCAG luminance contrast). */
export const onFill = (fill: string, a: string, b: string) => {
  const r = (x: string) => { const [p, q] = [lum(fill), lum(x)]; return (Math.max(p, q) + 0.05) / (Math.min(p, q) + 0.05); };
  return r(a) >= r(b) ? a : b;
};

export type Look = {
  on: boolean; id: Identity | null;
  display: string; body: string; mono: string; gw: number;   // families; gw = display glyph width (em)
  dw: (d: number) => number; bw: (d: number) => number;      // display/body weight (d = the component's literal)
  caps: React.CSSProperties | undefined;                     // headline case treatment
  r: (d: number) => number; b: (d: number) => number; sw: (d: number) => number; shadow: (d: string) => string;
  cfg: (d: SpringCfg) => SpringCfg;
  /** Entrance progress 0..1 of an element that starts at `start` (off: the component's own spring). */
  enter: (frame: number, start: number, fps: number, d: SpringCfg) => number;
  /** Entrance style for progress p (off: the component's own style `d`). */
  fx: (p: number, d: React.CSSProperties) => React.CSSProperties;
  stagger: number;
};

const OFF = (ff: string): Look => ({
  on: false, id: null, display: ff, body: ff, mono: ff, gw: 0.6,
  dw: (d) => d, bw: (d) => d, caps: undefined, r: (d) => d, b: (d) => d, sw: (d) => d, shadow: (d) => d, cfg: (d) => d,
  enter: (frame, start, fps, d) => spring({ frame: frame - start, fps, config: d, from: 0, to: 1 }),
  fx: (_p, d) => d, stagger: 0,
});

const build = (id: Identity): Look => {
  const { fonts: f, shape, motion: m, palette: p } = id;
  const display = loadFamily(f.display), body = loadFamily(f.body), mono = loadFamily(f.mono);
  const ease = EASE[m.ease] ?? EASE["out-cubic"];
  const span = { rise: 0, pop: 0, slide: 14, draw: 22, type: 18 }[m.entrance] ?? 0;
  return {
    on: true, id, display, body, mono, gw: REG[f.display]?.[1] ?? 0.6,
    dw: (d) => f.displayWeight ?? d, bw: (d) => f.bodyWeight ?? d,
    caps: f.caps ? { textTransform: "uppercase", letterSpacing: 2 } : undefined,
    r: (d) => Math.round((shape.radius * d) / 24),           // shape.radius is the "medium" (24 px) radius; scales the others
    b: () => shape.border,
    sw: (d) => Math.max(1, Math.round((shape.stroke * d) / 5)), // shape.stroke replaces the 5 px base line
    shadow: () => (shape.shadow === "soft" ? "0 10px 30px rgba(0,0,0,0.22)" : shape.shadow === "paper" ? `8px 8px 0 ${p.ink}` : "none"),
    cfg: (d) => ({ ...d, ...m.spring }),
    enter: (frame, start, fps) => {
      if (!span) return spring({ frame: frame - start, fps, config: m.spring, from: 0, to: 1 });
      const t = interpolate(frame - start, [0, span], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
      return m.entrance === "type" ? Math.floor(t * 12) / 12 : t;  // type: stepped, like a terminal printing
    },
    fx: (pr) => {
      const q = Math.max(0, pr);
      switch (m.entrance) {
        case "pop": return { opacity: Math.min(1, q * 1.6), transform: `scale(${0.6 + 0.4 * q})` };
        case "slide": return { opacity: q, transform: `translateX(${(q - 1) * 90}px)` };
        case "draw": case "type": return q >= 1 ? {} : { clipPath: `inset(-20px ${(1 - q) * 100}% -20px -20px)` };
        default: return { opacity: Math.min(1, q * 1.5), transform: `translateY(${(1 - q) * 48}px)` }; // rise
      }
    },
    stagger: m.stagger,
  };
};

const Ctx = createContext<Look | null>(null);
export const IdentityProvider: React.FC<{ identity?: Identity; children: React.ReactNode }> = ({ identity, children }) => {
  const look = useMemo(() => (identity ? build(identity) : null), [identity]);
  return <Ctx.Provider value={look}>{children}</Ctx.Provider>;
};
/** The raw identity (null without one). */
export const useIdentity = (): Identity | null => useContext(Ctx)?.id ?? null;
/** Tokens for a component; `font` = the profile font used when no identity is set. */
export const useLook = (font?: string): Look => useContext(Ctx) ?? OFF(fontFor(font));

// ── Transitions: one verb per video ─────────────────────────────────────────
const Zoom: React.FC<TransitionPresentationComponentProps<Record<string, unknown>>> = ({ children, presentationDirection: d, presentationProgress: q }) => (
  <AbsoluteFill style={d === "entering" ? { opacity: q, transform: `scale(${1.18 - 0.18 * q})` } : { transform: `scale(${1 + 0.1 * q})` }}>{children}</AbsoluteFill>
);
const Cut: React.FC<TransitionPresentationComponentProps<Record<string, unknown>>> = ({ children, presentationDirection: d, presentationProgress: q }) => (
  <AbsoluteFill style={{ opacity: d === "entering" ? (q >= 0.5 ? 1 : 0) : 1 }}>{children}</AbsoluteFill> // hard cut at the midpoint; keeps run.py overlap maths
);
export const identityPresentation = (t: Identity["motion"]["transition"]): TransitionPresentation<Record<string, unknown>> =>
  t === "zoom" ? { component: Zoom, props: {} } : t === "cut" ? { component: Cut, props: {} }
    : presentationByName(({ slide: "slide-right", fade: "fade", wipe: "wipe-left" } as Record<string, string>)[t] ?? "fade");

// ── Backdrop: the surface the scene sits on (SVG/CSS only, deterministic) ────
export const Backdrop: React.FC = () => {
  const L = useContext(Ctx);
  const frame = useCurrentFrame();
  const id = L?.id;
  if (!id || id.backdrop === "flat") return null;
  const p = id.palette, rule = p.rule ?? p.ink;
  const svg = (children: React.ReactNode) => (
    <svg viewBox="0 0 1080 1920" width="1080" height="1920" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{children}</svg>
  );
  const noise = (fid: string, freq: string, seed: number, op: number) => (
    <>
      <filter id={fid} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={3} seed={seed} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="1080" height="1920" filter={`url(#${fid})`} opacity={op} style={{ mixBlendMode: isDark(p.bg) ? "screen" : "multiply" }} />
    </>
  );
  switch (id.backdrop) {
    case "paper": return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {svg(<>{noise("bd-fibre", "0.006 0.03", id.seed, 0.09)}{noise("bd-tooth", "0.8", id.seed + 1, 0.1)}</>)}
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, transparent 60%, ${p.ink}14 100%)` }} />
      </AbsoluteFill>
    );
    case "grain": return <AbsoluteFill style={{ pointerEvents: "none" }}>{svg(noise("bd-grain", "0.95", id.seed + Math.floor(frame / 2), 0.2))}</AbsoluteFill>;
    case "grid": case "blueprint": {
      const bp = id.backdrop === "blueprint";
      return (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          {svg(<>
            <defs>
              <pattern id="bd-fine" width={bp ? 30 : 54} height={bp ? 30 : 54} patternUnits="userSpaceOnUse">
                <path d={`M ${bp ? 30 : 54} 0 L 0 0 0 ${bp ? 30 : 54}`} fill="none" stroke={rule} strokeWidth={1} opacity={bp ? 0.16 : 0.5} />
              </pattern>
              {bp && <pattern id="bd-bold" width="150" height="150" patternUnits="userSpaceOnUse"><path d="M 150 0 L 0 0 0 150" fill="none" stroke={rule} strokeWidth={2} opacity={0.32} /></pattern>}
            </defs>
            <rect width="1080" height="1920" fill="url(#bd-fine)" />
            {bp && <rect width="1080" height="1920" fill="url(#bd-bold)" />}
          </>)}
        </AbsoluteFill>
      );
    }
    case "ruled": return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {svg(<>
          {Array.from({ length: 26 }, (_, i) => <line key={i} x1="0" x2="1080" y1={96 + i * 72} y2={96 + i * 72} stroke={rule} strokeWidth={2} opacity={0.55} />)}
          <line x1="64" x2="64" y1="0" y2="1920" stroke={p.coral} strokeWidth={2} opacity={0.45} />
        </>)}
      </AbsoluteFill>
    );
    case "starfield": {
      const rnd = seeded(id.seed);
      const stars = Array.from({ length: 170 }, () => ({ x: rnd() * 1080, y: rnd() * 1920, r: 0.8 + rnd() * rnd() * 3.2, o: 0.25 + rnd() * 0.65, ph: rnd() * 6.28 }));
      return (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, ${p.grape}40 0%, transparent 55%)` }} />
          {svg(stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={p.ink} opacity={s.o * (0.75 + 0.25 * Math.sin(frame / 18 + s.ph))} />))}
        </AbsoluteFill>
      );
    }
    default: return null;
  }
};
