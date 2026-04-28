---
title: LinkedIn Bot Setup Checklist
description: Step-by-step guide to configure the free GitHub Pages plus Cloudflare Workers deployment for LinkedIn Bot.
ms.date: 2026-03-26
ms.topic: how-to
---

## Overview

This setup keeps the project free while allowing approved Gmail users to work against one shared Google Sheet, one Google Cloud Storage bucket for generated images, and one Google Docs log.

The deployed shape is:

* GitHub Pages **or** the main Cloudflare Worker (root `wrangler.jsonc` has `assets.directory: "frontend"`) hosts the React dashboard
* **Two** Cloudflare Workers run the backend: `linkedin-bot-api` (main API + asset host) and `linkedin-generation-worker` (content pipeline). Each has its own D1 database (`linkedin-pipeline-db` and `linkedin-gen-worker-db`).
* A Google service account gives the main worker access to the shared sheet
* All publishing flows directly through the worker; there is no GitHub-Actions-driven publish path.

The deployment style is controlled by `deploymentMode` in `features.yaml`:

* `saas` — hosted multi-tenant. Public landing + waitlist on `/`, per-user tenant rows in D1, token usage meter, admin tier visible in header.
* `selfHosted` — single-owner. Direct sign-in on `/`, no waitlist or usage meter.

For the architecture diagram and a full route/binding inventory, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Quick Start (Web Wizard)

The fastest way to self-host is the built-in setup wizard:

```bash
pip install -r requirements.txt
python setup.py --web
```

Your browser will open to `http://localhost:4242`. Follow the 6-step wizard:

1. **Prerequisites** — confirms Python, Node, Wrangler, and Git are installed
2. **Google Cloud** — paste your service account key and OAuth Client ID
3. **Cloudflare** — paste your API token; D1 and KV are provisioned automatically
4. **API Keys** — enter Gemini (required) + optional channel credentials
5. **Deploy** — one-click deploy to Cloudflare Workers with live log streaming
6. **Verify** — confirms every integration is live

---

## Manual Setup (alternative)

Install the Python dependencies locally:

```bash
pip install -r requirements.txt
```

## Feature toggles

Optional product modules are controlled by [`features.yaml`](features.yaml) at the repo root (for example `newsResearch: false` to remove news settings, search, and related generation context). Editing that file and running `python3 scripts/generate_features.py` (or any `python setup.py` run) regenerates `frontend/src/generated/features.ts` and `worker/src/generated/features.ts` before you build the dashboard or Worker.

## Step 1: Create the Google resources

Create a Google Cloud project, enable the APIs below, and create a service account:

* Google Sheets API
* Google Drive API
* Google Docs API
* Cloud Storage API

Then run the local bootstrap script:

```bash
python setup.py
```

The script creates the shared `LINKEDIN` folder, content calendar sheet, and published-posts doc. Generated draft images are stored in Google Cloud Storage, not in Google Drive.

Set `GOOGLE_SHARE_EMAIL` first if you want the script to share the parent Drive folder with your Gmail account automatically.

Before you run `python setup.py`, create a bucket for generated images and set `GOOGLE_CLOUD_STORAGE_BUCKET` in your environment.

Grant the service account `roles/storage.objectAdmin` on that bucket so the automation can upload the four generated images and delete the non-selected ones after a successful publish.

If you want direct browser `fetch()` calls against the bucket from custom tooling, add a bucket CORS policy for your frontend origins. Plain `<img>` previews and channel-side fetches do not require bucket CORS.

## Step 2: Create the Google sign-in client

In Google Cloud Console, create an OAuth client for the frontend.

Add these authorized JavaScript origins:

* `http://localhost:5173`
* `https://<your-github-username>.github.io`

Copy the client ID. You will use it both in the frontend and in the Worker configuration.

## Step 3: Bootstrap the Cloudflare Worker backend

The setup script can now handle most of the Worker setup work for you.

`setup.py` is the source of truth for this Cloudflare bootstrap flow. If Cloudflare is wired to GitHub and deploys automatically on push, keep that deployment configuration aligned with `setup.py` so the automated and manual paths stay identical.

If you update this checklist or `setup.py`, update the other file in the same change.

Any Worker-related setup flag now starts by installing the local Worker dependencies from [worker/package.json](worker/package.json) and [generation-worker/package.json](generation-worker/package.json). That includes `wrangler` in each package.

