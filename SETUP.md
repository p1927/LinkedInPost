---
title: LinkedIn Bot Setup Checklist
description: Step-by-step guide to configure the free GitHub Pages plus Cloudflare Workers deployment for LinkedIn Bot.
ms.date: 2026-03-26
ms.topic: how-to
---

## Overview

This setup keeps the project free while allowing approved Gmail users to work against one shared Google Sheet, one Google Cloud Storage bucket for generated images, and one Google Docs log.

The deployed shape is:

* GitHub Pages hosts the React dashboard
* Cloudflare Workers acts as the shared backend
* A Google service account gives the Worker access to the shared sheet
* GitHub Actions continues to run the Python bot for draft and publish workflows

Only the API Worker is deployed to Cloudflare. The repository does not keep a second root Cloudflare deployment config for the frontend.

## Prerequisites

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

Any Worker-related setup flag now starts by installing the local Worker dependencies from [worker/package.json](worker/package.json). That includes `wrangler`.

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
* `GITHUB_TOKEN_ENCRYPTION_KEY`
* `CORS_ALLOWED_ORIGINS`

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

If you run `python setup.py --all` and `gh` is authenticated, the script will try to write these repository secrets automatically.

## Step 5: Configure SerpApi

SerpApi is the supported search backend for research and image discovery in the Python draft workflow.

1. Create a SerpApi account.
2. Generate an API key from the SerpApi dashboard.
3. Add the key to your local environment and to GitHub Actions as `SERPAPI_API_KEY`.

The Python draft job uses SerpApi organic results for research context and Google Images results for image discovery.

## Step 6: Configure GitHub Actions secrets

The scheduled Python jobs still need their existing secrets.
Keep these configured in GitHub Actions:

* `GOOGLE_SHEET_ID`
* `GOOGLE_CLOUD_STORAGE_BUCKET`
* `GOOGLE_CLOUD_STORAGE_PREFIX`
* `GOOGLE_DOC_ID`
* `GOOGLE_CREDENTIALS_JSON`
* `DELETE_UNUSED_GENERATED_IMAGES`
* `GEMINI_API_KEY`
* `SERPAPI_API_KEY`
* `LINKEDIN_ACCESS_TOKEN`
* `LINKEDIN_PERSON_URN`

If you only publish through the dashboard's direct Worker delivery path, the Worker can manage the Instagram, LinkedIn, and WhatsApp access tokens itself after an admin connects the channels. The GitHub Actions secrets above are still relevant for the older Python publish workflow.

Telegram delivery is Worker-only. It does not require any additional GitHub Actions secrets.

When `python setup.py --sync-github-secrets` runs with the corresponding environment variables present, it will sync any of these values that it can resolve.

## Step 7: Deploy the frontend

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

## Important changes from the old flow

* The browser no longer calls Google Sheets, Drive, or GitHub directly
* The browser no longer stores the GitHub PAT
* Config lives in Cloudflare KV, not in a user-specific Drive app-data file
* Shared access is controlled by `ALLOWED_EMAILS` in the Worker
* Generated draft images now live in Google Cloud Storage, and unused variants are deleted automatically after publish

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

Add these too if you want `setup.py --sync-github-secrets` to populate the automation secrets in one pass:

```bash
export GEMINI_API_KEY='...'
export SERPAPI_API_KEY='your-serpapi-api-key'
export GOOGLE_CLOUD_STORAGE_PREFIX='linkedin-images'
export DELETE_UNUSED_GENERATED_IMAGES='true'
export LINKEDIN_ACCESS_TOKEN='...'
```
