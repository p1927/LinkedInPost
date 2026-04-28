<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# frontend/src/features/editor

## Purpose
Rich text post editor. Provides the core text editing surface for LinkedIn post drafts.

## Key Files

| File | Description |
|------|-------------|
| `DraftEditor.tsx` | Main draft editor component — text area with formatting controls |

## For AI Agents

### Working In This Directory
- Editor state changes should not cause re-renders of parent page components
- Undo/redo uses `useTextUndoRedo` from `src/hooks/`

<!-- MANUAL: -->
