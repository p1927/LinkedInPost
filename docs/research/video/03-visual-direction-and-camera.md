# 03 - Visual Direction and Camera (9:16 explainers)

Date: 2026-10-05. Legend: **[E]** = sourced evidence/spec; **[R]** = rule of thumb (craft consensus, not tested); **[U]** = unverified, check before hard-coding.

## 1. Shot vocabulary and camera moves
Shots **[R]**: Wide/establishing (context, where/what scale); Medium (default for a character talking or acting); Close-up (emotion, one key detail); Insert (cutaway to a prop/diagram that proves the point); POV (viewer is the character, use for "imagine you..."); Over-the-shoulder (two-party relationship, e.g. buyer/seller). In 9:16, wide shots lose width, so favor tall subjects (towers, stacks, graphs rising) and close/medium shots.

Camera moves **[R]** (psychology is film-craft convention, not experimentally proven) and the Hailuo command that approximates it:
| Move | Effect | Hailuo / Remotion |
|---|---|---|
| Push in | focus, intimacy, rising tension, "this matters" | [Push in] / scale 1.0 to 1.08 |
| Pull out | reveal context, isolation, resolution | [Pull out] / scale 1.1 to 1.0 |
| Pan | scan, follow, reveal sideways | [Pan left/right] / translateX |
| Tilt | scale, power (up), weight/defeat (down) | [Tilt up/down] / translateY (good for tall 9:16) |
| Truck | parallel travel, neutral observation | [Truck left/right] |
| Pedestal | rise/lower, "zoom out of detail" | [Pedestal up/down] |
| Orbit | importance, 3D understanding of an object | no dedicated command; use natural language "camera slowly orbits" (less reliable) |
| Handheld | urgency, realism, anxiety | [Shake] (use lightly) |
| Crane | grand reveal, ending | natural language; [Pedestal up] + [Pull out] |
| Static | calm, let text/voice carry | [Static shot] / no move |

Hailuo's documented commands (15): Truck left/right, Pan left/right, Push in, Pull out, Pedestal up/down, Tilt up/down, Zoom in/out, Shake, Tracking shot, Static shot **[E, secondary: akool/runcomfy guides]**. Multiple commands in one bracket run simultaneously (max 3 advised); separate brackets run in sequence **[E, secondary]**.

## 2. Composition for 9:16
- Canvas 1080x1920 **[E]**.
- Platform UI safe zones. Figures found in third-party guides (Tella, Argil, adcreative): TikTok ~150 px top, ~350 px bottom, ~100 px right; Reels ~250 px bottom; Reels ads 14% top / 35% bottom / 6% sides; Shorts ads 15% top / 35% bottom / 4% left / 18% right **[U - not read from official TikTok/Meta/YouTube docs; they conflict and platforms change UI]**. Pipeline rule: use the **strictest union**: keep all text and key subjects inside x 6%-82%, y 15%-65% of height (approx. x 65-885, y 290-1250 px), and keep a configurable constant so it can be tuned. Ref: https://www.tella.com/help/editing/social-safe-zones
- Rule of thirds **[R]**: key subject on upper-middle third line (y about 640 px); eyes ~35-40% from top; leave 8-10% headroom. Vertical frame favors centered single subject with generous negative space for captions.
- Captions: lower-middle (y ~ 55-65%), above the bottom UI zone, never over the face/focal object. Stickers/icons: upper third beside subject, not under the right-hand button column.
- AI illustrations: generate at 9:16 (or 2:3 and crop) with subject inside the safe box; leave extra canvas (10-15%) so Ken Burns moves never reveal edges.

## 3. Pacing and cut rate
No rigorous public evidence found for an optimal cut rate; treat all as **[R]**:
- Visual change every ~2-4 s (new image, camera move, sticker pop, caption emphasis); a static frame over ~5 s without any motion risks drop-off.
- Hook: first 1-2 s must contain motion and the claim/question visually.
- Vary rhythm: fast cluster (3 shots in 4 s) for a list, then a held 4-6 s shot for the key insight, then a beat of silence/hold before the punchline.
- Hold when: showing a formula/diagram viewers must read; after a surprising number; on the final CTA.
- Match cuts to voice: cut on sentence/clause boundaries, with the visual arriving ~100-200 ms before the word it illustrates **[R]**.
- Transitions: mostly hard cuts and quick (6-10 frame) slides; one signature transition max per episode.
- Motion principles (12 principles applied to motion graphics) **[R]**: ease-in/out everything (no linear), anticipation (small counter-move before big move), overshoot/settle on pops, staging (one focal point), follow-through for stickers, secondary action sparingly. Disney principles origin: Thomas and Johnston, *The Illusion of Life* (1981).

