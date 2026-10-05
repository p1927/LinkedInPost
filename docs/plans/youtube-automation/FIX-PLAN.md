# Fix plan: make the existing pipeline consistent before adding anything new

Date: 2026-10-05 · Status: EXECUTED (P0-P3, P5; P4 needed no data change), independent review done: no blocking findings; one schema cleanup applied · Scope: `video-pipeline/` + its docs
Deferred on purpose: the shot/storyboard/decision layer (research doc `docs/research/video/13-agentic-video-pipeline-tools.md`). This plan only repairs what is already there, so that layer lands on solid ground.

## 0. Ground rules

- **One owner per concern** (`DIRECTOR-AND-VARIETY-PLAN.md` §8): extend the existing schema, lint, profile and registry. Don't create parallel ones.
- **Parallel work is live.** `DIRECTION-BRAIN-PLAN.md` says another pass owns "wiring" of `director.py`, `lint.py`, `verify.py`, `run.py` and `episode.schema.json`, and `direction/craft/` is being written. Most files touched below are already uncommitted-modified. **P0 settles who edits what before any edit.**
- Never commit (project rule). Never use worktrees. Work on `main`.
- Every phase has an exit test and ends with the whole existing suite green: `run.py lint` on every episode, plus the schema check built in P1.

## 1. Issue register (each re-checked against the repo today)

Status: **V** = verified by me today · **R** = reported by the inventory, not re-checked.

| # | Issue | Evidence | Status |
|---|---|---|---|
| I1 | Schema `visual.type` enum is `clip, illustration, diagram, steps, remotion`. The renderer (`types.ts`) and ep03 also use `orbit, number, compare, photo` | `episode.schema.json` l.180; `types.ts` l.37-64 | V |
| I2 | Schema has no `additionalProperties` anywhere, so it can't catch typos. Shipped episodes carry undeclared keys (`series, status, sponsor, posts, publish, carousel, sources, structure, director_notes, voice_override, reviewed_sha256`… and ep03 mechanism keys such as `value, rings, bodies, rows`) | 0 hits for `additionalProperties`; key census | V (count) / R (key list) |
| I3 | Director prompt tells the model "use only `illustration` or `clip`", while schema and renderer allow more | `director.py` l.136 | V |
| I4 | **19 of 30** `qa_checklist.yaml` rule ids appear nowhere in `lint.py`/`packaging.py`/`verify.py`/`run.py`: `words_per_second_min, sentence_words_avg, scene_duration_max, cta_after_payoff, analogy_limitation_present, analogy_mapping_present, claims_array_present, sponsor_disclosure_present_if_sponsor, sponsor_beat_placement, character_descriptor_consistency, camera_command_syntax, hook_payoff_present, hook_length_max, format_id_valid, one_idea_field_present, scene_narration_present, scene_visual_type_valid, scene_visual_prompt_present, episode_id_unique_slug` | id grep. Caveat: some may be enforced under a different check name (the inventory saw sponsor-disclosure and `analogy.limitation` checks in lint), so P2 audits before implementing | V (by id) |
| I5 | `min_clip_scenes` (error) fails ep03: `0 clip scene(s)`. ep03 is already `rendered` and has no clips by design | `run.py lint ep03-iss-rendezvous` → 1 error | V |
| I6 | `shots.md` references `config/safe_zones.yaml`, which doesn't exist | `ls` | V |
| I7 | Status vocabularies differ: `registry.STATUSES = idea, scripted, approved, rendered, reviewed, scheduled, posted` vs `script_template.yaml` `draft \| approved \| produced \| published` | both files | V |
| I8 | `director_prompt.md` asks for `[UNVERIFIED]` claim markers, but the schema models `claims[].verified` (boolean) set by `lint.provenance` | inventory | R |
| I9 | `DESIGN_SYSTEM.md` has open TODOs: most palettes' computed contrast, shared entrance helper, `motion` block in profiles, 16:9, several transitions, headline/text-size check | inventory | R |
| I10 | `direction.skills_used[]` is promised by `direction/skills/README.md` but is in neither schema nor episodes | grep: no hits outside vendor | V |
| I11 | Stale inventory items: `direction/craft/` and `DIRECTION-BRAIN-PLAN.md` **now exist** (created by the other pass). Wiring (router, schema keys, director prompt step) is still pending per brain plan §9 phase 1. `craft/routing.yaml` and `lenses.yaml` are not present yet | `ls` | V |
| I12 | Episodes ep04–ep07 are experiment-output drafts that `DIRECTOR-AND-VARIETY-PLAN.md` §7 item 8 says to delete or rework. Also: ep07 has only 4 scenes (the schema minimum) | plan text | R |
| I13 | Legacy shapes: ep01 uses `visual.template` + `visual.props`; ep06 `s8` has a stray scene-level `term` outside `visual` | inventory | R |
| I14 | Research README index was out of date (missing 11, 12, topics file; there is no file 11 on disk although the brain plan cites "doc 11") | README | V |
| I15 | `LEDGER.yaml`: every entry `status: raw`; 75 unrated entries and 14 low-value vendored files pending review (brain plan §6 item 8) | brain plan | R |

