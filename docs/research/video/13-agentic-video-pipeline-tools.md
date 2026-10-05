# 13 — Agentic video pipeline tools: what exists, what we have, what we're missing

Date: 2026-10-05 · Type: research / investigation only (no code changed) · Scope: direction + storyboard/decision-map layer

**Question.** The user wants two things next: (1) *direction*, and (2) a structured **map of every decision** — shot by shot, frame by frame, what is shown and *why*. It should run free and local, run autonomously, and be easy for an agent to edit when the user asks for a change. This doc surveys the tools the user listed, compares them with what `video-pipeline/` has today, and lists ideas worth copying. Findings are reported as found, including the negatives.

**Method and confidence.** Sub-agents cloned or read the actual READMEs and source, using `gh api` and WebFetch. They did **not run** any of the tools. The user's tool descriptions came from a search-engine summary. Several did not hold up, and those are flagged. Tags: **[V]** verified from repo or vendor page, **[M]** from memory or a search snippet (verify before relying on it), **[U]** unverified.

---

## Status update (same day, later): what has changed since this was written

Section 3 ("What we have today") described the repo as of the first inventory. It is partly stale; the tool survey in section 2 is not. Corrections, each checked against the tree:
- **Fixed since** (FIX-PLAN.md): schema now covers all nine visual types and is strict (`additionalProperties:false`, `x-` escape); 12 previously unimplemented checklist rules are now in `lint.py`, and every rule declares `enforced_by`; per-episode `waivers[]`; `run.py schema-check` and `run.py selfcheck`; safe zones are presets chosen by the profile (`config/safe_zones.yaml`); `director --help` no longer starts a run; `requirements.txt` exists.
- **Not missing any more** (built by the direction-brain pass): `direction/craft/` (about 4,400 lines of cards: archetypes, grammar, continuity, realism, planning artifacts, flow, triage, per-model dialects), `brain.py` / `run.py direction ...` lookup, and optional schema keys `direction`, `scenes[].shot` and `continuity` (the "shot layer" row in the section 3 gap table is therefore *partly* wrong: one shot row per scene is now representable).
- **Still true:** nothing reads the new keys yet (only ep10 uses them); there is no generated storyboard or decision map, no animatic stage, no asset manifest or cost estimate before approval, no per-scene edit command, and no structured decision log (`director_notes` prefix lines `ASSUME/RULING/DEVIATE/WORKAROUND` are the convention; `direction_log.jsonl` and `takes.jsonl` are proposed, not built).
- The follow-up design is in `docs/plans/youtube-automation/STORYBOARD-AND-DECISION-MAP-PLAN.md`.

---

## 1. Bottom line

1. **No listed tool is a drop-in for us.** None is both free and local *and* suited to 2D narrated explainers. The commercial planning tools are mostly paid or trial-only SaaS built for live-action shoots. The open-source "director" pipelines mostly depend on paid cloud generation and target photoreal or product-ad video.
2. **The value is in their data models and gates, not their code.** Several have no license or a copyleft one (see §4), so ideas are safe and code is not.
3. **Our real gap is structural, not tooling.** The schema stops at the scene, with one `visual` and one `narration`. There is no shot, frame or element layer, no per-scene camera/timing/rationale, no storyboard or animatic stage, no asset manifest, and no structured decision log (§3). Everything the user described, such as frame-by-frame flow and why each element is shown, has no home in the data model today.
4. **The best-fitting free/local reference is not on the user's list:** `vincentsch/explainroo` (MIT, Kokoro TTS and Whisper timing, agent-oriented QA bundle). Remotion's official skills and `iart-ai/explainer-video-skills` are the next most relevant (§2.4).
5. **Safety flag:** `DrawCut-PRO` does not appear to be a legitimate project (§2.5). Don't download or run it.

---

## 2. Tool-by-tool findings

### 2.1 Autonomous script-to-video pipelines

