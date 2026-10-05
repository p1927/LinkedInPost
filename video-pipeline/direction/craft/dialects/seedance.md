---
model: Dreamina Seedance 2.5 / 2.0 (family), Seedance 1.5 Pro (doubao-seedance-1-5-pro-251215)
vendor: ByteDance (BytePlus ModelArk / Dreamina / Jimeng; also resold via Runway API ids seedance2_5, seedance2)
verified_on: 2026-10-05 (1.5 Pro guide only; the 2.0 and 2.5 BytePlus guide pages return navigation shells)
confidence: verified for the 1.5 Pro formula and request params; secondary for everything 2.x
sources:
  - https://docs.byteplus.com/en/docs/ModelArk/2168087   # Seedance 1.5 Pro prompt guide, fetched 2026-10-05
  - https://docs.byteplus.com/en/docs/modelark/seedance-2-5-prompt-guide  # shell only
  - https://docs.byteplus.com/en/docs/ModelArk/2222480   # 2.0 guide, shell only
  - https://docs.byteplus.com/en/docs/ModelArk/1553576   # seedance 1.0 lite (search snippet)
  - https://docs.dev.runwayml.com/guides/models/          # lists seedance2_5 / seedance2 ids, fetched
  - ledger: vsk-seedance, vsk-seedance-25, hf-seedance, hf-seedance-2-5, hf-seedance-production-patterns, hf-templates-seedance, hf-models
  - doc12#5 seedance card; https://fuser.studio/articles/seedance-2-5-prompt-guide (secondary, via doc12)
  - ledger (section 9 pass, 2026-10-05): hf-seedance-engine-rules, hf-seedance-2-5-playbooks, hf-facs, hig-templates-seedance-omni-reference-2-5, hig-templates-seedance-facs-expression-beats, hig-skills-higgsfield-seedance-vfx-references-first-frame, ddr-motion-prompt-structure
  - ledger (2026-10-05 second wave): vps-seedance2 (cites Volcengine guide + Seed blog), vps-seedance25 (cites seed.bytedance.com, fal.ai and Dreamina guides), shk-adapter-seedance (2.0 on a reseller surface); none of their vendor pages fetched by us
status_in_pipeline: not wired. Reference only.
supersedes: [vps-seedance2, vps-seedance25, shk-adapter-seedance, hf-seedance, hf-seedance-2-5, hf-seedance-2-5-playbooks, hf-seedance-engine-rules, hf-templates-seedance, hig-templates-seedance-omni-reference-2-5, hig-templates-seedance-facs-expression-beats, hf-facs, hig-skills-higgsfield-seedance-vfx-references-first-frame, ddr-motion-prompt-structure]
---

# Seedance dialect

Labels: [V] = BytePlus or Runway page fetched 2026-10-05. [S] = vendored skill or third-party guide. [W] = single source.

## 1. Prompt structure

- **1.5 Pro official formula** [V]: `Subject + Movement + Environment (optional) + Camera movement (optional) + Aesthetic description (optional) + Sound (optional)`.
- Official principles [V]: give clear, constrained descriptions of subject and motion; use degree adverbs ("rotates slowly, then stops"); define the subject by visible features, the same way each time.
- **2.5** (vendored summary of the official guide; we could not retrieve it) [S]: `<Subject> performs <action> in <scene>. The visuals feature <style>. Use <shot size, angle, movement or cuts>. Audio includes <...>.` For long or reference-heavy work: reference declaration, then one-line summary, then plot by timeline, then a global tail that restates must-hold facts.
- Put generation parameters (duration, ratio, resolution) in the request body, not the prompt text, on 2.5 [S]. On 1.5 Pro the body is "strongly recommended"; the `--rs --rt --dur --cf` prompt suffix is the legacy way [V].
- Beat density [S: hf-models]: 4-6 s holds 1 primary change; 8-10 s holds 1-2; 12-15 s holds 2-3, using timestamps.
- Delete unmeasurable words (cinematic, epic, stunning, 8K). Replace them with light source, direction and timing [S].

## 2. Camera tokens

