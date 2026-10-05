# Direction brain plan: many ways to direct, chosen by the agent

Status (2026-10-05): **consolidated and wired.** Vendored sources are indexed and superseded by `direction/craft/` (214 cards, 8 dialects); `brain.py` + `run.py direction` (lookup), `routing.yaml` (stage/mode load map), schema keys (`direction`, `continuity`, `scenes[].shot`), `director.py` (mode choice + per-mode pack), `lint.py` (`dir_*` rules) and `verify.py` (realism pass) are in. **Not done:** Remotion support for freeze-rewind / j-cut / question-card bridges (phase 4), a first real cold-open episode (phase 2 A/B), human calibration of all proposal-level budgets. Sections 3-6 below keep the original design; section 11 is what was actually built.
Evidence: `docs/research/video/11-direction-skills-landscape.md` (what exists), `12-cinematic-craft-for-ai-directors.md` (craft, archetype cards, realism checklist, model dialects), `08`/`10` (earlier skills research). Parent plan: `DIRECTOR-AND-VARIETY-PLAN.md` (one owner per concern; `director.py` stays thin).

## 1. Goal
The director agent should be able to direct an episode in different ways and pick the way itself: a plain explainer, a dramatized cold open (a 5-20 s mini movie scene that hooks, then an explainer payoff), a hybrid, a montage, a documentary treatment. Creative freedom is the point; the guard rail is **coherence with real life and real film grammar** (continuity, geography, eyelines, lighting source, physics, scale), enforced by checks rather than by narrowing the menu.

## 2. What exists now (done)
| Item | Where | Notes |
|---|---|---|
| 6 third-party repos vendored as inert text | `video-pipeline/direction/skills/vendor/<repo>/` | pinned SHA, licence kept, `VENDOR.md` per repo, `SKILL.md` renamed `SKILL.ref.md`, scripts/installers/CI/plugin manifests/binaries/settings stripped, remote-install and paid-API steps neutralized. Repo stays private |
| Ledger (203 entries, ~860k tokens of text) | `direction/skills/LEDGER.yaml` | id, repo, path, kind, stage, summary, use_when, tokens, quality, status. 75 entries auto-indexed from headings with `quality: null` (unreviewed) |
| Top ideas per source | `direction/skills/best_ideas.yaml` | what to distil first |
| Agent-facing usage contract | `direction/skills/README.md` | progressive disclosure, precedence, safety rule |
| Security audit per repo | scratchpad `audit/*.security.md` (not committed; summarized in section 7) | |

Vendored: DirectorSKILL (MIT), drama-director-skill (MIT), visual-skills (CC BY 4.0, credit kept), ai-video-generator-claude (MIT), higgsfield-ai-prompt-skill, higgsfield-ai/skills (video-explainer, youtube-thumbnail, generate references only). **Not vendored: `Jv1337x/ai-film-skills`**: that copy ships `ai_film_skills_v3.9.zip` (Application.cmd + util.exe) behind "Download Now" links, and names `62656456/ai-film-skills` as the real upstream. Its ideas are distilled from the audit only.

## 3. Direction modes (the menu the agent chooses from)
| Mode | Shape | Typical use | Primary skills (ledger ids to filter on) |
|---|---|---|---|
| `explainer` | current pipeline: hook, analogy, mechanism, payoff | most episodes | existing `direction/*.md`; `avg-faceless-channel`, `hfs-video-explainer` |
| `cold-open-drama` | 5-10 s (Short) / 10-20 s (long) dramatized scene, bridge, explainer | stakes-heavy topics (rates, ISS, bank runs) | doc 12 archetype cards, `dsk-*` lenses, `ddr-archetype-router`, `hf-scene-engine`, `hf-shotlist-director` |
| `hybrid` | drama beat at hook AND again at the payoff (Opening/Final Image pair) | flagship episodes | both of the above + callback rule |
| `montage` | pattern-driven cut sequence | timelines, "history of" | `vsk-patterns-genres`, Murch rubric |
| `documentary` | observational/archival feel | news-driven topics | `dsk-genre-playbooks` (documentary section) |
Mode is chosen per episode by the director from topic + audience card + `variety()` (anti-repeat, same mechanism as format/analogy domain). The owner can force a mode (`--mode`).

