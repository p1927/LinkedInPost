<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# frontend/src/features/campaign

## Purpose
Campaign management — the main post list view, newsletter configuration, draft workflows, and post scheduling. Users view and manage their content pipeline from here.

## Key Files

| File | Description |
|------|-------------|
| `CampaignPage.tsx` | Root campaign page — post list, filters, actions |
| `index.ts` | Barrel export |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `components/` | Campaign-specific UI components |
| `components/newsletter/` | Newsletter configuration drawer and settings |
| `views/` | Sub-views rendered within the campaign page |
| `prompt/` | AI prompt configuration for campaign generation |
| `schema/` | Zod validation schemas for campaign data |
| `validate/` | Validation logic |

## Key Components

| File | Description |
|------|-------------|
| `components/CampaignCarousel.tsx` | Post carousel/list display |
| `components/newsletter/NewsletterConfigDrawer.tsx` | Newsletter settings drawer |
| `views/CampaignPostList.tsx` | Post list view with status filtering |

## For AI Agents

### Working In This Directory
- `CampaignPage.tsx` receives `rows` (SheetRow[]) from the parent — all post data comes from Google Sheets via `services/sheets.ts`
- Status filtering uses `row.status` field from `SheetRow`
- Newsletter config is a separate drawer; its state does not affect the main post list

<!-- MANUAL: -->
