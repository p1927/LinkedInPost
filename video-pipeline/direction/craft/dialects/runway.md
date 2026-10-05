---
model: Runway Gen-4.5 (gen4.5), Gen-4 Turbo (gen4_turbo); Runway API also resells Seedance, MiniMax H3 (hailuo3), Veo 3.1, Wan 3.0
vendor: Runway
verified_on: 2026-10-05
confidence: verified for prompting rules, Gen-4.5 durations/ratios and the API model list; secondary for camera-term specifics
sources:
  - https://help.runwayml.com/hc/en-us/articles/39789879462419-Gen-4-Video-Prompting-Guide   # fetched via exa 2026-10-05
  - https://help.runwayml.com/hc/en-us/articles/48324313115155-Image-to-Video-Prompting-Guide # search excerpt 2026-10-05
  - https://help.runwayml.com/hc/en-us/articles/42460036199443-Text-to-Video-Prompting-Guide # search excerpt
  - https://help.runwayml.com/hc/en-us/articles/47313698911891-Introduction-to-Prompting     # search excerpt
  - https://help.runwayml.com/hc/en-us/articles/46974685288467-Creating-with-Gen-4-5         # fetched
  - https://docs.dev.runwayml.com/guides/models/                                            # fetched
  - ledger: dsk-video-tool-adapters (Runway block); doc12#5 runway card
  - ledger (2026-10-05 second wave): ccs-tool-matrix (Gen-4 References, Act-Two), afc-ref-model-prompting (prompt-enhanced models); no new Runway vendor page fetched
status_in_pipeline: "not wired. Runway's API also exposes MiniMax H3 as `hailuo3`, a possible H3 route if MiniMax's own v2 endpoint is not used."
---

# Runway dialect

Labels: [V] = Runway page fetched or excerpted 2026-10-05. [S] = vendored skill or research doc. [W] = community claim.

## 1. Prompt structure [V]

- I2V (Gen-4.5): `The camera [motion description] as the subject [action]. [Additional descriptions]`. The prompt focuses "almost exclusively on motion"; the input image is the first frame and supplies composition, subject, light and style.
- T2V (Gen-4.5): `[Camera] shot of [a subject/object] [action] in [environment]. [Supporting component descriptions]`.
- Start simple, then add one element at a time: subject motion, camera motion, scene motion, style descriptors.
- Refer to subjects generally ("the subject", "she"). For several subjects use position ("the subject on the left walks forward").
- Use physical actions, not concepts ("The woman smiles and waves", not essence-of-greeting prose).
- No conversational or command prompts ("please add my dog"). Describe how the element enters instead.
- Runway says order does not matter on Gen-4.5 T2V, and that JSON prompts are a placebo.
- Sequencing: "X occurs, then Y occurs. Finally, Z occurs." or rough timestamps `[00:01] ... [00:03] ...`.
- Longer sequences: use the last frame of a finished generation as the next input image.

## 2. Camera tokens

Natural language; there is no token syntax. Runway names locked, handheld, dolly, pan, tracking and focus shifts [V], and points to its "Camera Terms, Prompts, & Examples" article (not fetched). Vendored and research docs add push in, pull back, orbit and rack focus [S].

- Stillness, phrased positively: **"Locked camera. The camera remains still."** [V]
- If a UI camera slider is set, remove every camera word from the text, or you get a doubled move [S: dsk].

## 3. Duration, resolution, aspect

| Model | Duration | Output | Aspect | Label |
|---|---|---|---|---|
| Gen-4.5 | 2-10 s | 720p, 24 or 25 fps | T2V: 16:9 only. I2V: 16:9, **9:16 (720x1280)**, 1:1, 4:3, 3:4, 21:9 | [V] |
| Gen-4 | 5 or 10 s | | | [V] |

So 9:16 on Gen-4.5 needs **image-to-video**. The aspect follows the input image by default; changing it crops the input [V].

## 4. Image-to-video and first/last frame

- The first frame is the core mode [V].
- Last frame: dsk marks it "part" [S]; not seen in the Gen-4.5 spec table [V absence]. Verify before use.
- Character/subject references exist on Runway's image models (Gen-4 Image with references) [V: model list]. Use them to build keyframes, then do I2V.
- Gen-4 References detail [S: ccs-tool-matrix]: up to 3 tagged references addressed as `@name` in the prompt, works from one image; source images want even light and a neutral expression. Fine detail (freckles, logos, small tattoos) often fails to transfer, and busy multi-element scenes dilute fidelity: simplify the scene before blaming the reference.
- Act-Two drives one character's performance from a driving video, up to 30 s [S]. Off-target for us (we film no performances).

## 5. Negative prompts [V]

**Not supported.** "Negative phrasing is not supported and may produce unpredictable or even opposite results." Example from the guide: write "Locked camera. The camera remains still." and never "No camera movement".

## 6. Audio

Runway's guides and the Gen-4.5 spec table say nothing about native audio [V, absence]. Treat the output as silent. Runway's API lists separate ElevenLabs audio models [V]. For us that does not matter: TTS and Remotion own the audio.

## 7. Pitfalls and failure modes

- Re-describing the image in detail gives reduced motion or unexpected results [V].
- Too many scene changes, actions or style shifts in one 5-10 s clip gives unintended results; one scene per generation [V].
- Abstract or conceptual language gives random motion [V].
- Turning a subject all the way round gives mush. Restage it as two clips [S: dsk].
- Prompt-enhanced surfaces may rewrite the prompt: put the non-negotiables (subject, action, camera move) first and keep it short so the rewrite cannot bury them [W: afc-ref-model-prompting].
- The whole frame drifts when only a hand should move. Use motion brush on that region and zero the camera (Gen-3/4 UI) [S].

## 8. Example prompts (original, 9:16 I2V on Gen-4.5)

**A. Cinematic cold open** (keyframe: a man in a parked car at night, rain on the windscreen):
```
The camera slowly pushes in through the windscreen as the man grips the steering wheel and lowers his head. Raindrops run down the glass and the dashboard light flickers once. He stays still.
```

**B. Explainer mechanism** (keyframe: a cross-section of a seed in soil, side view, plain background):
```
Locked camera. The camera remains still. The seed swells, its coat splits along one side, and a white root curls down into the soil, then a pale shoot pushes upward. Slow, steady growth.
```

**C. Reveal** (keyframe: an extreme close-up of moss on stone):
```
The camera pulls back steadily as the moss becomes part of a stone wall, then part of a ruined tower standing alone on a misty hill. Mist drifts left to right.
```