## 4. Architecture (one owner per concern)
```
direction/skills/LEDGER.yaml      index of everything (raw, third-party)
direction/skills/vendor/          inert reference text (read-only)
direction/craft/                  OUR distilled cards (the thing agents load by default)
   modes.yaml        mode definitions, when to pick, beat structures, word/time budgets
   archetypes.yaml   scene archetype -> shot recipe -> AI-safe tactics -> bridge-out (from doc 12, drama-director, higgsfield)
   lenses.yaml       6-8 director "looks" as OBSERVABLE parameters (palette, lens, move, pacing, light ratio), never "in the style of <name>"
   realism.yaml      22+ check items with severity (spatial/temporal/physical/performance/editing/audio/factual)
   dialects/<model>.md  Hailuo/Kling/Veo/Seedance/Runway/Wan: syntax, length, camera tokens, pitfalls, `verified_on` date
   routing.yaml      mode/stage/beat -> ledger ids + craft cards to load (the Load Map)
director.py   unchanged in spirit: assembles prompt from audience card + mode + routed cards
```
**Router (deterministic, not browsing):** `python run.py direction find --stage shotlist --mode cold-open-drama --beat reveal --audience kids` returns the craft cards and at most 3 ledger paths. Rule borrowed from higgsfield-ai-prompt-skill: load no more than the routing row names; say which cards you used.
**Precedence:** owner/audience card > `psychology_rules`/`DESIGN_SYSTEM`/`qa_checklist` > `craft/` > `vendor/`. Higgsfield's conflict-order idea: explicit direction beats archetype beats default; surface non-obvious resolutions in `director_notes`.
**Roles (one agent, several passes, separate verifier):** Director (mode, story), Production designer + DP + gaffer (look, lens, light), Editor (cuts, bridge), Sound, Script supervisor (= `verify.py` continuity/realism pass). Pattern from HEOJUNFO/ai-film-crew and FilmAgent; writer pass and reviewer pass stay separate (repo rule).

## 5. Schema + enforcement (so creativity cannot become incoherence)
Additions to `episode.schema.json` (optional first, required once calibrated):
- `direction`: `{mode, lens, skills_used[] (ledger ids), cold_open: {archetype, duration_s, bridge: freeze-rewind|j-cut|match-cut|question-card|pull-back|narrator-step-in}}`
- per scene `shot`: `{size, angle, move, lens_mm, axis_side, eyeline, light_source, continuity_ids[], archetype}`
- `continuity`: identity strings (verbatim in every prompt), location ids, state-change ledger (DirectorSKILL continuity bible, ai-film asset ids)
`lint.py` (mechanical): wide-first opening, no 3 identical sizes in a row, dual-contrast cuts (scale AND camera character change), one dominant move and one action per clip, clip length vs model limit, identity string present verbatim, no text in image prompts (exists), cold-open length budget, hook payoff/callback present.
`verify.py` (judgment, independent prompt): realism checklist over the shot list (axis/eyeline/lighting source/physics/scale/geography), Murch Rule of Six as cut rubric, scene-engine gate on the cold open (goal, obstacle, tactic, reversal, value shift), "would a viewer call this fake?". Same fingerprinted `qa_report.json`; start with LLM review of the text plan plus a human look at the contact sheet (whether an LLM can judge eyelines from frames is untested).
Failure handling: DirectorSKILL triage tree (change one variable per retry, three-strike rule, cost ladder: fix in edit before regenerate). Paid generation stays behind the approval gate.

## 6. Distillation backlog (priority order; each becomes a `craft/` card, status raw -> distilled)
1. `archetypes.yaml` from doc 12 (11 cards) + drama-director router + higgsfield scene archetypes (A/B-test each against the realism checklist).
2. `realism.yaml` from doc 12 section 4 + DirectorSKILL `failure-modes` F1-F19 + `qc-checklist`.
3. `modes.yaml` + cold-open budgets (doc 12; budgets are proposals, untested) + bridge techniques.
4. `lenses.yaml`: pick the lenses that suit hooks (Hitchcock, Fincher, Villeneuve, Nolan per audit) and translate to parameters; kids and adult variants.
5. `dialects/hailuo.md` first (our provider), merge with `hailuo_cookbook.md`; re-verify against vendor pages (several vendor pages were unreachable in research). Others only when we use them.
6. Continuity pack: identity-string contract, canon frame, one-action-per-clip (DirectorSKILL, Nagacash).
7. Editing pack: Murch rule of six, dual-contrast cutting, J/L cut done in editor not model.
8. Review the 75 unrated ledger entries and 14 vendored low-value files; delete or rate.

