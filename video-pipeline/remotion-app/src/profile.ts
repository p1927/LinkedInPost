import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { iris } from "@remotion/transitions/iris";
import { ding, pageTurn, uiSwitch, whip, whoosh } from "@remotion/sfx";
import { Easing } from "remotion";
import type { BeatMap, Profile, SafeZone } from "./types";

// Original hard-coded band (y 220-1460, sides 60, progress bar at 140): scenes without `safe` render exactly as before.
export const DEFAULT_SAFE: SafeZone = { top: 220, height: 1240, left: 60, right: 60, progressTop: 140 };

/** Lowest y that scene text may reach so a 2-line word-caption page (~210 px + 20 px air) never covers it; Infinity when the preset has no caption band. */
export const CAPTION_TWO_LINE = 230;
export const captionClearY = (safe: SafeZone) => (safe.captionBottom !== undefined ? 1920 - safe.captionBottom - CAPTION_TWO_LINE : Infinity);
/** Right edge for content in the lower frame: the rail notch if the preset has one, else the side inset. */
export const railRight = (safe: SafeZone) => (safe.railX !== undefined ? Math.min(1080 - safe.right, safe.railX) : 1080 - safe.right);

// Defaults reproduce the original (pre-profile) look so existing episodes render unchanged.
export const DEFAULT_PROFILE: Required<Pick<Profile, "font" | "transitions" | "zoom" | "punch" | "sparkles" | "captions" | "termStyle" | "grade" | "progress" | "sfx" | "musicDuck" | "safe">> = {
  font: "fredoka",
  transitions: { default: ["slide-right", "fade", "wipe-left", "slide-bottom"] },
  zoom: { default: [1.04, 1.16] },
  punch: {},
  sparkles: { default: 4 },
  captions: { style: "sticker", size: 88, bottom: 300 },
  termStyle: "sticker",
  grade: {},
  progress: false,
  sfx: { boundary: { default: "whoosh" }, term: "ding" },
  musicDuck: 1,
  safe: DEFAULT_SAFE,
};

// format_catalog.yaml uses many beat names (hook_end_state, callback_cta, therefore_analogy, ...). Profiles are written in one small
// vocabulary; canonBeat() maps any catalog beat onto it by prefix/suffix so profiles never need per-format copies.
export const canonBeat = (b: string): string => {
  if (b === "story_hook" || b.startsWith("hook") || b.endsWith("hook")) return "story_hook";
  if (b.endsWith("cta")) return "cta";
  if (b.includes("payoff") || b.includes("callback")) return "story_payoff";
  if (b.includes("analogy") || b === "and_normal") return "analogy";
  if (b === "but_surprise" || b.includes("worry") || b.includes("twist")) return "worry";
  if (b.includes("term") || b === "rehook" || b.includes("definition") || b.includes("reveal")) return "term";
  return b;
};

export const pick = <T,>(m: BeatMap<T> | Record<string, T> | undefined, beat: string, fallback: T): T => {
  if (!m) return fallback;
  const r = m as Record<string, T>;
  return r[beat] ?? r[canonBeat(beat)] ?? r.default ?? fallback;
};

export const resolve = (p?: Profile) => ({ ...DEFAULT_PROFILE, ...(p ?? {}), safe: { ...DEFAULT_SAFE, ...(p?.safe ?? {}) } }); // nested merge: a partial `safe` keeps the other defaults

export const presentationByName = (name: string): any => {
  switch (name) {
    case "fade": return fade();
    case "wipe-left": return wipe({ direction: "from-left" });
    case "wipe-right": return wipe({ direction: "from-right" });
    case "slide-right": return slide({ direction: "from-right" });
    case "slide-left": return slide({ direction: "from-left" });
    case "slide-bottom": return slide({ direction: "from-bottom" });
    case "slide-top": return slide({ direction: "from-top" });
    case "flip": return flip({ direction: "from-right" });
    case "clock": return clockWipe({ width: 1080, height: 1920 });
    case "iris": return iris({ width: 1080, height: 1920 });
    default: return fade();
  }
};

export const sfxByName = (name?: string | null) => {
  switch (name) {
    case "whoosh": return whoosh;
    case "whip": return whip;
    case "page": return pageTurn;
    case "switch": return uiSwitch;
    case "ding": return ding;
    default: return null;
  }
};

// ── Cold-open bridges (DESIGN_SYSTEM sections 5-7, 11; modes.yaml mode-bridge-*). Frame counts come from props.coldOpen (run.py bridge_plan);
// these are the motion/sound tokens the renderer applies inside them. Bridges built by scene content (match-cut, pull-back, narrator-step-in)
// need no renderer segment; the three below are drawn by Episode.tsx.
export const RENDERED_BRIDGES = ["freeze-rewind", "j-cut", "question-card"] as const;
export const BRIDGE = {
  rewindEase: Easing.bezier(0.65, 0, 0.35, 1),  // inOutCubic (repositioning token) for the scrub-back
  desatFrames: 8,                               // freeze: drain colour over 6-9 f (edit-hook-bridge)
  cardEase: Easing.bezier(0.33, 1, 0.68, 1),    // outCubic (text token) for the question-card entrance
  cardInFrames: 12,                             // word/text entrance 12-15 f
  cardRise: 24,                                 // entrance rise 16-40 px, scale 0.95 -> 1
  musicDropIn: 6, musicDropOut: 10,             // question-card: music ramps to silence over 6 f and back over 10 f
  rewindSfxVolume: 0.22,
};