| | juspay/director | LudwigKienle/ai-video-production-editor | video-db/Director |
|---|---|---|---|
| What it is [V] | TypeScript CLI pipeline for product-ad films, built on juspay's NeuroLink SDK | Electron + React desktop app for AI filmmaking | Chat-based "video agents" framework (~25 agents: search, dub, subtitles, text-to-movie…) |
| Matches the user's description? | Mostly. The 7 phases are real (voiceover, avatar, b-roll, music, render, assembly, captions) | Stage flow matches the README exactly | **No.** It is not a script→storyboard pipeline |
| License | **None** (no LICENSE file). Ideas only, no code reuse | GPL-3.0 | MIT |
| Free/local? | Not fully. Defaults to Vertex (Veo/Gemini) and OpenAI TTS. A `--broll-mode cards` typography mode and EdgeTTS cost nothing | **No.** Needs paid keys (fal, Replicate, Gemini, ElevenLabs…) | **No.** Needs a paid VideoDB cloud API key plus LLM keys |
| Activity | 10★, pushed 2026-10-04 | 62★, v3.0.0 on 2026-10-01 | 1.5k★, last commit 2026-01-23 |

**juspay/director — what's useful**
- Schemas:
  - `ShotPlan {product_bible, hero_prompt, tone, color_palette, shots[{scene_id, beat, shows_product, prompt, camera}]}`.
  - `ConsistencyVerdict {consistent, score 0-10, mismatches[], fix_instruction}`.
  - A 7-dimension weighted `VideoScore` with `*_justification` fields and `deal_breakers[]`.
- **A critic runs before the expensive step.** The consistency critic checks the cheap still keyframe before the costly animation step. It feeds `fix_instruction` back to the generator.
- `AGENT_GUIDE.md` is the strongest agent-operability artifact seen. It covers resumable state (`shot-verdicts.jsonl`), per-shot regeneration (`--regen-shot N`), a repair table and a spend cap.
- Director rules worth stealing: the script is authoritative; any number in the narration must be visible on screen; every scene has motion; scenes follow script beats in order.
- Caveat: "multi-judge consensus" is two Gemini models and a median, and with 2 judges the median equals the mean. The README oversells it slightly.
- Not checked: whether NeuroLink can use a local LLM.

**ai-video-production-editor — what's useful**
- `DirectorTreatment {analysis{mood, visualTheme, pacing, keySymbols}, shots[DirectorShot{description, rationale, …}]}`. A **per-shot `rationale` field** is the closest thing to "why" capture found anywhere in this survey.
- `DirectorStoryboardSnapshot` keeps **versioned director passes**, so a revision doesn't overwrite history.
- `ShotContinuityReview {score, status aligned|watch|drift, priority, issues[{kind, severity, message, score, anchorName}]}` plus a re-film queue ordered by priority.
- Demo shot table columns are `Shot | Intent | Visual Notes | Continuity Anchor`.
- Weaknesses: GPL-3.0, cinematic/live-action orientation, heavy marketing in the repo. Agents drive it through a local MCP server and ACP rather than files, which makes headless use awkward. The on-disk project schema wasn't located.

**video-db/Director — verdict:** poor fit. No storyboard format, no QA mechanism, cloud-dependent, stale since January. The only transferable idea is its agent-registry shape.

### 2.2 Agent skill toolkits

| Repo | Stars / license | Verified reality | Relevance to us |
|---|---|---|---|
| digitalsamba/claude-code-video-toolkit | 2,164★ / MIT [V] | 13 slash commands, 12 skills, 5 templates, Python tools. Code is free, but AI voice/image/clip generation needs rented Modal/RunPod GPUs | Medium |
| vibe-motion/skills | 1,312★ / **no license file** [V] | **Mis-described.** 16 effect recipes (candlesticks, fisheye, logo motion), not direction/storyboarding. README says no longer maintained | Low. Only `disney-animation-rule-skill` and `brand-launch-video-star` have anything useful |
| iart-ai/motion-skills | 696★ / MIT [V] | **Index only, no SKILL.md files.** Skills live in 17 sub-repos. Counts are inconsistent (50 vs 54). Partly a funnel to the paid iart.ai agent | Medium via `iart-ai/explainer-video-skills` |
| kangarooking/director-skills | 170★ / MIT [V] | Chinese-first, built for photoreal AI video (Seedance/Kling). One skill needs a Miora environment | Low for 2D, but its manifest lint is a good pattern |
| danielrosehill/AI-Video-Tools | 2★ / CC-BY-4.0 [V] | 37-entry index from April 2026, star counts stale. About 5 entries matter | Low (a pointer list) |

