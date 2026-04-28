# Feed Page Exploration Report

## Summary
Thorough exploration of the React/TypeScript feed feature in LinkedInPost frontend. The Feed page implements a multi-column layout with interest group management, article discovery across platforms (YouTube, Instagram, LinkedIn, News), clips management, and draft context viewing.

---

## 1. Main FeedPage Component

**File Path:** `/Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend/src/features/feed/FeedPage.tsx`

**Line Count:** 639 lines

**Component Signature:**
```typescript
export function FeedPage({
  idToken: string;
  api: BackendApi;
  newsProviderKeys?: NewsProviderKeys;
  capabilities: TrendingCapabilities;
  rows?: SheetRow[];
})
```

**Key State Management:**
- `topic` (string) — current search topic
- `searchTopic` (string) — triggers trending search
- `region`, `genre`, `windowDays` (strings) — filter defaults
- `interestGroups` (InterestGroup[]) — list of user-created topic groups
- `activeGroupId` (string | null) — currently selected interest group
- `clips` (Clip[]) — all clipped articles
- `openArticle` (NewsArticle | null) — currently viewing article detail
- `openDraft` (SheetRow | null) — currently viewing draft context
- `debateMode` (boolean) — toggle debate view vs article detail
- Group creation form state: `newGroupName`, `newGroupTopics`, `newGroupDomains`, `newGroupColor`, `showCreateGroup`, `savingGroup`

**Key Functions:**
- `handleClip()` — create clip from article via API
- `handleDeleteClip()` — delete clip from dock
- `handleAssignClipToPost()` / `handleUnassignClip()` — drag-drop clip assignment
- `handleSelectGroup()` — switch active interest group
- `handleSaveGroup()` — create new interest group
- `handleNodeClick()` — click on trending graph nodes
- `handleOpenDraft()` — open draft context view
- `handleSearch()` — trigger trending search

**Effects:**
- Load interest groups on mount
- Load clips on mount
- Fetch trending data when searchTopic changes

---

## 2. Layout Structure

### Overall Container
- **Root:** `<div className="h-full overflow-auto">` — full height with scrolling
- **Fixed Header:** Sticky header at top with z-10, containing interest group pills and search bar
- **Main Content:** Flex layout with variable columns depending on active mode

### Layout Modes (4 mutually exclusive states)

#### Mode 1: Reading Feed (Default)
**When:** `!openArticle && !openDraft`
- **Classes:** `flex gap-6 p-6 items-start`
- **Structure:**
  ```
  ├─ Left Column (flex-1)
  │  ├─ Empty state / Loading skeleton / Error
  │  └─ Platform panels (YouTube, Instagram, LinkedIn, News)
  └─ Right Column (sticky top-20 hidden lg:block)
     └─ FeedCuratedPanel (sidebar with tabs and trending)
  ```
- **Responsive:** Right sidebar hidden on screens < lg breakpoint

#### Mode 2: Article Detail View
**When:** `openArticle && !debateMode`
- **Classes:** `flex gap-6 p-6` (full width)
- **Structure:**
  ```
  ├─ Left: ArticleDetailView
  │  ├─ Article content (flex-1, overflow-y-auto)
  │  └─ Hero image, title, meta, actions
  └─ Right: AI Insight Panel (w-80 xl:w-96)
     ├─ Article Intelligence (details with collapsible sections)
     ├─ Opposing View
     ├─ 3 Post Angles (numbered list with copy buttons)
     └─ Tabs (Opinion / Perspectives / Connection)
  ```
- **Article Panel:** `rounded-2xl border border-border/50 bg-white/70 backdrop-blur-sm p-6`
- **Right Panel:** `w-80 xl:w-96 shrink-0 overflow-y-auto flex flex-col gap-4`

#### Mode 3: Debate Mode
**When:** `openArticle && debateMode`
- **Classes:** `flex gap-6 p-6` (full width)
- **Structure:**
  ```
  ├─ Left: Original article (flex-1, blue theme)
  ├─ Divider: Scale icon with vertical lines (amber/yellow)
  └─ Right: Opposing article (flex-1, amber theme)
  ```
