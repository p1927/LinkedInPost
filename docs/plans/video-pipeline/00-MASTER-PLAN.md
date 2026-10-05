# Video Pipeline Master Plan

Date: 2026-10-06 (rev 3, same day) · Status: PLAN, awaiting owner approval · Supersedes as the entry point: `docs/plans/youtube-automation/MASTER-PLAN.md` (v1 history, kept)
One-page summary of everything: [HIGH-LEVEL-PLAN](HIGH-LEVEL-PLAN.md) (start there).
Documents: this file = index, sequencing, rules. [01-MASTER-DESIGN](01-MASTER-DESIGN.md) = how the system is designed (contracts, components, control, variety). [R1](R1-reuse-register.md) = every component taken from other repos. [BACKLOG](BACKLOG.md) = improvements deferred until the layers are set up.
Rule for this folder: this file is the index. Each processing layer has its own child plan with the same sections: **Have / Others have / Want / Flaws found / Work items / Acceptance / Depends on / Open questions**. Nothing here is built until the owner approves a child plan.
Rev 5: Slice 1 (explainer first), new plans S1, E1, C1, V1, risk and mitigation sections in every plan, reasoning-off plan for MiniMax (X1). Rev 4 (review): code-reuse audit (several 'write our own' items flipped to copy/module), new layer G1 (genre packs), distinctness and understandability design (01-MASTER-DESIGN 6b), glue register (8b). Rev 3 (owner feedback): licences are not a concern (personal use), no local TTS, plans only, setup of every layer first and improvements to the backlog, current languages only. Rev 2 added: five new layers (D1 design, M1 motion, A1 audio, T1 transcription, F1 frame QA), the reuse register ([R1](R1-reuse-register.md)), a parallel execution graph (section 4), and parallel setup waves (section 6). Earlier detail in `docs/plans/youtube-automation/DESIGN-LAYERS-AND-TOOLING-PLAN.md` is folded in here.

## 1. Why this plan exists
The ep24 run (2026-10-05, real `run.py director`, 101 minutes) failed its own QA with 6 errors: the brief was rewritten ("1 October" became "5 October"), none of the three brief questions was answered, the story used a forced cooking analogy, no data scene was used, and 7 of 10 research pages had no text. The gates caught the failure, but nothing upstream could have prevented it. Cause: strong gates at the end, almost no processing layers at the front, and no checks on the rendered pixels or the audio. Gates are not quality (memory: `feedback_gates_not_quality`). The fix is to build the layers that produce a good video, in order, each with its own evidence, reusing existing code and rubrics instead of writing new code.

## 2. The owner's goals (stable)
1. A video answers the owner's brief, in order, and explains each concept before using it.
2. Every video has its own look and elements, chosen from the kind of information. Audience sets constraints only.
3. Research is real: web search + page reading + real data. No hand-built per-site adapters.
4. Free and local where possible; paid stages only after approval; nothing is published without explicit approval.
5. **Reuse, do not rewrite**: copy files or install modules from the repos we cloned, as catalogued in R1, from any repo (personal use). Our code is thin glue, rubrics and gates.
6a. **More control, less sameness**: every episode's look, scene mix, motion personality and sound mood come from its information and from owner-visible knobs, and checks reject the 'template' look (see 01-MASTER-DESIGN sections 5 and 6).
6. Fixes apply to all future videos, not one episode.
7. Layers that do not depend on each other run in parallel.

## 3. The layers
Pipeline layers (L, in data order), the new quality layers (D, M, A, T, F) and cross-cutting (X, R).

