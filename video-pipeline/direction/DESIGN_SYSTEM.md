# Design system (the one spec for how our videos look and move)

Owner of: colour, type, motion, transitions, safe zones, sound levels. Profiles (`config/profiles/*.json`) are *instances* of this spec; the renderer (`remotion-app/src/`) implements it; `verify.render_qa` checks what can be checked mechanically. Do not write look/feel rules anywhere else; edit here and in the profile JSON.
Sources and evidence: `docs/research/video/09-remotion-skills.md` (what the popular Remotion skills teach, stars, risks) and `10-video-design-skills.md` (palettes with computed contrast, motion tokens, transition vocabulary). Rules marked *judgment* are not sourced; measure on our analytics before treating as law.
Status column: **DONE** = implemented in code/profiles, **TODO** = specified, not built.

## 1. Principles
1. Audience decides the look, not the topic: the card (`direction/audiences/*.yaml`) names the profile and the illustration style. Kids = warm storybook; adults = clean editorial. Never put one audience's art inside the other's interface (found in ep01-v2 explainer-clean render: kid picture-book art under a navy UI).
2. One accent per frame, one dominant transition direction per episode, one visual dialect per declared segment (default: one segment, the audience's native look; a cinematic cold-open segment is allowed only inside the style envelope, section 11).
3. Nothing linear except progress bars and audio ramps. Entrances move 2-3 properties together; exits are shorter and subtler.
4. Hold is a design tool: key info rests at least 1 s after it settles; something new on screen every 2-4 s, a new scene every 6-12 s; the first visual hook in the first 5 s.
5. Sound is half the quality: levels below are rules, not taste.
6. Verify by looking: render stills at hook, holds and last frame; read them before reporting.

## 2. Colour (contrast computed against the background; text needs >= 4.5:1, large text >= 3:1)
| Look | Palette | bg | text | accents (use as text only if >= 4.5) | Status |
|---|---|---|---|---|---|
| Kids "Sunny Meadow" | warm cream | `#FFF6E5` | `#2B2D42` 12.6 | burnt orange `#B45309` 4.7 (text OK); coral `#E5484D` 3.7 and teal `#0E8A7D` 4.0 = large text/shapes only; `#FFD166` fill only | TODO (storybook-v2 still uses the older palette) |
| Kids "Twilight Story" (night/space) | deep indigo | `#1F2A55` | `#FFF8E7` 13.0 | star `#FFC857` 9.0, cyan `#7BDFF2` 9.0, rose `#F7A8C4` 7.5 | TODO |
| Adult "Paper Clean" (light, default for explainers) | off-white | `#FAFAF7` | `#14213D` 15.3 | blue `#2563EB` 4.9, teal `#0F766E` 5.2, amber text `#B45309` 4.8, muted `#5B6577` 5.6 | partly (explainer-clean uses a similar teal/coral set) |
| Adult "Ink & Signal" (dark) | deep navy | `#0F1B2D` | `#F4F7FB` 16.1 | cyan `#4CC9F0` 9.0, amber `#FFB703` 9.9, orange `#FF7A45` 6.7, muted `#8A99AD` 6.0 | TODO |
| Adult "Deep Space" (science/space) | violet-black | `#1A1033` | `#FFFFFF` 18.0 | coral `#FF6B6B` 6.5, yellow `#FFD93D` 13.1, green `#6BCB77` 9.0 | TODO |
Rules: bright fills (yellow, mint, coral at < 4.5) never carry text on the cream/off-white backgrounds; put ink on the fill. Avoid the cream + terracotta "AI default" look for adults. Photographic or AI raster mixed with flat art: one neutral grade and a 10-15% tint toward the background so it does not look pasted-in.

## 3. Type
Fonts must come from `@remotion/google-fonts` (installed at 4.0.532). Kids: Fredoka + Nunito (Patrick Hand / Baloo 2 alternatives). Adults: Inter or Manrope body, Space Grotesk headings, JetBrains Mono for numbers/labels, Fraunces + Inter for editorial episodes. Captions 52-62 px bold, two lines at most, sentence case for adults, no decorative tracking, no gradient text, glow only on `explainer-bold`. Numbers use tabular figures. Status: Fredoka/Poppins/Inter loaded (DONE); pairings per palette (TODO).

## 4. Layout and safe zones
- Safe zones are PRESETS in `config/safe_zones.yaml`, chosen per media type by the profile (`safeZone`), resolved by `run.py` into `props.profile.safe` and read by the renderer. **Value of record (decided 2026-10-05): `shorts_9x16_platform`** (default; all four profiles), from the platforms' own overlays (YouTube/Google Ads vertical template [V], TikTok in-feed templates [W-measured], Meta Reels ads guidance [S]; evidence in the yaml): text and key subjects in x 90-990, y 250-1500; nothing important at x > 880 below y 840 (right action rail); word captions CSS `bottom` >= 420 and centred in x 200-880 (band y 1280-1500); progress bar `top: 140` (chrome, may sit under platform UI); decorations may bleed to x 24-1056, y 120-1800, backgrounds full-bleed. The renderer reads it for the content band, progress bar, captions (min bottom + inset), term stickers/cards, photo label/lower-third, diagram node layouts, and all OrbitScene text (headline/readout/note/legend and the collision-placed body labels, clamped to sides, top and rail); ring geometry is art. Render-time check: `tools/check_safe_zones.py` (DOM text boxes from real stills vs `safe_zones.violations()`, run by `verify.render_qa`; report `out/<id>/safe_zone_report.json`). `shorts_9x16` (y 220-1460, sides 60) is what episodes before 2026-10-05 were rendered with; `shorts_9x16_strict` = the ads-template intersection (x ~120-888, y 288-1248), unrendered. `safe_zones.py` gives `box(kind)` for lint/verify. **DONE**.
- 16:9 (1920x1080): preset `longform_16x9` is defined from the old spec (margins 96 px sides / 108 px top-bottom); there is no 16:9 profile or layout yet and its captions band overlaps the content band (resolve with the first 16:9 profile). TODO.
- One focal element per scene; headline >= 84 px and secondary text >= 44 px on 1080-wide frames; text height floor 56 px for captions. Term cards and number scenes must be checked against these. TODO (lint/verify check).

## 5. Motion tokens (30 fps)
Easings: `outExpo bezier(0.16,1,0.3,1)` default entrance/camera; `outCubic (0.33,1,0.68,1)` text; `outQuart (0.25,1,0.5,1)` snappy kinetic text; `inOutCubic (0.65,0,0.35,1)` repositioning; `inCubic (0.32,0,0.67,0)` exits only; `linear` only for progress bars/loops/audio.
Springs: `smooth {damping:200}` adult default (no bounce); `snappy {damping:20,stiffness:200}` chips/numbers; `soft-pop {damping:12,stiffness:120}` kids stickers only; `heavy {damping:30,mass:2}` large panels.
Durations: micro 6-9 f; word/text entrance 12-15 f; element entrance 15-20 f; camera move 24-36 f; scene transition 12-18 f (adult) / 15-24 f (kids); exits 20-30% shorter. Stagger 3-8 f per item, capped ~24 f total. Entrance recipe: opacity 0->1 + rise 16-40 px + scale 0.95->1 (never from 0), `extrapolate: clamp`, `output: perceptual-scale` for scale tweens.
Status: scene transitions now eased with `springTiming({damping:200})` and profile-owned length via `transitionFrames` (storybook-v2 12, explainer-bold 14, explainer-clean 18) **DONE**. Shared entrance helper and the `motion` block in profiles (named easing/spring presets) **TODO**. Existing scene code uses only ~9 `spring()` calls; migrate scene by scene.

## 6. Transitions (beat -> presentation)
One dominant direction (default slide from-right = "next point"); exit and entry on the same axis; at most 3 distinct presentations per episode; at most one decorative effect (light leak / film burn / zoom-blur / ripple) per episode, kept for the "whoa" beat.
| Beat | Adult | Kids |
|---|---|---|
| next point | slide from-right, ease 15 f | slide from-right, 12-20 f |
| quick fact / hard cut | fade 6-8 f or none | fade 10 f |
| zoom into mechanism | zoom-in-out / cross-zoom 18 f | iris 20 f |
| reveal / conclusion | wipe from-bottom 18 f | clock-wipe / iris 24 f |
| chapter change | push-cut / blur-slide 18 f | book-flip 24 f + page-turn SFX |
Avoid in the adult look: flip, swap, crosswarp, ripple. Status: presentation names available via `profile.ts presentationByName`: slide, fade, wipe, flip, clock, iris (**DONE**); zoom-in-out, push-cut, blur-slide, dreamy-zoom, book-flip, light-leak overlay, whip-pan (remocn, MIT, port with notice) **TODO**; shader-based ones need a render-compat test. Cold-open seam: freeze-rewind and question-card replace the profile transition with their own segment (hard cut in and out, 12-24 f / 24-45 f); a J-cut keeps the profile transition and only leads the audio **DONE** (section 11).

## 7. Sound
Mix target -14 LUFS (speech-only -16 acceptable), true peak <= -1.5 dBTP (**DONE**: `run.py` loudnorm). Music instrumental, bed 18-20 dB under narration, duck 6-12 dB with 6-9 f ramp down before the first word and 15-20 f up after the last (**DONE** in `Episode.tsx`, per-profile `musicDuck`). SFX: at most one per transition, start 0-1 frame early, 200-500 ms, whoosh/page-turn/click/ding only (no meme sounds). Kids may add soft pop. Check the *rendered* peak, because Remotion `volume` is a multiplier. Status: render-level peak/loudness report **DONE** (`verify.render_qa`).

## 8. Anti-slop review checklist (run on stills before approving a render)
No linear easing; no lone fades as the only entrance; no element within the safe-area bands; no more than one accent colour per frame; no AI-drawn glyphs or fake text in images (watch signs, labels, arrows); no mixed art styles inside one video unless a declared segment boundary with a bridge allows it (section 11); no more than 3 distinct transitions; captions readable over the busiest frame; something moves in the first 15 frames and nothing is static for > 90 frames; at least three full-stillness holds.

## 9. Sources not adopted (see research 09/10 "risks")
OpenMontage (AGPL, numbers only), HTML/Playwright motion skills, remotion-superpowers (installs MCP servers), anything2explainer / video-talkcraft (non-commercial licences). Do not install any skill that runs `npx`/`curl|bash` installers; read-and-distill only.

## 10. TODO triage (2026-10-05)
Every TODO above is unbuilt *spec*, not an inconsistency between files. None blocks the current pipeline; none is being worked in the consistency pass (docs/plans/youtube-automation/FIX-PLAN.md). Owners:
- Palettes with computed contrast (section 2 TODO rows): design pass; build when a profile adopts the palette.
- Shared entrance helper and `motion` block in profiles (section 3): renderer pass.
- 16:9 layout/profile (section 4): needed only for long-form; defer until long-form starts.
- Headline >= 84 px / secondary >= 44 px check (section 4): needs element-level data (position, size) that the episode format does not carry yet; revisit with the shot/element layer.
- Extra transitions (zoom-in-out, push, etc., section 6): renderer pass.
- Safe-zone numbers: DONE 2026-10-05, value of record `shorts_9x16_platform` in `config/safe_zones.yaml` (researched from platform overlays). Mechanical check of element positions: DONE 2026-10-05 (`tools/check_safe_zones.py`, DOM-measured at render time, in `verify.render_qa`). Not covered: text baked into images/clips and non-text key subjects.

## 11. Style resolution: who decides what (added 2026-10-05, direction brain)
Style is never improvised by the director agent. It is resolved down a chain, and each layer can only NARROW the layer above it:
1. **This file** (owner decisions): palettes with contrast, type, motion tokens, safe zones, sound, the anti-slop checklist, and the rules below.
2. **Profile** `config/profiles/<name>.json`: the concrete instance (palette, grade, captions, transitions) plus `direction: {look, dialects}`: which DESIGN_SYSTEM look it implements and which segment dialects it can host. A profile with no `grade` or an incompatible palette lists only `native`.
3. **Audience card** `direction/audiences/<id>.yaml`: who it is for, `remotion_profile`, `illustration_style`, and `direction: {modes, dialects, lenses, cold_open_max_s}` (what may be directed there; e.g. kids: no cinematic dialect, two gentle lenses, 8 s cold open cap; older adults: no drama).
4. **Craft cards** (`direction/craft/`): lenses, archetypes, bridges. They are filtered by the envelope above; a lens's `palette_compat` must include the profile's `look`, its `audience_fit` the audience. A craft card never overrides a profile.
5. **Director agent**: chooses inside the envelope and records it (`direction.mode`, `lens`, `style_segments`, `cold_open.bridge`). Code: `brain.style_envelope(audience)` computes the intersection; `director.py` injects it as a binding block; `lint.py` enforces it (`dir_mode_allowed`, `dir_style_segment`, `dir_lens_allowed`, `dir_cold_open_audience_cap`, `dir_style_bridge`).
**Dialects** (a dialect = medium + grade + palette use for one segment):
- `native`: everything in the audience's `illustration_style`, clips prompted in that same medium and graded by the profile. Always available; the default and the only dialect for kids and older adults today.
- `cinematic`: AI clips with real-film grammar (lens, motivated light, axis, cutting) for a short cold open or documentary insert. Rules: (a) declared in `direction.style_segments[]` with scene ids, joined by one bridge from `direction/craft/modes.yaml` (all six render today); (b) one neutral grade toward the profile (`grade`), 10-15% tint toward the profile background (the existing raster-with-flat-art rule in section 2); (c) one accent hue shared with the explainer, carried across the seam together with one anchor (hero object, silhouette, screen position, motion vector or sound); (d) never switch dialect mid-scene; build the seam in Remotion, not in a clip; (e) at most one segment change in and one back (hybrid return).
Status: envelope, profile/audience policy and lint **DONE**; all six bridges render **DONE** (2026-10-05): narrator-step-in, match-cut and pull-back are built from scene content; freeze-rewind (held last frame, desaturate, eased scrub-back, VO on the scrub), J-cut (first explainer narration leads its picture by `bridge_frames`, default 15 f) and question-card (full-frame palette card with `cold_open.question`, music drops to silence) are drawn by `remotion-app/src/Episode.tsx` + `Bridges.tsx` from `props.coldOpen`, timed by `run.py` `bridge_plan`. Look names in profiles map to section 2: storybook-v2 = Sunny Meadow (older palette still in use), explainer-clean and explainer-large = Paper Clean, explainer-bold = Ink & Signal.
