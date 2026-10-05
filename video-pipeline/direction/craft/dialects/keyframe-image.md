---
model: MiniMax image-01 (what we call); also Nano Banana (Gemini image), GPT Image 2.5, FLUX.2 / Kontext
vendor: MiniMax; Google; OpenAI; Black Forest Labs
verified_on: 2026-10-05
confidence: verified for API parameters of all four families; secondary for prompt craft beyond the vendors' own one-liners
sources:
  - https://platform.minimax.io/docs/api-reference/image-generation-t2i   # fetched 2026-10-05
  - https://platform.minimax.io/docs/api-reference/image-generation-i2i   # fetched 2026-10-05
  - https://ai.google.dev/gemini-api/docs/image-generation                # fetched 2026-10-05
  - https://developers.openai.com/api/docs/guides/image-generation       # fetched 2026-10-05
  - https://docs.bfl.ai/guides/prompting_unified_technical ; https://docs.bfl.ml/guides/prompting_guide_t2i_negative ; https://help.bfl.ai/articles/8916739058-what-aspect-ratios-and-output-dimensions-are-supported  # search excerpts 2026-10-05
  - video-pipeline/config/providers.yaml, adapters/image_minimax.py, run.py (stage_keyframes/stage_illustrations)
  - ledger: dsk-image-model-adapters, dsk-tpl-keyframe-prompt, vsk-image-models, vis-image-references-nano-banana, vis-image-references-gpt-image, vsk-golden-rules, hfs-generate-prompt-engineering
  - ledger (2026-10-05 second wave): shk-adapter-flux, shk-adapter-gpt-image, shk-adapter-nano-banana (shotkit, written against older model versions)
supersedes: [shk-adapter-flux, shk-adapter-gpt-image, shk-adapter-nano-banana]
---

# Keyframe and still-image dialects

Labels: [V] = vendor page fetched 2026-10-05, or our own code. [S] = vendored skill or research doc. [W] = single source.