## 7. Safety review results (summary)
- Prompt-injection: none found in the six vendored repos (no hidden/zero-width text, no "ignore previous", no secret reads, no telemetry). Risky surface was executable/config, all stripped: Atlas Cloud API clients, `install.py` that `rmtree`s into the Claude skills dir, a `.claude/settings.json` pre-approving `git push`/`python3`/`gh`, a "run automatically and silently" recall skill, `curl | sh` Higgsfield CLI installs, `.claude-plugin` auto-registration.
- Residual: remaining text is still LLM instructions. Mitigations: `VENDOR.md` + README contract (data, not instructions), non-skill path, `.ref.md` rename, ledger lists provenance. Re-scan on any upstream refresh (pinned SHAs; no auto-update).
- Licences: all six have LICENSE files and the repo is private; visual-skills needs attribution (kept). Keep the repo private or re-check before publishing.

## 8. New sources found by research, NOT yet vendored (need owner OK; each is another download)
Nagacash/narrative-film-direction + character-continuity-skill (CC-BY; five coherence rules), Square-Zero-Labs/video-prompting-skill (Apache; per-model dialects incl. MiniMax H3), phileiny/h3-storyboard-skill (MIT; Hailuo/H3 one-beat-per-shot finding), HEOJUNFO/ai-film-crew (MIT; role split), KeWang0622/ai-film (MIT; failure catalogue; skip installer), vyralcontent/content-skills (MIT; hooks), whystrohm/shotkit (Apache; shot schema + verdicts). Reject: no-licence/AGPL repos, content-farm guide sites, installer-heavy repos, the lure-copy ai-film-skills. Details and licences in doc 11.

## 9. Phases
1. **Wire** (small): `direction find` command + `routing.yaml`; add optional `direction`/`shot` schema keys; director prompt gains a "choose mode, load routed cards, record skills_used" step. No behaviour change when mode=`explainer`.
2. **Distil** backlog items 1-3, then re-direct ep03 (ISS rendezvous) as `cold-open-drama` vs current, compare lint, verify, contact sheets, human taste.
3. **Enforce**: lint rules and verifier realism pass; calibrate which become errors.
4. **Cold-open rendering**: Remotion handling for bridge techniques, audio J-cut, clip-length limits per provider; budget impact (AI clips cost more than illustrations).
5. **Grow**: vendor the section-8 sources if wanted; add usage logging (which cards get loaded) and prune unused; routing evals.

## 10. Open decisions
- Cost: dramatized openings use more paid clips per episode. Cap per mode?
- Kids audience: which archetypes are allowed (no pursuit/duel peril for kids card?) - proposal: allowlist per audience card.
- Vendor the section-8 repos now or distil from doc 11 only?
- Real GitHub forks (public under your account) were NOT created; vendoring in this private repo gives the same content. Say so if you also want forks.

