# Phase 5 — Editorial Polish (Newsletter + Bulk)

## Goal

Make the creator-facing flows feel like editorial tools, not raw forms. Newsletter gets a live preview composer; Bulk Campaign gets a 3-mode wizard and inline bulk edit.

**Splittable:** Newsletter (5.1–5.3) and Bulk (5.4–5.6) share no files; ship independently.

## Stages

### Stage 5.1 — Newsletter live preview pane
- **Files:** [`frontend/src/features/campaign/components/newsletter/NewsletterConfigDrawer.tsx`](../../frontend/src/features/campaign/components/newsletter/NewsletterConfigDrawer.tsx); new `frontend/src/features/campaign/components/newsletter/NewsletterPreview.tsx`; route under `/campaign/newsletter/:id`
- **Change:** Convert the 600-px drawer into a full-page editor with **left config / right preview** layout. Preview renders the current configuration as it would arrive in subscriber inboxes (Beehiiv/Substack inspired).
- **Done when:** Editing config updates the preview in real time; preview matches send output.
- **Risk:** medium

### Stage 5.2 — Newsletter validation pass
- **Files:** `NewsletterConfigDrawer.tsx` (or new editor page from 5.1)
- **Change:** Inline validation + character counts on subject template, recipients (email format, max count), author persona (min length). Error messaging matches `<ErrorBanner />` (see Phase 6 Stage 6.1).
- **Done when:** Invalid config blocks send and surfaces the bad field.
- **Risk:** low

### Stage 5.3 — Split issue detail out of config drawer
- **Files (new):** `frontend/src/features/campaign/components/newsletter/IssueDetailPanel.tsx`
- **Files (touch):** [`NewsletterTab.tsx`](../../frontend/src/features/campaign/components/newsletter/NewsletterTab.tsx)
- **Change:** Issue detail is its own surface (not the config drawer) with Approve / Send-Now / Schedule actions and a rendered preview.
- **Done when:** Clicking an issue opens a dedicated view, not the config drawer.
- **Risk:** low

### Stage 5.4 — Bulk Campaign step-1 rewrite (3 modes)
- **Files:** [`frontend/src/features/campaign/CampaignPage.tsx`](../../frontend/src/features/campaign/CampaignPage.tsx) (bulk tab block ~lines 287–687)
- **Change:** Replace the JSON paste flow with a tabbed input:
  - **(a) Generate with Claude** — user types intent, app calls Claude API and returns parsed topics.
  - **(b) Upload** — CSV / JSON drop zone with sample download.
  - **(c) Type ideas** — structured table (one row = one topic, inline channel + date columns).
  All three converge on the same internal topic-array model that step 2 already consumes.
- **Done when:** No raw JSON paste in the default flow; all three modes produce valid bulk drafts.
- **Risk:** medium

### Stage 5.5 — Inline column editors for schedule/channel
- **Files:** `CampaignPage.tsx` (bulk preview table)
- **Change:** Replace bulk schedule/channel modal dialogs with inline column editors in the preview table. Each cell is a click-to-edit control (date picker / `<ChannelPicker />` from Stage 3.1).
- **Done when:** No modal needed for bulk schedule/channel edits; selection still works for true bulk apply.
- **Risk:** medium

### Stage 5.6 — Template gallery + draft persistence
- **Files:** `CampaignPage.tsx`; localStorage helper; possibly a new backend table
- **Change:** Add 3 starter campaign templates (product launch, weekly digest, event series) on the bulk tab landing. Persist in-progress bulk drafts to localStorage on every change; restore on reload. Optionally sync to backend.
- **Done when:** User can pick a template and start; closing the tab mid-flow does not lose work.
- **Risk:** low–medium