- **Left/Right Panels:** `rounded-2xl border bg-*/30 backdrop-blur-sm p-5 flex flex-col gap-3`
- **Border Colors:** Blue-200/60 for original, Amber-200/60 for opposing

#### Mode 4: Draft Context View
**When:** `openDraft`
- **Explicit height:** `height: 'calc(100vh - 120px)'`
- **Structure:**
  ```
  ├─ Left: Draft Editor (flex-1, border-r)
  │  ├─ Sticky header with back button
  │  ├─ Textarea (flex-1, min-h-[320px])
  │  ├─ Word/char count
  │  ├─ Context clips display
  │  └─ "Generate Post in Editor" button
  └─ Right: Context Panel (w-96, bg-white/50)
     ├─ Header with Re-cluster button
     ├─ AI-clustered themes (when >= 2 clips)
     ├─ Support/Challenge split
     └─ Tabs: Cross-domain Insights / Opinion Leaders
  ```

### Sticky Positioning
- **Header:** `sticky top-0 z-10` (always visible)
- **Right sidebar in feed mode:** `sticky top-20` (sticks below header)
- **Article detail right panel:** Not sticky (scrolls with left content)

---

## 3. Child Components

### FeedArticleCard
**File:** `/Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend/src/features/feed/components/FeedArticleCard.tsx`
**Lines:** 104

**Props:**
```typescript
article: NewsArticle
onClip: (article: NewsArticle) => void
onOpen: (article: NewsArticle) => void
isClipped?: boolean
```

**Renders:**
- Thumbnail (w-14 h-14) with source color fallback
- Title (line-clamp-2)
- Description (line-clamp-1)
- Source + relative time
- Scissor clip button (hidden until hover, shows green when clipped)

**Classes:** `rounded-xl border border-white/40 bg-white/30 p-3 backdrop-blur-sm`

---

### FeedLeftPanel
**File:** `/Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend/src/features/feed/components/FeedLeftPanel.tsx`
**Lines:** 107

**Props:**
```typescript
articles: NewsArticle[]
loading: boolean
onClip: (article: NewsArticle) => void
onOpen: (article: NewsArticle) => void
clippedUrls: Set<string>
```

**Features:**
- Infinite scroll with IntersectionObserver (BATCH_SIZE = 10)
- Renders 10 articles, shows skeleton for next batch on intersection
- Uses motion animations (containerVariants, cardItemVariants)

**Renders:** FeedArticleCard components in motion.div

---

### ArticleDetailView
**File:** `/Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend/src/features/feed/components/ArticleDetailView.tsx`
**Lines:** 506

**Props:**
```typescript
article: NewsArticle
idToken: string
api: BackendApi
onBack: () => void
onClip: (article: NewsArticle) => void
isClipped: boolean
rows?: SheetRow[]
onOpenDraft?: (row: SheetRow) => void
onDebate?: () => void
```

**State:**
- `analysis` (ArticleAnalysis | null) — AI analysis with summary, angles, perspectives
- `analysisLoading`, `analysisError`
- `activeTab` ('opinion' | 'perspectives' | 'connection') — tab selection
- `opinionResponse` (string) — user opinion textarea
- `connections` (DraftConnection[]) — related drafts
- `connectionsLoading`, `connectionsError`

**Left Panel:**
- Back button
- Hero image (max-h-48)
- Title (text-2xl font-bold)
- Source badge + date
- Description
- Actions: "Read Full Article", "Clip", "Debate"
- Note about preview

**Right Panel (w-80 xl:w-96):**
1. **Article Intelligence** — collapsible details:
   - What is this about?
   - Why does it matter?
   - What angle can you take?

2. **Opposing View** — single paragraph

3. **Post Angles** — numbered list with copy buttons