**Useful specifics**
- **claude-code-video-toolkit:** a `/scene-review` gate in Remotion Studio runs *before* voiceover. A `project.json` records state with a "filesystem is truth" reconcile step. Its short-explainer template uses a thin `scenes.json` (`id, slug, visual, asset, text`), which is thinner than ours.
- **vibe-motion:** `brand-launch-video-star` has a timeline with a `visualOwner` field and validators. `disney-animation-rule-skill` blocks event poses before easing.
- **iart-ai/explainer-video-skills** (a sub-repo):
  - a plain-text storyboard card with `VO / VISUAL / KEY MOTION / TRANSITION on a named word`
  - word-budget math (`words/2.3 + 0.4` seconds)
  - a one-analogy rule
  - QA scripts `seek-shot`, `contact-sheet` and `probe-mp4`
- **kangarooking/director-skills (`travel-skill`):** `shot-manifest.yaml` with spatial_audit, camera, lighting and continuity fields. `lint_shot_manifest.py` separates errors from warnings. The QC report ends in a **usable / partial / regenerate** verdict plus a root cause.
- **Official remotion-dev/skills** (4.8k★, license not shown on the repo) [V]: about 14 skills. They cover a preview-first workflow, `TransitionSeries` with `premountFor`, a per-scene TTS audio plus `calculateMetadata` pattern that works with local TTS, and layout minimums (84px headline, 44px support text at 1080 wide). It has no direction layer.
- **awesome-claude-video-skills** (410★): claims 230 repos while GitHub shows 180, and its SAFE/CAUTION grades are the curator's own. Treat it as a lead list, not a vetting service. Repos with committed `.zip`/`.skill` binaries (e.g. `Aaryan-Kapoor/video-production-skill`) should be read-only.
- **Note:** `video-pipeline/direction/skills/` already vendors DirectorSKILL, drama-director-skill, visual-skills and ai-video-generator-claude, all with `status: raw` in `LEDGER.yaml`. None is wired into `director.py`.

### 2.3 AI-native editors and automation

| Tool | Verified reality | License / cost | Fit |
|---|---|---|---|
| mutonby/openshorts | Real, ~6.1k★. A long-video→vertical-shorts **clipper**, not an explainer director | MIT core, `cloud/` is commercial. Self-hosting is free, but it needs keys for Gemini, fal.ai (~$0.50–1.50/short), ElevenLabs and Upload-Post [V] | Low for content. Worth copying: MCP + REST + CLI + skill interface surface |
| OpenChatCut (0xsline) | Real, ~2.1k★. Local-first conversational editor. A JSON timeline is the single source of truth. Exports via Remotion, FFmpeg, FCPXML and SRT. 26 MCP tools. External agents work through **draft → approve → apply-atomically** sessions [V from README, untested] | AGPL-3.0. Young project, maturity unverified | Medium as a pattern. Don't embed (AGPL) |
| DrawCut-PRO | **Not found as a legitimate project.** The only match (`pitchpackertube56/DrawCut-PRO-`) is a password-protected `.rar` with no source and SEO-style tags | n/a | **Do not run.** Treat as spam or malware [V] |
| Blender + blender-mcp (ahujasid) | Real, ~30k★. Agent drives Blender over a socket. Poly Haven (CC0) and Sketchfab integration; Hyper3D/Hunyuan3D for AI 3D | MIT. Blender is free, local and renders headless [V] | Low for 2D explainers, strong for 3D previs. Risk: the `execute_blender_code` tool runs arbitrary code. If used, keep the scene as a generated `.py`, not a `.blend` |

### 2.4 The better free/local reference (not on the list)

**vincentsch/explainroo** (384★, MIT) [V]: a free, local, agent-driven 2D explainer pipeline. It uses Kokoro TTS and Whisper word timing. Its agent QA bundle has per-scene stills, a contact sheet, a text overflow/overlap check, a TTS mispronunciation check and a small-text check. It is not Remotion, but the QA ideas port directly.

### 2.5 Commercial pre-production tools

