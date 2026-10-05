/**
 * SafeProbe.tsx — render-time safe-zone measurement (used only by tools/check_safe_zones.py via scripts/safe-probe.mjs).
 *
 * Renders the normal Episode, then after layout + fonts measures every VISIBLE text box in the DOM and console.logs
 * "SAFEPROBE {json}" for the frame. Text is found automatically (every non-empty text node: HTML via Range.getClientRects,
 * SVG via the <text> element box), so scene code needs no tagging for text. Tags (data-safe-kind on any ancestor):
 *   "art"    decoration: its box is checked against the art-bleed box instead (e.g. sparkles)
 *   "ignore" not checked (chrome such as a progress bar, if it ever carries text)
 * Boxes are canvas pixels (getBoundingClientRect includes CSS/SVG transforms). Invisible elements (display none, visibility
 * hidden, effective opacity < 0.15, zero size) are skipped, so not-yet-revealed rows do not count.
 */
import React, { useLayoutEffect } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";
import { Episode } from "./Episode";
import type { EpisodeProps } from "./types";

type Rect = { x: number; y: number; w: number; h: number; kind: "text" | "art"; text: string };

function visible(el: Element | null): boolean {
  let op = 1;
  for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    op *= parseFloat(cs.opacity || "1"); // SVG `opacity` attributes are presentation attributes, so they show up here too
  }
  return op >= 0.15;
}

function measure(): Rect[] {
  const out: Rect[] = [];
  const seenSvg = new Set<Element>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const txt = (n.textContent ?? "").trim();
    const el = n.parentElement;
    if (!txt || !el || el.closest("style,script,head")) continue;
    const tag = el.closest("[data-safe-kind]")?.getAttribute("data-safe-kind");
    if (tag === "ignore" || tag === "art") continue;
    if (!visible(el)) continue;
    if (el instanceof SVGElement) {
      const t = el.closest("text") ?? el;
      if (seenSvg.has(t)) continue;
      seenSvg.add(t);
      const r = t.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) out.push({ x: r.left, y: r.top, w: r.width, h: r.height, kind: "text", text: (t.textContent ?? "").trim().slice(0, 48) });
      continue;
    }
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of Array.from(range.getClientRects())) {
      if (r.width > 0.5 && r.height > 0.5) out.push({ x: r.left, y: r.top, w: r.width, h: r.height, kind: "text", text: txt.slice(0, 48) });
    }
  }
  for (const el of Array.from(document.querySelectorAll('[data-safe-kind="art"]'))) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) out.push({ x: r.left, y: r.top, w: r.width, h: r.height, kind: "art", text: "" });
  }
  return out.map((r) => ({ ...r, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) }));
}

const Probe: React.FC = () => {
  const frame = useCurrentFrame();
  useLayoutEffect(() => {
    const h = delayRender(`safe-probe ${frame}`);
    let cancelled = false;
    const root = () => document.getElementById("safe-probe-root")?.getBoundingClientRect();
    const t0 = performance.now();
    const tick = () => {
      if (cancelled) return;
      const r = root();
      const placed = r && Math.abs(r.top) < 1 && Math.abs(r.left) < 1 && Math.abs(r.width - innerWidth) < 1;
      if (!placed && performance.now() - t0 < 3000) { setTimeout(tick, 16); return; }
      if (!placed) console.warn("[SafeProbe] layout did not settle within 3 s; measuring anyway");
      console.log("SAFEPROBE " + JSON.stringify({ frame, rects: measure(), waited: Math.round(performance.now() - t0) }));
      continueRender(h);
    };
    // Remotion lays the composition out in a temporary (off-screen, narrow) container first: wait until the root sits at 0,0 full width.
    document.fonts.ready.then(() => requestAnimationFrame(tick));
    return () => { cancelled = true; continueRender(h); };
  }, [frame]);
  return null;
};

export const SafeProbeEpisode: React.FC<EpisodeProps> = (props) => (
  <AbsoluteFill id="safe-probe-root">
    <Episode {...props} />
    <Probe />
  </AbsoluteFill>
);