## 4. Visual metaphors and consistency
Metaphor bank **[R]**:
- Economics: inflation = shrinking bread/loaf or melting ice cube coins; supply/demand = seesaw or tug-of-war; interest = snowball rolling downhill; opportunity cost = fork in a road with one path greyed; markets = weather/tides; debt = backpack gaining stones.
- Physics: energy = water flowing between buckets; entropy = tidy room becoming messy / ink in water; gravity = trampoline sheet; fields = wind arrows; relativity = train platform.
- Math: functions = machines (in/out); limits = walking half the remaining distance; exponentials = folding paper / lily pads doubling; probability = marbles in jars; proofs = building bricks.
Consistency kit (define once in a per-series "style bible"):
- Palette of 5-6 hex colors with named roles (background, primary, accent, positive, negative, text).
- 1 recurring character with fixed description string, 1 recurring prop (e.g. lantern, notebook), 1 recurring motif per concept (e.g. snowball = compounding).
- Same illustration style prefix in every image prompt; same seed/reference image where the model supports it; same sticker set and caption font.
- Concept-to-color mapping fixed across episodes (e.g. "cost" always the same warm accent).

## 5. Colour
- Evidence **[E]**: color-psychology literature is mixed; effects on emotion are small, context-dependent, with replication failures and weak methods (review: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4383146/; null result: https://research.wu.ac.at/en/publications/the-economics-of-color-a-null-result-3/). Treat "blue = trust", "red = urgency" as **folk/convention**, useful for consistency but not proven persuasion levers. Exception with better support: red/dominance-arousal associations in some lab studies (same review lineage); still modest.
- Accessibility **[E]**: WCAG 2.x contrast minimum 4.5:1 for normal text, 3:1 for large text (https://www.w3.org/WAI/WCAG21/Techniques/general/G18). Apply to captions: white or near-white on dark outline/box; check against the busiest background region, not average.
- Rules **[R]**: 60/30/10 (base/secondary/accent); one accent per scene for emphasis; avoid red/green as the only distinction (color blindness); keep saturation lower in backgrounds than in focal object; check on phone at low brightness.

## 6. Typography and captions
All **[R]** unless noted; no official platform spec found:
- Font: bold geometric sans (Inter/Montserrat/Poppins class) weight 700-900; max 2 font families.
- Size at 1080 wide: about 60-80 px body captions (roughly 1/16-1/24 of width for 2 lines); emphasis word can be 1.2x.
- Line length: 2 lines max, about 18-24 characters per line; 3-5 words per caption chunk (word-group "karaoke" display).
- Highlight: active word recolored with the accent, or a rounded pill behind it, with brief scale pop (110%, 4-6 frames, ease-out). Always add 4-6 px stroke or shadow for legibility; keep contrast at or above WCAG 4.5:1 (see section 5).
- Timing: caption appears with (not after) the spoken word; minimum on-screen about 0.8-1 s per chunk; use forced-alignment word timestamps from TTS/STT.
- Position: inside safe zone (section 2), same place every shot for eye stability.
- Do not render text with AI image/video models (see section 8); render all text in Remotion.

## 7. Sound
- Loudness: about -16 LUFS integrated for stereo podcast-style delivery **[E, secondary]**; for social, -14 LUFS is commonly cited **[U]**; true peak under -1 dBTP **[R]**.
- Music under voice: 10-15 dB below speech, ducked **[E, secondary]**; ducking presets cited: -6 / -12 / -20 dB (https://openclip.app/learn/audio-ducking.md; https://violetrecording.com/how-to-mix-a-podcast/). Suggested: bed at about -18 to -22 dB relative to full scale while voice peaks near -6; duck 10-12 dB with 50-100 ms attack, 300-500 ms release **[R]**.
- Music choice **[R]**: instrumental, no lyrics, 90-120 BPM for explainers (cuts on beats where possible), sparse arrangement, mood matched to topic (curious/light for general, tense for risk/crash); loop-safe tracks; confirm license.
- SFX **[R]**: whoosh on transitions (low level, -18 dB or lower vs voice), pop/click on sticker and caption emphasis, riser into a reveal; at most one SFX per 2-3 s; do not stack on every cut.
- Silence: a 0.3-0.6 s drop-out of music before the key line or after a shock number adds emphasis.

## 8. Hailuo prompt cookbook
Formula (Hailuo guides) **[E, secondary: https://akool.com/blog-posts/minimax-hailuo-video-prompt-guide, https://blog.segmind.com/hailuo-minimax-ai-video-prompt-guide/]**: Subject + Action + Scene/Setting + Camera + Style/Lighting. For image-to-video the first frame fixes subject, so the prompt should describe **motion only** **[R]**.
Camera usage: put the bracket at the start or at the clause where it should occur; one primary move per 5-6 s clip; combine at most 2 (e.g. [Push in, Tilt up]); use [Static shot] when animating only the subject **[E secondary / R]**.
Character consistency **[R]**: use I2V from the same approved keyframe/character sheet; repeat the identical character descriptor; keep clips short; generate from a last frame to chain; avoid camera orbits that reveal unseen sides.
Likely failures **[R, widely reported, not measured here]**: legible text/numbers, hands and fingers, crowds (faces melt), fast complex physics, many simultaneous actions, morphing props. Mitigate: keep subject count at 1-2, hide hands, add text in Remotion, use silhouettes/backs for crowds.

Example prompts (I2V, picture-book style):
1. [Push in] The little fox slowly lifts its lantern, warm glow flickers on its face, soft paper-grain storybook look.
2. [Pull out] A tiny coin rolls across the table and a vast marketplace is revealed behind it, gentle morning light.
3. [Pan right] Paper boats drift down a stream, ripples catch the light, calm watercolor mood.
4. [Tilt up] A tall stack of coins grows toward the sky, stars twinkle, painterly style.
5. [Static shot] The snowball rolls slowly forward leaving a track, snow puffs, minimal motion elsewhere.
6. [Truck left, Push in] Seen from behind, the girl walks toward a glowing door, leaves drift past.
7. [Pedestal up] A hot-air balloon rises above rooftops, clouds part, hopeful tone.
8. [Shake] Rain hits a tin roof, the cat flinches and looks up, quick tense moment, then [Static shot] it settles.

## 9. Shot-list template and visual QA
Per-shot fields: `shot_id | beat/VO line | start-end (s) | shot type | source (illustration / Hailuo / math) | camera move (Remotion or Hailuo command) | transition in | subject + focal point (x,y) | metaphor/motif | palette roles used | on-screen text/caption style | stickers/props | SFX | music cue/duck | hold? (Y/N) | prompt (full) | seed/ref image | status/notes`.

QA checklist (director/review step):
- [ ] Hook visual moves in first 1-2 s; claim is visible, not only spoken.
- [ ] Visual change at least every ~4 s; at least one deliberate hold on the key insight.
- [ ] All text and focal subjects inside the strictest safe box; nothing under UI zones.
- [ ] Captions: 2 lines max, synced to words, contrast >= 4.5:1 on worst frame.
- [ ] No AI-rendered text/numbers; no malformed hands, faces, extra limbs; no morphing props.
- [ ] Character, palette, props match the style bible across shots.
- [ ] Each metaphor maps to the concept correctly (not misleading); math/data shown is accurate.
- [ ] Camera moves ease, no jitter, no edge reveal on Ken Burns; max one signature transition.
- [ ] Voice intelligible over music; ducking audible but smooth; LUFS and peaks within target; no clipping.
- [ ] Final CTA frame held >= 2 s; checked on a real phone at low brightness and muted.

## Gaps
No official platform safe-zone docs retrieved; no primary-source data on optimal cut rate or caption size; Hailuo official docs not fetched directly (secondary summaries used). Verify before locking constants.

## Sources
- https://www.tella.com/help/editing/social-safe-zones (safe zones, third-party)
- https://argil.ai/blog/tiktok-aspect-ratio-cec4c ; https://www.adcreative.ai/post/maximizing-ad-visibility-and-engagement-in-social-media-the-essential-role-of-safe-zones
- https://akool.com/blog-posts/minimax-hailuo-video-prompt-guide ; https://blog.segmind.com/hailuo-minimax-ai-video-prompt-guide/ ; https://www.runcomfy.com/playground/minimax/hailuo-video-01-director
- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4383146/ ; https://research.wu.ac.at/en/publications/the-economics-of-color-a-null-result-3/
- https://www.w3.org/WAI/WCAG21/Techniques/general/G18
- https://openclip.app/learn/audio-ducking.md ; https://violetrecording.com/how-to-mix-a-podcast/