4. **Tabs (J/K/L):**
   - **Opinion (J):** Prompt + textarea + "Clip this response"
   - **Perspectives (K):** Founder / Expert / Beginner viewpoints
   - **Connection (L):** Related draft topics with "Open Draft →" button

5. **Related Reading** — info note

**API Calls:**
- `analyzeFeedArticle()` on article change
- `findDraftConnections()` when connection tab active

---

### ClipsDock
**File:** `/Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend/src/features/feed/components/ClipsDock.tsx`
**Lines:** 315

**Props:**
```typescript
clips: Clip[]
rows: SheetRow[]
idToken: string
api: BackendApi
onDeleteClip: (clipId: string) => void
onOpenArticle: (clip: Clip) => void
onOpenDraft: (row: SheetRow) => void
onAssignClip: (clipId: string, postId: string) => void
```

**State:**
- `expanded` (boolean) — dock panel open/closed
- `hoveredIndex` (number | null) — thumbnail hover effect
- `confirmDeleteId` (string | null) — delete confirmation
- `dragClipId` (string | null) — dragging state
- `dragOverPostId` (string | null) — drop target highlight

**Structure (Fixed position right-0 top-1/2):**

1. **Collapsed Strip** (always visible)
   - `fixed right-0 top-1/2 -translate-y-1/2 z-40`
   - Expand toggle button
   - Clip thumbnails (MAX_VISIBLE = 8)
   - Hover scaling: center 1.6x, adjacent 1.25x, +2 distance 1.1x
   - Right-click to delete with confirmation
   - +N badge for overflow
   - Scissors icon with clip count badge

2. **Expanded Panel** (AnimatePresence)
   - `fixed right-0 top-0 h-full w-80 z-50`
   - Header: "Clips (N)" with close button
   - Grid grid-cols-3 of all clips
   - Delete button on hover
   - Divider "Drafts (N)"
   - Draft list (filtered to draft status only)
   - Drag clips onto drafts to assign
   - Drop target highlights with "Drop to assign" text

**Animations:**
- Spring: stiffness 300, damping 30
- Backdrop: `bg-black/10 backdrop-blur-[1px]`

**Styling:**
- Strip: `bg-white/70 backdrop-blur-md border-white/50 rounded-l-2xl`
- Panel: `bg-white/90 backdrop-blur-xl border-l border-white/50`

---

### DraftContextView
**File:** `/Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend/src/features/feed/components/DraftContextView.tsx`
**Lines:** 532

**Props:**
```typescript
row: SheetRow
clips: Clip[]
idToken: string
api: BackendApi
onBack: () => void
onUnassignClip: (clipId: string, postId: string) => void
```

**State:**
- `draftText` (string) — textarea content
- `addedClipIds` (string[]) — clips added to editor context
- `activeContextTab` ('q' | 'r') — Cross-domain or Opinion Leaders
- `clustering` (ClipClusterResult | null) — AI theme clustering
- `clusterLoading`, `clusterTrigger` — re-cluster button
- `crossDomain` (CrossDomainInsight[]) — cross-domain insights
- `crossDomainLoading`, `crossDomainError`, `crossDomainTrigger`
- `opinionLeaders` (OpinionLeaderInsight[]) — opinion leader insights
- `opinionLeadersLoading`, `opinionLeadersError`, `opinionLeadersTrigger`

**Left Panel (flex-1, border-r):**
- Sticky header: back button + topic title
- Textarea (flex-1, min-h-[320px], resize-none)
- Word/char count (alerts at 3000 chars)
- Context clips section: clips added to post
- "Generate Post in Editor" button

**Right Panel (w-96, bg-white/50):**
- Header: "Context Panel" + "Re-cluster" button
- When clustering available (>= 2 clips):
  - AI-clustered themes with indices
  - Support / Challenge split (green/amber pills)
- When no clustering:
  - Flat "Assigned Clips" list
- Empty state: "No clips assigned"
- Tabs (bottom, mt-auto):
  - **Cross-domain (Q):** Domain insights with connections
  - **Opinion Leaders (R):** Expert perspectives by role

