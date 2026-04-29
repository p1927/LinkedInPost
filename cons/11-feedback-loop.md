# 11. Feedback Loop

> **Stakeholders:** every user (signal source); ML/data (consumer). Strategic gap — biggest source of model improvement is unused.
> **Source files:** [`features/generation/GenerationPanel.tsx`](../frontend/src/features/generation/GenerationPanel.tsx), [`features/review/context/ReviewFlowContext.tsx`](../frontend/src/features/review/context/ReviewFlowContext.tsx), [`features/feed/components/FeedArticleCard.tsx`](../frontend/src/features/feed/components/FeedArticleCard.tsx) (👍/👎 buttons), [`features/feed/types.ts`](../frontend/src/features/feed/types.ts) (`Feedback` type). Backend: enrichment + worker telemetry, [`worker/src/db/`](../worker/src/db/).
> **Pairs with:** (no existing audit covers this in depth — new surface for the cons folder).

## What this surface is

Today: the user can 👍/👎 a feed article and pick a variant. There is no closed loop — feedback is captured at most as raw rows; nothing demonstrably changes for next generation.

## Cons — 4 perspectives

### 👤 User
- I rate articles 👍/👎 — does it do anything?
- I pick variant 2 — system never asks why or learns from it.
- I rewrite a draft heavily — that diff isn't fed back.
- After "Review changes" I see no diff before applying.

### 🎨 UX
- `[HIGH]` 👍/👎 only appears on hover (per [`02-feed.md`](02-feed.md)) — broken signal.
- `[MED]` No visible "feedback applied" state anywhere.
- `[MED]` No place to leave free-text feedback per generation.

### 📦 Product Owner
- `[HIGH]` The single biggest source of model improvement (RLHF-style) is unused.
- `[HIGH]` No A/B framework to test enrichment changes.
- `[HIGH]` No churn-protector ("we made the AI 12% better this month based on your feedback").
- `[MED]` "Save" in [`GenerationPanel.tsx`](../frontend/src/features/generation/GenerationPanel.tsx) bypasses editor entirely — variants written to Sheet without review.
- `[MED]` No "undo" if user clicks wrong variant.

### 💼 Stakeholder
- `[HIGH]` Without a loop the AI advantage flattens over time vs. competitors with closed loops.
- `[MED]` "Smart product" perception requires visible learning.

## Fixes

### Phase 1 — Quick wins (≤2 wk)
- [ ] **[HIGH]** On variant pick, log `{topicId, pickedVariantSlot, hookType, arcType, dimensions}` to a worker endpoint. No UI change yet. Files: [`useReviewFlowActions.ts`](../frontend/src/features/review/context/useReviewFlowActions.ts) + new worker handler.
- [ ] **[HIGH]** On feed 👍/👎, persist `{articleId, signal, sourceDomain, interestGroup}` per user (already in [`features/feed/types.ts`](../frontend/src/features/feed/types.ts) `Feedback` type — confirm and harden the write path to [`worker/src/db/`](../worker/src/db/)).
- [ ] **[HIGH]** After a publish, show a "Was this generation good?" 1-tap rating (star or 👍/👎) once. File: [`useReviewFlowActions.ts`](../frontend/src/features/review/context/useReviewFlowActions.ts) on publish-success.

### Phase 2 — Structural (3-6 wk)
- [ ] **[HIGH]** Pre-apply diff: when the user clicks "Review changes" in [`GenerationPanel.tsx`](../frontend/src/features/generation/GenerationPanel.tsx), show a side-by-side diff modal before commit.
- [ ] **[MED]** Build a `feedback-summary` view per topic showing how many 👍/👎/picks/edits informed the next run.
- [ ] **[MED]** Heavy-edit detection: if the user rewrote >50% of a variant, prompt "Save your edit style as a rule?" (writes to `/rules`).

### Phase 3 — Strategic (6-12 wk)
- [ ] **[HIGH]** Closed-loop fine-tuning: nightly job aggregates picks/edits/ratings, retrains a preference model, swaps it into the generation prompt.
- [ ] **[HIGH]** A/B per enrichment recipe: split users (or topics) and surface which recipe outperforms.
- [ ] **[MED]** Public "weekly improvement report" emailed to users.

## Done when

- Every variant pick, every heavy edit, every publish rating is captured.
- A user can see a per-topic feedback summary.
- A diff is shown before any AI rewrite is applied.
- A preference signal demonstrably alters next-generation output (measured on test topics).
