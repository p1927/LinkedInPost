<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# frontend/src/hooks

## Purpose
Shared custom React hooks used across multiple features.

## Key Files

| File | Description |
|------|-------------|
| `useGlobalShortcuts.ts` | Registers global keyboard shortcuts (e.g. help overlay toggle) |
| `useMediaQuery.ts` | Reactive media query hook for responsive logic |
| `useTextUndoRedo.ts` | Undo/redo history management for text inputs |

## For AI Agents

### Working In This Directory
- Feature-specific hooks belong in the feature's own `hooks/` directory, not here
- Hooks here must be truly generic and reusable across 2+ features
- `useGlobalShortcuts.ts` attaches `keydown` listeners — be careful about conflicts with browser defaults

<!-- MANUAL: -->
