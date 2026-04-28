<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# worker/src/features

## Purpose
Feature-specific backend handlers that don't fit into the main engine/generation/integration domains. Each subdirectory is a self-contained backend feature module.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `content-review/` | Content review pipeline — queuing, scoring, approval flows |
| `custom-workflows/` | User-defined custom generation workflow CRUD and execution |

## For AI Agents

### Working In This Directory
- Each feature module exports route handlers consumed by `src/routes/`
- Keep feature modules self-contained; shared DB helpers go in `src/persistence/`

<!-- MANUAL: -->
