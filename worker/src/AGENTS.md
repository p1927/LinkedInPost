<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# worker/src

## Purpose
All Cloudflare Worker backend source code. Routes are registered in `index.ts`; each feature domain has its own subdirectory with request handlers, database queries, and business logic.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Worker entry point — registers all route handlers and middleware |
| `auth.ts` | Firebase ID token verification middleware |
| `services.ts` | Shared service instantiation (DB, KV, external clients) |
| `google-model-policy.ts` | Google model usage policies |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `routes/` | HTTP route definitions grouped by domain |
| `features/` | Feature-specific handlers (clips, feed, interest groups, etc.) |
| `engine/` | Core generation engine — orchestrates AI calls |
| `generation/` | Post generation pipelines and prompts |
| `llm/` | LLM client wrappers and prompt utilities |
| `researcher/` | News and content research handlers |
| `persistence/` | D1 database query helpers and schema types |
| `db/` | Low-level database utilities |
| `integrations/` | Third-party API clients (LinkedIn, Google Sheets, etc.) |
| `google/` | Google-specific API utilities |
| `newsletter/` | Newsletter generation feature |
| `modes/` | Generation mode implementations (storytelling, viral, etc.) |
| `automations/` | Automated workflow triggers |
| `scheduled-publish/` | Scheduled post publishing logic |
| `scheduler/` | Cron and scheduling utilities |
| `image-gen/` | AI image generation integration |
| `media/` | Media upload and processing |
| `plugins/` | Worker plugin system |
| `internal/` | Internal utilities not exposed via routes |
| `auth.test.ts` | Auth middleware tests |
| `generated/` | Auto-generated types (do not edit) |

## For AI Agents

### Working In This Directory
- All route handlers receive `(request, env, ctx)` — the standard Cloudflare Worker signature
- Auth is enforced via `src/auth.ts` — extract the verified user from the request context
- Database queries use D1 (SQLite-compatible); helpers live in `persistence/` and `db/`
- Always compile-check: `npx tsc --noEmit` from `worker/`

### Common Patterns
- Route handlers validate input, call a feature service, and return a JSON response
- Feature services are pure functions — no global state
- D1 queries use parameterized statements; never interpolate user input into SQL

<!-- MANUAL: -->
