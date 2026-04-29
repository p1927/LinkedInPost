# 05. Schedule & Channel

> **Stakeholders:** every user who ships a post. Highest brand-risk surface.
> **Source files:** [`components/schedule/ScheduleEditor.tsx`](../frontend/src/components/schedule/ScheduleEditor.tsx), [`components/dashboard/components/TopicDetailPanel.tsx`](../frontend/src/components/dashboard/components/TopicDetailPanel.tsx), [`features/review-editor/screens/EditorScreen.tsx`](../frontend/src/features/review-editor/screens/EditorScreen.tsx) (lines ~200-400), [`features/content-schedule-calendar/ContentScheduleCalendar.tsx`](../frontend/src/features/content-schedule-calendar/ContentScheduleCalendar.tsx), [`features/content-schedule-calendar/EventDetailAndEdit.tsx`](../frontend/src/features/content-schedule-calendar/EventDetailAndEdit.tsx), [`integrations/channels.ts`](../frontend/src/integrations/channels.ts), [`features/topic-navigation/types.ts`](../frontend/src/features/topic-navigation/types.ts), [`features/scheduled-publish/ScheduledPublishBanner.tsx`](../frontend/src/features/scheduled-publish/ScheduledPublishBanner.tsx), [`features/scheduled-publish/usePendingScheduledPublish.ts`](../frontend/src/features/scheduled-publish/usePendingScheduledPublish.ts), [`components/dashboard/tabs/DashboardDelivery.tsx`](../frontend/src/components/dashboard/tabs/DashboardDelivery.tsx), [`components/dashboard/components/TopicsRightRail.tsx`](../frontend/src/components/dashboard/components/TopicsRightRail.tsx).
> **Pairs with:** [`audits/01-topics-and-publishing.md`](audits/01-topics-and-publishing.md) and [`phases/phase-3-publish-clarity.md`](phases/phase-3-publish-clarity.md).

## What this surface is

Two interacting concerns: **when** to send (schedule) and **where** (channel). Today schedule has two divergent UIs (drawer date+time inputs in `TopicDetailPanel.tsx` vs drag-on-calendar in `ContentScheduleCalendar.tsx` plus a third bare `<input type="datetime-local">` in the editor), and channel is selected from three different places ([`DashboardDelivery.tsx`](../frontend/src/components/dashboard/tabs/DashboardDelivery.tsx), [`TopicsRightRail.tsx`](../frontend/src/components/dashboard/components/TopicsRightRail.tsx), bulk modal) with no per-row indicator.

## Cons — 4 perspectives

### 👤 User
- The editor has a bare datetime input; the topic detail has a different schedule UI with validation. Which one actually saves?
- I want to schedule the same post to LinkedIn and Instagram — not possible. I have to clone the topic.
- I want to publish every Monday — no recurrence.
- After dragging a topic on the calendar I see a confirmation, but I'm not sure what other items moved.
- The schedule input on mobile pushes the publish button below the fold.
- I never know which channel a topic will publish to without opening the drawer.

### 🎨 UX
- `[HIGH]` Two divergent schedule editors — drawer date+time inputs in [`TopicDetailPanel.tsx`](../frontend/src/components/dashboard/components/TopicDetailPanel.tsx) vs drag-on-calendar in [`ContentScheduleCalendar.tsx`](../frontend/src/features/content-schedule-calendar/ContentScheduleCalendar.tsx). Plus a bare `<input type="datetime-local">` in [`EditorScreen.tsx`](../frontend/src/features/review-editor/screens/EditorScreen.tsx).
- `[HIGH]` Channel selection has 3 entry points ([`DashboardDelivery.tsx`](../frontend/src/components/dashboard/tabs/DashboardDelivery.tsx), [`TopicsRightRail.tsx`](../frontend/src/components/dashboard/components/TopicsRightRail.tsx), bulk modal) — collapse into one canonical `<ChannelPicker />`.
- `[HIGH]` No channel indicator at the row level in [`DashboardQueue.tsx`](../frontend/src/components/dashboard/tabs/DashboardQueue.tsx).
- `[MED]` Telegram / WhatsApp `requiresRecipient` flag exists in [`channels.ts`](../frontend/src/integrations/channels.ts) but never surfaces in UI.
- `[MED]` `datetime-local` styling varies by browser; no time-zone hint shown.
- `[MED]` Calendar past-dates greying is opt-in via prop; inconsistent.

### 📦 Product Owner
- `[HIGH]` Single-channel-per-topic is a strategic gap; cross-posting is a baseline feature in 2026.
- `[HIGH]` Recurrence is baseline for a "creator queue" product — not present.
- `[MED]` Bulk reschedule preview is missing — shadow scheduling risk.
- `[MED]` No timezone awareness for users with global audiences.
- `[MED]` No surfacing of `requiresRecipient` channel constraints.

