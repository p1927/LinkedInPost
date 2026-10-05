# R1 Reuse register (what we take from other repos, and how)

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Date: 2026-10-06 · Source: five read-only surveys of `video-pipeline/vendor/*`, `reference/*`, `direction/skills/vendor/*`, plus module research. Each layer plan cites these IDs.

**Honesty:** the surveys read file lists, headers and a few file heads, not full bodies. Every row is "worth a look", not "verified to work". Each work package (WP) starts by opening the file and running it on one real input before anything depends on it. Overlap claims were made by quick grep; confirm before copying.

## Modes
- **MODULE**: install the package, call it. No code of ours beyond a thin call site.
- **COPY**: copy the file(s) into `video-pipeline/third_party/<repo>/` with its LICENSE and a NOTICE line, then call it. Strip telemetry/network/config coupling only.
- **TEXT**: rubric/checklist/numbers copied into our `direction/craft/*.yaml` cards or prompts, reworded. Facts and numbers are free; wording of AGPL/NC sources is not copied.
- **CONCEPT**: idea only; we write our own small code (also used when the file is too coupled to its stack to be worth untangling).

## Code policy: copy before writing (owner direction 2026-10-06: our own code is tech debt)
Order of preference for every need: **COPY** a file from a cloned repo, then **MODULE** (pip/npm package), then a **thin wrapper** (under about 100 lines) around either, and only then **WRITE**. A work package that writes more than about 100 lines must first record here which copy/module option it checked and why it failed. The only code we own by design is glue that is specific to our contracts (see 01-MASTER-DESIGN section 8b).

## Licence policy (owner decision 2026-10-06)
Personal, non-commercial use: licences do not block copying from any cloned repo, including OpenMontage (AGPL) and 3b1b-videos (non-commercial). Keep each source's LICENSE next to the copied files in `third_party/` as housekeeping. Any row marked CONCEPT only because of its licence may instead be COPY when copying is cheaper than rewriting. Revisit only if the project is published or monetised (AGPL network clause, non-commercial model weights, Remotion company licence). HyperFrames' CLI and `skills update` are still not run (they phone home and modify skills), which is a safety rule, not a licence rule.

## Register
IDs are stable; layer plans reference them.

### Transcription, timing, audio (layers T1, A1)
| ID | Feature | Source path / package | Mode | Layer |
|---|---|---|---|---|
| R-01 | Local ASR with word timestamps, English | `parakeet-mlx` (Apache-2.0, 0.5.3 on 2026-10-01; token-level times, assemble words) | MODULE | T1 |
| R-02 | Ready CLI wrapper around Parakeet with whisper.cpp fallback, emits `{text, words[{text,start,end}]}` | HF `skills/media-use/scripts/transcribe.mjs` + `lib/parakeet-words.mjs` | COPY (strip telemetry) or just use R-01 | T1 |
| R-03 | Other-language ASR (Hindi etc.) | `mlx-whisper` | BACKLOG (current languages only) | T1 |
| R-04 | Forced alignment of known script to audio | `ctc-forced-aligner` | BACKLOG (not needed while TTS gives word times) | T1 |
| R-05 | Subtitle correction vs script (similarity/levenshtein) | MPT `app/services/subtitle.py` | COPY the correction logic only | T1 |
| R-06 | WER between audio transcript and script | `jiwer` (not verified) | MODULE | T1 / L6 |
| R-07 | Caption grouping rules (1 group = 1 clause/breath) | HF `embedded-captions/references/caption-grouping.md` | TEXT | L8 |
| R-08 | Loudness measure + normalise | ffmpeg `ebur128`, `loudnorm` (already used) | MODULE (have) | A1 |
| R-09 | Auto-ducking | ffmpeg `sidechaincompress` driven by voice track; HF `audio-duck` lib as parameter reference (`--duck 0.25 --attack 0.15 --release 0.4`) | MODULE + TEXT | A1 |
| R-10 | Audio levels and EQ numbers (dialogue -16..-14 LUFS, music 18-20 dB under, duck 6-12 dB, TP -1.5, whoosh 10-20 ms early) | OpenMontage `sound-design.md` numbers; HF `hyperframes-audio/references/presets.md` | TEXT (numbers only) | A1 |
| R-11 | Beat grid for cut-on-beat | HF `music-to-video/scripts/analyze-beatgrid.py`; `librosa` (py3.14/numba unverified) | COPY + MODULE | A1 / M1 |
| R-12 | Music level logic | HF `faceless-explainer/scripts/lib/bgm-volume.mjs` | TEXT | A1 |
| R-13 | ~~Local TTS (Kokoro, chatterbox)~~ | MPT `app/services/voice.py` | REJECTED: machine too small (owner 2026-10-06). Draft voice, if needed, is macOS `say` (no model) | L7 |
| R-14 | ffmpeg post-production gotchas: concat filter not demuxer (silent truncation), probed durations, picture-only fades, two-pass loudness | ai-film `references/postproduction.md` | TEXT -> audit L8 assemble | L8 / A1 |

