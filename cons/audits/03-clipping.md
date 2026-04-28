# Clipping

Clipping is the bridge between feed → topic → post. Today the dock is always-on but actions are hover-only; passage clipping only works in the detail view; drag-drop has no affordances.

## Role Cons

- **UX:** Drag-and-drop assignment has zero affordance (no drop zone, cursor, or toast); dock eats ~80px of desktop width; passage selection only works in detail view despite `SelectionClipper` being reusable.
- **PO:** Clips → posts is the activation loop. No "compose post from N clips" CTA means users don't see the path. Touch users can't assign clips at all.
- **Stakeholder:** The feature exists but doesn't feel discoverable in a demo. Drag-drop is a power-user flourish, not a primary affordance.
- **User:** I clipped 5 things — now what? No tags, no "send to topic" menu, no obvious next step.

## Files of Record

- [`frontend/src/features/feed/components/ClipsDock.tsx`](../../frontend/src/features/feed/components/ClipsDock.tsx) — dock + drafts + drag-drop
- [`frontend/src/features/feed/components/SelectionClipper.tsx`](../../frontend/src/features/feed/components/SelectionClipper.tsx) — passage selection tooltip
- [`frontend/src/features/feed/types.ts`](../../frontend/src/features/feed/types.ts) — Clip / Feedback types
- [`worker/src/db/clips.ts`](../../worker/src/db/clips.ts) — clip CRUD

## Concrete Issues

1. **[HIGH]** Drag-drop clip → draft has no affordance in `ClipsDock.tsx` — add a drop-zone hint on hover, cursor change, and success toast.
2. **[HIGH]** Always-on right strip eats desktop width — collapse to a floating bottom-right pill that expands on click; show count badge on collapsed state.
3. **[HIGH]** Passage clipping only inside `ArticleDetailView` — wire `SelectionClipper` into `FeedArticleCard.tsx` so users can clip passages from the stream.
4. **[HIGH]** No explicit "Add clip to topic" menu — required for touch users; add a context menu or 3-dot affordance per clip.
5. **[MED]** No clip categories / tags — add at minimum a topic-group label per clip (use existing topic IDs).
6. **[MED]** No "Compose post from N clips" CTA — when ≥1 clip selected, surface a primary button.
7. **[LOW]** Inline edit of clip passage is hover-only pencil icon — promote to visible action.

## Linked Phase

- **Stage 2.8** (Phase 2 — floating dock + compose-from-clips CTA)
- **Stages 3.4** (channel pill ties into per-clip "Add to topic" menu UX)