## 11. What was built (2026-10-05) and how to use it
**Library** (`video-pipeline/direction/craft/`, one owner per concern; spec in `CRAFT-SPEC.md`): `modes` (5 modes, hooks, bridges, selection), `archetypes` (20), `grammar` (shots, camera, light, staging, genre, lens picker), `lenses` (10 observable-parameter looks), `continuity`, `realism` (28 checks), `triage` (failure/cost ladder), `editing`, `prompting`, `plan` (shot-plan/beat-sheet/director-book mapped to episode.json), `flow` (director workflow, roles, gates), `routing.yaml`, `dialects/` (Hailuo authoritative; Kling, Veo, Seedance, Runway, Wan, keyframe-image). Third-party originals stay in `direction/skills/vendor` (archive) and `LEDGER.yaml` records `superseded_by` / `archived_reason` for each; `python run.py direction coverage` is the gate (exit 0: 0 quality>=4 entries uncovered; 380 entries: 142 superseded, 78 archived, 161 raw low-value).
**Commands:** `python run.py direction modes | list | find --stage S --mode M --audience A --text T | card <id> | pack <stage> --mode M --audience A | coverage | ledger-sync | check`.
**Director:** `python run.py director [--mode explainer|cold-open-drama|hybrid|montage|documentary]`. Step 1 `choose_mode` (cheap LLM call over the mode menu + allowed modes from `brain.allowed_modes`: max 2 drama-family episodes in the last 5; owner `--mode` overrides). Step 2 loads only that mode's script + shotlist packs (~4-9k tokens) and the blocker realism cards. Repairs keep the draft's mode. Cold-open bridges the renderer supports today: narrator-step-in, match-cut, pull-back (others warn in lint).
**Enforcement:** `lint.py` `_direction_checks` (only when `direction` is present; legacy episodes untouched): skills known, cold open present/budget (Short 5-10 s, long 10-20 s)/scenes first/archetype allowed for audience, bridge renderable, paid-clip cap per mode, wide-first, size variety, identity string verbatim, no named-director prompts. `verify.py` realism pass (4th pass) judges the text shot plan against `real-*` cards (blocker fail = error, major = warn, plus "would a viewer call this fake"); fingerprint covers the shot plan only for directed episodes. Frames-level review remains a human contact-sheet check.
**Open owner decisions (carried from the distillers):**
1. DESIGN_SYSTEM.md says one visual dialect / no mixed styles; `cont-style-bridge` proposes per-segment dialects joined by a declared bridge. Default stays: cold open uses the explainer's medium with cinematic grammar (always for kids). Amend DESIGN_SYSTEM before photoreal cold opens.
2. `providers.yaml` calls MiniMax-Hailuo-2.3 (v1; no last frame, no negative prompt, no audio); research docs mention H3 (v2). H3 would need a new adapter. Prompts in existing episodes use negations ("no writing on the sign") that no provider honours: rewrite positively (`fail-describe-dont-negate`).
3. Keyframes are 720x1280 but Hailuo outputs 768x1364: request 1152x2048 without aspect_ratio; adapter does not use image-01 `subject_reference`; `adapters.video_veo` is referenced but missing; A/B test `prompt_optimizer`.
4. Safe-zone values conflict across three sets (`safe_zones.yaml` value_of_record used; owner item S1).
5. Seedance age-word handling (if ever wired) vs honest ages; mask-composite tool step does not exist; Seedance/H3 findings are not measured on 2.3.
6. Cost cap per mode, kids archetype allowlist (implemented as card `audience_fit` + `kids_variant`; confirm), and whether to vendor the section-8 repos or rely on doc 11.
7. Schema extras proposed by plan/flow cards (`shot.function`, `risk`, `trim`, `direction.beat_sheet`, `direction.book`) are accepted today (objects allow extras) but nothing reads them.
**Next:** phase 2 A/B (re-direct ep03 as cold-open-drama, compare lint/verify/contact sheet), phase 4 Remotion bridges, usage logging (`out/<id>/direction_log.jsonl`) and routing evals.

## 12. Second wave (2026-10-05, later): style envelope, H3, safe zones, 8 more sources
- **Style resolution (answers open decision 1).** Style resolves down a chain, each layer only narrowing the one above: DESIGN_SYSTEM (new section 11) > profile (`config/profiles/*.json` `direction: {look, dialects}`) > audience card (`direction: {modes, dialects, lenses, cold_open_max_s}`) > craft cards > director. `brain.style_envelope(audience)` computes the intersection; `director.py` injects it as a binding block; `lint.py` enforces `dir_mode_allowed`, `dir_style_segment`, `dir_lens_allowed`, `dir_cold_open_audience_cap`, `dir_style_bridge`. Dialects: `native` (audience illustration style; always) and `cinematic` (graded AI clips in a declared segment + bridge; only explainer-clean and explainer-bold profiles and the curious_adult/techie cards allow it today; kids and older adults stay native). The audience-card policies are PROPOSALS: edit `direction/audiences/*.yaml` to change them.
- **Video model (answers open decision 2).** Verified on the vendor pages 2026-10-05: latest is MiniMax-H3 (released 2026-07-31); Hailuo 2.3 is legacy. `config/providers.yaml video:` now uses H3 on the v2 endpoint (768P, 6 s, 9:16; about $0.48 per clip vs about $0.28 for 2.3); `MiniMax-Hailuo-2.3` remains a one-line fallback. No negative prompt field; last_frame verified (not used by run.py yet); native audio is ignored (Remotion mutes clips). Keyframes request 1152x2048 (no aspect_ratio); optional `subject_reference` supported by the adapter, not yet used by `run.py`. Lint `positive_phrasing` (warn) flags negated prompts (2 hits across all episodes). NOT yet tested with a real paid call: first clip needs an ffprobe check of size/length and an account on the pay-as-you-go plan. Open A/B: bracket camera tokens vs natural-language camera sentences vs full Context-IR format; whether `/v2/video_generation` runs IR internally is undocumented.
- **Safe zones (answers open decision 3).** Researched (YouTube official ad overlay [V], TikTok/Meta third-party and ads guidance [W]/[S]); decided preset `shorts_9x16_platform` is the default: text/key subjects x 90-990, y 250-1460 (band), nothing at x>880 below y 840, captions bottom >= 420 within x 180-900, progress bar top 140. Profiles, renderer (compare, orbit, term stickers, captions, diagram reveal) and docs updated; `safe_zones.py` has `load/preset/box/violations`. Large captions (size >= 72) now split pages at 4 words. Residual: orbit body labels placed by collision code, diagram node positions and cannon legend widths are not zone-checked; no automated element-position check in lint/verify yet (use `safe_zones.violations`); real `out/ep03/props.json` not rebuilt.
- **Eight more sources vendored and distilled**: narrative-film-direction and character-continuity-skill (CC-BY-4.0 attribution recorded in VENDOR.md), h3-storyboard-skill, video-prompting-skill, shotkit, content-skills (vendor-pitch sections removed), ai-film-crew, ai-film. 7 new cards + many extended (stranger audit, lint-before-spend, reuse-before-generate, verdict scheme, FULL/TIGHT identity strings, drift audit, additive expressions, leakage sweep, retention shapes, hook tests, read-twice text timing). 63 platform-specific/off-target/unsafe entries archived with reasons. Packaging items routed to `packaging.md` (DONE 2026-10-05): bait-phrase lint list (`packaging_bait`), Short-to-long-form bridge (`bridge_pointer`), CTA by content type (`cta_content_type`, `cta_recipient`), pinned comments (`pinned_comment`), Engaged Views / metrics honesty, inauthentic-content note, three-surface keyword agreement (`keyword_surfaces`); tests in `video-pipeline/tests/test_packaging.py`.
- **Still open:** Remotion bridges (freeze-rewind, J-cut, question-card); first real cold-open episode and the ep03 A/B; `run.py` passing `last_frame`/`subject_reference`; adapter for a second video provider; owner review of all proposal-level numbers; DESIGN_SYSTEM section 2 palettes still TODO for storybook-v2.

