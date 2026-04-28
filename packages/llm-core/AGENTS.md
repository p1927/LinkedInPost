<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# packages/llm-core

## Purpose
Shared TypeScript package providing LLM provider configuration, model registry, and type schemas consumed by both `worker` and `generation-worker`.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Package entry point and barrel export |
| `providers.ts` | LLM provider definitions (Anthropic, etc.) |
| `schemas.ts` | Zod/TypeScript schemas for model inputs/outputs |
| `static-models.ts` | Static model registry with capability metadata |
| `types.ts` | Shared TypeScript types for LLM interactions |

## For AI Agents

### Working In This Directory
- Changes here affect both `worker/` and `generation-worker/` — verify both compile after editing
- This package is a dependency; consumers import from it directly (no build step needed for Workers)
- Adding a new model: add an entry to `static-models.ts` and update `providers.ts` if needed

<!-- MANUAL: -->
