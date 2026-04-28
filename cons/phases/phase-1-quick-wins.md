# Phase 1 — Quick Wins

## Goal

Make the app feel intuitive on first contact, without changing information architecture. Low risk, high visible impact in 1–2 days.

## Stages

### Stage 1.1 — Always-visible row CTAs in the topics queue
- **Files:** [`frontend/src/components/dashboard/tabs/DashboardQueue.tsx`](../../frontend/src/components/dashboard/tabs/DashboardQueue.tsx)
- **Change:** Show one primary CTA per row (Draft / AI-Draft / Edit / Publish / Republish based on status) at full opacity. Move secondary actions into a 3-dot overflow menu. Remove `opacity-0 group-hover:opacity-100` patterns on the row action cell.
- **Done when:** Every queue row visibly shows a primary CTA without hover, on both list and calendar event tooltip.
- **Risk:** low

### Stage 1.2 — Channel pill column (read-only)
- **Files:** [`frontend/src/components/dashboard/tabs/DashboardQueue.tsx`](../../frontend/src/components/dashboard/tabs/DashboardQueue.tsx)
- **Change:** Add a column between status and date that renders a small pill ("LinkedIn", "Newsletter", "Telegram", …) with the channel's brand color. Source the value from the topic record. Read-only in this stage; clickable in Stage 3.4.
- **Done when:** Every row shows the destination channel without opening any drawer.
- **Risk:** low

### Stage 1.3 — Feed card summary + always-visible toolbar
- **Files:** [`frontend/src/features/feed/components/FeedArticleCard.tsx`](../../frontend/src/features/feed/components/FeedArticleCard.tsx)
- **Change:** Show the article description as a 2-line clamp on every card (not 1-line, not hover-gated). Add an always-visible footer toolbar with Clip / 👍 / 👎 icons (remove `opacity-0 group-hover:opacity-100`). Keep keyboard activation working.
- **Done when:** Cards show summary by default; clip/vote work on touch without hover.
- **Risk:** low

### Stage 1.4 — Status pill ramp
- **Files:** [`frontend/src/components/dashboard/tabs/DashboardQueue.tsx`](../../frontend/src/components/dashboard/tabs/DashboardQueue.tsx), [`frontend/src/components/dashboard/components/TopicDetailPanel.tsx`](../../frontend/src/components/dashboard/components/TopicDetailPanel.tsx), any other component rendering topic status
- **Change:** Adopt a single colored ramp + icon: Pending (gray) → Drafted (blue) → Approved (purple) → Scheduled (amber) → Published (green). Extract `<StatusPill status={…} />` and reuse.
- **Done when:** A single component renders status everywhere; visual diff between Drafted and Approved is obvious.
- **Risk:** low

### Stage 1.5 — Empty-state cleanup pass
- **Files:** Topics empty state in [`DashboardQueue.tsx`](../../frontend/src/components/dashboard/tabs/DashboardQueue.tsx), Feed empty in [`FeedPage.tsx`](../../frontend/src/features/feed/FeedPage.tsx), Clips empty in [`ClipsDock.tsx`](../../frontend/src/features/feed/components/ClipsDock.tsx), Newsletter empty in [`NewsletterTab.tsx`](../../frontend/src/features/campaign/components/newsletter/NewsletterTab.tsx)
- **Change:** Single tone (concise + 1 primary CTA + 1 helper line). No paragraphs.
- **Done when:** All four empty states fit in one screen, look consistent, and have one CTA.
- **Risk:** low

### Stage 1.6 — Setup wizard progress indicator + Back button
- **Files:** [`frontend/src/features/setup-wizard/SetupWizard.tsx`](../../frontend/src/features/setup-wizard/SetupWizard.tsx)
- **Change:** Add a sticky top progress bar showing "Step N of 11" + step list with current highlighted. Add a Back button to every step except the first (preserve in-step state).
- **Done when:** User can tell where they are in the wizard at all times and can go back without losing inputs.
- **Risk:** low
