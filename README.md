---
title: LinkedIn Automation Bot
description: Shared LinkedIn content workflow using GitHub Pages, Cloudflare Workers, GitHub Actions, and Google Workspace resources.
ms.date: 2026-03-25
ms.topic: overview
---

## Overview

This repository runs a shared LinkedIn content pipeline.
Approved users sign in from a GitHub Pages dashboard, manage topics in one shared Google Sheet, review generated drafts, and trigger the existing GitHub Actions workflows without handling Google API credentials or GitHub tokens in the browser.
Admins can now also connect shared Instagram, LinkedIn, and WhatsApp channels from the dashboard through popup OAuth flows handled by the Cloudflare Worker, and they can configure Telegram delivery with a stored bot token plus saved chat IDs.

## Architecture

The current deployment model is:

* GitHub Pages hosts the React dashboard
* Cloudflare Workers verifies Google ID tokens, enforces the allowlist, stores shared config in KV, and proxies GitHub dispatch calls
* Cloudflare Workers also owns the Instagram, LinkedIn, and Meta OAuth callback flows, exchanges auth codes server-side, and stores channel tokens encrypted in KV
* A Google service account gives the Worker access to the shared Google Sheet
* SerpApi provides web research snippets and image search results for the Python draft workflow
* GitHub Actions runs the Python draft and publish jobs
* Google Drive and Google Docs continue to store media and published-post logs for the automation workflow

## Workflow

1. Add topics to the shared content calendar.
2. Run or schedule the draft workflow with `python linkedin_bot.py draft` through GitHub Actions.
3. Review variants in the dashboard and approve the final post.
4. Run or schedule the publish workflow with `python linkedin_bot.py publish`.

## Setup

Use [SETUP.md](SETUP.md) for the full deployment checklist.

The short version is:

1. Run `python setup.py` to create the shared Google resources.
2. Run `python setup.py --all` to bootstrap the Worker config, deploy the Worker, verify the production URL, and sync GitHub secrets when `wrangler` and `gh` are available.
3. Create a SerpApi key and add `SERPAPI_API_KEY` to the environment used by the Python automation.
4. Keep the GitHub Actions secrets used by the Python automation for any values you do not provide to the setup script.

Only one Cloudflare deployment target is kept in this repository: the API Worker defined in [worker/wrangler.jsonc](worker/wrangler.jsonc). The frontend stays on GitHub Pages.

## Local automation

You can still run the Python jobs locally with a root `.env` file:

```bash
python linkedin_bot.py draft
python linkedin_bot.py publish
```