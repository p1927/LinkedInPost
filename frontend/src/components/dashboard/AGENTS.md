<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# frontend/src/components/dashboard

## Purpose
Dashboard-specific components — the main content hub showing the post queue, topic management, settings, and delivery views. The dashboard is the primary landing page after login.

## Key Files

| File | Description |
|------|-------------|
| `index.tsx` | Dashboard root component |
| `types.ts` | Dashboard-specific TypeScript types |
| `constants.ts` | Dashboard constants (tab IDs, defaults) |
| `utils.ts` | Dashboard utility functions |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `components/` | Dashboard sub-components (settings drawer, toolbar, topic panels) |
| `tabs/` | Tab content components (queue, delivery) |
| `hooks/` | Dashboard-specific hooks |

## components/

| File | Description |
|------|-------------|
| `DashboardSettingsDrawer.tsx` | Settings panel drawer — connections, preferences |
| `DashboardSettingsDrawer.types.ts` | Types for the settings drawer |
| `DashboardToolbar.tsx` | Top toolbar with actions and filters |
| `SettingsConnectionsCard.tsx` | Connected services card (Google Sheets, LinkedIn, etc.) |
| `TopicDetailPanel.tsx` | Slide-in panel showing topic details and post history |
| `TopicPostPreviewCard.tsx` | Post preview card in the topic detail view |
| `TopicsRightRail.tsx` | Right rail showing topic list and stats |

## tabs/

| File | Description |
|------|-------------|
| `DashboardQueue.tsx` | Main post queue tab — pending, draft, approved posts |
| `DashboardDelivery.tsx` | Delivery/published posts tab |

## For AI Agents

### Working In This Directory
- The dashboard is the most-visited page; changes here have wide user impact
- `DashboardSettingsDrawer.tsx` handles connections to external services — test OAuth flows after changes
- `DashboardQueue.tsx` drives the core post management workflow

<!-- MANUAL: -->
