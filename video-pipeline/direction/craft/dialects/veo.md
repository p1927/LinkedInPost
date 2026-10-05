---
model: Veo 3.1 (veo-3.1-generate-preview, veo-3.1-fast-generate-preview, veo-3.1-lite-generate-preview)
vendor: Google (Gemini API / Vertex AI)
verified_on: 2026-10-05
confidence: verified for limits, frames, references, audio-always-on and the prompt formula; secondary for dialogue/subtitle tricks
sources:
  - https://ai.google.dev/gemini-api/docs/veo   # fetched 2026-10-05
  - https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-veo-3-1  # fetched 2026-10-05
  - https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo-video-generation  # nav shell only
  - ledger: vsk-veo, hf-models (Veo section), dsk-video-tool-adapters
  - doc12#5 veo card
  - ledger (2026-10-05 second wave): vps-veo3 (restates the same Google Cloud blog), shk-adapter-veo (Veo 3 on a reseller surface), ccs-tool-matrix (reference-image limits, cites the Vertex reference-images page; not fetched by us)
status_in_pipeline: not wired (providers.yaml lists adapters.video_veo.VeoVideo as an alternative; the file does not exist).
supersedes: [vps-veo3, shk-adapter-veo]
---

# Veo dialect

Labels: [V] = Google page fetched 2026-10-05. [S] = vendored skill or research doc. [W] = community claim.

## 1. Prompt structure

- Official formula: **[Cinematography] + [Subject] + [Action] + [Context] + [Style & Ambiance]** [V: Google Cloud blog].
- Gemini API elements: subject, action, style, camera and composition, focus/lens effects, ambiance (light and colour), plus audio [V].
- Lead with camera and shot size; vendored notes say camera terms buried mid-prompt get ignored [S: vsk-veo].
- Sweet spot is 50-200 words; above that the model cherry-picks [S].
- I2V: describe motion, camera, light change and sound only. Add "maintain the subject from the first frame" [S].
- Keep the model name, duration, aspect and resolution out of the prompt text; they are request parameters [S: vps-veo3; same as our cross-model rule].
- shotkit's adapter targets 80-150 words with the camera sentence first, then action, a quoted line if any, environment, audio direction, grade [S]. Inside our 50-200 range.

## 2. Camera tokens (natural language) [V]

- Movement: dolly shot, tracking shot, crane shot, aerial view, slow pan, POV shot.
- Composition: wide shot, close-up, extreme close-up, low angle, two-shot.
- Lens/focus: shallow depth of field, wide-angle lens, soft focus, macro lens, deep focus.