### 💼 Stakeholder
- `[HIGH]` Multi-channel adoption directly drives ARPU on a SaaS plan.
- `[HIGH]` Scheduling bugs → lost posts → public failures → reputational risk.

## Fixes

### Phase 1 — Quick wins (≤2 wk)
- [ ] **[HIGH]** Delete the bare `<input type="datetime-local">` in [`EditorScreen.tsx`](../frontend/src/features/review-editor/screens/EditorScreen.tsx) (~lines 200-400) and replace with `<ScheduleEditor>` for a single source of truth.
- [ ] **[HIGH]** Replace drawer date+time inputs in [`TopicDetailPanel.tsx`](../frontend/src/components/dashboard/components/TopicDetailPanel.tsx) with `<ScheduleEditor>` so all scalar editors share validation rules.
- [ ] **[HIGH]** Add per-row channel pill to [`DashboardQueue.tsx`](../frontend/src/components/dashboard/tabs/DashboardQueue.tsx) — required by [`04-topics.md`](04-topics.md) and [`07-publish.md`](07-publish.md).
- [ ] **[MED]** [`ScheduleEditor.tsx`](../frontend/src/components/schedule/ScheduleEditor.tsx) — add a small grey "Your timezone: <IANA name>" caption under the time picker.
- [ ] **[MED]** [`EditorScreen.tsx`](../frontend/src/features/review-editor/screens/EditorScreen.tsx) — pull schedule + buttons into a sticky footer on mobile so they don't scroll off.
- [ ] **[MED]** [`EventDetailAndEdit.tsx`](../frontend/src/features/content-schedule-calendar/EventDetailAndEdit.tsx) — show a "These items will move with this drag" preview list in the confirm dialog.
- [ ] **[MED]** [`ScheduledPublishBanner.tsx`](../frontend/src/features/scheduled-publish/ScheduledPublishBanner.tsx) — show absolute time in user TZ + relative ("in 3h 12m"); make Cancel a destructive button with a clear icon.
- [ ] **[MED]** When a channel where `requiresRecipient` is true ([`channels.ts`](../frontend/src/integrations/channels.ts)), show inline warning in editor footer if recipient isn't set.

### Phase 2 — Structural (3-6 wk)
- [ ] **[HIGH]** Migrate `deliveryChannel: ChannelId` to `deliveryChannels: ChannelId[]` across [`features/topic-navigation/types.ts`](../frontend/src/features/topic-navigation/types.ts), [`features/review/ReviewWorkspace.tsx`](../frontend/src/features/review/ReviewWorkspace.tsx), [`features/review/context/ReviewFlowContext.tsx`](../frontend/src/features/review/context/ReviewFlowContext.tsx), [`features/review/context/useReviewFlowActions.ts`](../frontend/src/features/review/context/useReviewFlowActions.ts), and the worker topic schema in [`worker/src/index.ts`](../worker/src/index.ts). Update LivePreview to render one preview per selected channel as tabs.
- [ ] **[HIGH]** Extract a single canonical `<ChannelPicker />` and replace usage in [`DashboardDelivery.tsx`](../frontend/src/components/dashboard/tabs/DashboardDelivery.tsx), [`TopicsRightRail.tsx`](../frontend/src/components/dashboard/components/TopicsRightRail.tsx), and the bulk modal.
- [ ] **[MED]** Add a Connection Health panel surfacing which channels are connected, last error, "Test connection" buttons. Reuse OAuth flow from settings ([`09-settings-connections.md`](09-settings-connections.md)).
- [ ] **[MED]** Calendar: show pending-publish state distinctly from drafted; connect [`usePendingScheduledPublish.ts`](../frontend/src/features/scheduled-publish/usePendingScheduledPublish.ts) to calendar so dragging a queued item warns.

### Phase 3 — Strategic (6-12 wk)
- [ ] **[HIGH]** Recurrence: introduce a `schedule: { kind: 'once' | 'rrule', rrule?: string }` shape; UI a small rrule builder (every weekday, every Mon/Wed at 9am).
- [ ] **[MED]** Per-channel timing override (LinkedIn 9am, Instagram noon).
- [ ] **[MED]** Optimal-time suggester (per-persona engagement model).
- [ ] **[MED]** Multi-channel preview side-by-side in [`features/review-editor/components/LivePreviewSidebar.tsx`](../frontend/src/features/review-editor/components/LivePreviewSidebar.tsx).

## Done when

- Only one ScheduleEditor component exists across the app.
- A topic can target multiple channels and schedule each individually.
- Calendar drag previews show all affected items.
- Recurring schedules survive across worker restarts.
- Every queue row shows its channel(s) at a glance.
- Channels with `requiresRecipient` block publish until recipient is set.