Not issues for this plan (parked for the document review): the missing shot/frame/element layer, storyboard/animatic stage, decision log, asset manifest, free/local TTS-image-video.

## 2. Decisions the owner needs to make first

These change what "fixed" means. Recommendations are mine; none is applied.

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | `min_clip_scenes` vs ep03 and non-clip formats (I5) | (a) keep the rule, and ep03 stays failing; (b) per-episode waiver such as `format_id`/`visual_mode` exemption, or a documented `waivers: ["min_clip_scenes"]` field with a reason; (c) downgrade to warn | (b): the owner requirement was "include a Hailuo clip", but ep03 is a mechanism-diagram episode. A recorded waiver keeps the rule strict by default and makes exceptions explicit and auditable. |
| D2 | Should the Director be allowed to emit `diagram/steps/number/compare/orbit/photo` (I3)? | (a) keep restriction, hand-edit those scenes; (b) widen once schema + lint cover them (after P1) | (b), in P3 and not before, so every type the Director may emit is schema-validated and lint-covered. |
| D3 | Schema strictness (I2) | (a) strict now; (b) declare every shipped key, add `additionalProperties:false` at the end of P1, with an `x-` escape namespace for experiments | (b) |
| D4 | The 19 unreferenced rules (I4) | implement / delete / mark `enforced: false` per rule | Decide per rule in P2 from the audit table; default to *implement* the cheap mechanical ones, *delete* ones superseded by `_explanation_checks`, and mark judgment-type ones as verifier-owned. |
| D5 | ep04–ep07 drafts (I12) | delete, keep as scripted ideas, or rework | **Don't delete without your say-so.** Default: leave in place, tag `status: idea` if appropriate, and make them pass the P1 schema check or exclude them explicitly. |
| D6 | Who edits shared files now (see §0) | (a) pause the other pass on those files while this runs; (b) sequence: this plan first, the brain-plan wiring second; (c) split by file | (b) or (c). I need your call before P1 touches `episode.schema.json` or `lint.py`. |

## 3. Phases

### P0: Baseline and coordination (read-only, small)
1. Record today's baseline: `run.py lint <id>` for all 9 episodes (expect ep03 = 1 error, others to be captured), plus `git status` snapshot of the files this plan will touch.
2. Settle D6 (and D1–D5 as far as possible).
3. Capture the current set of keys actually used across `episodes/*/episode.json` and `visual` objects (script, output saved to `.omc/` or `out/`), so P1 declares the real set instead of guessing. This also re-checks the key lists I2 and I13 rely on.
**Exit:** baseline file saved; D6 answered; no repo edits yet.

