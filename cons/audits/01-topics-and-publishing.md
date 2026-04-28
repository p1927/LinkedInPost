# Topics & Publishing

The first surface a returning user sees. Today it works as a queue list + calendar with a right-side detail drawer, but row CTAs are hover-only, channel selection has three entry points, and "publish" is one click with no confirmation.

## Role Cons

- **UX:** Primary CTAs are hidden until hover; channel and schedule each have two competing UIs; status badges (Drafted / Approved) are visually identical.
- **PO:** New users land on an empty queue with no path to value — no templates, no tour, no example topic. Conversion to "first published post" is gated behind unclear next steps.
- **Stakeholder:** Looks like a back-office queue, not a creator product. A demo of "create → publish" jumps between three places.
- **User:** Single click on Publish goes live with no preview / confirm; no "are you sure" for a destructive-feeling action; no undo; can't tell at a glance which channel a topic will publish to.

## Files of Record

- [`frontend/src/components/dashboard/tabs/DashboardQueue.tsx`](../../frontend/src/components/dashboard/tabs/DashboardQueue.tsx) — list/calendar, bulk actions, row CTAs
- [`frontend/src/components/dashboard/components/TopicDetailPanel.tsx`](../../frontend/src/components/dashboard/components/TopicDetailPanel.tsx) — right drawer (schedule + preview)
- [`frontend/src/components/dashboard/components/TopicsRightRail.tsx`](../../frontend/src/components/dashboard/components/TopicsRightRail.tsx) — channel rail (entry #2)
- [`frontend/src/components/dashboard/tabs/DashboardDelivery.tsx`](../../frontend/src/components/dashboard/tabs/DashboardDelivery.tsx) — channel rail (entry #1)
- [`frontend/src/features/content-schedule-calendar/ContentScheduleCalendar.tsx`](../../frontend/src/features/content-schedule-calendar/ContentScheduleCalendar.tsx) — schedule UI #2
- [`frontend/src/features/topic-navigation/screens/TopicEditorPage.tsx`](../../frontend/src/features/topic-navigation/screens/TopicEditorPage.tsx) — variant editor
- [`frontend/src/features/add-topic/AddTopicPage.tsx`](../../frontend/src/features/add-topic/AddTopicPage.tsx) — create topic

## Concrete Issues

1. **[HIGH]** Row actions (Draft / AI-Draft / Edit / Publish) appear only on hover in `DashboardQueue.tsx` — show one primary CTA per row always; secondary in overflow.
2. **[HIGH]** No channel indicator at the row level — three places set channel, none surface it. Add a per-row channel pill (LinkedIn / Newsletter / Telegram / …) in `DashboardQueue.tsx`.
3. **[HIGH]** Two divergent schedule editors — drawer date+time inputs in `TopicDetailPanel.tsx` vs drag-on-calendar in `ContentScheduleCalendar.tsx`. Extract a single `<ScheduleEditor />` and reuse.
4. **[HIGH]** Status pills do not differentiate Pending / Drafted / Approved / Scheduled / Published — adopt a consistent colored ramp + icon set used everywhere a topic is rendered.
5. **[HIGH]** No pre-publish confirmation — clicking Publish goes live immediately. Add a confirm modal showing channel, scheduled-for time, and rendered preview.
6. **[HIGH]** AI-Draft modal is nested inside the right drawer (modal-on-modal). Promote to a route or full-screen sheet.
7. **[HIGH]** Empty state ("No topics yet") has no path forward. Add 2–3 starter templates + a 30-second tour trigger.
8. **[MED]** "Republish" button semantics unclear — add tooltip: "Creates a new draft from the published copy."
9. **[MED]** No undo / no "withdraw" affordance for a published post — at minimum link to platform-side instructions.
10. **[MED]** Channel selection has 3 entry points (Settings, drawer rail, bulk modal) — collapse into one canonical `<ChannelPicker />`.
11. **[MED]** "Drafting…" GitHub-action spinner gives no explanation of what's happening — show a 1-line description ("Generating with Claude…", "Pushing to GitHub Action…").

## Linked Phase

- **Stages 1.1, 1.2, 1.4, 1.5** (Phase 1 — Quick Wins)
- **Stages 3.1, 3.2, 3.3, 3.4, 3.5, 3.6** (Phase 3 — Publish Clarity)
