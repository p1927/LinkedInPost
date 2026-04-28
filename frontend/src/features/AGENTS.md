<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# frontend/src/features

## Purpose
Feature modules — each directory is a self-contained vertical slice with its own page components, sub-components, hooks, types, and utilities. The main page component is exported from the feature root.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `feed/` | News feed browsing, article clipping, clips dock, curated sidebar |
| `campaign/` | Campaign management — post list, newsletter config, draft workflows |
| `trending/` | Trending topic discovery — search, graphs, YouTube/Instagram/LinkedIn panels |
| `review-editor/` | AI-powered post review and editing interface |
| `editor/` | Rich text post editor |
| `review/` | Post review queue and approval flows |
| `scheduling/` | Post scheduling calendar and queue |
| `content-schedule-calendar/` | Calendar view for scheduled content |
| `generation/` | Post generation trigger and configuration UI |
| `ai-draft/` | AI draft creation and management |
| `onboarding/` | First-run onboarding wizard |
| `setup-wizard/` | Setup wizard screens (mirrors Python setup flow) |
| `add-topic/` | Add/manage interest topics UI |
| `news-research/` | News research and search interface |
| `compare/` | Post variant comparison view |
| `variant/` | Post variant management |
| `automations/` | Automation rule UI |
| `rules/` | Content rules configuration |
| `content-review/` | Content review pipeline |
| `content-flow/` | Content flow management |
| `draft-selection-target/` | Draft selection and targeting |
| `topic-navigation/` | Topic navigation sidebar |
| `persistence/` | Frontend persistence utilities |
| `scheduled-publish/` | Scheduled publishing UI |
| `who-am-i/` | User profile and persona setup |
| `workflows/` | Workflow automation UI |
| `saas/` | SaaS-tier feature gates and billing UI |

## For AI Agents

### Working In This Directory
- Each feature is fully self-contained — prefer adding code inside the relevant feature directory
- Cross-feature shared code goes in `src/components/` or `src/hooks/`, not here
- The `feed/` feature is the highest-traffic area (hot path per project memory)
- The `review-editor/` feature is the second most-edited area

### Common Patterns
- Feature entry point: `<FeatureName>Page.tsx` or `index.tsx`
- Feature-local components: `components/` subdirectory
- Feature-local hooks: `hooks/` subdirectory
- Feature-local types: `types.ts`

<!-- MANUAL: -->
