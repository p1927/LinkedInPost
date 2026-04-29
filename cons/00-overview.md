# 00. LinkedIn Post App — UX Cons Overview

> **Audience:** PM, design, eng, founders. Read this first.
> **Companion docs:** [`README.md`](README.md) · [`ROLES.md`](ROLES.md) · [`PHASES.md`](PHASES.md) · [`audits/`](audits/) · [`phases/`](phases/)

This file is the master index of UX problems across the app and their phased remediation. The 14 numbered files (`00`–`14`) split work by **surface** (one file per UI area). The earlier `audits/` + `phases/` folders are the original cut by **role** + **delivery phase** — keep both; they cross-reference each other.

## Why this exists

The pipeline (topics → research → enrichment → variants → review → publish → newsletter) is functionally rich but the surface UX is not. Users hit decision fatigue on topics/settings, can't scan the feed, can't tell Approve from Publish, and never see the AI working. This document is the master index of what's wrong and how we fix it in three phases.

## The four perspectives we critique with

Sourced from [`ROLES.md`](ROLES.md) — restated here for self-containment:

- **👤 User:** what's confusing, blocking, or annoying when I just want to ship a post? *(trust + safety)*
- **🎨 UX Designer:** is hierarchy, affordance, consistency, accessibility correct? *(broken patterns)*
- **📦 Product Owner:** what flows are missing, what kills conversion, what blocks retention? *(conversion blockers)*
- **💼 Stakeholder:** strategic risk, brand perception, scale economics, support cost. *(polish + demo)*

## Severity convention (matches existing audits)

`[HIGH]` ship-blocker / brand-risk / data-loss · `[MED]` friction / inconsistency · `[LOW]` polish.

## Top 10 cons across the app (cross-cutting)

1. **[HIGH] Approve ≠ Publish ambiguity.** Two buttons that look similar do very different things. (07)
2. **[HIGH] Feed is single-column and modal-driven** — not Twitter/Perplexity scannable. (02)
3. **[HIGH] Schedule has two competing UIs** (drawer date+time inputs in `TopicDetailPanel.tsx` vs drag-on-calendar in `ContentScheduleCalendar.tsx`) with different rules. (05)
4. **[HIGH] Single-channel only.** No multi-channel publish, no recurrence. (05)
5. **[HIGH] Enrichment runs invisibly to non-admins** — users see only "Drafting…". (10)
6. **[HIGH] EditorSidebar has 8 tabs**; users don't know what's in each or which to use. (06)
7. **[HIGH] DashboardSettingsDrawer is one 800-line scroll** with 15 unlabelled sections. (09)
8. **[HIGH] No feedback loop on variants** — system never learns from approve/discard. (11)
9. **[HIGH] Hover-only affordances everywhere** (delete X, thumbs, clip, approve, row CTA). (02, 03, 04, 08)
10. **[HIGH] No success toasts after primary CTAs** — Save Draft / Approve / Publish all silent. (07)

## Phase ladder (this 14-file structure)

- **Phase 1 — Quick wins (1-2 wk):** copy, affordances, toasts, validation. Cheap, ships confidence.
- **Phase 2 — Structural (3-6 wk):** IA, two-panel feed, unified schedule + publish, sidebar refactor.
- **Phase 3 — Strategic (6-12 wk):** feedback loop, recurrence, A/B, full a11y, mobile, analytics.

Map to the existing 6-phase cut in [`PHASES.md`](PHASES.md):

| New phase | Existing phases that satisfy it |
|---|---|
| Phase 1 | [`phases/phase-1-quick-wins.md`](phases/phase-1-quick-wins.md) |
| Phase 2 | [`phases/phase-2-feed-redesign.md`](phases/phase-2-feed-redesign.md) + [`phase-3-publish-clarity.md`](phases/phase-3-publish-clarity.md) + [`phase-4-settings-ia.md`](phases/phase-4-settings-ia.md) |
| Phase 3 | [`phases/phase-5-editorial-polish.md`](phases/phase-5-editorial-polish.md) + [`phase-6-cross-cutting.md`](phases/phase-6-cross-cutting.md) + new strategic work (feedback loop, recurrence, A/B) |