Use this command for the full path:

```bash
python setup.py --all
```

That flow can:

* Reuse or create the `CONFIG_KV` namespaces
* Update [worker/wrangler.jsonc](worker/wrangler.jsonc) with KV IDs and Worker vars
* Write [worker/.dev.vars](worker/.dev.vars) for local Worker development
* Build a temporary JSON secrets file for Wrangler
* Deploy the Worker with those secrets in one step
* Verify that the deployed URL returns the API JSON envelope and a valid CORS preflight response before syncing it elsewhere
* Sync GitHub Actions secrets with `gh secret set`

The same flow also provisions the **generation worker** ([generation-worker/](generation-worker/)): `python setup.py --cloudflare` creates the `linkedin-gen-worker-db` D1 database (when needed) and updates [generation-worker/wrangler.jsonc](generation-worker/wrangler.jsonc). `python setup.py --deploy-worker` **requires at least one LLM key** in the environment — `GEMINI_API_KEY` and/or `XAI_API_KEY` — then deploys `linkedin-generation-worker` first, writes its URL into the main Worker’s `GENERATION_WORKER_URL` var, and sets `GENERATION_WORKER_SECRET` on the main Worker to match the generation worker’s `WORKER_SHARED_SECRET` (both are derived from `.env` / `worker/.dev.vars` or generated on first bootstrap). If neither LLM key is set, deploy fails with a clear error. Optional news keys in `.env` are passed through to the generation worker deploy when present.

The script needs the following tools for the full automation path:

* Node.js, `npm`, and `npx`
* Wrangler authentication
* GitHub CLI authentication if you want repository secrets synced automatically

You can also run the stages separately:

```bash
python setup.py --install-worker-deps
python setup.py --cloudflare
python setup.py --deploy-worker
python setup.py --sync-github-secrets
```

If you prefer the manual path, follow the guide in [worker/README.md](worker/README.md).

At minimum, configure these Worker values:

* `ALLOWED_EMAILS`
* `ADMIN_EMAILS`
* `GOOGLE_CLIENT_ID`
* `GOOGLE_CLOUD_STORAGE_BUCKET`
* `DELETE_UNUSED_GENERATED_IMAGES`
* `GOOGLE_SERVICE_ACCOUNT_JSON`
* `SECRET_ENCRYPTION_KEY`
* `CORS_ALLOWED_ORIGINS`
* `POSTED_LOG_DOC_ID` *(optional — Google Doc ID for the human-readable publish-history log; service account needs edit access)*

To enable the new admin connect buttons for shared Instagram, LinkedIn, WhatsApp, and Gmail delivery, also configure these Worker values:

* `INSTAGRAM_APP_ID`
* `INSTAGRAM_APP_SECRET`
* `LINKEDIN_CLIENT_ID`
* `LINKEDIN_CLIENT_SECRET`
* `META_APP_ID`
* `META_APP_SECRET`
* `GMAIL_CLIENT_ID` (often the same Web client ID as `VITE_GOOGLE_CLIENT_ID`; `setup.py` reuses it when `GMAIL_CLIENT_ID` is unset)
* `GMAIL_CLIENT_SECRET` (Web client secret; stored as a Worker secret, not in the frontend)

Telegram delivery does not need an OAuth app. After the Worker is deployed, an admin can open the dashboard settings, paste a Telegram bot token, and save the destination chat IDs there.

The setup script writes the non-secret Worker vars into [worker/wrangler.jsonc](worker/wrangler.jsonc) and passes the secret values to Wrangler during deployment with a temporary JSON `--secrets-file`.

Register these callback URLs in the provider dashboards so the Worker can complete the popup flow:

* Gmail (Google Cloud Console → APIs & Services → Credentials → your OAuth Web client → Authorized redirect URIs): `https://<your-worker-domain>/auth/gmail/callback` (and for `wrangler dev`, add `http://127.0.0.1:8787/auth/gmail/callback` or `http://localhost:8787/auth/gmail/callback`). Enable the Gmail API and add OAuth scopes `https://www.googleapis.com/auth/gmail.send` and `email` on the consent screen.
* LinkedIn redirect URI: `https://<your-worker-domain>/auth/linkedin/callback`
* Meta redirect URI: `https://<your-worker-domain>/auth/whatsapp/callback`
* Instagram redirect URI: `https://<your-worker-domain>/auth/instagram/callback`