| Layer | Plan | Purpose | State today | Main reuse (R1 IDs) |
|---|---|---|---|---|
| **S1** | [Spikes and environment](S1-spikes-and-environment.md) | Prove each reused component before depending on it | Not started | R1 |
| **E1** | [Evaluation and reference episode](E1-evaluation-and-reference-episode.md) | Outcome measures, reference episode, check precision | Not started | R-83, R-84, R-87 |
| **C1** | [Compliance and rights](C1-compliance-and-rights.md) | Finance rules, claim ledger, media rights record | Partial | R-91, R-92 |
| **V1** | [Versioning and migration](V1-versioning-and-migration.md) | Contract versions, old-episode compatibility, retirement | Not started | R-87 |
| **G1** | [Genre and format packs](G1-genre-and-format-packs.md) | Pick explainer / story / concept / data / documentary; sets structure, pools and gates | Pieces exist, no selector | R-101 (our own catalog, modes, routing) |
| L1 | [Intake and brief](L1-intake-and-brief.md) | Owner request to locked structured brief | Partial | R-72 delivery promise, R-81 idea mining |
| L2 | [Research](L2-research.md) | Per-question sources, facts, data series | Weak | Trade ports (existing plan), R-80 stock search |
| L3 | [Story design](L3-story-design.md) | Outline: question order, terms before use, visual type per beat | Missing | R-60 director contract, R-61..R-65 beat/story rules |
| L4 | [Script authoring and repair](L4-script-authoring-and-repair.md) | Write scenes from outline; targeted repair | Exists, slow | R-62 narration, R-67 hook upgrade, R-73 robust JSON/retry |
| L5 | [Visual direction and identity](L5-visual-direction-and-identity.md) | Per-episode identity, storyboard | Built, partial coverage | via D1 and M1 |
| **D1** | [Design system: tokens, colour, brightness, elements](D1-design-system-colour-brightness.md) | One token file; colour/brightness/element rules enforced | Spec only | R-21..R-23, R-31, R-44, R-68 |
| **M1** | [Motion and scene vocabulary](M1-motion-and-scene-vocabulary.md) | Installed Remotion packages, new scene types, motion lint | Partial | R-40..R-49 |
| **T1** | [Transcription and timing](T1-transcription-and-timing.md) | ASR, audio-vs-script check, caption grouping | Missing | R-01..R-07 |
| **A1** | [Audio design and mix](A1-audio-design-and-mix.md) | Ducking, SFX map, music/beat, loudness | Loudness only | R-08..R-12, R-14 |
| L6 | [Quality gates](L6-quality-gates.md) | Gates at every layer, unified report | Strong, late | R-66, R-68..R-71, R-28, R-29 |
| **F1** | [Rendered-frame QA](F1-rendered-frame-qa.md) | Contrast, brightness, flash, overflow, seams on real pixels | Contact sheet only | R-20, R-24..R-27, R-30, R-32, R-33 |
| L7 | [Asset generation](L7-asset-generation.md) | TTS, images, clips, music | Built, paid only | R-13 free TTS, R-32 image judge |
| L8 | [Render and packaging](L8-render-and-packaging.md) | Remotion render, captions, thumbnail, packaging | Built, partial | R-14, R-28, R-43 |
| L9 | [Publish and analytics](L9-publish-and-analytics.md) | Private upload, analytics, learning | Code done, not live | R-82..R-84 |
| X1 | [Operations](X1-operations-models-speed-observability.md) | Model routing, speed, cost, observability | Live runs built | R-73, R-85, R-86 |
| X2 | [Testing and E2E proof](X2-testing-and-e2e-proof.md) | Golden briefs, replay, regression | Missing | R-87, R-88 |
| R1 | [Reuse register](R1-reuse-register.md) | Every item taken from other repos: source, mode, where it plugs in | New | all |
| B | [Backlog](BACKLOG.md) | Improvements per layer, deferred until setup is complete | New | all |

## 4. Execution graph (what runs in parallel)
Every arrow is a file on disk, so each step can be run, inspected, cached and replayed alone. Boxes in the same row run concurrently.

