# 06 - OpenMontage study (read-only)

Repo: `video-pipeline/vendor/OpenMontage` (fork `p1927/OpenMontage` of calesthio/OpenMontage), HEAD 9327439 (PR #527), commit date 2026-10-03. AGPL-3.0 (`LICENSE`, `README.md:776`). About 2,144 files, 1,098 markdown. Nothing was modified or executed; everything below is from reading files. Not run: setup, preflight, any tool, any render.

## 1. Layout and how Claude Code drives it

- Entry docs: `CLAUDE.md`, `AGENTS.md`, `CODEX.md`, `CURSOR.md`, `COPILOT.md` are 9-line stubs saying "read AGENT_GUIDE.md first; no instructions here" (`CLAUDE.md:1-9`). The real contract is `AGENT_GUIDE.md` (720 lines); architecture is in `PROJECT_CONTEXT.md` (125 lines).
- Rule Zero (`AGENT_GUIDE.md:49-68`): every video request goes through a pipeline. Agent must not write ad-hoc scripts or call APIs directly. "The intelligence is in the skills, not in improvised code" (`:68`).
- Design principle (`AGENT_GUIDE.md:80`): Python = tools + persistence only. No orchestration, creative or review logic in Python. The agent is the orchestrator (`:181-200`).
- Pipelines: `pipeline_defs/*.yaml` manifests (13 files: 12 real + `framework-smoke`). Each lists `stages[]` with `skill`, `produces`, `required_artifacts_in`, `tools_available`, `checkpoint_required`, `human_approval_default`, `review_focus`, `success_criteria` (see `pipeline_defs/animated-explainer.yaml:61-269`). Orchestration block sets `budget_default_usd: 2.00`, `max_revisions_per_stage: 3`, `max_send_backs: 3`, `max_wall_time_minutes: 20` (`:45-51`). Schema: `schemas/pipelines/pipeline_manifest.schema.json`.
- Stage skills: `skills/pipelines/<pipeline>/<stage>-director.md` plus an `executive-producer.md` (423 lines in explainer) that runs stages serially and does cross-stage checks.
- Artifacts: 21 JSON schemas in `schemas/artifacts/` (brief, research_brief, proposal_packet, script, scene_plan, asset_manifest, edit_decisions, render_report, final_review, cost_log, decision_log, publish_log, etc.). Workspace: `projects/<id>/{artifacts,assets,renders}` (`AGENT_GUIDE.md:205-218`).
- Checkpoints: `lib/checkpoint.py` (`write_checkpoint` `:422`, `get_next_stage` `:620`, schema validation `:160`, prerequisite enforcement `:284`, superseded-checkpoint archive `:349`). Protocol skill: `skills/meta/checkpoint-protocol.md`.
- Human gates: `human_approval_default: true` per stage (explainer: proposal, script, scene_plan, assets, publish). Global policy in `config.yaml:17-19`: `guided | manual_all | auto_noncreative`.
- Tool registry: `tools/tool_registry.py` auto-discovers every `BaseTool` subclass via `pkgutil.walk_packages` (`:118-130`). `provider_menu_summary()` (`:316`) gives a plain-language capability menu. Each tool declares capability, tier, runtime (LOCAL, LOCAL_GPU, API; `tools/base_tool.py:64-91`), cost, install instructions, and `agent_skills[]` (`:298`).
- Skill format and discovery: three layers (`skills/INDEX.md`). Layer 1 is the tool registry. Layer 2 is `skills/{core,creative,meta,pipelines}/*.md`, plain markdown with no frontmatter. Layer 3 is `.agents/skills/*/SKILL.md` (91 dirs, standard frontmatter `name`/`description`, mirrored to `.claude/skills/`). Discovery is by explicit path: manifest `required_skills`, the stage's `skill`, and a tool's `agent_skills`. Not auto-triggered by description. The agent is told to read them (`AGENT_GUIDE.md:58-59`).
- Slash commands: only `.claude/commands/{animated-drawing,backlot,ink-art}.md`. No `/episode`-style command.
- Extras: Backlot (`backlot/`, FastAPI live board with `decision_log`), `remotion-composer/`, `styles/*.yaml` playbooks, `lib/` heuristics.

## 2. The 12 pipelines

| Pipeline | Purpose | Stages | Fit for us |
|---|---|---|---|
| animated-explainer (production) | topic to fully generated explainer | research, proposal, script, scene_plan, assets, edit, compose, publish | Best fit: ELI5, news, data explainers |
| animation (production) | motion-graphics-first | same 8 | Data/chart and math via Remotion/manim |
| cinematic (production) | trailers, mood edits | same 8 | Weak fit; maybe shorts |
| character-animation (beta) | local rigged cartoon characters | research, proposal, script, character_design, rig_plan, scene_plan, assets, edit, compose, publish | Skip (we use illustrated cast) |
| hybrid (production) | source footage plus support visuals | idea, script, scene_plan, assets, edit, compose, publish | Sponsor-supplied footage, maybe |
| screen-demo (production) | real or synthetic terminal demos | same 7 | Skip |
| talking-head (beta) | footage-led speaker | same 7 | Skip |
| avatar-spokesperson (production) | avatar or lip-sync presenter | same 7 | Skip; AI-endorser disclosure risk |
| clip-factory (beta) | many clips from one long video | same 7 | Shorts from long sources; reuse caption/hook ideas |
| podcast-repurpose (beta) | podcast highlights | same 7 | Skip |
| localization-dub (beta) | subtitles, dubs, translation | same 7 | Later, for multi-language |
| documentary-montage | stock-footage montage | idea, scene_plan, assets, edit, compose (no script or publish skills dir entries beyond 6 directors) | Skip |

Notes. The guide's table lists 11 plus smoke (`AGENT_GUIDE.md:~257`), and omits documentary-montage. Only `animated-explainer`, `animation`, `cinematic`, `character-animation` have research and proposal stages; the "idea" pipelines are thinner. No pipeline is built for sponsors, news-speed, or manim-led math as a first-class format. `math_animate` (ManimCE, free, local; `tools/graphics/math_animate.py:1-5`) is only an optional tool in explainer assets.

## 3. Direction and knowledge layer: what is worth taking

Script and story
- `skills/pipelines/explainer/script-director.md` (268 lines): word budgets by duration, hook/setup/build/climax/landing arc, "therefore/but" transitions, enhancement-cue density, per-section `delivery_cues` JSON with TTS break tags (`:65-140`).
- `skills/creative/storytelling.md` (189): hook types (contrarian, outcome, mystery, stakes; `:86-94`), 30-second rule, misconception-first, guided discovery, Mayer principles (`:168`), one "camera intent" line per beat (`:143`).
- `skills/pipelines/explainer/research-director.md` (343) and `proposal-director.md` (557): sourced research brief; 3 differentiated concepts plus itemised cost before spend.

Hooks, retention, format
- `skills/creative/short-form.md` (205): 1-second hook, 3-second retention, safe zones, caption rules, 15/30/60s templates.
- `skills/creative/long-form.md` (239): retention curve, 2-3 minute valley tactics, pattern interrupts, re-engagement hooks, chapter template. Benchmarks at `:21-36` are uncited vendor-style stats; treat as unverified.

Shot and camera
- `skills/creative/video-gen-prompting.md`: universal prompt formula, shot types, movements, height, angle, POV, lens, DoF (`:39-195`). Per-model guides in `skills/creative/prompting/` (veo, sora, ltx, seedance, grok, hunyuan). No MiniMax/Hailuo guide there, but `.agents/skills/minimax-h3` exists (not read).
- `skills/pipelines/explainer/scene-director.md` (263): mandatory 5-aspect scene spec (subject, motion, scene, spatial framing, camera; `:173-179`), variety rule (no 3 consecutive same scene type).
- `skills/creative/broll-planning.md` (145): stock-vs-generated decision matrix.

Pacing, captions, audio
- `skills/meta/voice-performance-director.md` (93): voice plan plus sample approval before batch TTS.
- `skills/creative/sound-design.md` (141): ducking levels, LUFS per platform, SFX timing, AI-TTS mixing chain.
- `skills/core/subtitle-sync.md`, `skills/creative/typography.md` (226), `skills/creative/data-visualization.md` (344), `skills/creative/manim-usage.md` (102).

QA and review
- `skills/meta/reviewer.md` (354): schema check, per-stage `review_focus`, severity levels, CHAI rules (accurate, complete, constructive; every critical finding needs a concrete fix; `:9-17`).
- `lib/slideshow_risk.py` (6-dimension score), `lib/variation_checker.py` (repetition in scene plans), `lib/delivery_promise.py`, `tools/analysis/visual_qa.py` (frame extraction, caption occlusion), `tools/analysis/composition_validator.py` (pre-render asset/duration check). These are small deterministic linters worth studying.

Taste: `skills/meta/taste-direction.md` (126): taste dials (variance, motion, density) and anti-patterns. `skills/meta/creative-intake.md`, `video-reference-analyst.md` (417).

Compliance and sponsors: I found none. A grep for "sponsor" in skills, pipelines, tools, schemas returned only `skills/pipelines/animation/script-director.md` as a stray hit. `docs/SPONSORS.md` is about README logos for the project itself. No FTC/disclosure, paid-promotion, or AI-label guidance found (by grep only; not every file read). Our sponsor and disclosure direction (v2-plan section 6) gets nothing from this repo.

## 4. Quality gates, reviews, cost, provenance

- Gates: schema-valid artifact per stage; manifest `success_criteria`; self-review via `reviewer.md` before every checkpoint; executive producer cross-checks after each stage (`executive-producer.md:173-275`); anti-loop limits (`:330`); human approval where flagged.
- Governance rules in `AGENT_GUIDE.md`: announce provider/model/reason before any paid call (`:94-102`); ask before switching provider/model/runtime (`:104-115`); no silent substitutions or still-image fallbacks for motion briefs (`:169-179`, motion-required rule); present Remotion vs HyperFrames before locking `render_runtime` (`:123-137`).
- Cost: `tools/cost_tracker.py` implements estimate, reserve, reconcile; `BudgetExceededError`, `ApprovalRequiredError`; modes observe/warn/cap; defaults `$10` total, 10% reserve, `$0.50` single-action approval, approval for new paid tool (`config.yaml:8-13`; `cost_tracker.py:1-62`). Persisted to `cost_log.json` (schema in `schemas/artifacts/`). Also `tools/provider_pricing.py`, `lib/scoring.py` (weighted provider choice).
- Provenance: `decision_log` is append-only, keyed by (category, subject), re-logged on changes (`AGENT_GUIDE.md:117-121`); `asset_manifest`; checkpoints archived when superseded; `publish_log`. No content-hash asset cache as in ours; no C2PA or AI-disclosure metadata found.
- Caveat: enforcement is mostly by instruction, not code. The agent could skip them; Python only validates schemas and tracks cost.

## 5. Providers, swappability, composition

- Tools: about 150 files. TTS: elevenlabs, openai, google, gemini, azure, cartesia, fish, dashscope, doubao, inworld, kling, and local `piper_tts` (free CPU). No MiniMax TTS. MiniMax image (`tools/graphics/minimax_image.py`) and MiniMax video (`tools/video/minimax_video.py`, plus fal and H3 variants) exist.
- Image: openai, flux, imagen, recraft, ideogram, grok, seedream, qwen, comfyui, local diffusion, pexels/pixabay. Video: veo, sora, kling, runway, wan, ltx (local), hunyuan, seedance, grok, comfyui, higgsfield, stock. Music: suno, google lyria, elevenlabs, comfyui, pixabay, freesound, local library. STT: faster-whisper/WhisperX (`tools/analysis/transcriber.py:1-43`, CPU mode OK), azure, dashscope.
- Swappability: good in concept. Selectors (`tts_selector`, `image_selector`, `video_selector`) route by availability, requirements and cost; each provider is one `BaseTool` file. Ours is simpler: one `class_path` in `providers.yaml`, three adapters. Adding a provider here means a Python tool class; there is no YAML-only swap.
- Composition: `tools/video/video_compose.py` routes to FFmpeg, Remotion (`remotion-composer/`, `remotion ^4.0.484`) or HyperFrames (HTML/GSAP, Node 22+, `AGENT_GUIDE.md:~280`). Remotion scene types: text_card, stat_card, callout, comparison, hero_title, bar/line/pie chart, kpi_grid, word-level captions (`AGENT_GUIDE.md:~320`; `remotion-composer/SCENE_TYPES.md`). Compared with ours (`remotion-app/src`: Captions, Carousel, Episode, Scenes, driven by `episode.json`): theirs has a wider scene catalog and chart types plus a per-video "atelier" mode, but ours is already wired to our episode.json, 9:16 and carousel. Not reusable without adaptation.
- Remotion licence caveat: Remotion has its own company licence terms; we already depend on it. Unverified for our usage; check separately.

## 6. Setup requirements

- Python 3.10+ (`Makefile:1`, `README.md:190`), FFmpeg, Node 18+ (`README.md:192`; HyperFrames needs Node 22+). `make setup` = venv, `pip install -r requirements.txt` (pyyaml, pydantic, jsonschema, Pillow, numpy, google-genai, openai, fastapi, uvicorn), `npm install` in `remotion-composer`, plus `piper-tts`.
- Keys: all optional per provider; `.env`. Free baseline: piper TTS, stock sources, FFmpeg, Remotion, faster-whisper, ManimCE.
- Apple Silicon: supported via MPS (`docs/apple-silicon-mps.md`: macOS 12.3+, `VIDEO_GEN_LOCAL_ENABLED=true`, torch). Limits: bf16 unsupported, 16 GB unified memory may not fit large models, fp32 upscaling. No NVIDIA needed if we use cloud APIs. Requirements-gpu is optional.
- Hardware needs for the local video models are not verified by me. Not tested on this machine.

## 7. Adopt / adapt / skip and integration proposal

ADOPT directly (run alongside, no code of ours)
- Nothing wholesale. The framework needs Claude Code to read about 20 files per stage and assumes its own artifact flow; running it end to end would duplicate our run.py, Remotion app and episode.json. Optionally run its `preflight` and `python -m backlot` on a scratch topic to see the UX, as a private tool.

ADAPT (re-write into `video-pipeline/direction/`, per v2-plan section 3)
1. Script: `script-director.md` word budgets and delivery_cues pattern; `storytelling.md` hooks, but-therefore, misconception-first. Merge with our docs 02. Highest value.
2. Shots: `video-gen-prompting.md` formula and the 5-aspect scene spec in `scene-director.md`. Add a Hailuo cookbook of our own.
3. QA: port the ideas of `slideshow_risk`, `variation_checker`, `composition_validator`, `visual_qa` into our planned `lint.py` (about 100 lines; do not copy code, rewrite). Take `reviewer.md` CHAI rules (finding must cite a field and carry a fix).
4. Process: proposal stage (3 concepts plus cost estimate before spend), voice sample approval, decision_log re-log rule, cost-reserve/approval thresholds, "announce provider before paid call".
5. Audio and retention: `sound-design.md` LUFS table, `short-form.md` safe zones/pacing, `long-form.md` pattern interrupts (verify numbers independently).
6. Taste dials from `taste-direction.md`.

SKIP: character-animation, avatar, talking-head, screen-demo, podcast, localization (for now), HyperFrames/atelier, 3D/threejs/comfyui skills, Backlot, the 90 generic Layer-3 skills (mostly third-party docs), the Python orchestration and tool classes, `cost_tracker` (port 30 lines of idea if wanted).

Minimal-code plan
1. Write `direction/` as markdown/YAML, distilled from the files above and docs 01-05 (data, not code). Prompts and structure re-expressed in our words.
2. One Claude Code skill `/episode` (already in v2-plan) that reads `direction/director_prompt.md` then drives `run.py`. Stage gates: script approval (before paid calls), final review.
3. One `lint.py` for checks. No import of OpenMontage code.
4. Keep the vendor submodule as read-only reference, outside any build, Docker image or deployment.
5. Sponsor/disclosure/news direction must come from our own research (not in this repo).

## 8. Licence (not legal advice)

- (a) Running privately: AGPL obligations trigger on conveying copies, or for modified versions on offering network users interaction (section 13). Private, internal use with no users interacting over a network is generally unrestricted. Our fork is already public on GitHub (`p1927/OpenMontage`), so its source is available.
- (b) Copying files/skills into LinkedInPost: markdown skills and prompts are likely covered by the same licence (copyrightable text), so verbatim copies make that part a derivative work under AGPL. Copyleft could then argue for source release of the combined work if distributed or served. The LinkedInPost SaaS mode raises the section-13 risk if any copied or derived code is served to users. Ideas, structures and facts are not copyrightable, so rewriting in our own words avoids the issue. Safest: no verbatim files in the SaaS-capable repo; keep `direction/` original with brief attribution of inspirations.
- (c) CLI/subprocess vs import: invoking as a separate program (subprocess, or Claude Code reading its files) is the conventional "separate work" line, so the AGPL generally does not reach our code. Importing its Python (`from tools...`) or bundling in one process makes a combined work that the AGPL clearly reaches. Not settled by courts; talk to a lawyer before shipping a SaaS feature that uses it.
- Other licences inside: Remotion (company licence), bundled third-party assets under `.agents/skills`, `assets/`, and the example outputs may each carry their own terms. Not audited.
- Recommendation: treat OpenMontage as a read-only study. Re-express concepts in `direction/`, write our own lint, never import or copy verbatim into the SaaS repo, and keep the submodule out of the deployed bundle.

## 9. Risks and unknowns

- Did not install or run anything; claims about behavior (preflight output, selector routing, MPS performance) are from source and docs only.
- Skills assume an agent that reads and obeys; adherence depends on model discipline. Long contexts (about 8,000 lines in the explainer path) cost tokens and time; budget `$2.00` per run and 20 min wall time in the manifest looks optimistic for real runs.
- Retention and platform numbers in skills are uncited; validate before encoding as lint rules.
- Repo moves fast (MPS, Wan, Kling fixes in last commits; docs reference "provider-update-plan-2026-10-03"), so copies go stale.
- Not read in detail: `proposal-director.md`, `compose-director.md`, `asset-director.md`, `publish-director.md` (YouTube metadata), `.agents/skills/minimax-h3`, `remotion-composer` source, schemas' fields, tests. The publish stage may hold useful title/description/thumbnail guidance; worth a follow-up read.
- No coverage of sponsor integration, FTC/AI-label disclosure, news fact-check gates, or monetisation policy (YouTube inauthentic-content). We must source those ourselves.
