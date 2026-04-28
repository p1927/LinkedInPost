<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# worker/src/persistence

## Purpose
D1 SQLite database query helpers and schema types for the main worker. Provides typed wrappers around raw D1 queries for each domain (drafts, pipeline, etc.).

## Key Files

| File | Description |
|------|-------------|
| `drafts.ts` | Draft post CRUD queries — create, read, update, delete |
| `patterns.ts` | Content pattern persistence helpers |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `pipeline-db/` | Pipeline-specific database query helpers |

## For AI Agents

### Working In This Directory
- All queries use parameterized D1 statements — never interpolate user input into SQL strings
- Schema changes require a new numbered migration in `worker/migrations/`
- Types exported here are the source of truth for DB row shapes — import them rather than redefining

<!-- MANUAL: -->
