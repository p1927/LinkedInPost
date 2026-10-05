# L8 Render and packaging

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Status: built; gaps in identity coverage and render speed

## Purpose
Turn `episode.json` + assets into a 9:16 video, carousel and thumbnail that look right on a phone, plus the titles, descriptions, tags and disclosures needed to post.

## Have (verified)
- Remotion 4.0.532 app (`remotion-app/src`): `Episode.tsx`, `Scenes.tsx`, `NewScenes.tsx`, `DataScenes.tsx`, `Captions.tsx`, `Bridges.tsx`, `OrbitScene.tsx`, `Thumbnail.tsx`, `Carousel.tsx`, `identity.tsx`; `SCENES.md` documents scene types; Docker render available (`Dockerfile.render`, `docker-compose.yml`).
- Episodes without `identity` render byte-identical (regression frames 250/900/1540 match).
- Render QA: ffprobe duration/size/loudness checks, contact sheet, safe-zone check, `packaging.py` (titles, descriptions with sources and disclaimers, tags, Instagram caption), `seo.py`.
- ep23 rendered at 86.3 s (first render was 103 s vs 89 s estimate; fixed with figure penalty, rounded numbers, voice speed).

## Others have
- Remotion official skills, layout minimums (84 px headline, 44 px support).
- explainroo local checks: text overflow/overlap, small text, per-scene stills.
- OpenTimelineIO / FCPXML export for a hand-off to an NLE (OpenChatCut); not needed now.

## Want
- All scene types, captions, bridges, thumbnail and carousel read the identity.
- Fast preview render (low-res, no heavy backdrops) for review, full render for final.
- Measured text layout (no estimated glyph widths) and an automatic overflow/overlap check on stills.
- Packaging that reuses the brief: title and description answer the owner's first question; sources listed from `research.json`; "not financial advice" for finance.
- Contact sheet and a 3-frame summary attached to the gate report.

## Flaws found
1. Orbit, Bridges, Photo, thumbnail, carousel, progress bar and clip scrims ignore identity (see L5.1).
2. No measured speed for paper/grain backdrops; ep23 took longer than estimated.
3. Blueprint compare clipping; forces layout empty lower half (L5).
4. No overflow check run on stills.

## Work items
- L8.1 Identity across remaining components (shared with L5.1).
- L8.2 Preview render profile (scale, skip filters) and timing log.
- L8.3 Overflow/small-text check on stills (explainroo ideas, ported).
- L8.4 Packaging uses `brief.json` + `research.json` for title, description and source list.
- L8.5 Render time budget and backdrop fallback.

## Acceptance
- Golden brief renders with preview profile in under 3 minutes; full render length within 25-90 s (or the audience range); no text overflow; loudness within target; thumbnail and carousel share the identity.

## Depends on
L5, L7. Feeds L9.

## Open questions
- Do we want multiple aspect ratios (16:9 long-form) now? The video-pipeline direction memory says both Shorts and long-form; the renderer is 9:16-only today.

## Setup scope (rev 3)
This phase only delivers the layer kit (master plan 6.1): Preview render profile, pre-render composition validator, ffmpeg concat-filter audit, packaging reads `brief.json` and `research.json`. Backlog: B-L8-*. Everything else in Want and Work items is improvement work, to be picked from the backlog after setup.

## Reuse and parallelism (rev 2, 2026-10-06)
IDs refer to [R1](R1-reuse-register.md). Items are leads until a work package opens and runs the file.
- **Take:** R-14 ai-film post-production gotchas (audit our assemble for concat-demuxer silent truncation, use probed durations, picture-only fades, two-pass loudness); R-28 pre-render composition validator; R-43 Remotion rules for timing/transitions/captions; R-07 caption grouping; R-40 layout-utils; R-42 light leak/motion blur only if the Docker renderer passes the test.
- **Work items added:** L8.6 preview-render then F1 then full render; L8.7 render the full video in parallel chunks (Remotion concurrency / frame ranges) and concatenate with the ffmpeg concat filter.
- **Parallel:** preview render and A1 mix are independent; F1 sub-checks run concurrently on the preview.

## Risks and mitigations (rev 5)
- Machine load: render concurrency cap about 4 to 5 chunks, preview at low resolution, disk watchdog before renders.
- Finance wording on screen and in packaging: C1 rules.
- Concat truncation and loudness bugs: audit against R-14.
