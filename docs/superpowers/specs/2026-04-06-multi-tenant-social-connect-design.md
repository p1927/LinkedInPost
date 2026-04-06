# Multi-Tenant Social Media Connect — Design Spec

**Date:** 2026-04-06
**Status:** Approved

---

## Overview

Transform the single-tenant LinkedIn post tool into a multi-tenant platform where any user can sign up via Google, connect their own LinkedIn / Instagram / Gmail accounts, and publish posts on their behalf. Telegram and WhatsApp remain bot-based (per-user config, no OAuth). Billing and teams are out of scope.

---

## Goals

- Any Google account can sign up (no `ALLOWED_EMAILS` gate for new users)
- Each user gets a fully isolated workspace (posts, topics, connected accounts)
- Users connect LinkedIn, Instagram, and Gmail via standard OAuth — 2-3 clicks
- Tokens encrypted at rest (AES-256-GCM) in D1
- Optional Google Spreadsheet connection; defaults to in-app content management
- Reconnecting expired tokens is one click (red badge → OAuth flow)

---

## Out of Scope

- Teams / workspaces (future)
- Billing / usage limits (future)
- WhatsApp per-user OAuth (platform not suited for social posting)
- Telegram per-user OAuth (bot model, keep as-is)

---

## Architecture

```
Google Sign-In (existing)
        │
        ▼
Worker resolves userId = Google sub from session token
        │
        ├── /api/users/me              upsert user on first login
        ├── /api/integrations          list connected accounts (no tokens)
        ├── /auth/{provider}/connect   start OAuth → redirect to platform
        ├── /auth/{provider}/callback  exchange code → encrypt → D1
        └── /api/integrations/{provider} DELETE → disconnect
```

Every D1 query is scoped to `userId`. Tokens never leave the Worker — frontend only receives `{ provider, display_name, profile_picture, needs_reauth }`.

---

## Data Model

### New table: `users`

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- Google sub
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  spreadsheet_id TEXT,              -- null = in-app content only
  onboarding_completed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### New table: `social_integrations`

```sql
CREATE TABLE social_integrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL,           -- 'linkedin' | 'instagram' | 'gmail'
  internal_id TEXT NOT NULL,        -- platform user ID
  display_name TEXT,
  profile_picture TEXT,
  access_token_enc TEXT NOT NULL,   -- AES-256-GCM encrypted: base64(iv:ciphertext)
  refresh_token_enc TEXT,
  token_expires_at TEXT,            -- ISO 8601
  needs_reauth INTEGER DEFAULT 0,
  scopes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, provider)
);
```

### Modified table: `pipeline_state`

Add `user_id TEXT` column. All queries gain `WHERE user_id = ?`. Migration uses `ALTER TABLE pipeline_state ADD COLUMN user_id TEXT`.

---

## Token Encryption

- **Algorithm:** AES-256-GCM (Web Crypto API, built into Cloudflare Workers)
- **Key source:** `TOKEN_ENCRYPTION_KEY` Worker secret (32-byte hex string)
- **Storage format:** `base64(iv) + ':' + base64(ciphertext)` — single text column
- **Usage:** encrypt on write (callback), decrypt on read (publish only)
- Tokens are never sent to the frontend

```typescript
// worker/src/lib/crypto.ts  (new file)
async function encryptToken(plaintext: string, keyHex: string): Promise<string>
async function decryptToken(stored: string, keyHex: string): Promise<string>
```

---

## OAuth Flows

### LinkedIn

- **Scopes:** `openid profile w_member_social r_basicprofile`
- **Auth URL:** `https://www.linkedin.com/oauth/v2/authorization`
- **Token URL:** `https://www.linkedin.com/oauth/v2/accessToken`
- **Profile:** `GET https://api.linkedin.com/v2/userinfo` → `sub`, `name`, `picture`
- **Person URN:** `urn:li:person:{sub}` — derived, not stored separately
- **Token lifetime:** 60-day access token, 365-day refresh token
- **Env vars needed:** `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` (already in `Env`)

### Instagram (Meta)

- **Scopes:** `instagram_basic instagram_content_publish pages_show_list`
- **Auth URL:** `https://www.facebook.com/dialog/oauth`
- **Token URL:** `https://graph.facebook.com/v21.0/oauth/access_token`
- **Profile:** `GET /me?fields=id,name,picture`
- **Token lifetime:** 60-day long-lived token (exchange short-lived immediately after callback)
- **Env vars needed:** `META_APP_ID`, `META_APP_SECRET` (already in `Env`)

### Gmail (Google)

- **Scopes:** `openid email profile https://www.googleapis.com/auth/gmail.send`
- **Auth URL:** `https://accounts.google.com/o/oauth2/v2/auth`
- **Token URL:** `https://oauth2.googleapis.com/token`
- **Profile:** JWT claims from id_token (name, email, picture)
- **Token lifetime:** 1-hour access token, long-lived refresh token
- **Env vars needed:** `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` (already in `Env`)
- **Note:** Reuse existing Google OAuth infrastructure where possible