## File index — surface cut (this folder, root files)

| # | File | Surface | Existing audit it pairs with |
|---|------|---------|------------------------------|
| 00 | [`00-overview.md`](00-overview.md) | This file | — |
| 01 | [`01-information-architecture.md`](01-information-architecture.md) | App shell, sidebar, header, routing | [`audits/09-cross-cutting.md`](audits/09-cross-cutting.md) |
| 02 | [`02-feed.md`](02-feed.md) | Feed page two-panel, scannable cards | [`audits/02-feed.md`](audits/02-feed.md) |
| 03 | [`03-article-and-clips.md`](03-article-and-clips.md) | ArticleDetailView, ClipsDock | [`audits/03-clipping.md`](audits/03-clipping.md) |
| 04 | [`04-topics.md`](04-topics.md) | Topics list, AddTopicPage, TopicRightPanel | [`audits/01-topics-and-publishing.md`](audits/01-topics-and-publishing.md) |
| 05 | [`05-schedule-and-channel.md`](05-schedule-and-channel.md) | ScheduleEditor unify, multi-channel, recurrence | [`audits/01-topics-and-publishing.md`](audits/01-topics-and-publishing.md) |
| 06 | [`06-review-editor.md`](06-review-editor.md) | ReviewWorkspace, EditorScreen, EditorSidebar | [`audits/01-topics-and-publishing.md`](audits/01-topics-and-publishing.md) |
| 07 | [`07-publish.md`](07-publish.md) | Approve vs Publish, success states, banners | [`audits/01-topics-and-publishing.md`](audits/01-topics-and-publishing.md) |
| 08 | [`08-newsletter.md`](08-newsletter.md) | NewsletterTab, ConfigDrawer, Wizard | [`audits/04-newsletter.md`](audits/04-newsletter.md) |
| 09 | [`09-settings-connections.md`](09-settings-connections.md) | DashboardSettingsDrawer refactor, OAuth health | [`audits/06-settings.md`](audits/06-settings.md) + [`07-setup-wizard.md`](audits/07-setup-wizard.md) |
| 10 | [`10-enrichment-generation.md`](10-enrichment-generation.md) | User-visible progress, EnrichmentFlowPage | [`audits/08-enrichment.md`](audits/08-enrichment.md) |
| 11 | [`11-feedback-loop.md`](11-feedback-loop.md) | Variant ratings, learning system | (new — not in existing audits) |
| 12 | [`12-admin-panel.md`](12-admin-panel.md) | AdminPanel, waitlist, audit log | (new — not in existing audits) |
| 13 | [`13-error-and-edge.md`](13-error-and-edge.md) | Validation, offline, retry | [`audits/09-cross-cutting.md`](audits/09-cross-cutting.md) |
| 14 | [`14-roadmap.md`](14-roadmap.md) | Sequencing, dependencies, KPIs, owners | [`PHASES.md`](PHASES.md) |

## Acceptance for "Phase 1 done"

- Every primary CTA shows a success toast within 300ms.
- No critical action (delete, approve, publish) lives behind hover-only.
- Every settings input has inline validation + a "Test connection" affordance for OAuth.
- Every AI dimension slider has a tooltip explaining what 0…100 means.
- Approve and Publish buttons either have explicit copy ("Mark approved", "Send now to LinkedIn") or are merged with a confirmation modal.
- Pre-publish confirmation modal shows channel, scheduled-for time, rendered preview.

## How to use this document

1. **Triage:** scan the Top 10 cons above. If you only have 3 days, fix any HIGH that ranks high.
2. **Deep dive:** open the surface file (`02-feed.md`, etc.) and read the 4-perspective Cons + Phase 1 fixes block.
3. **Execute:** each fix references the exact file path. A sub-agent can pick one bullet and ship without further investigation.
4. **Cross-check:** the matching `audits/NN-*.md` adds severity tags and stage links into the original 6-phase plan.
