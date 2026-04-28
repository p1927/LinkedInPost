<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# generation-worker/src

## Purpose
Source code for the dedicated AI generation Cloudflare Worker. Handles long-running generation pipelines offloaded from the main worker, including multi-step enrichment, persona-based drafting, and knowledge module injection.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Worker entry point — registers generation pipeline routes |
| `pipeline.ts` | Top-level pipeline orchestration |
| `types.ts` | Generation worker TypeScript types |
| `llmFromWorker.ts` | LLM client configured for the generation worker context |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `pipeline/` | Pipeline step implementations |
| `modules/` | Knowledge modules loaded into generation prompts (copywriting, storytelling, psychology, etc.) |
| `players/` | Generation "players" — specialized prompt actors for different content styles |
| `image-gen/` | AI image generation integration |

## For AI Agents

### Working In This Directory
- `modules/` contains the knowledge that drives content quality — editing these files directly improves output
- `pipeline/` steps are called sequentially; each step receives and returns the accumulated generation context
- This worker has a longer CPU time limit than the main worker — generation tasks up to ~30s are acceptable

<!-- MANUAL: -->
