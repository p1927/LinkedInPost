# L9 Publish and analytics

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Status: code done, not live · Rule: never publish without the owner's explicit yes for that specific post

## Purpose
Post approved videos safely (private first), track what happens, and feed results back into topic and format choice.

## Have (verified)
- `publishers/`: YouTube Data API uploader (private by default; unverified API projects are forced private) and Instagram Reels (Graph API); dry run is the default, `--confirm` required; `containsSyntheticMedia` set at upload.
- `registry.py`: episode status lifecycle (idea, scripted, approved, rendered, reviewed, posted), `run.py list/sync` to the Google Sheet tab "Episodes"; frontend `/videos` page with Episodes, Videos and Live runs tabs.
- Known blockers: Instagram token expired 2026-06-21; worker/frontend deploy of the `/videos` page pending.
- `packaging.py` / `seo.py` produce metadata; sponsor playbook for disclosure.

## Others have
- Postiz and similar schedulers (paid or self-hosted), openshorts publishing flows, AgentTube analytics loop (vendored, ideas only).
- YouTube Analytics API retention curves for hook tuning.

## Want
- Private upload path verified end to end once (YouTube), with owner confirming the dry-run output.
- Analytics pull (views, average view duration, retention at 3 s / 30 s) written back to the registry and shown in `/videos`.
- Learning loop: hook and format performance feeds `variety()` and the topic ranker as a soft signal (not an override).
- Owner-visible checklist before publish: disclosures, sources, synthetic-media flag, sponsor label.

## Flaws found
1. Nothing has been published; upload code is only dry-run tested.
2. No analytics at all, so no learning loop.
3. `/videos` page not deployed; Instagram credentials need renewal by the owner.

## Work items
- L9.1 Owner-run private YouTube upload test with a rendered episode (needs owner yes).
- L9.2 Analytics ingestion (YouTube Analytics API) into registry/Sheet.
- L9.3 Soft feedback into variety and topic ranking.
- L9.4 Deploy `/videos` (owner action) and renew Instagram token (owner action).

## Acceptance
- One private upload confirmed by the owner; analytics row appears for it within a day; no public post occurs without a per-post yes.

## Depends on
L8. Independent of L1-L7 timing, so it can proceed in parallel when the owner wants.

## Open questions
- Which platforms are in scope for the first real post: YouTube only, or Instagram too?

## Setup scope (rev 3)
This phase only delivers the layer kit (master plan 6.1): Metadata limits validator in front of the existing private-upload code; no analytics learning yet. Backlog: B-L9-*. Everything else in Want and Work items is improvement work, to be picked from the backlog after setup.

## Reuse and parallelism (rev 2, 2026-10-06)
IDs refer to [R1](R1-reuse-register.md). Items are leads until a work package opens and runs the file.
- **Take:** R-82 YouTube metadata limits validator (title 100, description 5000, tags 450, dedupe; port ~60 lines of the MIT JS to Python); R-83 retention-curve to per-scene learning that refuses simulated data (CONCEPT); R-84 metrics honesty (saves/completion over views) and Shorts-to-long-form funnel (TEXT).
- **Parallel:** analytics pull and per-scene mapping are independent of publishing; both after owner approval.

## Risks and mitigations (rev 5)
- Not in Slice 1 (private upload only after the owner's review). Retention learning needs data: backlog until episodes are published.
- Missing rights record blocks publish (C1).
