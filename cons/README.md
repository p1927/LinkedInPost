# `cons/` — UX Cons & Phased Fix Plan

A deep audit of UX problems in the LinkedInPost app, written from **four perspectives** (UX Designer, Product Owner, Stakeholder, End User), with a **phase / stage / file** remediation plan concise enough for a sub-agent to execute.

The folder ships **two complementary cuts** of the same work:

- **Surface cut** — `00-overview.md` … `14-roadmap.md` at the root: one file per UI surface (Feed, Topics, Publish, Settings, …). Easiest entry-point if you're touching one specific area. 4-perspective critique + Phase 1/2/3 fixes + exact file paths + severity tags per surface.
- **Role × phase cut** — [`audits/`](audits/) (one per surface) + [`phases/`](phases/) (one per delivery phase). The original cut by role and 6-phase delivery plan.

Every surface file in the surface cut **cross-links to its matching audit and phase doc**, so you can pick whichever entry-point fits your task and follow the chain.

## How to read this folder

1. Start with [`ROLES.md`](ROLES.md) to understand the four voices used in every audit.
2. **Pick a cut:**
   - **Surface-first:** open [`00-overview.md`](00-overview.md) → jump to the surface file you care about (e.g. [`02-feed.md`](02-feed.md), [`07-publish.md`](07-publish.md)).
   - **Phase-first:** skim [`PHASES.md`](PHASES.md) for the 6-phase delivery plan and its dependency graph; pick a phase doc.
3. Open the audit doc for the surface you care about (e.g. [`audits/02-feed.md`](audits/02-feed.md)) — each one ends with a **Linked Phase** pointer.
4. To execute: pick a phase doc and follow the stages in order. Each stage names the files to touch and the "Done when" criterion.

## File index

### Meta
| File | Purpose |
|---|---|
| [`README.md`](README.md) | This file. |
| [`ROLES.md`](ROLES.md) | The 4 audit perspectives. |
| [`PHASES.md`](PHASES.md) | The 6 delivery phases at a glance + dependency graph. |

### Surface cut (00–14, root level)
| File | Surface |
|---|---|
| [`00-overview.md`](00-overview.md) | Exec summary, top-10 cross-cutting cons, phase ladder, file index, Phase-1 acceptance. |
| [`01-information-architecture.md`](01-information-architecture.md) | App shell, sidebar, header, routing, breadcrumbs, deep-linking. |
| [`02-feed.md`](02-feed.md) | Feed two-panel, scannable cards, trending rail. |
| [`03-article-and-clips.md`](03-article-and-clips.md) | ArticleDetailView + ClipsDock + passage clipping. |
| [`04-topics.md`](04-topics.md) | Topics list (DashboardQueue), AddTopicPage, TopicRightPanel. |
| [`05-schedule-and-channel.md`](05-schedule-and-channel.md) | Unify ScheduleEditor, multi-channel publishing, recurrence. |
| [`06-review-editor.md`](06-review-editor.md) | ReviewWorkspace, EditorScreen, EditorSidebar tabs, autosave. |
| [`07-publish.md`](07-publish.md) | Approve vs Publish semantics, success states, undo-send. |
| [`08-newsletter.md`](08-newsletter.md) | NewsletterTab, ConfigDrawer, Wizard, live preview, A/B. |
| [`09-settings-connections.md`](09-settings-connections.md) | Drawer refactor, OAuth health, setup wizard, Cmd-K. |
| [`10-enrichment-generation.md`](10-enrichment-generation.md) | User-visible progress, EnrichmentFlowPage, re-run, recipes. |
| [`11-feedback-loop.md`](11-feedback-loop.md) | Variant ratings, learning system, A/B per recipe. |
| [`12-admin-panel.md`](12-admin-panel.md) | AdminPanel, waitlist Deny, batch ops, audit log. |
| [`13-error-and-edge.md`](13-error-and-edge.md) | Validation, offline, retry, mobile parity, primitives. |
| [`14-roadmap.md`](14-roadmap.md) | Surface↔phase matrix, RACI, KPIs, critical path, DoD. |

### Role × phase cut (existing)
| File | Purpose |
|---|---|
| [`audits/01-topics-and-publishing.md`](audits/01-topics-and-publishing.md) | Topics queue, schedule, channel, publish. |
| [`audits/02-feed.md`](audits/02-feed.md) | Feed page layout, density, discovery. |
| [`audits/03-clipping.md`](audits/03-clipping.md) | ClipsDock, passage clip, draft assignment. |
| [`audits/04-newsletter.md`](audits/04-newsletter.md) | Newsletter editorial flow. |
| [`audits/05-bulk-campaign.md`](audits/05-bulk-campaign.md) | Bulk campaign JSON + bulk ops. |
| [`audits/06-settings.md`](audits/06-settings.md) | Monolithic settings drawer. |
| [`audits/07-setup-wizard.md`](audits/07-setup-wizard.md) | 11-step setup wizard. |
| [`audits/08-enrichment.md`](audits/08-enrichment.md) | Enrichment DAG visualization. |
| [`audits/09-cross-cutting.md`](audits/09-cross-cutting.md) | Empty/loading/error, mobile, a11y, IA. |
| [`phases/phase-1-quick-wins.md`](phases/phase-1-quick-wins.md) | Always-visible CTAs, channel chip, summaries. |
| [`phases/phase-2-feed-redesign.md`](phases/phase-2-feed-redesign.md) | Twitter/Perplexity-style feed. |
| [`phases/phase-3-publish-clarity.md`](phases/phase-3-publish-clarity.md) | Unify schedule/channel + publish confirm. |
| [`phases/phase-4-settings-ia.md`](phases/phase-4-settings-ia.md) | Drawer → tabbed page. |
| [`phases/phase-5-editorial-polish.md`](phases/phase-5-editorial-polish.md) | Newsletter preview + bulk wizard. |
| [`phases/phase-6-cross-cutting.md`](phases/phase-6-cross-cutting.md) | Mobile, a11y, primitives. |

## Conventions

- **Severity tags:** `[HIGH]`, `[MED]`, `[LOW]`.
- **File links** are repo-relative so they resolve from this folder via `../`.
- **Stage IDs** are stable (`Stage 3.4` always means Phase 3, Stage 4) — audits link to them.
- **No application code is changed by the cons/ folder itself.** It is documentation that drives later implementation.
