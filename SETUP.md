---
title: "LinkedIn Bot — Setup Checklist"
description: "Step-by-step guide to configure all required API keys, Google resources, and GitHub Secrets before deploying the LinkedIn Bot."
ms.date: 2026-03-24
ms.topic: how-to
---

## Overview

This document walks you through every credential and resource the LinkedIn Bot needs.
Run the auto-setup script where noted — it creates the Google Sheet, Drive folder,
and Doc for you, and prints the exact values to paste into GitHub Secrets.

**Architecture reminder**

- **GitHub Actions** runs the Python bot (drafts + publishes)
- **GitHub Pages** hosts the React dashboard
- **Google Sheets** is the content calendar / database
- **Google Drive** stores generated images
- **Google Docs** logs every published post
- **Your private Google Drive app data** stores the GitHub PAT securely — it is never written to `localStorage` or code

---

## Prerequisites

Before starting, install the Python dependencies:

```bash
pip install -r requirements.txt
```

---

## Step 1: Google Cloud project and service account

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a new project.
2. Enable these APIs in **APIs & Services → Library**:
   - Google Sheets API
   - Google Drive API
   - Google Docs API
   - Custom Search API
3. Go to **APIs & Services → Credentials → Create Credentials → Service Account**.
   - Give it any name (e.g., `linkedin-bot`).
   - Download the JSON key file — keep it secret.
4. Copy the entire contents of that JSON file. You will paste it as `GOOGLE_CREDENTIALS_JSON` in GitHub Secrets.

> The service account email looks like `linkedin-bot@your-project.iam.gserviceaccount.com`.
> The setup script uses it to create and share the Sheet and Doc automatically.

---

## Step 2: Auto-create Google resources

With `GOOGLE_CREDENTIALS_JSON` set (in `.env` or your shell), run:

```bash
python setup.py
```

The script will:

- Create the Google Sheet with the correct column headers
- Create the Google Drive folder for images
- Create the Google Doc for the published-posts log
- Share the Sheet and Doc with your personal Gmail (enter it when prompted)
- Optionally fetch your LinkedIn Person URN if `LINKEDIN_ACCESS_TOKEN` is set
- Print all the values you need for GitHub Secrets

Copy the output — you will use it in Step 6.

---

## Step 3: Gemini API

1. Go to [Google AI Studio](https://aistudio.google.com/) and sign in.
2. Click **Get API key → Create API key**.
3. Copy the key — this becomes `GEMINI_API_KEY` in GitHub Secrets.

---

## Step 4: Google Custom Search (images and research)

1. In your Google Cloud project, enable the **Custom Search API** (already done in Step 1).
2. Create an API key at **Credentials → Create Credentials → API Key**.
   This becomes `GOOGLE_SEARCH_API_KEY`.
3. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/) and create a new engine.
   - Set it to search the entire web.
   - Enable **Image Search**.
   - Copy the **Search Engine ID (CX)**. This becomes `GOOGLE_SEARCH_CX`.

---

## Step 5: LinkedIn API