### P1: Make the schema true to the renderer and the data
1. Add `orbit, number, compare, photo` to the `visual.type` enum, with per-type conditionals (required fields from `types.ts`; field docs are in `remotion-app/SCENES.md`).
2. Declare every legitimately used episode-level and scene-level key from the P0 census (I2), including the `status`/`posts`/`publish`/`sponsor`/`carousel`/`music` family. Add the pending `direction` object as optional **only if the other pass hasn't already** (I10; brain plan §5 owns the exact shape; do not diverge).
3. Add a `run.py schema-check [<id>|all]` (or fold into `lint`) that validates against the schema and exits non-zero on failure. Verify `jsonschema` is available in `.venv` first; if not, note it as a dependency decision rather than silently installing.
4. Tighten: `additionalProperties:false` at episode, scene and visual level once all 9 episodes pass (D3).
5. Fix legacy shapes: ep06 `s8` stray `term` into `visual.term`; ep01 `template/props` either declared as a documented legacy form or migrated (I13). Do not alter narration or prompts.
**Exit:** `schema-check all` passes on all episodes; renderer-only types validate; an intentional typo key makes it fail (negative test).

### P2: Reconcile lint with the checklist (I4, I5)
1. **Audit table first:** for each of the 19 rules, search for an equivalent enforced under another name (`_explanation_checks`, `packaging.py`, `verify.py`). Output a table: rule id → implemented-elsewhere / implement / delete / verifier-owned.
2. Implement the cheap mechanical rules from the table. Candidates: `scene_narration_present`, `scene_visual_prompt_present`, `scene_visual_type_valid` (now against the corrected enum), `format_id_valid`, `episode_id_unique_slug`, `claims_array_present`, `cta_after_payoff`, `words_per_second_min`, `sentence_words_avg`, `scene_duration_max`, `hook_length_max`, `camera_command_syntax` (against `shots.md`/Hailuo command list).
3. Delete or mark non-mechanical ones (`character_descriptor_consistency`, `hook_payoff_present`) as `check: judgment` owned by `verify.py`, so the checklist stops claiming enforcement it doesn't have. Keep one source of truth: add an `enforced_by: lint|verify|none` field per rule and a test that fails if a rule claims `lint` but has no code.
4. Apply D1 for `min_clip_scenes` (waiver mechanism + reason, with the waiver recorded in the episode, not in lint code).
5. Re-run all episodes; triage any new failures as real findings, not by loosening thresholds.
**Exit:** every checklist rule is implemented, verifier-owned, or removed; the consistency test passes; ep03 lints clean through its recorded waiver (or per D1); no threshold was weakened to get green.

### P3: Config, docs and vocabulary consistency (I6–I9, I14)
1. Create `config/safe_zones.yaml` from the constants already in `shots.md`/`DESIGN_SYSTEM.md` §4 and point both docs and any code at it (one owner for the numbers). Note the research doc flagged safe-zone figures as conflicting across third-party sources; keep the existing chosen values and mark them as such.
2. Align status vocabulary: make `script_template.yaml` use `registry.STATUSES` (or drop the field from the template).
3. Resolve `[UNVERIFIED]` vs `claims[].verified` (I8): pick the schema field as truth and update `director_prompt.md`'s Director Notes wording, or map one to the other explicitly.
4. Work the `DESIGN_SYSTEM.md` TODO list (I9): triage into *do now* (computed contrast for existing palettes, headline/text-size lint) vs *later* (16:9, extra transitions), and mark each with an owner. Do not start 16:9 work in this plan.
5. Apply D2: widen the Director prompt types only after P1/P2 pass.
6. Research README: make the index complete and honest about the missing file 11.
**Exit:** no doc points at a nonexistent file or a conflicting vocabulary (a grep-based link check script run once); safe-zone values live in one file.

### P4: Episode data hygiene (I12, I13)
1. Apply D5 for ep04–ep07: nothing deleted without approval. Each must either pass `schema-check` + `lint` or be explicitly marked as excluded draft.
2. Confirm ep07's 4-scene length is intentional or fold into the lint threshold decision (`scene_count_range` is 4–16).
3. Verify no episode that is `posted`/`rendered` had its content changed (`reviewed_sha256` / script fingerprint unchanged). The fixes above are structural and must not alter shipped content.
**Exit:** all episodes classified (valid / excluded draft / deleted-with-approval); fingerprints of posted and rendered episodes unchanged.

