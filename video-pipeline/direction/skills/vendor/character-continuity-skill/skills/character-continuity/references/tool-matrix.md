# Tool Matrix — Identity Mechanisms

Per-tool detail for locking a character. Parameters change frequently; treat numbers as of August 2026 and verify against vendor docs.

---

## Veo 3.1 / 3.2 — Ingredients to Video

- **Subject references:** up to 3 images of a **single** person, character or product. All three describe the same subject — they are not separate slots for character, object and style
- **Style references are not supported on Veo 3.1.** Google's documentation states plainly that Veo 3.1 models don't support `referenceImages.style`, and directs you to `veo-2.0-generate-exp` for style images. Carry style in the prompt instead
- **Subject and style references are mutually exclusive.** The docs frame it as choosing one of the two approaches, not combining them
- Strong at holding a character across changing environments and lighting

**Failure mode:** it is an ingredients *blend*, not a hard lock. Heavy stylisation, or a scene prompt that diverges far from the reference, pulls identity away. Short prompts with clean source stills outperform long elaborate prompts.

**The exclusivity that bites — confirmed by test, not just by docs.** Reference images and the first/last-frame parameters cannot both be set in one request. Attempting it on `veo-3.1-generate-preview` returns:

```
Error: Image and reference images cannot be both set.
```

This matters because chain continuity wants frame conditioning while identity locking wants references. You cannot have both in a single call, so you sequence them instead — see "Choosing your conditioning mode" at the end of this file. Note that some third-party wrappers document combining the two as a supported pattern; the API rejects it.

Source: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/video/use-reference-images-to-guide-video-generation

---

## Runway Gen-4 — References

- Up to 3 tagged references, addressed in-prompt as `@charactername`. Works from a single reference image
- Source images want natural even lighting, neutral expression, and moderate rather than maximal quality

**Failure mode:** intricate detail — freckles, logos, fine tattoos — frequently fails to transfer. Complex multi-element scenes dilute fidelity. Simplify the scene before blaming the reference.

---

## Runway Act-Two — performance and dialogue

Drives one character's performance at a time, up to 30 seconds. For a two-hander:

1. Build the multi-character base image with Gen-4 References (`@a`, `@b`)
2. Generate a base video (~10s) from it, establishing shared ambient motion and lighting
3. Crop to isolate each character
4. Run Act-Two separately per character, each with its own driving performance video
5. Composite the outputs back over the shared base, feathering edges
6. Add ambient audio

Both isolated passes derive from the same base clip, so lighting and background motion match. **Extend from the same base** rather than generating a new one — otherwise Act-Two inserts a reverse-motion "boomerang" artifact to fill duration. Aleph is not a lip-sync model; re-run Act-Two after any Aleph pass.

---

## Kling — Elements, Bind Subject, Facial Motion Control

- **Elements:** 1–4 reference images, subjects tagged and their interaction described in prompt. The most mature native **multi-subject interaction** support — two characters embracing, a rider on a creature
- **Bind Subject to Enhance Consistency** (Kling 3.0): locks an element through zooms, pans and tilts
- **Facial Motion Control:** bind a facial element and drive it with a **reference video** rather than a still. Kling recommends video over stills for complex expression transitions. Covers facial information only — hair, clothing and props need separate control

---

## Midjourney — Omni Reference

`--oref [URL] --ow [1-1000, default 100]`

**The gotcha that costs people a day:** as of August 2026 the current default model is **V8.2** (released 24 July 2026), but Omni Reference is a **V7-only** feature. Adding `--oref` to a prompt while on a V8-family model does not fail — Midjourney silently routes the job to V7 to render it. You get V7 aesthetics back and no warning that it happened.

So identity locking and the V8 look are, in practice, mutually exclusive on Midjourney right now. If you need native V8 output, Midjourney points you at personalisation, image prompts and style references instead of `--oref`.

`--cref` is the older V6 mechanism and is documented to distort real people's faces — do not reach for it in new work.

- `--ow` bands: 1–50 loose stylistic reinterpretation; ~100 balanced default; 50–250 practical sweet spot; above 400 unpredictable, with reported quality degradation [PRACTITIONER — the 1–1000 range and 100 default are documented; the bands are reported experience]
- Accepts **one image only**. Pair with `--sref` for style, so identity and art direction stay independently tunable
- High `--stylize` or `--exp` competes with `--oref` for influence; raise `--ow` to compensate

**Diagnosis:**
- Face wrong, outfit right → raise `--ow`, and use a cleaner reference
- Outfit stuck when you wanted it changed → lower `--ow` and describe the new outfit explicitly. High `--ow` preserves clothing along with the face

**Multi-character:** put both characters in one reference image and address them positionally, since omni-reference takes a single image.

---

## Sora 2 — Characters, Cameo, Storyboard

