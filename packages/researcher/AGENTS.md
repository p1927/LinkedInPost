<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# packages/researcher

## Purpose
Shared TypeScript package providing a unified content research interface over multiple sources: Google Trends, Hacker News, RSS feeds, Reddit, and various News APIs (NewsAPI, GNews, NewsData, SerpAPI).

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Package entry point — exports the unified `search()` interface |
| `config.ts` | Provider configuration and API key management |
| `env.ts` | Environment variable bindings for API keys |
| `search.ts` | Unified search orchestration across providers |
| `dedupe.ts` | Result deduplication across sources |
| `trim.ts` | Content trimming and normalization utilities |
| `types.ts` | Shared TypeScript types for research results |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `providers/` | Individual provider implementations (Google Trends, HN, RSS, Reddit, news APIs) |

## For AI Agents

### Working In This Directory
- Adding a new provider: create a file in `providers/`, implement the standard interface from `types.ts`, and register it in `config.ts`
- All providers return the same `ResearchResult` type — keep this contract stable
- API keys come through `env.ts` bindings — add new keys there and in `wrangler.jsonc`

<!-- MANUAL: -->