### P5: Regression guard
1. One command (`run.py selfcheck` or a `tests/` script) running: schema-check all, lint all, checklist-vs-code consistency, doc link check. Fast and free (no paid API calls).
2. Add it to the `episode` skill's pre-approval step so agents run it.
**Exit:** one command, green from a clean shell; deliberately breaking each guarded item makes it red.

## 4. Order, size and risk

| Phase | Needs decisions | Touches shared files | Risk |
|---|---|---|---|
| P0 | D6 | none | none |
| P1 | D3, D6 | `episode.schema.json`, `run.py`, 2 episode files | medium: strictness can reject real data. Mitigated by the P0 census and negative tests. |
| P2 | D1, D4 | `lint.py`, `qa_checklist.yaml` | medium: new errors may fail existing episodes. Triage as findings. |
| P3 | D2 | docs, `director.py` prompt, new config | low |
| P4 | D5 | episode data | low if nothing is deleted |
| P5 | none | `run.py` or `tests/` | low |

Dependencies: P1 → P2 (`scene_visual_type_valid` needs the true enum) → P3 item 5 (widen Director). P3 items 1–4,6 and P4 can run alongside P2.

## 5. Explicitly out of scope here
- Shot/frame/element layer, storyboard/animatic, decision log, asset manifest (document review comes next).
- Distilling craft cards, router, `direction find` (brain plan phases 1–3; this plan must not collide with it).
- Free/local TTS, image or video providers; paid-generation changes; publishing.
- Committing anything.

## 6. Execution log and adaptations (2026-10-05)

Owner approved the recommended decisions (D1 waiver, D2 widen after coverage, D3 declare-then-strict, D4 per-rule, D5 leave drafts, D6 this plan first). The plan was adapted to what had changed since it was written:

**Adaptations to existing changes**
- I11 resolved by the other pass: `direction/craft/` and `DIRECTION-BRAIN-PLAN.md` now exist, and so does research doc 11. The new `direction`/`shot` schema keys from brain plan section 5 were NOT added here; with strict mode on, that pass adds them to `episode.schema.json` (use the `x-` escape for experiments until then).
- The other pass kept creating episodes during this work (`ep09-unemployment-rate-actually` appeared). It is a draft, validates against the schema, and reports its own lint errors without gating (selfcheck gates only `approved`+ episodes).

**New issues found while executing**
- N1 `director.py` imported `jsonschema`, which was missing from the project venv, so `run.py director` crashed at import. Fixed: `uv pip install jsonschema` into `.venv` (no requirements file exists; there is nowhere else the dependency is recorded).
- N2 `lint.py` silently fell back to built-in defaults if `qa_checklist.yaml` failed to parse. Now only a missing file falls back; a malformed one raises. (This caught my own YAML edit mistake immediately.)
- N3 Three different safe-zone boxes exist (spec, renderer, old shots.md); see open item S1. Resolved 2026-10-05 (`shorts_9x16_platform`).
- N4 `run.py director --help` is not a help flag; it starts a real run. Not changed, but do not use it (see open item S3).

