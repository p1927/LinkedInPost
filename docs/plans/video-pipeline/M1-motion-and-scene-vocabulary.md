# M1 Motion and scene vocabulary

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Reuse IDs: [R1](R1-reuse-register.md) · Status: motion tokens specified, scene set partly built
Runs: in parallel with L4/D1 (needs the L3 outline's visual types), before the storyboard is final.

## Purpose
Give the writer and director a richer, tested set of ways to show information (so videos stop looking alike) and make motion consistent and measurable, mostly by installing existing Remotion packages and reading existing rules rather than writing code.

## Have
- Remotion 4.0.532 with captions, google-fonts, media-utils, noise, paths, shapes, sfx, transitions.
- Scenes: `Scenes.tsx`, `NewScenes.tsx`, `DataScenes.tsx` (chart line/bar/diverging, timeline, forces), `OrbitScene.tsx`, `Bridges.tsx`; `SCENES.md`.
- Transition choice by profile (`profile.ts presentationByName`), `springTiming` with profile-owned length.
- Vendored official Remotion skills (12) at the matching version, not yet required reading in the episode skill.

## Others have (R1)
- R-40 `@remotion/layout-utils`: measure/fit text. Replaces estimated glyph widths (L5 flaw 3).
- R-41 `@remotion/rough-notation`: hand-drawn emphasis; R-42 light leaks, motion blur, effects (WebGL; needs `angle` GL, test in Docker renderer).
- R-43 Remotion rule files (timing, transitions, sequencing, measuring-text, voiceover, silence-detection, sfx, text-highlights, captions, video-layout).
- R-44 easing/spring tokens, entrance recipe, anti-slop motion checklist.
- R-45..R-48 from manim (concept): numberline/axes/area/value-tracker, morph/transform, attention cues, proportion box.
- R-49 HyperFrames blocks (data-chart, bar-chart-race, flowchart, shader transitions): port 1-2.
- R-11 beat grid (see A1) for cuts that land on musical beats.

## Want
- Required reading for the director/episode skill: the `remotion-markup` rules above (zero code).
- New scene types only where an information shape needs them, in this order: `numberline`/axes tracker (rates, yields, thresholds), `proportion` box (shares, odds), `morph` (equation A becomes equation B, staged-reveal approximation), emphasis layer (rough-notation, focus/indicate). One at a time, each with a sample in `demo/`.
- Motion rules from tokens: no linear easing except progress bars; clamp all `interpolate`; `premountFor` on timed items; scale tweens use perceptual-scale; entrances move 2-3 properties; exits shorter.
- Static motion lint (`tools/check_motion.py`) over `remotion-app/src/*.tsx` (CSS transition/animation, un-clamped interpolate, `Math.random`, linear easing outside bars, Sequence without premount).
- At most one decorative effect (light leak, film burn, zoom-blur) per episode.

## Flaws found
1. Text widths in data scenes are estimated, not measured; compare cell clips long text.
2. Motion rules exist only as prose; nothing checks scene source.
3. Heavy backdrops (feTurbulence) not timed; WebGL effects not tested in Docker renderer.
4. Writer never chooses data scenes (L3/L5), partly because there are few natural-form types.

## Work items
- M1.1 `npm i` pinned `@remotion/layout-utils`, `@remotion/rough-notation` at 4.0.532 (WP-S2); wire measure in data scenes.
- M1.2 Wire Remotion rule files into the episode skill/director prompt (WP-C2).
- M1.3 Motion lint: **Remotion's official ESLint plugin (R-97)** in `remotion-app` (flat config), advisory. We add at most a 30-line rule file for what it lacks (linear easing outside progress bars, un-clamped `interpolate`) (WP-M2). No custom linter.
- M1.4 New scenes in priority order with a demo render each (WP-M3..M5).
- M1.5 Test light-leak/motion-blur/effects in `Dockerfile.render`; keep or drop (WP-M6).
- M1.6 Preview render profile: scale and skip heavy backdrops (shared with L8).

## Acceptance
- Long-label chart, 8-event timeline and compare cell render without clipping (checked by F1 overflow test).
- `check_motion.py` runs clean on current scenes after fixing or waiving each finding.
- Each new scene type has a `SCENES.md` entry, a demo render, passes safe-zone and contrast checks.

## Depends on
L3 (information shapes), D1 (tokens). Feeds L5, L8, F1.

## Open questions
- Appetite for `morph`: the real manim effect is hard in Remotion; accept the crossfade approximation?

## Setup scope (rev 3)
This phase only delivers the layer kit (master plan 6.1): Layout-utils and rough-notation installed and used in one scene each, Remotion rule files in the episode skill, `check_motion.py` advisory, ONE pilot new scene (numberline) to prove the add-a-scene path. Backlog: B-M1-*. Everything else in Want and Work items is improvement work, to be picked from the backlog after setup.

## Risks and mitigations (rev 5)
- Slice 1 adds no new scene types (existing scenes plus layout-utils and the ESLint plugin); new scenes wait until Slice 1 has been reviewed.
- Heavy effects on a small machine: effects tested in Docker renderer before use; backdrop fallback.
