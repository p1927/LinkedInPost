# LinkedIn-Post

A multi-channel content pipeline. Approved users sign in to a React dashboard, manage topics in a shared Google Sheet, generate AI drafts, review and edit variants, and publish to LinkedIn, Instagram, Gmail, WhatsApp, Telegram, or YouTube — without ever touching Google APIs or channel tokens in the browser.

## Architecture at a glance

- **Frontend** — Vite + React 19 SPA (`frontend/`). Single API client; routes covered in [`frontend/README.md`](frontend/README.md).
- **Main worker** — Cloudflare Worker `linkedin-bot-api` (`worker/`). One `POST /action` dispatcher (~100 cases), Google OAuth verification, OAuth popup callbacks, scheduled-publish Durable Object, D1 + KV.
- **Generation worker** — separate Cloudflare Worker `linkedin-generation-worker` (`generation-worker/`). Pattern-based pipeline → optional news research → enrichment → review → image picking, with its own D1 (`GEN_DB`).
- **Shared packages** — `packages/llm-core` (LLM provider types) and `packages/researcher` (RSS/NewsAPI/SerpAPI aggregator).
- **Storage** — D1 SQLite for pipeline + generation state; Google Cloud Storage for generated images; Google Sheets as the human-editable source of truth for topics.
- **LLMs** — Gemini, Grok, OpenRouter, Minimax (gated by `FEATURE_MULTI_PROVIDER_LLM`).

For the full picture and a system diagram see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## What the dashboard does

Once signed in (`/topics`), an approved user can:

- **Capture topics** — scratchpad form with audience/tone/CTA, generate Pro/Con insight bullets.
- **Generate drafts** — SSE-streamed pipeline produces 4 variants with image candidates and a review checklist.
- **Refine in the editor** — 3-panel editor with Quick Change, manual edits, undo/redo, image manager, and live channel preview.
- **Discover & enrich** — feed of news articles + clips with `findDraftConnections`, `findDebateArticle`, `crossDomainInsight`, and `opinionLeaderInsights` for richer angles. Trending panels for YouTube / LinkedIn / Instagram.
- **Publish** — direct to any connected channel, or schedule for a future time (handled by a Durable Object alarm).
- **Configure** — connect channels via popup OAuth at `/connections`, edit generation rules and post templates, manage tenants/budgets in admin mode (SaaS deployments).

User journeys with their API mappings are documented in [`USE-CASES.md`](USE-CASES.md).

## Setup

Use [`SETUP.md`](SETUP.md) for the full deployment checklist. The fastest self-host path:

```bash
pip install -r requirements.txt
python setup.py --web        # browser wizard at http://localhost:4242
```

Or the headless path:

```bash
python setup.py --all        # provisions D1 + KV, deploys both workers, syncs secrets
```

Both workers (`worker/` and `generation-worker/`) are deployed via Wrangler. The frontend can be served either by the main worker (root `wrangler.jsonc` has `assets.directory: "frontend"`) or by GitHub Pages (`.github/workflows/deploy-pages.yml`).

## Local dev

```bash
# Worker (port 8787)
cd worker && npm run dev

# Frontend (port 5174 — also boots STT server + setup wizard)
cd frontend && npm run dev
```

Set `VITE_WORKER_URL=http://localhost:8787` and `VITE_GOOGLE_CLIENT_ID=...` in `frontend/.env.local`. See [`frontend/README.md`](frontend/README.md) and [`worker/README.md`](worker/README.md).

## Feature flags

`features.yaml` is the source of truth. Run `python3 scripts/generate_features.py` after editing to regenerate the per-workspace TypeScript modules. Current flags: `deploymentMode` (`saas` | `selfHosted`), `newsResearch`, `campaign`, `multiProviderLlm`, `contentReview`, `contentFlow`, `enrichment`.

## Documentation map

| File | Purpose |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Canonical architecture + system diagram |
| [`SETUP.md`](SETUP.md) | Deployment checklist |
| [`USE-CASES.md`](USE-CASES.md) | Wired user journeys with API mappings |
| [`frontend/README.md`](frontend/README.md) | Frontend dev notes |
| [`worker/README.md`](worker/README.md) | Main worker deployment + behaviour |
| [`docs/plans/`](docs/plans/) | Active and historical implementation plans |
| [`docs/superpowers/`](docs/superpowers/) | Exploratory plans and paired specs |