---

## OAuth State Management

```
KV key:   oauth:state:{state}
KV value: { userId, codeVerifier, provider, returnTo }
TTL:      5 minutes
```

State is deleted after first read (one-time use). `codeVerifier` supports PKCE for LinkedIn.

---

## New Worker Routes

| Method | Path | Handler |
|--------|------|---------|
| POST | `/api/users/me` | Upsert user on login, return profile |
| GET | `/api/integrations` | List user's connected accounts (sanitized) |
| DELETE | `/api/integrations/:provider` | Disconnect, delete from D1 |
| GET | `/auth/:provider/connect` | Generate auth URL, store KV state, redirect |
| GET | `/auth/:provider/callback` | Exchange code, encrypt tokens, store D1, redirect to app |

All `/api/*` routes require an authenticated session (existing auth middleware).
`/auth/:provider/callback` validates state from KV (no session required during redirect).

---

## Publishing Flow (updated)

Replace hardcoded env token lookups with D1 queries:

```
Publish request (userId, provider, content)
        ↓
SELECT * FROM social_integrations WHERE user_id=? AND provider=?
        ↓
Check token_expires_at — if within 7 days → proactive refresh
        ↓
decryptToken(access_token_enc)
        ↓
Call existing publishLinkedInPost() / publishInstagramPost() / sendGmailMessage()
        ↓
On 401 → attempt refresh → retry once
On refresh fail → set needs_reauth=1 → return { error: 'reconnect_required', reconnectUrl }
```

Existing publish functions (`publishLinkedInPost`, etc.) are unchanged — they take `accessToken` as a parameter already.

---

## Onboarding UX

**Trigger:** `onboarding_completed = 0` on first login.

**Step 1 — Connect accounts:**
- Icon grid: LinkedIn · Instagram · Gmail
- Connected accounts show profile avatar + platform badge overlay
- Disconnected: greyed icon
- CTA: "Continue" (≥1 connected) or "Skip for now"

**Step 2 — Content source:**
- Option A: Paste Google Spreadsheet URL → stored as `spreadsheet_id`
- Option B: "I'll create posts in the app" → `spreadsheet_id` stays null
- CTA: "Let's go →"

On completion: `onboarding_completed = 1`, modal dismissed, dashboard shown.

---

## Settings — Connected Accounts Card

Added to existing settings drawer:

```
Connected Accounts
──────────────────────────────────────
[avatar] John Smith · LinkedIn        [Disconnect]
[avatar] @johnsmith · Instagram       [Disconnect]
[icon]   Gmail                        [Connect →]
──────────────────────────────────────
```

- `needs_reauth=1` → red badge on avatar, "Reconnect" replaces "Disconnect"
- Clicking "Reconnect" → `/auth/{provider}/connect` (same OAuth flow, overwrites token)

---

## Frontend Components (new/modified)

| Component | Location | Purpose |
|-----------|----------|---------|
| `OnboardingModal` | `frontend/src/features/onboarding/` | 2-step first-run wizard |
| `ConnectAccountsGrid` | `frontend/src/features/onboarding/` | Platform icon grid (shared with settings) |
| `SettingsConnectionsCard` | existing `SettingsConnectionsCard.tsx` | Add connected accounts list |
| `OAuthCallbackPage` | `frontend/src/pages/OAuthCallbackPage.tsx` | Loading → success/error screen on return from OAuth |

---

## New Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `TOKEN_ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM | Yes |

All OAuth client IDs/secrets already exist in `Env` interface. No other new env vars.

---

## Migration Plan

1. Run D1 migrations: create `users`, `social_integrations`, add `user_id` to `pipeline_state`
2. Seed existing admin user (from `ALLOWED_EMAILS`) into `users` table with existing spreadsheet ID
3. Existing hardcoded tokens (`LINKEDIN_ACCESS_TOKEN`, etc.) remain as fallback for the seeded admin user — admin's `social_integrations` row is populated from env vars on first login
4. New users get no fallback — must connect via OAuth

---

## File Structure (new files)

```
worker/src/
  lib/
    crypto.ts              AES-256-GCM encrypt/decrypt
  auth/
    oauth/
      linkedin.ts          generateAuthUrl, exchangeCode, refreshToken
      instagram.ts
      gmail.ts
      index.ts             provider registry
  routes/
    integrations.ts        GET/DELETE /api/integrations
    oauthConnect.ts        GET /auth/:provider/connect + /callback
    users.ts               POST /api/users/me

frontend/src/
  features/
    onboarding/
      OnboardingModal.tsx
      ConnectAccountsGrid.tsx
  pages/
    OAuthCallbackPage.tsx
```

---

## Success Criteria

- A new user can sign up, connect LinkedIn, and publish a post in under 3 minutes
- Token encryption verified: raw D1 rows show ciphertext, not plaintext tokens
- Each user sees only their own content and integrations
- Expired token → red badge → one-click reconnect → posting resumes
- Existing admin workflow unchanged after migration