### Frame QA and design (layers F1, D1)
| ID | Feature | Source | Mode | Layer |
|---|---|---|---|---|
| R-20 | Contrast against real pixels behind text; magenta/yellow/green overlay; exit 1 on fail | HF `hyperframes-creative/scripts/contrast-report.mjs` (needs `@hyperframes/*` + HTML runtime, cannot run as is) | CONCEPT: port technique to Remotion `still` + DOM walk | F1 |
| R-21 | WCAG ratio maths | `coloraide` (have); HF `scripts/contrast.ts` | MODULE (have) | D1 / F1 |
| R-22 | APCA (better polarity model for light-on-dark) | npm `apca-w3` (no PyPI) | MODULE advisory only; WCAG 4.5 stays the gate | D1 |
| R-23 | Colour-blind simulation | `coloraide` CVD (verify), else `daltonlens` (stale) | MODULE | D1 |
| R-24 | Luma/brightness profile, scene-change jump, black/freeze, clipping | ffmpeg `signalstats`, `scdet`, `blackdetect`, `freezedetect`, `entropy` (all present, ffmpeg 8.0.1) | MODULE (have) | F1 |
| R-25 | Flash limit (WCAG 2.3.1: <=3 flashes/s) | no good checker found; ffmpeg `photosensitivity` filter unverified; custom counter on per-frame `YAVG` | CONCEPT (small script) | F1 |
| R-26 | Text boxes in a still, cross-check vs DOM | macOS Vision via `pyobjc-framework-Vision` or `ocrmac` (Hindi unconfirmed) | MODULE, cross-check only | F1 |
| R-27 | Seam/transition continuity gate | HF `.agents/skills/motion-doctrine/scripts/seam-gate.mjs` | COPY (Node script), run via subprocess if it runs standalone | F1 |
| R-28 | Pre-render composition validator (assets exist, narration vs video length, cut order) | OpenMontage `composition_validator.py` | COPY, try as is; wrap if it needs OpenMontage `base_tool` | L6 / L8 |
| R-29 | Scene pacing vs narration cue times | OpenMontage `verify_scene_pacing.py` | COPY, try as is; wrap if it needs OpenMontage `base_tool` | L6 |
| R-30 | Caption-vs-face brightness/occlusion, transition similarity | OpenMontage `visual_qa.py` | COPY, try as is; wrap if it needs OpenMontage `base_tool` | F1 |
| R-31 | Video-medium composition rules (no full-screen linear gradients on dark: H.264 banding; thin hairlines vanish; light canvas needs 2px+ borders and grain; accent 15-25% atmospheric) | HF `hyperframes-creative/references/video-composition.md` | TEXT | D1 |
| R-32 | Best-of-N image judge (VLM) | ViMax `agents/best_image_selector.py`, `utils/image_selection.py` | COPY or CONCEPT | F1 / L7 |
| R-33 | Visual-asset critic rubric | shotkit `visual-asset-critic/references/critique-rubric.md` | TEXT (open LICENSE first) | F1 / L6 |

### Motion and scene vocabulary (layer M1)
| ID | Feature | Source | Mode | Layer |
|---|---|---|---|---|
| R-40 | Text measure/fit (stop overflow; replace estimated widths) | `@remotion/layout-utils` | MODULE | M1 / L5 |
| R-41 | Hand-drawn underline/circle/highlight emphasis | `@remotion/rough-notation` | MODULE | M1 |
| R-42 | Light leak overlay; motion blur; effects | `@remotion/light-leaks` (skill says `lightLeak` in effects), `HtmlInCanvasMotionBlur`, `@remotion/effects` (WebGL, needs `angle` GL config) | MODULE, test in Docker renderer | M1 |
| R-43 | Remotion rule files: timing, transitions, sequencing, measuring-text, voiceover, silence-detection, sfx, text-highlights, captions | `vendor/remotion/packages/skills/skills/remotion-markup/*.md`, `remotion-captions/*.md`, `remotion-create/video-layout.md` | TEXT: required reading in director/episode skill | M1 / L8 |
| R-44 | Easing/spring tokens, entrance recipe, anti-slop motion checklist | `docs/research/video/10-*.md` section 3.4, haidrrrry skill, Remocn craft docs | TEXT -> `tokens.yaml` | M1 / D1 |
| R-45 | Numberline/axes/area/tracker extension of `chart` | manim `number_line.py`, `coordinate_systems.py`, `value_tracker.py` | CONCEPT | M1 |
| R-46 | Morph/transform scene (matched parts crossfade) | manim `transform.py`, `transform_matching_parts.py` | CONCEPT (staged-reveal approximation) | M1 |
| R-47 | Indicate/flash/focus attention cues | manim `indication.py` | CONCEPT | M1 |
| R-48 | Proportion / probability box scene | manim `probability.py` | CONCEPT | M1 |
| R-49 | Shader transitions, bar-chart-race, flowchart blocks | HF `registry/blocks/*` (HTML/GSAP) | CONCEPT, port 1-2 | M1 |

