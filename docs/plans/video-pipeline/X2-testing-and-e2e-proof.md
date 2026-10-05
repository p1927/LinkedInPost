
# X2 Testing and end-to-end proof

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Status: PLAN · This is phase P0: build it first so every other layer is proven on a real brief.

## Purpose
Show that the pipeline produces a good video from a brief, not only that its gates exist. Today `run.py selfcheck` is green while the writer fails the brief: the checks test the checker.

## Have (verified)
- `run.py selfcheck` (free): schema, safe zones, storyboard, skill copies, news web, live runs, identity, story gates, checklist, doc refs, lint gate. Fixtures for gates (e.g. identity rotation simulation, story fixtures).
- `tests/` (4 files): director brain, plumbing, lint direction, packaging; tsc for renderer and frontend; regression frame md5 for the renderer.
- Story editor test on ep23 caught three real problems.
- Cache and manifest allow free dry runs of build planning.

## Others have
- Trade: one test file per behaviour with intended-behaviour names (tier waterfall, BrowserOS-first, honesty prompt, deadlines) used as specs.
- juspay director and kangarooking: manifest lint and agent guide with a symptom-to-fix table.
- Standard LLM-app practice: golden inputs, recorded responses for replay, scored evals with thresholds.

## Want
- **Golden briefs** (`tests/golden/*.json`): FII/DII 1 October (finance, data + chronology), a science explainer (no data), a history/process explainer, a numbers-heavy economics explainer. Each lists expected behaviours: questions answered, order, minimum data scenes, visual variety, duration range.
- **Replay mode**: record LLM and search/page responses for a golden run (`out/replay/<name>/`), then re-run layers offline in seconds to test code changes (gates, autofix, outline validators, repair planner) without model calls.
- **Live E2E run** (explicit, slow): full director run on a golden brief with live research and models, scored against the expectations; results written to `docs/plans/video-pipeline/RESULTS.md` with timings and token use (the proof we owe the owner).
- **Unit tests** for each new layer, ported from Trade's spec-style tests: query planner, reader chain statuses, number string-match, brief invariant, autofix rules, outline validators, repair never regresses story score.
- **Failure fixtures**: the ep24 draft stored as a known-bad case; each gate or fix has a test showing that it would have caught or repaired the problem.
- Selfcheck gains a "replay" section: replays the stored ep24 failure and expects the brief gate and outline validators to fail.

## Flaws found
1. No test calls the real writer; first real writer run was ep24.
2. No recorded fixtures of research or LLM output, so every check requires a live, slow run.
3. `tests/` covers little of `director.py` (1,871 lines) and nothing of research.
4. No place where results of real runs are recorded and compared.

## Work items
- X2.1 Golden brief files and expectation schema.
- X2.2 Recorder/replayer for LLM and fetch calls (wrap `Budget.call` and the reader).
- X2.3 Convert the ep24 run into the first replay fixture and failing-case tests.
- X2.4 Unit tests per layer as they land.
- X2.5 `run.py e2e <golden>` with scoring, and `RESULTS.md` log.
- X2.6 Selfcheck replay section.

## Acceptance
- `run.py selfcheck` fails today's pipeline on the ep24 replay (it should, proving the harness detects the problem) and passes after P1-P3 land.
- A live golden run is recorded in `RESULTS.md` with pass/fail per expectation, wall time and tokens.

## Depends on
Nothing; start here. Feeds every layer.

## Open questions
- How many live E2E runs are acceptable per phase given about 30 minutes of model time each?

## Setup scope (rev 3)
This phase only delivers the layer kit (master plan 6.1): Golden briefs (ep24 included), replay harness, one good and one bad fixture per layer in `selfcheck`. Backlog: B-X2-*. Everything else in Want and Work items is improvement work, to be picked from the backlog after setup.

- X2.7 Retire old drafts (owner decision): move ep18, ep20, ep22, ep23, ep24 to `video-pipeline/episodes/_retired/` (reversible, nothing deleted) and update anything that lists episodes; keep the ep24 brief as a golden brief fixture.

## Reuse and parallelism (rev 2, 2026-10-06)
IDs refer to [R1](R1-reuse-register.md). Items are leads until a work package opens and runs the file.
- **Take:** R-87 shotkit audit-trail pattern (content hashes on inputs and reviewed frames, frozen snapshot) for replay; R-88 checkpoint protocol idea (likely equal to our per-layer JSON files).
- **Work items added:** X2.5 one fixture per new check, each with a failing and a passing case: wrong spoken word (T1), low-contrast text / white-flash cut / clipped label (F1), no ducking (A1), red-green-only chart and neon-on-dark palette (D1), linear easing (M1), rewritten brief date (L1). X2.6 golden-brief run records per-stage wall time to prove the parallel graph saves time.
- **Parallel:** the fixtures are independent and run concurrently in `selfcheck`.

## Risks and mitigations (rev 5)
- Thin calibration set: E1 reference episode plus a degraded copy; fixtures per check (good and bad).
- Retired drafts removed as material: the ep24 brief stays as a golden brief; reference episode created in Slice 1.
