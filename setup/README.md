# LinkedIn Post Setup

## Quick Start

```bash
./start.sh              # Local development (default)
./start.sh production   # Production setup with Cloudflare
```

## Setup Modes

| Mode | Description |
|------|-------------|
| `local` | Install deps, launch wizard UI, launch app |
| `production` | Full Python setup, Cloudflare deployment |

## Standalone Commands

```bash
./start.sh --reset-db      # Clear D1 database (drafts, posts)
./start.sh --clear-cache   # Remove build caches
```

## Wizard UI (port 3456)

**Status Dashboard** shows:
- Environment variables (VITE_*, GOOGLE_*, etc.)
- Integrations (Google, LinkedIn, GitHub, Cloudflare)
- Worker deployment status
- Setup progress %

**Actions**:
- Reset Database - clears drafts/posts from D1
- Clear Cache - removes build caches
- Regenerate Features - rebuilds feature flags

## Environment Variables

Required:
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth
- `VITE_WORKER_URL` - Cloudflare Worker URL
- `GOOGLE_CLIENT_ID` / `GOOGLE_CREDENTIALS_JSON` - Service account

Optional:
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` - LinkedIn OAuth
- `CLOUDFLARE_API_TOKEN` - For production deployment
- `GEMINI_API_KEY` - Content generation

## File Structure

```
setup/
  cli.py          # Argument parsing
  cloudflare.py   # Worker deployment
  worker_config.py # Config generation
  github.py       # GitHub Actions secrets
  google_resources.py # Google Drive/Sheets
```

## Scripts

- `start.sh` - Unified entry point
- `scripts/setup-local.sh` - Wizard launcher
- `scripts/setup-production.sh` - Production setup
