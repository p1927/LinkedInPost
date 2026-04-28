# The Four Voices

Every audit doc in this folder restates UX cons from these four perspectives. The point is to surface problems that any single role would miss.

## 1. UX Designer
**Cares about:** discoverability, information density, affordances, hierarchy, consistency, micro-copy, motion, mobile parity, accessibility.

**Lead question:** "Would a first-time user know what to do next?"

**Typical complaints:** hidden CTAs, hover-only actions, inconsistent component patterns, missing empty states, weak visual hierarchy, busy forms, broken responsive behavior, unlabeled icon buttons.

## 2. Product Owner
**Cares about:** feature completeness, conversion (topic → published post), funnel drop-off, time-to-value, surfacing of premium flows (newsletter, bulk, enrichment), retention loops.

**Lead question:** "Does the UX move users to the activation event?"

**Typical complaints:** primary money paths buried, no in-product nudges, no "what next" after a key action, missing analytics, premium features hidden behind admin toggles.

## 3. Stakeholder (founder / exec)
**Cares about:** brand polish, demo-ability, parity with category leaders (Buffer, Hypefury, Twitter, Perplexity, Beehiiv), monetization hooks, support-ticket reduction.

**Lead question:** "Does it look like a product I can sell?"

**Typical complaints:** "looks like an internal tool," screens that won't survive a 10-second demo, no "wow" moment, inconsistent spacing/typography, raw JSON in the UI.

## 4. End User
**Cares about:** mental load, predictability, trust, undo, mobile use, speed.

**Lead question:** "Did I just publish to the wrong channel?"

**Typical complaints:** scary one-click destructive actions, no preview before send, no undo, schedule conflicts unsurfaced, settings I can't find, jargon ("evergreen", "stt"), modal-on-modal.

---

## Using the four voices

When auditing a surface, ask the same question from each voice. If even one role is unhappy, the issue lands in the audit doc with a severity tag.

A useful shortcut:

| Voice | Looks for | Severity bias |
|---|---|---|
| UX | broken patterns | MED–HIGH |
| PO | conversion blockers | HIGH |
| Stakeholder | polish & demo | MED |
| User | trust & safety | HIGH (anything destructive) |