- Official 1.5 Pro terms [V]: dolly-in, dolly-out, pan, track, follow, rise, fall, whirl, rotate, surround, zoom. Combinations are allowed (Hitchcock shot = dolly + opposite zoom; bullet time = slowdown + surround). Angles and perspectives include low angle, over-the-shoulder, subjective, surveillance and telescope view.
- `camera_fixed: true|false` request parameter locks the camera [V]. Use `true` for any shot where only the subject should move, instead of words.
- 1.0 docs show "camera switches to ..." / "the camera cuts to ..." for in-generation cuts [V snippet].
- One move per shot. Never pair locked-off with handheld, orbit with pan, or tilt with push [S].
- Multi-shot on 2.x: "Shot 1 / Shot 2" blocks or `[0-4s]` timestamps. Vendored notes say 2.5 honours them to the second [S/W].

## 3. Duration, resolution, aspect

| Version | Duration | Resolution | Label |
|---|---|---|---|
| 1.5 Pro | `duration` (example 5) or `frames`; Higgsfield lists 4/8/12 s | `resolution` e.g. 720p | [V params; S values] |
| 2.0 | 4-15 s | 480p / 720p / 1080p / 4K | [S] |
| 2.5 | 4-30 s (or -1) | 480p / 720p / 1080p (platform-dependent) | [S] |

Aspect `ratio` includes 9:16 (16:9, 4:3, 1:1, 3:4, 9:16, 21:9, sometimes 9:21) [V that the `ratio` param exists; S for the list]. The 1.5 Pro request also takes `seed` and `watermark` [V]. **Set `watermark: false`.**

## 4. Image-to-video and first/last frame

- First frame and optional last frame on Seedance 1.0 lite I2V; reference images 1-4 [V snippet].
- 2.x: start/end frames plus image/video/audio references [S]. The 2.5 "omni" set is 30 images, 10 videos and 10 audio [S].
- Reference discipline [S: vsk-seedance-25, hf-seedance-2-5]: bind each asset to one role in words (`@Image 1 defines the girl's face and clothing only. Do not use its background.`). Never write "Images 1-4 are four characters".
- Strongest results come from a keyframe you already like [S: doc12 citing fuser.studio].

## 5. Negative prompts

- No dedicated negative field in the 1.5 Pro guide we read [V, absence]. Some UIs expose one [S: dsk].
- Community and vendored consensus [S/W]: an inline "No subtitles, no watermark, no background music" is the accepted exception, and vendored notes say it became reliable on 2.5. Use it only for subtitles, watermark and music; phrase everything else positively.

## 6. Audio

- 1.5 Pro is a native joint audio-video model: dialogue with lip-sync (Mandarin and dialects, English, Japanese, Korean, Spanish, Indonesian), SFX and BGM [V].
- Dialogue syntax [V]: `He says in Mandarin: "..."`, or a labelled dialogue block (`English dialogue: A: "..." B: "..."`).
- 2.5 markers [S/W]: `( )` music, `< >` sound effect, `{ }` dialogue, `【 】` on-screen title.
- For us: no dialogue; write "Pure video, no subtitles, no background music." and mix in Remotion.

## 7. Pitfalls and failure modes

- Unwanted subtitles, watermark or BGM appear. Add the explicit line above and set `watermark: false` [S].
- Style drift between generations. Repeat one global style tail; use references [S].
- Asset bleed (a background from a face reference). Use explicit "do not use" exclusions per asset [S].
- 2.0 may mishandle timestamps (2.5 is said to be fine) [W].
- Content filters block real faces and celebrity likenesses on some surfaces [S].
- Version specs move monthly. The 2.x limits come from vendored and third-party sources; confirm them in the BytePlus console before hard-coding.

## 7a. Production notes from the vendored Higgsfield and drama-director skills

All [S] unless marked; these come from a reseller's skill pack (Higgsfield surface, snapshot 2026-09-26), not from BytePlus. Model-independent ideas from the same files now live in `../prompting.yaml` (prompt-layer-order, prompt-measurable-language, prompt-motion-fill, prompt-edit-hold-change) and `../continuity.yaml` (cont-reference-roles, cont-spatial-layout, cont-positive-locks, cont-context-isolation).

**2.0 vs 2.5 on that surface** [S]
- 2.0: 4-15 s; 4K and 1080p only in `mode=std`, `mode=fast` caps at 480p/720p; up to 9 images, 3 videos (15 s total), 3 audio; a `genre` hint; **no seed parameter**, so a 480p draft validates the prompt, not the take (pin frames, not rolls).
- 2.5: 4-30 s, 480p/720p/1080p, no 4K, no genre; modes `t2v` (zero references), `omni_reference` (at least one), `video_edit`, `video_extension` (needs `extension_mode: forward|backward`); `start_image`/`end_image` only in `omni_reference`; image refs + start + end <= 30, all materials <= 50.
- `video_edit` ignores duration and aspect and bills by source length; `video_extension` inherits the source aspect.

