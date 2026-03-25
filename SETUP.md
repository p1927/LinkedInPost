---
title: LinkedIn Bot Setup Checklist
description: Step-by-step guide to configure the free GitHub Pages plus Cloudflare Workers deployment for LinkedIn Bot.
ms.date: 2026-03-25
ms.topic: how-to
---

## Overview

This setup keeps the project free while allowing approved Gmail users to work against one shared Google Sheet, Drive folder, and Docs log.

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

## Step 1: Create the Google resources

Create a Google Cloud project, enable the APIs below, and create a service account:

* Google Sheets API
* Google Drive API
* Google Docs API
* Custom Search API

Then run the local bootstrap script:

```bash
python setup.py
```

The script creates the shared `LINKEDIN` folder, content calendar sheet, images folder, and published-posts doc.

Set `GOOGLE_SHARE_EMAIL` first if you want the script to share the parent Drive folder with your Gmail account automatically.

## Step 2: Create the Google sign-in client

In Google Cloud Console, create an OAuth client for the frontend.

Add these authorized JavaScript origins:

* `http://localhost:5173`
* `https://<your-github-username>.github.io`

Copy the client ID. You will use it both in the frontend and in the Worker configuration.

## Step 3: Bootstrap the Cloudflare Worker backend

The setup script can now handle most of the Worker setup work for you.

Any Worker-related setup flag now starts by installing the local Worker dependencies from [worker/package.json](worker/package.json). That includes `wrangler`.

Use this command for the full path:

```bash
python setup.py --all
```

That flow can:

* Reuse or create the `CONFIG_KV` namespaces
* Update [worker/wrangler.jsonc](worker/wrangler.jsonc) with KV IDs and Worker vars
* Write [worker/.dev.vars](worker/.dev.vars) for local Worker development
* Push Worker secrets with Wrangler
* Deploy the Worker
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
* `GOOGLE_SERVICE_ACCOUNT_JSON`
* `GITHUB_TOKEN_ENCRYPTION_KEY`
* `CORS_ALLOWED_ORIGINS`

The setup script writes the non-secret Worker vars into [worker/wrangler.jsonc](worker/wrangler.jsonc) and pushes the secret values with Wrangler during deployment.

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

## Step 5: Configure GitHub Actions secrets

The scheduled Python jobs still need their existing secrets.
Keep these configured in GitHub Actions:

* `GOOGLE_SHEET_ID`
* `GOOGLE_DRIVE_FOLDER_ID`
* `GOOGLE_DOC_ID`
* `GOOGLE_CREDENTIALS_JSON`
* `GEMINI_API_KEY`
* `GOOGLE_SEARCH_API_KEY`
* `GOOGLE_SEARCH_CX`
* `LINKEDIN_ACCESS_TOKEN`
* `LINKEDIN_PERSON_URN`

When `python setup.py --sync-github-secrets` runs with the corresponding environment variables present, it will sync any of these values that it can resolve.

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

## Important changes from the old flow

* The browser no longer calls Google Sheets, Drive, or GitHub directly
* The browser no longer stores the GitHub PAT
* Config lives in Cloudflare KV, not in a user-specific Drive app-data file
* Shared access is controlled by `ALLOWED_EMAILS` in the Worker

## Suggested environment variables for setup.py

Set these before running the broader bootstrap flow:

```bash
export GOOGLE_CREDENTIALS_JSON='...'
export GOOGLE_SHARE_EMAIL='you@gmail.com'
export VITE_GOOGLE_CLIENT_ID='your-client-id.apps.googleusercontent.com'
export ALLOWED_EMAILS='you@gmail.com teammate@gmail.com'
export ADMIN_EMAILS='you@gmail.com'
export GITHUB_PAGES_ORIGIN='https://your-username.github.io'
```

Add these too if you want `setup.py --sync-github-secrets` to populate the automation secrets in one pass:

```bash
export GEMINI_API_KEY='...'
export GOOGLE_SEARCH_API_KEY='...'
export GOOGLE_SEARCH_CX='...'
export LINKEDIN_ACCESS_TOKEN='...'
```
