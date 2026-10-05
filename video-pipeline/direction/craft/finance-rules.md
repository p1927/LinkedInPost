# Finance Rules — Craft Card

**Card type:** compliance  
**Applies to:** every pack (always active)  
**Enforced by:** lint rules `finance_advice_check` (advisory → error for obvious advice)

---

## What this card covers
Prevent a video from giving investment advice, making price predictions, or implying guaranteed outcomes.
These rules apply regardless of genre. A finance topic does not automatically trigger them — a history video
about the 2008 crisis is fine; a chart showing past prices is fine. The rules fire on forward-looking advice.

---

## Hard rules (lint will flag as error once promoted)

1. **No buy/sell/hold advice.** Never say "you should buy X", "sell before it drops", "now is a good time to invest".
   Rewrite: describe what happened (past) or what some people believe (attributed). Example:
   - BAD: "You should buy gold right now."
   - GOOD: "Some investors move to gold when inflation rises."

2. **No price targets.** Never state a specific future price ("Bitcoin will reach $100,000 by year-end").
   Rewrite: report what analysts say with attribution and date.

3. **No guarantees.** Never use "guaranteed", "risk-free", "certain to", "will definitely".
   Rewrite: "historically", "on average", "in the past".

4. **Named securities as examples only.** A named stock or fund must have: a source, a date, and a clear
   "example" framing. Never name one without those three.

5. **Past data must be labelled as past.** Any figure with a date or period: say the period. "Nifty was up 17%"
   → "Nifty was up 17% in calendar 2023".

6. **Disclaimer scene.** Every video touching personal finance (stocks, funds, crypto, real estate investing)
   must include on-screen text in the last scene: "Not financial advice. Consult a qualified adviser."
   The packaging description must also carry this text.

---

## Advisory rules (warn only)

- Avoid the phrase "experts say" without naming the expert or the source.
- Avoid "the market will" — prefer "the market has" or "analysts expect".
- If a percentage gain/loss is cited, also name the time period and starting value.

---

## Claim ledger
Every financial figure goes into `episode.claims[]` with `source_url`, `retrieved_date`, and `snippet`.
The `claims.json` writer helper (tools/claims.py) creates the file; lint checks coverage.

---

## CHAI reviewer rule (for this card)
When reviewing a script against this card:
- **Accurate**: cite the exact scene id and the specific phrase that violates the rule.
- **Complete**: scan every scene, not just the hook and CTA.
- **Constructive**: give a specific rewrite, not just "remove this".