**Timestamp prompting** inside one 8 s generation [V]:
```
[00:00-00:02] ... [00:02-00:04] ... [00:04-00:06] ... [00:06-00:08] ...
```
Use it only for 2-3 beat micro-scenes, and check that the cuts land. Benchmarks say in-model multi-shot follows editorial instructions unreliably [S: doc12#2.5].

## 3. Duration, resolution, aspect [V]

| Param | Values |
|---|---|
| `durationSeconds` | "4", "6", "8" |
| `resolution` | 720p (default), 1080p, 4k (Lite: no 4k) |
| Constraint | Must be "8" with extension, reference images, 1080p or 4k |
| `aspectRatio` | 16:9 (default), 9:16 |
| Extension | +7 s per step, Veo-generated input, 720p only |

So a 9:16 1080p shot is always 8 s. Plan 8 s beats or trim in the edit.

## 4. Image-to-video, first/last frame, references [V]

- `image`: the first frame.
- `lastFrame`: the end frame for interpolation; must be paired with `image`.
- `referenceImages`: up to 3 ("style and content references", the "Ingredients to Video" feature). Forces 8 s.
- Google's own workflow: make the start and end frames with Gemini image, then give both to Veo with a transition description [V: blog].
- **References and first/last frame cannot be combined in one request.** A vendored skill reports the API error `Image and reference images cannot be both set.` on `veo-3.1-generate-preview` [S: ccs-tool-matrix, author-tested]. Sequence them: build an identity-correct keyframe from references first, then animate it with `image` (+ `lastFrame`).
- The 3 reference images should show **one** subject (one person, character or product), not separate character/prop/style slots; style references (`referenceImages.style`) are not supported on 3.1 [S: ccs-tool-matrix citing Vertex docs; verify on the Vertex page before use]. It is a blend, not a hard lock: heavy stylisation or a scene far from the reference pulls identity away [S].

## 5. Negative prompts

- The **Gemini API Veo page we fetched does not document a `negativePrompt` parameter** [V, absence]. Vendored skills say it is supported [S]. Treat the parameter as unconfirmed; verify before use.
- Google's own advice: describe what to exclude as a positive scene, e.g. "a desolate landscape with no buildings or roads" rather than "no man-made structures" [V: blog].
- House rule: positive phrasing. The one accepted inline negation is an audio instruction ("No music.") [S: dsk].

## 6. Audio [V]

- Audio is **always on** for Veo 3.1 ("Natively generates audio with video", always on).
- Dialogue in quotes: `A woman says, "We have to leave now."`
- SFX: `SFX: thunder cracks in the distance`. Ambient: `Ambient noise: the quiet hum of a starship bridge`.
- For us: we narrate with TTS and score in Remotion, so write `Ambient noise: ...` explicitly and "No music, no dialogue." Then mute or duck the clip audio in the edit. Whether "No music" fully suppresses the score is [S/W]; test it.
- Reseller surfaces (fal.ai, per shotkit) expose `generate_audio: true|false`; the Gemini API page we fetched has no such switch [S vs V absence]. On a surface that has it, set it `false` for every shot (we own the audio) rather than prompting "No music".
- Dialogue budget if ever needed: about 12-18 words for an 8 s clip [S: shotkit].
- Community tricks [W]: a colon form for lines (`says: "..."`), adding "no subtitles" to avoid burned-in captions, keeping spoken lines short (about 8 s of speech maximum).

## 7. Pitfalls and failure modes

- Burned-in subtitles or captions when dialogue is present. Avoid dialogue; state "no on-screen text, no subtitles" [W/S].
- An unrequested orchestral bed plus a camera move you did not ask for. Add "No music" and state stillness positively ("the camera is locked") [S: dsk].
- The 8 s ceiling at 1080p means one micro-scene per generation.
- Mood words bleeding into object colours. Keep mood in one style sentence; vendored notes suggest JSON prompts [S/W]. Runway says JSON is placebo; doc conflict, untested by us.
- `personGeneration` limits vary by region and mode [V]; check them before planning people shots.

## 8. Example prompts (original, 9:16)

**A. Cinematic cold open (T2V, 8 s, 1080p)**:
```
Low-angle medium shot, slow dolly-in. A night-shift nurse stands alone at a hospital window at 4 a.m., one hand flat on the cold glass, watching an ambulance's lights sweep across the empty car park below. Cold fluorescent light from behind her, blue-red flashes on her face. Quiet, restrained, realistic.
Ambient noise: distant siren fading, the hum of a vending machine. No music, no dialogue, no on-screen text.
```

**B. Explainer mechanism (I2V from our keyframe, 6 s, 720p)**:
```
Maintain the scene from the first frame. Locked camera, macro lens. A single drop of ink falls into the glass of still water and blooms outward in slow curling ribbons that sink toward the bottom. Soft side light from the left.
Ambient noise: a faint drip, then silence. No music.
```

**C. First/last frame bridge (8 s)**: start = a closed seed in dark soil, end = a sprout with two leaves.
```
Starting from the first image and ending on the second, the seed coat splits and a pale shoot pushes up through the soil and unfolds two leaves. The camera holds still. Even, soft overhead light throughout. Ambient noise: none. No music.
```
