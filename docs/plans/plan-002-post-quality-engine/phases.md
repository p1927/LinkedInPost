# Implementation Phases

## Part 1: Post Types (7 Workflow Definitions)

Map the playbook's 7 post types onto the existing workflow system. Each is a `WorkflowDefinition` with `extendsWorkflowId: 'base'` and a `generationInstruction` embedding the structural arc.

| Post Type | Workflow ID | Arc Pattern |
|-----------|------------|-------------|
| Informational / News | `informational-news` | HOOK→CONTEXT→YOUR TAKE→IMPLICATION→CTA |
| Week in Review | `week-in-review` | HOOK→HIGHLIGHTS→PATTERN→LESSON→NEXT WEEK |
| Personal Story | `personal-story` | HOOK→CONTEXT→TURN→STRUGGLE→INSIGHT→UNIVERSAL→CTA |
| Event Insight | `event-insight` | HOOK→EVENT→KEY INSIGHT→BROADER MEANING→CTA |
| Industry Trend & Commentary | `trend-commentary` | HOOK→EVIDENCE→SHIFT→WHY NOW→IMPLICATION→CTA |
| Satirical / Sarcastic | `satirical` | HOOK→ABSURD PREMISE→ESCALATION→PUNCHLINE→REAL POINT |
| Appreciation & Recognition | `appreciation` | HOOK→WHO→MOMENT→WHY IT MATTERS→BROADER POINT→CTA |

## Part 2: Dimension Weights

- Added `DimensionWeights` type and `dimensionValueToImportance()` to `worker/src/engine/types.ts`
- `WorkflowRunner` applies overrides via `applyDimensionWeights()` before building the brief
- `DIMENSION_NODE_MAP` defines which nodes each dimension controls
- `effectiveWorkflowId = input.postType ?? input.workflowId` for backward compatibility

## Part 3: Generation Mode

- `buildEnhancementPrompt()` added to `prompts.ts` for Author Voice surgical pass
- `gap-scorer.ts` runs parallel LLM calls per active dimension, returns `GapReport`
- `sourceType` field on `WorkflowInput` drives auto-detection

## Part 4: Variant Comparison UI

- `draft-generator` node schema extended with `variant_rationale` field
- `VariantCarousel` shows indigo (postType), amber (hookType), emerald (arcType) badges
- `variant_rationale` shown as italic text below each variant card

## Part 5: UI Controls

- `GenerationPanel` gets Post Type `<select>` dropdown (8 options incl. "Auto-detect")
- "Advanced Controls" `<Collapsible>` with 7 `<input type="range">` sliders
- Each slider shows level label: Off / Light / Moderate / Strong / Max
- Props: `postType?`, `onPostTypeChange?`, `dimensionWeights?`, `onDimensionWeightsChange?` (uncontrolled fallback)
