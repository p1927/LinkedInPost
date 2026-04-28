<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# frontend/src/lib

## Purpose
Pure utility libraries and shared constants used throughout the frontend.

## Key Files

| File | Description |
|------|-------------|
| `motion.ts` | Framer Motion animation variants and spring configs used across all animated components |
| `cn.ts` | `cn()` helper — merges Tailwind class strings with `clsx` + `tailwind-merge` |
| `relativeTime.ts` | Formats dates as relative strings ("2h ago", "3d ago") |
| `utils.ts` | General-purpose utility functions |
| `topicDisplay.ts` | Topic name formatting and display helpers |
| `topicEffectivePrefs.ts` | Computes effective topic preferences from user settings |
| `postLoginRedirect.ts` | Handles post-login redirect URL management |
| `workspaceDocumentTitle.ts` | Sets `document.title` based on workspace context |
| `appBuildLabel.ts` | Build label/version string for display |

## For AI Agents

### Working In This Directory
- Import `cn()` from `@/lib/cn` for all conditional Tailwind class merging
- Import animation variants from `@/lib/motion` — do not define local variants for common patterns (fade, slide, container/item)
- `motion.ts` exports: `containerVariants`, `cardItemVariants`, `fadeUpVariants`, `skeletonPulseVariants`, `spring`

<!-- MANUAL: -->
