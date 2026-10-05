# V1 Versioning and migration (contracts that can change without breaking old episodes)

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Status: not started

## Purpose
New layers add files and fields (`brief.json`, `genre`, `identity.json`, `gate_report.json`, `review.json`). Old episodes and replays must keep working, and a contract change must be detectable.

## Have
- `direction/episode.schema.json` strict with `x-` escape and `waivers`; script fingerprint in `verify.py`; `cache.py` hashing; episodes ep01-ep24 without the new files.

## Others have
- shotkit audit-trail pattern (R-87): content hashes and frozen snapshots; OpenMontage checkpoint schema idea (R-88).

## Want
1. `schema_version` field in every contract file; readers accept old versions through a small upgrade function per file.
2. New files optional for old episodes: a missing `brief.json` is reconstructed from `episode.json` (topic, one_idea, audience) with `genre: explainer` default; no episode is rewritten in place.
3. Retired episodes moved to `episodes/_retired/` (reversible, listed in `episodes/_retired/README.md` with the reason).
4. Replay: a run records the versions of every contract it read, so a later schema change cannot silently alter a replay.

## Flaws found
1. No version field; adding `genre` or `approvals` would break strict schema validation for old episodes.
2. Selfcheck lists episodes explicitly in places; retiring changes the list.

## Work items
- V1.1 Add `schema_version` and upgrade shims for `brief.json`, `episode.json`, `identity.json`, `gate_report.json`, `review.json` (shims, no migrations of stored files).
- V1.2 Default reconstruction of `brief.json` for old episodes.
- V1.3 Retire script (move, README, selfcheck list update).

## Acceptance
- Selfcheck green with old episodes present; an old episode renders unchanged (regression frames byte-identical, as today); a new episode records its contract versions.

## Depends on
L1, X2.

## Risks and mitigations
- Strict schema rejects new fields: add them to the schema in the same change, with defaults.

## Open questions
- None.