```
S0  owner request
S1  L1 brief.json                                   [serial]
S2  L2 research.json  (one worker per brief question; fetch/read pages in parallel)
S3  L3 outline.json                                 [serial]  -> OWNER APPROVES OUTLINE (human gate)
S4  fan out from the approved outline:
      lane TEXT    : L4 script write -> L6a script gates (lint | claim_support | analogy | comprehension | story editor run in parallel)
      lane DESIGN  : L5 identity -> D1 palette/brightness/element lint -> M1 scene choice per beat -> storyboard (+ slideshow-risk score)
      lane SOUND   : A1 music bed pick (mood/BPM from outline) + beat grid
      lane ASSETS* : L7 free prep: stock/image candidates keyed on the outline (*optional)
S5  join: script passes gates AND design passes lint -> OWNER APPROVES SCRIPT (human gate)
S6  L7 TTS per scene (scenes in parallel; paid -> approval)         
S7  fan out from the audio:
      T1 transcribe + audio_matches_script | A1 voice QA + mix (duck, SFX map, loudnorm) | L7 images/clips (paid, parallel per scene)
S8  L8 preview render (low-res)  ->  F1 frame QA  (sub-checks in parallel: contrast | brightness | flash | overflow | safe zone | banding | seams | audio)
S9  join: F1 + A1 + T1 + L6b gates -> unified gate_report.json -> OWNER REVIEWS PREVIEW (human gate)
S10 L8 full render (Remotion chunks rendered in parallel) + packaging + thumbnail + carousel; F1 re-run on final
S11 OWNER APPROVES -> L9 private upload -> analytics
```

Parallelism rules:
- A lane never writes a file another lane reads in the same step (separate outputs: `script.json`, `identity.json`, `storyboard.json`, `audiomap.json`).
- Joins are explicit gates (S5, S9), so a late lane cannot silently be skipped.
- Within a step, independent checks use a thread/process pool; LLM verifiers run concurrently with a rate limiter (R-73).
- Cost-incurring steps (S6 TTS, S7 images/clips) never start without the approval at S5.

## 5. Cross-cutting rules
- **Plans first**: nothing in this folder is built until the owner approves it. This revision is documents only.
- **One owner per concern**; extend existing files, no parallel schemas (`DIRECTOR-AND-VARIETY-PLAN.md` section 8).
- **Brief integrity**: the owner's question wording is stored once in `brief.json` and re-applied after every LLM call; selfcheck fails if any stage changes it.
- **Fail loudly upstream**: if research cannot support a question, stop and say so.
- **Layers are individually runnable and cached** (`run.py research|outline|write|design|audio|frameqa ...`), outputs hashed (R-87).
- **Human gates**: outline approval, script approval, preview review, publish confirmation. New checks (F1, A1, T1, D1) start advisory, then become blocking one by one.
- **Code policy: copy before module before wrapper before write.** Our own code is tech debt. A work package that would write more than about 100 lines must first record in R1 which copy or module option it checked and why it failed. The allowed glue is listed in 01-MASTER-DESIGN 8b.
- **Reuse before writing (personal-use policy)**: this is a personal, non-commercial project (owner decision 2026-10-06), so licence is not a blocker: any file from any cloned repo may be copied. Copy into `video-pipeline/third_party/<repo>/` unmodified with its LICENSE as housekeeping, then call it through a thin wrapper of ours. Copy when that costs less than rewriting; if untangling a file costs more, take the idea and write the small part. If the project is ever published or monetised, revisit (AGPL, non-commercial model weights, Remotion company licence).
- **Machine budget**: see section 6. No local TTS, LLM, image or video generation. Local compute is limited to ffmpeg, numpy, headless Chrome (Remotion) and at most one small ASR model.
- **Languages**: only the languages we already produce (English narration). Other languages are in [BACKLOG](BACKLOG.md).
- **Secrets**: never import Trade's package; port code, read keys from this project's own env.
- **No git commits or worktrees by the agent**; work on `main`.
- **Honest reporting**: verified (ran, frames viewed, test output) separated from unverified. R1 rows are leads until a work package opens and runs the file.
- **File ownership**: uncommitted edits already exist in `verify.py`, `lint.py`, `director.py`, `storyboard.py`, `Episode.tsx`, `types.ts`; only one work package edits each at a time, and the owner is asked before the first edit.
- **Improvements go to the backlog**: setup first. Anything that makes a layer better than "set up and working" is written in [BACKLOG](BACKLOG.md), not built in the setup phase.

