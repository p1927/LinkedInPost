import React from "react";
import { Sequence, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { createTikTokStyleCaptions, type Caption } from "@remotion/captions";
import type { Palette, Word } from "./types";
import { fontFor } from "./theme";

// Word-timed, few-words-per-page captions (official @remotion/captions), sticker-style outline.
export const Captions: React.FC<{ words: Word[]; pal: Palette; bottom?: number; variant?: "sticker" | "clean"; size?: number; font?: string }> = ({ words, pal, bottom = 300, variant = "sticker", size, font }) => {
  const { fps } = useVideoConfig();
  const captions: Caption[] = words.map((w, i) => ({
    text: (i ? " " : "") + w.w, startMs: w.s * 1000, endMs: w.e * 1000, timestampMs: ((w.s + w.e) / 2) * 1000, confidence: 1,
  }));
  const { pages } = createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: 900 });
  return (
    <>
      {pages.map((page, i) => {
        const from = Math.round((page.startMs / 1000) * fps);
        const next = pages[i + 1];
        const end = next ? Math.round((next.startMs / 1000) * fps) : from + Math.round((page.durationMs / 1000) * fps) + 12;
        return (
          <Sequence key={i} from={from} durationInFrames={Math.max(1, end - from)} layout="none">
            <Page page={page} pal={pal} bottom={bottom} variant={variant} size={size} font={font} />
          </Sequence>
        );
      })}
    </>
  );
};

const Page: React.FC<{ page: any; pal: Palette; bottom: number; variant: "sticker" | "clean"; size?: number; font?: string }> = ({ page, pal, bottom, variant, size, font }) => {
  const fontFamily = fontFor(font);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });
  const nowMs = page.startMs + (frame / fps) * 1000;
  if (variant === "clean") {
    // Calm adult-friendly style: sentence-case, soft shadow, active word gets an accent highlight bar (no outline/tilt).
    const fs = size ?? 64;
    return (
      <div style={{ position: "absolute", left: 70, right: 70, bottom, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "6px 18px",
        opacity: interpolate(pop, [0, 1], [0, 1]), transform: `translateY(${interpolate(pop, [0, 1], [14, 0])}px)` }}>
        {page.tokens.map((t: any, i: number) => {
          const active = nowMs >= t.fromMs && nowMs < t.toMs + 60;
          return (
            <span key={i} style={{ fontFamily, fontWeight: 600, fontSize: fs, lineHeight: 1.2, whiteSpace: "pre", padding: "2px 14px", borderRadius: 14,
              color: active ? pal.ink : pal.white, background: active ? pal.sunny : "rgba(20,28,50,0.55)", textShadow: active ? "none" : "0 3px 12px rgba(0,0,0,0.45)" }}>
              {String(t.text).trim()}
            </span>
          );
        })}
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", left: 50, right: 50, bottom, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "2px 26px",
      transform: `scale(${interpolate(pop, [0, 1], [0.85, 1])})`, opacity: interpolate(pop, [0, 1], [0.3, 1]) }}>
      {page.tokens.map((t: any, i: number) => {
        const active = nowMs >= t.fromMs && nowMs < t.toMs + 60;
        return (
          <span key={i} style={{ fontFamily, fontWeight: 700, fontSize: size ?? 88, lineHeight: 1.12, whiteSpace: "pre",
            color: active ? pal.sunny : pal.white, WebkitTextStroke: `14px ${pal.ink}`, paintOrder: "stroke fill",
            textShadow: `0 8px 0 ${pal.ink}`, display: "inline-block", transform: active ? "translateY(-8px) rotate(-1.5deg) scale(1.07)" : "none" }}>
            {String(t.text).trim()}
          </span>
        );
      })}
    </div>
  );
};
