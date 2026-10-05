---
model: index (all video and image models)
vendor: n/a
verified_on: 2026-10-05
confidence: verified for the per-model facts marked [V] in each file; the cross-model rules are craft-rule (consistent across every vendor guide read)
sources:
  - every file in this folder (see each file's front-matter)
  - doc12#5 (cross-model rules), doc11#1B, #3
  - ledger: dsk-video-tool-adapters, dsk-image-model-adapters, vsk-universal-rules, hf-prompt-mcsla, hfs-generate-prompt-engineering
  - ledger (2026-10-05 second wave): vps-skill-router (model-routing rules), vps-ltx2*, vps-ovi, vps-wan-animate2 (archived; 'Other models seen' below)
supersedes: [vps-skill-router]
---

# Prompt dialects: index and cross-model rules

One file per model family. Each says how to word a clip or keyframe prompt so that model obeys it. These files replace the dialect cards in doc12#5 and `direction/hailuo_cookbook.md` (now superseded by `hailuo.md`).

Labels used in every file: **[V]** = checked on the vendor's own page, or measured on our own output, on the `verified_on` date. **[S]** = secondary (vendored skill, third-party guide, research doc). **[W]** = weak (one source, community lore). Anything without [V] carries an implicit "verify before use".

## Index

| File | Model(s) | Status in our pipeline | Evidence |
|---|---|---|---|
| `hailuo.md` | MiniMax-H3 (+ H3-Max; Hailuo-2.3 fallback, 02) | **In use** (`providers.yaml` video, `MiniMax-H3` since 2026-10-05) | V: MiniMax API docs + MiniMax HF prompt guides (section 12) + ffprobe of our 2.3 clips (H3 not yet measured) |
| `keyframe-image.md` | MiniMax image-01 (+ Nano Banana, GPT Image 2.5, FLUX) | **In use** (`providers.yaml` image) | V: all four vendors' API docs |
| `kling.md` | Kling 3.0 family | not wired | mostly S (API page unreachable) |
| `veo.md` | Veo 3.1 | not wired (`adapters.video_veo` named but missing) | V: Gemini API + Google Cloud blog |
| `seedance.md` | Seedance 1.5 Pro / 2.0 / 2.5 | not wired | V for 1.5 Pro only; 2.x S |
| `runway.md` | Gen-4.5 / Gen-4 | not wired | V: Runway help centre + API model list |
| `wan.md` | Wan 3.0 / Prime | not wired | V: Alibaba Model Studio guides |

## Quick capability matrix (as of 2026-10-05)

| | Hailuo 2.3 (fallback) | H3 (in use) | Kling 3.0 | Veo 3.1 | Seedance | Gen-4.5 | Wan 3.0 |
|---|---|---|---|---|---|---|---|
| Camera syntax | 15 `[bracket]` tokens [V] | conflict: platform guide shows `[pan]`-style brackets, HF guide natural sentences with amplitude + speed [V both]; A/B pending | natural language [V] | natural language [V] | natural language + `camera_fixed` [V] | natural language [V] | natural language in shot lines [V] |
| 9:16 | from first frame [V] | `ratio` 9:16 for T2V; I2V adaptive from first frame [V] | yes [S] | `aspectRatio` 9:16 [V] | `ratio` [V] | I2V only, 720x1280 [V] | `ratio` 9:16 / adaptive [V] |
| Durations | 6 or 10 s [V] | 4-15 s [V] | 3-15 s [V] | 4/6/8 s; 8 s at 1080p [V] | 4-15 s (2.0), 4-30 s (2.5) [S] | 2-10 s [V] | 2-30 s [V] |
| Last frame | no [V] (Hailuo-02 yes) | yes [V] | yes, `image_tail` [S] | yes [V] | yes [S/V-1.0] | not listed [V] | yes [V] |
| Negative field | no [V] | no [V] | yes [S] | not documented [V] | no field in 1.5 guide [V] | no, unsupported [V] | in-prompt list section [V] |
| Native audio | no [V, measured] | yes, native stereo, no off switch documented [V blog; 32 kHz S] | yes [V] | always on [V] | yes (1.5 Pro) [V] | none documented [V] | yes [V] |

## Cross-model rules (hold for every model)

These are [craft-rule]: every vendor guide we read agrees, or none contradicts. Follow them before any model-specific note.

1. **Keyframe first, then animate.** Fix identity, set, light, lens and composition in an approved 9:16 still. The video prompt only adds motion. Fixing a bad clip usually means fixing the still (`keyframe-image.md`).
2. **I2V prompts describe change, not appearance.** Do not re-describe what the image shows; it lowers motion and invites drift. Refer to "the subject" or "she".
3. **One subject, one primary beat, one camera move per clip.** A 4-6 s clip holds one change. Split anything more and cut on the action (see `hailuo.md` section 9).
4. **Camera gets its own clause** (or its own UI control, never both). Use the model's exact syntax: Hailuo brackets, everyone else plain film terms.
5. **Name an end state.** "Ends with ..." stops early completion and idle loops.
6. **Physical, measurable words, not mood words.** Name the light source and its side, pace ("slowly", "over the whole clip"), direction ("left to right"). Delete cinematic/epic/stunning/8K.
7. **Positive phrasing by default.** Write the empty or desired state ("the street is empty", "the sign is blank"). Two exceptions: (a) a real negative field (Kling; Wan's labelled list) holds the exclusions, as nouns, 4-6 items; (b) audio and caption suppression lines ("No music. No subtitles.") on audio-generating models (Veo, Seedance, Wan, Kling).
8. **No readable text from generators.** All words and numbers are rendered in Remotion. Ask for blank signage instead.
9. **We own the audio.** Narration is TTS; music and SFX are mixed in Remotion. On audio-generating models, suppress music and dialogue (or switch audio off) and mute or duck the clip track.
10. **Generate native 9:16.** On I2V the input still sets the aspect. Never crop 16:9 to vertical.
11. **Continuity across clips**: same keyframe or reference set, the same lighting sentence pasted word for word, screen direction stated in every clip ("walks left to right"), and the last frame of clip N reused as the first frame of clip N+1. Use first/last-frame models for guaranteed endpoints.
12. **No named-director or franchise prompting.** Translate the style into lens, light and movement terms (CRAFT-SPEC hard constraint).
13. **Avoid known failure zones**: visible hands doing fine work, crowds of identifiable faces, full body turns, pours, splashes and collisions in close view, small faces needing identity. See `../realism.yaml` and doc12#2.5.
14. **Iterate one variable at a time.** Keep seed, keyframe and language fixed, change one clause, and log what changed.

## How to add a model

1. Create `<model>.md` here with the same front-matter keys: `model`, `vendor`, `verified_on` (a date, or `unverified`), `confidence`, `sources` (URLs plus ledger ids), and `status_in_pipeline` if it is not wired.
2. Use the same body sections, in order: prompt structure/formula; camera tokens with exact syntax; duration/resolution/aspect; image-to-video and first/last frame; negative prompts (or the positive-phrasing substitute); audio; pitfalls and failure modes; 3 short **original** 9:16 examples (cinematic cold open, explainer mechanism, one more).
3. Label every claim [V]/[S]/[W]. Prefer the vendor's own docs or API reference. Avoid look-alike "guide" domains (doc11#1E). Record each URL and the fetch date. If a page will not load, say so; never fill the gap from memory.
4. Do not hard-code a token, limit or parameter you could not corroborate. Write "verify before use".
5. If the model will be wired: name the adapter (`adapters/video_<x>.py`), check the exact parameters the adapter sends against the doc, and add a row to the index and the matrix above.
6. Re-verify each wired model at least every two release cycles, because vendors rename and retire models monthly. Update `verified_on`.

## Other models seen, low value (no dialect file)

Seen in the 2026-10-05 second vendoring wave (`video-prompting-skill`); archived in `../../skills/ARCHIVED.yaml`. None is wired or planned. All [S], from a vendored skill.
- **LTX-2 / 2.3 / 2.5** (Lightricks, open weights + API): story-flow prompts, duration stated first on 2.3, native portrait on 2.3, single-shot vs multi-shot vs screenplay forms and automatic duration on 2.5. Interesting only if we ever self-host.
- **Dub-It** (an LTX-2.5 mode): replaces speech in an existing speaking video, one speaker, `[Speaker] is speaking [language], saying: "..."`. Off-target: we never put speech in clips.
- **Ovi 1.0 / 1.1** (Character.AI): talking clips, 5 s (1.1 also 10 s), `<S>speech<E>` tokens and version-specific audio captions. Off-target.
- **Wan Animate 2** (`Wan2.2-Animate-2-14B`): character replacement/animation driven by a reference video, with a Chinese two-field appearance/background schema. Off-target: we shoot no footage.
- Cross-model rule repeated in every one of these guides, and in the router (`vps-skill-router`): keep model name, duration, aspect, resolution and settings out of the prompt text (already our practice; see each file).

## Known open items (for the wiring pass)

- H3 camera syntax: A/B brackets vs natural-language-with-amplitude vs the full Context-IR format (`hailuo.md` section 12.6). Also unknown whether `/v2/video_generation` applies H3-Context-IR internally (12.0).

- On the 2.3 fallback, `adapters/video_minimax.py` sends `prompt_optimizer: true` (configurable). It is untested whether that preserves `[bracket]` camera commands; A/B it (`hailuo.md` section 2). H3 has no such field.
- Fixed 2026-10-05: keyframes are requested at 1152x2048 (no `aspect_ratio`), above the 768 px clip width (`keyframe-image.md` section 1).
- image-01 `subject_reference` (character) is supported but unused. It could replace verbatim-descriptor-only consistency.
- Resolved 2026-10-05: the adapter now calls H3 on `/v2/video_generation` with `content` roles; `model: MiniMax-Hailuo-2.3` switches back to v1.