### Story, script, review rubrics (layers L1, L3, L4, L6)
| ID | Feature | Source | Mode | Layer |
|---|---|---|---|---|
| R-60 | Director output contract (logline, intent, beats as visible events, one idea, muted-legible hook) | ai-film-crew `roles/director.md` | TEXT | L3 |
| R-61 | Beat direction (concept, mood, choreography, transition, SFX per beat) | HF `hyperframes-creative/references/beat-direction.md` | TEXT | L3 / L5 |
| R-62 | Story spine, narration rules, data-in-motion | HF `story-spine.md`, `narration.md`, `data-in-motion.md` | TEXT | L3 / L4 / L5 |
| R-63 | Faceless explainer story design + cut catalog | HF `skills/faceless-explainer/references/story-design.md`, `cut-catalog.md` | TEXT | L3 |
| R-64 | Explainer beat frameworks with timing splits | shotkit `storyboard-architect/references/beat-frameworks.md` | TEXT | L3 |
| R-65 | Worked-example-first, intuition before notation | 3b1b-videos (study) | CONCEPT | L3 |
| R-66 | Hook pass/fail checklist | content-skills `viral-hooks/assets/hook-checklist.md` | TEXT -> L6 rubric | L6 / L3 |
| R-67 | Weak-hook upgrade steps | content-skills `hook-tactics.md` | TEXT -> L4 repair | L4 |
| R-68 | Slideshow-risk score (6 dims, 0-5, hard fail at >=4) | OpenMontage `lib/slideshow_risk.py` | COPY as is (`slideshow_risk.py`, stdlib-only imports confirmed) | L6 |
| R-69 | Variation check + generic-phrase blacklist | OpenMontage `lib/variation_checker.py` | COPY as is (`variation_checker.py`, stdlib-only imports confirmed) | L6 / L4 |
| R-70 | Reviewer CHAI rules (Accurate, Complete, Constructive) | OpenMontage `skills/meta/reviewer.md` | TEXT: three rules into verify/story-editor prompts | L6 |
| R-71 | Script-supervisor checklist (continuity, feasibility, unslop; veto; terse output) | ai-film-crew `roles/script-supervisor.md` | TEXT | L6 |
| R-72 | Delivery-promise lock (classify promise, stop instead of silently downgrading) | OpenMontage `lib/delivery_promise.py` | COPY as is (`delivery_promise.py`, stdlib-only imports confirmed) | L1 / L6 |
| R-73 | Robust LLM JSON parsing (trailing commas), retry, rate limit | ViMax `utils/robust_json_parser.py`, `retry.py`, `rate_limiter.py` | COPY (pulls langchain: untangle) | L4 / X1 |

### Research, publish, ops (layers L2, L9, X1, X2)
| ID | Feature | Source | Mode | Layer |
|---|---|---|---|---|
| R-80 | Stock material search/download/cache with source records | MPT `app/services/material*.py` | COPY if b-roll wanted | L2 / L7 |
| R-81 | Idea mining (comments, autocomplete, outliers) | content-skills `viral-short-form-ideas/references/mining.md` | TEXT | L1 / L2 |
| R-82 | YouTube metadata limits validator (title 100, description 5000, tags 450, dedupe) | youtube-automation-agent `utils/youtube-metadata-validator.js` | CONCEPT (~60 lines Python) | L9 |
| R-83 | Retention-curve to per-scene learning; refuses simulated data | youtube-automation-agent `scene-retention-engine.js` | CONCEPT | L9 |
| R-84 | Metrics honesty (saves/completion over views); Shorts to long-form funnel | content-skills refs | TEXT | L9 |
| R-85 | Cost ledger: estimate / reserve / reconcile, cost_log.json | OpenMontage `tools/cost_tracker.py` | COPY, try as is; wrap if it needs OpenMontage `base_tool` | X1 |
| R-86 | Provider scoring/selection | OpenMontage `lib/scoring.py`, `tts_selector.py` | CONCEPT (low urgency) | X1 |
| R-87 | Audit trail: content hashes on inputs and reviewed frames | shotkit `docs/audit-trail-pattern.md` | TEXT | X2 |
| R-88 | Checkpoint/approval protocol | OpenMontage `checkpoint-protocol.md` | COPY idea only if our per-layer JSON proves insufficient | X2 |

