# F1 Rendered-frame QA (pixel-level checks)

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Reuse IDs: [R1](R1-reuse-register.md) · Status: contact sheet only
Runs: after the preview/full render; its sub-checks run in parallel (independent, read-only on the same stills).

## Purpose
Check what the viewer actually sees, with numbers. Today `verify.render_qa` makes a 270 px contact sheet and measures loudness; it checks no pixel property.

## Have
- `verify.render_qa`: ffprobe, ebur128 loudness, 270 px contact sheet; `tools/check_safe_zones.py`; `SafeProbe.tsx`.
- ffmpeg 8.0.1 with `signalstats`, `scdet`, `blackdetect`, `freezedetect`, `entropy`, `bitplanenoise`, `photosensitivity`; `coloraide`, `numpy` in `.venv`; no PIL.

## Others have (R1)
- R-20 HyperFrames contrast-report: measure contrast against the actual pixels behind each text element (capture twice, second time with glyph paint hidden), JSON + magenta/yellow/green overlay, exit 1 on fail. Cannot run as is (needs `@hyperframes/*` and an HTML runtime); port the technique to a Remotion `still` + DOM walk.
- R-24 ffmpeg luma/scene/black/freeze stats; R-25 flash limit (no ready checker; small counter on per-frame luma); R-26 macOS Vision OCR as cross-check; R-27 seam gate idea; R-30 caption-occlusion and transition-similarity ideas; R-32 ViMax best-of-N VLM image judge; R-33 shotkit critic rubric; R-28/R-29 composition validator and pacing checks.

## Want (sub-checks, all parallel)
1. **Contrast behind text**: for each text box (exact from the DOM in a Remotion `still`), WCAG ratio vs median luminance of the composited pixels with glyphs hidden. Fail < 4.5, large text < 3.0. APCA as advisory.
2. **Brightness profile** per scene via `signalstats`: mean/5th/95th percentile luma; scene-to-scene mean jump at cuts, warn above 0.35 on 0-1 scale (judgment); clipping (>2% of pixels at min/max) warning (judgment).
3. **Flash safety**: no more than 3 flashes per second (WCAG 2.3.1, the sourced threshold) from per-frame luma swings; hard error.
4. **Overflow / small text**: measured text box vs container and safe zone (uses `@remotion/layout-utils` numbers from M1), minimum rendered text height.
5. **Safe zones** at pixel level on the same stills (existing tool).
6. **Banding / gradient**: level-count histogram of large smooth regions (needs tuning on a known-good render; unverified).
7. **Seams**: transition frames similar enough / no dead frames; `freezedetect`, `blackdetect`.
8. **Audio checks** shared with A1 (loudness, peak, duck depth) and T1 (audio vs script).
9. **Overlay contact sheet** with failing boxes coloured, 3-frame summary attached to the gate report.
10. Optional vision critic on one still per scene (ViMax-style judge, capped retries, inconclusive on failure, never blocks).

## Flaws found
1. Contrast is checked at palette level only; text over images, gradients, scrims, clips unchecked.
2. No brightness or flash check: a dark to white cut could ship.
3. Estimated text widths cause clipped labels no check catches.
4. No Python dependency for images (no PIL); must use ffmpeg raw frames + numpy.

## Work items
- F1.1 `tools/frame_qa.py` as a thin orchestrator over **copied OpenMontage `visual_qa.py` (R-30)**, ffmpeg filters (R-24) and coloraide contrast, not a new QA engine: sample stills (hook, each scene mid-hold, last), run sub-checks in a thread pool, write `out/<id>/frame_qa.json` + overlay (WP-F2).
- F1.2 Remotion probe that dumps text boxes + colours per frame (extend `SafeProbe.tsx`) so contrast uses real boxes (WP-F3).
- F1.3 ffmpeg stats parsers for brightness/flash/black/freeze (WP-F4).
- F1.4 Wire into `verify.render_qa` and the unified `gate_report.json` (L6.5), warn-only for ep20 to ep24 first (WP-F5).
- F1.5 Tune thresholds on ep20-ep24 sheets, then promote to errors.

## Acceptance
- Run on ep23/ep24 renders: report agrees with what a human sees on the overlay sheet; a synthetic fixture with low-contrast text, a white-flash cut and a clipped label each fail exactly the intended check.
- Whole F1 run under 2 minutes for a 90-second video.

## Depends on
L8 render, D1 thresholds, M1 measured text, T1/A1 for audio checks. Feeds L6 gates and owner review.

## Open questions
- Advisory first (recommended) or blocking from day one?
- Is a vision critic worth the cost on every episode, or only on request?

## Setup scope (rev 3)
This phase only delivers the layer kit (master plan 6.1): `frame_qa.py` sampling stills, ffmpeg brightness/flash/black/freeze parsing, contrast-behind-text from the DOM text-box probe, overlay sheet, fixtures (low-contrast text, white-flash cut, clipped label) all advisory. Backlog: B-F1-*. Everything else in Want and Work items is improvement work, to be picked from the backlog after setup.

## Risks and mitigations (rev 5)
- Pixel checks measure legibility, not taste: reported as 'legibility and safety', never as 'quality'; owner verdict stays the quality signal (E1).
- Noisy checks: advisory, precision-tracked (E1), flash check is the only hard error from day one (sourced limit).
- Runtime: sub-checks in parallel, stills sampled not every frame.
