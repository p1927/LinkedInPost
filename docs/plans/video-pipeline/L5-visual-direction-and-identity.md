# L5 Visual direction and identity

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Detail: [STYLE-IDENTITY-PLAN](../youtube-automation/STYLE-IDENTITY-PLAN.md), [STORYBOARD-AND-DECISION-MAP-PLAN](../youtube-automation/STORYBOARD-AND-DECISION-MAP-PLAN.md), `video-pipeline/direction/DESIGN_SYSTEM.md` · Status: S1 built; S2 partly built

## Purpose
Every video gets its own look and its own kinds of visuals, chosen from the information. Audience sets constraints (readability, motion intensity), not the look.

## Have (verified)
- `identity.py` + `direction/identities/archetypes.yaml` (10 archetypes, 2 contrast-checked palettes each, coloraide OKLCH rotation); rotation rules (no repeated archetype+palette in last 5, accent hue 60 degrees apart); simulation: 12 finance episodes gave 12 distinct looks.
- Renderer: `identity.tsx` (provider, 24 fonts, 7 backdrops, caption and term variants, tokens in Number/Compare/Steps/Diagram scenes); new `DataScenes.tsx` with `chart` (line, bar, diverging bar), `timeline`, `forces`; tsc clean; regression frames byte-identical; montage under 5 looks verified 2026-10-05.
- `storyboard.py`, `animatic.py`, `manifest.py`, `scene_edit.py` (free review artifacts and decision log).
- Safe zones preset (`config/safe_zones.yaml`, `tools/check_safe_zones.py`).

## Others have
- Anthropic `frontend-design` / `canvas-design` skills: write a design philosophy first, critique against banned defaults.
- digitalsamba toolkit brand.json + ThemeProvider; LottieFiles motion personalities; julianoczkowski 8 aesthetic philosophies; ui-ux-pro-max data (styles, palettes, pairings).
- Data-journalism looks (FT, Reuters graphics, Bloomberg): direct labels, annotated charts, one idea per frame.
- Remotion official skills; explainroo local layout checks (overflow, small text).

## Want
- Writer (L3/L4) picks visual types from the information relationship; outline enforces variety.
- All scene types and the thumbnail/carousel read the identity.
- Art-direction step shown to the owner with a rationale and banned-defaults critique, override allowed.
- More natural forms: map, isometric blocks, blueprint draw, racing bars, multi-series chart (code paths exist, not rendered).
- Illustration style tied to identity so generated images match the theme.
- Cheap vision-critic on one still per scene (optional).

## Flaws found
1. Writer never used `chart/timeline/forces` in ep24 (no data, no instruction).
2. OrbitScene, Bridges, PhotoScene, thumbnail, carousel, progress bar and clip scrims ignore identity.
3. Blueprint compare cell clips long text; forces layout leaves the lower half empty with a right rail; text widths are estimated, not measured (data scenes).
4. Paper/grain backdrops (feTurbulence) will slow full renders; not measured.
5. ep24 identity was chosen as Ledger from the topic's "money" class, fine, but nothing checks that visuals fit the identity's element set.

## Work items
- L5.1 Identity reaches the remaining components (Orbit, Bridges, Photo, thumbnail, carousel, progress bar, scrims).
- L5.2 Measured text widths (canvas/`measureText` via `@remotion/layout-utils`) in data scenes; render samples with long labels, more than 6 timeline events, multi-series charts.
- L5.3 Safe-zone check for new scene types (probe + preset).
- L5.4 Identity-aware outline validator (L3) and art-direction summary in the outline view.
- L5.5 S2 primitives: map, isometric, blueprint draw, racing bars; only as an information type needs them.
- L5.6 Render-time budget with heavy backdrops; fallback to flat if slow.

## Acceptance
- Golden brief: at least three distinct visual types, one natural-form scene (timeline or chart) per data-bearing question, identity differs from the last 5 episodes, all text at least 28 px and inside safe zones (check passes).
- Re-render ep23 props under a new identity: only the look changes.

## Depends on
L3 (visual type per beat), L2 (data series for charts). Feeds L8.

## Open questions
- Do we keep clip scenes mandatory (lint-enforced) when a video is data-driven? Needs an owner call (waiver exists).

## Setup scope (rev 3)
This phase only delivers the layer kit (master plan 6.1): Identity reads `tokens.yaml`; identity reaches the remaining components (Orbit, Bridges, Photo, thumbnail, carousel, progress bar, scrims); `identity.json` contract. Backlog: B-L5-*. Everything else in Want and Work items is improvement work, to be picked from the backlog after setup.

## Reuse and parallelism (rev 2, 2026-10-06)
IDs refer to [R1](R1-reuse-register.md). Items are leads until a work package opens and runs the file.
- **Take:** colour/brightness/element rules via [D1](D1-design-system-colour-brightness.md); scene vocabulary and measured text via [M1](M1-motion-and-scene-vocabulary.md); R-68 slideshow-risk score on the storyboard (hard fail); R-61 beat-direction for per-beat transition/choreography.
- **Work items re-scoped:** L5.2 (measured text) = M1.1 using `@remotion/layout-utils`; L5.3 (safe zone for new scenes) = F1 sub-check 5; L5.6 (render time) = L8.5.
- **Parallel:** the DESIGN lane (L5 identity, D1 lint, M1 choice, storyboard) runs concurrently with script writing; it needs only the outline.

## Risks and mitigations (rev 5)
- Sameness inside a genre: archetype pool rotation over the last 5 plus fingerprint distance (G1/L6).
- Components ignoring identity: L5.1 coverage list with a render check per component.
