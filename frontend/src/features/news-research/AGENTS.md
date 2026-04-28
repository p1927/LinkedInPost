<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# frontend/src/features/news-research

## Purpose
News research settings and research panel UI. Lets users configure news API providers and browse research results for a topic.

## Key Files

| File | Description |
|------|-------------|
| `ResearcherPanel.tsx` | Main research results panel — displays articles from configured providers |
| `NewsResearchSettingsSection.tsx` | Settings section for configuring news API keys and providers |
| `index.ts` | Barrel export |

## For AI Agents

### Working In This Directory
- News provider API keys are set in Settings and stored as worker secrets — this UI only manages the config, not the keys directly
- `ResearcherPanel` uses the same `NewsArticle` type from `features/trending/types.ts`

<!-- MANUAL: -->
