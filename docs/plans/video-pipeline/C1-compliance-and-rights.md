# C1 Compliance and rights (finance claims, sources, music, images)

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Status: partial (disclaimer text exists in packaging)
Personal-use policy removes repo-licence concerns; this layer covers the content itself, which still matters when a video is published.

## Purpose
Prevent a video from stating something it cannot support, giving investment advice, or using media it has no right to, before publish.

## Have
- `packaging.py` descriptions with sources and a "not financial advice" disclaimer; `verify.claim_support`; `source_quality.yaml`; "never invent numbers" rule; realism/fidelity cards.

## Others have
- R-91 record-only honesty prompt; R-92 two-source number check; R-84 metrics honesty; OpenMontage reviewer CHAI rules (R-70).

## Want
1. **Finance rules (card + lint)**: no buy/sell/hold advice, no price targets, no guarantees; past data labelled as past; disclaimer on screen in the last scene and in the description; named securities only as examples with a source and date.
2. **Claim ledger**: `claims.json` per episode, every figure with source id, date, retrieved text snippet; the number-match gate reads it; unsupported claims block approval (advisory then blocking per E1 rule).
3. **Media rights record**: for each image/clip/music/SFX: provider or file, generation or source, whether generated, licence note; written to `rights.json`; publish step lists any item without a record. Generated media is labelled per platform rules when realistic.
4. **Source attribution**: description lists the sources used (exists), on-screen source line for data scenes.

## Flaws found
1. Finance rules exist as scattered prompt text, not as a lint.
2. No per-asset rights record; music from the local generator has unchecked output terms.
3. Source line is not required on data scenes.

## Work items
- C1.1 Craft card for finance rules and the lint rule(s) in `qa_checklist.yaml` (WP-C1/D).
- C1.2 `claims.json` writer from the existing claims block and L2 evidence ids.
- C1.3 `rights.json` recorder in L7 and A1; publish-time listing in L9.
- C1.4 Source line requirement for data scenes (M1).

## Acceptance
- A fixture script with "you should buy X" fails; a figure without a source fails; `rights.json` exists for every asset of the Slice 1 episode.

## Depends on
L2, L4, L6, L7, L9.

## Risks and mitigations
- Rules cannot replace legal advice: the plan only reduces obvious risks; the owner remains responsible for publish decisions.

## Open questions
- None.
