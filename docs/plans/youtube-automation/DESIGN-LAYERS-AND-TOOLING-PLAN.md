# Design layers + tooling plan (HyperFrames, Parakeet, rules for colour / brightness / elements)

Date: 2026-10-06. Status: investigation done, nothing wired yet. Not committed (project rule).
Inputs: `docs/research/video/09-remotion-skills.md`, `10-video-design-skills.md`, `13-agentic-video-pipeline-tools.md`, `video-pipeline/direction/DESIGN_SYSTEM.md`, code read of `identity.py`, `verify.py`, `lint.py`, `config/safe_zones.yaml`, `adapters/tts_minimax.py`, `Captions.tsx`, plus the new clone `video-pipeline/reference/hyperframes` (commit 6c353d8).

## 1. Investigation: what we already have

| Layer | Exists | Where | Gap |
|---|---|---|---|
| Palette + contrast at design time | YES, strong | `identity.py`: OKLCH palettes, `ensure_contrast` pushes every colour to a WCAG floor (ink 7.0, text/accent 4.5), hue rotation across episodes, lint `identity_contrast` | Only checks palette vs flat `bg`. Says nothing about text over images/video/gradients, or about brightness |
| Design spec | YES, written | `direction/DESIGN_SYSTEM.md` (colour, type, layout, motion tokens, transitions, sound, anti-slop checklist) | Most rows are marked TODO = spec only, not enforced |
| Remotion API skills | YES | `vendor/remotion/packages/skills/skills/*` (12 skills, version-matched to 4.0.532) | Not wired into the episode skill / director as required reading |
| Safe zones | YES | `config/safe_zones.yaml` presets, `tools/check_safe_zones.py`, `SafeProbe.tsx` | 16:9 preset is unfinished (captions overlap content band) |
| Loudness | YES | `run.py` loudnorm, `verify.render_qa` ebur128 | No ducking or SFX map enforcement |
| Rendered-frame QA | PARTLY | `verify.render_qa`: ffprobe, loudness, 270px contact sheet | Looks at nothing numerically: no pixel contrast, no brightness, no scene-to-scene luma change, no banding |
| Element rules (font sizes, words per line, one focal, hold times) | Written only | DESIGN_SYSTEM section 4 says "TODO (lint/verify check)" | Not enforced |
| Motion rules (no linear easing, clamp, premount) | Written only | DESIGN_SYSTEM sections 1 and 5 | No static check of scene TSX |
| Word timing | YES, from TTS | `tts_minimax.py` returns `words[{w,s,e}]` (subtitle_enable), `Captions.tsx` consumes | No transcription, so no check that the audio says what the script says |
| Transcriber code | Vendored, unused | `vendor/OpenMontage/tools/analysis/transcriber.py` (faster-whisper/WhisperX; AGPL, so port ideas, do not copy) | n/a |
| Python deps | `coloraide`, `numpy` present | `.venv` | No PIL. Use ffmpeg `signalstats` and raw frames, not a new dependency |
| Agent design skills | Global | `~/.agents/skills` (colorize, audit, critique, normalize, polish, ...) are web-UI oriented | Not video-aware; use as review prompts only |

Conclusion: we do not lack research or a spec. We lack **enforcement at the rendered-pixel level** and a single machine-readable token file that both Python and Remotion read. That is where the layers below go.

## 2. What the other repos add (only what is new)

HyperFrames (Apache-2.0, HTML + GSAP, headless Chrome + FFmpeg; 21 skills + registry of blocks):
- `skills/hyperframes-creative/scripts/contrast-report.mjs`: seeks to N timestamps, measures WCAG contrast between each text element's colour and the ACTUAL composited pixels behind it (second capture with the glyphs hidden), writes JSON + an overlay PNG (magenta fail, yellow AA, green AAA), exits 1 on fail. This is the missing pixel-level check. Concept ports to Remotion because Remotion also renders in Chrome (probe component or DOM walk on a `remotion still`).
- `references/video-composition.md`: video-medium rules. Web UI hairlines vanish in compression. No full-screen linear gradients on dark backgrounds (H.264 banding; use radial or solid plus local glow). Light canvases need heavier borders and grain. Accent must be visible (about 15-25% atmospheric, full saturation for the focal element).
- `skills/hyperframes-audio` (475 lines): loudness, ducking, voiceover carving; compare with our section 7 numbers.
- `skills/embedded-captions` (`safe-zones.cjs`, typography presets, failure modes): cross-check for our caption band.
- `skills/remotion-to-hyperframes`: a Remotion to HyperFrames migration guide; useful only as a map of equivalent concepts. We are not migrating.
- Registry blocks (shader transitions, orbit/cuboid carousels): port-candidates for `Scenes.tsx`, one at a time, licence is Apache-2.0 so copy with notice.

