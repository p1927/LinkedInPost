# 08. Newsletter

> **Stakeholders:** paid-tier flagship users. Editorially-positioned surface — needs Beehiiv/Substack feel.
> **Source files:** [`features/campaign/components/newsletter/NewsletterTab.tsx`](../frontend/src/features/campaign/components/newsletter/NewsletterTab.tsx), [`features/campaign/components/newsletter/NewsletterConfigDrawer.tsx`](../frontend/src/features/campaign/components/newsletter/NewsletterConfigDrawer.tsx), [`features/campaign/components/newsletter/NewsletterWizard.tsx`](../frontend/src/features/campaign/components/newsletter/NewsletterWizard.tsx), [`worker/src/newsletter/`](../worker/src/newsletter/) (emailRenderer, scheduler, draftCreator, handlers, persistence).
> **Pairs with:** [`audits/04-newsletter.md`](audits/04-newsletter.md) and [`phases/phase-5-editorial-polish.md`](phases/phase-5-editorial-polish.md).

## What this surface is

Recurring email newsletter: list view of newsletters → detail dashboard with mini-calendar + issue list ([`NewsletterTab.tsx`](../frontend/src/features/campaign/components/newsletter/NewsletterTab.tsx)) → 600-px config drawer ([`NewsletterConfigDrawer.tsx`](../frontend/src/features/campaign/components/newsletter/NewsletterConfigDrawer.tsx)) handling settings + issue editing → wizard ([`NewsletterWizard.tsx`](../frontend/src/features/campaign/components/newsletter/NewsletterWizard.tsx)) for create flow.

## Cons — 4 perspectives

### 👤 User
- I configured tone, keywords, schedule — but I don't see what subscribers receive until after send.
- The mini-calendar is small; I can't read scheduled-issue dots without zooming.
- Approve / Send buttons appear only on hover — I never noticed I could approve from the list.
- Subject line is just a text input; no template variable support.
- Article reordering uses a tiny drag handle and no visual feedback.
- The same drawer is used for config and issue editing — I get confused which mode I'm in.

### 🎨 UX
- `[HIGH]` No live preview of the rendered newsletter — primary editorial gap.
- `[HIGH]` 600-px drawer is cramped on small laptops.
- `[HIGH]` Issue detail panel reuses [`NewsletterConfigDrawer.tsx`](../frontend/src/features/campaign/components/newsletter/NewsletterConfigDrawer.tsx) — split into a dedicated Issue view with Approve / Send-Now / Schedule actions.
- `[MED]` Status badges (Approved / Pending / Sent) are similarly bright — accessibility-bad.
- `[MED]` "Voice & Topics" collapsed by default but is the differentiating section — surface a 1-line summary even when collapsed.
- `[MED]` Raw HTML edit mode is unstyled textarea; no syntax highlighting.

### 📦 Product Owner
- `[HIGH]` Newsletter is a paid-tier flagship — needs to feel like Beehiiv / Substack. Without preview, users can't trust what gets sent.
- `[HIGH]` No validation on subject template, recipients, author persona — show inline errors + character counts on every field.
- `[MED]` No A/B subject testing.
- `[MED]` No subscriber list management surfaced (segments, unsubscribes).
- `[MED]` No send analytics (open / click / bounce).
- `[MED]` No template library; every issue from scratch.
- `[MED]` Wizard and drawer don't share state model — code duplication risk.
- `[LOW]` No "send test to me" button.

### 💼 Stakeholder
- `[HIGH]` Demo-ability gap. Editors expect a side-by-side composer/preview.
- `[HIGH]` Mis-sends are expensive — no preflight check.
- `[MED]` Without analytics, can't justify pricing tier.

## Fixes

### Phase 1 — Quick wins (≤2 wk)
- [ ] **[HIGH]** [`NewsletterConfigDrawer.tsx`](../frontend/src/features/campaign/components/newsletter/NewsletterConfigDrawer.tsx) — add live HTML preview pane (Beehiiv/Substack inspired). Iframe height ≥600px; desktop / mobile width toggle (`max-w-[600px]` vs `max-w-[375px]`).
- [ ] **[HIGH]** Inline validation on subject template, recipients, author persona; character counts on every field; red errors.
- [ ] **[HIGH]** [`NewsletterTab.tsx`](../frontend/src/features/campaign/components/newsletter/NewsletterTab.tsx) — make Approve / Send always visible (3-dot menu); primary CTA on hover-active.
- [ ] **[HIGH]** [`NewsletterTab.tsx`](../frontend/src/features/campaign/components/newsletter/NewsletterTab.tsx) — enlarge mini-calendar to ≥220px wide; render scheduled dates with badge dots.
- [ ] **[MED]** "Voice & Topics" collapsed default — surface a 1-line summary visible even when collapsed (e.g. "Tone: analytical • 3 keywords").
- [ ] **[MED]** Add "send test to me" button (one-click test-send to the editor's address).
- [ ] **[MED]** Subject input — add a `{{variable}}` autocomplete listing `{{subscriber_name}}`, `{{date}}`, `{{first_article_title}}`.
- [ ] **[LOW]** [`NewsletterConfigDrawer.tsx`](../frontend/src/features/campaign/components/newsletter/NewsletterConfigDrawer.tsx) — drag handle becomes the full row left edge; show a "drop here" indicator while dragging.

### Phase 2 — Structural (3-6 wk)
- [ ] **[HIGH]** Convert from 600-px drawer to a full-page editor at `/campaign/newsletter/:id` with left config / right preview. Replaces [`NewsletterConfigDrawer.tsx`](../frontend/src/features/campaign/components/newsletter/NewsletterConfigDrawer.tsx).
- [ ] **[HIGH]** Split issue-detail view from config drawer — dedicated Issue view with Approve / Send-Now / Schedule actions.
- [ ] **[MED]** Block-based template editor (drag-drop): hero, article carousel, CTA, footer. Backed by [`worker/src/newsletter/emailRenderer.ts`](../worker/src/newsletter/emailRenderer.ts) extension.
- [ ] **[MED]** Pull articles from the feed by interest group with a "Suggested for this issue" picker.
- [ ] **[MED]** Status badges redesigned with distinct hue + icon (✅ sent, 🟡 pending, 🔵 approved, ⏸ paused, ❌ failed).
- [ ] **[MED]** Replace raw HTML textarea with CodeMirror (syntax highlighting).
- [ ] **[MED]** Unify wizard + drawer state model so future refactors don't duplicate logic.

### Phase 3 — Strategic (6-12 wk)
- [ ] **[HIGH]** Subject A/B (send variant A to 10%, monitor open rate, send winner to 90%).
- [ ] **[HIGH]** Open / click / bounce analytics dashboard per issue and per newsletter.
- [ ] **[MED]** Cross-promote: "Republish your top LinkedIn post into this newsletter" one-click.
- [ ] **[MED]** Subscriber segmentation + dynamic content blocks.

## Done when

- Calendar is legible at default zoom.
- Approve/send actions always visible.
- Preview iframe shows mobile + desktop widths.
- Subject template variables work end-to-end.
- Issue editing happens in a dedicated view, not the config drawer.
- Validation prevents sending an issue with invalid persona / recipients.
