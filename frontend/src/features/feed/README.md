# Feed Feature — Architecture & Guide

The feed feature (`frontend/src/features/feed/`) provides news article browsing, interest-group curation, content clipping, and AI-powered article analysis. It is a primary content-discovery surface of the LinkedIn Post dashboard.

## Project Structure

```
feed/
├── FeedPage.tsx          # Root page — state owner, layout orchestration
├── types.ts               # Shared types: Clip, InterestGroup, FeedVote, ArticleFeedbackMap
├── AGENTS.md              # AI-agent guidance (how to work in this directory)
├── components/
│   ├── FeedLeftPanel.tsx      # Infinite-scroll article list (left pane)
│   ├── FeedArticleCard.tsx    # Single article card — clip, thumbs, open
│   ├── FeedCuratedPanel.tsx   # Full-height right sidebar — platform filter + curated sections
│   ├── ClipsDock.tsx          # Fixed bottom bar — clipped article thumbnails
│   ├── ArticleDetailView.tsx  # Slide-in detail panel — AI analysis, debate, passage clip
│   ├── DebateModeView.tsx     # Multi-sided debate view for an article topic
│   ├── DraftContextView.tsx   # Shows clips assigned to a draft
│   ├── SelectionClipper.tsx    # Text-selection tooltip for clipping passages
│   └── InterestGroupsSettings.tsx  # Create/edit interest groups modal
└── hooks/
    └── useFeedKeyboard.ts    # Keyboard shortcut handler for feed navigation
```

## How to Run

### Development Server

```bash
cd frontend
npm run dev
# → http://localhost:5173 (or next available port — check output)
```

The feed page is at `/feed` (or `/` when authenticated). Ensure `VITE_WORKER_URL` points to a running worker instance.

### Production Build

```bash
cd frontend
npm run build   # TypeScript check + Vite production bundle
```

**Build prerequisites:** `python3 ../scripts/generate_features.py` runs as `prebuild`. Requires no external services — all data is fetched at runtime.

---

## Architecture

### State Ownership

`FeedPage.tsx` is the single source of truth for all feed-related state:

| State | Type | Purpose |
|---|---|---|
| `feedArticles` | `NewsArticle[]` | All loaded articles |
| `openArticle` | `NewsArticle \| null` | Currently viewed article |
| `clips` | `Clip[]` | User's clipped articles |
| `interestGroups` | `InterestGroup[]` | Curated topic groups |
| `feedbackMap` | `ArticleFeedbackMap` | Per-URL up/down votes |
| `readArticles` | `Set<string>`` | URLs marked as read |
| `showUnreadOnly` | `boolean` | Left-panel filter toggle |

State is passed down via props; no external state library beyond the session-level `feedStore` (Zustand) for cross-page persistence.

### Data Flow

```
Interest Groups (loaded from API on mount)
        ↓
Articles (fetched on group selection — cached in DB)
        ↓
FeedLeftPanel ← filtered/sorted by `showUnreadOnly` + `feedbackMap`
        ↓
ArticleDetailView (slide-in on open)
        ├── DebateModeView (AI multi-sided analysis)
        ├── DraftContextView (assigned clips + draft context)
        └── ClipsDock (bottom bar — passage clip via SelectionClipper)
```

### Clips Persistence

Clips are stored **locally first** via `localStorage` key `feed-clips-v2`, then synced to KV on save. On mount, the app tries KV first (via `api.getClipsFromKv`), falling back to localStorage. This means the dock works even when offline from the API.

### Keyboard Navigation

`useFeedKeyboard` handles: `j`/`k` (up/down), `Enter` (open), `o` (open in new tab), `c` (clip), `?` (help). Registered globally when the feed page is active.

### Platform Filter

`FeedCuratedPanel` (right sidebar) owns the platform filter dropdown (All / YouTube / Instagram / LinkedIn / News). Filtering is client-side — articles are pre-loaded from the worker API.

---

## API Surface (BackendApi)

All API calls go through `services/backendApi.ts`:

| Method | Purpose |
|---|---|
| `listInterestGroups(idToken)` | Fetch all interest groups |
| `createInterestGroup(idToken, payload)` | Create a group |
| `updateInterestGroup(idToken, payload)` | Edit a group |
| `deleteInterestGroup(idToken, groupId)` | Remove a group |
| `getClipsFromKv(idToken, userId)` | Load clips from KV |
| `saveClipToKv(idToken, userId, clip)` | Persist a clip |
| `deleteClipFromKv(idToken, userId, clipId)` | Remove a clip |
| `setArticleFeedback(idToken, url, vote)` | Submit up/down vote |
| `findDraftConnections(idToken, article)` | AI: find related drafts |
| `findDebateArticle(idToken, article)` | AI: fetch opposing angle |
| `crossDomainInsight(idToken, article)` | AI: cross-domain connections |
| `opinionLeaderInsights(idToken, article)` | AI: find opinion leaders |

---

## Known Limitations

1. **No real-time updates** — articles are fetched on group selection; new articles from the worker are not pushed. Refresh button re-fetches.

2. **Clips sync is best-effort** — if `saveClipToKv` fails silently, the clip remains in localStorage only. The next successful sync will overwrite local state with KV's version (deduped by clip ID).

3. **No offline article reading** — articles are fetched on demand; opening an article without network access shows an error state in `ArticleDetailView`.

4. **Interest groups have no sharing model** — groups are per-user (server-side). Creating a group shares it with the user's account only.

5. **Debate mode is AI-only** — debate articles are generated by the LLM; there is no human-curated opposing view. The quality depends on the model.

6. **No pagination controls** — `FeedLeftPanel` uses IntersectionObserver with a fixed batch size of 20. There is no "load more" button or scroll-to-top affordance.

7. **No search within articles** — client-side search (`searchQuery` + `debouncedSearchQuery`) filters the already-loaded set; it does not hit the API.

8. **Thumbs-down feedback is soft** — down-voted articles are sorted to the bottom but not hidden. There is no "hide this source" or "never show this topic" mechanism.

9. **Large builds** — `vite build` emits chunks over 500 kB (ort-wasm-simd is ~23 MB). Code-splitting by route is not yet implemented.

---

## Adding New Panel Types

To add a new platform panel in `FeedCuratedPanel`:

1. Add the component import (e.g., `YouTubePanel` from `features/trending/components/YouTubePanel`)
2. Add the render condition inside the platform switch in `FeedCuratedPanel`
3. Pass the filtered article list and API handle as props

No changes to `FeedPage.tsx` are required — `FeedCuratedPanel` receives articles directly from its own props.