Already read and recorded elsewhere (not repeated): remotion-dev/skills, haidrrrry, Remocn, video-shotcraft, ui-ux-pro-max CSVs, design-motion-principles, Barty-Bart. Not re-cloned. The one real "download" gap was HyperFrames, now in `reference/hyperframes` (reference only; do not run its CLI or `npx hyperframes skills update`).

Decision: **do not add HyperFrames as a renderer** (second scene vocabulary, `lint`/`verify`/`safe_zones`/`identity` all assume Remotion). Mine it: contrast-report approach, composition rules, shader transition ideas.

## 3. Proposed layers (each has one owner file and one check)

Each layer reads the layer above; a failure names the layer so a fix goes to the right place. Numbers marked (J) are my judgment, not sourced: confirm or tune them on real episodes before making them errors.

**L0 Tokens (single source).** `direction/tokens.yaml`: palettes, type scale, spacing, brightness bands, motion curves/springs/durations, audio levels. Python loads it; a small generated `tokens.ts` feeds Remotion. Today these numbers live in prose and in three different code spots. Owner: new file, consumed by `identity.py`, `profile.ts`, `lint.py`.

**L1 Colour and brightness.** Extends `identity.py`.
- Keep: OKLCH build, text/accent floors 4.5, ink 7.0.
- Add brightness bands per mode (J): dark mode bg OKLCH L 0.12-0.25, light mode bg L 0.94-0.99; no pure #000 or #FFF backgrounds (avoids glare and banding); body text never pure white on dark (J, use L about 0.95).
- Add accent rules: at most one hero accent per frame; accents differ from each other by at least 3:1 luminance contrast or 40 degrees hue; accent chroma capped so neon does not vibrate on dark (J).
- Add colour-blind pairing check: no meaning carried by red/green alone (simulate deuteranopia in OKLab with coloraide, fail if two data colours collapse below delta E 10) (J).
- Add fill-vs-label check: every text-on-fill pair computed with the fill as bg, not the page bg (the kids palette note about #FFD166 already says this; make it automatic).
- Ban list: full-screen linear gradients on dark (banding), cream+terracotta adult look (already in doc).

**L2 Element rules (lint over episode JSON/props, before render).** Extends `lint.py` (`direction/qa_checklist.yaml` gets the thresholds).
- Font floors at 1080 wide: headline 84, secondary 44, caption 56 (already in the doc), diagram labels 36.
- Max words per on-screen line 6, per scene text 12 (J, from Remocn and HyperFrames "3 s on screen = readable in 2").
- One focal element per scene; max 4 chart colours; text must sit inside the safe preset box.
- Hold floors: text card 3.5 s, stat 3.0 s, anything new every 2-4 s (from DESIGN_SYSTEM, already sourced).

**L3 Motion rules (static check of scene source plus tokens).** New small script `tools/check_motion.py` over `remotion-app/src/*.tsx`: flag CSS `transition`/`animation`, `interpolate` without clamp, `Math.random`, `Easing.linear` outside progress bars, `Sequence` without `premountFor`. All sourced from the Remotion skills (09 doc). Cheap, no render.

**L4 Audio.** Keep loudnorm. Add: ducking envelope generated from `words[]` timing (voice onset known exactly, so ramp down 6-9 f before first word, up 15-20 f after) and an SFX map (transition to whoosh, key number to impact), per DESIGN_SYSTEM section 7.

**L5 Rendered-frame QA (the new layer).** Extends `verify.render_qa`; pure ffmpeg + numpy, no PIL.
1. Sample stills at: hook frame, each scene mid-hold, last frame (already planned in DESIGN_SYSTEM section 1.6).
2. **Pixel contrast behind text**: for each text element take its box (from a Remotion probe like `SafeProbe.tsx`, or a DOM walk on a `remotion still`), compute WCAG ratio against the median luminance of the composited pixels behind it with glyphs hidden. This is the HyperFrames technique. Fail under 4.5 (3.0 for large text).
3. **Brightness profile**: per-scene mean and 5th/95th percentile luma via ffmpeg `signalstats` (YAVG, YMIN, YMAX).
   - Scene-to-scene mean luma jump at a cut: warn above 0.35 on a 0-1 scale (J) so a dark scene to a white scene does not flash.
   - Photosensitive safety: no more than 3 flashes per second (a flash = large luma swing); this is the WCAG 2.3.1 threshold, so it is the one sourced number here.
   - Clipping: more than 2% of pixels at YMAX or YMIN in a scene is a warning (J).
4. **Banding check**: large smooth regions with fewer than N distinct luma levels flagged (J, tune on a known-good render first).
5. **Pixel safe-zone check**: reuse `tools/check_safe_zones.py` on the same stills.
6. Contact sheet with failing boxes overlaid (like HyperFrames' magenta/yellow/green sprite) so a human reads it in seconds.

**L6 Review pass.** Separate from the author: a critic prompt (reviewer lane, not the same context) reads the contact sheet plus the L5 JSON and the DESIGN_SYSTEM section 8 anti-slop checklist, returns a JSON verdict. Per the "gates are not quality" memory, L5 failures block, but a pass does not mean approved: the story order and brief still decide.

## 4. Transcription (Parakeet) as part of L5/L4

- `video-pipeline/tools/transcribe.py`: parakeet-mlx wrapper, output the same `words[{w,s,e}]` shape as `tts_minimax.py`. Install into its own venv (`.venv-asr`, uv) so the frozen `requirements.txt` is not disturbed. Model: parakeet-tdt-0.6b-v3 (about 600M params; downloads weights from Hugging Face on first run, size to confirm at install). Machine is arm64, so MLX applies.
- `verify.py` new check `audio_matches_script`: transcribe the final mp3 per scene, normalise, word error rate against `narration`, warn above 8% (J), error above 20% (J). Catches mispronounced numbers, dropped words, MiniMax glitches. Our narration is full of numbers (FII/DII, crore), which is exactly where TTS slips.
- Fallback timing: if audio is not from MiniMax, `transcribe.py` fills `words[]` so captions still work.
- Reference-video ingest: optional, later.
- Known limits: ASR not forced alignment, so spoken text may differ slightly from the script; no diarization; v3 is 25 European languages (Hindi is not covered; matters if any episode narrates in Hindi, check before relying on it).

## 5. Phases

| Phase | Work | Files | Effort | Done when |
|---|---|---|---|---|
| 0 | Read the five HyperFrames files that matter (contrast-report, video-composition, audio, embedded-captions safe zones, typography); note deltas vs our numbers | `direction/craft/` card (new) | S | Card lists each rule: adopt / already have / reject |
| 1 | `tools/transcribe.py` + `.venv-asr` + install test on ep23/ep24 audio + `audio_matches_script` check (warn only) | `tools/transcribe.py`, `verify.py`, `tests/` | M | WER printed per scene for ep24; a deliberate wrong word is caught |
| 2 | L5 pixel QA: stills, luma profile, flash check, contrast-behind-text, overlay sheet | `verify.render_qa` + `tools/frame_qa.py` | M-L | Run on ep23 and ep24 and the numbers match what a human sees on the sheet |
| 3 | L0 tokens file + loader in `identity.py`, `profile.ts` | `direction/tokens.yaml` | M | One edit to a token changes Python and Remotion output |
| 4 | L1 brightness/accent/colour-blind rules in `identity.py` lint | `identity.py`, `qa_checklist.yaml` | S-M | Seeded bad palettes fail with named rule |
| 5 | L2 and L3 lints | `lint.py`, `tools/check_motion.py` | M | Run on current scenes; fix or waive each finding |
| 6 | L4 ducking and SFX map | `run.py`, scenes | M | Mix measured at -14 LUFS with ducking visible in the waveform |
| 7 | Port 1-2 HyperFrames-style shader transitions into `Scenes.tsx`/`profile.ts` | `profile.ts`, new scene file | M | One renders cleanly at 1080x1920 |

Order is chosen so cheap, high-signal checks come first (1, 2), tokens later, because thresholds must be tuned against real renders before they become errors.

## 6. Risks and open decisions

- Thresholds marked (J) are untested. Plan: run L5 in warn-only on ep20-ep24, look at the sheets, then set error levels.
- `ep24` and several video-pipeline files have uncommitted edits (git status). Phases touching `verify.py`, `lint.py`, `Episode.tsx` must be done on top of that in-progress work; check with you before editing those files.
- Parakeet and Hindi: confirm whether any episode will be narrated in Hindi.
- Remotion licence: free for individuals; revisit if the channel becomes a company with 4+ people.
- Safety of cloned skills: `reference/hyperframes` is inert reference. Do not run its CLI, installers or `npx ... skills update`; nothing in it is wired into the agent.
- Open question for you: should L5 failures block a render/approve step (strict), or only report (advisory) for the first few episodes? I recommend advisory first.

> Rev note 2026-10-06: this plan is folded into `docs/plans/video-pipeline/` (layers D1, M1, A1, T1, F1 and the reuse register R1). Keep for history.