The point here is **features worth replicating as plain files**, not adoption. Pricing was checked on vendor pages where reachable.

| Tool | What it actually is | Pricing (as found) | Agent access | Replicate as a file |
|---|---|---|---|---|
| Storyflow | Generic infinite-canvas whiteboard, not a film-specific tool [V] | Free plan reported; paid from ~$9.99/mo [V from vendor pages] | Export/API unverified [U] | Single-canvas "everything in one place" is a UI idea; skip |
| Boords | Web storyboard tool | **Free trial only, no free plan.** $39–$250/mo [V] | Public API, webhooks, MCP server [V] | Per-frame record: image, caption, VO, duration, camera note |
| Shot Designer | 2D overhead blocking diagrams | Free version can't save/export. Pro $19.99 one-time [M] | None found | Overhead blocking diagram. Low value for 2D motion graphics |
| StudioBinder | Script breakdown, shot lists, call sheets | Free plan + trial reported, ~$19/mo per feature [M] | Scope unverified [U] | Script-breakdown tags that feed an asset list; shot-list columns |
| Storiara | AI script-PDF extraction → characters/props/scenes, DOOD | Freemium, $0 tier reported; paid prices not retrieved [U] | Unverified [U] | Same breakdown→asset-list idea |
| Movie Magic Scheduling | Studio scheduling standard | **No free plan:** $39.99/mo or $279.88/yr [V]. Exports breakdown data to Excel only | None | Nothing; live-action scheduling has low value for us |

Net: no commercial tool offers a **free, agent-usable** API. The only API/MCP offerings, Boords (paid) and OpenChatCut (AGPL), come with cost or license strings. These are also live-action tools, so schedules, call sheets and DOOD add little to a solo 2D pipeline.

### 2.6 Free and open-source building blocks

| Tool | License | Agent-drivable headlessly? | Use here |
|---|---|---|---|
| Fountain (plain-text script format) | open spec [V] | Yes | Optional script format. Our `narration` per scene already does this job |
| OpenTimelineIO | Apache-2.0, `pip install opentimelineio` [V] | Yes (Python, JSON `.otio`) | Best candidate for an exported edit decision list / NLE interchange |
| Remotion Studio | Source-available; free for individuals and small teams [M, verify at remotion.dev/license] | Yes (CLI render, props JSON) | Already in repo; its Studio can serve as the review UI |
| Storyboarder (Wonder Unit) | open source; license type unconfirmed [M] | No CLI, but `.storyboarder` is JSON+PNG, so a file can be generated | Low. Draws frames by hand; we generate them |
| Excalidraw | MIT [M] | `.excalidraw` JSON is easy to generate | Optional for human-editable boards |
| Motion Canvas | MIT [M] | Partly (TS; headless render needs setup) | Alternative renderer, not a planning tool |
| Manim | MIT (community fork) [M] | Yes (CLI) | Already researched in doc 05 |
| Theatre.js | core Apache-2.0, studio AGPL [V] | Partly (state is JSON; studio is a GUI) | Skip |
| Kitsu | AGPL [M] | n/a | Review tracking; likely overkill |
| Dramatron (DeepMind) | Apache-2.0 [M] | n/a | Pattern: logline → characters → plot beats → locations → dialogue as a prompt chain |

An **animatic** needs no special tool. Stills plus per-scene durations plus voiceover are an animatic, and ffmpeg or a Remotion composition built from one shot-list JSON can produce it.

---

## 3. What we have today (from the repo inventory)

Sources: `video-pipeline/` and the docs under `docs/plans/youtube-automation` and `docs/research/video`. The working tree has many uncommitted changes from parallel sessions, so re-read before editing.