## 13. Third wave (2026-10-05, end of day): from design to a tested director
- **Real end-to-end runs** (script stage only; details and numbers in `DIRECTION-AB-ep03.md` sections 1-7) found ~40 pipeline bugs; three fix rounds closed them: forced mode vs audience envelope (now refused before any network call; `--force-mode` overrides), schema-derived writer skeleton and example, recipe/lens/bridge cards and the H3 dialect reach the writer, atomic id reservation and early `sources.json`, source relevance-before-authority ranking and `--source`, short source ids (the model never types URLs), separate mechanical/semantic repair budgets with a 300k token cap, patch-style repairs (-61% tokens), timeout retry + resumable `out/<id>/director_state.json`, an analogy pre-check, restore-invalid-fields after repairs, verify always runs, schema and lint errors reported together, cold-open narration rule consistent across schema/lint/director, fuzzy quoted-evidence rule and deterministic judge settings, camera-move mismatch, dialect/style-segment coverage, skills-honesty, positive phrasing, CJK guard, SSRF guard + body cap on every page/asset fetch.
- **Built**: all six cold-open bridges render (Remotion), `last_frame` / `subject_reference` plumbed with a cost gate (`max_clip_cost_usd`, `--force-cost`), safe-zone preset `shorts_9x16_platform` with a DOM-measured render check, packaging lint (bait phrases, CTA fit, pinned comment, keyword agreement), `run.py manifest` (free build plan; now guarded against writing real files).
- **Verified**: 212 unit tests, selfcheck 8/8, tsc clean, 214 cards, coverage gate 0, legacy ep01-ep09 lint unchanged. Two independent code reviews: 0 blockers after fixes.
- **Honest status**: the director gets the structure right on the first draft; CONTENT quality is still LLM-limited. Drafts ep14-ep17, ep19 (test artifacts) would not pass a human reviewer (wrong analogies, weak realism details); none approved, rendered or published. No paid media (TTS/image/clip) has ever been generated by this work, so H3 output size/length, the keyframe size 1152x2048 and the bracket-vs-natural camera A/B remain UNTESTED (protocol prepared in the AB doc section 5, about $4.32 for 9 clips).
- **Next**: owner reviews proposal-level policies (audience direction policy, cost caps), approves the first H3 spend (one clip + ffprobe), re-runs a drama draft with the round-3 fixes, deletes throwaway drafts ep14-ep17/ep19 when done, fixes remaining verifier determinism.

- **H3 live smoke test (2026-10-05, owner approved H3 for all MiniMax video):** one keyframe + one 6 s clip: keyframe exactly 1152x2048; clip 768x1344 at 24 fps, 6.583 s, with an audio stream, about 175 s per clip, prompt followed (push-in + action). Recorded in dialects/hailuo.md section 0-measured. Still open: bracket-vs-natural camera A/B (not run, about $4.32), pipeline-level handling of 6.58 s clip length and 768x1344 cover-crop in Remotion (verify in the first real episode build).
