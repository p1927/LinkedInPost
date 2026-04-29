# 03. Article Detail & Clips

> **Stakeholders:** active feed users. Feature underused due to discoverability.
> **Source files:** [`features/feed/components/ArticleDetailView.tsx`](../frontend/src/features/feed/components/ArticleDetailView.tsx) (~557 lines), [`features/feed/components/ClipsDock.tsx`](../frontend/src/features/feed/components/ClipsDock.tsx) (~372 lines), [`features/feed/components/SelectionClipper.tsx`](../frontend/src/features/feed/components/SelectionClipper.tsx), [`features/feed/types.ts`](../frontend/src/features/feed/types.ts), [`worker/src/db/clips.ts`](../worker/src/db/clips.ts).
> **Mockups:** [`mockups/clips-panel-mocks.html`](mockups/clips-panel-mocks.html).
> **Pairs with:** [`audits/03-clipping.md`](audits/03-clipping.md) and [`phases/phase-2-feed-redesign.md`](phases/phase-2-feed-redesign.md) (Stage 2.8).

## What this surface is

**ArticleDetailView** = right side-sheet (480px) showing AI analysis, post angles, opinion textarea, perspectives, debate mode. **ClipsDock** = floating bottom-right pill that expands into a 3-column grid; clips can be article-level (`type: 'article'`) or passage-level (`type: 'passage'`); drag-drop assigns to a draft. **SelectionClipper** is a passage-selection tooltip that today only fires inside ArticleDetailView.

## Cons — 4 perspectives

### 👤 User
- The detail sheet covers my trending rail — I lose context.
- AI analysis takes 1-2 s; the skeleton looks different from the final, jarring.
- Opinion textarea is tiny (80px); composing a real take requires a bigger canvas.
- I never noticed the clips dock until someone pointed at the bottom-right pill.
- Drag-and-drop a clip into a draft is fragile — both lists scroll, drop targets are unclear.
- Edit-passage textarea is 3 rows; long quotes wrap badly.
- Delete a clip needs right-click — accidentally I keep losing them.
- I can't clip a passage from the feed stream — only from the detail view.

### 🎨 UX
- `[HIGH]` Drag-drop clip → draft has zero affordance in `ClipsDock.tsx` (no drop zone, cursor change, success toast).
- `[HIGH]` Always-on right strip eats desktop width.
- `[HIGH]` Tabs (Opinion / Perspectives / Connection / Debate) use 12px font in a small bar.
- `[MED]` "Opposing View" panel is amber + quote-marked but content quality varies; promise/payoff mismatch.
- `[MED]` Hero image 192px max with no lightbox affordance.
- `[MED]` Clips grid uses `aspect-video` thumbs; portrait images cropped weirdly.
- `[MED]` ClipsDock pill (56px) blends into white background — count badge helps but discoverability still poor.
- `[MED]` Bulk-select missing entirely.

### 📦 Product Owner
- `[HIGH]` `SelectionClipper` is reusable but only wired into the detail view — wire into [`FeedArticleCard.tsx`](../frontend/src/features/feed/components/FeedArticleCard.tsx) so users can clip passages from the stream.
- `[HIGH]` No explicit "Add clip to topic" menu — required for touch users.
- `[HIGH]` No "Compose post from N clips" CTA — when ≥1 clip selected, surface a primary button.
- `[MED]` A "clip" overloads two concepts (whole article vs passage); users don't differentiate them mentally.
- `[MED]` No clip tagging or grouping → list grows linearly and becomes unusable past ~30 clips.
- `[MED]` Debate mode is full-screen — context switch breaks flow.

### 💼 Stakeholder
- `[HIGH]` Clips → posts is the activation loop. Drag-drop fragility lowers conversion.
- `[MED]` Drag-and-drop is a power-user flourish, not a primary affordance — bad demo.
- `[LOW]` Clips are an underused growth feature; weak discoverability hides retention value.

## Fixes

