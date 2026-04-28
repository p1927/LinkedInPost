# Phase 3 — Publish Clarity

## Goal

One canonical UX for schedule, channel, and publish. Eliminate the 3-different-places problem.

**Depends on:** Stage 1.2 (channel pill exists in queue rows).

## Stages

### Stage 3.1 — Extract `<ChannelPicker />`
- **Files (new):** `frontend/src/components/channels/ChannelPicker.tsx`
- **Files (replace usage):** [`DashboardDelivery.tsx`](../../frontend/src/components/dashboard/tabs/DashboardDelivery.tsx), [`TopicsRightRail.tsx`](../../frontend/src/components/dashboard/components/TopicsRightRail.tsx), bulk channel modal in [`DashboardQueue.tsx`](../../frontend/src/components/dashboard/tabs/DashboardQueue.tsx)
- **Change:** One canonical channel picker (channel + recipient mode + recipient list). All three call sites delete their own picker code and use `<ChannelPicker value onChange />`.
- **Done when:** Grep for "channel" UI returns only one component definition; behavior identical across the three sites.
- **Risk:** medium

### Stage 3.2 — Extract `<ScheduleEditor />`
- **Files (new):** `frontend/src/components/schedule/ScheduleEditor.tsx`
- **Files (replace usage):** [`TopicDetailPanel.tsx`](../../frontend/src/components/dashboard/components/TopicDetailPanel.tsx), [`ContentScheduleCalendar.tsx`](../../frontend/src/features/content-schedule-calendar/ContentScheduleCalendar.tsx)
- **Change:** Single component handling date, time, timezone, past-date validation, and "Apply" emission. Calendar drag still calls into the same component for confirmation.
- **Done when:** Both surfaces use `<ScheduleEditor />`; validation and time formatting are identical.
- **Risk:** medium

### Stage 3.3 — Pre-publish confirmation modal
- **Files:** [`DashboardQueue.tsx`](../../frontend/src/components/dashboard/tabs/DashboardQueue.tsx) and any other Publish trigger in [`TopicDetailPanel.tsx`](../../frontend/src/components/dashboard/components/TopicDetailPanel.tsx)
- **Change:** Clicking Publish opens a confirmation modal showing: target channel (with icon + name), recipients if any, scheduled-for time, and a rendered preview of the post body. Two buttons: Cancel / "Publish to {channel}".
- **Done when:** No Publish click goes live without confirmation; modal closes cleanly on Cancel.
- **Risk:** low

### Stage 3.4 — Make channel pill interactive
- **Files:** [`DashboardQueue.tsx`](../../frontend/src/components/dashboard/tabs/DashboardQueue.tsx)
- **Change:** Promote the read-only pill from Stage 1.2 to a click-to-edit control opening `<ChannelPicker />` in a popover.
- **Done when:** Clicking a row's channel pill opens the picker; selection persists to the topic.
- **Risk:** low

### Stage 3.5 — Flatten the AI-Draft modal
- **Files:** [`DashboardQueue.tsx`](../../frontend/src/components/dashboard/tabs/DashboardQueue.tsx) (lines ~738–789), maybe a new route under `/topics/:id/ai-draft`
- **Change:** Remove the modal-on-modal nesting. Either route to a dedicated page or open as a right-side sheet that does not stack on top of the topic detail drawer.
- **Done when:** AI-Draft never renders inside another drawer/modal; ESC behaves predictably.
- **Risk:** medium

### Stage 3.6 — Topics empty-state with starter templates + tour
- **Files:** [`DashboardQueue.tsx`](../../frontend/src/components/dashboard/tabs/DashboardQueue.tsx)
- **Change:** When topics list is empty, render 3 starter template cards (e.g. "Industry insight", "Product update", "Personal story") and a "Take a 30-second tour" link that triggers an overlay (overlay implementation defers to Phase 6 Stage 6.5).
- **Done when:** First-run user sees 3 templates + tour CTA instead of just "No topics yet".
- **Risk:** low
