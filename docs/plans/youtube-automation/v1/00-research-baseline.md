# Video pipeline plan (short-form, story + explainer)

Status: PLAN ONLY. Nothing built. Uncommitted by project rule.

## Goal
One command turns a topic (plus optional sponsor) into a reviewed 9:16 Short and a carousel,
at near-zero marginal cost, with every external model/API swappable behind an adapter.

## Principles
1. **Reuse, don't write.** Copy specific files/prompts from MIT repos into `video-pipeline/vendor/`
   (keep each repo's LICENSE + a `SOURCE.md` with repo URL, commit, files copied). No submodules, no forks.
2. **Adapters everywhere.** Config-selected backends, ViMax style:
   `class_path` + `init_args` in YAML. Swapping a provider = edit YAML (or add one small adapter file).
3. **Heavy work is hosted.** Local machine only runs Remotion + FFmpeg (light). LLM/voice/clips/STT are APIs.
4. **Human gates before spend.** Storyboard approval before paid clips; final approval before publish.
5. **Cache per scene.** Resume after failure without re-paying for clips/voice.

## Adapter interfaces (the only code we truly own)
| Interface | First backend | Swap candidates |
|---|---|---|
| `LLM.generate_json(prompt)` | Claude Code (script/direction) ; MiniMax M3 for bulk | Gemini, OpenRouter |
| `TTS.speak(text, voice_id) -> wav + word timings` | MiniMax Speech | Fish Audio, ElevenLabs, Gemini TTS, Kokoro |
| `STT.align(wav) -> word timestamps` | TTS-provided timings, else hosted Whisper | Groq Whisper, whisper.cpp |
| `ImageGen.generate(prompt, refs[]) -> png` | MiniMax image (verify) | Gemini image, GPT Image |
| `VideoGen.animate(image, prompt, secs) -> mp4` | MiniMax video / Hailuo (verify) | Higgsfield API, Seedance, Veo |
| `Music.pick(mood) -> mp3` | local royalty-free folder | MPT bgm.py logic |
| `Stock.search(query) -> clips` | Pexels/Pixabay | none needed |
| `Publisher.publish(video, meta)` | Postiz (hosted or self-host) | Upload-Post, Graph API direct |

Config: `video-pipeline/config/providers.yaml` selects the class per interface. Keys via env only.

## Components to borrow (from what I could verify)
| Need | Source | Take |
|---|---|---|
| Adapter/config pattern | HKUDS/ViMax `interfaces/`, `tools/`, `configs/*.yaml` | the class_path loader + generator tool shape |
| Storyboard + camera planning, character consistency, keyframe candidate selection | ViMax `agents/`, `prompts/`, `pipelines/` | prompts and stage structure, adapted for 45 s story+explainer |
| MiniMax video generator | ViMax `tools/` (roadmap lists MiniMax H3 support; confirm file name when we read the code) | copy as `VideoGen` adapter |
| Subtitles, assembly, bgm mixing | harry0703/MoneyPrinterTurbo `app/services/subtitle.py`, `video.py`, `bgm.py`, `voice.py` | functions only; skip its web UI/state |
| Fact-check/source-link gate, analytics loop | AgentTube (darkzOGx/youtube-automation-agent) | prompt wording + the idea; later |
| Animated scenes + carousels | Remotion (local) | our own small template set, rendered via CLI |
| MiniMax API conventions | this repo `worker/src/llm/providers/minimax.ts` (base `https://api.minimax.io/v1`, `MINIMAX_API_KEY`) | reuse key/env naming |

## Licensing check
- Remotion: free for individuals and teams up to 3 people (incl. commercial); automation per-render fees apply
  only to larger companies. Re-verify at start and if the team grows.
- ViMax and MoneyPrinterTurbo: MIT. AgentTube: MIT. Keep notices.
- MiniMax Speech is free "for now": treat as promotional; adapter makes switching a one-line change.

## Episode data model (direction layer)
- `style_bible.yaml` per series: palette, fonts, motion style, character reference images, music mood, transitions.
- `episode.json`: ordered `scenes[]`, each:
  `beat` (story_hook | explainer | payoff | cta), `narration`, `duration`, `visual`
  (`remotion:<template>+props` | `clip:<prompt+ref>` | `stock:<query>`), `camera`, `on_screen_text`,
  `sponsor_beat: bool`.
- Rules baked into the director prompt: hook in 2 s, visual change every 2-3 s, one idea per scene,
  sponsor shown as part of the story, closing takeaway, disclosure line when sponsored.

## Phases and acceptance criteria
**Phase 0 (half day) - verify unknowns, no building**
- Confirm MiniMax key works for: speech (+ voice clone), image, video. Record endpoints, prices, limits.
- Read ViMax `tools/` + `prompts/` and MPT services; list exact files to copy.
- Accept: a table of verified endpoints + file list.

**Phase 1 - voice + one scene end to end**
- Record 30 s voice sample; clone via MiniMax Speech; generate narration with word timings.
- Remotion project in Docker: kinetic captions template + one explainer template.
- Accept: 15 s clip with your voice and animated captions, one command.

**Phase 2 - full episode**
- Director agent (Claude Code skill) -> `episode.json`; storyboard contact-sheet preview for approval.
- 3-4 story clips via ImageGen -> VideoGen; explainer scenes via Remotion; assemble with FFmpeg.
- Accept: 45-60 s Short, approved storyboard before any paid clip, scene cache works on rerun.

**Phase 3 - carousel + publish**
- Remotion `renderStill` carousel from the same episode.json.
- Postiz for YouTube Shorts + Instagram Reels (+ LinkedIn). Review stays in LinkedInPost dashboard or Postiz queue.
- Accept: one episode -> Short + Reel + carousel posted as drafts.

**Phase 4 - optimize**
- Retention/analytics review, template tuning, sponsor field + disclosure, second backend swap test
  (e.g. TTS -> Fish Audio) to prove the adapters.

## Cost envelope
- Fixed: Claude subscription (existing). Remotion/FFmpeg/Docker: $0.
- Per episode: voice about $0.01-0.04 when not free; clips = main cost (3-4 clips; price TBD in Phase 0).

## Risks
- MiniMax video/image endpoint or clone feature may be unavailable on the current plan -> adapter fallback.
- Character consistency across clips is the hard quality problem; mitigate with reference image + keyframe selection.
- Unattended Claude Code runs can hit subscription limits; keep human-triggered.
- YouTube inauthentic-content policy: keep human-directed variation, own voice, original framing; label synthetic media; disclose sponsors.

## Open decisions for the owner
1. Series/topic for the first sample episode.
2. Voice: clone own voice (needs 30 s sample) or preset.
3. Publishing: hosted Postiz vs self-hosted.
4. Location: `video-pipeline/` inside this repo (assumed) vs separate repo.
