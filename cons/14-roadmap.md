# 14. Roadmap & Sequencing

> **Audience:** PM, eng leads. Read alongside [`PHASES.md`](PHASES.md).
> **This file** maps the new 14-surface cut to the original 6-phase delivery plan, lists cross-cutting dependencies, owners (RACI), KPIs, and the overall definition of done.

## Surface ↔ phase matrix

| New surface | Phase 1 (quick wins) | Phase 2 (structural) | Phase 3 (strategic) | Existing phase doc |
|------|----------------------|----------------------|----------------------|--------------------|
| 01 IA               | sidebar grouping, breadcrumbs, help button | route-context hook, recently-viewed, mobile drawer | command palette, route guards | [`phase-6`](phases/phase-6-cross-cutting.md) |
| 02 Feed             | persistent actions, favicon, summary, search, j/k | two-panel + horizontal cards + filter bar + curated rail compaction | personalisation, mobile-first, WCAG AA | [`phase-2`](phases/phase-2-feed-redesign.md) |
| 03 Article+Clips    | trash icon, drop affordance, compose CTA, bulk select, lightbox, passage clip from feed | inline detail, side rail dock, clip groups, single-stack AI panel | AI grouping, cached AI analysis | [`phase-2`](phases/phase-2-feed-redesign.md) (Stage 2.8) |
| 04 Topics           | row CTA, channel pill, status pill, empty state w/ templates, save toast, persona delete, AI progress, dup, panel collapse | AI-Draft full sheet, drop-menu deterministic, draft hook, list filters, bulk ops | series, persona analytics, AI suggest | [`phase-1`](phases/phase-1-quick-wins.md), [`phase-3`](phases/phase-3-publish-clarity.md) |
| 05 Schedule+Channel | unified ScheduleEditor, timezone caption, mobile sticky footer, channel pill, recipient warn | multi-channel array, ChannelPicker extraction, Connection Health, calendar pending state | recurrence (rrule), per-channel timing, optimal-time | [`phase-3`](phases/phase-3-publish-clarity.md) |
| 06 Review Editor    | sidebar 3-group collapse, slider tooltips, 3 distinct dialogs, autosave, beforeunload | flip layout, version drawer, variant compare, edit-toggle | Grammarly-style suggestions, A/B publish, content review gating | [`phase-3`](phases/phase-3-publish-clarity.md), [`phase-6`](phases/phase-6-cross-cutting.md) |
| 07 Publish          | confirm modal, success toast w/ permalink, footer regroup, scheduled countdown | merge approve+publish, undo-send window, multi-channel chips | post-publish dashboard, smart confirmation, permalink storage | [`phase-3`](phases/phase-3-publish-clarity.md) |
| 08 Newsletter       | live preview, mini-cal enlarge, always-visible Approve/Send, "send test", subject vars, summary chip | full-page editor, dedicated Issue view, block templates, suggested articles, status badge redesign | A/B subjects, analytics, segmentation, cross-promo | [`phase-5`](phases/phase-5-editorial-polish.md) |
| 09 Settings         | section descriptions, Test connection, enrichment tooltips, sticky ToC, save diff, validation, wizard progress + back + relabel | drawer→page, URL subpaths, Cmd-K search, refactor 142 props, Connection Health, ChannelSettingsCard extraction | import/export, env overrides, audit log | [`phase-4`](phases/phase-4-settings-ia.md) |
| 10 Enrichment       | progress to non-admin, fail toast, rationale card, last-3 runs expanded, node tooltips | DAG to user, re-run controls, edit-prompt deep-link, persisted progress, top banner | analytics, cost dashboard, recipes | [`phase-4`](phases/phase-4-settings-ia.md), [`phase-6`](phases/phase-6-cross-cutting.md) |
| 11 Feedback Loop    | log variant pick + 👍👎 + post-publish rating | pre-apply diff, feedback summary view, heavy-edit detection | fine-tuning, A/B recipes, weekly report | new |
| 12 Admin            | replace prompt(), Deny, search, sort, request meta | batch ops, audit log, status pill, CSV export | invite-by-email, plan management, activity feed | new |
| 13 Errors           | strip URLs, OfflineBanner, primitives, retry CTAs, status-code copy, empty-state pass | SSE node-level errors, zod validation, rate-limit backoff, mobile parity, OAuth hook | telemetry, self-healing, report-issue, shortcuts | [`phase-6`](phases/phase-6-cross-cutting.md) |

## Stage map (effort cut)

