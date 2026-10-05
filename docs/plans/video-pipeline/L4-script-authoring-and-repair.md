# L4 Script authoring and repair

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Status: PLAN · Output: `episodes/<id>/episode.json` (`status: scripted`)

## Purpose
Turn an approved outline plus research into scene-level narration and visuals that pass the gates, with repair that fixes the right things cheaply and never undoes a fix or touches the brief.

## Have
- `director.py` (1,871 lines): writer call with a ~27k-token system prompt, schema + lint check, mechanical repair (max 2), semantic repair (max 1-2), verify, QA gate, draft save with identity.
- Budget cap 300k tokens, per-call wall-clock deadline (7 min per attempt, retries 30/90/180 s, model fallback chain M3, M2.7, M2.5), progress via runlog.
- Repair prompts scoped by problem kind (`repair_scope`, `repair_cards`), "restored previous valid analogy" safeguard.

## Others have
- juspay director, Ludwig editor: draft, critic, apply loop with capped retries; critic failure is inconclusive, not blocking.
- OpenChatCut: draft, approve, apply atomically so an edit lands as one reviewable change.
- kangarooking: manifest lint errors vs warnings, verdict taxonomy (usable / partial / regenerate) with root cause.
- explainroo: cheap local checks before any LLM repair.

## Want
- The writer takes `outline.json` as its contract and writes per scene (or in small batches), not one 4.4k-token blob; each scene call gets only its question, evidence and neighbours.
- Deterministic fixes first without an LLM: schema enum fixes (`winner: both`), duration trimming, required camera phrase insertion, number rounding. Only errors that need judgment go to a model.
- Repair order: story errors (brief, order, explanation) before mechanical; never revert a story fix to satisfy lint; stop as soon as gates pass.
- Per-scene repair (`run.py scene ... set` already exists) so one bad scene never rewrites the other nine.
- Fewer, smaller repair calls on the existing MiniMax chain (no separate fast model, owner decision).
- Brief integrity re-applied after every call (L1.2).

## Flaws found (ep24)
1. 11 initial errors included trivia (schema enum, duration, motion phrase) that a function could fix for free.
2. Repair 1 and 2 spent ~13 minutes each on mechanical errors; semantic repair was reverted; story errors stayed.
3. Repair path lost the owner's wording.
4. No early stop: draft had 0 lint errors and 4/5 comprehension after repair 1, yet the loop continued and finished with 2 lint errors.
5. System prompt 27k tokens (writer) and 2.4-3.5k (repair): large, repeated verbatim every call; no prompt caching.
6. Writer got source titles, not page content, for most sources.

## Work items
- L4.1 Deterministic autofix pass (`autofix.py`) called before any repair LLM; unit-tested per rule.
- L4.2 Scene-batched writer driven by the outline; prompt trimmed to what each scene needs.
- L4.3 Repair planner: classify errors, order story > semantic > mechanical, forbid regressions (re-run story gates after each fix).
- L4.4 Stop rule: stop when error count is 0 and gates pass; never spend budget on warnings.
- L4.5 Prompt caching or a shared static prefix where the provider supports it.

## Acceptance
- Golden brief: first draft errors fixed with at most one LLM repair call; final QA clear; total LLM wall time under 30 minutes with default models and under 12 minutes via fewer calls and parallel lanes.
- A repair never lowers the story score (assert by re-running the story editor on the previous and new draft).

## Depends on
L1, L2, L3, X1. Feeds L5, L6.

## Open questions
- Scene-by-scene writing risks inconsistent voice; mitigate with a one-paragraph style note plus the previous scene's last line. Acceptable?

## Setup scope (rev 3)
This phase only delivers the layer kit (master plan 6.1): Writer consumes `outline.json`, robust JSON/retry helper wired, targeted repair limited to listed errors, per-stage timing. Backlog: B-L4-*. Everything else in Want and Work items is improvement work, to be picked from the backlog after setup.

## Reuse and parallelism (rev 2, 2026-10-06)
IDs refer to [R1](R1-reuse-register.md). Items are leads until a work package opens and runs the file.
- **Take:** R-62 narration rules (TEXT); R-67 weak-hook upgrade steps used by the repair step; R-69 generic-phrase blacklist ('stunning', 'in today's world') as a lint list (CONCEPT); R-73 ViMax `robust_json_parser.py`, `retry.py` (MIT, COPY; untangle langchain) to cut JSON-parse failures and wasted repair calls.
- **Parallel:** script gates run concurrently (lint, claim_support, analogy, comprehension, story editor) with a rate limiter; runs alongside the DESIGN lane, joined at the script-approval gate.

## Risks and mitigations (rev 5)
- Writer and checker share blind spots (all MiniMax): deterministic checks first (lint, number match, schema), a different model chain and low temperature for the verifier (exists: writer M3, verifier M2.7), evidence ids required per claim, and the human script gate.
- Slow calls: reasoning off for M3 (X1/S-08), smaller prompts, batched scenes, one targeted repair call.
- Brief drift: re-apply wording after each call.
