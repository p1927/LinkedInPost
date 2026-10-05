---
model: MiniMax-H3 (what we call from 2026-10-05, v2 endpoint); also covers MiniMax-H3-Max, MiniMax-Hailuo-2.3 (fallback, v1) and MiniMax-Hailuo-02
vendor: MiniMax
verified_on: 2026-10-05
confidence: verified for API limits, endpoints, pricing, rate limits and frame support of H3 and 2.3; verified measured output for 2.3 only (no H3 clip rendered yet); secondary for prompt craft; weak for H3 craft claims
sources:
  - https://platform.minimax.io/docs/api-reference/video-generation-i2v   # fetched 2026-10-05
  - https://platform.minimax.io/docs/api-reference/video-generation-t2v   # fetched 2026-10-05
  - https://platform.minimax.io/docs/api-reference/video-generation-fl2v  # fetched 2026-10-05
  - https://platform.minimax.io/docs/api-reference/video-generation-v2-create  # H3, fetched 2026-10-05
  - https://platform.minimax.io/docs/guides/video-generation               # H3 guide, fetched 2026-10-05
  - https://platform.minimax.io/docs/api-reference/video-generation-v2-query   # fetched 2026-10-05
  - https://platform.minimax.io/docs/guides/pricing-paygo                  # fetched 2026-10-05
  - https://platform.minimax.io/docs/guides/rate-limits                    # fetched 2026-10-05
  - https://platform.minimax.io/docs/release-notes/models                  # fetched 2026-10-05
  - https://www.minimax.io/blog/minimax-h3 ; https://huggingface.co/MiniMaxAI/MiniMax-H3  # fetched 2026-10-05
  - https://huggingface.co/MiniMaxAI/MiniMax-H3/raw/main/docs/VIDEO_PROMPT_WRITING_GUIDE_base_en.md  # fetched 2026-10-05 (section 12)
  - https://huggingface.co/MiniMaxAI/MiniMax-H3/raw/main/docs/VIDEO_PROMPT_WRITING_GUIDE_ref_en.md   # fetched 2026-10-05 (section 12)
  - https://huggingface.co/MiniMaxAI/MiniMax-H3/raw/main/README.md  # fetched 2026-10-05 (H3-Context-IR description)
  - https://platform.minimax.io/docs/api-reference/video-generation-v2-h3-context-ir  # fetched 2026-10-05
  - measured: out/ep01-interest-rates*/clips/*.mp4 (ffprobe 2026-10-05)
  - video-pipeline/config/providers.yaml, adapters/video_minimax.py
  - direction/hailuo_cookbook.md (absorbed here), direction/shots.md
  - ledger: dsk-video-tool-adapters, dsk-image-model-adapters, hf-models, vsk-seedance-25 (H3 comparison)
  - ledger (2026-10-05 second wave): vps-minimax-h3, vps-h3-ex-motion-trailer, vps-h3-ex-performance-transfer, shk-adapter-hailuo, h3s-sources, afc-ref-model-prompting
  - doc11 row 5 (phileiny/h3-storyboard-skill), doc11#3 (Kapwing H3 guide), doc12#5
supersedes: [vps-minimax-h3, vps-h3-ex-motion-trailer, vps-h3-ex-performance-transfer, shk-adapter-hailuo]
---

# Hailuo / MiniMax dialect (authoritative)

This file supersedes `direction/hailuo_cookbook.md`. Where they disagree, this file wins. The full list of differences is at the end.

Labels: **[V]** = checked on a vendor page or measured on our own output, 2026-10-05. **[S]** = secondary (vendored skill, third-party guide, research doc). **[W]** = weak (one source, community lore, or not tested by us).

## 0-measured. First live H3 clip on our account (2026-10-05) [V: measured with ffprobe]
One image-to-video call, `MiniMax-H3`, 768P, duration 6, ratio 9:16, first frame = an image-01 keyframe made at width 1152 / height 2048 (no aspect_ratio sent):
- **Keyframe:** exactly 1152x2048 (the width/height path works; no upscale step needed for the first frame). 36 s, about $0.0035.
- **Clip:** **768x1344** (not 768x1365; slightly wider than true 9:16, a 0.571 ratio), **24 fps**, **6.583 s** for a requested 6 s (plan for 6.6 s, not 6.0), **one stereo audio stream present** (native audio is generated; Remotion mutes clips, so ignore it), about 1 MB, about **175 s** wall time per clip, billed at the $0.08/s x 6 s rate (cost as estimated; check the MiniMax dashboard).
- **Prompt adherence:** a natural camera sentence ("The camera pushes in slowly toward the rocket") plus one action sentence were followed: slow push-in, flame flicker, curtain motion; subject stayed identical to the keyframe. No bracket tokens were used, so the bracket-vs-natural A/B is still open.
- **Style caution:** an ad-hoc keyframe prompt saying "clean flat editorial illustration" came back photographic. Use the full audience `illustration_style` text and verify the keyframe before spending on the clip.
- Remotion implication: set clip `durationInFrames` from the real file duration (6.58 s = 158 frames at 24 fps, i.e. about 198 at our 30 fps timeline), not from the requested 6 s; cover the 768x1344 frame to 1080x1920 with a slight crop.

## 0. What we actually call

| Item | Value | Label |
|---|---|---|
| Model in `providers.yaml` | `MiniMax-H3`, `resolution: 768P`, `duration: 6`, `ratio: "9:16"` | [V] config |
| Why H3 | Newest MiniMax video model (release notes: 2026-07-31). The pricing page lists H3 / H3-Max as current and Hailuo 2.3 / 2.3-Fast / 02 under "legacy". Docs require only the pay-as-you-go API plan; no beta or whitelist wording | [V] |
| Endpoint | `POST https://api.minimax.io/v2/video_generation` returns `{task_id}`; poll `GET /v2/query/video_generation/{task_id}` (every 10 s) until `task.status` is `succeeded`; download `task.content.url` (time-limited URL; tasks queryable for 7 days) | [V] docs + adapter |
| Input | `content` array: `{type: text, text}` (adapter cuts at 7000 chars) + `{type: image_url, image_url: {url: data URL}, role: first_frame}`; optional `last_frame`. `ratio` is forced to `adaptive` with an image | [V] |
| Errors | HTTP 4xx/5xx with `{"type":"error","error":{"type","message"}}` (e.g. 402 `insufficient_balance_error`, 422 sensitive content, 429 rate limit) | [V] |
| Fallback | `model: MiniMax-Hailuo-2.3` in the same adapter switches to the old v1 flow (`/v1/video_generation`, `query/video_generation`, `files/retrieve`, `prompt_optimizer`) | [V] adapter |
| Expected output | 768P = short side 768 px, so a 9:16 keyframe gives about 768x1365; 24 fps; **native 32 kHz stereo audio** | [S: HF model card says short side 768 and 24 fps; exact pixels not on the vendor page; not yet measured by us] |
| Previous measured output (2.3) | 768x1364, 24 fps, 5.875 s, no audio stream | [V] ffprobe of ep01 clips |
| Keyframe source | `image-01` at `width: 1152, height: 2048` (no `aspect_ratio`), see `keyframe-image.md` | [V] config |

**Cost and limits** [V: pricing-paygo, rate-limits pages]:

| Model | Price | 6 s clip | Rate limit |
|---|---|---|---|
| MiniMax-H3 | 768P $0.08/s, 2K $0.13/s | $0.48 (768P), $0.78 (2K) | 300 RPM, 30 tasks in flight |
| MiniMax-H3-Max | 480P $0.05/s, 768P $0.08/s | $0.30 (480P), $0.48 (768P) | not listed separately |
| MiniMax-Hailuo-2.3 (fallback) | per clip | $0.28 (768P), $0.49 (1080P 6 s); 10 s 768P $0.56 | 20 RPM |
| MiniMax-Hailuo-2.3-Fast | per clip | $0.19 (768P) | 20 RPM |

So the switch costs about **+71% per 6 s clip** at 768P. H3-Max 480P is cheaper than 2.3 but would upscale to 1080 wide in the edit; test before use.

**Clip audio.** H3 returns a soundtrack. The Remotion clip layer plays clips `muted` (`remotion-app/src/Scenes.tsx`), so it never reaches the mix [V: code]. No documented field turns audio off [V: absent from create docs].

## 0b. H3 prompt dialect (authoritative for the current model)

- Same core shape as 2.3: the first frame fixes the look; the text describes **change over time** with one beat per clip (section 9) [S].
- Camera: the platform guide says to put camera instructions "directly after key descriptions", with examples `[pan]`, `[zoom]`, `[static]` [V]. MiniMax's own H3 prompt-writing guide on Hugging Face instead writes camera as a **natural English sentence with motion type + optional amplitude + speed** ("The camera pushes in with small amplitude at slow speed toward ...") [V: HF guide, section 12]. Two vendor pages disagree, so this is **open until an A/B** (section 12.6). House rule until then: write the move as a natural sentence in the HF form, and keep the 2.3 bracket spellings (section 2) only for the 2.3 fallback [S: our resolution, untested on our renders].
- No `prompt_optimizer` field on v2 (the adapter only sends it for v1). Only H3-Max has `extra.prompt_expansion_mode` (`disabled` / `balanced` default / `quality`) [V]. So bracket survival on H3 depends on the model itself, not an optimizer switch.
- Durations are any integer 4-15 s (H3-Max 5-15). Keep 6 s as the default; 4-5 s fits a single beat; 8-10 s only for faceless environment shots [V limits; S craft].
- First / last frame: `role: first_frame` and `role: last_frame` (at most one each). Images JPG/PNG/WEBP/HEIC/HEIF, up to 30 MB, 256-5760 px per side, w/h between 0.4 and 2.5 [V]. Image-to-video and reference-to-video are **mutually exclusive** in one request [V].
- References (r2va mode, not wired): up to 9 `reference_image`, 3 `reference_video` (2-15 s each, 15 s total), 3 `reference_audio` (WAV/MP3) [V]. A recurring character could use this instead of a first frame, at the cost of losing exact composition.
- Text-to-video needs a concrete `ratio` (`9:16`), not `adaptive` [V]. The adapter sends the configured ratio when there is no keyframe.
- No negative-prompt field [V]. Still phrase exclusions positively (section 5).
- Audio: we mute clips anyway. If a render shows lip-flap, singing motion or a music-driven edit rhythm, the vendor-documented silence form is `overall_soundscape: N/A` + `non_diegetic_music: N/A` (section 12.3) [V: HF guide format; effect on the hosted API untested]. This replaces the earlier "No music, no voices." [W] line.

## 1. Prompt structure (Hailuo 2.3 fallback; also the base for H3, see 0b)

The first frame fixes identity, wardrobe, set, light and framing. The text should describe **change over time only** [S: cookbook, dsk-video-tool-adapters S1, Runway and Kling official guides agree].

```
[Camera command] Subject + one action, with pace and direction. One environmental motion. End state.
```

- Put the bracket at the clause where the move starts. A bracket placed mid-prompt starts a second, sequential move [V: docs say "sequential commands appear in order throughout the prompt text"].
- Refer to the subject plainly ("the fox", "she"). Do not re-describe what the keyframe already shows; that tends to reduce motion [S: Runway guide, same mechanism].
- Name an end state ("ends with her eyes on the door"). This stops the action finishing at 1 s and then idling [S: dsk-video-tool-adapters Kling and Hailuo blocks].
- Use pace words ("slowly", "in one smooth motion") and physical verbs, not mood words [S].
- If only the subject should move, write `[Static shot]` explicitly [S: doc12#5 rule 7].
- Length: 15-45 words works for I2V in practice [W: our ep01 prompts; no vendor number]. The hard cap is 2000 characters [V].
- Language: English. The international API docs write the commands in English [V].

Text-to-video (no keyframe) needs the full scene: subject, place, action, shot size, light source and style. Avoid it for 9:16 work, because the T2V API has **no aspect-ratio parameter** [V]. Its output ratio is undocumented, so verify before use.

## 2. Camera commands (exact syntax) [V]

These 15 tokens are documented for `MiniMax-Hailuo-2.3`, `-2.3-Fast`, `-02`, `I2V-01-Director` and `T2V-01-Director`. Square brackets are required. Copy the spelling and capitalisation exactly as below:

`[Truck left]` `[Truck right]` `[Pan left]` `[Pan right]` `[Push in]` `[Pull out]` `[Pedestal up]` `[Pedestal down]` `[Tilt up]` `[Tilt down]` `[Zoom in]` `[Zoom out]` `[Shake]` `[Tracking shot]` `[Static shot]`

- **Simultaneous moves:** put them in one bracket, comma-separated, e.g. `[Push in, Tilt up]`. Docs recommend at most 3 [V].
- **Sequential moves:** use separate brackets in prompt order, e.g. `[Pull out] ... [Static shot] ...` [V].
- **House rule:** at most 2 commands per clip in total. Never pair near-duplicates (pan + truck, tilt + pedestal, push + zoom). Reason: a 6 s clip has a small motion budget, and DirectorSKILL also caps Hailuo at two [S: dsk-video-tool-adapters; doc12#5].
- Orbit, arc, crane, dolly zoom and whip pan are **not** tokens. As natural language they are unreliable, so avoid them or fake the move in Remotion [S: cookbook; shots.md]. Dissent: shotkit maps orbit / whip / rack focus to plain sentences on Hailuo 02 Pro ("Camera orbits the subject slowly.") with no evidence [W: shk-adapter-hailuo]; we keep our rule for 2.3. On H3 the vendor list includes `Arc Shot`, `POV` and roll, but not whip pan, crane or rack focus (section 12.4).
- `[Shake]` is the only "energy" token. Use it for at most 1-2 s of impact, then `[Static shot]`, or leave it out altogether.
- Remotion equivalents for each move are in `direction/shots.md`.

**Open question, verify before use (2.3 fallback only):** the v1 path sends `prompt_optimizer: true` (configurable via `init_args.prompt_optimizer`). The docs only say it "automatically optimizes the prompt" [V]. They do not say whether bracket commands survive the rewrite. Run an A/B test on one shot with the optimizer on and off. If brackets are ignored with it on, set `prompt_optimizer: false` under `video.init_args` in `providers.yaml`. `fast_pretreatment` (default false) only shortens optimizer time [V]. A second, still unmeasured voice: shotkit's Hailuo 02 Pro adapter (on a reseller surface) says to keep the optimizer off for series work because the rewrite "breaks shot-to-shot consistency" [W: shk-adapter-hailuo, no measurement or vendor citation]. Probe: same keyframe and prompt, optimizer true vs false, 2 takes each, judge bracket obedience and identity against the canon frame. **None of this applies to H3:** v2 has no `prompt_optimizer` field [V] (H3-Max's analogue is `extra.prompt_expansion_mode`).

## 3. Duration, resolution, aspect [V]

| Model | 6 s | 10 s | Notes |
|---|---|---|---|
| MiniMax-Hailuo-2.3 / 2.3-Fast | 768P (default), 1080P | 768P only | No 5 s option. Measured "6 s" = 5.875 s |
| MiniMax-Hailuo-02 | 512P, 768P, 1080P | 512P, 768P | Only model with first+last frame (v1 API) |
| **MiniMax-H3 (v2 API, in use)** | 4-15 s integer | | 768P / 2K; `ratio` adaptive, 21:9, 16:9, 4:3, 1:1, 3:4, 9:16 (I2V always adaptive) |
| MiniMax-H3-Max (v2 API) | 5-15 s | | 480P / 768P |

- On I2V, the **first frame sets the output aspect** [V for FL2V doc ("video resolution follows the first frame image"); V-measured for 2.3 I2V, where a 9:16 keyframe gave 768x1364]. So compose 9:16 in the keyframe.
- First frame rules: JPG/JPEG/PNG/WebP, under 20 MB, short edge over 300 px, aspect between 2:5 and 5:2 [V].
- Plan 6 s clips. Use 10 s only for faceless environment or landscape shots (identity drift grows with length) [S: dsk duration strategy].
- Narration timing: budget 5.8 s of usable picture per clip on 2.3 [V measured]. H3 returns the integer duration in `task.duration`; measure the first H3 clip before trusting a full 6.0 s [W].

## 4. Image-to-video and first/last frame

| Capability | Hailuo 2.3 | Hailuo-02 | H3 |
|---|---|---|---|
| First frame (I2V) | yes [V] | yes [V] | yes, role `first_frame` [V] |
| Last frame | **no** [V] | yes, FL2V: `first_frame_image` + `last_frame_image`, 6 s 768P/1080P, 10 s 768P; 512P not allowed; last frame is auto-cropped to the first frame's size [V] | yes, role `last_frame` [V] |
| Subject/reference images | `S2V-01` model exists, but its docs were not opened [W] | no | `reference_image` up to 9, `reference_video` up to 3 (15 s total), `reference_audio` up to 3; not combinable with first/last frame [V] |
| Our adapter | `first_frame` (v1 `first_frame_image`) | + `last_frame_image` | `first_frame` + optional `last_frame` (`generate(..., last_frame=Path)`); references not wired |

For continuity on 2.3, chain clips: take the clean last frame of clip N, re-render it as a still if needed, and use it as the first frame of clip N+1 [S: cookbook, Runway guide]. For a guaranteed endpoint (match-on-action, a "before to after" mechanism), H3 now takes `last_frame` directly; `run.py` passes it when a clip scene sets `visual.last_frame_prompt` (see `keyframe-image.md` section 1b; not combinable with reference images, lint `last_frame_exclusive`).

## 5. Negative prompts [V]

Hailuo 2.3, 02 and H3 have **no negative-prompt parameter**. Write every exclusion as a positive fact about the frame:

- "no text" becomes "the sign is a blank wooden board"
- "no extra people" becomes "the street behind her is empty"
- "don't move the camera" becomes `[Static shot]`

Never write "no X" or "nothing changes" in the prompt. Naming the noun tends to summon it [S: Runway, FLUX and DirectorSKILL all say so; the "nothing changes" note is from phileiny for H3, W].

## 6. Audio

- Hailuo 2.3: **no audio** [V: docs list no audio parameter; our clips have no audio stream]. All narration, SFX and music come from TTS and the Remotion mix.
- H3 (in use): outputs native 32 kHz stereo audio [V: MiniMax blog says "native stereo sound"; HF card gives 32 kHz]. No documented switch turns it off [V]. We mute clips in Remotion, so it is harmless and adds no cost (price is per second either way).

## 7. Character and style consistency

- Lock a keyframe per shot. For recurring characters, make a character sheet once and reuse it as the identity source [S: cookbook].
- Copy the character descriptor string word for word into every keyframe prompt (the `{bruno}` style placeholders in `episode.json` already do this).
- Keep one style prefix per episode (the `style` block in `episode.json`), applied to the keyframe and not repeated in the motion prompt.
- Never cut to an unseen side of a character (back to front, profile to frontal) inside one clip; the model invents the details [S].
- Keep each prop simple and in the centre of frame. If a prop must look the same across shots, bake it into the keyframe.

## 8. Pitfalls and failure modes

| Failure | Sign | Fix | Label |
|---|---|---|---|
| Readable text and numbers | letters warp or shimmer | No text in keyframe or prompt; render in Remotion; make signs blank | [S, consistent across all sources] |
| Hands | extra or melting fingers | Hands pocketed, behind objects, or a simple static grip | [S] |
| Crowds / 3+ faces | faces merge | Silhouettes, backs, at most 2 identifiable people | [S] |
| Over-performing face | expression cycles through emotions | Name a physical end expression ("ends on a small closed-mouth smile"), not an emotion | [S: dsk Hailuo block] |
| Too many beats | later beats dropped or rushed; face freezes | One beat per clip (section 9) | [S/W, H3-measured upstream] |
| Re-described image | low motion, look drifts | Describe motion only | [S] |
| Fast complex physics (pour, splash, crash) | objects pass through each other | Show cause and aftermath in two clips, or move it to Remotion | [S] |
| Morphing props | cup changes shape | One prop, kept in frame, no occlude-and-reveal | [S] |
| Prompt optimizer rewrite | camera command ignored | A/B `prompt_optimizer` (section 2) | [W, untested] |
| Clip shorter than planned | 5.875 s | Pad the edit or plan 5.8 s | [V] |
| Low-res keyframe | soft or shimmering upscale (720 to 768 wide) | Fixed: keyframes now 1152x2048 (see keyframe-image.md) | [V numbers; quality impact W] |

Also see `realism.yaml` and doc12#2.5 for the general failure table. It is not duplicated here.

## 9. Beat budget (house rule, adopted from H3 research)

phileiny/h3-storyboard-skill [S, MIT, has PSNR controls, **measured on H3, not 2.3**] reports that a shot carrying several facial or action beats silently drops some of them, while 2-3 s shots with one beat each landed every beat. We adopt this for 2.3 as well, because it agrees with the DirectorSKILL motion budget and Seedance beat-density tables [S]:

- **One primary beat per 6 s clip.** At most one subject action plus one environmental motion. A 6 s clip holds one beat cleanly; two only if the second is tiny (a blink, settling).
- If a moment needs 2-3 beats, **split it into 2-3 clips** and cut on the action. Do not stack sequential brackets.
- If we move to H3, use one beat per 2-3 s timeline segment.
- Do not write "nothing changes" or "everything stays the same"; use a positive hold ("the camera holds; steam keeps rising").
- Describe framing as a crop ("framed from the chest up"), not as numeric size [S/W: phileiny].
- Other H3-only claims stay H3-only until tested: a dialogue tag gives speaking time to the speaking shot, retention levels [W, Kapwing third-party]. The `[0-3s]` timeline syntax Kapwing gave is **replaced**: MiniMax's HF guide uses `[Shot N] At MM:SS.mmm, the camera cuts to ...` (section 12.2) [V]. On camera syntax the two MiniMax pages disagree (platform guide: `[pan]`/`[zoom]`/`[static]`; HF guide: natural sentences with amplitude and speed); see section 12.6.

## 10. Example prompts (original, 9:16 I2V, 6 s; written for 2.3, used as-is on H3 until tested)

**A. Cinematic cold open.** Keyframe: a night harbour, a lone dock worker seen from behind, one sodium lamp camera-left, fog-free dry concrete.
```
[Push in] The dock worker stops walking and slowly turns his head toward the dark water on the right. One mooring rope tightens and creaks against a bollard. Ends with his face in profile, lit orange from the left.
```

**B. Explainer mechanism shot.** Keyframe: a glass jar of water on a plain table, a beam of white light entering from the left, cool studio backdrop, nothing written anywhere.
```
[Static shot] The beam of light passes into the water and the water slowly glows pale blue from the inside, the colour spreading from left to right. Tiny bubbles drift upward. Ends with the whole jar evenly blue.
```

**C. Hook transition / insert (two moves in sequence, still one beat).** Keyframe: a close insert of a single coin standing on its edge on a wooden counter.
```
[Static shot] The coin wobbles and begins to tip over slowly. [Pull out] The counter widens to reveal an empty shop behind it, lights off, chairs upturned on tables. Ends wide and still.
```
(C spends the house limit of 2 commands. Keep the subject action to one: the tip.)

## 11. Differences from `hailuo_cookbook.md` (now superseded)

1. **Evidence upgraded.** The 15 commands and the combine/sequence syntax were "[E secondary]". They are now verified on the MiniMax docs. Their scope is Hailuo-2.3, 2.3-Fast, 02 and the 01-Director models.
2. **"5-6 s clips hold better than 10 s"**: the API has no 5 s option for 2.3. The choices are 6 s (768P or 1080P) or 10 s (768P). The real output is 5.875 s.
3. **Last frame**: the cookbook implies only last-frame chaining. In fact 2.3 has no last-frame slot, Hailuo-02 has FL2V, and H3 has `last_frame`.
4. **Example 8** (`[Shake] ... [Static shot]` with two beats in one clip) breaks the one-beat rule. Do not copy it; split it into two clips.
5. **Max per bracket**: the cookbook says "2-3" and the docs say "max 3 recommended". The house cap is now 2 per clip in total.
6. **Missing from the cookbook:** no negative prompt (verified), no audio (verified), first-frame file limits, aspect set by the first frame, the 2000-char cap, `prompt_optimizer: true` in our adapter (an untested risk to brackets), and the H3-vs-2.3 mismatch.
7. **Character consistency tricks** are kept (section 7). "Short clips" is now expressed as the beat budget (section 9).
8. The cookbook's 8 storybook examples are dropped (they are not 9:16 cinematic or mechanism shots). Its style guidance is unchanged.
9. **2026-10-05:** the pipeline moved from Hailuo 2.3 (v1) to MiniMax-H3 (v2). The cookbook's model, endpoint and "no last frame" assumptions are all out of date; section 0/0b here is the current reference.

## 12. H3 prompt format from MiniMax's Hugging Face guides (merged 2026-10-05)

Merged from the second vendoring wave (`vps-minimax-h3` and its two examples, `shk-adapter-hailuo`, `h3s-*`) after fetching MiniMax's own pages. Labels here: **[V]** = read on the MiniMax HF guide, HF README or platform page on 2026-10-05; **[S]** = vendored skill citing a vendor page; **[W]** = one unmeasured source. **Nothing in this section has been rendered by us yet.**

### 12.0 What these guides are (read first)

- The two HF guides are titled "Video Prompt Writing Guide (T2VA / I2VA / FL2VA / L2VA)" and "Full-Reference Mode Rewrite Output Format Guide". They describe the **Context Intermediate Representation**: the structured prompt that H3-Base consumes [V].
- The HF README: H3 = **H3-Context-IR** (hosted preprocessing that "may also supplement missing or underspecified semantic details") + **H3-Base** (768p) + **H3-Regenerate-2K**. IR is "critical to the quality of the final output"; it is not open-sourced; the guides are for people building their own IR [V].
- A separate endpoint, `POST https://api.minimax.io/v2/h3_context_ir` (`model: MiniMax-H3`, `content` array, `duration` 4-15 required, optional `ratio`), returns only an enhanced prompt in `content.prompt`; it creates no video and has no skip-rewrite field [V: platform API page].
- **Unknown:** whether our call to `/v2/video_generation` runs IR internally on our free-text prompt. The create docs say nothing [V, absence]. The README's 2K workflow claims to "reproduce the quality of 2K videos generated directly by the MiniMax API" with IR + Base + Regenerate, which implies the hosted API applies IR itself [W: inference]. If so, our free-text prompt is rewritten into this format before generation, and writing in the format mainly makes the rewrite more faithful.

### 12.1 Modes and alignment line [V]

- T2VA (text only), I2VA (image = exact first frame), FL2VA (first + last frame), L2VA (image = exact last frame; the opening is inferred). Our adapter's `first_frame` / `last_frame` roles map to I2VA / FL2VA. Whether the API accepts a `last_frame` alone (L2VA) is not stated on the create page; do not rely on it.
- Keyframe modes start with one alignment line, then one blank line, then the core fields. Exact wording:
  - I2VA: `For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.`
  - FL2VA: `How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot N) aligns with the S.SS-second mark of the target video.`
  - L2VA: `How the reference pictures align with the target video — <Picture 1> (from [Shot N]) aligns with the S.SS-second mark of the target video.`
  - `N` = the final shot number, `S.SS` = effective duration to two decimals.
- Path wording: I2VA = first-frame anchor, action onset, continuous development, result. FL2VA prefers **one continuous shot** and describes the observable intermediate changes until it lands on Picture 2. L2VA = plausible earlier state, then convergence on the image.
- Keep model name, resolution, aspect and API parameter names out of the prose; duration appears only in the alignment line and shot timestamps [S: vps-minimax-h3 compliance list; consistent with our cross-model rules].

### 12.2 Three core fields (base modes) [V]

```
integrated_multimodal_description: [Shot 1] <style>, <initial composition> ...

overall_soundscape: ...

non_diegetic_music: ...
```
- `[Shot 1]` opens with the overall style and initial composition (styles named: Cinematic, live-action, 2D-animated, 3D CG, claymation, watercolor, vintage film). For keyframe modes, derive the style from the image.
- Later shots: `[Shot 2] At 00:03.500, the camera cuts to ...` (MM:SS.mmm, strictly increasing, inside the duration). `[Shot 1]` has no timestamp. Cut only for new subject, space, state, viewpoint or time; for a small distance or angle change, move the camera instead.
- House caution (ours): an in-clip cut multiplies identity risk. Keep one shot per clip (cont-one-action, section 9) until an H3 render proves a cut holds identity.

### 12.3 Sound fields [V]

- `overall_soundscape`: one paragraph of 1-4 English sentences: ambience, physical action sounds, non-verbal human sounds. Never repeat dialogue there. `N/A` only when complete silence is wanted.
- `non_diegetic_music`: 1-3 sentences of audience-only score (instrumentation, tempo, dynamics, no mood words). Music the characters can hear goes in the description. `N/A` when there is no score.
- For us: `non_diegetic_music: N/A` always (we score in Remotion). Soundscape: either a short honest ambience line or `N/A`. Which one gives cleaner picture is untested [W]; we mute the clip either way.

### 12.4 Camera: type + amplitude + speed [V]

- Types: Zoom In/Out (lens), Push In/Pull Out (camera moves), Pan Left/Right, Truck Left/Right, Tilt Up/Down, Pedestal Up/Down, Arc Shot, Tracking Shot, Static Shot, Shake Slightly/Strongly, POV, Roll Clockwise/Counterclockwise.
- Qualifiers: `with small amplitude` / `with large amplitude`, `at slow speed` / `at fast speed`; medium amplitude and normal speed are "usually omitted".
- Write it as a natural action inside the shot, not as trailing labels: "The camera pushes in with small amplitude at slow speed toward the jar." Hold: "The camera holds a static shot as ...".
- The vendored trailer example also uses "medium amplitude", "medium speed" and "zero amplitude at stationary speed" [S: vps-h3-ex-motion-trailer; not in the vendor table, so prefer the table forms].
- Arc on H3 is listed by the vendor but untested by us [W for our use]; whip pan, crane and rack focus are not in the list, so keep faking them in Remotion.

### 12.5 Dialogue, voice-over and visible text [V]

- Speaker IDs `(S1)`, `(S2)` by order of first vocal event; `(S1,S2)` for simultaneous; silent characters get none. Exact words only inside `<d>[English] ...</d>`. Voice-over: `says in an off-screen voiceover`, then state the on-screen character's lips remain closed. `<scenetrans>` for a line crossing a cut, `<cutoff>` for speech cut by the end.
- Visible text goes in English double quotes, verbatim.
- For us: no speech and no readable text in clips (prompt-narration-direction, real-text-counts). The one useful idea is to give a narrated on-screen character a positive closed-mouth fact ("she listens, lips closed") [W for our use].

### 12.6 Open conflict: camera syntax on H3 (resolve by A/B)

- Platform guide: bracket examples `[pan]`, `[zoom]`, `[static]` "directly after key descriptions" [V]. HF guide: natural sentences with amplitude and speed [V]. If the hosted API runs Context-IR (12.0), brackets are probably rewritten into sentences anyway [W].
- Probe (one keyframe, 6 s, 2 takes each): (a) 2.3 bracket form `[Push in] ...`; (b) a free-text sentence in the HF form; (c) the full I2VA format (alignment line + three fields, both sound fields `N/A`). Judge move obedience, move size, identity against the canon frame, and lip/mouth motion. Adopt the winner here and in section 10. Until then, use (b).
- Optional cheap diagnostic: send our prompt to `/v2/h3_context_ir` once and read how it rewrites the camera clause (pricing for that endpoint not checked; check before calling).

### 12.7 Full-reference (r2va) format, for when references are wired [V]

- Six English sections in order: `subject_definitions`, `summary`, `retention_analysis`, `detailed_description`, `overall_soundscape`, `non_diegetic_music`.
- Labels: `<Subject N>` reusable visible content (person, object, place, style, motion); `<Picture N>` a concrete frame or storyboard anchor (an image used only to define a subject is cited inside that subject, not listed alone); `<Video N>` whole-video source for edit, continuation or camera/cut structure; `<Audio N>` copied or referenced audio.
- `summary` opens with a bracketed `+`-joined task list from: keyframe completion, reference generation, video editing, video continuation, audio reuse, audio reference.
- `retention_analysis`, one line per label: visual `fully_preserved | partially_preserved | attribute_transfer | weak_reference`; audio `fully_copy | partially_copy | reference | weak_reference`. This maps onto our cont-reference-roles scale (full / partial / attribute / loose).
- `detailed_description`: style in 1-2 sentences before `[Shot 1]`; 350-500 English words for generation tasks.
- API limits for references are in section 0b; references and first/last frame cannot be combined in one request [V].
- Cross-style performance transfer (a live-action performance driving an illustrated character) is in `vps-h3-ex-performance-transfer`; irrelevant while narration is TTS and characters are animated in Remotion.

### 12.8 Second-wave claims kept at their labels

- shotkit Hailuo 02 Pro: 60-120 words; camera sentence leading (agrees with our camera clause rule); "draft on Hailuo, re-roll the keeper on Kling/Veo/Seedance" is a vendor workflow opinion, not adopted (one wired provider) [W].
- ai-film-crew: brackets work only "if your interface documents them"; plain moves otherwise [W: afc-ref-model-prompting]. Consistent with 12.6.
- phileiny/h3-storyboard (measured by its author on local H3 Ref2VA, not on the MiniMax API): beat budget (section 9), PSNR frame-identity checks, and "naming an unwanted object anywhere summons it" (now in the prompt-stale-text-sweep card) [S for H3, W for 2.3]. Its SOURCES grades each rule verified / partly verified / inferred; use those grades when citing.

### 12.9 Example (original, I2VA format, 6 s, untested on our renders)

Keyframe: a glass jar of water on a plain table, a beam of white light entering from the left.
```
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] Live-action, cinematic, the glass jar of water shown in <Picture 1> stays centred on the plain table, preserving the beam of white light entering from the left and the cool backdrop. The camera holds a static shot as the water slowly glows pale blue from the inside, the colour spreading from left to right while tiny bubbles drift upward. It ends with the whole jar evenly blue and still.

overall_soundscape: N/A

non_diegetic_music: N/A
```