**Strong already**
- **Script layer.** Per-scene `narration`, `beat`, hook/CTA rules, ABT `structure`, plus ledgers: `mechanism[]`, `concepts[]`, `loops[]`, `claims[]`, `analogy`, `news_hook`.
- **Direction prose.** `direction/director_prompt.md`, audience cards, `format_catalog.yaml` (14 formats), `hooks.md`, `shots.md` (shot types, camera-move table, 8 storyboard rules), `DESIGN_SYSTEM.md`.
- **QA.** `lint.py` (about 20+ checks driven by `qa_checklist.yaml`), `verify.py` (three LLM verifier passes with a script fingerprint that goes stale on edit, and ffprobe render QA with a contact sheet), `packaging.py`.
- **Approval and cost gates.** Paid stages refused until status is `approved`, and approval requires a fresh passing QA report.
- **Caching and idempotence.** Assets hashed by content, so only changed scenes regenerate.
- **Vendored craft reference.** `direction/skills/` has a `LEDGER.yaml` and `best_ideas.yaml` for six repos. These include a continuity bible, a three-layer storyboard, a 14-field shot card and a failure taxonomy F1–F19.
- **Research.** Docs 01–10 and 12 already cover psychology, story, camera, formats, Manim, OpenMontage, posting, skills and cinematic craft. This doc doesn't repeat them.

**Missing (verified against the schema and shipped `episode.json` files)**

| Capability | Today | Evidence |
|---|---|---|
| Shot / frame / element layer | **None.** A scene has exactly `id, beat, narration, visual`. The only sub-scene structure is the renderer-internal `reveal[]` | `episode.schema.json`; all 9 episodes |
| Camera per scene | Only free text inside `visual.motion_prompt` | `shots.md`; episodes |
| Per-scene/shot timing | Derived at render from TTS length + `PAD`. No target plan | `run.py` l.139-140 |
| Per-scene transitions | Profile-level, chosen by next beat. No override or reason | `Episode.tsx`, `DESIGN_SYSTEM.md` §6 |
| **Rationale ("why") per scene/shot** | **None.** Free-text `director_notes` in only 2 of 9 episodes, plus scattered `title_rationale`/`analogy.limitation` | episodes ep07, ep08 |
| Structured decision log | **None.** No alternatives considered, no provenance of changes. The promised `direction.skills_used[]` isn't in the schema or any episode | `direction/skills/README.md` step 4 |
| Storyboard / animatic stage | **None.** Planned in `v2-plan.md` step 5 and `MASTER-PLAN.md`, never built. Keyframes only get generated inside paid stages | plans |
| Asset manifest + cost estimate | Implicit in `out/<id>/…`; no pre-approval estimate | `run.py` |
| Continuity bible / checks | Only `style.cast` descriptor strings and token fill. No verbatim-descriptor, scale-progression or eyeline checks | `lint.py`, `shots.md` |
| Per-scene edit command | None. `revise` is hand-editing JSON | `EPISODE_SKILL.md` |
| Free/local TTS, image, video | None. All three slots are MiniMax (paid). Free pieces: RSS news, offline music synth, Remotion, ffmpeg | `providers.yaml` |

**Internal inconsistencies that matter before building on this**
- `visual.type` in the schema allows only `clip|illustration|diagram|steps|remotion`. The renderer and ep03 also use `orbit`, `number`, `compare` and `photo`. The Director prompt restricts output to `illustration|clip`.
- The schema is not strict (no `additionalProperties:false`). Shipped episodes carry many undeclared keys.
- Many `qa_checklist.yaml` rules aren't implemented in `lint.py` (e.g. `scene_duration_max`, `camera_command_syntax`, `character_descriptor_consistency`, `scene_visual_type_valid`). `min_clip_scenes` is an error that ep03, already rendered, would fail.
- `direction/skills/README.md` cites `DIRECTION-BRAIN-PLAN.md` and `direction/craft/`, neither of which exists. `shots.md` cites `config/safe_zones.yaml`, which doesn't exist.
- `DIRECTOR-AND-VARIETY-PLAN.md` §8 says to extend the existing owner of each concern rather than create parallel schemas. Any new layer should respect that.

---

## 4. Gap comparison: what each source has that we lack

✓ = has it · ~ = partial · ✗ = no · — = not applicable