| Stage | Phase | Focus surfaces | Wall-clock |
|-------|-------|----------------|------------|
| **S1 Stabilise** | Phase 1 | 02 (affordances), 04 (toasts/required), 05 (single editor), 07 (toast+permalink), 09 (descriptions+test), 13 (consistent retry+offline) | 1-2 wk |
| **S2 Restructure** | Phase 2 | 01 (groups+breadcrumbs), 02 (two-panel), 03 (rail+inline detail), 06 (3 groups+autosave), 07 (merge+undo), 08 (preview+blocks), 09 (full page+health) | 3-6 wk |
| **S3 Differentiate** | Phase 3 | 10 (user-visible), 11 (feedback loop), 05 (recurrence + multi-channel deep), 12 (audit+batch), full a11y, mobile-first | 6-12 wk |

## Cross-cutting dependencies

```
01 IA grouping ──┐
                 ├──► all surfaces inherit consistent shell + breadcrumbs
04 row CTA ──────┘
05 multi-channel ──► 06 LivePreview rework ──► 07 multi-channel chips
05 single ScheduleEditor ──► 05 calendar drag preview + 07 scheduled countdown
02 two-panel feed ──► 03 article inline detail + 03 clips side rail
09 settings refactor ──► 09 Connection Health page ──► 05 health surfacing
13 error primitives ──► every surface adopts ErrorBanner / EmptyState / LoadingSkeleton
11 feedback Phase 1 ──► (independent) — capture signals first; analytics later
10 user-visible enrichment ──► 13 SSE node-level errors (shared SSE channel)
```

Critical-path order if budget is tight:
1. 13 primitives (`<ErrorBanner />`, `<OfflineBanner />`, `<EmptyState />`) — Phase 1, 2 days, every surface benefits.
2. 04 channel + status pill — unlocks 05, 07.
3. 05 single ScheduleEditor — unlocks 07 publish footer redesign.
4. 02 Phase 1 + 03 Phase 1 — daily-driver surface visibly improves.
5. 09 Phase 1 (descriptions + Test connection) — kills the largest support cost.

## RACI

| Surface | Responsible | Accountable | Consulted | Informed |
|---------|-------------|-------------|-----------|----------|
| 01 IA              | Frontend lead | PM | Design | All eng |
| 02 Feed            | Frontend dev (feed) | Design | PM | Worker dev |
| 03 Article+Clips   | Frontend dev (feed) | Design | PM | Worker dev |
| 04 Topics          | Frontend dev (topics) | PM | Design | Worker dev |
| 05 Schedule+Channel| Worker dev + Frontend dev (review) | PM | Design | Frontend lead |
| 06 Review Editor   | Frontend dev (editor) | Design | PM | Worker dev |
| 07 Publish         | Worker dev | PM | Design | Frontend dev |
| 08 Newsletter      | Worker dev (newsletter) | PM | Design | Frontend dev |
| 09 Settings        | Frontend lead | PM | Worker dev | Design |
| 10 Enrichment      | Worker dev | Frontend lead | PM | Design |
| 11 Feedback loop   | ML / data | PM | Worker dev | Frontend |
| 12 Admin           | Frontend lead | PM | Worker dev | Design |
| 13 Errors          | Frontend lead | All | All | All |

## KPIs to instrument before/after

- **Activation:** time-to-first-published-post (median + p90).
- **Engagement:** feed sessions per user per week; cards-viewed-per-session.
- **Retention:** 7d / 28d return rate among users who published once.
- **Quality:** edit-rate (% of variants edited heavily before publish); thumbs-up rate on the post-publish 1-tap rating.
- **Reliability:** publish success rate per channel; SSE error rate.
- **Cost:** tokens-per-published-post; tokens-per-active-user.
- **Support:** "where do I find X" tickets per week (target: ↓50% post-Phase-2).

## Definition of done — overall

- Every cons file under `cons/` (00-14) has an owner, an acceptance section, and at least one fix marked `[x]`.
- Phase 1 closes within 2 weeks; Phase 2 within 6 weeks; Phase 3 staged.
- Every user-facing claim ("instant", "two-panel", "no hidden actions") backed by an automated e2e test under [`tests/e2e/`](../frontend/tests/e2e/).
- KPI dashboards exist for activation, engagement, reliability, cost.
- The `<ErrorBanner />`, `<EmptyState />`, `<LoadingSkeleton />` primitives are the only patterns used across the app.

## What this plan deliberately does not do

- **Backend / worker logic changes that aren't UX-driven.**
- **Design tokens / theme overhaul** (assume current Tailwind setup).
- **Internationalization.**
- **Data migrations** (except where called out: clip groups, multi-channel array, schedule rrule).
