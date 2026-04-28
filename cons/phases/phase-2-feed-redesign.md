# Phase 2 — Feed Redesign

## Goal

Make the feed feel like Twitter / Perplexity — multi-column, scannable, mobile-first, with filters and search.

## Stages

### Stage 2.1 — 2-column masonry on desktop
- **Files:** [`frontend/src/features/feed/FeedPage.tsx`](../../frontend/src/features/feed/FeedPage.tsx), [`frontend/src/features/feed/components/FeedLeftPanel.tsx`](../../frontend/src/features/feed/components/FeedLeftPanel.tsx)
- **Change:** Switch the feed area from single column to a 2-column CSS grid / masonry on `≥lg`; keep single column on mobile. Cards keep current width but flow into two tracks.
- **Done when:** Feed renders 2 columns on desktop, 1 on mobile; no card overflow; infinite scroll still works.
- **Risk:** medium

### Stage 2.2 — Sticky filter bar
- **Files:** [`FeedPage.tsx`](../../frontend/src/features/feed/FeedPage.tsx)
- **Change:** Add a sticky bar above the feed with chips: Latest / Trending / For You / per-Topic. State stored in URL query. Default = Latest.
- **Done when:** Selecting a chip filters the stream and updates the URL; refresh preserves filter.
- **Risk:** medium

### Stage 2.3 — Mobile trending carousel
- **Files:** [`FeedPage.tsx`](../../frontend/src/features/feed/FeedPage.tsx), [`frontend/src/features/feed/components/FeedCuratedPanel.tsx`](../../frontend/src/features/feed/components/FeedCuratedPanel.tsx)
- **Change:** When right rail is hidden (`<lg`), render Top-10 + trending words as a horizontally scrollable carousel above the stream so mobile users still get discovery.
- **Done when:** On mobile, trending content is visible above the feed; no layout jumps.
- **Risk:** medium

### Stage 2.4 — Search-in-feed
- **Files:** [`FeedPage.tsx`](../../frontend/src/features/feed/FeedPage.tsx), [`FeedLeftPanel.tsx`](../../frontend/src/features/feed/components/FeedLeftPanel.tsx)
- **Change:** Add a Perplexity-style search input at the top of the feed. Client-side filter on title + description; debounce 200ms. Pass query through props or context to the left panel.
- **Done when:** Typing filters the visible cards in real time; clearing restores the full stream.
- **Risk:** low

### Stage 2.5 — Quality-signal sort (replace "Evergreen")
- **Files:** [`FeedCuratedPanel.tsx`](../../frontend/src/features/feed/components/FeedCuratedPanel.tsx), [`worker/src/db/clips.ts`](../../worker/src/db/clips.ts), feedback tables in worker
- **Change:** Replace description-length proxy with a real signal: weighted score from upvote count + clip count over a rolling 7-day window. Worker exposes a sorted endpoint; UI consumes it.
- **Done when:** "Evergreen" tab now shows articles ranked by user signal, not text length.
- **Risk:** medium (worker change required)

### Stage 2.6 — Append-skeletons + larger batches
- **Files:** [`FeedLeftPanel.tsx`](../../frontend/src/features/feed/components/FeedLeftPanel.tsx)
- **Change:** Bump `BATCH_SIZE` to 20. Show 3 skeleton cards at the bottom while next batch loads via IntersectionObserver.
- **Done when:** Scrolling past the last card shows skeletons, then more content; no flicker.
- **Risk:** low

### Stage 2.7 — Detail view as side-sheet on desktop
- **Files:** [`frontend/src/features/feed/components/ArticleDetailView.tsx`](../../frontend/src/features/feed/components/ArticleDetailView.tsx), [`FeedPage.tsx`](../../frontend/src/features/feed/FeedPage.tsx)
- **Change:** On `≥lg`, render the detail view as a right-side sheet (e.g. 480px wide) with the feed still visible behind. On mobile, keep full-screen.
- **Done when:** Clicking a card on desktop opens a side sheet; user can scroll feed and see detail simultaneously.
- **Risk:** medium

### Stage 2.8 — Floating clips dock + compose CTA
- **Files:** [`frontend/src/features/feed/components/ClipsDock.tsx`](../../frontend/src/features/feed/components/ClipsDock.tsx)
- **Change:** Replace always-on right strip with a floating bottom-right pill showing clip count badge. Click to expand into the existing panel. Inside expanded panel, when ≥1 clip selected, surface a primary "Compose post from N clips" CTA that creates a draft topic with those clips attached.
- **Done when:** Dock no longer eats desktop width by default; selecting clips reveals the compose CTA; clicking it creates a topic.
- **Risk:** medium