| Capability | Ours | juspay | Ludwig editor | OpenChatCut | claude-code-video-toolkit | explainroo | iart explainer skills | kangarooking |
|---|---|---|---|---|---|---|---|---|
| Per-shot/scene rationale or intent | ✗ | ~ (`beat`) | ✓ (`rationale`, `intent`) | — | ✗ | ? | ✓ (`VISUAL`/`KEY MOTION`) | ~ |
| Versioned director passes | ✗ | ✗ | ✓ (snapshots) | ✓ (draft/approve) | ✗ | ? | ✗ | ✗ |
| Review gate before paid/slow step | ✓ (status + QA) | ~ | ~ | ✓ | ✓ (`/scene-review`) | ? | ✗ | ✗ |
| Cheap critic on a still before the expensive step | ✗ | ✓ | ~ | — | ✗ | ✓ (stills) | ✗ | ~ |
| Continuity review with severity/priority | ✗ | ✓ | ✓ | — | ✗ | ✗ | ✗ | ✓ |
| Manifest lint (errors vs warnings) | ~ (`lint.py`) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| QC verdict taxonomy + root cause | ✗ | ✓ (`fix_instruction`) | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ (usable/partial/regenerate) |
| Resumable state + per-unit regen | ~ (hash cache) | ✓ | ✓ | ✓ | ✓ | ? | ✗ | ✗ |
| Agent operating guide / repair table | ~ (SKILL.md) | ✓ (`AGENT_GUIDE.md`) | ✗ | ~ | ~ | ✗ | ✗ | ✗ |
| Stills + contact sheet for agent review | ✓ (render QA) | ✓ | — | — | ~ | ✓ | ✓ | ✗ |
| Text overflow/small-text/TTS-pronunciation checks | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| Word-budget → seconds math, FAST/SLOW flag | ~ (`words/s`) | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Transition anchored to a named word | ✗ | ✗ | ✗ | ✗ | ✗ | ~ (word timing) | ✓ | ✗ |
| Whisper word-level timing | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| Timeline/EDL interchange | ✗ | ✗ | ✗ | ✓ (JSON, FCPXML) | ✗ | ✗ | ✗ | ✗ |
| Free/local generation path | ✗ (MiniMax) | ~ | ✗ | ~ | ✗ (GPUs rented) | ✓ | ✓ (scripts) | ✗ |

Question marks mark cells the sub-agents did not inspect.

Where we **already lead** or match: approval gates, content-hash caching, claim/URL provenance, audience-aware lint, anti-repeat variety, publish dry-run default, and a verifier whose report goes stale on any edit. Few sources match the last one.

---

## 5. Ideas worth copying (by theme)

Each idea names where it came from and what it would change. These are candidates, not decisions.

