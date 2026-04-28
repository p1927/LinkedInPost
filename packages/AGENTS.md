<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# packages

## Purpose
Shared TypeScript packages consumed by both the `worker` and `generation-worker`. Contains LLM provider abstractions and content research provider integrations.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `llm-core/` | LLM provider configuration — model registry, schema types, static model definitions |
| `researcher/` | Content research providers — Google Trends, Hacker News, RSS, Reddit, News APIs |

## For AI Agents

### Working In This Directory
- Changes here affect both `worker/` and `generation-worker/` — test in both after modifying
- Each package has its own `tsconfig.json`; compile-check individually
- Packages are referenced via workspace paths in the consuming workers' `package.json`

### Common Patterns
- `llm-core` exports provider configs and model type schemas consumed by workers
- `researcher` exports a unified `search()` interface over multiple content sources

<!-- MANUAL: -->
