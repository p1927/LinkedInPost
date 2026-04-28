<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# worker/src/engine

## Purpose
Core generation engine — orchestrates the AI content generation pipeline. Manages workflow execution, node processing, gap scoring, event handling, and the generation registry.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Engine entry point and orchestration |
| `types.ts` | Engine-wide TypeScript types |
| `gap-scorer.ts` | Scores content gaps to prioritize what to generate next |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `brief/` | Brief/context building for generation prompts |
| `context/` | Context assembly — user profile, topic, clips |
| `events/` | Generation event emission and tracking |
| `executor/` | Node execution — runs individual pipeline steps |
| `importance/` | Content importance scoring |
| `nodes/` | Individual pipeline node definitions |
| `registry/` | Workflow and node type registry |
| `workflows/` | Built-in workflow definitions |

## For AI Agents

### Working In This Directory
- Adding a new generation node: define it in `nodes/`, register it in `registry/`, wire it into a workflow in `workflows/`
- The engine is the hottest backend path (81x edits on `worker/src/index.ts` per project memory reflects heavy route iteration over this engine)
- `executor/` runs nodes sequentially or in parallel depending on the workflow DAG

<!-- MANUAL: -->
