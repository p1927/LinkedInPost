# D1 Design system: tokens, colour, brightness, element rules

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Reuse IDs: see [R1](R1-reuse-register.md) · Status: spec exists (`direction/DESIGN_SYSTEM.md`), mostly unenforced
Runs: in parallel with L4 script writing (needs only the L3 outline), before L5 storyboard is final. Supplies the rules F1 checks on rendered frames.

## Purpose
One machine-readable source for colour, brightness, type, spacing, element and motion limits, so that "good looking" is a set of checkable rules and not prose.

## Have (verified by reading code)
- `identity.py`: OKLCH palettes (coloraide), `ensure_contrast` to floors (ink 7.0, text/accent 4.5), hue rotation across episodes, lint `identity_contrast`; archetypes in `direction/identities/archetypes.yaml`.
- `direction/DESIGN_SYSTEM.md`: palettes with computed contrast, type pairings, sizes, safe zones, motion tokens, transitions, sound, anti-slop checklist. Status column mostly TODO.
- `config/safe_zones.yaml` presets; `remotion-app/src/theme.ts` (4 fonts), `identity.tsx` (24 fonts, 7 backdrops, tokens).

## Others have (see R1)
- R-31 HyperFrames video-composition: video-medium rules (banding on dark linear gradients, hairlines vanish, light canvases need heavier borders/grain, accent visibility 15-25%).
- R-21/R-22/R-23: coloraide WCAG (have), APCA as advisory, colour-blind simulation.
- R-44 motion/easing/spring tokens and anti-slop checklist (docs/research 09/10, haidrrrry, Remocn).
- R-68/R-69 slideshow-risk and variation checks (OpenMontage concepts).
- Anthropic frontend-design: banned AI-default looks (cream + terracotta for adults).

## Want
1. `direction/tokens.yaml` as the single source: palettes, type scale, spacing, brightness bands, element limits, motion curves/springs/durations, audio levels. Python loads it; a generated `tokens.ts` feeds Remotion.
2. Brightness and colour rules enforced at design time (`identity.py`) and checked on pixels in F1:
   - background luminance band per mode: dark bg OKLCH L 0.12-0.25, light bg L 0.94-0.99; no pure #000/#FFF backgrounds; body text on dark not pure white (about L 0.95) (judgment, tune on real frames)
   - one hero accent per frame; accents separated by >= 3:1 luminance contrast or >= 40 degrees hue; chroma cap for neon accents on dark (judgment)
   - fills carry text against the fill colour, not the page bg (auto-computed)
   - colour-blind check: no data meaning carried by red/green alone; two data colours must stay distinguishable under deuteranopia/protanopia (delta E threshold, tune)
   - banned: full-screen linear gradient on dark, cream + terracotta adult look
3. Element rules enforced in lint before render (thresholds in `qa_checklist.yaml`): font floors (headline 84, secondary 44, caption 56, diagram label 36 at 1080 wide), max words per on-screen line (6) and per scene (12) (judgment), one focal element per scene, max 4 chart colours, content inside safe-zone preset, hold floors (text card 3.5 s, stat 3.0 s, something new every 2-4 s).
4. Slideshow-risk score over the storyboard (R-68), with a hard fail threshold.

## Flaws found
1. Rules live in prose, `identity.py`, `profile.ts` and `qa_checklist.yaml` separately; a number changed in one place silently disagrees with the others.
2. Contrast is checked against flat bg only; text over gradients, images, clips and scrims is unchecked until F1.
3. DESIGN_SYSTEM status column: most palettes and element rules TODO.
4. Several scenes ignore identity (see L5 flaws): colour rules cannot hold for them.

## Work items
- D1.1 `tokens.yaml` + loader in `identity.py` + generated `tokens.ts` (WP-E1).
- D1.2 Brightness/accent/colour-blind/fill-label checks added to `identity.lint` (WP-D2).
- D1.3 Element-rule lint rules in `lint.py` + thresholds in `qa_checklist.yaml`, each with `enforced_by` so `selfcheck` verifies (WP-D3).
- D1.4 Slideshow-risk scorer and variation checker: **copy OpenMontage `slideshow_risk.py` and `variation_checker.py` as is** (stdlib-only, R-68, R-69), wrap with a 20-line adapter that feeds them our storyboard (WP-D4). No scorer written by us.
- D1.5 Bring DESIGN_SYSTEM.md status column in line with what is enforced.
- D1.6 Optional APCA advisory using the npm reference implementation.

## Acceptance
- A seeded set of bad palettes (low-contrast accent, neon-on-dark, red/green pair, pure-black bg) each fail with a named rule; the 10 archetypes still pass.
- Changing one token changes both Python and Remotion output.
- Golden brief passes element lint with no waiver.

## Depends on
L3 outline (visual types, text per beat). Feeds L5, M1, F1, L6.

## Open questions
- Brightness bands, accent separation and word limits are judgment numbers: run F1 warn-only on ep20 to ep24 first and set error levels from what looks right.
- Allow archetype-specific overrides (e.g. a high-contrast "paper" look) or keep global bands?

## Setup scope (rev 3)
This phase only delivers the layer kit (master plan 6.1): `tokens.yaml` loaded by Python and generated for Remotion; brightness, accent, colour-blind and element rules as lint rules with good and bad fixtures; slideshow-risk score wired advisory. Backlog: B-D1-*. Everything else in Want and Work items is improvement work, to be picked from the backlog after setup.

## Risks and mitigations (rev 5)
- Judgment thresholds: advisory first; calibrated on the E1 reference episode and its degraded copy, then promoted by precision.
- Rules becoming a template: pools and knobs keep variety (G1).