**Why this file matters.** For image-to-video, the keyframe decides identity, wardrobe, set, light, lens and composition. The video prompt only adds motion. Fix the still, not the motion prompt [S: dsk-image-model-adapters#1].

## 0. What we actually call [V]

`providers.yaml` sets `image: adapters.image_minimax.MiniMaxImage`, model `image-01`, `width: 1152`, `height: 2048`. For a 9:16 request the adapter sends `width`/`height` and **omits** `aspect_ratio` (other ratios still go as `aspect_ratio`), plus `n: 1`, `prompt_optimizer: false` and a fixed `seed` (1234 for keyframes, 4242 for illustrations, set in `run.py`), and cuts the prompt at 1500 characters. `generate(..., subject_reference=<path|url|list>)` adds an optional character reference; `run.py` passes one in `stage_keyframes` when the scene declares reference images (section 1b). image-01 is still MiniMax's only image model on 2026-10-05 (release notes and pricing page list nothing newer; $0.0035 per image, 10 RPM) [V].

## 1. MiniMax image-01 [V unless marked]

| Item | Value |
|---|---|
| Prompt cap | 1500 characters |
| `aspect_ratio` | 1:1 1024x1024, 16:9 1280x720, 4:3 1152x864, 3:2 1248x832, 2:3 832x1248, 3:4 864x1152, **9:16 720x1280**, 21:9 1344x576 |
| `width`/`height` | 512-2048, divisible by 8, set together; **`aspect_ratio` wins if both are sent** |
| `seed` | Reproducible with the same seed and parameters |
| `prompt_optimizer` | Default false (we keep it false: deterministic and cache-friendly) |
| `n` | 1-9 |
| Negative prompt | **No parameter.** Phrase positively |
| Character reference | `subject_reference: [{type: "character", image_file: <url or data URL>}]` on `image-01` / `image-01-live` (`character` is the only type). Use "a single front-facing portrait photo". JPG/PNG under 10 MB. **Wired: `run.py` passes the first scene reference (section 1b)** |
| Response | `data.image_urls[]` (URL expires in 24 h), `base_resp.status_code` 0 on success |

**1b. References and end frames in `run.py` (wired 2026-10-05)** [V: code].
- `scenes[].visual.reference_images[]` (or, without it, `continuity.characters[].canon_frame` / `sheet` of characters in `shot.continuity_ids`): the first file goes to image-01 as `subject_reference` for that scene's keyframe, and its hash joins the keyframe cache key. Files must sit in `episodes/<dir>/refs/` or `out/<id>/refs/`; a missing or misplaced file stops the stage before any paid call. Only our own character stills (canon frame or a single cropped sheet panel, cont-canon-frame); never a photo of a real person.
- `scenes[].visual.last_frame_prompt`: generates `out/<id>/keyframes/<scene>_last.png` (seed 1234) and the clip stage sends it as `last_frame` when the video adapter reports `supports_last_frame` (H3); on Hailuo 2.3 it is skipped with a printed WARNING. image-01 has no edit endpoint wired, so the end frame is a fresh text-to-image from the same seed: copy the first-frame prompt and change one thing only (rule 5 below). H3 cannot combine a last frame with reference images, so lint `last_frame_exclusive` rejects scenes with both.

**Resolution fix (2026-10-05).** Old 9:16 keyframes were 720x1280, while Hailuo 2.3 768P output 768x1364 (measured) and H3 768P outputs a 768 px short side [S: HF card]. Keyframes are now requested at **1152x2048** (9:16, divisible by 8, inside the 512-2048 range, `width`/`height` documented as "only effective for image-01") with `aspect_ratio` omitted, because the docs say `aspect_ratio` wins when both are sent [V]. The first real render should confirm the returned PNG is 1152x2048 [W until measured]. H3 accepts first frames up to 5760 px and 30 MB, so the larger still is within limits [V].

**Prompt shape for image-01** [S: dsk nine slots, adapted]. Write one paragraph in this order:
1. Shot size, angle, lens feel ("medium close-up, eye level, slightly low").
2. Subject identity string, copied exactly (the `{bruno}` placeholders).
3. A pose that implies the next motion ("hand 5 cm from the door handle, fingers spread").
4. Wardrobe and one prop.
5. Location, era, time of day.
6. Named light source and its side ("one desk lamp camera-left").
7. Composition for 9:16: subject in the upper-middle third, headroom, empty lower band for captions (`shots.md` safe zone).
8. Style prefix from `episode.json` `style`.
9. Positive "blank" statements where text could appear ("the sign is a plain board", "the screen glows a flat pale blue").

Our current episode prompts contain "no writing on the sign". Replace that with a positive phrase, since there is no negative field.

## 2. Nano Banana (Gemini image) [V]

- Model ids: `gemini-3.1-flash-lite-image` (Nano Banana 2 Lite: fastest, 1K only, weak for references and multi-turn editing), `gemini-3.1-flash-image` (Nano Banana 2: workhorse, up to 4K), `gemini-3-pro-image` (Nano Banana Pro), `gemini-2.5-flash-image` (legacy).
- Aspect: `response_format: {aspect_ratio: "9:16"}`. Options: 1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9. `image_size`: 512px / 1K / 2K / 4K (uppercase K; lowercase is rejected).
- Reference limits: 3.1 Flash takes 10 objects, 4 characters and 3 style references; 3 Pro takes 6 objects and 5 characters.
- Google's advice: "Describe the scene, don't just list keywords"; use "semantic negative prompts" (describe the empty or desired state); use camera terms for composition.
- All outputs carry a SynthID watermark (invisible).
- Strength [S]: instruction editing ("keep X, change only Y"). This is the best tool for deriving a **last frame from an approved first frame**, which Veo, Wan and H3 first/last workflows need. Vendored notes say numeric lens values (50mm, f/2.8) are ignored; describe the effect instead ("shallow depth of field") [W].
- Not wired: `llm_gemini` is disabled and there is no `image_gemini` adapter (it is only named as an alternative in `providers.yaml`).

## 3. GPT Image 2.5 (OpenAI) [V]

- Ids: `gpt-image-2.5-flare` (fast everyday), `gpt-image-2.5-sunburst` (editing precision). Vendored notes call GPT Image 2 migration-only [S].
- Sizes: 1024x1024, 1536x1024, **1024x1536 (portrait)**. Custom sizes: multiples of 16, ratio between 1:3 and 3:1, longest edge 3840 or less, total 655,360-8,294,400 px. 9:16 is allowed (for example 1152x2048).
- `quality`: low / medium / high / xhigh / max / auto. `background: "transparent"` with png or webp output, which is useful for Remotion overlay cut-outs. Edits with masks are supported.
- No negative-prompt parameter. The Responses API revises prompts automatically.
- Strength [S]: small, dense, exact text and UI mock-ups. That makes it the right tool for **thumbnails**, but still not for in-video text (Remotion owns that). Vendored edit pattern: "Change: ... / Preserve: ... / Constraints: ...", restating the preserve list on every iteration [S].

## 4. FLUX (Black Forest Labs) [V excerpts]

- "FLUX models don't support negative prompts." Replace exclusions with positive descriptions ("no text" becomes "clean surfaces, unmarked, blank"; "no people" becomes "empty, deserted").
- FLUX.2 takes free `width`/`height`: 9:16 is 1088x1920 (about 2 MP), up to 2048x2048; over 4 MP is resized. FLUX.1 Kontext is fixed at about 1 MP with `aspect_ratio` from 3:7 to 7:3.
- Strength [S: dsk matrix]: literal prompt fidelity, inpainting and outpainting, instruction editing (Kontext).

## 4b. Second-wave notes (shotkit image adapters) [S]

Written against Nano Banana 2 / Gemini 2.5 Flash Image, GPT Image 1.5 and Flux 2 Pro; the vendor facts above win where they differ.
- Length targets: Nano Banana 80-140 words, GPT Image 150-300 words (spend them on explicit spatial placement), Flux 80-150 words. The verbatim identity/series strings take a large share (shotkit measured about 60 words of anchors), so budget them first.
- Flux: keep `prompt_upsampling: false` and a fixed `seed` for series work (auto-rewrite drifts the look) [S; same logic as our `prompt_optimizer: false` on image-01].
- Nano Banana image-to-image: one change per pass and always a "preserve ..." clause, or the reference is treated as loose inspiration [S; agrees with section 2].
- GPT Image: five or fewer distinct elements per scene; prose, not comma stacks; a "natural skin texture" line reduces but does not remove the synthetic look [S/W].
- All three: no on-screen text in the prompt; composite it (our rule 8 in `README.md`).

## 5. Cross-model keyframe rules (apply to every family)

1. Generate native 9:16. Never crop from 16:9, which keeps only 31.6% of the width and forces an upscale onto the face [S: dsk#8].
2. Keyframe resolution must be at least the video model's output resolution [S]. Now met: 1152 px wide keyframe vs 768 px wide clip.
3. Identity string word for word in every prompt; no emotion or attractiveness words in it. Describe expression physically in the pose [S].
4. Every still implies a next motion (mid-stride, reach, weight shift, gaze just off frame). A posed portrait animates into a slideshow [S].
5. Derive last frames by editing the approved first frame, changing one thing only (pose, or object position, or light). Never re-prompt from scratch [S].
6. No readable text, numbers or logos in any keyframe. Render text in Remotion [house rule; shots.md].
7. Positive phrasing everywhere: none of these four families exposes a negative field on the surfaces we checked [V].
8. Leave 10-15% safe margin around the subject if Remotion will push in on a still (Ken Burns) [shots.md].

## 6. Example keyframe prompts (original, 9:16)

**A. Cinematic cold open still (for a Hailuo push-in)**:
```
Medium shot from behind and slightly low, a lone dock worker in a dark knit cap and heavy canvas jacket walking along a dry matte concrete pier at night, caught mid-stride with his head beginning to turn toward the black water on the right. One sodium streetlamp camera-left throws orange light across his shoulder; the rest of the frame falls into deep shadow with visible grain. He sits in the upper-middle third, empty dark pier in the lower third. Realistic 35mm film still, muted colour.
```

**B. Explainer mechanism still (for a static mechanism clip)**:
```
Straight-on studio shot of a clear glass jar of water on a plain pale-grey table, a narrow beam of white light entering the jar from the left edge of frame. Cool seamless grey backdrop, soft top light, the jar centred in the upper half with clean empty space below. Clean, minimal science-illustration realism; every surface plain and unmarked.
```

**C. Character sheet anchor (for subject_reference)**:
```
Front-facing portrait of {bruno}, neutral relaxed expression, mouth closed, looking straight at camera, even soft light from both sides, plain light background, head and shoulders, nothing covering the face.
```

## Measured 2026-10-05 [V]
image-01 with `width: 1152, height: 2048` and no `aspect_ratio` returned exactly 1152x2048 (about 36 s, $0.0035). Style words matter: a short ad-hoc 'flat editorial illustration' prompt produced a photographic-looking image, so always send the audience card's full `illustration_style` and check the keyframe before generating the clip.
