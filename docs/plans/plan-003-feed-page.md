# Feed Page — Design Spec
*2026-04-28*

---

## Context

Users currently discover content on the `/trending` page (search-driven, topic-specific) and create posts on `/topics`. There is no passive reading experience — no way to stumble across ideas, accumulate research across sessions, or build up context for a post organically over time.

The analogy: a person reading a newspaper clips articles, pins them to a notice board, groups them by theme, and uses that collage to write. This feature builds that workflow into the product.

`/feed` replaces `/trending` over time. It is built by copying the trending page as a starting point, then extending it. When complete, `/trending` is removed from nav and redirected.

---

## 1. Interest Groups (User Profile)

A prerequisite for the auto-populated feed. Without declared interests, the left feed has nothing to show by default.

**Where it lives:** User profile/settings — a new "Interests" section.

**Model:**
```
InterestGroup {
  id: string
  name: string              // e.g. "Chess", "AI & Marketing"
  topics: string[]          // keywords/topics to search, e.g. ["chess openings", "Magnus Carlsen"]
  domains: string[]         // optional: restrict to specific sites/RSS feeds
  color: string             // for visual distinction in the switcher
}
```

**UI:** Simple CRUD list in profile settings. User creates groups, adds topic keywords and optional domain filters per group. No limit on groups.

**Feed switcher:** A pill/tab row at the top of the Feed page. Clicking a group instantly reloads both the left feed and the right curated panel for that group's topics. Active group is persisted per session (and ideally to user config).

---

## 2. Feed Page Layout (`/feed`)

**Base:** Copy `TrendingDashboard.tsx` and its child components. Keep the search bar and filters (region, genre, windowDays) at the top — they work for both interest-group browsing and ad-hoc search.

**Split layout:**
```
┌──────────────────────────────┬────────────────────┬────┐
│  Interest group switcher     │  (pills row)       │    │
│  Search + filters            │                    │    │
├──────────────────────────────┼────────────────────┤    │
│  LEFT: Infinite scroll feed  │  RIGHT: Curated    │ 📎 │
│  - Trending Now (top)        │  Tabs:             │    │
│  - Then newer articles       │  · Top 10 Today    │ C  │
│  - Article cards             │  · Evergreen       │ L  │
│  - Hover → ✂️ on text/card  │  · YouTube         │ I  │
│                              │  · Instagram       │ P  │
│                              │  · LinkedIn        │ S  │
└──────────────────────────────┴────────────────────┴────┘
```

**Left panel — article card anatomy:**
- Thumbnail image (if available)
- Headline + source + timestamp
- 2-line snippet
- Hover state: ✂️ scissor icon appears on text passages; clip-whole-card button appears in top-right corner of card

**Right panel — curated:**
- Tabs replace the current platform panel toggles
- `Top 10 Today`: AI-ranked top 10 articles for the active interest group
- `Evergreen`: Timeless background reading on the group's topics
- `YouTube / Instagram / LinkedIn`: Existing trending panel content (preserved from current trending page)
- Right panel also re-filters when interest group or search changes

---

## 3. Clips Dock

A persistent vertical strip on the far-right edge of the screen. **Persists across sessions** — stored in user config (D1 or KV), not in-memory.

**Collapsed state (thin strip):**
- Shows stacked thumbnail chips
- **Mac Dock magnification** on hover: the hovered thumbnail expands to show clip title, source, and a snippet preview. Neighbours scale slightly. Pure CSS transform + transition.
- Click a thumbnail → opens article detail for that clip
- Right-click / long-press → delete clip option

**Expanded state (slides open from right):**
- Triggered by clicking an expand icon on the dock
- Reveals a wider panel showing all clips as scrollable thumbnails
- Below/beside thumbnails: **Drafts list** — all existing draft posts listed
- Click a draft → enters **Draft Context Mode** (Mode 3)
- Drag a thumbnail from the clips list onto a draft row → assigns clip to that draft

**Clip data model:**
```
Clip {
  id: string
  type: 'article' | 'passage'
  articleTitle: string
  articleUrl: string
  source: string
  publishedAt: string
  thumbnailUrl?: string
  passageText?: string        // if clipping a text selection, not whole article
  clippedAt: string
  versions: ClipVersion[]     // edit history; editing creates a new version
  assignedPostIds: string[]   // which drafts this clip is pinned to
}
```

**Clipping interaction:**
1. Hover any article card → scissor icon appears
2. Or: highlight a text passage → scissor icon appears inline
3. Click scissor → clip created, thumbnail animates into the dock with a spring effect
4. Clip is immediately saved to backend (persists across sessions)

**Editing a clip:**
- Click pencil icon on thumbnail → inline edit of passageText
- Saves as a new version; previous versions accessible via version indicator

---

## 4. Article Detail View (Mode 2)

Triggered by clicking any article card. The layout transitions: left side shows full article content, right panel replaces curated content with contextual AI panels.

```
┌─────────────────────┬──────────────────────────────┬────┐
│  ← Back             │  [G] Summary                 │    │
│                     │  What is this about?         │    │
│  Full article       │  Why does it matter?         │ 📎 │
│  content            │  What angle can you take?    │ D  │
│                     │  ─────────────────           │ O  │
│  (scissor still     │  [H] Opposing view           │ C  │
│  available on       │  ─────────────────           │ K  │
│  text selections)   │  [I] 3 post angles           │    │
│                     │  ─────────────────           │    │
│                     │  Tabs: J · K · L · M         │    │
│                     │  ─────────────────           │    │
│                     │  Related articles (scroll)   │    │
│                     │  Opposing articles (scroll)  │    │
└─────────────────────┴──────────────────────────────┴────┘
```