### Phase 1 — Quick wins (≤2 wk)
- [ ] **[HIGH]** [`ClipsDock.tsx`](../frontend/src/features/feed/components/ClipsDock.tsx) — replace right-click delete with a visible trash icon on each clip card (always rendered, not hover).
- [ ] **[HIGH]** [`ClipsDock.tsx`](../frontend/src/features/feed/components/ClipsDock.tsx) — add drop-zone affordance: highlight target rows on drag-over, change cursor, fire success toast on drop.
- [ ] **[HIGH]** [`ClipsDock.tsx`](../frontend/src/features/feed/components/ClipsDock.tsx) — when ≥1 clip exists, show a primary "Compose post from clips" button at the dock top.
- [ ] **[MED]** [`ClipsDock.tsx`](../frontend/src/features/feed/components/ClipsDock.tsx) — make the floating pill use `bg-zinc-900 text-white shadow-lg`; tooltip on hover: "Your clips (N)".
- [ ] **[MED]** [`ClipsDock.tsx`](../frontend/src/features/feed/components/ClipsDock.tsx) — increase passage edit textarea to 6 rows + monospace alt-toggle.
- [ ] **[MED]** [`ClipsDock.tsx`](../frontend/src/features/feed/components/ClipsDock.tsx) — add bulk select (checkbox per clip) and "Delete N" / "Assign to draft…" actions.
- [ ] **[MED]** [`ArticleDetailView.tsx`](../frontend/src/features/feed/components/ArticleDetailView.tsx) — opinion textarea `min-h-[160px] resize-y`; `<details>` wrapper for "Why does it matter?".
- [ ] **[MED]** [`ArticleDetailView.tsx`](../frontend/src/features/feed/components/ArticleDetailView.tsx) — add lightbox on hero image click.
- [ ] **[MED]** [`ArticleDetailView.tsx`](../frontend/src/features/feed/components/ArticleDetailView.tsx) — show an explicit "Read full article ↗" primary button at top, not buried.
- [ ] **[HIGH]** Wire [`SelectionClipper.tsx`](../frontend/src/features/feed/components/SelectionClipper.tsx) into [`FeedArticleCard.tsx`](../frontend/src/features/feed/components/FeedArticleCard.tsx) — passage clipping from the stream.

### Phase 2 — Structural (3-6 wk)
- [ ] **[HIGH]** Move article detail from right-sheet to **inline expansion** under the feed card OR a new tab — never cover the trending rail (per [`02-feed.md`](02-feed.md)).
- [ ] **[HIGH]** Convert ClipsDock from floating modal to a **collapsible side rail** matching [`mockups/clips-panel-mocks.html`](mockups/clips-panel-mocks.html) (Option A or B). Width 52-68 collapsed, 50% overlay expanded.
- [ ] **[MED]** Introduce `clipGroupId` (nullable) on `Clip` and surface a sidebar in the dock for groups; backend: [`worker/src/db/clips.ts`](../worker/src/db/clips.ts) schema migration.
- [ ] **[MED]** Replace tabbed AI panel with a **single scrollable stack** (Summary → Why-it-matters → Opposing → Angles → Perspectives) — one tab is the user's true mental model.
- [ ] **[MED]** Inline debate (split-screen with opposing article) instead of full-screen mode.
- [ ] **[MED]** Per-clip "Add to topic" 3-dot menu (touch-accessible alternative to drag-drop).

### Phase 3 — Strategic (6-12 wk)
- [ ] **[MED]** AI-suggested clip groupings (auto-tag by topic).
- [ ] **[MED]** Clip → post template flows ("Use this clip in a Hot-take post" → prefilled AddTopicPage).
- [ ] **[HIGH]** Cache article AI analysis on the worker so opening detail is instant for revisits.
- [ ] **[LOW]** Clip analytics: which clips get used in published posts; surface "Top clips this month".

## Done when

- Opening an article never covers the trending rail.
- Clips are visible affordance (no hidden actions); bulk operations work.
- AI analysis renders <200ms on a re-open.
- Clip groups exist and are filterable.
- Touch users can assign clips to drafts via a 3-dot menu.
- Passage clipping works from feed cards (not only detail view).
