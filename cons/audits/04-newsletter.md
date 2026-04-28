# Newsletter

The most editorially-positioned surface in the app. Today it has a list/calendar + a 600-px config drawer + a wizard. The drawer is reasonably well organized, but **there is no rendered preview** before sending, validation is missing, and the issue-detail view reuses the config drawer.

## Role Cons

- **UX:** No live preview of the rendered newsletter; 600-px drawer cramped on small laptops; collapsed "Voice & Topics" hides the most differentiating settings; issue detail reuses drawer (mental-model collision).
- **PO:** Newsletter is a paid-tier flagship — needs to feel like Beehiiv / Substack. Without preview, users can't trust what gets sent.
- **Stakeholder:** Demo-ability gap. Editors expect a side-by-side composer/preview.
- **User:** I configured tone, keywords, schedule — but I don't see what subscribers receive until after send.

## Files of Record

- [`frontend/src/features/campaign/components/newsletter/NewsletterTab.tsx`](../../frontend/src/features/campaign/components/newsletter/NewsletterTab.tsx) — list + calendar
- [`frontend/src/features/campaign/components/newsletter/NewsletterConfigDrawer.tsx`](../../frontend/src/features/campaign/components/newsletter/NewsletterConfigDrawer.tsx) — settings drawer
- [`frontend/src/features/campaign/components/newsletter/NewsletterWizard.tsx`](../../frontend/src/features/campaign/components/newsletter/NewsletterWizard.tsx) — create flow

## Concrete Issues

1. **[HIGH]** No rendered preview before send — add live HTML preview pane inside `NewsletterConfigDrawer.tsx` (Beehiiv/Substack inspired).
2. **[HIGH]** 600-px drawer is cramped — convert to full-page editor (`/campaign/newsletter/:id`) with left config / right preview.
3. **[HIGH]** No validation on subject template, recipients, author persona — show inline errors + character counts on every field.
4. **[MED]** Issue detail panel reuses config drawer — split into a dedicated Issue view with Approve / Send-Now / Schedule actions.
5. **[MED]** "Voice & Topics" collapsed by default but is the differentiating section — surface a 1-line summary even when collapsed (e.g. "Tone: analytical • 3 keywords").
6. **[LOW]** No "send test to me" button — add a one-click test-send to the editor's address.
7. **[LOW]** Wizard and drawer don't share state model — code duplication risk.

## Linked Phase

- **Stages 5.1, 5.2, 5.3** (Phase 5 — Editorial Polish)
