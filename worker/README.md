---
title: LinkedIn Bot Cloudflare Worker
description: Setup and deployment guide for the Cloudflare Worker backend used by the shared LinkedIn Bot dashboard.
ms.date: 2026-03-25
ms.topic: how-to
---

## Overview

This Worker replaces the earlier Apps Script backend.
It verifies Google sign-ins, stores shared dashboard config in Cloudflare KV, uses a Google service account for Sheets access, and proxies GitHub repository dispatch requests.

If you want one script to handle most of this flow, run `python setup.py --all` from the repository root. The manual steps below remain useful when you want tighter control over the deployment sequence.

If you only want the local Worker toolchain installed first, run `python setup.py --install-worker-deps` from the repository root.

## What you need

* A Cloudflare account on the free plan
* A KV namespace for shared config
* A Google OAuth client ID for the frontend
* A Google service account JSON key with access to the shared sheet
* A GitHub personal access token with repository dispatch access

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
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Full service-account JSON used to call Google Sheets |
| `GITHUB_TOKEN_ENCRYPTION_KEY` | Base64-encoded 32-byte AES key used to encrypt the stored GitHub token |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins for cross-origin requests |

## Run locally

```bash
cd worker
npm run dev
```

## Deploy

Set the production secrets first:

```bash
cd worker
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
npx wrangler secret put GITHUB_TOKEN_ENCRYPTION_KEY
```

The setup script performs these `wrangler secret put` calls for you during `python setup.py --deploy-worker` or `python setup.py --all`.

Then deploy the Worker:

```bash
cd worker
npm run deploy
```

After deployment, copy the Worker URL into the frontend as `VITE_WORKER_URL`.

## Backend behavior

* The Worker verifies the Google ID token on every request.
* Shared dashboard config is stored in KV under one key.
* The GitHub token entered by an admin is encrypted before it is stored.
* The browser never talks to Google Sheets or GitHub directly.