Instagram publishing currently supports approved image posts only. The Worker uses the approved text as the caption and rejects text-only rows for this channel.

Deploy the Worker and copy the generated URL.

If a `workers.dev` URL returns HTML, especially a page containing `src/main.tsx`, that hostname is serving a static frontend deployment and not the API Worker. Do not use that URL for `VITE_WORKER_URL`.

## Step 4: Configure the frontend build

Set these frontend variables for your GitHub Pages build:

| Variable | Purpose |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Google sign-in client ID |
| `VITE_WORKER_URL` | Cloudflare Worker URL |

Do not expose GitHub tokens, service-account JSON, or owner-only configuration in the frontend.

If you run `python setup.py --all` and `gh` is authenticated, the script will try to write these repository secrets automatically (only `VITE_GOOGLE_CLIENT_ID` and `VITE_WORKER_URL` are needed for the GitHub Pages build).

## Step 5: (Optional) Configure news-research providers

The generation worker's news-research aggregator (`packages/researcher`) supports RSS, NewsAPI, NewsData, Google News, and SerpAPI. None are required — the LLM providers (Gemini / Grok / OpenRouter / Minimax) cover most research needs without external web search.

If you want richer news context during generation, set any of `NEWSAPI_KEY`, `GNEWS_API_KEY`, `NEWSDATA_API_KEY`, `SERPAPI_API_KEY`, or `RESEARCHER_RSS_FEEDS` in your `.env`. `python setup.py --deploy-worker` passes through whichever ones are present to the generation worker.

## Step 6: Deploy the frontend

Enable GitHub Pages with GitHub Actions as the source.
Set the `VITE_GOOGLE_CLIENT_ID` and `VITE_WORKER_URL` repository secrets used by [deploy-pages.yml](.github/workflows/deploy-pages.yml).

## User flow after migration

1. An allowed user opens the GitHub Pages site.
2. The user signs in with Google.
3. The frontend sends the Google ID token to the Worker.
4. The Worker verifies the token, checks the allowlist, and uses the service account for sheet access.
5. The user works with the shared content pipeline without needing their own Google API setup.

## Verification checklist

* The Worker deployment responds at its production URL
* The Worker production URL returns JSON from `GET /`, not HTML
* `ALLOWED_EMAILS` contains every approved Gmail user
* The frontend build includes `VITE_GOOGLE_CLIENT_ID`
* The frontend build includes `VITE_WORKER_URL`
* An allowed user can sign in and load the shared sheet rows
* A non-allowed user is rejected by the Worker
* Draft and publish dispatches succeed without exposing GitHub secrets in the browser

## Suggested environment variables for setup.py

Set these before running the broader bootstrap flow:

```bash
export GOOGLE_CREDENTIALS_JSON='...'
export GOOGLE_SHARE_EMAIL='you@gmail.com'
export GOOGLE_CLOUD_STORAGE_BUCKET='your-generated-images-bucket'
export VITE_GOOGLE_CLIENT_ID='your-client-id.apps.googleusercontent.com'
export ALLOWED_EMAILS='you@gmail.com teammate@gmail.com'
export ADMIN_EMAILS='you@gmail.com'
export GITHUB_PAGES_ORIGIN='https://your-username.github.io'
export INSTAGRAM_APP_ID='your-instagram-app-id'
export INSTAGRAM_APP_SECRET='your-instagram-app-secret'
export LINKEDIN_CLIENT_ID='your-linkedin-client-id'
export LINKEDIN_CLIENT_SECRET='your-linkedin-client-secret'
export META_APP_ID='your-meta-app-id'
export META_APP_SECRET='your-meta-app-secret'
```

Optional research and image-cleanup settings — pass any of these through `.env` when you want them on the worker side:

```bash
export GEMINI_API_KEY='...'
export XAI_API_KEY='...'
export OPENROUTER_API_KEY='...'
export NEWSAPI_KEY='...'
export GNEWS_API_KEY='...'
export NEWSDATA_API_KEY='...'
export SERPAPI_API_KEY='...'
export GOOGLE_CLOUD_STORAGE_PREFIX='linkedin-images'
export DELETE_UNUSED_GENERATED_IMAGES='true'
```
