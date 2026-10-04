/**
 * Thumbnail.tsx — static thumbnail compositions
 *
 * ThumbYT    1280×720  YouTube thumbnail
 * ThumbCover 1080×1920 Reels / Shorts cover
 *
 * Design goal: legible at 160 px wide, high contrast, no tiny text,
 * subject fills frame, text on a strong plate / outline.
 */

import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import type { ThumbnailProps } from "./types";
import { fontFor } from "./theme";

// ── Shared plate component ─────────────────────────────────────────────────

const TitlePlate: React.FC<{
  title: string;
  kicker?: string;
  badge?: string;
  accent: string;
  ink: string;
  white: string;
  ff: string;
  /** "yt" → side plate | "cover" → full-width bottom plate */
  layout: "yt" | "cover";
}> = ({ title, kicker, badge, accent, ink, white, ff, layout }) => {
  if (layout === "yt") {
    return (
      <>
        {/* Badge chip */}
        {badge && (
          <div
            style={{
              position: "absolute",
              top: 48,
              left: 48,
              background: accent,
              color: ink,
              fontFamily: ff,
              fontWeight: 700,
              fontSize: 32,
              borderRadius: 10,
              padding: "8px 22px",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {badge}
          </div>
        )}
        {/* Title plate — bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(0deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.72) 60%, transparent 100%)",
            padding: "120px 56px 52px",
          }}
        >
          {kicker && (
            <div
              style={{
                fontFamily: ff,
                fontSize: 32,
                fontWeight: 600,
                color: accent,
                marginBottom: 10,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              {kicker}
            </div>
          )}
          <div
            style={{
              fontFamily: ff,
              fontSize: 88,
              fontWeight: 700,
              lineHeight: 1.05,
              color: white,
              WebkitTextStroke: `3px rgba(0,0,0,0.6)`,
              paintOrder: "stroke fill",
              maxWidth: 900,
            }}
          >
            {title}
          </div>
        </div>
      </>
    );
  }

  // Cover (1080×1920) — bottom 40% plate
  return (
    <>
      {/* Badge chip */}
      {badge && (
        <div
          style={{
            position: "absolute",
            top: 240,
            left: 72,
            background: accent,
            color: ink,
            fontFamily: ff,
            fontWeight: 700,
            fontSize: 44,
            borderRadius: 14,
            padding: "12px 32px",
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          {badge}
        </div>
      )}
      {/* Bottom plate */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "linear-gradient(0deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.78) 55%, transparent 100%)",
          padding: "240px 72px 130px",
        }}
      >
        {kicker && (
          <div
            style={{
              fontFamily: ff,
              fontSize: 46,
              fontWeight: 600,
              color: accent,
              marginBottom: 14,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            {kicker}
          </div>
        )}
        <div
          style={{
            fontFamily: ff,
            fontSize: 128,
            fontWeight: 700,
            lineHeight: 1.05,
            color: white,
            WebkitTextStroke: `4px rgba(0,0,0,0.55)`,
            paintOrder: "stroke fill",
          }}
        >
          {title}
        </div>
      </div>
    </>
  );
};

// ── ThumbYT ───────────────────────────────────────────────────────────────

export const ThumbYT: React.FC<ThumbnailProps> = ({ title, kicker, image, palette, accent, badge, focusY = 0.42, zoom = 1.0 }) => {
  const ff = fontFor("inter");
  const words = title.trim().split(/\s+/);
  const half = Math.ceil(words.length / 2);
  const lines = [words.slice(0, half).join(" "), words.slice(half).join(" ")].filter(Boolean);
  return (
    <AbsoluteFill style={{ background: palette.bg, overflow: "hidden", fontFamily: ff }}>
      {/* diagram panel (right): square crop of the hero frame, centred on the diagram */}
      <div style={{ position: "absolute", right: 0, top: 0, width: 720, height: 720, overflow: "hidden" }}>
        <Img
          src={staticFile(image)}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `50% ${focusY * 100}%`, transform: `scale(${zoom})`, transformOrigin: `50% ${focusY * 100}%` }}
        />
        <AbsoluteFill style={{ background: `linear-gradient(90deg, ${palette.bg} 0%, rgba(0,0,0,0) 22%)` }} />
      </div>
      {/* text column (left) */}
      <div style={{ position: "absolute", left: 56, top: 0, bottom: 0, width: 640, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
        {badge && (
          <div style={{ alignSelf: "flex-start", background: accent, color: palette.white, fontWeight: 800, fontSize: 30, letterSpacing: 2, padding: "8px 20px", borderRadius: 10 }}>{badge}</div>
        )}
        <div style={{ color: palette.ink, fontWeight: 900, fontSize: 124, lineHeight: 0.98, letterSpacing: -2, textTransform: "uppercase" }}>
          {lines.map((l, i) => (
            <div key={i} style={{ color: i === lines.length - 1 ? accent : palette.ink }}>{l}</div>
          ))}
        </div>
        {kicker && <div style={{ color: palette.ink, opacity: 0.75, fontWeight: 700, fontSize: 38, textTransform: "uppercase", letterSpacing: 1 }}>{kicker}</div>}
      </div>
    </AbsoluteFill>
  );
};

// ── ThumbCover ────────────────────────────────────────────────────────────

export const ThumbCover: React.FC<ThumbnailProps> = ({ title, kicker, image, palette, accent, badge, focusY = 0.42, zoom = 1.0 }) => {
  const ff = fontFor("inter");
  return (
    <AbsoluteFill style={{ background: palette.ink, overflow: "hidden" }}>
      <Img
        src={staticFile(image)}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `50% ${focusY * 100}%`, transform: `scale(${zoom})`, transformOrigin: `50% ${focusY * 100}%` }}
      />
      {/* Vignette + colour grade */}
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.5) 100%)" }}
      />
      <TitlePlate
        title={title} kicker={kicker} badge={badge}
        accent={accent} ink={palette.ink} white={palette.white}
        ff={ff} layout="cover"
      />
    </AbsoluteFill>
  );
};

// Default props for studio preview
export const THUMB_DEFAULT: ThumbnailProps = {
  title: "How It Works",
  kicker: "Explained",
  image: "ep01-interest-rates-v2/s1.png",
  palette: {
    bg: "#EEF3FA", ink: "#1F2A44", sunny: "#FFC24D", coral: "#E8574F",
    sky: "#2F9BE6", mint: "#22A98B", grape: "#5E56D6", white: "#FFFFFF",
  },
  accent: "#E8574F",
  badge: "HOW IT WORKS",
};
