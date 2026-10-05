import React from "react";
import { Sequence, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { createTikTokStyleCaptions, type Caption } from "@remotion/captions";
import type { Palette, Word } from "./types";
import { isDark, onFill, useLook } from "./identity";

type Variant = "sticker" | "clean" | "mono-bar" | "serif-lower";

// Word-timed, few-words-per-page captions (official @remotion/captions), sticker-style outline.
export const Captions: React.FC<{ words: Word[]; pal: Palette; bottom?: number; variant?: Variant; size?: number; font?: string; inset?: number }> = ({ words, pal, bottom = 300, variant = "sticker", size, font, inset }) => {
  const { fps } = useVideoConfig();
  const captions: Caption[] = words.map((w, i) => ({
    text: (i ? " " : "") + w.w, startMs: w.s * 1000, endMs: w.e * 1000, timestampMs: ((w.s + w.e) / 2) * 1000, confidence: 1,
  }));
  const { pages: grouped } = createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: 900 });
  // Large type (older-adult profile, size >= 72) wraps to 3 lines in the safe caption lane at 5+ words and would cover scene text:
  // split such pages into pages of at most MAX_LARGE_PAGE_WORDS words (timing taken from the tokens). Smaller sizes are unchanged.
  const MAX_LARGE_PAGE_WORDS = 4;
  const pages: typeof grouped = (size ?? 0) >= 72
    ? grouped.flatMap((pg) => {
        if (pg.tokens.length <= MAX_LARGE_PAGE_WORDS) return [pg];
        const out: typeof grouped = [];
        for (let k = 0; k < pg.tokens.length; k += MAX_LARGE_PAGE_WORDS) {
          const toks = pg.tokens.slice(k, k + MAX_LARGE_PAGE_WORDS);
          const startMs = toks[0].fromMs;
          out.push({ ...pg, tokens: toks, text: toks.map((x) => x.text).join(""), startMs, durationMs: Math.max(toks[toks.length - 1].toMs - startMs, 1) });
        }
        return out;
      })
    : grouped;
  return (
    <>
      {pages.map((page, i) => {
        const from = Math.round((page.startMs / 1000) * fps);
        const next = pages[i + 1];
        const end = next ? Math.round((next.startMs / 1000) * fps) : from + Math.round((page.durationMs / 1000) * fps) + 12;
        return (
          <Sequence key={i} from={from} durationInFrames={Math.max(1, end - from)} layout="none">
            <Page page={page} pal={pal} bottom={bottom} variant={variant} size={size} font={font} inset={inset} />
          </Sequence>
        );
      })}
    </>
  );
};

const Page: React.FC<{ page: any; pal: Palette; bottom: number; variant: Variant; size?: number; font?: string; inset?: number }> = ({ page, pal, bottom, variant: v0, size, font, inset }) => {
  const L = useLook(font); // identity: caption variant + fonts + shape tokens; without one, the profile's variant/font as before
  const variant = L.id?.caption ?? v0;
  const fontFamily = L.body;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: L.cfg({ damping: 12, stiffness: 200 }) });
  const nowMs = page.startMs + (frame / fps) * 1000;
  const isOn = (t: any) => nowMs >= t.fromMs && nowMs < t.toMs + 60;
  const onAccent = onFill(pal.sunny, pal.ink, pal.bg);
  if (variant === "mono-bar" || variant === "serif-lower") {
    // mono-bar: terminal strip (mono, accent border, active word inverted, cursor). serif-lower: left-aligned lower third in the display face.
    const mono = variant === "mono-bar", fs = Math.round((size ?? 64) * (mono ? 0.8 : 1)), bw = Math.max(2, L.id?.shape.border ?? 2);
    return (
      <div style={{ position: "absolute", left: inset ?? 70, right: inset ?? 70, bottom, display: "flex", justifyContent: mono ? "center" : "flex-start", opacity: pop }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: mono ? "4px 14px" : "2px 16px", alignItems: "baseline", padding: mono ? "14px 22px" : "14px 22px 16px",
          background: `${pal.bg}EB`, borderRadius: L.r(mono ? 6 : 4), boxSizing: "border-box",
          ...(mono ? { border: `${bw}px solid ${pal.sunny}` } : { borderTop: `${bw * 2}px solid ${pal.sunny}`, transform: `translateY(${(1 - pop) * 16}px)` }) }}>
          {page.tokens.map((t: any, i: number) => {
            const a = isOn(t);
            return (
              <span key={i} style={{ fontFamily: mono ? L.mono : L.display, fontWeight: mono ? 600 : L.dw(600), fontSize: fs, lineHeight: 1.18, whiteSpace: "pre",
                textTransform: mono ? "uppercase" : undefined, color: mono && a ? onAccent : a ? pal.sunny : pal.ink,
                background: mono && a ? pal.sunny : undefined, padding: mono ? "0 6px" : undefined,
                textDecoration: !mono && a ? `underline ${pal.sunny} 4px` : undefined, textUnderlineOffset: 10 }}>
                {String(t.text).trim()}
              </span>
            );
          })}
          {mono && <span style={{ fontFamily: L.mono, fontSize: fs, lineHeight: 1.18, color: pal.sunny, opacity: Math.floor(frame / 12) % 2 ? 0 : 1 }}>{"\u258D"}</span>}
        </div>
      </div>
    );
  }
  if (variant === "clean") {
    // Calm adult-friendly style: sentence-case, soft shadow, active word gets an accent highlight bar (no outline/tilt).
    const fs = size ?? 64;
    return (
      <div style={{ position: "absolute", left: inset ?? 70, right: inset ?? 70, bottom, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "6px 18px",
        opacity: interpolate(pop, [0, 1], [0, 1]), transform: `translateY(${interpolate(pop, [0, 1], [14, 0])}px)` }}>
        {page.tokens.map((t: any, i: number) => {
          const active = nowMs >= t.fromMs && nowMs < t.toMs + 60;
          return (
            <span key={i} style={{ fontFamily, fontWeight: L.bw(600), fontSize: fs, lineHeight: 1.2, whiteSpace: "pre", padding: "2px 14px", borderRadius: L.r(14),
              color: L.on && active ? onAccent : pal.ink, background: active ? pal.sunny : L.on ? `${pal.white}E0` : "rgba(255,255,255,0.88)", boxShadow: L.shadow("0 2px 10px rgba(20,28,50,0.12)") }}>
              {String(t.text).trim()}
            </span>
          );
        })}
      </div>
    );
  }
  const dk = L.on && isDark(pal.bg), fill = dk ? pal.ink : pal.white, edge = dk ? pal.bg : pal.ink; // dark identity palettes: light fill, dark outline
  return (
    <div style={{ position: "absolute", left: inset ?? 50, right: inset ?? 50, bottom, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "2px 26px",
      transform: `scale(${interpolate(pop, [0, 1], [0.85, 1])})`, opacity: interpolate(pop, [0, 1], [0.3, 1]) }}>
      {page.tokens.map((t: any, i: number) => {
        const active = nowMs >= t.fromMs && nowMs < t.toMs + 60;
        return (
          <span key={i} style={{ fontFamily, fontWeight: 700, fontSize: size ?? 88, lineHeight: 1.12, whiteSpace: "pre",
            color: active ? pal.sunny : fill, WebkitTextStroke: `14px ${edge}`, paintOrder: "stroke fill",
            textShadow: `0 8px 0 ${edge}`, display: "inline-block", transform: active ? "translateY(-8px) rotate(-1.5deg) scale(1.07)" : "none" }}>
            {String(t.text).trim()}
          </span>
        );
      })}
    </div>
  );
};
