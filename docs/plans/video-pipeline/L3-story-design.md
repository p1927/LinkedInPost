# L3 Story design (outline)

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Status: PLAN · Output: `episodes/<id>/outline.json` (owner can approve before the expensive script call)

## Purpose
Decide the story before any scene is written: which brief question is answered in which scene, in what order, in what form (visual type), using which evidence, with terms defined before they are used. A cheap, reviewable artifact, so story errors are found in seconds and not after a 15-minute script.

## Have
- Story rules as prose in the writer prompt (`STORY_RULES_TEXT`): answer the brief, chronology, term-before-definition, figure caps, tile cap.
- Story gates after the fact: lint `story_*` rules, verify `story_review` (editor scoring explains 1-5), `story_brief_unanswered`, `story_order`, `story_data_dump`, `story_term_before_definition`.
- Format catalog (14 formats with beats and word budgets) and `shape_skeleton` guidance by information relationship (change over time, sequence, push-against-push, one figure, side by side).
- `est_seconds` with a figure penalty for number-dense lines.

## Others have
- Storyboard-first tools (Storyflow, Boords, StudioBinder, Storiara): beat sheet and shot list before production.
- juspay director / Ludwig: planning agent that outputs a structured plan; critics on plan stage.
- iart explainer skills: VISUAL / KEY MOTION fields per beat, words-to-seconds math with FAST/SLOW flag.
- Documentary craft (docs 02, 12): question-driven structure, chronological spine, "explain then use".

## Want
- `outline.json`: `spine` (chronological or question-led), `scenes[]` each with `id`, `question_id`, `job` (hook, define, event, mechanism, answer, payoff), `when`, `terms_introduced[]`, `terms_used[]`, `visual_type` (chart, timeline, forces, number, compare, steps, illustration, clip), `evidence_ids[]` (from L2), `est_seconds`.
- Outline validators (free, instant): every brief question has an answering scene; terms are introduced before use; chronology monotone for event scenes; visual types follow the information relationship; duration within the audience range; at most N consecutive scenes of one visual type; a literal definition scene precedes any analogy.
- Format becomes a guideline: format beats seed the outline but the brief order wins. The genre pack ([G1](G1-genre-and-format-packs.md)) supplies the beats, archetype pool and gate list.
- Owner gate: show outline as a one-screen table; approve or edit with `run.py outline <id> set ...` before L4.
- Analogy policy: define literally first, analogy second, with the analogy's limit stated (existing analogy verifier).

## Flaws found (ep24)
1. The writer is told "exactly the beats of the chosen format" so format order overrode brief order (crash scene before the terms).
2. 98 s estimated against a 25-90 s target: duration was only discovered after writing.
3. No chart/timeline/forces scene, because the writer had no data and no instruction tying visual type to information.
4. No `when` on any scene, so chronology could not be checked.
5. Story reviewer scored 2/5 on explanation only after the full script existed.

## Work items
- L3.1 `outline.py` + schema `outline.schema.json` + `run.py outline <id>`.
- L3.2 Outline prompt (small, ~3-4k tokens, standard MiniMax chain) fed by `brief.json` + `research.json` summaries.
- L3.3 Free validators (reuse `lint.py` story helpers; no new rule engine).
- L3.4 Owner approval step and `outline` cache key.
- L3.5 Update the writer to take the outline as its contract; format beats advisory.

- L3.6 Outline approval toggle: `approvals.outline` in `brief.json`, default **off** (owner decision); global default and per-run switch in the UI; when off, the outline is still written and validated, and the run continues without waiting.

## Acceptance
- On the ep24 golden brief: outline passes all validators in one or two calls under 3 minutes; every question mapped; at least one timeline and one forces or chart scene; estimated duration inside the range.
- Removing a brief question from the outline makes validation fail.

## Depends on
L1 (brief), L2 (evidence ids). Feeds L4, L5.

## Open questions
- Is outline approval by the owner mandatory or automatic when validators pass?
- Where does a "hook" scene sit relative to chronology (excluded from chronology checks today)?

## Setup scope (rev 3)
This phase only delivers the layer kit (master plan 6.1): `outline.json` contract, one outline prompt built from the craft cards (R-60..R-66), validators (question order, terms before use, visual type per beat), approval gate. Backlog: B-L3-*. Everything else in Want and Work items is improvement work, to be picked from the backlog after setup.

## Reuse and parallelism (rev 2, 2026-10-06)
IDs refer to [R1](R1-reuse-register.md). Items are leads until a work package opens and runs the file.
- **Take (TEXT into one craft card, WP-C1):** R-60 director contract (logline, intent, beats as visible events, one idea, hook legible muted); R-61 beat-direction; R-62 story-spine; R-63 faceless-explainer story-design and cut-catalog; R-64 explainer beat frameworks with timing splits; R-65 worked-example-first and intuition-before-notation (3b1b-videos is NC: concept only); R-66 hook checklist as the hook acceptance rubric.
- **Work item L3.5:** outline carries per-beat visual type chosen from the M1 scene vocabulary, so the DESIGN and TEXT lanes can start from it.
- **Parallel:** outline approval is the fan-out point; after it, L4 (text), L5/D1/M1 (design) and A1 music pick run concurrently.

## Risks and mitigations (rev 5)
- Outline approval is off by default, so late errors cost more: the outline is still validated automatically and the run stops on validator errors; the UI shows an outline card without blocking.
- Genre beats overriding the brief: pack beats only seed; brief order wins (validator).