**API Calls:**
- `clusterDraftClips()` — auto-cluster when >= 2 clips assigned
- `crossDomainInsight()` — lazy-load when tab Q active
- `opinionLeaderInsights()` — lazy-load when tab R active

---

### FeedCuratedPanel
**File:** `/Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend/src/features/feed/components/FeedCuratedPanel.tsx`
**Lines:** 296

**Props:**
```typescript
idToken: string
api: BackendApi
searchTopic: string
newsProviderKeys?: NewsProviderKeys
capabilities: TrendingCapabilities
trendingData: {
  youtube: YouTubeVideo[]
  instagram: InstagramPost[]
  linkedin: LinkedInPost[]
  news: NewsArticle[]
}
trendingWords?: TrendingWord[]
recommendedTopics?: string[]
loading: boolean
onClip: (article: NewsArticle) => void
clippedUrls: Set<string>
onOpenArticle: (article: NewsArticle) => void
onSelectWord?: (word: string) => void
onSelectTopic?: (topic: string) => void
```

**State:**
- `activeTab` ('top10' | 'evergreen' | 'youtube' | 'instagram' | 'linkedin')

**Tabs:**
1. **Top 10** — first 10 articles sorted by recency
2. **Evergreen** — articles sorted by description length (proxy for depth)
3. **YouTube** — YouTubePanel component
4. **Instagram** — InstagramPanel component
5. **LinkedIn** — LinkedInPanel component

**Article Card (CompactArticleCard):**
- 40x40 thumbnail
- Title (line-clamp-1)
- Source + relative time
- Scissor button on hover

**Layout:**
- `w-72 xl:w-80 shrink-0` — responsive width
- Tab panel: `glass-panel rounded-2xl overflow-hidden`
- Tab pills: horizontal scroll, primary active
- Content: `max-h-[480px] overflow-y-auto`
- Optional widgets below:
  - TrendingWordsWidget (if trendingWords.length > 0)
  - RecommendationsPanel (if recommendedTopics.length > 0)

**Styling:** `glass-panel` with motion animations

---

### DebateModeView
**File:** `/Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend/src/features/feed/components/DebateModeView.tsx`
**Lines:** 222

**Props:**
```typescript
article: NewsArticle
idToken: string
api: BackendApi
onBack: () => void
onClip: (article: NewsArticle) => void
isClipped: boolean
```

**State:**
- `debate` (DebateArticle | null)
- `loading`, `error`

**Structure:**
- Header with back button + "Debate Mode" label
- Split panels (flex gap-4):

  **Left Panel (Blue, flex-1):**
  - Badge: "Original" (blue-100)
  - Hero image (max-h-36)
  - Title
  - Description
  - Actions: "Read Full", "Clip"

  **Divider (Amber):**
  - Vertical line with Scale icon in circle

  **Right Panel (Amber, flex-1):**
  - Badge: "Opposing View" (amber-100)
  - Regenerate button
  - Loading skeleton or error
  - Title
  - Core argument box (amber-50/60)
  - Summary paragraph
  - Key arguments (numbered)
  - Disclaimer: "AI-generated opposing perspective..."

**API Call:**
- `findDebateArticle()` — fetches opposing perspective
- Regenerate button re-triggers fetch

**Styling:**
- Borders: `border-blue-200/60` / `border-amber-200/60`
- Backgrounds: `bg-blue-50/30` / `bg-amber-50/30`
- Both with `backdrop-blur-sm p-5 flex flex-col gap-3`

---

## 4. Types Definition

**File:** `/Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend/src/features/feed/types.ts`
**Lines:** 120

**Key Types:**
- `ArticleAnalysis` — summary, whyItMatters, postAngles[], opposingView, opinionPrompt, perspectiveFlip{founder, expert, beginner}
- `InterestGroup` — id, name, topics[], domains[], color, timestamps
- `CreateInterestGroupPayload` — name, topics[], domains[], color
- `Clip` — id, type, articleTitle, articleUrl, source, publishedAt, thumbnailUrl, passageText, clippedAt, versions[], assignedPostIds[]
- `ClipClusterResult` — themes{name, indices[]}, support[], challenge[]
- `DraftConnection` — topicId, topic, reason
- `DebateArticle` — title, summary, source, opposingAngle, keyArguments[]
- `CrossDomainInsight` — domain, connection, postAngle
- `OpinionLeaderInsight` — name, role, perspective, postAngle