**Prompt shape** [S]
- 2.0 short form: six slots (camera, subject, action, setting, style, lighting); single-shot sweet spot 50-80 words; past ~180 words the vendor reports failures [W].
- 2.0 production "block scaffold": SCENE CONTEXT, ACTIVE REFERENCES, LOCATION MAP, FIRST FRAME/BLOCKING, FORMAT, OPTICS, CAMERA, ACTION, PERFORMANCE, PHYSICS, LIGHTING, COLOR, WARDROBE, AUDIO, STYLE, OUTPUT, POSITIVE LOCKS; only the blocks a shot needs.
- drama-director 15 s I2V form: Style & Mood, then Dynamic Description (shot by shot, joined with "Hard cut to ..."), then Static Description declaring every element the dynamic part names [S: ddr-motion-prompt-structure].
- FOV stated in discrete degree anchors (180, 107, 84, 63, 47, 29, 18, 12, 8), "no drift mid-segment" in multishot [W: vendor house doctrine].
- Cut ladder: oner ("the camera does not cut on its own"), sequential CUT 1/2/3, timed cuts ("exactly one HARD CUT at 0:07"), freestyle. Per-second labels inside an intended oner read as cuts. Timed beats must sum to the duration; 2.5 treats them as a budget, not frame-exact.
- Whip pan needs about 0.8 s of blur travel or it renders as a hard cut [W]. Real-time and slow-motion segments are joined only by hard cuts [S].
- Video prompts are hand-written; the field corpus had the prompt enhancer off for video [W]. Compare the open `prompt_optimizer` question in `hailuo.md`.

**References** [S]
- Role phrases seen working: "100% matches the reference" (identity), "STYLE REFERENCE ONLY, the model extends the world" (location), "VARIETY reference" (a lineup sheet so a crowd is not clones) [S: demo].
- 2.5: one role sentence per material with an exclusion; never "@Images 1-4 are four characters"; beat prose names characters by name plus one visible marker, handles stay in the role map. 2.0 convention is the opposite (lead the acting paragraph with the tag).
- First/last on 2.5: one sentence per anchor, never merged; both images share an aspect; output locks to the first image.
- Keyframes 3+: "Use @Image 1 through @Image N as keyframes in this order"; separate images beat one grid; grids work best at 15 panels or fewer.

**Extension and editing** [S]
- 2.0 extension: attach the clip as a video reference and open "The scene continues." (prequel: "Show me what happens before"); match source resolution and duration; feed the last 3-4 s, not a still; cap seamless chains at about 2, then re-anchor from original references [W].
- 2.5 extension: align the boundary frame (pose, props, camera, light, motion direction) before new content; a backward extension must end on the source's first frame; "then connect to the source" is the documented failure.
- 2.5 edit: sole editing master + scope + target + preserve list; subject replacement adds timeline inheritance (same timing, path, occlusion, exit).

