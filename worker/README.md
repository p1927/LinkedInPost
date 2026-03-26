---
title: LinkedIn Bot Cloudflare Worker
description: Setup and deployment guide for the Cloudflare Worker backend used by the shared LinkedIn Bot dashboard.
ms.date: 2026-03-26
ms.topic: how-to
---

## Overview

This Worker replaces the earlier Apps Script backend.
It verifies Google sign-ins, stores shared dashboard config in Cloudflare KV, uses a Google service account for Sheets access, and proxies GitHub repository dispatch requests.

`setup.py` is the source of truth for the Cloudflare bootstrap flow in this repository. If Cloudflare is connected directly to GitHub and deploys on push, keep that deployment configuration aligned with `setup.py` so both paths produce the same Worker setup.

If you update this guide or `setup.py`, update the other file in the same change.

If you want one script to handle most of this flow, run `python setup.py --all` from the repository root. The manual steps below remain useful when you want tighter control over the deployment sequence.

If you only want the local Worker toolchain installed first, run `python setup.py --install-worker-deps` from the repository root.

## What you need

* A Cloudflare account on the free plan
* A KV namespace for shared config
* A Google OAuth client ID for the frontend
* A Google service account JSON key with access to the shared sheet
* A GitHub personal access token with repository dispatch access
* An Instagram app with Instagram Login if you want admins to connect Instagram from the dashboard
* A LinkedIn OAuth app if you want admins to connect LinkedIn from the dashboard
* A Telegram bot token if you want the Worker to deliver approved content to Telegram chats
* A Meta app if you want admins to connect WhatsApp Business from the dashboard

## Install dependencies

```bash
cd worker
npm install
```

The setup script runs this installation step automatically before any Worker-related bootstrap action.

## Create the KV namespace

Create a production and preview KV namespace, then copy the IDs into `wrangler.jsonc`.

```bash
cd worker
npx wrangler kv namespace create CONFIG_KV
npx wrangler kv namespace create CONFIG_KV --preview
```

The expanded setup script can do this for you and update [worker/wrangler.jsonc](wrangler.jsonc) automatically.

## Configure local development

Copy `.dev.vars.example` to `.dev.vars`, then fill in the real values.

Generate the encryption key with:

```bash
openssl rand -base64 32
```

Use `CORS_ALLOWED_ORIGINS` to list the frontend origins that can call the Worker.
For GitHub Pages, that is usually your production Pages origin plus `http://localhost:5173` for local Vite development.

The setup script writes [worker/.dev.vars](.dev.vars) automatically when you run `python setup.py --cloudflare` or `python setup.py --all`.

## Required environment values

| Variable | Purpose |
|---|---|
| `ALLOWED_EMAILS` | Space-separated or comma-separated Gmail addresses allowed to use the dashboard |
| `ADMIN_EMAILS` | Optional list of users who can edit shared settings |
| `GOOGLE_CLIENT_ID` | OAuth client ID used by the frontend Google sign-in button |
| `GOOGLE_CLOUD_STORAGE_BUCKET` | Bucket used for generated draft images and post-publish cleanup |
| `DELETE_UNUSED_GENERATED_IMAGES` | Enables deletion of non-selected generated images after successful publish |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Full service-account JSON used to call Google Sheets |
| `GITHUB_TOKEN_ENCRYPTION_KEY` | Base64-encoded 32-byte AES key used to encrypt the stored GitHub token |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins for cross-origin requests |

To enable popup-based channel connection from the dashboard, add these too:

| Variable | Purpose |
|---|---|
| `INSTAGRAM_APP_ID` | Instagram app ID exposed as a Worker var |
| `INSTAGRAM_APP_SECRET` | Instagram app secret stored as a Worker secret |
| `LINKEDIN_CLIENT_ID` | LinkedIn OAuth client ID exposed as a Worker var |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth client secret stored as a Worker secret |
| `META_APP_ID` | Meta app ID exposed as a Worker var |
| `META_APP_SECRET` | Meta app secret stored as a Worker secret |

Register these redirect URLs in the provider dashboards:

* `https://<your-worker-domain>/auth/instagram/callback`
* `https://<your-worker-domain>/auth/linkedin/callback`
* `https://<your-worker-domain>/auth/whatsapp/callback`

Instagram publishing currently supports approved image posts only. The Worker uses the approved text as the caption and rejects text-only rows for this channel.

Telegram delivery does not require an OAuth app. After the Worker is deployed, an admin can open the dashboard settings, store a Telegram bot token, and add saved chat IDs such as `@channelusername` or `-1001234567890`.

For generated images, the repository now assumes a Google Cloud Storage bucket instead of a Google Drive folder. Grant the service account `roles/storage.objectAdmin` on that bucket. The Worker keeps the selected image and deletes the non-selected generated images after successful delivery across LinkedIn, Instagram, Telegram, and WhatsApp.

If you plan to use browser-side `fetch()` requests against the bucket from custom tooling, add a bucket CORS policy that covers your dashboard origins. Standard image tags and channel-side URL fetches do not require bucket CORS.

## Run locally

```bash
cd worker
npm run dev
```

## Deploy

Prepare a JSON secrets file for deployment:

```bash
cd worker
cat > .deploy-secrets.json <<'EOF'
{
	"GOOGLE_SERVICE_ACCOUNT_JSON": "{\"type\":\"service_account\",...}",
	"GITHUB_TOKEN_ENCRYPTION_KEY": "base64-encoded-key"
}
EOF
```

The setup script builds an equivalent temporary JSON secrets file for you during `python setup.py --deploy-worker` or `python setup.py --all`.

Then deploy the Worker:

```bash
cd worker
npx wrangler deploy --secrets-file .deploy-secrets.json
```

Remove the temporary file after deployment.

After deployment, copy the Worker URL into the frontend as `VITE_WORKER_URL`.

The production URL must return JSON from `GET /`. If it returns HTML, that hostname is serving a static deployment and should not be used as the frontend backend URL.

## Backend behavior

* The Worker verifies the Google ID token on every request.
* Shared dashboard config is stored in KV under one key.
* The GitHub token entered by an admin is encrypted before it is stored.
* Instagram, LinkedIn, and WhatsApp popup auth codes are exchanged by the Worker and the resulting channel tokens are stored encrypted.
* Telegram bot tokens entered in the dashboard are encrypted before the Worker stores them.
* The browser never talks to Google Sheets or GitHub directly.