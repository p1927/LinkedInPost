---
model: Kling VIDEO 3.0 / 3.0 Omni / 3.0 Turbo (older 1.x-2.6 noted where it differs)
vendor: Kuaishou (Kling AI)
verified_on: 2026-10-05 (kling.ai blog guides only; API reference page failed with an SSL error)
confidence: secondary overall; verified only for the formula, multi-shot modes, audio languages and 3-15 s duration from kling.ai blog
sources:
  - https://kling.ai/blog/kling-ai-prompt-guide          # fetched 2026-10-05
  - https://kling.ai/blog/kling-ai-motion-prompts-guide  # fetched 2026-10-05
  - https://app.klingai.com/global/dev/document-api/apiReference/model/imageToVideo  # NOT retrievable (SSL)
  - https://docs.comfy.org/built-in-nodes/partner-node/video/kwai_vgi/kling-camera-control-i2v.md  # fetched, third party
  - ledger: vsk-kling, hf-models (MODELS-DEEP-REFERENCE Kling sections), dsk-video-tool-adapters
  - doc12#5 kling card, doc11#3
  - ledger (2026-10-05 second wave): shk-adapter-kling (Kling 3.0 on a reseller surface), ccs-tool-matrix (identity mechanisms, as of Aug 2026)
status_in_pipeline: not wired (no adapter). Reference only.
supersedes: [shk-adapter-kling]
---

# Kling dialect

Labels: [V] = kling.ai page fetched 2026-10-05. [S] = vendored skill, third-party docs, or research doc. [W] = single source or community claim.

## 1. Prompt structure

- Official formula: **Subject, Action, Setting, Camera Language, Lighting, Mood**, written in plain, readable sentences [V: kling.ai prompt guide].
- Official I2V/motion formula: **Subject + Primary Action + Environmental Motion + Camera Motion** [V: motion guide].
- Write the action in visible stages (preparation, main action, follow-through) and describe ground contact, weight shift, cloth and wind response. Generic verbs give stiff motion [V: motion guide].
- On 3.0, a prompt reads like scene direction. Anchor characters at the top with labels (`[Character A: ...]`) and refer to the label afterwards [S: vsk-kling].
- Length: on 1.x-2.x, 50-80 words, because long prompts melt. For I2V on any version, 20-40 words describing motion. On 3.0 multi-shot, about 30-60 words per shot [S: vsk-kling].
- Second-wave dissent on length [S, conflicting]: shotkit's Kling 3.0 adapter targets **80-150 words** for a single shot and puts the camera sentence **first** ("Kling parses motion best as the leading instruction"). Our numbers above stay the default for I2V (motion only); 80-150 is plausible only for T2V with full scene description. Untested by us.
- Language: the vendored DirectorSKILL says Chinese prompts suit the domestic UI best [S/W]. The global site guides are written in English. Use English on the global API; verify before use.

## 2. Camera tokens

Kling has no bracket token syntax; use natural film terms [V]: close-up, medium close-up, full body shot, wide/establishing shot, low angle, slow push-in, pan, tilt, tracking shot, rule of thirds. Directional phrasing helps ("smooth pan left to right", "camera follows beside the runner") [V].

3.0 also understands shot-reverse-shot, POV, macro insert, two-shot, whip pan, crane, orbit, and composites like "pan right while tilting up" [S: vsk-kling, hf-models].

- **API camera control** (numeric: horizontal, vertical, pan, tilt, roll, zoom) is a separate parameter. It is documented in a third-party node as limited to `kling-v1-5`, pro mode, 5 s, "as of 2025-05-02" [S, stale]. Treat it as unavailable for 3.0 until verified.
- Never set a camera preset/control **and** camera words together; you get a doubled move [S: dsk].
- One camera move per shot [S, cross-vendor].

## 3. Duration, resolution, aspect

| Item | Value | Label |
|---|---|---|
| 3.0 duration | 3-15 s, multi-shot up to 6 cuts | [V 3-15 s; S 6 cuts] |
| 1.x-2.6 duration | 5 or 10 s | [S] |
| Resolution | 1080p; native 4K on 3.0 (4K priced "30 credits per second") | [V 4K mention; S rest] |
| Aspect | 16:9 / 9:16 / 1:1 on the API | [S: vsk-kling, comfy node] |
| `cfg_scale` | 0-1 (vendored says default 0.5, shotkit also 0.5 "lower = looser"; third-party says 0.75) | [S, conflicting; verify] |
| Reseller durations | shotkit (fal.ai surface) lists only 5 s and 10 s for 3.0, contradicting kling.ai's 3-15 s | [S, stale or surface-specific; kling.ai wins] |

