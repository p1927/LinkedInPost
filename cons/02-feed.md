# 02. Feed Page

> **Stakeholders:** every user. Daily-driver page.
> **Source files:** [`frontend/src/features/feed/FeedPage.tsx`](../frontend/src/features/feed/FeedPage.tsx) (~1,109 lines), [`features/feed/components/FeedArticleCard.tsx`](../frontend/src/features/feed/components/FeedArticleCard.tsx), [`features/feed/components/FeedLeftPanel.tsx`](../frontend/src/features/feed/components/FeedLeftPanel.tsx), [`features/feed/components/FeedCuratedPanel.tsx`](../frontend/src/features/feed/components/FeedCuratedPanel.tsx).
> **Mockups (intended design):** [`mockups/feed-design-1-focus.html`](mockups/feed-design-1-focus.html), [`mockups/feed-design-b2.html`](mockups/feed-design-b2.html), [`mockups/feed-designs.html`](mockups/feed-designs.html).
> **Pairs with:** [`audits/02-feed.md`](audits/02-feed.md) and [`phases/phase-2-feed-redesign.md`](phases/phase-2-feed-redesign.md).

## What this surface is

The news consumption surface where the user scrolls articles, filters by interest group, and converts an article into a post idea. Should feel like Twitter / Perplexity: dense, scannable, two-panel (stream + trending rail), keyboard-friendly.

## Cons — 4 perspectives

### 👤 User
- Cards are tall and feel slow to skim; I can only see ~2 stories at a time.
- Thumb-up / thumb-down / clip only appear on hover — I miss them entirely on first visit.
- Clicking a card opens a side sheet that **covers** the trending panel I was reading.
- I can't tell at a glance which source published a story (no domain or favicon).
- No keyboard shortcuts to scroll the feed (j/k) or open an article.
- Search field is tiny (160px) and only filters titles.
- On phone, the right rail vanishes — discovery dies.

### 🎨 UX
- `[HIGH]` Single-column dense list — should be 2-column masonry on `≥lg`, single column on mobile.
- `[HIGH]` Card summary clamped to 1 line and only shown when description exists — should show 2-line summary by default.
- `[HIGH]` Hover-only Clip / 👍 / 👎 — promote to an always-visible footer toolbar (Twitter-style).
- `[HIGH]` Right curated panel hidden on `<lg` — needs a Trending carousel above the stream on small screens.
- `[MED]` Source rendered as plain text, no badge / favicon / hover preview.
- `[MED]` Group color picker accepts collisions (two groups in similar hues).
- `[MED]` Hover affordances violate WCAG 2.1 SC 1.3.3 (info conveyed only by hover).

### 📦 Product Owner
- `[HIGH]` No filters above the feed — no Latest / Trending / For You / per-Topic.
- `[HIGH]` No search inside the feed (Perplexity-style top search box, client-side filter on titles + summaries).
- `[HIGH]` "Evergreen" sort uses description length as a quality proxy — replace with vote/clip-rate signal (worker change).
- `[MED]` No "save for later" without clipping — clip is overloaded.
- `[MED]` No deep linking to a specific article (cannot share a feed item).
- `[MED]` Trending words / recommended topics on the right are read-only — no "create topic from this".

### 💼 Stakeholder
- `[HIGH]` The feed is the daily-active driver; weak scan-ability undermines DAU.
- `[HIGH]` Compared to Perplexity / Twitter, the layout looks like an internal RSS reader.
- `[MED]` Without source attribution, perception is "AI scraped slop", not curated.
- `[MED]` Mockups already show the intended dense layout — current build looks like a regression.

## Fixes

