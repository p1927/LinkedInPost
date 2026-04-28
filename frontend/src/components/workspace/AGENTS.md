<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# frontend/src/components/workspace

## Purpose
App shell components — the main navigation sidebar, workspace layout wrapper, and header. These form the persistent chrome around all page content.

## Key Files

| File | Description |
|------|-------------|
| `AppSidebar.tsx` | Main left navigation sidebar — links to all features, workspace switcher, user menu |
| `WorkspaceShell.tsx` | Root layout wrapper that renders sidebar + header + page content slot |
| `WorkspaceHeader.tsx` | Top header bar with breadcrumbs and global actions |
| `WorkspaceChromeContext.tsx` | React context for communicating between header/sidebar and page content |

## For AI Agents

### Working In This Directory
- `AppSidebar.tsx` is global navigation — changes here affect every page; test all major routes after editing
- `WorkspaceShell.tsx` controls the overall flex layout; modifying it can break page height/scroll behavior
- Use `WorkspaceChromeContext` to inject page-specific actions into the header from a page component

<!-- MANUAL: -->
