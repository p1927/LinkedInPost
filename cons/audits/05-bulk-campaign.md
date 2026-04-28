# Bulk Campaign

The user's verbatim feedback: "it looks like a form it doesn't seem good." Confirmed. Step 1 is a paste-the-Claude-prompt-then-paste-the-JSON workflow with no syntax highlighting, no preview, and bulk schedule/channel are modal dialogs.

## Role Cons

- **UX:** Step 1 (Import) feels like an internal devtool — paste a prompt, paste JSON, hope for no errors; bulk schedule + channel live in modal dialogs that interrupt flow; no inline column edit.
- **PO:** Bulk campaigns are a power-user retention loop. The current friction means only the founder uses it.
- **Stakeholder:** Won't survive a prospect demo. Raw JSON in the UI is the fastest way to lose a sale.
- **User:** I want to plan 10 posts; instead I'm round-tripping to Claude in another tab to generate JSON.

## Files of Record

- [`frontend/src/features/campaign/CampaignPage.tsx`](../../frontend/src/features/campaign/CampaignPage.tsx) — bulk tab block (~lines 287–687)

## Concrete Issues

1. **[HIGH]** JSON paste workflow — replace step 1 with a 3-mode wizard:
   - **(a)** Paste prompt → app calls Claude API directly and returns parsed JSON.
   - **(b)** Upload CSV / JSON file.
   - **(c)** Type ideas into a structured table (one row = one topic, inline channel + date columns).
2. **[HIGH]** Bulk schedule / channel are modal dialogs — make them inline column editors in the preview table.
3. **[MED]** Errors are text-only — show a red diff panel + jump-to-line links in the JSON editor.
4. **[MED]** No template gallery — add 3 starter campaigns (product launch, weekly digest, event series).
5. **[MED]** No save-as-draft — closing mid-flow loses everything; persist in localStorage + backend draft table.
6. **[LOW]** No undo on bulk delete — add a 5-second undo toast.

## Linked Phase

- **Stages 5.4, 5.5, 5.6** (Phase 5 — Editorial Polish)
