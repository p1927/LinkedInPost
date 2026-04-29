# 10. Enrichment & Generation Visibility

> **Stakeholders:** every user (during generation); admins (when debugging). Differentiator surface — "watch the AI think" is a Perplexity-style retention hook.
> **Source files:** [`pages/EnrichmentFlowPage.tsx`](../frontend/src/pages/EnrichmentFlowPage.tsx) (~1,339 lines, admin-only today), [`features/generation/nodeProgressLabels.ts`](../frontend/src/features/generation/nodeProgressLabels.ts), [`features/review-editor/components/EditorSidebar.tsx`](../frontend/src/features/review-editor/components/EditorSidebar.tsx) (Generate panel + `EnrichmentProgressPanel`), [`components/dashboard/hooks/useDashboardQueue.ts`](../frontend/src/components/dashboard/hooks/useDashboardQueue.ts), [`worker/src/index.ts`](../worker/src/index.ts) enrichment SSE.
> **Pairs with:** [`audits/08-enrichment.md`](audits/08-enrichment.md) and [`phases/phase-4-settings-ia.md`](phases/phase-4-settings-ia.md), [`phase-6-cross-cutting.md`](phases/phase-6-cross-cutting.md).

## What this surface is

The pipeline that turns a topic into 4 variants: trigger → 8-10 enrichment LLM nodes → review-generation → generation worker → text+vision review → output. Today users see only "Drafting…". Admins can see a DAG view at `/enrichment` ([`EnrichmentFlowPage.tsx`](../frontend/src/pages/EnrichmentFlowPage.tsx)).

## Cons — 4 perspectives

### 👤 User
- I click "Generate" and stare at a spinner for 10-30s with no clue what's happening.
- If a node fails the pipeline still produces a draft — sometimes lower quality, no warning.
- I have no way to re-run a single node or the whole pipeline cheaply.
- I never see why variant 2 is "founder voice" vs "expert" — rationale is buried italic text.

### 🎨 UX
- `[HIGH]` Enrichment runs invisibly to non-admins.
- `[HIGH]` DAG view (admin) is read-only — no inline "Edit prompt" action; no deep-link to that step's settings.
- `[HIGH]` Run history collapsed by default — show last 3 runs expanded for the active topic.
- `[MED]` DAG is dense; 10 nodes in one box, no easy "what's optional" labelling.
- `[MED]` Trace-view rows collapse by default; users miss errors.
- `[MED]` No tooltip on nodes (description only on click-expand).
- `[MED]` Progress panel cramped — promote to top banner during active run with Cancel button.

### 📦 Product Owner
- `[HIGH]` "Watch the AI think" is a Perplexity-style differentiator users can't see.
- `[HIGH]` Enrichment is a differentiator users can't tweak — that limits its perceived value.
- `[MED]` No A/B between enrichment configurations.
- `[MED]` No re-run-with-different-LLM affordance.
- `[MED]` No filter/search on runs (date range + status).
- `[MED]` No metrics — average duration, success rate per node.
- `[MED]` No telemetry surfacing "enrichment X improved engagement by Y%".
- `[LOW]` No bulk re-run UI ("re-enrich N topics").

### 💼 Stakeholder
- `[HIGH]` Silent enrichment ≈ user mistrust; visible enrichment ≈ premium perception.
- `[HIGH]` Cost surprises on token bills if users can't see what's running.
- `[MED]` Looks great in a screenshot, less great in a real demo (no actions to perform).

## Fixes

### Phase 1 — Quick wins (≤2 wk)
- [ ] **[HIGH]** [`features/generation/nodeProgressLabels.ts`](../frontend/src/features/generation/nodeProgressLabels.ts) — extend coverage to every node; `pendingLabel`, `activeLabel`, `doneLabel` unified.
- [ ] **[HIGH]** Editor `Generate` panel — embed the existing `EnrichmentProgressPanel` for non-admins; show "Step N of M: <activeLabel>" with a duration bar.
- [ ] **[HIGH]** When a node fails, surface a non-blocking warning toast: "Audience analysis failed; using fallback. Re-run? (~3s)".
- [ ] **[MED]** [`features/variant/components/VariantCarousel.tsx`](../frontend/src/features/variant/components/VariantCarousel.tsx) — bump variant rationale into a styled card (icon + 2 lines) instead of italic muted.
- [ ] **[MED]** [`EnrichmentFlowPage.tsx`](../frontend/src/pages/EnrichmentFlowPage.tsx) — show last 3 runs expanded for active topic; add tooltips on every node.

### Phase 2 — Structural (3-6 wk)
- [ ] **[HIGH]** Make the DAG view in [`EnrichmentFlowPage.tsx`](../frontend/src/pages/EnrichmentFlowPage.tsx) available to standard users **for their own runs** (not whole-app log). Read-only.
- [ ] **[HIGH]** Re-run controls: "Re-run from <node>" button; backend exposes a partial-replay endpoint.
- [ ] **[HIGH]** Inline "Edit prompt" action on each node — deep-link to that step's settings (joins with [`09-settings-connections.md`](09-settings-connections.md) Phase 2 URL routing).
- [ ] **[MED]** Persist `generationProgress` into a worker store so reload doesn't lose mid-run state.
- [ ] **[MED]** Promote progress panel to a top banner during active run with a Cancel button.
- [ ] **[MED]** Add date range + status filter on run history.

### Phase 3 — Strategic (6-12 wk)
- [ ] **[HIGH]** Per-topic generation analytics: which enrichment combos correlate with engagement.
- [ ] **[HIGH]** Cost dashboard: tokens-per-run, projected monthly burn.
- [ ] **[MED]** User-defined enrichment recipes ("My Hot-take recipe": include opposing-view + counterargument nodes; skip persona-mapping).
- [ ] **[MED]** Smart enrichment: skip nodes when input data is unchanged (cache hit).
- [ ] **[LOW]** Bulk re-enrich N topics action.

## Done when

- Non-admin users see node-level progress for their own generation.
- Failed nodes surface a clear warning with a re-run option.
- DAG/trace shows estimated time remaining.
- Variant rationale is unmistakable on screen.
- A standard user can re-run a single enrichment node without admin help.
