# 04. Topics List & AddTopicPage

> **Stakeholders:** every user. The first surface a returning user sees.
> **Source files:** [`features/add-topic/AddTopicPage.tsx`](../frontend/src/features/add-topic/AddTopicPage.tsx), [`features/add-topic/TopicRightPanel.tsx`](../frontend/src/features/add-topic/TopicRightPanel.tsx), [`features/add-topic/MicButton.tsx`](../frontend/src/features/add-topic/MicButton.tsx), [`features/topic-navigation/screens/TopicEditorPage.tsx`](../frontend/src/features/topic-navigation/screens/TopicEditorPage.tsx), [`features/topic-navigation/screens/TopicVariantsPage.tsx`](../frontend/src/features/topic-navigation/screens/TopicVariantsPage.tsx), [`components/dashboard/tabs/DashboardQueue.tsx`](../frontend/src/components/dashboard/tabs/DashboardQueue.tsx), [`components/dashboard/components/TopicDetailPanel.tsx`](../frontend/src/components/dashboard/components/TopicDetailPanel.tsx), [`components/dashboard/hooks/useDashboardQueue.ts`](../frontend/src/components/dashboard/hooks/useDashboardQueue.ts).
> **Pairs with:** [`audits/01-topics-and-publishing.md`](audits/01-topics-and-publishing.md) and [`phases/phase-1-quick-wins.md`](phases/phase-1-quick-wins.md), [`phase-3-publish-clarity.md`](phases/phase-3-publish-clarity.md).

## What this surface is

The CRUD surface for "topics" (the unit of post creation). [`DashboardQueue.tsx`](../frontend/src/components/dashboard/tabs/DashboardQueue.tsx) is the queue list + calendar with hover-only row CTAs and a right detail drawer ([`TopicDetailPanel.tsx`](../frontend/src/components/dashboard/components/TopicDetailPanel.tsx)). [`AddTopicPage.tsx`](../frontend/src/features/add-topic/AddTopicPage.tsx) is a long form (title, about, meaning, style, persona, pros/cons, research notes) with a tabbed right rail ([`TopicRightPanel.tsx`](../frontend/src/features/add-topic/TopicRightPanel.tsx)) supporting drag-drop into sections.

## Cons — 4 perspectives

### 👤 User
- I land on `/topics` and don't know which row I should act on next — no priority sort or "needs your attention" filter.
- After hitting Save Draft I don't know if it worked — no toast.
- "Generate with AI" spins for ~10s with no progress, no explanation.
- Persona delete X only appears on hover — on touch device I can't delete a custom persona.
- Drag-drop a clip into a paragraph requires precise mouse aim; works once in three tries.
- Trending and Research tabs feel identical; I don't know which to use.
- No "duplicate this topic" → I retype everything for similar content.
- The form is a tall scroll; nothing tells me which fields are required.
- Empty state has no path forward. No starter templates, no tour.

### 🎨 UX
- `[HIGH]` Row actions (Draft / AI-Draft / Edit / Publish) are hover-only in [`DashboardQueue.tsx`](../frontend/src/components/dashboard/tabs/DashboardQueue.tsx) — show one primary CTA per row always; secondary in overflow.
- `[HIGH]` Status pills don't differentiate Pending / Drafted / Approved / Scheduled / Published — adopt a consistent colored ramp + icon set.
- `[HIGH]` AI-Draft modal is nested inside the right drawer (modal-on-modal) — promote to a route or full-screen sheet.
- `[MED]` The drop menu (Attach clip → Paste text / link) appears at cursor position absolutely — keyboard users can't reach it.
- `[MED]` Mic button has no visible state distinction between idle / recording / processing.
- `[MED]` No required-field markers; submission errors only on attempt.
- `[MED]` Right-rail tabs use 12px text and lose clarity at smaller widths.
- `[MED]` Module-level draft state means opening two tabs corrupts each other.

### 📦 Product Owner
- `[HIGH]` Empty state ("No topics yet") has no path forward — no starter templates + no 30-second tour trigger.
- `[HIGH]` "Drafting…" spinner gives no explanation — show 1-line description ("Generating with Claude…", "Pushing to GitHub Action…").
- `[MED]` Topics are independent — no series / campaigns linkage.
- `[MED]` No bulk operations on the list (delete N, reschedule N, change channel for N) beyond what's already there.
- `[MED]` No filtering by channel / status / next-send-date.
- `[MED]` Personas are global; no per-persona analytics ("posts in voice X had Y engagement").
- `[MED]` Right-rail tabs duplicating content is wasted real-estate.