---

## 5. Tailwind & CSS Patterns

### Glass Morphism
- **Header:** `glass-header border-b border-border/50 px-6 py-3`
- **Panels:** `glass-panel rounded-2xl overflow-hidden`
- **Base:** `bg-white/[0.3-0.9] backdrop-blur-sm border border-white/[0.3-0.6]`

### Color Scheme
- **Primary:** violet/purple (#6366f1 in presets)
- **Accent colors:** blue (articles), amber (debate/challenge), green (support)
- **Text:** `text-ink` (dark), `text-muted` (light), `text-primary-fg` (on primary)

### Layout Classes
- **Containers:** `flex gap-6 p-6`, `flex-1 min-w-0`, `shrink-0`
- **Spacing:** `space-y-4`, `gap-3`, `px-6 py-3`
- **Rounding:** `rounded-2xl`, `rounded-xl`, `rounded-lg`
- **Borders:** `border border-border/40` (alpha 40%), `border-white/40` (white with alpha)

### Responsive
- Hidden on mobile: `hidden lg:block`
- Sidebar widths: `w-72 xl:w-80` (adjust at xl breakpoint)
- Header responsive: `flex-wrap` with `min-w-0` on flex items

### Animation/Motion
- **Spring:** `spring.smooth` via motion.config (stiffness/damping presets)
- **Variants:** `containerVariants`, `cardItemVariants`, `fadeUpVariants`, `skeletonPulseVariants`
- **AnimatePresence:** Used for clips dock panel, create group form

### Z-index Stack
- `z-50` — expanded dock panel
- `z-40` — collapsed dock strip, dock backdrop
- `z-10` — sticky header, panels in detail view

---

## 6. State Management & Mode Switching

### Mode State Machine
```
Reading Feed
├─ When: !openArticle && !openDraft
├─ Right sidebar: visible (lg:)
├─ View: 2-column or 1-column (responsive)
└─ Key state: activeGroupId, clips, trending data

Article Detail
├─ When: openArticle && !debateMode
├─ Sidebar: hidden
├─ View: split (article | insights + tabs)
└─ Tabs: Opinion, Perspectives, Connection

Debate Mode
├─ When: openArticle && debateMode
├─ Sidebar: hidden
├─ View: side-by-side (original vs opposing)
└─ Key action: Regenerate debate

Draft Context
├─ When: openDraft
├─ Full-screen: yes (calc(100vh - 120px))
├─ View: split (editor | context panel)
└─ Tabs: Cross-domain, Opinion Leaders
```

### Transitions Between Modes
- FeedPage.openArticle controls Article Detail & Debate toggles
- FeedPage.debateMode controls Article Detail vs Debate view
- FeedPage.openDraft overlays entire feed, hiding all columns
- ClipsDock overlays all modes as fixed position strip + expandable panel
- Interest group selection filters all data via searchTopic

---

## 7. Data Flow

### Clip Management
1. User clicks clip button on FeedArticleCard or ArticleDetailView
2. `handleClip()` calls `api.createClip()`
3. Clip added to state via `setClips(prev => [clip, ...prev])`
4. ClipsDock displays clip thumbnail
5. User can drag clip to draft in ClipsDock
6. `onAssignClip()` calls `api.assignClipToPost()`
7. DraftContextView filters `assignedClips` by `row.topicId`
8. User right-clicks clip in dock for delete confirmation

### Article Analysis Flow
1. ArticleDetailView mounted or article changes
2. `fetchAnalysis()` calls `api.analyzeFeedArticle()`
3. Analysis sets: summary, angles, perspectives, opposingView
4. Tabs fill with content from analysis object
5. Connection tab lazy-loads `findDraftConnections()` only when active

### Draft Context Flow
1. User clicks "Open Draft" from ArticleDetailView or ClipsDock
2. DraftContextView mounts with row data
3. Filters clips by `row.topicId` to get assignedClips
4. Auto-triggers clustering if >= 2 clips
5. Tabs Cross-domain/Opinion lazy-load on activation
6. User adds clips to editor via `handleAddClipToEditor()`
7. "Generate Post in Editor" navigates to topic editor

---

## 8. Key Features Summary

| Feature | Location | Component | Mechanism |
|---------|----------|-----------|-----------|
| **Interest Groups** | Header | FeedPage | Pills with colors, create form, selection |
| **Search & Filter** | Header | TrendingSearchBar, TrendingFilters | Debounced search, region/genre/window |
| **Article Cards** | Feed | FeedArticleCard | Thumbnail, title, clip button, hover effects |
| **Infinite Scroll** | Left column | FeedLeftPanel | IntersectionObserver, BATCH_SIZE=10 |
| **Article Detail** | Modal-like | ArticleDetailView | Full article, AI analysis, 3 action tabs |
| **Debate Mode** | Modal-like | DebateModeView | Split view, regenerate opposing view |
| **Clips Management** | Fixed dock | ClipsDock | Thumbnails, hover scale, drag-drop, delete |
| **Draft Context** | Full-screen | DraftContextView | Editor + clustering + cross-domain/leaders |
| **Curated Sidebar** | Right column | FeedCuratedPanel | 5 tabs, trending words, recommendations |
| **Platform Panels** | Feed | YouTubePanel, InstagramPanel, etc. | Grid layouts for each platform |

---

## 9. Responsive Behavior

- **Mobile:** Single column (feed only), sidebar hidden
- **Tablet (lg:):** Two columns (feed + curated sidebar visible)
- **Desktop (xl:):** Curated sidebar width increases from w-72 to w-80
- **Article Detail:** Full width split, right panel w-80 xl:w-96
- **ClipsDock:** Fixed position, width-independent

---

## 10. Performance Patterns

- **Lazy Loading:** FeedLeftPanel uses IntersectionObserver (10 items per batch)
- **Lazy Fetching:** DraftContextView tabs only fetch when active
- **Memoization:** `useMemo` for visiblePanels, recommendedTopics, trendingWords
- **Motion Config:** Shared spring config via MotionConfig wrapper
- **Virtualization:** Not currently used; batch loading instead

---

## File Structure Summary

```
frontend/src/features/feed/
├── FeedPage.tsx (639 lines) — Main orchestrator
├── types.ts (120 lines) — TypeScript interfaces
└── components/
    ├── FeedArticleCard.tsx (104 lines) — Card component
    ├── FeedLeftPanel.tsx (107 lines) — Article list with infinite scroll
    ├── ArticleDetailView.tsx (506 lines) — Article detail + AI analysis
    ├── ClipsDock.tsx (315 lines) — Fixed dock for clip management
    ├── DraftContextView.tsx (532 lines) — Draft editor with context panel
    ├── FeedCuratedPanel.tsx (296 lines) — Right sidebar with tabs
    └── DebateModeView.tsx (222 lines) — Side-by-side debate view
```

**Total: 2,841 lines of code**

---

## Next Steps for Implementation

If you need to modify or extend the Feed page:

1. **Add a new mode:** Create mode state, add conditional render branch in FeedPage
2. **Add sidebar widget:** Insert into FeedCuratedPanel below Recommendations
3. **Modify layout widths:** Adjust `w-72 xl:w-80`, `w-80 xl:w-96` classes
4. **Change animation timing:** Edit motion variants or spring config
5. **Add new tabs in ArticleDetailView or DraftContextView:** Follow existing pattern (state + useEffect + render)
6. **Enhance ClipsDock drag-drop:** Currently assigned post IDs; could expand to multiple posts
