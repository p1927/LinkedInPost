<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# frontend/src/features/feed

## Purpose
News feed browsing, article reading, and content clipping. The main page (`FeedPage.tsx`) renders a left/right split: an infinite scrolling article feed on the left and a full-height curated sidebar on the right. A fixed bottom dock (`ClipsDock`) lets users save and manage clipped articles. Articles can be opened in a slide-in detail panel for AI analysis, debate mode, and passage clipping.

## Key Files

| File | Description |
|------|-------------|
| `FeedPage.tsx` | Root page component — interest group management, layout orchestration, state for clips/articles/feedback |
| `types.ts` | Feed-specific types: `Clip`, `InterestGroup`, `FeedVote`, `ArticleFeedbackMap` |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `components/` | All feed UI components (see below) |

## components/

| File | Description |
|------|-------------|
| `FeedLeftPanel.tsx` | Infinite-scroll article list with IntersectionObserver pagination |
| `FeedArticleCard.tsx` | Individual article card — thumbnail, title, source, thumbs up/down, clip button |
| `FeedCuratedPanel.tsx` | Full-height right sidebar with platform filter dropdown (All/YouTube/Instagram/LinkedIn) and curated article sections |
| `ClipsDock.tsx` | Fixed bottom horizontal bar showing clipped article thumbnails; expands to a right-side panel with clips grid and drafts drag-drop |
| `ArticleDetailView.tsx` | Slide-in article detail panel — AI opinion, perspectives, connections tabs, passage clipping |
| `DebateModeView.tsx` | Debate mode: AI argues multiple sides of an article's topic |
| `DraftContextView.tsx` | Shows a draft's assigned clips and context for composing |
| `SelectionClipper.tsx` | Text selection tooltip for clipping highlighted passages |

## For AI Agents

### Working In This Directory
- `FeedPage.tsx` is the state owner — all clip, article, and group state lives here and is passed down as props
- `ClipsDock` is fixed-positioned at the bottom (`z-40`); content areas use `pb-16` to avoid overlap
- The right sidebar (`FeedCuratedPanel`) fills full viewport height via `h-full flex flex-col overflow-hidden` — do not add `max-h` constraints
- The article detail (`ArticleDetailView`) slides in as `absolute inset-y-0 right-0 z-20` on the outer container — it overlays both feed and sidebar

### Testing Requirements
- Article card interactions: clip, thumbs up/down, open detail
- ClipsDock: hover tooltip shows article title + passage; clicking a clip opens detail and closes expanded panel
- FeedCuratedPanel: platform filter dropdown switches content correctly

### Common Patterns
- Interest groups are pills in the header; selecting one loads cached articles from the DB
- Feed articles use IntersectionObserver for infinite scroll (batch size 20)
- Thumbs-down articles are sorted to the bottom via `feedbackMap`
- `clippedUrls` (a `Set<string>`) prevents duplicate clips for the same article URL

## Dependencies

### Internal
- `features/trending/` — `useTrending`, `useTrendingSearch`, YouTube/Instagram/LinkedIn panels
- `services/backendApi.ts` — all clip, article, interest group, and feedback API calls

<!-- MANUAL: -->