- Characters are built from a **2–4 second reference video**, not stills, producing a reusable tagged ID. Works for people, animals, objects and invented personas. Permission tiers govern real-person likeness
- **Maximum 2 characters per generation**
- **Storyboard** solves editorial continuity rather than identity: a global instruction block carries identity, wardrobe and style verbatim into every beat, while only per-beat text — location, action, lens, composition — varies. Individual weak beats regenerate in isolation

---

## Luma Ray3

- **Character Reference:** locks likeness, costume and identity from a single image onto an actor's original performance, preserving motion, timing and emotional delivery while swapping visual identity
- **Ray3 Modify:** strength runs from "Adhere" (tight — retexture, relight, recolour) to "Reimagine" (loose — needed for non-human or heavily stylised transformation)
- **Caveat:** the faster Ray3.14 variant does **not** support character references or HDR/EXR. Fall back to full Ray3 for identity-locked work
- Dream Machine stack: append "same face, hair, pose, features" to every prompt, tag `@character`, and when modifying a frame state explicitly what stays fixed. Combining these beats any one alone

---

## Higgsfield — Soul ID

Trains an identity from **20–80 recent, well-lit photos** of one real person across varied angles and expressions — closer to lightweight personalisation than single-shot reference.

Best suited to real-person likeness. For invented characters, Higgsfield routes through its character-creation tooling, after which the result exports as a reusable reference element for downstream tools such as Kling.

Higgsfield frames the output honestly as producing someone "clearly the same person" rather than frame-identical under extreme pose or style change. Treat it as one layer of the stack, not the whole solution.

---

## Character LoRA (Flux / SDXL)

Use when a character is recurring IP that must hold body proportions, costume and design language from text alone, without supplying a reference every time.

- **SDXL:** kohya-ss `sdxl_train_network.py`, TOML dataset config, bucketed high-resolution data, bf16, cached latents
- **Flux:** ostris/ai-toolkit, flow-matching, frozen text encoder. **500–4,000 steps** as a starting range
- **Dataset:** quality over count. Cover front, 3/4, profile, expression range, scale, lighting, outfit and pose. Use a **rare trigger token** in every caption
- **The captioning rule that matters:** caption the attributes you want to remain *variable* (clothing, pose, angle, setting). Leave identity-defining attributes (face shape, eye colour, build) *uncaptioned* so they bind to the trigger token instead

**Failure modes:** overtraining reproduces training-set framing, clothing and backgrounds, and kills prompt responsiveness. Hold out views for evaluation. Avoid near-duplicate images. Architectures are not interchangeable — an SDXL LoRA does not run on Flux.

---

## Identity adapters

| Adapter | Good at | Failure mode |
|---|---|---|
| **IP-Adapter** (base) | Broad visual content, style, composition, colour | Generic CLIP embeddings carry only coarse facial information — weak as an identity lock |
| **IP-Adapter FaceID** | More identity-oriented than base | Needs a compatible base checkpoint; historically weak Flux support |
| **InstantID** | Fast, strong recognisable-person identity on SDXL from few images | Not designed for fictional characters whose identity lives in costume or silhouette rather than face; FLUX support unresolved |
| **PuLID** | Best-documented native Flux identity adapter; explicitly minimises disruption to background, lighting and composition | PuLID-FLUX still labelled beta; weaker reported fidelity on some male faces; fp8 quantisation visibly reduces facial detail versus bf16 |

**Production hybrid:** low-strength character LoRA for global design and proportions, plus PuLID or InstantID for the facial lock, plus ControlNet/OpenPose for pose.

Start every component low and raise only the one that is failing. Stacking aggressively produces the plasticky "IPAdapter face" and fights both prompt adherence and style flexibility.

---

## Choosing your conditioning mode

Do not build a production around one vendor. Build it around the two conditioning modes, then pick whichever tool exposes the one you need for that shot.

**Mode A — identity conditioning.** You supply reference images of the character. The tool holds appearance while inventing the framing. Good for a new setup, a new location, a new angle.

**Mode B — frame conditioning.** You supply a first frame, and sometimes a last frame. The tool holds composition while inventing the motion. Good for continuing an existing shot, or for locking a composition you already approved.

The trap: **several tools will not let you use both in one request.** Veo is the documented case, but assume the restriction exists until you have checked, because the two modes compete for the same conditioning channel.

This is why the workflow in `drift.md` separates frame construction from animation. Build and approve the setup frame using Mode A, where identity references do their work. Then animate that approved frame using Mode B, where the frame itself now carries the identity. You get both, in sequence, without needing a tool that supports both at once.

**Before designing a sequence, establish for your chosen tool:**

1. How many reference images, and of what type
2. Whether a first frame is accepted
3. Whether a last frame is accepted
4. Whether there is a native extend or continuation feature
5. **Which of the above are mutually exclusive**
6. Maximum clip duration

Answer those six and any tool slots into this method. That list is deliberately not filled in here for every vendor — those answers change with each model release, and a stale table is worse than no table. Check the vendor's current documentation; it takes two minutes and it is the difference between a workflow that runs and one that gets rejected.
