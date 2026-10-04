import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import type { Palette } from "./types";
import { fontFamily } from "./theme";

export type Slide = { h: string; body?: string; image: string; tag?: string; tagColor?: keyof Palette };
export type CarouselProps = { slide: Slide; index: number; total: number; style: Palette; handle?: string };

// Picture-book page: full-bleed illustration + sticker caption card.
export const CarouselSlide: React.FC<CarouselProps> = ({ slide, index, total, style: pal, handle = "Big Questions, Tiny Words" }) => (
  <AbsoluteFill style={{ background: pal.bg, fontFamily }}>
    <Img src={staticFile(slide.image)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(59,47,47,0) 50%, rgba(59,47,47,0.25) 100%)" }} />
    <div style={{ position: "absolute", top: 40, left: 40, right: 40, display: "flex", justifyContent: "space-between" }}>
      <div style={{ background: pal.white, border: `6px solid ${pal.ink}`, borderRadius: 999, padding: "6px 26px", fontWeight: 600, fontSize: 30, color: pal.ink, boxShadow: `0 6px 0 ${pal.ink}` }}>{handle}</div>
      <div style={{ background: pal.sunny, border: `6px solid ${pal.ink}`, borderRadius: 999, padding: "6px 26px", fontWeight: 700, fontSize: 30, color: pal.ink, boxShadow: `0 6px 0 ${pal.ink}` }}>{index + 1}/{total}</div>
    </div>
    <div style={{ position: "absolute", left: 50, right: 50, bottom: 70, background: pal.white, border: `9px solid ${pal.ink}`, borderRadius: 44, padding: "30px 40px 34px", boxShadow: `0 14px 0 ${pal.ink}`, transform: "rotate(-1.2deg)" }}>
      {slide.tag && <div style={{ display: "inline-block", background: pal[slide.tagColor ?? "coral"], color: pal.white, border: `5px solid ${pal.ink}`, borderRadius: 20, padding: "2px 22px", fontWeight: 700, fontSize: 34, marginBottom: 12 }}>{slide.tag}</div>}
      <div style={{ fontWeight: 700, fontSize: 70, lineHeight: 1.05, color: pal.ink }}>{slide.h}</div>
      {slide.body && <div style={{ fontWeight: 500, fontSize: 42, lineHeight: 1.2, color: pal.ink, marginTop: 12, opacity: 0.85 }}>{slide.body}</div>}
    </div>
  </AbsoluteFill>
);
