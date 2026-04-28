<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# generation-worker

## Purpose
A dedicated Cloudflare Worker for computationally heavy AI content generation tasks offloaded from the main `worker`. Contains deep knowledge modules for copywriting psychology, storytelling frameworks, viral patterns, persona modeling, and vocabulary — used to produce high-quality LinkedIn post drafts.

## Key Files

| File | Description |
|------|-------------|
| `package.json` | Dependencies and scripts |
| `wrangler.jsonc` | Cloudflare Worker deployment configuration |
| `tsconfig.json` | TypeScript configuration |
| `src/` | Worker source code |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `src/` | Generation worker handlers and knowledge modules |
| `migrations/` | D1 schema migrations specific to this worker |
| `patterns/` | Structured content pattern definitions used during generation |

## For AI Agents

### Working In This Directory
- Run `npx wrangler dev` to start locally
- Run `npx tsc --noEmit` before committing
- Knowledge modules in `patterns/` are ingested at generation time — edit them to change content quality/style
- This worker is called by the main `worker` for long-running generation tasks

### Common Patterns
- Each generation mode (storytelling, viral, persona) is a separate module
- Patterns are plain text/JSON files loaded and injected into prompts
- D1 migrations track generation job state

## Dependencies

### Internal
- `packages/llm-core` — LLM provider and model configuration

### External
- Cloudflare Workers runtime
- Anthropic Claude — primary generation model

<!-- MANUAL: -->
