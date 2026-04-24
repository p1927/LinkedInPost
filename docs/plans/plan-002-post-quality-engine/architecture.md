# Architecture: Post Quality Engine

## Three-Layer Model

```
Layer 1: POST TYPE     → Structural skeleton (what sections, in what order)
Layer 2: DIMENSIONS    → How much each node contributes (slider → importance weight)
Layer 3: MODE          → How much to preserve vs. rewrite (author voice vs. synthesis)
```

These three inputs combine into a `GenerationBrief` that drives the final draft.

## Dimension → Node Mapping

| Dimension Slider | Primary Node(s) Affected |
|-----------------|--------------------------|
| Emotions | hook-designer, narrative-arc |
| Psychology | psychology-analyzer |
| Persuasion | hook-designer, narrative-arc |
| Copywriting | tone-calibrator, draft-generator |
| Storytelling | narrative-arc |
| Typography | constraint-validator, tone-calibrator |
| Vocabulary | vocabulary-selector |

Slider value (0–100) maps to importance level:
- 0–10 → `off`
- 11–30 → `background`
- 31–50 → `supporting`
- 51–80 → `important`
- 81–100 → `critical`

Max-wins: dimension overrides never decrease a node's importance below what the workflow already sets. `draft-generator` is guarded from `off`.

## Weight Precedence (most specific wins)

1. Workspace default `settings.dimensionWeights`
2. Topic/campaign override `topic.dimensionWeights`
3. Per-post override `post.dimensionWeights`

## Generation Mode Pipelines

### Mode 1: Author Voice

```
Author note → 8-node pipeline → Base draft
                   ↓
        Gap scorer (parallel LLM per active dimension)
        Each outputs: {score, gaps: string[]}
                   ↓
        Enhancement pass:
        "Preserve author's phrasing. Prefer adding over rewriting. Max 10% word increase."
        Input: base draft + gap report + dimension weights
        Output: enhanced draft + changes_explanation
```

Auto-detected when `sourceType: "author_note"`.

### Mode 2: Creative Synthesis

```
Research articles + author thesis
    ↓
8-node pipeline with full creative latitude
Post type structural pattern in generation brief
    ↓
4 variants, each with different hook formula
```

Auto-detected when `sourceType: "research" | "news"`.

## Key New Files

| File | Purpose |
|------|---------|
| `worker/src/engine/gap-scorer.ts` | Parallel gap scoring per dimension |
| `worker/src/engine/workflows/definitions/informational-news.ts` | Post type workflow |
| `worker/src/engine/workflows/definitions/personal-story.ts` | Post type workflow |
| `worker/src/engine/workflows/definitions/week-in-review.ts` | Post type workflow |
| `worker/src/engine/workflows/definitions/event-insight.ts` | Post type workflow |
| `worker/src/engine/workflows/definitions/trend-commentary.ts` | Post type workflow |
| `worker/src/engine/workflows/definitions/satirical.ts` | Post type workflow |
| `worker/src/engine/workflows/definitions/appreciation.ts` | Post type workflow |

## Key Modified Files

| File | Change |
|------|--------|
| `worker/src/engine/types.ts` | `DimensionWeights`, `DimensionName`, `dimensionValueToImportance()`, `variant_rationale` on `DraftVariant` |
| `worker/src/engine/executor/WorkflowRunner.ts` | `effectiveWorkflowId`, `applyDimensionWeights()`, `DIMENSION_NODE_MAP` |
| `worker/src/engine/nodes/definitions/draft-generator.ts` | `variant_rationale` in output schema |
| `worker/src/generation/prompts.ts` | `buildEnhancementPrompt()` for Author Voice mode |
| `worker/src/generation/types.ts` | `dimensionWeights`, `postType` on `GenerationRequestPayload` |
| `worker/src/engine/workflows/registry-setup.ts` | Registers all 7 new workflows |
| `frontend/src/features/generation/GenerationPanel.tsx` | Post Type dropdown + 7 dimension sliders |
| `frontend/src/features/variant/components/VariantCarousel.tsx` | Metadata badges + `variant_rationale` display |
| `frontend/src/services/backendApi.ts` | New fields on `GenerationRequest` and `VariantPreviewResult` |
| `frontend/src/features/review/context/utils.ts` | New fields on `SheetVariantForReview` |
