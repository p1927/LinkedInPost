---
model: Wan 3.0 / Wan 3.0 Prime (wan3.0-video, wan3.0-video-prime); older Wan 2.x noted
vendor: Alibaba Cloud (Model Studio / Tongyi Wanxiang); also on Runway API (wan3, wan3_prime)
verified_on: 2026-10-05
confidence: verified for Wan 3.0 (official prompt guide and model guide fetched); secondary for Wan 2.x
sources:
  - https://www.alibabacloud.com/help/en/model-studio/wan3-video-generation-prompt-guide  # fetched via exa 2026-10-05
  - https://www.alibabacloud.com/help/en/model-studio/wan3-video-generation-guide         # fetched via exa 2026-10-05
  - https://www.alibabacloud.com/help/en/model-studio/text-to-video-prompt                # Wan 2.x guide, not re-fetched (doc12 says empty)
  - ledger: hf-models (Wan 3.0 section), dsk-video-tool-adapters (Wanxiang block)
  - doc12#5 wan card
  - ledger (2026-10-05 second wave): vps-wan22 (cites wan-ai.co, a third-party blog, not Alibaba), vps-wan-animate2 (archived, see README)
status_in_pipeline: not wired. Reference only.
supersedes: [vps-wan22]
---

# Wan dialect

Labels: [V] = Alibaba Cloud page fetched 2026-10-05. [S] = vendored skill or research doc. [W] = community claim.

## 1. Prompt structure [V]

Official full formula (skip any section you do not need):
```
[Overall description] + [Reference citation: Image N / Video N / Audio N]
+ [Shot N (start-end s): Subject + Scene + Motion + Aesthetic control]
+ [Dialogue: X says: "..."] + [Sound effect / BGM] + [Style / Mood] + [Negative prompt list]
```
- One sentence is enough to generate; more precision gives closer results.
- Overall description: one sentence with theme, perspective, narrative style and mood.
- I2V: describe motion and camera only; strip adjectives for things the image shows (contradictions re-render the subject) [S: dsk].
- Keep motion and camera in separate clauses; give speed words [S: doc12].

## 2. Camera tokens

Natural language inside each shot line. The official example uses lens and angle terms as plain text: "Extreme wide establishing shot, 24mm wide-angle, extreme low angle, camera static", "85mm telephoto, shallow depth of field", "camera pushes in very slowly", "camera orbits 120 degrees ... and descends" [V].

The 2.x vocabulary from research is pan L/R, tilt U/D, dolly in/out, tracking, orbital arc, crane, pull-back, whip pan [S].

**Multi-shot syntax** [V]: `Shot 1 (00:00-00:03): ...`. Shots connect end to end with no gaps or overlaps, **2-5 s per segment** (the T2V section says 4-6 s per shot, a small internal inconsistency). Write `Generate single shot` on the first line to stop the model splitting shots [S: hf-models citing the same guide]. Use `hard cut` / `dissolve` between segments [S].

**Wan 2.2 (open weights) notes** [S: vps-wan22, whose source is a third-party blog (wan-ai.co), so not vendor evidence]
- Variants: `Wan2.2-T2V-A14B`, `Wan2.2-I2V-A14B`, `Wan2.2-TI2V-5B` (lighter hybrid). Only relevant if we ever run Wan locally.
- Formulas: basic `Subject + Scene + Motion`; advanced adds descriptions plus Aesthetic Control (light, camera, lens, time of day) and Stylization; I2V = `Motion + Camera movement` only.
- Shot order `opening shot -> camera motion -> pay-off`; 2-6 aesthetic anchors kept identical across retries; a foreground/background stability cue ("reeds sway; mountains stay fixed") steadies the frame.

## 3. Duration, resolution, aspect [V]

| Param | Values |
|---|---|
| `duration` | 2-30 s, or -1 (smart duration; billed as 10 s on Higgsfield [S]) |
| `resolution` | 480P / 720P / 1080P (default) |
| `ratio` | 21:9 / 16:9 / 4:3 / 1:1 / 3:4 / **9:16**; for I2V use `adaptive` (matches the first frame) |
| fps | 30 |

## 4. Image-to-video and first/last frame [V]

- `type: first_frame`, or `first_frame` + `last_frame`. These cannot be mixed with reference types in one call.
- References: up to 10 images (each 20 MB max), 5 videos (15 s total), 5 audio (15 s total), plus 1 file or link. Numbered by upload order, **counted separately per type** (Image 1 and Video 1 can both exist). With 2 or more of a type you must give the number.
- Role phrasing: "Only reference the color tone and lighting of Image 2, not the characters"; "The child in Image 1 stands in ... Image 2".
- Also supports video editing and extension through `reference_video` plus intent words ("edit", "extend").

## 5. Negative prompts

- Wan 3.0: an **in-prompt "Negative prompt list:" section** at the end [V]. The official example writes it as "No modern elements, no subtitles or watermarks, no extra characters, avoid facial distortion...". So on Wan 3.0, explicit negation *inside that labelled section* is vendor-sanctioned. Keep it to what you do not want; do not repeat the positive prompt.
- Wan 2.x and ComfyUI graphs have a separate negative field or node [S: dsk].

## 6. Audio [V]

- Native dialogue, SFX and BGM. Dialogue: `X says: "..."`; voice timbre: `Voice timbre references Audio 1`.
- Vendored notes add that you should write `No dialogue` explicitly or the model decides, and `No background music.` to suppress BGM [S: hf-models citing the same guide].
- For us: "No dialogue. No background music." Ambient SFX can stay, but we mix in Remotion.

## 7. Pitfalls and failure modes

- Shots 2-3 look like a different film. Put identity, palette and light in the overall description only; shot lines carry action and camera [S: dsk].
- An English identity lock inside a Chinese overall block gets ignored. Keep one language per prompt [S: dsk].
- High-frequency actions in one shot. The guide advises avoiding them (sentence truncated in our fetch) [V partial].
- Wrong reference used when the numbering does not match upload order [V].
- Region matters: model, endpoint and key must be in the same region [V].

## 8. Example prompts (original, 9:16)

**A. Cinematic cold open (T2V, 6 s, single shot)**:
```
Generate single shot. A tense, quiet opening. A miner's helmet lamp sweeps across a collapsed tunnel wall; dust hangs in the beam. Medium close-up, 35mm, eye level, camera static. The miner raises one gloved hand to the rock and holds still, listening. Only light: the helmet lamp, hard and cold. Sound effect: dripping water, a low rumble far away. No dialogue. No background music.
Negative prompt list: subtitles, watermark, extra people, text.
```

**B. Explainer mechanism (I2V from our keyframe, ratio adaptive, 5 s)**:
```
Camera static. The two gears turn slowly: the large gear on the left rotates clockwise and drives the small gear on the right faster in the opposite direction; their teeth mesh cleanly. Even studio light. No dialogue. No background music.
Negative prompt list: text, numbers, labels, extra gears.
```

**C. Two-shot sequence (T2V, 8 s)**:
```
A calm science-documentary look. Shot 1 (00:00-00:04): wide shot, camera static, a hot-air balloon rests on a misty field at dawn as its burner flares orange. Shot 2 (00:04-00:08): low angle, slow tilt up, the balloon lifts off and rises into pale sky. Sound effect: burner roar. No dialogue. No background music.
```
