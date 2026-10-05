# L6 Quality gates

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Status: built, needs re-positioning · Principle: gates are necessary, not sufficient (memory `feedback_gates_not_quality`)

## Purpose
Stop bad scripts, builds and publishes, and tell the owner exactly why. Gates should also run as early as possible (outline, research) so they save time instead of only rejecting at the end.

## Have (verified)
- `direction/episode.schema.json` strict, `x-` escape and `waivers`; `lint.py` (about 960 lines) with rules in `direction/qa_checklist.yaml` (51 rules carry `enforced_by`, and `selfcheck` verifies each claim); sections core, explanation, packaging, checklist, direction, identity, story.
- `verify.py` (579 lines): analogy attack, claim support, comprehension test, realism, story editor (`story_review`); script fingerprint goes stale on any edit; approval needs a fresh passing report; `--skip-verify` never used.
- Render QA (ffprobe, contact sheet, `render_qa*.json`), safe-zone preset, loudness target, `packaging.py`.
- `selfcheck.py`: schema, safe zones, storyboard, skill copies, news web, live runs, identity, story gates, checklist, doc refs, lint gate; green on 2026-10-06.
- Story gates proven on ep23 (3 of 3 problems caught) and ep24 (6 errors).

## Others have
- juspay: weighted rubric with `deal_breakers[]`, judge-disagreement flag, vision critic on stills with capped retries; failure inconclusive, not blocking.
- kangarooking: manifest lint errors vs warnings, verdict taxonomy (usable/partial/regenerate) with root cause.
- explainroo: local text overflow, small text and TTS pronunciation checks; Whisper alignment.
- Trade: `verify_scalar` (number corroborated by two sources) and a "record only" honesty prompt with a test.

## Want
- Gates at every layer: brief validator (L1), research report (unsupported questions), outline validators (L3), script gates (today), render QA (today), plus a vision critic (optional, free-ish).
- Every gate result in one place: `out/<id>/gate_report.json` with layer, rule, severity, root cause, fix hint, owner-visible text.
- Verdict taxonomy and root cause per error so repair (L4) can route it.
- Number corroboration check: numbers in narration must appear in a source text (string match) and, for key figures, in two sources.
- Flakiness control: LLM verifiers run with fixed temperature; an inconclusive verifier result never blocks but is shown.
- Selfcheck extended with an end-to-end replay on a golden brief (see X2), so green selfcheck means the writer can pass, not just that gates exist.

## Flaws found
1. Gates ran only after the 45-minute generation; story rules reached the writer as prose.
2. Duration, schema enum and camera-phrase errors are checked late and cost LLM repair calls (L4.1 fixes by autofix).
3. `verify` comprehension 4/5 and story errors were separate passes; the loop stopped when mechanical budget ran out instead of when gates passed.
4. No gate checks that a date in the brief appears in the research.
5. Selfcheck passed (all green) while the writer failed three brief questions: no gate tested the writer.

## Work items
- L6.1 Outline validators (shared helpers with `lint.py`).
- L6.2 Research report gate (`unsupported` blocks the run, with override flag and reason).
- L6.3 Brief-integrity gate (L1.2) and date-in-evidence gate.
- L6.4 Number string-match gate for narration vs research text.
- L6.5 `gate_report.json` unified report and renderer in the UI.
- L6.6 Optional vision critic on one still per scene, capped retries, inconclusive on failure.

## Acceptance
- Each new gate has a fixture that fails it and a fixture that passes it in `selfcheck`.
- Golden brief gate report lists zero errors at final; a mutated brief makes the run fail with a clear message at L1/L4, not at the end.

## Depends on
All layers. X2 for the replay harness.

## Open questions
- Should warnings that repeat across episodes (e.g. `viewer_confused_by` terms) block approval after a threshold?

## Setup scope (rev 3)
This phase only delivers the layer kit (master plan 6.1): One `gate_report.json` written by every layer, advisory flag per rule, CHAI rules and hook checklist in the verify prompts, composition validator and pacing check wired. Backlog: B-L6-*. Everything else in Want and Work items is improvement work, to be picked from the backlog after setup.

## Reuse and parallelism (rev 2, 2026-10-06)
IDs refer to [R1](R1-reuse-register.md). Items are leads until a work package opens and runs the file.
- **Take (TEXT into verify/story-editor prompts, WP-C1):** R-70 CHAI rules (every finding Accurate: cites field/frame; Complete: scan for same class; Constructive: concrete fix, else labelled investigation); R-71 script-supervisor checklist; R-66 hook checklist; R-33 critic rubric for stills. **COPY (code):** R-68 slideshow-risk scorer; R-69 variation checker; R-28 composition validator (assets exist, narration vs video duration, cut order); R-29 scene-pacing vs narration cue times.
- **New work items:** L6.7 composition validator before render; L6.8 pacing check using T1 word times; L6.9 hook gate from the checklist; L6.10 fold F1/A1/T1/D1 results into `gate_report.json` (WP-V1, sole editor of `verify.py`).
- **Parallel:** all checks within a gate stage run concurrently; stages join at S5 and S9. OpenMontage files may be copied (personal use) but are adapted through thin wrappers.

## Risks and mitigations (rev 5)
- Alert fatigue: severity tiers, a cap on warnings shown (top 5 plus a count), one list; checks promoted or demoted by precision (E1: promote after 5 episodes at 80% agreement, demote below 50%).
- Gates mistaken for quality: owner preview verdict and taste tags (E1) are the quality signal; gates only stop known failures.
- Cross-model blind spots: verifier uses a different chain than the writer (L4).