**Done**
| Phase | Result | Evidence |
|---|---|---|
| P0 | Baseline + key census saved to `.omc/fixplan/` (`baseline-lint.txt`, `key-census.txt`, pre-change copies of the schema and checklist) | baseline: ep01 v1 and ep03 had 1 lint error each |
| P1 | Schema accepts all 9 renderer visual types with per-type required fields; every shipped key declared; strict (`additionalProperties:false`, `x-` escape); `status` enum; `waivers` field; `run.py schema-check [id\|all]`; one validator shared by director and lint (`lint.schema_issues`). Data fixes: ep02 `analogy.mapping` to pairs, ep06 `s8` stray `term` moved into `visual.term` (ep06 is `scripted`, renderer ignored the old position) | 10/10 episodes pass; 8 negative tests (typo keys, bad type, missing per-type field, bad status, short waiver reason) rejected, `x-` key accepted |
| P2 | Audit of 19 unreferenced rules: 12 implemented in lint (`words_per_second_min`, `sentence_words_avg`, `scene_duration_max`, `hook_length_max`, `cta_after_payoff`, `sponsor_beat_placement`, `analogy_limitation_present`, `analogy_mapping_present`, `camera_command_syntax`, `format_id_valid`, `one_idea_field_present`, `episode_id_unique_slug` uniqueness), 4 enforced by the schema, 1 renamed to the id lint emits, 1 superseded (`hook_payoff_present` by `loop_paid_off`), 1 planned with an owner (`character_descriptor_consistency`). Every rule now has `enforced_by`. Waivers added (D1): ep03 `min_clip_scenes`, ep01 v1 `sentence_words_max` (waived issues print as WAIVED and never block) | no unwaived lint errors on any episode; no threshold was changed |
| P3 | `config/safe_zones.yaml` created (three labelled sets); `script_template.yaml` status vocabulary now `registry.STATUSES`; `[UNVERIFIED]` wording replaced by the pipeline's `claims[].verified` semantics; DESIGN_SYSTEM TODOs triaged (section 10: all are unbuilt spec, none an inconsistency); Director may now emit `steps`, `number`, `compare` (D2; `diagram`/`orbit`/`photo`/`remotion` stay hand-authored); research README index completed | director module imports; **the widened prompt was not exercised with a paid LLM call, so its output quality is untested** |
| P4 | No data changes needed: ep04-ep09 all pass the schema; drafts left in place (D5); ep07's 4 scenes is within the schema/lint bounds. No posted/rendered episode's narration or visuals changed (`reviewed_sha256` hashes the rendered video; `verify.fingerprint` does not include `waivers`) | |
| P5 | `run.py selfcheck` (schema, lint gate, checklist-vs-code, doc references) added to the `episode` skill (both copies identical); deliberate-break tests: unemitted id, invalid `enforced_by`, missing doc target, typo key, approved-with-error, waiver all behave | exit 0 on the real tree |

**Findings surfaced, not fixed (they are real, not noise)**
- `scene_duration_max`: 16 scenes across episodes hold one visual longer than 8 s (ep08 has two at ~18 s, ep06 s9 ~13.6 s). This is the checklist's own threshold. Whether it should instead follow each audience card's `scene_len_sec` is open item S2; the real fix for long holds is the shot/element layer (deferred).
- `hook_length_max`: ep02 (16 words) and ep03 (19 words); `one_idea_field_present`: ep03 has no `one_idea`.

## 7. Open items: decisions taken (2026-10-05, owner: "go with recommended; decide from common sense")