1. Go to the [LinkedIn Developer Portal](https://developer.linkedin.com/) and create an app.
2. Request access to **Share on LinkedIn** and **Sign In with LinkedIn** products.
3. Generate an OAuth 2.0 Access Token with scopes `w_member_social` and `r_liteprofile`.
   This becomes `LINKEDIN_ACCESS_TOKEN`.
4. Your **Person URN** looks like `urn:li:person:123456789`.
   - If you set `LINKEDIN_ACCESS_TOKEN` before running `setup.py`, the script fetches it automatically.
   - Otherwise, query `GET https://api.linkedin.com/v2/me` with your token and take the `id` field.
   This becomes `LINKEDIN_PERSON_URN`.

> **Token lifetime**: LinkedIn access tokens expire. You will need to refresh `LINKEDIN_ACCESS_TOKEN`
> in GitHub Secrets periodically (typically every 60 days).

---

## Step 6: Google OAuth client (Web UI login)

The React dashboard uses Google OAuth to authenticate you before accessing your Sheet.

1. In Google Cloud Console, go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**.
2. Choose **Web application**.
3. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173` (for local dev)
   - `https://<your-github-username>.github.io` (for production)
4. Copy the **Client ID** — this becomes `VITE_GOOGLE_CLIENT_ID` in GitHub Secrets.
5. Under **OAuth consent screen**, add yourself as a test user if the app is in testing mode.
   Add `https://www.googleapis.com/auth/drive.appdata` to the scopes list.

---

## Step 7: GitHub Secrets

Go to your repository → **Settings → Secrets and variables → Actions → New repository secret**.
Add each of the following:

| Secret name | Where to get it |
|---|---|
| `GOOGLE_SHEET_ID` | Printed by `setup.py` |
| `GOOGLE_DRIVE_FOLDER_ID` | Printed by `setup.py` |
| `GOOGLE_DOC_ID` | Printed by `setup.py` |
| `GOOGLE_CREDENTIALS_JSON` | Full contents of your service account JSON file |
| `GEMINI_API_KEY` | Google AI Studio (Step 3) |
| `GOOGLE_SEARCH_API_KEY` | Google Cloud Console (Step 4) |
| `GOOGLE_SEARCH_CX` | Programmable Search Engine (Step 4) |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn Developer Portal (Step 5) |
| `LINKEDIN_PERSON_URN` | Printed by `setup.py` or queried manually (Step 5) |
| `VITE_GOOGLE_CLIENT_ID` | Google Cloud Console (Step 6) |

---

## Step 8: GitHub Pages

1. Go to **Settings → Pages**.
2. Under **Build and deployment**, select **GitHub Actions** as the source.
3. Push any change to `main` (or trigger the workflow manually) — the dashboard deploys automatically.

---

## Step 9: First run

1. Visit your GitHub Pages URL.
2. Click **Sign in with Google**. On the first login, Google will ask for permission to access
   Sheets, Docs, and Drive app data. Approve all three.
3. Open **Settings** and enter:
   - Your **Google Spreadsheet ID** (from the URL of the sheet created by `setup.py`)
   - Your **GitHub repository** (format: `owner/repo`)
   - A **GitHub Personal Access Token (PAT)** with `repo` scope
     (create one at `github.com/settings/tokens`)
4. Click **Save Configuration** — these settings are stored in your private Google Drive app data,
   not in this browser or any code.
5. Add a topic, then click **Generate Posts** to trigger the first draft run.

---

## Verification checklist

- [ ] `python setup.py` completed without errors
- [ ] Google Sheet has 14 columns (A through N) with correct headers
- [ ] Service account email has Editor access to the Sheet, Drive folder, and Doc
- [ ] All 10 GitHub Secrets are set (verify at `Settings → Secrets → Actions`)
- [ ] `VITE_GOOGLE_CLIENT_ID` Google OAuth origin includes your Pages URL
- [ ] GitHub Pages is enabled (Settings → Pages → Source: GitHub Actions)
- [ ] First push to `main` triggered the deploy-pages workflow successfully
- [ ] Signing in to the dashboard prompts for Sheets + Docs + Drive app data scopes
- [ ] Saving settings shows "Saving to Drive..." and succeeds
- [ ] Triggering **Generate Posts** shows the action running in the GitHub Actions tab

---

## Security notes

- The GitHub PAT you enter in the dashboard is **never written to `localStorage` or any browser storage**.
  It is encrypted by TLS in transit and stored in your private `appDataFolder` on Google Drive —
  accessible only to your Google account via this specific OAuth client ID.
- The Google OAuth access token is stored in `localStorage` with a 1-hour expiry (standard SPA practice).
  When it expires, you are prompted to log in again.
- No secrets of any kind are embedded in the deployed frontend code.
- All Python bot secrets live exclusively in GitHub Encrypted Secrets — never in the repository files.