## 5b. Slice 1: the explainer first (owner, 2026-10-06)
All layers stay in the plan, but implementation starts with **one explainer episode end to end**, to see how the pipeline performs before building the rest.
- **In Slice 1:** S1 spikes, L1 (genre fixed to explainer), L2 research (existing tiers + copied BrowserOS), L3 outline (validated, approval off), L4 writer with MiniMax M3 reasoning off, L5 identity (existing), D1 (token file + a few lint rules), M1 (existing scenes only + layout-utils + ESLint), A1 (ducking + loudness), T1 (audio-vs-script if S-02 passes), F1 (core checks, advisory), L6 gate report, L7 (MiniMax TTS and images, no clips, existing waiver), L8 render and packaging, C1 finance rules, V1 shims, E1 review form and metrics.
- **Deferred until Slice 1 is reviewed:** story, concept, data and documentary packs; new scene types; L9 publishing and analytics; taste-log steering; long-form.
- **Output:** one video, the E1 reference episode, with a metrics file and the owner's verdict.

## 6. Setup first: what "a layer is set up" means, and the order
**Intention of this plan: every layer exists as a working, testable, replaceable unit wired to its reused components, before any layer is made smarter.**

### 6.1 The layer kit (every layer must have all eight)
1. **Contract**: input and output file names and a JSON schema (`brief.json`, `research.json`, `outline.json`, `episode.json`, `identity.json`, `storyboard.json`, `audiomap.json`, `transcript.json`, `frame_qa.json`, `gate_report.json`).
2. **Runner**: one command (`run.py <layer>`), runnable alone, resumable.
3. **Cache key**: hash of inputs, so a rerun costs only what changed.
4. **Reused component wired**: at least one component from R1 running on one real input (not just installed).
5. **Gate hook**: its check writes into `gate_report.json` with layer, rule, severity, fix hint (advisory at first).
6. **Fixtures**: one passing and one failing sample, run by `selfcheck`.
7. **Owner file**: the one file or folder this layer owns (prevents edit collisions).
8. **Doc**: its child plan updated from "Want" to "Done / verified" with evidence.

### 6.2 Machine budget (measured 2026-10-06)
Apple M4, 10 cores, 32 GB RAM, **about 14 GB free disk of 460 GB**. Consequences:
- Disk is the tight resource: check free space before each install or model download; prune `reference/hyperframes` (642 MB) and unneeded vendor clones after the files we need are extracted; no duplicate `node_modules`; no model beyond Parakeet (size to confirm, expected under a few GB; skip it if disk is too tight and use the TTS word timings only).
- No local TTS (Kokoro rejected), no local LLM, no local image or video generation. TTS, images, clips and LLM text stay on the MiniMax API.
- Cheap local compute only: ffmpeg filters, numpy, headless Chrome stills, one ASR model run per episode (about a minute).
- Remotion render chunks limited to about 4 to 5 in parallel; preview renders use low resolution.

