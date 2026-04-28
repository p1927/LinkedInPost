<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# LinkedInPost

## Purpose
A full-stack content creation and publishing platform for LinkedIn posts. Users browse curated news feeds, clip articles, generate AI-powered post drafts, schedule publishing, and track performance. The system has a React/Vite frontend, a Cloudflare Worker backend, a separate generation worker, and a Python setup wizard.

## Key Files

| File | Description |
|------|-------------|
| `package.json` | Root workspace — orchestrates frontend, worker, and generation-worker |
| `setup.py` | Python CLI setup wizard entry point; runs tsc --noEmit dry-run build after every invocation |
| `start.sh` | Convenience script to start frontend dev server and worker together |
| `wrangler.jsonc` | Cloudflare Worker deployment configuration |
| `.env.example` | Template for all required environment variables |
| `features.yaml` | Feature flags configuration |
| `SETUP.md` | Developer onboarding guide |
| `README.md` | Project overview and architecture summary |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `frontend/` | React 18 + Vite + Tailwind frontend application (see `frontend/AGENTS.md`) |
| `worker/` | Cloudflare Worker backend — API routes, AI generation, persistence (see `worker/AGENTS.md`) |
| `generation-worker/` | Separate Cloudflare Worker for heavy AI content generation (see `generation-worker/AGENTS.md`) |
| `packages/` | Shared TypeScript packages: llm-core, researcher (see `packages/AGENTS.md`) |
| `setup/` | Python setup wizard for first-run configuration (see `setup/AGENTS.md`) |
| `docs/` | Architecture plans, feature specs, design documents |
| `scripts/` | Build and deployment helper scripts |
| `automations/` | Automation workflows (social, scheduling) |

## For AI Agents

### Working In This Directory
- This is a pnpm/npm workspace; run `npm install` at root to install all packages
- Frontend lives in `frontend/`, backend in `worker/`, shared code in `packages/`
- Always run `tsc --noEmit` in **both** `frontend/` and `worker/` before committing or pushing
- Never use git worktrees; work directly on `main` branch
- Never skip the pre-push protocol: pull → compile check → fix → push

### Testing Requirements
- Frontend: `cd frontend && npm run test`
- E2E: `cd frontend && npx playwright test`
- Worker: `cd worker && npm run test` (if applicable)
- Always run compile checks before merging

### Common Patterns
- Environment variables are loaded via `.env` (copy from `.env.example`)
- Cloudflare KV and D1 are the persistence layers in the worker
- AI generation uses Anthropic Claude models via the `packages/llm-core` abstraction

## Dependencies

### External
- React 18 — UI framework
- Vite — frontend build tool
- Tailwind CSS — utility-first styling
- Framer Motion — animations
- Cloudflare Workers — serverless backend runtime
- Anthropic Claude — AI content generation
- Google Sheets API — post tracking/CMS layer

<!-- MANUAL: -->
