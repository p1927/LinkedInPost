# Enrichment

A read-only DAG visualisation of enrichment runs. Beautiful idea, but no editing, run history is collapsed, and the live progress panel is small.

## Role Cons

- **UX:** Visualization is read-only — no inline "Edit prompt"; run history collapsed by default; no filter/search; progress panel cramped.
- **PO:** Enrichment is a differentiator users can't tweak — that limits its perceived value.
- **Stakeholder:** Looks great in a screenshot, less great in a real demo (no actions to perform).
- **User:** I can see what ran but I can't change anything from here, and finding old runs requires expanding every topic group.

## Files of Record

- [`frontend/src/pages/EnrichmentFlowPage.tsx`](../../frontend/src/pages/EnrichmentFlowPage.tsx)
- `EnrichmentProgressPanel` (referenced from same dir)

## Concrete Issues

1. **[HIGH]** Read-only DAG — add an inline "Edit prompt" action on each node (deep-link to that step's settings).
2. **[HIGH]** Run history collapsed by default — show last 3 runs expanded for the active topic.
3. **[MED]** No filter/search on runs — add date range + status filter.
4. **[MED]** Progress panel too small — promote to a top banner during active run, with a Cancel button.
5. **[MED]** No metrics — add average duration and success rate per node.
6. **[LOW]** No bulk re-run UI — add a "re-enrich N topics" action.

## Linked Phase

- Touched in **Phase 4** (Stage 4.2 deep-link from enrichment node → settings route).
- Picked up in **Phase 6** (consistency primitives).