**A. Data model (the decision map the user asked for)**
1. **Shot layer under each scene**, with stable ids and fields along the lines of `shot_id, size, camera/move, duration or word-span, element list, transition_on_word` (iart storyboard card; the 14-field shot card already in our vendored `visual-skills`).
2. **`intent` and `rationale` per scene/shot**, plus a `continuity_anchor` field (Ludwig `DirectorShot`, `ShotContinuityReview`).
3. **A `style_bible` / continuity bible** injected into every scene prompt (juspay `product_bible`; DirectorSKILL's identity-string contract, already vendored).
4. **Append-only decision log** per episode: decision, alternatives considered, reason, who/what decided, affected scene ids, timestamp (standard professional "director's notes"; Ludwig's versioned snapshots).
5. **Asset manifest with cost estimate** produced *before* approval of paid stages (breakdown→asset-list from StudioBinder/Storiara; juspay's spend cap).

**B. Storyboard and animatic stage**
6. **Cheap animatic from existing data.** After TTS (cheap), render stills or placeholder cards with durations plus voiceover into one review MP4 and contact sheet *before* paid clips. This is the keyframe-first review that `v2-plan.md` step 5 describes but never built.
7. **Scene-review gate in Remotion Studio** before spending (claude-code-video-toolkit `/scene-review`).
8. **Draft → approve → apply atomically** for agent edits, so a revision lands as one reviewable change (OpenChatCut pattern).

**C. QA gates**
9. **Vision-LLM critic on a `renderStill` of one key frame per scene**, returning `{ok, score, mismatches[], fix_instruction}` with capped retries. Treat a critic failure as inconclusive rather than blocking (juspay).
10. **explainroo-style local checks:** text overflow/overlap, small-text, TTS mispronunciation, per-scene stills and contact sheet. All free and local.
11. **Manifest lint with errors vs warnings, and a verdict taxonomy** (usable/partial/regenerate plus root cause) (kangarooking `lint_shot_manifest.py`).
12. **Weighted rubric with `deal_breakers[]` and a judge-disagreement flag** (juspay `VideoScore`).
13. **Implement the checks already specified but not coded** (§3), which is cheaper than inventing new ones.

**D. Agent operability**
14. **An `AGENT_GUIDE.md`-style file:** resume rules, per-scene regenerate flag, a "symptom → fix command" repair table (juspay).
15. **Per-scene edit verbs** in the `/episode` skill (e.g. regenerate one scene, change one shot) instead of hand-editing JSON.
16. **Interface surface** of CLI + skill (+ optional MCP), as openshorts and OpenChatCut do.

**E. Timing**
17. **Word-budget math** (`words/2.3 + 0.4` s) and a FAST/SLOW words-per-minute flag per scene (iart).
18. **Whisper alignment** so captions and word-anchored transitions use real timing (explainroo).
19. **Remotion layout minimums** (84px headline, 44px support text) as lint thresholds (official skills). Our `DESIGN_SYSTEM.md` already marks the equivalent check TODO.

**F. Interchange (optional)**
20. **OpenTimelineIO export** if a hand-off to a real NLE is ever wanted. Skip until there's a use.

---

## 6. Free/local feasibility

- **Entirely free and local today:** Remotion render, ffmpeg, the offline music synth, RSS news, `lint.py`, `packaging.py`, and everything in §5 except the LLM calls that power the director and verifiers.
- **Not local today:** TTS, image, video and LLM calls all go to MiniMax. `explainroo` demonstrates a local path (Kokoro TTS plus Whisper). A local LLM for director/verifier passes would be needed for a fully offline loop; this survey did not evaluate local LLM quality for those roles.
- **Not free despite appearances:** claude-code-video-toolkit's AI generation (rented GPUs), openshorts (fal.ai, ElevenLabs, Gemini keys), the Ludwig editor and juspay (paid cloud models), video-db (paid cloud).
- **Free-tier ≠ free.** Boords has no free plan, Movie Magic has none, and Shot Designer's free tier can't save or export.

---

## 7. License and risk notes

| Source | License | Implication |
|---|---|---|
| juspay/director | none | No code reuse; ideas only |
| ai-video-production-editor | GPL-3.0 | Don't copy code into our tree |
| OpenChatCut | AGPL-3.0 | Pattern only; don't embed |
| OpenMontage (already vendored) | AGPL | Ideas only (already our policy) |
| vibe-motion/skills | none | Don't copy |
| remotion-dev/skills | not shown | Verify before vendoring |
| claude-code-video-toolkit, explainroo, iart motion-skills, director-skills, openshorts core, blender-mcp, video-db/Director | MIT | Reusable with attribution |
| Remotion itself | source-available, free for small teams | Verify thresholds at remotion.dev/license [M] |

Safety: DrawCut-PRO (above); blender-mcp's arbitrary-code tool; any repo shipping `.zip`/`.skill` binaries.

---

## 8. What was not verified

- StudioBinder free-plan limits and API scope, Storiara paid prices, Storyflow export/API, Shot Designer pricing (vendor site unreachable; store/news snippets only).
- Licenses given as [M]: Remotion thresholds, Storyboarder, tldraw, Kitsu, Dramatron, Motion Canvas, Excalidraw.
- MCP claims for openshorts and OpenChatCut come from READMEs and were not tested. OpenChatCut's maturity is unknown.
- Ludwig editor's on-disk project schema, juspay's default regeneration threshold, and whether NeuroLink can use a local LLM.
- Not inspected beyond READMEs: hyperframes, OpenMontage internals, ViMax, agent-storyboard, hyperdirector.
- No tool was executed. All behavior claims are from reading docs and source.

---

## 9. Suggested next step (for the user to decide)

This doc stops at findings. If it's useful to proceed, the natural follow-up is a **design plan** (not code) for a shot/decision layer that extends `episode.schema.json` rather than creating a parallel format, per `DIRECTOR-AND-VARIETY-PLAN.md` §8. The first fix would be reconciling the schema/renderer/lint mismatches in §3. Candidates for the first slice are the items under A, B and C in §5 that need no new paid services.
