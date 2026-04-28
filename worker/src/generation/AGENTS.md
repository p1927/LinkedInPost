<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# worker/src/generation

## Purpose
Post generation service layer — prompt building, author profile enrichment, rule application, and coordination with the generation worker.

## Key Files

| File | Description |
|------|-------------|
| `service.ts` | Main generation service — coordinates prompts, rules, and LLM calls |
| `prompts.ts` | Prompt templates for post generation |
| `rules.ts` | Content rules applied during generation |
| `normalize.ts` | Normalizes raw LLM output into structured post data |
| `types.ts` | Generation-specific TypeScript types |
| `generationWorkerClient.ts` | HTTP client for calling the `generation-worker` |
| `nodeInsightSummary.ts` | Summarizes node insights for display |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `author-profile/` | Author profile loading and enrichment for prompts |
| `__tests__/` | Unit tests for generation logic |

## For AI Agents

### Working In This Directory
- `service.ts` is the primary entry point called by route handlers
- `prompts.ts` is where prompt quality improvements belong — changing prompts here directly affects output quality
- `generationWorkerClient.ts` calls the separate `generation-worker` for heavy tasks; keep timeouts generous (generation can take 10–30s)
- Author profile context is assembled in `author-profile/` and injected into prompts

<!-- MANUAL: -->
