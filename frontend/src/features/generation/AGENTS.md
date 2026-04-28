<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# frontend/src/features/generation

## Purpose
Post generation UI — triggers AI generation pipelines, shows progress, and lets users pick from workflow cards.

## Key Files

| File | Description |
|------|-------------|
| `GenerationPanel.tsx` | Main generation panel — inputs, model selection, generate button |
| `EnrichmentProgressPanel.tsx` | Real-time progress display during AI enrichment/generation |
| `WorkflowCardPicker.tsx` | Card-based UI to select a built-in generation workflow |
| `builtInWorkflowCards.ts` | Static definitions of built-in workflow card options |
| `nodeProgressLabels.ts` | Human-readable labels for generation pipeline node states |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `__tests__/` | Unit tests for generation components |

## For AI Agents

### Working In This Directory
- Generation is async — progress is polled or streamed; `EnrichmentProgressPanel` handles the loading UX
- `WorkflowCardPicker` reads from `builtInWorkflowCards.ts` — add new workflow types there
- Do not block the UI thread during generation; all API calls must be async

<!-- MANUAL: -->