## 4. Image-to-video and first/last frame

- I2V with a first frame: yes. Describe how the scene evolves, not what it contains [S: vsk-kling 3.0 section].
- End frame: `image_tail` on the API, described as mutually exclusive with masks and camera control [S: third-party]. shotkit names it `tail_image` (reseller parameter naming differs; use the name your surface documents) [S]. A "first/last frame" mode exists in the UI [S: dsk].
- Elements / Element Library (reference images for character, prop or product), and `@element` tagging on 3.0 Omni [V: "Element Library 3.0" named on kling.ai; S for syntax].
- Motion Brush (paint a region to move) on 2.x [S].
- Identity [S: ccs-tool-matrix, "as of August 2026"]: Elements take 1-4 reference images with tagged subjects and are the most mature native multi-subject interaction option; **Bind Subject to Enhance Consistency** (3.0) holds an element through zooms, pans and tilts; **Facial Motion Control** drives a bound face from a reference video (face only; hair, clothing and props need separate control).

## 5. Negative prompts

Kling has a **real `negative_prompt` field** [S: vsk-kling, dsk, third-party API docs; the kling.ai guides we read do not cover it].

- Write the thing itself, not "no X": `blurry faces, distorted hands, watermark, subtitles, text overlay` [S].
- Keep it short (4-6 items). Long lists reduce motion and detail [S].
- Keep the positive prompt free of "no".

## 6. Audio

- 3.0 makes native audio: dialogue, SFX and ambient sound, with voice binding. Languages: Chinese, English, Japanese, Korean, Spanish [V].
- Dialogue protocol [S: vsk-kling, citing fal.ai]: label each speaker; tie a line to a visible action; put voice tone in the tag (`[Character A, low calm voice]: "..."`); join lines with "Immediately," so they do not overlap.
- Vendored claim: there is no "no music" switch, and the model may add music even against a negative prompt. Generate with audio off (`generate_audio: false`) or strip the track [S/W]. For us: always audio off; we score in Remotion.

## 7. Pitfalls and failure modes

- Action finishes in the first second, then the subject idles or loops. Write ordered stages and a named end pose, or shorten the clip [S: dsk].
- Too many elements on 2.x melts the output: 3-4 elements on 2.5 Turbo, 5-7 on 2.6 [S].
- Vague words ("magic") and technical claims about internals do not work; use plain visible description [V].
- A character described differently from shot to shot drifts; reuse labels and Elements [S: doc12].
- Motion written faster than the duration allows (a full dolly in 1 s) reads as jitter; keep the move slow over the whole clip [S: shotkit].
- A body rotation in one clip turns to mush; split it or use a first/last pair [S: dsk].
- An empty shot line in multi-shot ("static frame, ambient mood") merges into the neighbouring shot [S].
- Many third-party "Kling guide" domains imitate the vendor. Use only kling.ai and app.klingai.com [S: doc11#1E].

## 8. Example prompts (original, 9:16, I2V)

**A. Cinematic cold open** (keyframe: a girl on a rooftop at dusk, back to camera, laundry lines around her):
```
Slow push-in from behind. The girl steps to the rooftop edge, shifts her weight onto her front foot and lifts her chin toward the sky. The laundry on the lines swells in a gust of wind and settles. Ends with her standing still, hair moving.
Negative: text, watermark, extra people, distorted hands
```

**B. Explainer mechanism** (keyframe: a cutaway of a bicycle pump on a plain backdrop):
```
Locked camera, medium shot. The pump handle presses down in one smooth stroke; the rubber seal inside slides down the clear barrel and the air ahead of it squeezes into the tube, which bulges slightly. The handle rises back to the top. Ends at rest.
Negative: text, labels, numbers, blur
```

**C. Multi-shot (3.0, T2V, 9:16, about 6 s)**:
```
[Subject A: elderly fisherman, grey beard, yellow oilskin coat]
Shot 1 (0-3s). Wide, low angle, static. Subject A pulls a wet net over the boat's side; seawater pours off it.
Shot 2 (3-6s). Close-up on the net, slow push-in. One silver fish flips inside the mesh.
Lighting. Overcast morning, soft grey light, no sun. Audio off.
```