| # | Decision | Outcome |
|---|---|---|
| S1 | Safe zones depend on the media type, so they come from presets chosen by the profile, not from scene code | DONE. **Update:** after this round another session built on the mechanism: it added the researched preset `shorts_9x16_platform` (x 90-990, y 250-1460, caption/right-rail rules), made it the default, pointed all four profiles at it, and extended the renderer (orbit scene, captions, term sticker) to read the zone. So the profiles no longer use `shorts_9x16`, which is kept as the superseded preset all earlier renders used. The pixel-identical proof below applies to `shorts_9x16`, not to the new default: new or re-rendered episodes will look different by design. Original round:  `config/safe_zones.yaml` has presets (`shorts_9x16` default = what all episodes were built against; `shorts_9x16_strict`; `longform_16x9`, spec-only). Profiles name one with `safeZone`; `run.py safe_zone()` resolves it into `props.profile.safe`; `NewScenes.tsx` (diagram/steps/number/compare) and the `Episode.tsx` progress bar read it. Defaults equal the old hard-coded values: 4 ep03 stills (number, compare, steps, compare+progress bar) are **pixel-identical** before/after, and the strict preset renders differently (so the values are really read). Not parametrized: `OrbitScene.tsx` (absolute geometry drawn for shorts_9x16), thumbnails/carousel. No automated position-vs-preset lint yet (needs element data). **RESOLVED 2026-10-05 (numbers):** value of record = new preset `shorts_9x16_platform` (now `default`, used by all four profiles), researched from platform overlays (Google Ads vertical template [V] measured x 48-887 / y 288-1247; TikTok in-feed templates [W]; Meta Reels ads 14%/35%/6% [S]): text x 90-990, y 250-1500, right-rail notch x > 880 below y 840, captions `bottom` >= 420 in x 180-900, progress top 140, art bleed x 24-1056 / y 120-1800. Renderer now also derives caption bottom/inset, term sticker, photo label/lower-third and OrbitScene headline/readout/note from `safe`; profiles' caption `bottom` 420. `safe_zones.py` (load/preset/box/violations) for a future lint. Follow-up same day: compare columns, ground-track map, orbit readout/note, cannon legend and diagram reveal caption now clear the right rail and a 2-line caption page (verified on ep03 stills; default-preset stills pixel-identical). Still open: OrbitScene body labels (collision-placed), diagram column-layout node y, 3-line caption pages. **Follow-up 2 (2026-10-05): DONE.** OrbitScene body labels + gap badge clamped to safe sides/top and the rail notch (mapped through the diagram scale); diagram row/column/grid node positions derive from `safe` (lowest node ends above a 2-line reveal caption; row moves above the rail); cannon legend block stops at the rail; steps/number label+source/photo lower-third stop at the rail; term card follows safe.left; sparkles pulled inside the art-bleed box. Default-preset geometry unchanged except the auto-grid diagram fallback (x 160-920 -> 170-910) and sparkle x. **Automatic check:** `tools/check_safe_zones.py` renders stills of a `SafeProbe` composition (Episode + DOM probe, `remotion-app/src/SafeProbe.tsx`, driver `remotion-app/scripts/safe-probe.mjs`, existing Remotion deps) at hook / each scene mid + settled / render_qa times, measures every visible text box (HTML + SVG) and `data-safe-kind="art"` boxes, runs `safe_zones.violations()`, writes `out/<id>/safe_zone_report.json` + overlay PNGs; `verify.render_qa` includes it (error: top band / sides; warn: rail / bottom / art). ~10-13 s per episode. Results: ep03 (props patched to the current preset) 28 frames, 0 issues; ep02 (patched, storybook-v2) 0 errors, 3 rail warnings from caption words; synthetic bad diagram flagged (top band, sides, rail). Not checked: text baked into images/clips, non-text key-subject boxes, unsampled frames. Open: `caption_inset` 180 vs rail 880 conflict (caption lane edge x 900). |
| S2 | `scene_duration_max` follows the audience card | DONE. Uses `scene_len_sec[1]` (kids 6 s, curious_adult 8 s, older_adult 10 s, techie 6 s); flat 8 s only without an audience. Kids episodes are now judged stricter than before. |
| S3 | Real guard for `run.py director` | DONE. `director.check_args()` rejects `--help`/`-h` (prints usage), unknown flags, stray words and missing values before any network or LLM call. Verified in-process (11 cases). |
| S4 | Dependency manifest | DONE. `requirements.txt` frozen from the working venv; rebuilt in a throwaway venv and the lint/director/selfcheck modules import. |
| S5 | Content fixes to rendered/posted episodes (ep02/ep03 hooks, ep03 `one_idea`) | Still not done: changes narration of a rendered episode. Left for an explicit request. |

Also found and handled in this round: the other session added the checklist rule `positive_phrasing` (implemented in `lint.py`) without `enforced_by`; `selfcheck` flagged it, and `enforced_by: lint` was added to that rule.
Honest note on a mistake: an earlier `run.py director --help` I ran to test imports started a real run (news intake, then LLM topic-pick) before I killed it; `out/director_candidates.json` may have been rewritten (a regenerable cache) and a cheap LLM call may have been made. No episode was created by it. The new guard prevents a repeat.
