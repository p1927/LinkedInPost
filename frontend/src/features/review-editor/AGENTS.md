<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# frontend/src/features/review-editor

## Purpose
AI-powered post review and editing interface. The second highest-traffic area in the codebase (32x edits per project memory). Provides a split-pane editor with an AI analysis sidebar, live preview, and version history.

## Key Files

| File | Description |
|------|-------------|
| `components/EditorSidebar.tsx` | Primary AI sidebar — analysis, suggestions, tone controls (highest edit frequency in the project) |
| `components/LivePreviewSidebar.tsx` | Real-time LinkedIn post preview panel |
| `components/VersionHistoryStrip.tsx` | Version history timeline and restore controls |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `components/` | Editor UI components |
| `components/__tests__/` | Unit tests for editor components |
| `screens/` | Full-screen editor layout views |

## For AI Agents

### Working In This Directory
- `EditorSidebar.tsx` is extremely hot — read the full file before making any changes
- State variables from `useReviewFlowState` are NOT in scope inside `useReviewFlowActions` — use the `state` parameter or setter prev-form instead (critical gotcha per project memory)
- This is the most-edited file in the project; be especially careful about regressions

### Testing Requirements
- `components/__tests__/` — run these after any change to editor components
- Compile-check is mandatory before committing changes here

### Common Patterns
- Editor state is split between a state hook and an actions hook
- The actions hook receives state via parameter, not direct closure capture

<!-- MANUAL: -->