### 💼 Stakeholder
- `[HIGH]` Topics list is the daily-driver page; weak prioritisation kills habit-forming usage.
- `[HIGH]` "Confused users abandon save" → low completion of the topic → no posts → churn.
- `[MED]` Demoing a "create → publish" jump moves between three places — bad demo flow.

## Fixes

### Phase 1 — Quick wins (≤2 wk)
- [ ] **[HIGH]** [`DashboardQueue.tsx`](../frontend/src/components/dashboard/tabs/DashboardQueue.tsx) — promote one primary CTA per row to always-visible (Edit or Publish based on status); rest in overflow menu.
- [ ] **[HIGH]** [`DashboardQueue.tsx`](../frontend/src/components/dashboard/tabs/DashboardQueue.tsx) — add per-row channel pill (LinkedIn / Newsletter / Telegram / …) so users see destination at a glance. Reused by [`07-publish.md`](07-publish.md).
- [ ] **[HIGH]** Status pill component — unify Pending / Drafted / Approved / Scheduled / Published with distinct hue + icon. Use everywhere a topic renders.
- [ ] **[HIGH]** Empty-state on [`DashboardQueue.tsx`](../frontend/src/components/dashboard/tabs/DashboardQueue.tsx) — add 2-3 starter templates ("Hot-take", "How-to", "Roundup") + a 30-second tour trigger.
- [ ] **[HIGH]** [`AddTopicPage.tsx`](../frontend/src/features/add-topic/AddTopicPage.tsx) — fire `useToast({title: 'Draft saved'})` on save success; show inline `"Saved 5s ago"` near save button.
- [ ] **[MED]** [`AddTopicPage.tsx`](../frontend/src/features/add-topic/AddTopicPage.tsx) — add red asterisk to required fields (title at minimum) and an inline error summary at top on submit failure.
- [ ] **[MED]** [`AddTopicPage.tsx`](../frontend/src/features/add-topic/AddTopicPage.tsx) — replace persona delete `X` with always-visible inline icon and confirm modal.
- [ ] **[MED]** [`AddTopicPage.tsx`](../frontend/src/features/add-topic/AddTopicPage.tsx) — generate-with-AI button shows determinate progress bar driven by enrichment SSE events (reuse [`features/generation/nodeProgressLabels.ts`](../frontend/src/features/generation/nodeProgressLabels.ts)).
- [ ] **[MED]** [`AddTopicPage.tsx`](../frontend/src/features/add-topic/AddTopicPage.tsx) — add a "Duplicate" action to the editRow header that prefills a new topic.
- [ ] **[MED]** [`TopicRightPanel.tsx`](../frontend/src/features/add-topic/TopicRightPanel.tsx) — collapse Trending + Research into a single "Research" tab; rename "Analysis" to "Pros & Cons".
- [ ] **[LOW]** [`MicButton.tsx`](../frontend/src/features/add-topic/MicButton.tsx) — three explicit visual states (idle / recording with pulsing red dot / processing with spinner).

### Phase 2 — Structural (3-6 wk)
- [ ] **[HIGH]** Promote AI-Draft modal out of [`TopicDetailPanel.tsx`](../frontend/src/components/dashboard/components/TopicDetailPanel.tsx) into a full-screen sheet (or route).
- [ ] **[HIGH]** Move drop menu in [`AddTopicPage.tsx`](../frontend/src/features/add-topic/AddTopicPage.tsx) from absolute-cursor positioning to a deterministic toolbar above the section (still draggable, but discoverable).
- [ ] **[MED]** Replace module-level draft state with `useTopicDraft(topicId)` hook backed by `localStorage` keyed by topic id, so multiple tabs don't collide.
- [ ] **[MED]** Topics list (consumer of [`useDashboardQueue.ts`](../frontend/src/components/dashboard/hooks/useDashboardQueue.ts)) — add status filter pills, channel filter, "Needs my action" smart-filter, sort-by next-send.
- [ ] **[MED]** Topics list — bulk-select + bulk reschedule / delete / change-channel.

### Phase 3 — Strategic (6-12 wk)
- [ ] **[MED]** Topic series / campaign linking (foreign key to a `campaign_id`); group display in list.
- [ ] **[MED]** Per-persona analytics (engagement per voice).
- [ ] **[LOW]** AI-suggested next topic based on trending + your past performance.

## Done when

- New user can save a first topic in <60s with explicit success feedback.
- Touch users can manage personas without hover.
- Topics list filters surface "needs action" rows immediately on landing.
- Every queue row shows channel + status without hover.
- No two-tab draft corruption.