### Research (layer L2), from Trade (copy files, never import the package)
| ID | Feature | Source (under `Trade/integrations/trade_integrations/`) | Mode | Layer |
|---|---|---|---|---|
| R-90 | BrowserOS MCP client (open page, run JS, search) | `browser_research/browseros_client/client.py` (271 lines, `httpx`, `BROWSEROS_MCP_URL`), optional `probe.py` | COPY | L2 |
| R-91 | Record-only honesty prompt ("a fabricated record is worse than an honest failure") | `browser_research/prompts/record_only.py` (70 lines, text; reword to drop Trade tool names) | COPY + reword | L2 |
| R-92 | Two-source number check (`verify_scalar`) | inside `dataflows/web_search_client.py:824` (cannot be copied alone) | REWRITE, about 40 lines | L2 / L6 |
| R-93 | MiniMax web search client | `dataflows/web_research/internal/minimax_client.py` | ALREADY PORTED in `adapters/news_web.py` | L2 |
| R-94 | Steel scrape client | `browser_research/backends/steel_backend.py` | ALREADY PORTED in `adapters/web_fetch.py` | L2 |
| R-95 | Fetch chain, search aggregator, crawl4ai engine | `browser_research/chain.py`, `dataflows/web_search_client.py`, `crawl4ai_engine.py` | NOT COPIED (tied to Trade internals); chain rebuilt in `web_fetch.py` | L2 |
Hazard: `trade_integrations/__init__.py` loads Trade's `.env` on import; only copy files out.

### Added in the code-reuse review (2026-10-06): modules that replace code we planned to write
| ID | Feature | Source / package | Mode | Layer |
|---|---|---|---|---|
| R-96 | Audio mixer with ducking, fades, normalisation (ffmpeg, optional pydub) | OpenMontage `tools/audio/audio_mixer.py` (775 lines; imports OpenMontage `tools.base_tool`, so copy with a small stub or lift its ffmpeg graph) | COPY + stub | A1 |
| R-97 | Remotion lint rules (`non-pure-animation`, `deterministic-randomness`, `slow-css-property`, `no-from-0`, `volume-callback`, `staticfile-*`, `warn-native-media-tag`) | `vendor/remotion/packages/eslint-plugin` (official) | MODULE (ESLint flat config in `remotion-app`); replaces our planned `check_motion.py` | M1 |
| R-98 | Readability grade of narration (measurable plain-language target per audience) | `textstat` (pip; not verified on this machine) | MODULE | L6 / G1 |
| R-99 | File-based task runner with md5 dependency caching and parallel execution, as the DAG runner | `doit` (pip) vs stdlib `concurrent.futures` + our `cache.py`: decide by a one-hour spike, take whichever needs fewer new lines | MODULE (evaluate) | X1 |
| R-100 | Word timestamps JSON straight from the Parakeet CLI (`parakeet-mlx` writes SRT/VTT/JSON) | `parakeet-mlx` CLI | MODULE; our wrapper only reshapes tokens to words (about 20 lines) | T1 |
| R-101 | 14 format definitions with beats and word budgets; 5 craft modes (explainer, cold-open-drama, hybrid, montage, documentary); load-map routing | our own `direction/format_catalog.yaml`, `direction/craft/modes.yaml`, `direction/craft/routing.yaml` | EXISTING: the genre packs (G1) are a mapping over these, not new engines | G1 / L3 |

## Not taking (and why)
Local TTS (Kokoro, chatterbox, VoxCPM) and any local generation model: machine budget (14 GB free disk). OpenMontage provider wrappers/avatars/capture (we use MiniMax); MPT MoviePy assembly (we render with Remotion); ViMax fiction/character pipeline and benchmark briefs (not explainers); youtube-automation-agent generic LLM role prompts, thumbnail agent, upload/OAuth (we have publishers); HyperFrames HTML runtime, CLI, 26 caption themes, 173 blocks (HTML/GSAP, re-implementation cost); madmom, WhisperX (Python 3.14 unsupported), torchaudio forced_align (deprecated), `wcag-contrast-ratio` (2015).

## Environment facts that constrain reuse
- `.venv` runs **Python 3.14.0**. parakeet-mlx/MLX, WhisperX, rapidocr and librosa/numba wheels for 3.14 are unverified. Plan: a second venv `.venv-asr` on Python 3.12 via `uv` for ASR/librosa/OCR tools, called by subprocess, so the frozen `requirements.txt` is untouched.
- ffmpeg 8.0.1 already has ebur128, loudnorm, sidechaincompress, signalstats, scdet, blackdetect, freezedetect, entropy, bitplanenoise, photosensitivity. Most of F1 and A1 needs no new dependency.
- No PIL in `.venv`; use ffmpeg raw frames + numpy.
