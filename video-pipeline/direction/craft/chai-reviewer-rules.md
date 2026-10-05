# CHAI Reviewer Rules — Craft Card

**Card type:** meta (review process)  
**Applies to:** all review passes, all packs  
**Source**: OpenMontage reviewer.md, reworded — no text copied verbatim (AGPL).

---

## What CHAI stands for
- **C**heck: Accurate
- **H**ard scan: Complete
- **A**ctionable: Constructive
- **I**dentified: In-episode evidence

These four qualities make a review useful. A review that lacks any one of them causes rework.

---

## Rule A: Accurate — cite a field and frame
Every finding must name:
- The **scene id** (e.g. `s3`) or **field path** (e.g. `packaging.description`)
- The **exact phrase or value** that triggered the finding, quoted
- The **rule id** from qa_checklist.yaml it violates (e.g. `finance_advice_check`, `one_idea_per_scene`)

BAD: "The hook is weak."  
GOOD: `s1` narration "The market has been volatile lately" — fails hook-checklist type 1 (no question opened) and type 2 (no surprising fact).

---

## Rule B: Complete — scan the same class
When a rule applies to a class of things (all numbers, all scene narrations, all image prompts), scan every member.
Do not stop at the first violation.

BAD: Report one unanchored number and miss three others.  
GOOD: List all four: `s2` (₹35,000 crore no time anchor), `s5` (4.7% no comparison), ...

---

## Rule C: Constructive — give a concrete fix
Every finding must include one of:
- A **specific rewrite** (for narration, image prompt, packaging text)
- A **specific addition** (e.g. "add source_url to claims[2]")
- A **specific deletion** (e.g. "remove 'you should consider buying X' from s8")

BAD: "This violates the finance rules."  
GOOD: Replace "you should buy gold now" with "historically, some investors have moved to gold during high inflation periods — data from the World Gold Council, 2023."

---

## Rule D: Identified — in-episode evidence only
Every finding must be grounded in the episode being reviewed, not a general impression.
Avoid: "this kind of episode usually..." or "videos like this tend to..."
Every claim about the episode must trace to a specific scene, field, or value.

---

## Applying CHAI in a review pass
1. Load the episode.json.
2. For each craft card that applies to this pack: scan every element in the card's scope.
3. Format each finding as: `[scene id or field] [exact quote] → [rule id] → [rewrite or fix]`.
4. Group findings by rule, not by scene (one rule may hit multiple scenes).
5. Mark each finding as error (blocks approval), warn (advice), or note (optional improvement).

---

## What CHAI does NOT do
- It does not assess creative quality ("is this interesting?") — that is the owner's taste verdict.
- It does not run the mechanical lint rules — lint.py does that. CHAI catches what lint cannot (semantic, structural, narrative).
