import React from "react";
import { AbsoluteFill, Freeze, interpolate, useCurrentFrame } from "remotion";
import type { Palette, SafeZone } from "./types";
import { BRIDGE, railRight } from "./profile";
import { fontFor } from "./theme";

// Cold-open bridges drawn as their own segment at the seam (Episode.tsx inserts them; run.py bridge_plan sized them).
// Deterministic: everything is a pure function of the frame. Colours come only from the profile palette.

/** freeze-rewind: hold the last cold-open frame while it drains colour, then scrub back (time remap via <Freeze>) to the scene start. */
export const FreezeRewind: React.FC<{ frames: number; hold: number; sourceFrames: number; children: React.ReactNode }> = ({ frames, hold, sourceFrames, children }) => {
  const f = useCurrentFrame();
  const last = Math.max(0, sourceFrames - 1);
  const scrub = Math.max(1, frames - hold);
  const p = interpolate(f, [hold, hold + scrub - 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: BRIDGE.rewindEase });
  const src = Math.round(last * (1 - p));   // remapped frame of the cold-open scene: last -> 0
  const desat = interpolate(f, [0, Math.min(BRIDGE.desatFrames, hold)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dim = 1 - 0.08 * desat;
  return (
    <AbsoluteFill style={{ filter: `grayscale(${desat}) brightness(${dim})` }}>
      <Freeze frame={src}>{children}</Freeze>
    </AbsoluteFill>
  );
};

/** question-card: full-frame card in the profile palette holding the episode question (hard cut in and out; music drop is in Episode). */
export const QuestionCard: React.FC<{ text: string; pal: Palette; font?: string; safe: SafeZone }> = ({ text, pal, font, safe }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, BRIDGE.cardInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: BRIDGE.cardEase });
  const words = text.trim().split(/\s+/).length;
  const size = words <= 4 ? 120 : words <= 6 ? 104 : 92;   // headline >= 84 px (DESIGN_SYSTEM section 4)
  const side = Math.max(safe.left, 1080 - railRight(safe)) + 40; // symmetric inset that also clears the right action rail
  return (
    <AbsoluteFill style={{ background: pal.bg }}>
      <div style={{ position: "absolute", top: safe.top, height: safe.height, left: side, right: side, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center", fontFamily: fontFor(font),
        opacity: t, transform: `translateY(${(1 - t) * BRIDGE.cardRise}px) scale(${0.95 + 0.05 * t})` }}>
        <div style={{ width: 120, height: 10, borderRadius: 5, background: pal.sunny, marginBottom: 44 }} />
        <div style={{ fontWeight: 700, fontSize: size, lineHeight: 1.12, color: pal.ink, letterSpacing: -1 }}>{text}</div>
      </div>
    </AbsoluteFill>
  );
};
