import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { iris } from "@remotion/transitions/iris";
import { ding, pageTurn, uiSwitch, whip, whoosh } from "@remotion/sfx";
import type { BeatMap, Profile } from "./types";

// Defaults reproduce the original (pre-profile) look so existing episodes render unchanged.
export const DEFAULT_PROFILE: Required<Pick<Profile, "font" | "transitions" | "zoom" | "punch" | "sparkles" | "captions" | "termStyle" | "grade" | "progress" | "sfx" | "musicDuck">> = {
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

export const resolve = (p?: Profile) => ({ ...DEFAULT_PROFILE, ...(p ?? {}) });

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
