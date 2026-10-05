# L1 Intake and brief

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Status: PLAN · Output: `episodes/<id>/brief.json`

## Purpose
Turn the owner's request (a topic, free-form questions, a hook idea, an audience, constraints, optional sponsor) into one locked structured object that every later layer reads and none may rewrite.

## Have (verified in code and the ep24 run)
- `run.py director --topic --audience --format --mode --source (repeatable) --brief "q1|q2|q3"`; `check_args` rejects unknown flags (added after `--help` started a real run).
- `brief_block` puts the questions in the writer prompt; `write_episode` re-applies the owner's exact wording after the writer call (`director.py` about line 924); schema has `brief[{question, answered_in}]`.
- Audience cards `direction/audiences/*.yaml` (kids, curious_adult, older_adult, techie) with pace, vocabulary, voice, music, profile.
- Variety rotation (`variety()`) picks format, analogy domain and mode from recent episodes.
- Topic intake from RSS + web search when no topic is given; `--pick` / `--choose`.

## Others have
- OpenMontage / juspay director: a "brief" or "idea" stage as its own artifact with an approval step before research.
- Ludwig editor, OpenChatCut: draft, approve, apply as separate, versioned steps.
- Commercial pre-production tools (StudioBinder, Storiara): brief, breakdown, asset list as distinct documents.

## Want
- `brief.json` with: `questions[]` (exact wording, order, optional `date_scope` such as "1 Oct 2026"), `hook` (owner's hook idea), `audience`, `must_cover` / `must_avoid`, `length_target`, `sources_given[]`, `sponsor`, `owner_notes`.
- A date normaliser: dates in questions are parsed once and carried as structured `date_scope`, so no stage can silently move 1 October to 5 October.
- Plain-language input path: owner can paste a paragraph; a small cheap call splits it into questions and shows them back for a yes/no before anything runs.
- Invariant: after every LLM call (writer, repair, verify), questions and `date_scope` equal the stored brief; a selfcheck and a runtime assert enforce it.
- Variety rotation becomes a **suggestion** applied after the topic is known (format and analogy domain must fit the topic), never a hard constraint (ep24 got a cooking analogy for a finance topic).

## Flaws found
1. Repair path never re-applies the brief (`director.py` has no `brief` handling after line 1400): wording rewritten in ep24.
2. Dates are plain text; nothing checks that a date in a question appears in the research.
3. Variety forces `domains=['cooking','home']` before looking at the topic.
4. No stored brief artifact; the brief lives only in episode.json, which the repair rewrites.
5. `--brief` is only the CLI; no UI or file input.

## Work items
- L1.1 `brief.py`: parse, normalise dates, write/read `brief.json`; `run.py brief <id>` to show it.
- L1.2 Enforce the invariant in `Budget.call` wrapper and in the repair path; selfcheck fixture that mutates the brief and expects failure.
- L1.3 Variety as post-topic suggestion with a fit check.
- L1.4 Optional `--brief-file` and a paste-a-paragraph mode with confirmation.

## Acceptance
- A golden brief with "1 October" produces a final `episode.json` whose brief equals `brief.json` byte for byte after writer + 2 repairs.
- Selfcheck fails when any stage edits a question.
- A finance topic never receives a cooking analogy domain unless the owner asked for one.

## Depends on
X2 (golden briefs). Feeds L2, L3.

## Open questions
- Should the owner confirm the parsed brief every time, or only when parsing changed anything?

## Setup scope (rev 3)
This phase only delivers the layer kit (master plan 6.1): `brief.json` contract with verbatim questions and dates, integrity re-apply after each LLM call, promise lock stub, fixture where a repair rewrites a date (must fail). Backlog: B-L1-*. Everything else in Want and Work items is improvement work, to be picked from the backlog after setup.

## Reuse and parallelism (rev 2, 2026-10-06)
IDs refer to [R1](R1-reuse-register.md). Items are leads until a work package opens and runs the file.
- **Take:** R-72 delivery-promise lock (classify what the video promises, e.g. data explainer vs story; stop instead of silently downgrading later); R-81 idea mining prompts for brief suggestions (TEXT).
- **Work item L1.4 (WP-L1):** brief integrity re-application after every LLM call + promise lock stored in `brief.json`.
- **Parallel:** none; L1 is serial and fast. Runs first, then L2 fans out per question.

## Risks and mitigations (rev 5)
- Old episodes have no brief: V1 reconstructs it with `genre: explainer` default.
- Brief rewritten by an LLM: integrity re-apply plus a fixture that fails on a changed date.
- Genre misclassified: the UI proposes, the owner can switch (G1).