### 6.3 Setup waves (work packages in the same wave touch disjoint files and run in parallel)
Naming: a wave package such as WP-F is the layer kit; the numbered items inside layer plans (WP-F2, WP-A3, ...) are its sub-tasks.
**Wave 0: environment and reuse intake**
| WP | Work | Owns | Reuse |
|---|---|---|---|
| WP-S1 | Check disk; create `.venv-asr` (uv, Python 3.12) with parakeet-mlx, jiwer; run on one real mp3; record size and time. Librosa only if it installs cleanly | `.venv-asr/`, `requirements-asr.txt` | R-01, R-06, R-11 |
| WP-S2 | `npm i` pinned `@remotion/layout-utils`, `@remotion/rough-notation` at 4.0.532; typecheck | `remotion-app/package*.json` | R-40, R-41 |
| WP-B1 | Copy files into `third_party/` unmodified with LICENSE: HF `transcribe.mjs`+lib and `analyze-beatgrid.py` and audio-duck lib; MPT `subtitle.py`; ViMax `robust_json_parser.py`, `retry.py`, `rate_limiter.py`, `best_image_selector.py`; OpenMontage `slideshow_risk.py`, `variation_checker.py`, `delivery_promise.py` (all stdlib-only, copy as is), `composition_validator.py`, `verify_scene_pacing.py`, `cost_tracker.py`, `visual_qa.py`, `audio_mixer.py` (needs a `base_tool` stub); HF `contrast-report.mjs`, `seam-gate.mjs`. Open each file; record in `third_party/INDEX.md` what it needs to run | `video-pipeline/third_party/**` | R-02, R-05, R-20, R-27..R-30, R-32, R-68, R-69, R-72, R-73, R-85 |
| WP-C1 | Write craft cards from the TEXT rubrics (hook checklist, CHAI reviewer rules, script supervisor, director contract, beat-direction, story-spine, narration, faceless story-design and cut-catalog, beat frameworks, video-composition, sound numbers, post-production gotchas, reviewer protocol) | `direction/craft/*.yaml` new cards | R-10, R-14, R-31, R-60..R-67, R-70, R-71 |
| WP-C2 | Wire Remotion rule files into the episode skill and director prompt | `direction/EPISODE_SKILL.md` | R-43 |
| WP-E1 | `direction/tokens.yaml` + loader + generated `tokens.ts` | `direction/tokens.yaml`, `src/tokens.ts` | R-44 |
| WP-X2a | Golden briefs (ep24 brief included), one per genre pack, + replay harness skeleton; retire old drafts to `episodes/_retired/` | `tests/golden/**` | R-87 |
| WP-G | `direction/format_packs.yaml` (data only) mapping the five genres onto existing format ids, modes, archetypes | `direction/format_packs.yaml` | R-101 |
Gate W0: each copied tool runs on one real input or is marked "does not run, reason"; `tsc --noEmit` clean; `selfcheck.py` still green.

**Wave 1: layer kits, part 1 (independent layers, parallel)**
| WP | Layer kit | Owns |
|---|---|---|
| WP-T | T1: `transcribe.py` wrapper, `transcript.json`, `audio_matches_script` advisory | `tools/transcribe.py` |
| WP-F | F1: `frame_qa.py` sampling + ffmpeg stats + contrast-behind-text from text-box probe, `frame_qa.json`, overlay | `tools/frame_qa.py`, `SafeProbe.tsx` |
| WP-A | A1: `mix_audio.py` (ducking, loudnorm), audio QA, SFX map stub, `audiomap.json` | `tools/mix_audio.py` |
| WP-L1 | L1: `brief.json` contract (incl. `genre`, `approvals`), integrity re-apply, promise lock (copied `delivery_promise.py`) | `director.py` brief section |
| WP-L2 | L2: per-question research runner, `research.json`; copy BrowserOS client + record-only prompt from Trade, add BrowserOS tier to `web_fetch.py`, two-source number check | new `research.py`, `adapters/web_fetch.py`, `third_party/trade/*` |
Gate W1: each kit passes its own good and bad fixture and writes to `gate_report.json`.

**Wave 2: layer kits, part 2 (parallel)**
| WP | Layer kit | Owns |
|---|---|---|
| WP-L3 | L3: `outline.json` contract, validators, approval gate | new `outline.py` |
| WP-D | D1: token loader used by `identity.py`; brightness/accent/colour-blind/element rules as lint rules; slideshow-risk wired | `identity.py`, `lint.py` rules block, `qa_checklist.yaml` (one editor at a time) |
| WP-M | M1: Remotion's official ESLint plugin (R-97) instead of a custom linter; one new scene type as pilot (numberline) to prove the path; effects test in Docker | `tools/check_motion.py`, new `src/*Scenes.tsx` |
| WP-L5/L8 | L5/L8: identity reaches remaining components; measured text widths; preview render profile | `src/*.tsx` scene files |
Gate W2: outline for the golden brief validates; seeded bad palette fails; pilot scene renders and passes F1.

