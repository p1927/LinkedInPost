# E1 Evaluation and the reference episode (does it actually get better?)

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Status: not started
Gates measure proxies. This layer defines what success is, measures it, and creates the reference the thresholds are tuned against.

## Purpose
Know whether the new pipeline produces better videos than the old one, using a few outcome measures and one genuinely good reference episode, so tuning is not guesswork.

## Have
- Drafts ep01-ep09, ep18, ep20, ep22-ep24 (failing or unreviewed, being retired); ep23 rendered at 86.3 s; render QA contact sheets; `verify` reports.
- No outcome data (nothing published), no rated reference.

## Others have
- R-83 retention-to-scene learning (concept), R-84 metrics honesty, shotkit audit trail (R-87), HyperFrames contrast report as a pattern for a visual report.

## Want
1. **Reference episode**: the first Slice 1 explainer, reviewed by the owner and rated; if it is not good, iterate on the same brief until it is. It becomes the calibration target: F1/D1 thresholds are tuned so it passes and a deliberately degraded copy fails.
2. **Outcome measures** (recorded per episode in `review.json`):
   - owner verdict at preview: keep / too similar / too flat / confusing / off-brand (taste log; also "did I understand it?" yes/no)
   - time from brief to preview (wall clock) and number of LLM calls
   - gate report: errors, warnings, how many were advisory and later confirmed by the owner (precision of each check)
   - cost per episode (paid units)
   - once published: 30-second retention, average view duration, saves (backlog until data exists)
3. **Before/after**: run the ep24 brief through the old and new pipeline; compare error count, brief-question coverage and time.
4. **Check precision log**: each advisory check records "owner agreed / disagreed" so noisy checks are demoted and useful ones promoted to blocking (rule: promote after 5 episodes with at least 80% agreement; demote below 50%).

## Flaws found
1. Old drafts are not good references; the retire plan removes the only material we have, so the reference must be created.
2. Thresholds are judgment numbers with no calibration set.
3. Nothing measures whether gates correlate with a video the owner likes.

## Work items
- E1.1 `review.json` schema and a tiny UI form or CLI prompt at preview review (tags, understood yes/no, free note).
- E1.2 Run log extension: per-stage time, LLM calls, tokens, cost into `out/<id>/metrics.json` (shared with X1).
- E1.3 Calibration run: tune F1/D1 thresholds on the reference episode and one degraded copy (low-contrast text, brightness jump, clipped label).
- E1.4 Before/after comparison on the ep24 brief (golden brief).
- E1.5 Check-precision log and the promote/demote rule.

## Acceptance
- A reference episode exists with an owner rating; thresholds recorded with their calibration evidence.
- `metrics.json` and `review.json` written for the Slice 1 episode; comparison table for the ep24 brief committed to docs.

## Depends on
All Slice 1 layers. Feeds L6 promotion rules and BACKLOG choices.

## Risks and mitigations
- One reference is a thin basis: treat thresholds as v1, recalibrate after the second and third episodes.
- Owner time: the review form takes under a minute; tags are optional except understood yes/no.

## Open questions
- None.