**Engine rules and failures (2.0)** [S]
- At most 3 tracked characters; exit frame is an implicit cut; off-screen events do not exist; reflections break geometry; joint-angle choreography fails (write the move's intent and force direction). Already in `../realism.yaml`.
- The model may drop to 12-18 effective fps with duplicate frames; stating "24 fps, no frame repeated" in the body reportedly helps [W].
- Short spoken lines (<= 6 words in 4 s) come back wrapped in invented mumble; give non-speakers a positive at-rest mouth fact. Irrelevant while we keep speech out of clips.
- Facial Action Unit codes (AU6+AU12 etc.) are a prompt convention, not a parameter; vendor caps 3-4 expressions per clip, 1-2 AUs per beat; untested on any model we use [W].
- Vendored guides ban age words because age inference drifts and because filters tighten on minors. **We do not adopt the filter rationale**: never disguise who is depicted to get past moderation. Our identity strings keep an honest age (cont-identity-string); if Seedance is wired, test age drift and keep minors out of photoreal drama.
- Instant rejection (under ~10 s) is a filter decision, a long failure is render/infra [S]. On a filter rejection change the shot's content or drop it; the vendor's "rewrite playbook" (renaming people, brands and violence to pass the filter) is deliberately not carried over.

## 7b. Second-wave notes (video-prompting-skill, shotkit)

All [S] unless marked: vendored skills citing ByteDance/Volcengine/Dreamina/fal pages we did not fetch.

**2.0** [S: vps-seedance2]
- Seed launch blog (as quoted): up to 15 s multi-shot audio-video, stereo audio; combine up to 9 images, 3 videos, 3 audio plus text. Agrees with the Higgsfield-surface numbers in 7a.
- A 15 s clip holds 2-4 clear beats or a short multi-shot sequence. Labels `Shot 1`, `Shot 2`, `Cut to close-up`, `Final shot` match the official examples; describe the transition ("the shot transitions to ...").
- Reference labels on 2.0 are written with a space (`@Image 1`, `@Video 1`, `@Audio 1`); one stated job per asset.
- Official materials say real human portraits or voices as references may need authorization or identity verification. For us: no real-person references at all.

**2.5** [S: vps-seedance25; fal.ai limits are surface-specific]
- Do not default to 30 s. Pick the shortest duration the action fills; unused time after the last action gets filler.
- Simple shot = subject and setting, one action arc, shot size + one move, light + one treatment, sound, final image. Complex shot = FORMAT, REFERENCE ROLES, STARTING STATE, TIMELINE, CAMERA, CONTINUITY, AUDIO, ENDING STATE, CONSTRAINTS (only the blocks needed).
- Timestamps are approximate allocations, not frame-exact; adjacent blocks must cover the whole duration with no gap or overlap (agrees with 7a).
- Each beat inherits the prior beat's physical state (which hand holds what, open/closed, counts, travel direction); cause before reaction; state how occluded subjects re-emerge; end on a defined settled frame. These are generic craft and live in `../continuity.yaml` / `../prompting.yaml`; listed here so the source is fully absorbed.
- Reference labels on 2.5 are commonly `@Image1` (no space); use whatever the platform exposes and verify upload order. Name both the allowed and the forbidden transfer per asset; images for appearance/layout, video for time-based behaviour (camera path, choreography, mechanism), audio for voice/timing/ambience. Do not let an image and a video compete for the same job.
- If an audio reference carries the dialogue, never transcribe its words in the prompt; direct lip-sync to that asset only. Irrelevant while we keep speech out of clips.
- White-model (grey proxy) and green-screen references are supported "where the platform supports them" [W].
- Audio: say `no music` when only production sound is wanted, `silent` or `faint room tone only` for intended silence.
- Fix one variable per retry (action order, continuity list, reference role, camera path, ending block) and leave what worked untouched (agrees with cross-model rule 14).

**shotkit Seedance 2.0 adapter** [S]
- 80-150 words per prompt (conflicts with the 50-80 single-shot sweet spot in 7a; treat 80-150 as the multi-shot budget).
- Multi-shot form: `Shot 1: ... Shot 2: ... Shot 3: ...` then one verbatim `Consistent subject throughout: <identity string>`; at most about 4 cuts per generation, one move and one action per cut; separate generations for different subjects or places.

## 8. Example prompts (original, 9:16)

**A. Cinematic cold open (T2V, 5 s, `camera_fixed: false`)**:
```
A young lighthouse keeper climbs the last steps of a spiral stair and pushes open a heavy iron hatch; cold wind blows his hair back. The camera follows from below, rising with him. Grey dawn light through the hatch, grain, muted colours. Wind roaring, metal hinge groans. Pure video, no subtitles, no background music.
```

**B. Explainer mechanism (I2V from our keyframe, 5 s, `camera_fixed: true`)**:
```
The magnet slides slowly toward the pile of iron filings; the filings lift and line up into curved lines running from one end of the magnet to the other, then hold still. Clean studio light, white backdrop. Soft scraping sound. Pure video, no subtitles, no background music.
```

**C. Two-beat timeline (2.5, 8 s)**:
```
[0-4s] Close-up, static. A child's hand releases a paper boat onto a puddle; ripples spread.
[4-8s] Slow pull-out to a wide shot of a rainy courtyard; the boat drifts toward a drain grate.
Overcast daylight, soft rain sound. Pure video, no subtitles, no background music.
```
