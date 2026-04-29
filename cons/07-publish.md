# 07. Publish Flow

> **Stakeholders:** every user. Brand-risk surface — accidental publish is the worst-case scenario.
> **Source files:** [`features/review/context/ReviewFlowContext.tsx`](../frontend/src/features/review/context/ReviewFlowContext.tsx), [`features/review/context/useReviewFlowActions.ts`](../frontend/src/features/review/context/useReviewFlowActions.ts), [`features/review-editor/screens/EditorScreen.tsx`](../frontend/src/features/review-editor/screens/EditorScreen.tsx) (footer block), [`features/scheduled-publish/ScheduledPublishBanner.tsx`](../frontend/src/features/scheduled-publish/ScheduledPublishBanner.tsx), [`services/backendApi.ts`](../frontend/src/services/backendApi.ts), [`worker/src/index.ts`](../worker/src/index.ts) (publish handlers).
> **Tests:** [`tests/e2e/journeys/06-publish-channels.spec.ts`](../frontend/tests/e2e/journeys/06-publish-channels.spec.ts), [`11-scheduled-publish.spec.ts`](../frontend/tests/e2e/journeys/11-scheduled-publish.spec.ts).
> **Pairs with:** [`audits/01-topics-and-publishing.md`](audits/01-topics-and-publishing.md) and [`phases/phase-3-publish-clarity.md`](phases/phase-3-publish-clarity.md).

## What this surface is

The set of footer actions: Save draft / Approve / Publish to <channel> / Schedule. Side-effects: Approve = sheet status change, Publish = sheet status + send to channel, Schedule = queue a worker job to publish at time T.

## Cons — 4 perspectives

### 👤 User
- I don't know if I should click Approve, Publish, or both.
- After clicking Publish, the editor stays open with no toast — did it ship?
- "Publish to LinkedIn" is disabled when I've set a future time but the only hint is in `title` attribute (invisible).
- I can accidentally publish stale text — no preview / confirmation step.
- The footer button set changes between visits (depends on `isPublished` + `hasSheetVariants`); I don't recognise the screen.
- After publishing I have no link to the live post.
- No undo — once it's out, it's out.

### 🎨 UX
- `[HIGH]` "Approve" and "Publish to X" sit side by side with the same shape — high mis-click risk.
- `[HIGH]` Status-dependent button layouts violate Heuristic 4 (consistency).
- `[HIGH]` Disabled-button reasons hidden in `title`; no accessible message.
- `[MED]` Schedule input is at the top of the footer, action buttons at the bottom-right — no visual link.
- `[MED]` The Scheduled banner is informational; no countdown.

### 📦 Product Owner
- `[HIGH]` No "publish preview" checkpoint for high-stakes posts.
- `[HIGH]` No undo/cancel within ~30s of publish.
- `[MED]` No surfaced post-permalink after success.
- `[MED]` No multi-channel concurrent publish (per [`05-schedule-and-channel.md`](05-schedule-and-channel.md)).

### 💼 Stakeholder
- `[HIGH]` A confused publish flow risks bad posts going public — direct brand cost.
- `[MED]` Lack of permalink-after-publish weakens analytics tie-in.

## Fixes

### Phase 1 — Quick wins (≤2 wk)
- [ ] **[HIGH]** [`useReviewFlowActions.ts`](../frontend/src/features/review/context/useReviewFlowActions.ts) — wrap publish in a confirmation modal showing the rendered post preview + channel + scheduled time. Always require confirmation in Phase 1.
- [ ] **[HIGH]** [`useReviewFlowActions.ts`](../frontend/src/features/review/context/useReviewFlowActions.ts) — on publish success, show a toast with "View on <channel> ↗" using the returned permalink (extend backend if not present).
- [ ] **[HIGH]** [`EditorScreen.tsx`](../frontend/src/features/review-editor/screens/EditorScreen.tsx) (footer) — replace the disabled "Publish to LinkedIn" while-scheduled with explicit copy "Will auto-send <relative time>"; add a separate "Send now anyway" link that triggers cancel-schedule + publish.
- [ ] **[HIGH]** [`EditorScreen.tsx`](../frontend/src/features/review-editor/screens/EditorScreen.tsx) — group footer as: `[ Save draft ]    [ Schedule ▾ ]    [ Send to LinkedIn ▸ ]`. Single primary CTA right-aligned; "Approve" demoted to a small "Mark approved" link/menu item under "Save draft".
- [ ] **[MED]** [`ScheduledPublishBanner.tsx`](../frontend/src/features/scheduled-publish/ScheduledPublishBanner.tsx) — show a live countdown ("Sending in 3h 12m"); cancel button uses destructive styling.

### Phase 2 — Structural (3-6 wk)
- [ ] **[HIGH]** Merge Approve + Publish semantically — Approve becomes a state-only toggle accessible only from the topics list (bulk approval), not from the editor footer. Editor only has "Send now" / "Schedule send" / "Save draft".
- [ ] **[HIGH]** Add an Undo Send window: 30s after publish, a banner allows cancelling if the publish hasn't fanned out yet (worker exposes a `revoke` endpoint).
- [ ] **[MED]** Multi-channel publish: footer shows N channel chips with per-channel state (queued / sent / failed). Depends on [`05-schedule-and-channel.md`](05-schedule-and-channel.md) Phase 2.

### Phase 3 — Strategic (6-12 wk)
- [ ] **[MED]** Post-publish dashboard widget: latest-published cards with engagement pulled per platform.
- [ ] **[MED]** Smart confirmation: if AI detects high-risk content (claims, names, links), require an extra checkbox.
- [ ] **[MED]** Auto-permalink storage on the worker; expose in topics list and analytics.

## Done when

- One unambiguous primary CTA in the editor footer.
- Every publish surfaces a toast with a permalink.
- Scheduled publishes show a countdown the user can cancel.
- Undo-send works for at least 30s post-click.
- Pre-publish confirmation always shows preview + channel + time.
