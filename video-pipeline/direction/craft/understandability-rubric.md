# Understandability Rubric — Craft Card

**Card type:** understandability  
**Applies to:** all packs, especially explainer and concept  
**Enforced by:** lint rules `understandability_anchor_numbers`, `one_idea_per_scene`, `define_before_use` (advisory)

---

## Goal
Every viewer who watches once — without pausing — understands the one idea and can explain it in one sentence.
This is measured by the owner's "did I understand it?" verdict in review.json (E1).

---

## Rule 1: Anchor every number
A number without a reference is noise. Every spoken or on-screen figure must carry its anchor:
- **Scale anchor**: "17% — about 1 in 6 workers" or "₹2 lakh crore — roughly half India's education budget"
- **Time anchor**: the period or date the number refers to
- **Comparison anchor**: what it was before, or what a neutral baseline looks like

BAD: "The market fell 4.7%."  
GOOD: "The market fell 4.7% in a single day — a bigger drop than on most election nights."

---

## Rule 2: One idea per scene
Each scene carries exactly one thing the viewer should understand or feel.
A scene is too crowded if: it has more than 4 sentences of narration, or it names more than 2 distinct facts.
If a scene must carry two ideas, split it.

BAD: "FIIs sold ₹15,000 crore while DIIs bought ₹12,000 crore, and retail investors panicked causing circuit breakers."  
GOOD: Scene 1 — FIIs sold big. Scene 2 — DIIs absorbed it. Scene 3 — Retail panic triggered the circuit.

---

## Rule 3: Concrete before abstract
Say the specific thing first, then name the category.
BAD: "Monetary policy affects borrowing costs, which then impact economic growth."  
GOOD: "Your home-loan rate went up ₹3,000 a month. That is monetary policy at work."

---

## Rule 4: Define acronyms on first use
Any acronym or jargon: spell it out fully the first time it appears in narration.
BAD: "FII flows turned negative."  
GOOD: "Foreign Institutional Investors — FIIs — turned net sellers."
After the first use the short form is fine.

---

## Rule 5: No unexplained dependencies
Never assume the viewer knows what happened in the previous episode or a current news event.
If the video needs context, give one sentence of it in the hook.

---

## Comprehension test (applies at script review)
After reading the script: can you answer "what is the ONE thing this video teaches?" in one plain-language sentence without re-reading?
If not, the script violates Rule 2.

---

## CHAI reviewer rule (for this card)
- **Accurate**: name the scene id and the exact phrase or number that is unanchored or unexplained.
- **Complete**: check every number in every scene, not just the hook.
- **Constructive**: provide the specific anchor or rewrite the definition.
