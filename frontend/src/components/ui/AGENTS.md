<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# frontend/src/components/ui

## Purpose
Low-level, purely presentational UI primitives. No business logic, no API calls. Used across all features as building blocks.

## Key Files

| File | Description |
|------|-------------|
| `button.tsx` | Button component with size and variant props |
| `input.tsx` | Text input component |
| `textarea.tsx` | Textarea component |
| `select.tsx` | Dropdown select component |
| `dialog.tsx` | Modal dialog primitive |
| `dropdown-menu.tsx` | Dropdown menu with items |
| `popover.tsx` | Popover/tooltip container |
| `badge.tsx` | Status badge chip |
| `carousel.tsx` | Horizontal scroll carousel |
| `collapsible.tsx` | Collapsible expand/collapse section |
| `EmptyState.tsx` | Standardized empty state display |
| `ErrorBanner.tsx` | Inline error message banner |
| `LoadingSkeleton.tsx` | Animated loading skeleton |
| `StatusPill.tsx` | Status indicator pill (draft/approved/published) |
| `CalendarDateChip.tsx` | Date chip for calendar views |
| `ChipToggle.tsx` | Toggle chip button |

## For AI Agents

### Working In This Directory
- All components accept `className` for Tailwind overrides
- Use `cn()` from `@/lib/cn` for conditional class composition
- Components here must be generic — no feature-specific logic
- Prefer editing existing primitives over creating new ones for similar use cases

<!-- MANUAL: -->
