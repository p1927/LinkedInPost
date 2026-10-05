# Storyboard and decision map: design and plan

Date: 2026-10-05 · Status: S1-S5 built and tested (S3-S5 on 2026-10-05, after a reuse survey) · Inputs: research `docs/research/video/13-agentic-video-pipeline-tools.md` (tool survey), `FIX-PLAN.md` (consistency pass), `DIRECTION-BRAIN-PLAN.md` (other pass)

## 1. The ask, restated
A structured map of every decision: scene by scene (and frame by frame where the visual has frames), what is shown, why it is shown, how the story flows. It must be free and local, run autonomously, and be easy for an agent to edit when the owner asks for a change.

## 2. Principles (from the survey and the repo's own rule "one owner per concern")
1. **`episode.json` is the only authored source.** The map, animatic, manifest and any export are generated from it, so nothing can drift. (OpenChatCut's single-JSON-timeline idea; the repo rule against parallel schemas.)
2. **Decisions leave a trail without extra work.** Edits go through one command that validates, requires a reason, and logs. (Ludwig editor's versioned director passes and per-shot `rationale`; juspay's resumable state.)
3. **Gates before spend.** Everything cheap and visual is reviewable before paid generation. (claude-code-video-toolkit's scene-review gate; juspay's critic on the still before the expensive step.)
4. **Extend, don't fork.** Use the existing optional keys `direction`, `scenes[].shot`, `continuity`, and the `director_notes` convention (`ASSUME/RULING/DEVIATE/WORKAROUND`). Do not add a parallel file format.

## 3. What exists (verified 2026-10-05)
| Layer | State |
|---|---|
| Planning knowledge | `direction/craft/*.yaml` (about 4,400 lines): beat sheet, director's book, shot plan fields, keyframe card, edit timeline, continuity bible, realism, per-model dialects; `brain.py` / `run.py direction ...` lookup. Built by the direction-brain pass |
| Schema keys | `direction`, `scenes[].shot` (size, angle, move, lens_mm, location_id, eyeline, light_source, action, duration_s, dramatizes, ...), `continuity`; all optional |
| Adoption | Only the newest episode (ep10) uses `direction`/`shot`; the other ten episodes use none. Nothing reads the keys yet (lint/verify wiring is brain-plan phase 3) |
| Gates | lint (schema, checklist, waivers), verifier lane with a fingerprint that goes stale on edit, approval gate, `selfcheck` |

## 4. What was missing, and what is now built
| # | Slice | Status | What it does |
|---|---|---|---|
| S1 | **Storyboard / decision map** `run.py storyboard <ep> [--json]` -> `out/<id>/storyboard.md` | **Built** | One read-only page per episode: direction + director notes + waivers + episode flags, then a scene table and per-scene blocks. Per scene: start/duration (real TTS or marked estimate), format beat window and word budget vs actual, visual type and prompt summary, generation cost class (paid image / keyframe+clip / renderer-native), shot facts, the mechanism step shown, concepts introduced or relied on, questions raised or answered, on-screen elements (timed where the visual declares `reveal[].at`), lint flags that name the scene, and logged decisions. Smoke-tested for all episodes in `selfcheck` |
| S2 | **Validated, reasoned, logged edits** `run.py scene <ep> <sid> set\|unset <path> <value> --reason "..."`, `run.py decisions <ep> [<sid>]` | **Built** | Refuses (writes nothing) on: schema break, a new lint error, scene-id change, rendered/posted episode without `--allow-rendered`, missing reason. Reports lint errors it resolves and when `verify` went stale. `--dry` previews. Appends `{ts, actor, scene, op, path, before, after, reason, lint_new, lint_resolved}` to `episodes/<id>/decisions.jsonl`; regenerates the storyboard. 8 cases tested on a scratch copy |
| S3 | **Asset manifest + cost estimate** `run.py manifest <ep>` | **Built** (`manifest.py`, about 120 lines, no stage code changed) | From the same data: per scene which assets are needed (voice line, image, keyframe, clip), whether the content-hash cache already has them, and an estimated cost from a small `config/prices.yaml` containing only prices verified against the vendor page (unknown = shown as unverified, never guessed). Shown at approval time. Not a hard block |
| S4 | **Animatic** (free, before any paid clip) `run.py animatic <ep> [--render]` | **Built** (`animatic.py`, about 60 lines; renderer: one `placeholder` visual type, `PlaceholderScene`, scene names in the timeline, `<Audio>` skipped when there is no audio file) | A Remotion composition that renders per-scene cards (beat, narration, visual summary, shot facts) in the safe-zone preset with durations from the storyboard (estimated, or TTS if already generated), plus a contact sheet. Review it, then approve paid generation. Needs renderer work and is the only slice that does |
| S5 | **Authored intent per scene** | **Built** as optional `scenes[].intent` (schema 10-120 chars; lint warns when it repeats the narration; Director prompt asks for it; shown in storyboard and animatic) | Optional `scenes[].intent`, one line: what the viewer should understand or feel after this scene. Today "why" is derived (format beat, mechanism step, concepts, loops) or free text. Open question below |

## 5. Honest limits of S1/S2
- "Why" is **derived**, not authored. For an explainer scene the role is the format beat plus the mechanism step, concepts and questions it carries. It does not say why *this picture* was chosen. That needs S5 or `director_notes` lines.
- Transitions are not shown: they are chosen in the renderer (`canonBeat` in `profile.ts`) from the next scene's beat, and mirroring that mapping in Python would create two owners. Fix by moving the beat mapping into data both sides read.
- Element timing exists only where a visual declares `reveal[].at` (orbit and diagram). `steps`/`compare` rows reveal progressively but their timing is not in the data.
- Durations are estimates until TTS is generated (marked `*`).
- `scene` edits use dotted paths into one scene. There are no scene move/insert/delete operations yet (they touch the mechanism/concept/loop cross-references and need their own safeguards).
- Review fixes already applied: values may start with `--`; bare numbers/booleans are typed only when the field is not already a string (`--string` forces text); `registry.write` is now write-then-rename. Two simultaneous edits of one episode can still overwrite each other (single-user tool).
- Tested on a scratch copy and the shipped episodes' read-only paths; the edit command has not yet been used by the Director or in a real revision.

## 5b. Reuse survey (2026-10-05): what was adopted from the listed repositories
The owner asked to reuse repository code instead of maintaining more of our own. Two read-only passes read the MIT-licensed clones (nothing was executed). Result: **no code was adoptable as-is or as a vendored copy**; the remaining value was ideas.
| Need | Candidates read | Outcome |
|---|---|---|
| Manifest + cost | claude-code-video-toolkit (`ideogram4.py`, `cloud_gpu.py`), OpenMontage `cost_tracker.py` (AGPL), LiteLLM/tokencost | Skipped: a rough price dict and post-hoc GPU seconds; AGPL cannot be copied; token libraries do not price video or images. Built `manifest.py` on our own stage code instead, which also removed the need for a price-table subsystem (clip price already lives in `providers.yaml`). |
| State reconcile | toolkit `lib/project` (prose + types) | Idea only; our `cache.py` already treats files as truth, and a second `project.json` would break "episode.json is the only source". |
| Manifest lint | kangarooking `lint_shot_manifest.py` (74 lines, own schema, Chinese messages) | Idea taken: stated purpose per scene is lint-checked (S5 `intent`) and errors-only exit codes (already how `lint.py` works). |
| QA bundle | explainroo `qa.js`/`align.js`, iart `contact-sheet/probe-mp4/seek-shot` | Skipped: subset of `verify.render_qa` and `tools/check_safe_zones.py`, or tied to their own engine. Ideas still open: black-frame and silence detection with ffmpeg (about 15 lines), a Whisper check of TTS pronunciation (model download). |
| Review gate / animatic | toolkit `/scene-review` (a prompt, 310 lines), agent-storyboard (Node app that runs `codex exec --sandbox danger-full-access`), remotion-dev/skills (no license file) | Idea taken: preview in Remotion Studio with labelled scenes (`name=` on sequences). Nothing copied. |
| Intent field | iart storyboard card, toolkit `scenes.json` | No convention worth adopting verbatim; our own rules (one sentence, at most 120 chars, not the narration). |
Review of S3-S5 found one real bug (animatic crashed on audio metadata without `words`; fixed) and a schema/lint length mismatch (aligned at 120). Known and kept: the `intent` overlap test is a plain substring check, so a short intent that is a fragment of the narration is flagged (intended: it restates the narration); `manifest.py` captures the real provider loader at import time.
Net new code for S3-S5: about 180 lines of Python plus about 40 lines of TSX; zero vendored third-party code.

## 6. Open decisions (recommendations)
| # | Question | Recommendation |
|---|---|---|
| A | Where does the decision log live? | `episodes/<id>/decisions.jsonl` (durable provenance, next to the episode). Already so. The brain plan's proposed `out/<id>/direction_log.jsonl` is a different thing (card usage) and stays in `out/`. |
| B | Add `scenes[].intent` (S5)? | Yes, optional at first, a lint warning for new episodes once the Director fills it. Coordinate with the brain pass, which owns schema wiring. |
| C | Price table | Only vendor-verified entries (the episode skill already records a verified MiniMax clip price); unverified shown as such. |
| D | Animatic fidelity | Static cards first (cheap, deterministic). Reusing the real scenes with placeholder media is nicer but heavier; decide after seeing S4's first output. |
| E | Should the Director use `scene set` for its repair loop? | Yes once S2 has been used in a real revision; it would give repairs the same trail. Brain/director owner decides. |

## 7. Collision map with the other pass
- Brain plan phase 1/3 (schema keys, lint/verify wiring of `shot`/`direction`, director prompt step): not touched here. S1 only *displays* those keys.
- New files here: `storyboard.py`, `scene_edit.py`, `selfcheck.py` additions, two `run.py` dispatch entries, skill text. No schema change.
- Guard against drift: `selfcheck` builds the storyboard for every valid episode and checks the two copies of the episode skill stay byte-identical.

## 8. Next step
S3 (manifest + cost) is small and also free; S4 (animatic) is the big one. Suggested order: S3, then decide B and D, then S4. S5 follows decision B.

## 9. First real run (2026-10-05): "FII and DII in options trading, Indian Nifty" -> `ep18-fii-dii-flows`
Flow exercised: director -> lint -> storyboard -> manifest -> animatic props -> verify. Stopped at the approval gate by design; nothing paid was generated. What it showed:
- **Worked:** storyboard, manifest (11 voice lines, 7 images + 2 keyframes, 2 clips = $0.96 against the $6 cap) and animatic props all built on a real draft in seconds, free.
- **The draft did not answer the brief.** The owner asked about FII/DII in *options* trading; the script is about equity flows, and options appear in one line ("Options make these flows bigger and faster") that the verifier could not support.
- **The script's central claim is misleading.** It says the opposing forces "cancelled out" and "your Nifty fund holds" while its own news hook says the Nifty fell 6.1%. Lint cannot see this; only the verifier (`analogy_misleads`) did. The Director's repair loop had not fixed it.
- **`claims[].verified: true` is misleading wording.** It means the URL was in the fetched catalog, not that the page supports the sentence: claim 2 is `verified: true` and the verifier calls it unsupported (the headline does not mention domestic buying). Consider renaming to `url_fetched`.
- **Numbers in narration are not tied to claims mechanically.** "FIIs pulled billions" and "DIIs bought over 20,000 crores" have no claim; only the LLM verifier warns (`uncovered_statement`, `analogy_cannot_verify`).
- **Director run time and visibility.** The run exceeded 15 minutes with an empty log (stdout was buffered, lost when the run was killed), although the draft had been saved. Needs unbuffered progress lines and a stated time budget.
- **No episode-level edit command.** `run.py scene` edits scenes only; `direction.style_segments` (new lint error `dir_style_coverage`) and `director_notes` need `director --repair` or a hand edit.
- **Intent lines are formulaic** ("The viewer should feel/see ..."): present for all 11 scenes but low in information.
- Verifier result: FAIL, 5 errors, 19 warnings, comprehension 4/5. Lint: 3 errors (s10 sentence length x2, `dir_style_coverage`) and 9 warnings.

## 10. Third real run (2026-10-05): ep23-india-market-crash-recovery (research first, written by hand from sources, then the full gate)
Result: `out/ep23-india-market-crash-recovery/final.mp4`, 86.3 s, status `rendered` (not `reviewed`, not published). Voice and one clip cost about $0.48 + cheap TTS.
- **What worked:** web search plus reading the actual pages gave numbers that could be cross-checked (SEBI bulletin, NSE, Finnovate, Outlook Money, Ventura, Moneycontrol). Writing the script by hand from those facts, then letting the verifier attack it, caught five real errors across four rounds: ambiguous mutual-fund figure (verifier), wrong long/short definition for options (verifier), unsupported record detail in a claim (verifier), two metaphor worlds (verifier), and length.
- **Verifier fixes made on the way:** it demanded an analogy limitation on episodes with no analogy (fixed: only when `analogy` is declared); it did not know today's date and flagged real 2026 figures as "future" (fixed: date prefix on every verifier prompt).
- **Length estimate is wrong for number-heavy scripts.** Estimated 89 s, real 103 s: the voice runs about 1.9 words/s, and figures like "₹60,847 crore" are read out in full (18 words took 12.2 s). Fix applied here: say numbers roughly ("about ₹61,000 crore") while the screen shows exact figures, one scene cut, voice speed 1.05. Not yet fixed in lint: its 2.5 words/s estimate.
- **Loudness:** AAC re-encode overshot the true-peak target by 0.6 dB, so the loudnorm target is now -2.0 dBTP (final -1.9).
- **PDFs are unreadable** to the pipeline's page reader (raw bytes). The SEBI figure was checked by hand (pypdf, p.12) and stored as the source excerpt. A relevance-aware PDF reader would let the verifier check primary documents itself.
- **Known loose ends:** advisory `scene_duration_max` on s4 (8.4 s); three derived comparisons are not separate claims; episodes ep18, ep20 and ep22 are earlier drafts with wrong or unsupported claims (ep22: FII index futures misread by about 200x) and should not be approved.

## 11. Why ep23 was a bad video despite passing every gate (owner review, 2026-10-05)
Owner verdict: a data dump with tile-style visuals, jumping around in time, never explaining what FIIs and DIIs are or why DIIs buy when FIIs sell; same look as every other episode.
Evidence (all from the repo):
- Brief ignored. Asked for: what FIIs are, what DIIs are, what happened on 1 October and why DIIs bought as FIIs sold. Built: a March/April 2026 backstory plus derivatives positions. The 1 October facts were already in hand and unused (FII net -9,484 crore, DII +10,042 crore, Nifty about 22,422, drivers named in research: heavy FII selling, rupee near 96 per dollar, high crude).
- Direction rules not followed. The curious_adult card says "animated diagrams for the mechanism, ONE number/stat scene when a figure matters"; ep23 had 9 of 13 scenes as number or compare tiles, 3 text lists, 1 clip, no diagram, no analogy. mode-explainer asks for hook, analogy, mechanism, payoff; psychology_rules asks one idea per video (ep23 had about five).
- Chronology: Mar, Apr, definitions at scene 5 (terms used before being defined), Mar again, Apr again, Sep and 5 Oct, then 1 Oct (backwards), then Mar/Apr in the CTA.
- The explanation was cut to satisfy a length lint (the SIP scene, which was the "why DIIs buy" scene) while derivative number scenes nobody asked for stayed.
- The manual path bypassed the direction layer: no `direction`, `shot` or `continuity`, so no craft cards applied and the `dir_*` lint rules never ran (they run only when `direction` exists).
- Gates measured the wrong things: lint and verify check structure, sources and an LLM reading the script text (comprehension 5/5). No check exists for story order, concepts defined before use, numbers per scene or per video, brief coverage, or visual variety. The animatic review looked at stills for layout, not at the story.
- No variety: 12 of 16 episodes use audience curious_adult with the single profile explainer-clean; the second look is the kids one. More palettes are TODO rows in DESIGN_SYSTEM.md; the Director's variety() rotates format, analogy domain and mode, not the look. Widening the Director to number/compare/steps (this session) made text tiles the easiest scene to write.
Proposed fixes (not built): record the owner's questions as `brief` and require each to be answered in a scene; lint concept-before-use, declared chronology, at most one headline figure per scene and a cap per video; native-tile share cap with at least one mechanism diagram for explainers; warn when an audience episode has no `direction`; add explainer looks and rotate them; storyboard approval by the owner before any build.
