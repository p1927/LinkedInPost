# Feed

The aspiration is Twitter / Perplexity. The reality is a single-column dense list with hover-only actions, summaries hidden behind a click, no filters, and a curated panel that disappears below the lg breakpoint.

## Role Cons

- **UX:** Single-column wastes desktop space; cards show only headlines (summary is 1-line clamp + hidden); Clip / 👍 / 👎 only appear on hover; no skeletons on append; right rail hidden on tablet/mobile.
- **PO:** Discovery is the on-ramp to clipping → posting. A clunky stream means fewer clips → fewer posts. No "For you" or signal-driven sort.
- **Stakeholder:** Doesn't feel like a category leader. Compared to Perplexity / Twitter, the layout looks like an internal RSS reader.
- **User:** Can't scan; can't search; can't tell trending from old; on phone, no discovery at all (right rail vanishes); detail view is full-screen so I lose my place.

## Files of Record

- [`frontend/src/features/feed/FeedPage.tsx`](../../frontend/src/features/feed/FeedPage.tsx) — layout, state, API
- [`frontend/src/features/feed/components/FeedLeftPanel.tsx`](../../frontend/src/features/feed/components/FeedLeftPanel.tsx) — infinite scroll (BATCH_SIZE=10)
- [`frontend/src/features/feed/components/FeedArticleCard.tsx`](../../frontend/src/features/feed/components/FeedArticleCard.tsx) — card render
- [`frontend/src/features/feed/components/FeedCuratedPanel.tsx`](../../frontend/src/features/feed/components/FeedCuratedPanel.tsx) — right rail (Top 10, Evergreen)
- [`frontend/src/features/feed/components/ArticleDetailView.tsx`](../../frontend/src/features/feed/components/ArticleDetailView.tsx) — detail view

## Concrete Issues

1. **[HIGH]** Single-column dense list in `FeedPage.tsx` — move to 2-column masonry on `≥lg`, single column on mobile.
2. **[HIGH]** Card summary clamped to 1 line and only shown when description exists — show 2-line summary by default on every card in `FeedArticleCard.tsx`.
3. **[HIGH]** Hover-only Clip / 👍 / 👎 — promote to an always-visible footer toolbar (Twitter-style).
4. **[HIGH]** Right curated panel hidden on `<lg` in `FeedPage.tsx` — move to a top "Trending" carousel above the stream on small screens.
5. **[HIGH]** No filters above the feed — add a sticky filter bar (Latest / Trending / For You / Topic).
6. **[HIGH]** No search inside the feed — add a Perplexity-style search box at the top; client-side filter on titles + summaries.
7. **[MED]** Infinite scroll in `FeedLeftPanel.tsx` batches 10 with no skeleton on append — bump to 20 + add append skeletons.
8. **[MED]** "Evergreen" sort uses description length as a quality proxy — replace with vote/clip-rate signal (worker change required).
9. **[MED]** Detail view is full-screen — change to side-sheet on desktop so the feed stays visible.
10. **[MED]** No source-diversity / dedupe affordance — when 5 outlets cover one story, group as "5 sources" expandable.
11. **[LOW]** Tabs in curated panel (Feed / YouTube / Instagram / LinkedIn) live in a sticky panel that scrolls independently — visually disconnected from main feed.

## Linked Phase

- **Stage 1.3** (Phase 1 — summary + always-visible toolbar)
- **Stages 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7** (Phase 2 — Feed Redesign)
