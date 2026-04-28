<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# worker

## Purpose
Cloudflare Worker backend that handles all server-side logic: authentication, API routing, AI content generation, news feed aggregation, persistence (D1 SQLite + KV), scheduling, and third-party integrations (Google Sheets, LinkedIn, etc.).

## Key Files

| File | Description |
|------|-------------|
| `package.json` | Worker dependencies and scripts |
| `wrangler.jsonc` | Cloudflare Worker deployment config — bindings, routes, D1/KV namespaces |
| `tsconfig.json` | TypeScript config for worker source |
| `vitest.config.ts` | Unit test configuration |
| `src/index.ts` | Worker entry point — registers all routes and middleware |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `src/` | All worker source code (see `worker/src/AGENTS.md`) |
| `migrations/` | D1 SQLite schema migrations (numbered SQL files) |

## For AI Agents

### Working In This Directory
- Run `npx wrangler dev` to start the local worker dev server
- Run `npx tsc --noEmit` to compile-check before committing
- D1 migrations in `migrations/` must be applied with `wrangler d1 migrations apply`
- Secrets/env vars are configured in `wrangler.jsonc` and `.env`

### Testing Requirements
- `npm run test` — runs Vitest unit tests
- Always compile-check: `npx tsc --noEmit`

### Common Patterns
- Routes are registered in `src/index.ts` using a lightweight router
- Each feature has its own subdirectory under `src/` with handlers and DB queries
- D1 is the primary relational store; KV is used for caching and sessions
- Auth uses Firebase ID tokens verified server-side in `src/auth.ts`

## Dependencies

### Internal
- `packages/llm-core` — LLM provider abstraction
- `packages/researcher` — news/content research providers

### External
- Cloudflare Workers runtime
- Cloudflare D1 (SQLite) — relational persistence
- Cloudflare KV — key-value caching
- Anthropic Claude — AI generation
- Google APIs — Sheets integration

<!-- MANUAL: -->
