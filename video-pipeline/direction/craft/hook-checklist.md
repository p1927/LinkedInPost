# Hook Checklist — Craft Card

**Card type:** hook  
**Applies to:** all packs (first scene, always)  
**Enforced by:** lint rule `hook_in_first_scene` (error); `hook_length_max` (warn, ≤15 words)  
**Source material**: content-skills viral-hooks framework, reworded for this pipeline.

---

## What a hook must do
Open a loop the viewer will stay to close. A hook that doesn't raise a question or create tension is not a hook —
it is an introduction, and introductions are skipped.

---

## Checklist — the first scene must satisfy at least ONE of these

### 1. Opens a genuine question
The viewer must not already know the answer, and the answer must matter to them.
- BAD: "Today we'll talk about how the stock market works." (no question, no stakes)
- GOOD: "Why did India's market crash 4% in one day, then recover by the close?"

### 2. Names a surprising fact immediately
A number or fact the viewer would not have predicted. Delivery: state it cold, no setup.
- BAD: "The market has been volatile lately."
- GOOD: "Foreign investors pulled out ₹35,000 crore in a single week — and the market still ended green."

### 3. Creates second-person stakes
Puts the viewer personally in the situation.
- BAD: "Inflation is a complex topic."
- GOOD: "If you bought groceries last month, you paid for inflation — here's exactly where that money went."

### 4. Contradicts a common belief
States something the audience believes to be true, then immediately signals it is wrong.
- BAD: "Let's look at how bonds work."
- GOOD: "Most people think bonds are safe. They're wrong — in 2022 bonds lost more than stocks."

---

## Length rule
Hook narration: ≤15 words. The visual does the rest.
If you need 20 words to set up the question, cut the setup — it belongs in scene 2.

---

## Loop payoff rule
Every question raised in the hook must be answered in a payoff or term scene, tracked in `episode.loops[]`.
A hook that is never paid off is a broken promise.

---

## Anti-patterns
- Starting with "Have you ever wondered..." — passive, feels scripted
- Starting with "In this video..." — kills the hook
- Starting with the brand name or series title — viewers don't care yet
- Hook that is longer than the answer — suspense collapses

---

## CHAI reviewer rule (for this card)
- **Accurate**: quote the exact first scene narration and name which of the four hook types (if any) it satisfies.
- **Complete**: also check whether a loop is opened and whether `episode.loops[]` tracks its payoff.
- **Constructive**: if the hook fails, write one alternative opening sentence that satisfies type 1 or 2.