### Phase 1 — Quick wins (≤2 wk)
- [ ] **[HIGH]** [`FeedArticleCard.tsx`](../frontend/src/features/feed/components/FeedArticleCard.tsx) — make 👍 👎 ✂ persistently visible (not `group-hover`). Acceptance: actions visible without hover; touch-friendly (≥40px hit target).
- [ ] **[HIGH]** [`FeedArticleCard.tsx`](../frontend/src/features/feed/components/FeedArticleCard.tsx) — render a 16px favicon next to source name (`new URL(article.url).hostname` → favicon service or local cache).
- [ ] **[HIGH]** [`FeedArticleCard.tsx`](../frontend/src/features/feed/components/FeedArticleCard.tsx) — replace 20×16 thumbnail with `aspect-[4/3]` 96px wide; `object-cover` and a graceful CSS fallback.
- [ ] **[HIGH]** [`FeedArticleCard.tsx`](../frontend/src/features/feed/components/FeedArticleCard.tsx) — show 2-line summary by default on every card.
- [ ] **[MED]** [`FeedPage.tsx`](../frontend/src/features/feed/FeedPage.tsx) — expand search input to fill header width on `>=md`; add a "Search description too" toggle.
- [ ] **[MED]** [`FeedPage.tsx`](../frontend/src/features/feed/FeedPage.tsx) — show source badge with brand color (`bg-zinc-100 text-zinc-700` baseline) instead of plain text.
- [ ] **[MED]** [`FeedPage.tsx`](../frontend/src/features/feed/FeedPage.tsx) — add `j/k` keyboard nav (focus next/prev card), `o` to open detail, `c` to clip.
- [ ] **[MED]** [`FeedLeftPanel.tsx`](../frontend/src/features/feed/components/FeedLeftPanel.tsx) — bump infinite-scroll batch from 10 to 20; add append skeleton loaders.

### Phase 2 — Structural (3-6 wk)
- [ ] **[HIGH]** **Two-panel layout** per [`mockups/feed-design-1-focus.html`](mockups/feed-design-1-focus.html): sidebar 192px → feed center max-w-720 → trending rail right (always visible, 320px on `≥lg`, top-of-feed carousel on `<lg`). Article detail opens **inline expansion** under the card or in a new tab — never covers the rail. File: [`FeedPage.tsx`](../frontend/src/features/feed/FeedPage.tsx).
- [ ] **[HIGH]** Replace [`FeedArticleCard.tsx`](../frontend/src/features/feed/components/FeedArticleCard.tsx) with a horizontal scannable variant (thumb 96×72 left, title 2-line clamp, summary 2-line clamp, actions row below). Single-column flow but each card height ≤120px. Move to 2-col masonry on `≥lg`.
- [ ] **[HIGH]** Sticky filter bar above the feed (Latest / Trending / For You / per-Topic).
- [ ] **[MED]** [`FeedCuratedPanel.tsx`](../frontend/src/features/feed/components/FeedCuratedPanel.tsx) — convert from full cards to compact list ("Top 10", "Evergreen", "Trending words"). Every trending word becomes a clickable filter chip.
- [ ] **[MED]** Refactor `FeedLeftPanel.tsx` infinite-scroll sentinel; add an explicit "Load more" button as fallback when IntersectionObserver under-fires.
- [ ] **[MED]** Add `SaveForLater` action distinct from clip; surface in profile.
- [ ] **[MED]** Source-diversity / dedupe: when 5 outlets cover one story, group as "5 sources" expandable.

### Phase 3 — Strategic (6-12 wk)
- [ ] **[HIGH]** Personalisation: rank "For You" with a learned model fed by 👍 👎 + clip + open-detail signals. Worker change.
- [ ] **[MED]** Per-source domain controls (mute / boost) on the trending panel.
- [ ] **[MED]** "Compose post from article" CTA on the card itself (one click → AddTopicPage prefilled).
- [ ] **[HIGH]** Mobile-first redesign: collapse left rail to a sheet, cards stay horizontal scannable, top Trending carousel.
- [ ] **[MED]** WCAG AA audit: focus rings, ARIA, screen-reader pass.
- [ ] **[LOW]** "Evergreen" sort uses true vote/clip-rate signal (worker change).

## Done when

- Visual density matches [`mockups/feed-design-1-focus.html`](mockups/feed-design-1-focus.html): ≥4 cards visible above the fold at 1440px.
- Trending rail stays visible while the user reads any article.
- Every card has a favicon + source badge + 2-line summary by default.
- Keyboard alone can scroll, open, clip, react.
- Hover-only actions: zero remaining.
- Mobile shows a Trending carousel; right-rail stories don't disappear.