**Right panel sections (always visible, not tabbed):**
- **[G] Article intelligence:** Collapsible cards — Summary, Why it matters, Post angle suggestion. Generated on open (streamed), cached after first load.
- **[H] Opposing view:** One contrarian take or counter-article summary
- **[I] 3 post angles:** Three distinct LinkedIn post framings derived from the article

**Tabs below G/H/I:**
- **[J] Opinion prompt:** "Most people think X — do you agree?" → editable response that can be clipped
- **[K] Perspective flip:** Same article through 3 lenses (founder / expert / beginner)
- **[L] Connection finder:** "This relates to your draft about Y" — scans existing drafts for relevance
- **[M] Debate mode:** Pulls one supporting + one opposing article side by side

**Related / opposing articles:** Pulled using existing `searchNewsResearch` API with the article's topic as query. Opposing = search with negation or contrarian framing.

---

## 5. Draft Context Mode (Mode 3)

Triggered by: expanding the dock → clicking a draft.

**Collapsible:** A collapse button (chevron left) returns to the Feed/Article Detail view with the dock re-collapsed. Expand = near-full-screen Notion-like layout.

```
┌────────────────────────┬─────────────────────────────────┐
│  Draft Editor          │  Context Panel                  │
│  (Notion-like,         │  ─────────────────              │
│  existing EditorScreen │  AI-clustered clips:            │
│  or simplified text    │  Theme A: [clip] [clip]         │
│  editor)               │  Theme B: [clip]                │
│                        │  ─────────────────              │
│                        │  ✅ Supports your point         │
│                        │  [clip] [clip]                  │
│                        │  ⚡ Challenges your point       │
│                        │  [clip]                         │
│                        │  ─────────────────              │
│                        │  Tabs: Q · R                    │
│                        │  Q: Cross-domain surprise       │
│                        │  R: Opinion leaders on topic    │
└────────────────────────┴─────────────────────────────────┘
```

**Context panel behaviour:**
- Shows all clips assigned to this draft
- AI clusters them by theme (call to `/api/generate/stream` with clip metadata, ask for grouping)
- Support/challenge split: AI labels each clip as supporting or challenging the draft's main point (derived from first 280 chars of draft text)
- Drag a clip from the panel into the editor → inserts it as a context block (visually distinct, easy to remove)
- Remove from editor → clip returns to panel (not deleted)
- Remove from panel → clip goes back to dock (not deleted from dock)
- Delete from dock = permanent deletion (with confirmation)

**Left editor:**
- Reuse the existing `EditorScreen` component where possible
- If the draft has no generated variants yet, show a simpler textarea + "Generate Post" CTA that uses accumulated clips as context

**Tabs Q and R:**
- **[Q] Cross-domain:** "A study/article outside your usual field that applies here" — serendipity fetch
- **[R] Opinion leaders:** LinkedIn posts + news from recognized voices on the draft's topic

---

## 6. Data Model Additions

**New in D1/KV:**
- `interest_groups` table: `{id, userId, name, topics[], domains[], color, createdAt}`
- `clips` table: `{id, userId, type, articleTitle, articleUrl, source, publishedAt, thumbnailUrl, passageText, clippedAt, assignedPostIds[], versions[]}`

**No changes to Google Sheets** — clips and interest groups live in D1, not the sheet.

**Worker endpoints to add:**
- `GET /api/interest-groups` — list user's groups
- `POST /api/interest-groups` — create
- `PUT /api/interest-groups/:id` — update
- `DELETE /api/interest-groups/:id` — delete
- `GET /api/clips` — list all clips for user
- `POST /api/clips` — create clip
- `PUT /api/clips/:id` — update (edit/assign to post)
- `DELETE /api/clips/:id` — delete
- `POST /api/clips/:id/assign` — assign clip to a draft (adds postId to assignedPostIds)
- `POST /api/clips/:id/unassign` — remove from draft (back to dock)

---

## 7. Implementation Strategy

1. **Copy** `TrendingDashboard.tsx` → `FeedPage.tsx`, add route `/feed` in the router
2. **Interest groups UI** in Settings/Profile — CRUD form, stored via new worker endpoints
3. **Feed switcher** — pill tabs at top of FeedPage, wired to interest group list
4. **Left panel** — replace current trending card display with infinite-scroll article cards; reuse `NewsPanel` as base
5. **Right panel tabs** — restructure existing platform panels as tabs; add `Top 10` and `Evergreen` tabs using news research API with AI ranking
6. **Clips Dock** — new component, fixed position, CSS dock magnification, persisted via `/api/clips`
7. **Article Detail** — new panel mode within FeedPage; AI questions via streaming generation endpoint
8. **Draft Context Mode** — new layout mode; reuse `EditorScreen` on left; new context panel on right
9. **Remove `/trending`** from nav, add redirect — after Feed is stable

---

## 8. Verification

- Navigate to `/feed` — page loads with split layout
- Create an interest group in settings — feed reloads with group-specific articles
- Switch between interest groups — left feed and right curated panel update
- Hover article card — scissor icon appears; click → thumbnail animates into dock
- Hover dock thumbnail — magnification effect works
- Expand dock → drafts appear → click draft → Draft Context Mode loads
- Drag clip to draft → appears as context block in editor
- Remove clip from editor → returns to context panel
- Reload page → clips still present in dock (persisted)
- Navigate to `/trending` → redirects to `/feed`
