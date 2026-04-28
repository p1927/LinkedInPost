<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# worker/src/integrations

## Purpose
Third-party API client integrations for social and messaging platforms. Each subdirectory handles one platform's authentication, API calls, and data normalization.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `linkedin/` | LinkedIn OAuth and post publishing API client |
| `instagram/` | Instagram Graph API client |
| `gmail/` | Gmail API client for newsletter delivery |
| `telegram/` | Telegram Bot API client |
| `whatsapp/` | WhatsApp Business API client |
| `_shared/` | Shared auth utilities and HTTP helpers used across integrations |

## Key Files

| File | Description |
|------|-------------|
| `media.ts` | Cross-platform media upload and attachment utilities |

## For AI Agents

### Working In This Directory
- Each integration handles its own OAuth token refresh — check `_shared/` for the common refresh pattern
- Never log OAuth tokens or API keys
- Rate limit errors should be caught and returned as retryable errors, not 500s
- LinkedIn publishing is the primary integration; test it thoroughly after any changes to `linkedin/`

<!-- MANUAL: -->