**Wave 3: thin end-to-end pass and unified gates**
| WP | Work |
|---|---|
| WP-V1 | One `gate_report.json` fed by every layer; sole editor of `verify.py` |
| WP-L4/X1 | Writer takes outline; robust JSON/retry/rate limiter wired; per-stage timing log; lane runner chosen by a one-hour spike (`doit` vs stdlib + `cache.py`, R-99) |
| WP-X2b | Replay the golden brief through all layers with cached inputs; record per-stage time |
Gate W3 (the setup is done): the golden brief runs brief -> research -> outline -> script -> design -> audio -> preview render -> gates, each layer writing its contract file and gate entries, with paid assets only after approval. Quality of each layer is then improved from the backlog.

Phase mapping from rev 1: P0 = Wave 0 + WP-L1/X2a; P1 = WP-L2; P2 = WP-L3/L4; P3 = Wave 2 + gates; P4 = build the golden episode with paid assets (after approval); P5 = L9 + X1 polish (backlog).

## 7. Cost and risk
- Waves 0 to 3 are free apart from MiniMax text calls already used by the pipeline. Paid media only for the golden episode after approval.
- Biggest risks: (a) disk: 14 GB free (mitigation: check before every install, prune clones); (b) copied files drag in coupling (langchain, config, telemetry): untangle in WP-B1 or take the idea only; (c) Python 3.14 venv vs MLX wheels (separate `.venv-asr`, 3.12); (d) thresholds marked "judgment" are untested (advisory first, tune on ep20-ep24); (e) research quality on JS-heavy pages (tiered reader); (f) LLM speed (X1); (g) over-engineering (each wave passes its gate on a real brief before the next).
- Honest limit: five surveys read file lists, headers and heads, not bodies. R1 is a shortlist to open and run, not a list of verified components.

## 8. Decisions needed from the owner
**All decisions answered (owner, 2026-10-06):**
1. Licences are not a concern (personal use). Plans first. Current languages only. No local TTS (weak machine).
2. **Outline approval is OFF by default, with a toggle in the UI** the owner can flip at any time (stored per run in `brief.json` as `approvals.outline`; the runner reads it; default false). The other approval points stay as designed.
3. **All LLM calls go through MiniMax** with the existing provider config and its built-in fallback chain (M3, M2.7, M2.5). No Gemini or other provider, no separate 'fast repair model' work. Speed work is limited to fewer and smaller calls (targeted repair, caching, parallel lanes).
4. **Old drafts are retired:** ep18, ep20, ep22, ep23 and ep24 are moved (not deleted) to `video-pipeline/episodes/_retired/` when WP-X2a runs; the ep24 *brief* is kept as a golden brief fixture. Retirement is reversible.
5. **Research backends are not a choice to make.** L2 copies the working Trade modules. Survey result: the MiniMax search client and the Steel reader are already ported in `adapters/news_web.py` and `adapters/web_fetch.py`; what is copied now is the BrowserOS client, the record-only honesty prompt and the two-source number check (exact files in L2). All tiers are simply part of the reader chain: plain fetch, then Steel, then BrowserOS, each used when available.
6. **New checks are advisory first**, then promoted to blocking one by one.
7. **Taste log records only at first** (owner, 2026-10-06): tags at preview review are stored in `review.json`; using them to steer selection is backlog (B-G1-2).
8. **Protected files may be edited** (`verify.py`, `lint.py`, `director.py`, `Episode.tsx`, ...). The pre-existing uncommitted work was committed and pushed first (`e4f26d2`).
No open decisions remain for the setup phase.
