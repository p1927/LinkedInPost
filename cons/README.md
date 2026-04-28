# `cons/` — UX Cons & Phased Fix Plan

A deep audit of UX problems in the LinkedInPost app, written from **four perspectives** (UX Designer, Product Owner, Stakeholder, End User), with a **phase / stage / file** remediation plan concise enough for a sub-agent to execute.

## How to read this folder

1. Start with [`ROLES.md`](ROLES.md) to understand the four voices used in every audit.
2. Skim [`PHASES.md`](PHASES.md) for the 6-phase delivery plan and its dependency graph.
3. Open the audit doc for the surface you care about (e.g. [`audits/02-feed.md`](audits/02-feed.md)) — each one ends with a **Linked Phase** pointer.
4. To execute: pick a phase doc and follow the stages in order. Each stage names the files to touch and the "Done when" criterion.

## File index

| File | Purpose |
|---|---|
| [`README.md`](README.md) | This file. |
| [`ROLES.md`](ROLES.md) | The 4 audit perspectives. |
| [`PHASES.md`](PHASES.md) | All 6 phases at a glance + dependency graph. |
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
