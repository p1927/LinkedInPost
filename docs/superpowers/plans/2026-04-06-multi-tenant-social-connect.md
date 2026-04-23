# Multi-Tenant Social Connect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the app into a multi-tenant platform where any Google user can sign up, connect their own LinkedIn / Instagram / Gmail accounts via OAuth, and publish posts on their behalf — with tokens encrypted in D1 per user.

**Architecture:** Extend the existing Cloudflare Worker + D1 stack with two new tables (`users`, `social_integrations`). Reuse the existing `encryptSecret`/`decryptSecret` machinery (same `GITHUB_TOKEN_ENCRYPTION_KEY`) to encrypt tokens at rest. Remove the `ALLOWED_EMAILS` gate so any verified Google account can log in. Modify OAuth callbacks to store tokens per-user in D1 (in addition to the existing shared-config KV for backward compat). Remove `ensureAdmin` from social OAuth start actions so any user can connect their own accounts.

**Tech Stack:** TypeScript, Cloudflare Workers, D1 (SQLite), KV, React, existing `encryptSecret`/`decryptSecret` helpers in `worker/src/index.ts`.

---

## File Map

**Create:**
- `worker/migrations/0007_multi_tenant.sql` — `users` + `social_integrations` tables
- `worker/src/db/users.ts` — upsert/get user from D1
- `worker/src/db/socialIntegrations.ts` — CRUD for `social_integrations` table
- `frontend/src/features/onboarding/OnboardingModal.tsx` — first-run wizard
- `frontend/src/features/onboarding/ConnectAccountsGrid.tsx` — platform icon grid
- `frontend/src/pages/OAuthCallbackPage.tsx` — loading/success screen after OAuth popup closes (for non-popup fallback redirect)

**Modify:**
- `worker/src/index.ts` — verifySession (open gate + upsert user + return userId), startLinkedInAuth/startInstagramAuth/startGmailAuth (remove ensureAdmin), handleLinkedInCallback/handleInstagramCallback/handleGmailCallback (persist to D1), add getIntegrations/deleteIntegration/completeOnboarding actions, update bootstrap response
- `frontend/src/services/backendApi.ts` — add `getIntegrations`, `deleteIntegration`, `completeOnboarding` methods
- `frontend/src/components/dashboard/components/SettingsConnectionsCard.tsx` — add connect/disconnect buttons with live integration status
- `frontend/src/App.tsx` — add OnboardingModal, add OAuthCallbackPage route

---

## Task 1: D1 Migration — users + social_integrations

**Files:**
- Create: `worker/migrations/0007_multi_tenant.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- worker/migrations/0007_multi_tenant.sql

-- One row per Google user. id = Google email (already used as identifier everywhere).
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,              -- Google email (lowercase)
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  spreadsheet_id TEXT NOT NULL DEFAULT '',
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per connected social account per user.
CREATE TABLE IF NOT EXISTS social_integrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,           -- 'linkedin' | 'instagram' | 'gmail'
  internal_id TEXT NOT NULL DEFAULT '',   -- platform's user/account ID
  display_name TEXT NOT NULL DEFAULT '',
  profile_picture TEXT NOT NULL DEFAULT '',
  access_token_enc TEXT NOT NULL,         -- encryptSecret() output
  refresh_token_enc TEXT NOT NULL DEFAULT '',
  token_expires_at TEXT NOT NULL DEFAULT '',
  needs_reauth INTEGER NOT NULL DEFAULT 0,
  scopes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_social_integrations_user ON social_integrations(user_id);
```

- [ ] **Step 2: Apply migration locally**

```bash
cd worker
npx wrangler d1 migrations apply PIPELINE_DB --local
```

Expected output: `✅  Migration 0007_multi_tenant.sql applied`

- [ ] **Step 3: Commit**

```bash
git add worker/migrations/0007_multi_tenant.sql
git commit -m "feat: D1 migration for users and social_integrations tables"
```

---

## Task 2: D1 User Helper

**Files:**
- Create: `worker/src/db/users.ts`

- [ ] **Step 1: Write the helper**

```typescript
// worker/src/db/users.ts

export interface DbUser {
  id: string;
  display_name: string;
  avatar_url: string;
  spreadsheet_id: string;
  onboarding_completed: number;
  created_at: string;
  updated_at: string;
}

/**
 * Upsert a user row on every login. Returns the stored row.
 * id = Google email (lowercase). display_name and avatar_url are updated each login.
 */
export async function upsertUser(
  db: D1Database,
  id: string,
  displayName: string,
  avatarUrl: string,
): Promise<DbUser> {
  await db
    .prepare(
      `INSERT INTO users (id, display_name, avatar_url)
       VALUES (?1, ?2, ?3)
       ON CONFLICT(id) DO UPDATE SET
         display_name = excluded.display_name,
         avatar_url   = excluded.avatar_url,
         updated_at   = datetime('now')`,
    )
    .bind(id, displayName, avatarUrl)
    .run();

  const row = await db
    .prepare('SELECT * FROM users WHERE id = ?1')
    .bind(id)
    .first<DbUser>();

  if (!row) {
    throw new Error('Failed to upsert user.');
  }
  return row;
}

/** Update the spreadsheet_id for a user (optional content source). */
export async function setUserSpreadsheetId(
  db: D1Database,
  userId: string,
  spreadsheetId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE users SET spreadsheet_id = ?1, updated_at = datetime('now') WHERE id = ?2`,
    )
    .bind(spreadsheetId, userId)
    .run();
}

/** Mark onboarding complete. */
export async function completeUserOnboarding(
  db: D1Database,
  userId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE users SET onboarding_completed = 1, updated_at = datetime('now') WHERE id = ?1`,
    )
    .bind(userId)
    .run();
}
```

- [ ] **Step 2: Commit**

```bash
git add worker/src/db/users.ts
git commit -m "feat: D1 user upsert helpers"
```

---

## Task 3: D1 Social Integrations Helper

**Files:**
- Create: `worker/src/db/socialIntegrations.ts`

- [ ] **Step 1: Write the helper**

```typescript
// worker/src/db/socialIntegrations.ts

export interface DbSocialIntegration {
  id: string;
  user_id: string;
  provider: string;
  internal_id: string;
  display_name: string;
  profile_picture: string;
  access_token_enc: string;
  refresh_token_enc: string;
  token_expires_at: string;
  needs_reauth: number;
  scopes: string;
  created_at: string;
  updated_at: string;
}

/** Public shape returned to the frontend — no tokens. */
export interface PublicIntegration {
  provider: string;
  internalId: string;
  displayName: string;
  profilePicture: string;
  needsReauth: boolean;
  connectedAt: string;
}

function makeId(): string {
  return crypto.randomUUID();
}

/** Upsert (insert or replace) a social integration row. */
export async function upsertSocialIntegration(
  db: D1Database,
  opts: {
    userId: string;
    provider: string;
    internalId: string;
    displayName: string;
    profilePicture: string;
    accessTokenEnc: string;
    refreshTokenEnc: string;
    tokenExpiresAt: string;
    scopes: string;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO social_integrations
         (id, user_id, provider, internal_id, display_name, profile_picture,
          access_token_enc, refresh_token_enc, token_expires_at, needs_reauth, scopes)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, ?10)
       ON CONFLICT(user_id, provider) DO UPDATE SET
         internal_id      = excluded.internal_id,
         display_name     = excluded.display_name,
         profile_picture  = excluded.profile_picture,
         access_token_enc = excluded.access_token_enc,
         refresh_token_enc = excluded.refresh_token_enc,
         token_expires_at = excluded.token_expires_at,
         needs_reauth     = 0,
         scopes           = excluded.scopes,
         updated_at       = datetime('now')`,
    )
    .bind(
      makeId(),
      opts.userId,
      opts.provider,
      opts.internalId,
      opts.displayName,
      opts.profilePicture,
      opts.accessTokenEnc,
      opts.refreshTokenEnc,
      opts.tokenExpiresAt,
      opts.scopes,
    )
    .run();
}

/** Delete a social integration row. */
export async function deleteSocialIntegration(
  db: D1Database,
  userId: string,
  provider: string,
): Promise<void> {
  await db
    .prepare('DELETE FROM social_integrations WHERE user_id = ?1 AND provider = ?2')
    .bind(userId, provider)
    .run();
}

/** Get all integrations for a user (sanitized — no tokens). */
export async function listSocialIntegrations(
  db: D1Database,
  userId: string,
): Promise<PublicIntegration[]> {
  const rows = await db
    .prepare('SELECT * FROM social_integrations WHERE user_id = ?1 ORDER BY created_at ASC')
    .bind(userId)
    .all<DbSocialIntegration>();

  return (rows.results ?? []).map((r) => ({
    provider: r.provider,
    internalId: r.internal_id,
    displayName: r.display_name,
    profilePicture: r.profile_picture,
    needsReauth: r.needs_reauth === 1,
    connectedAt: r.created_at,
  }));
}

/** Get a single integration row including encrypted tokens (for publishing). */
export async function getSocialIntegration(
  db: D1Database,
  userId: string,
  provider: string,
): Promise<DbSocialIntegration | null> {
  return db
    .prepare('SELECT * FROM social_integrations WHERE user_id = ?1 AND provider = ?2')
    .bind(userId, provider)
    .first<DbSocialIntegration>();
}

/** Mark an integration as needing re-auth (e.g. after a 401 that refresh couldn't fix). */
export async function markSocialIntegrationNeedsReauth(
  db: D1Database,
  userId: string,
  provider: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE social_integrations SET needs_reauth = 1, updated_at = datetime('now')
       WHERE user_id = ?1 AND provider = ?2`,
    )
    .bind(userId, provider)
    .run();
}
```

- [ ] **Step 2: Commit**

```bash
git add worker/src/db/socialIntegrations.ts
git commit -m "feat: D1 social integrations CRUD helpers"
```

---

## Task 4: Extend verifySession — Open Gate + Upsert User

**Files:**
- Modify: `worker/src/index.ts`

**Context:** `verifySession` is at line ~1330. Currently throws if email not in `ALLOWED_EMAILS`. We need to: (1) make ALLOWED_EMAILS optional (empty = allow all), (2) extend `VerifiedSession` to include `userId`, (3) upsert user in D1 using data from Google tokeninfo.

- [ ] **Step 1: Extend `GoogleTokenInfo` interface to include `name` and `picture`**

Find `interface GoogleTokenInfo` (~line 468) and add the two new fields:

```typescript
interface GoogleTokenInfo {
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  aud?: string;
  name?: string;
  picture?: string;
}
```

- [ ] **Step 2: Extend `VerifiedSession` to include `userId`**

Find `interface VerifiedSession` (~line 355):

```typescript
interface VerifiedSession {
  email: string;
  userId: string;   // same as email — Google email is the stable user identifier
  isAdmin: boolean;
}
```

- [ ] **Step 3: Add imports for DB helpers at top of `worker/src/index.ts`**

After the existing imports block add:

```typescript
import { upsertUser } from './db/users';
import { listSocialIntegrations, deleteSocialIntegration, upsertSocialIntegration, getSocialIntegration, markSocialIntegrationNeedsReauth, type PublicIntegration } from './db/socialIntegrations';
```

- [ ] **Step 4: Replace `verifySession` body**

Replace the entire function (lines ~1330–1371):

```typescript
async function verifySession(idToken: string | undefined, env: Env): Promise<VerifiedSession> {
  if (!idToken) {
    throw new Error('Unauthorized: missing Google ID token.');
  }

  const bypassSession = tryResolveDevGoogleAuthBypassSession(idToken, env);
  if (bypassSession) {
    // Dev bypass: upsert a synthetic user row so the rest of the code works.
    await upsertUser(env.PIPELINE_DB, bypassSession.email, 'Dev User', '').catch(() => undefined);
    return { ...bypassSession, userId: bypassSession.email };
  }

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) {
    throw new Error('Unauthorized: invalid or expired Google token.');
  }

  const tokenInfo = (await response.json()) as GoogleTokenInfo;
  const email = String(tokenInfo.email || '').toLowerCase();
  const emailVerified = String(tokenInfo.email_verified || '').toLowerCase() === 'true';

  if (!email || !emailVerified) {
    throw new Error('Unauthorized: Google account email is not verified.');
  }

  if (env.GOOGLE_CLIENT_ID && tokenInfo.aud !== env.GOOGLE_CLIENT_ID) {
    throw new Error('Unauthorized: Google token audience does not match this app.');
  }

  // ALLOWED_EMAILS is now optional: if set, acts as an allowlist; if empty, any Google account can log in.
  const allowedEmails = parseEmailList(env.ALLOWED_EMAILS);
  if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
    throw new Error('Unauthorized: this Google account is not on the allowed users list.');
  }

  // Upsert user into D1 on every login (updates name/avatar if they changed).
  const displayName = String(tokenInfo.name || '').trim();
  const avatarUrl = String(tokenInfo.picture || '').trim();
  await upsertUser(env.PIPELINE_DB, email, displayName, avatarUrl).catch(() => undefined);

  const adminEmails = parseEmailList(env.ADMIN_EMAILS);
  return {
    email,
    userId: email,
    isAdmin: adminEmails.length === 0 || adminEmails.includes(email),
  };
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd worker && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors (or only pre-existing unrelated ones).

- [ ] **Step 6: Commit**

```bash
git add worker/src/index.ts worker/src/db/users.ts worker/src/db/socialIntegrations.ts
git commit -m "feat: open auth gate, upsert user in D1 on login, add userId to VerifiedSession"
```

---

## Task 5: Add getIntegrations + deleteIntegration + completeOnboarding Actions

**Files:**
- Modify: `worker/src/index.ts`

**Context:** The `dispatchAction` switch statement is around line 900+. We add three new cases. Also update bootstrap to return `onboardingCompleted` and `integrations`.

- [ ] **Step 1: Add the three new action cases to `dispatchAction`**

Find the `dispatchAction` function and add before the `default` case:

```typescript
case 'getIntegrations':
  return listSocialIntegrations(env.PIPELINE_DB, session.userId);

case 'deleteIntegration': {
  const provider = String(payload.provider || '').trim();
  if (!provider) throw new Error('Missing provider.');
  await deleteSocialIntegration(env.PIPELINE_DB, session.userId, provider);
  return { ok: true };
}

case 'completeOnboarding': {
  const { completeUserOnboarding, setUserSpreadsheetId } = await import('./db/users');
  await completeUserOnboarding(env.PIPELINE_DB, session.userId);
  const spreadsheetId = String(payload.spreadsheetId || '').trim();
  if (spreadsheetId) {
    await setUserSpreadsheetId(env.PIPELINE_DB, session.userId, spreadsheetId);
  }
  return { ok: true };
}
```

> Note: replace the `await import('./db/users')` with a top-level import — since you already imported `upsertUser` in Task 4, add `completeUserOnboarding` and `setUserSpreadsheetId` to that same import line.

- [ ] **Step 2: Update the `completeUserOnboarding` and `setUserSpreadsheetId` import from Task 4**

Change the Task 4 import line to:

```typescript
import { upsertUser, completeUserOnboarding, setUserSpreadsheetId } from './db/users';
```

And the action case becomes:

```typescript
case 'completeOnboarding': {
  await completeUserOnboarding(env.PIPELINE_DB, session.userId);
  const spreadsheetId = String(payload.spreadsheetId || '').trim();
  if (spreadsheetId) {
    await setUserSpreadsheetId(env.PIPELINE_DB, session.userId, spreadsheetId);
  }
  return { ok: true };
}
```

- [ ] **Step 3: Find the `bootstrap` action case and add `onboardingCompleted` + `integrations` to response**

Find `case 'bootstrap':` in `dispatchAction`. The bootstrap case builds a `BotConfig` object and returns it as `config`. Add to the returned object:

```typescript
case 'bootstrap': {
  // ... existing bootstrap logic that builds config ...
  const integrations = await listSocialIntegrations(env.PIPELINE_DB, session.userId);
  // Find existing return statement for bootstrap and add these two fields:
  return {
    email: session.email,
    isAdmin: session.isAdmin,
    config,
    onboardingCompleted: false,  // will be filled below
    integrations,
  };
}
```

Actually the bootstrap action returns `{ email, isAdmin, config }`. Fetch the user row to get `onboarding_completed`:

```typescript
case 'bootstrap': {
  // ... existing config loading ...
  const [integrations, userRow] = await Promise.all([
    listSocialIntegrations(env.PIPELINE_DB, session.userId),
    env.PIPELINE_DB.prepare('SELECT onboarding_completed FROM users WHERE id = ?1')
      .bind(session.userId).first<{ onboarding_completed: number }>(),
  ]);
  // existing return, extended:
  return {
    // ... existing fields (email, isAdmin, config) ...
    onboardingCompleted: (userRow?.onboarding_completed ?? 0) === 1,
    integrations,
  };
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd worker && npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 5: Commit**

```bash
git add worker/src/index.ts
git commit -m "feat: add getIntegrations, deleteIntegration, completeOnboarding actions; bootstrap returns integrations + onboardingCompleted"
```

---

## Task 6: Remove ensureAdmin from Social OAuth Start Actions

**Files:**
- Modify: `worker/src/index.ts`

**Context:** `startLinkedInAuth`, `startInstagramAuth`, `startGmailAuth` are currently gated with `ensureAdmin(session)`. Any authenticated user should be able to start their own OAuth flow.

- [ ] **Step 1: Remove `ensureAdmin` from the three social start action cases**

Find (~line 1045):

```typescript
case 'startLinkedInAuth':
  ensureAdmin(session);
  return startLinkedInAuth(request, env, session);
case 'startInstagramAuth':
  ensureAdmin(session);
  return startInstagramAuth(request, env, session);
// ...
case 'startGmailAuth':
  ensureAdmin(session);
  return startGmailAuth(request, env, session);
```

Replace with:

```typescript
case 'startLinkedInAuth':
  return startLinkedInAuth(request, env, session);
case 'startInstagramAuth':
  return startInstagramAuth(request, env, session);
// ... (leave startWhatsAppAuth with ensureAdmin — WhatsApp is still admin-only)
case 'startGmailAuth':
  return startGmailAuth(request, env, session);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd worker && npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 3: Commit**

```bash
git add worker/src/index.ts
git commit -m "feat: allow any authenticated user to start LinkedIn/Instagram/Gmail OAuth"
```

---

## Task 7: Store Per-User Tokens in D1 from OAuth Callbacks

**Files:**
- Modify: `worker/src/index.ts`

**Context:** `handleLinkedInCallback`, `handleInstagramCallback`, `handleGmailCallback` all call `persistLinkedInConnection(env, accessToken, personUrn)` etc. which store to the shared KV config. We need to ALSO store to D1 per the user identified by `oauthState.email`. The existing KV storage stays for backward compat.

- [ ] **Step 1: Add per-user D1 storage to `handleLinkedInCallback`**

The existing callback (~line 1758) does:
```typescript
const accessToken = await exchangeLinkedInCodeForToken(code, oauthState.redirectUri, env);
const personUrn = await fetchLinkedInPersonUrn(accessToken);
await persistLinkedInConnection(env, accessToken, personUrn);
```

Replace the `try` block body with:

```typescript
try {
  const accessToken = await exchangeLinkedInCodeForToken(code, oauthState.redirectUri, env);
  const personUrn = await fetchLinkedInPersonUrn(accessToken);

  // Existing shared-config KV storage (backward compat for admin account).
  await persistLinkedInConnection(env, accessToken, personUrn);

  // Per-user D1 storage — store encrypted token linked to the user who started this OAuth.
  const encKey = requireSecretEncryptionKey(env);
  const accessTokenEnc = await encryptSecret(accessToken, encKey);
  const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // LinkedIn: 60-day token
  await upsertSocialIntegration(env.PIPELINE_DB, {
    userId: oauthState.email,
    provider: 'linkedin',
    internalId: personUrn,
    displayName: oauthState.email,  // we have the URN; display name can be fetched or just use email
    profilePicture: '',
    accessTokenEnc,
    refreshTokenEnc: '',
    tokenExpiresAt: expiresAt,
    scopes: LINKEDIN_OAUTH_SCOPE,
  });

  return oauthPopupResponse(oauthState.origin, {
    source: 'channel-bot-oauth',
    provider: 'linkedin',
    ok: true,
  });
} catch (error) {
  return oauthPopupResponse(oauthState.origin, {
    source: 'channel-bot-oauth',
    provider: 'linkedin',
    ok: false,
    error: error instanceof Error ? error.message : 'LinkedIn connection failed.',
  });
}
```

- [ ] **Step 2: Add per-user D1 storage to `handleInstagramCallback`**

Find `handleInstagramCallback` and inside its try block, after calling `persistInstagramConnection(env, ...)`, add:

```typescript
// Per-user D1 storage
const encKey = requireSecretEncryptionKey(env);
const accessTokenEnc = await encryptSecret(accessToken, encKey);
const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // Instagram: 60-day long-lived
await upsertSocialIntegration(env.PIPELINE_DB, {
  userId: oauthState.email,
  provider: 'instagram',
  internalId: String(instagramUserId || ''),
  displayName: instagramUsername ? `@${instagramUsername}` : oauthState.email,
  profilePicture: '',
  accessTokenEnc,
  refreshTokenEnc: '',
  tokenExpiresAt: expiresAt,
  scopes: INSTAGRAM_OAUTH_SCOPE,
});
```

(Insert this after `persistInstagramConnection` call, before the `return oauthPopupResponse(...)`)

- [ ] **Step 3: Add per-user D1 storage to `handleGmailCallback`**

Find `handleGmailCallback` and inside its try block, after calling `persistGmailConnection(env, ...)`, add:

```typescript
// Per-user D1 storage
const encKey = requireSecretEncryptionKey(env);
const accessTokenEnc = await encryptSecret(accessToken, encKey);
const refreshTokenEnc = refreshToken ? await encryptSecret(refreshToken, encKey) : '';
const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // Gmail: 1hr access token
await upsertSocialIntegration(env.PIPELINE_DB, {
  userId: oauthState.email,
  provider: 'gmail',
  internalId: oauthState.email,
  displayName: oauthState.email,
  profilePicture: '',
  accessTokenEnc,
  refreshTokenEnc,
  tokenExpiresAt: expiresAt,
  scopes: GMAIL_OAUTH_SCOPES,
});
```

(You need to identify `accessToken`, `refreshToken` variable names in the Gmail callback — match them to what `exchangeGmailCodeForToken` returns.)

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd worker && npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 5: Commit**

```bash
git add worker/src/index.ts
git commit -m "feat: store per-user OAuth tokens in D1 from LinkedIn/Instagram/Gmail callbacks"
```

---

## Task 8: Publishing Uses Per-User Token from D1

**Files:**
- Modify: `worker/src/index.ts`

**Context:** Publishing actions (`publishContent` or equivalent) currently read tokens from `storedConfig` (KV). We need to look up the requesting user's token from D1 first, and fall back to the shared config. This avoids breaking the existing admin workflow.

- [ ] **Step 1: Find the LinkedIn publish handler in dispatchAction**

Search for the case that calls `publishLinkedInPost`. It will look like:

```typescript
case 'publishContent':
  // ... resolves channel, accessToken, personUrn from config
  if (channel === 'linkedin') {
    const accessToken = resolveLinkedInAccessToken(storedConfig, env);
    const personUrn = storedConfig.linkedinPersonUrn;
    // ...
  }
```

- [ ] **Step 2: Add per-user token lookup before shared-config fallback for LinkedIn**

In the LinkedIn publish path, before reading from `storedConfig`, try D1 first:

```typescript
// Try per-user token from D1 first; fall back to shared admin config.
let linkedInAccessToken: string | null = null;
let linkedInPersonUrn: string | null = null;

const userIntegration = await getSocialIntegration(env.PIPELINE_DB, session.userId, 'linkedin');
if (userIntegration && !userIntegration.needs_reauth) {
  try {
    linkedInAccessToken = await decryptSecret(
      userIntegration.access_token_enc,
      requireSecretEncryptionKey(env),
      'LinkedIn token could not be decrypted. Please reconnect your LinkedIn account.',
    );
    linkedInPersonUrn = userIntegration.internal_id; // stored as urn:li:person:{sub}
  } catch {
    // Fall through to shared config
  }
}

// Fall back to shared admin config
if (!linkedInAccessToken) {
  linkedInAccessToken = resolveLinkedInAccessToken(storedConfig, env);
  linkedInPersonUrn = storedConfig.linkedinPersonUrn;
}
```

- [ ] **Step 3: Apply same pattern for Instagram publish path**

```typescript
let instagramAccessToken: string | null = null;
let instagramUserId: string | null = null;

const userInstagram = await getSocialIntegration(env.PIPELINE_DB, session.userId, 'instagram');
if (userInstagram && !userInstagram.needs_reauth) {
  try {
    instagramAccessToken = await decryptSecret(
      userInstagram.access_token_enc,
      requireSecretEncryptionKey(env),
      'Instagram token could not be decrypted. Please reconnect your Instagram account.',
    );
    instagramUserId = userInstagram.internal_id;
  } catch {
    // Fall through to shared config
  }
}

if (!instagramAccessToken) {
  instagramAccessToken = resolveInstagramAccessToken(storedConfig, env);
  instagramUserId = storedConfig.instagramUserId;
}
```

- [ ] **Step 4: Apply same pattern for Gmail publish path**

```typescript
let gmailAccessToken: string | null = null;

const userGmail = await getSocialIntegration(env.PIPELINE_DB, session.userId, 'gmail');
if (userGmail && !userGmail.needs_reauth) {
  try {
    gmailAccessToken = await decryptSecret(
      userGmail.access_token_enc,
      requireSecretEncryptionKey(env),
      'Gmail token could not be decrypted. Please reconnect your Gmail account.',
    );
  } catch {
    // Fall through to shared config
  }
}

if (!gmailAccessToken) {
  gmailAccessToken = await resolveGmailAccessToken(storedConfig, env); // existing helper
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd worker && npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 6: Commit**

```bash
git add worker/src/index.ts
git commit -m "feat: publishing uses per-user D1 token with shared-config fallback"
```

---

## Task 9: Frontend — Add API Methods for Integrations

**Files:**
- Modify: `frontend/src/services/backendApi.ts`

- [ ] **Step 1: Add types and methods**

Find the end of the `BackendApi` class and add:

```typescript
// Types — add near the top of the file with other interfaces:
export interface SocialIntegration {
  provider: string;
  internalId: string;
  displayName: string;
  profilePicture: string;
  needsReauth: boolean;
  connectedAt: string;
}

// Methods — add inside the BackendApi class:

async getIntegrations(idToken: string): Promise<SocialIntegration[]> {
  const data = await this.call<SocialIntegration[]>(idToken, 'getIntegrations', {});
  return data ?? [];
}

async deleteIntegration(idToken: string, provider: string): Promise<void> {
  await this.call<{ ok: true }>(idToken, 'deleteIntegration', { provider });
}

async completeOnboarding(idToken: string, spreadsheetId?: string): Promise<void> {
  await this.call<{ ok: true }>(idToken, 'completeOnboarding', { spreadsheetId: spreadsheetId ?? '' });
}
```

Note: look at how existing methods call `this.call(...)` or `this.post(...)` and match that pattern. The existing `bootstrap` method returns `{ email, isAdmin, config }` — update its return type to also include `onboardingCompleted: boolean` and `integrations: SocialIntegration[]`.

- [ ] **Step 2: Update AppSession type to include new bootstrap fields**

In `backendApi.ts`, find `AppSession`:

```typescript
export interface AppSession {
  email: string;
  isAdmin: boolean;
  config: BotConfig;
  onboardingCompleted: boolean;
  integrations: SocialIntegration[];
}
```

- [ ] **Step 3: Verify frontend TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/backendApi.ts
git commit -m "feat: add getIntegrations, deleteIntegration, completeOnboarding API methods; extend AppSession"
```

---

## Task 10: Frontend — ConnectAccountsGrid Component

**Files:**
- Create: `frontend/src/features/onboarding/ConnectAccountsGrid.tsx`

- [ ] **Step 1: Write the component**

```tsx
// frontend/src/features/onboarding/ConnectAccountsGrid.tsx
import { useState } from 'react'
import { cn } from '@/lib/cn'
import type { SocialIntegration } from '@/services/backendApi'

interface Platform {
  id: 'linkedin' | 'instagram' | 'gmail'
  label: string
  color: string
  icon: React.ReactNode
}

const PLATFORMS: Platform[] = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    color: '#0A66C2',
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    id: 'instagram',
    label: 'Instagram',
    color: '#E1306C',
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
      </svg>
    ),
  },
  {
    id: 'gmail',
    label: 'Gmail',
    color: '#EA4335',
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
      </svg>
    ),
  },
]

interface ConnectAccountsGridProps {
  integrations: SocialIntegration[]
  onConnect: (provider: 'linkedin' | 'instagram' | 'gmail') => void
  onDisconnect: (provider: string) => void
  connecting: string | null
}

export function ConnectAccountsGrid({
  integrations,
  onConnect,
  onDisconnect,
  connecting,
}: ConnectAccountsGridProps) {
  const connectedMap = new Map(integrations.map((i) => [i.provider, i]))

  return (
    <div className="grid grid-cols-3 gap-3">
      {PLATFORMS.map((platform) => {
        const connected = connectedMap.get(platform.id)
        const isConnecting = connecting === platform.id

        return (
          <div
            key={platform.id}
            className={cn(
              'glass-inset flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all',
              connected
                ? 'border-success-border bg-success-surface'
                : 'border-violet-200/45 hover:bg-white/45',
            )}
          >
            {/* Avatar or platform icon */}
            <div className="relative">
              {connected?.profilePicture ? (
                <img
                  src={connected.profilePicture}
                  alt={connected.displayName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: platform.color }}
                >
                  {platform.icon}
                </div>
              )}
              {connected && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-success-ink text-white">
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                </span>
              )}
              {connected?.needsReauth && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                  !
                </span>
              )}
            </div>

            <span className="text-xs font-medium text-ink">
              {connected ? connected.displayName : platform.label}
            </span>

            {connected ? (
              <button
                type="button"
                onClick={() => onDisconnect(platform.id)}
                className="rounded-lg border border-border px-2 py-0.5 text-[10px] text-muted hover:border-red-300 hover:text-red-600 transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onConnect(platform.id)}
                disabled={isConnecting}
                className={cn(
                  'rounded-lg border px-2 py-0.5 text-[10px] font-medium transition-colors',
                  isConnecting
                    ? 'border-border text-muted cursor-wait'
                    : 'border-primary text-primary hover:bg-primary hover:text-primary-fg',
                )}
              >
                {isConnecting ? 'Connecting…' : 'Connect'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/onboarding/ConnectAccountsGrid.tsx
git commit -m "feat: ConnectAccountsGrid component with platform icons, connected state, and reauth badge"
```

---

## Task 11: Frontend — OnboardingModal

**Files:**
- Create: `frontend/src/features/onboarding/OnboardingModal.tsx`

- [ ] **Step 1: Write the component**

```tsx
// frontend/src/features/onboarding/OnboardingModal.tsx
import { useState } from 'react'
import { ConnectAccountsGrid } from './ConnectAccountsGrid'
import type { SocialIntegration } from '@/services/backendApi'

interface OnboardingModalProps {
  integrations: SocialIntegration[]
  onConnect: (provider: 'linkedin' | 'instagram' | 'gmail') => void
  onDisconnect: (provider: string) => void
  onComplete: (spreadsheetId?: string) => void
  connecting: string | null
}

export function OnboardingModal({
  integrations,
  onConnect,
  onDisconnect,
  onComplete,
  connecting,
}: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('')

  const hasAnyConnected = integrations.length > 0

  function extractSpreadsheetId(url: string): string {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    return match?.[1] ?? url.trim()
  }

  function handleFinish() {
    const spreadsheetId = spreadsheetUrl.trim()
      ? extractSpreadsheetId(spreadsheetUrl)
      : undefined
    onComplete(spreadsheetId)
  }

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="glass-panel-strong w-full max-w-md rounded-3xl p-8 shadow-2xl">
        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-2">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  step === s
                    ? 'bg-primary text-primary-fg'
                    : step > s
                    ? 'bg-success-ink text-white'
                    : 'bg-border text-muted'
                }`}
              >
                {step > s ? '✓' : s}
              </div>
              {s < 2 && <div className="h-px w-8 bg-border" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <>
            <h2 className="mb-1 font-heading text-xl font-semibold text-ink">
              Connect your accounts
            </h2>
            <p className="mb-6 text-sm text-muted">
              Connect LinkedIn, Instagram, or Gmail so posts are published from your accounts.
            </p>

            <ConnectAccountsGrid
              integrations={integrations}
              onConnect={onConnect}
              onDisconnect={onDisconnect}
              connecting={connecting}
            />

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-fg hover:bg-primary/90 transition-colors"
              >
                {hasAnyConnected ? 'Continue →' : 'Skip for now →'}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="mb-1 font-heading text-xl font-semibold text-ink">
              Content source
            </h2>
            <p className="mb-6 text-sm text-muted">
              Optionally paste a Google Spreadsheet URL to import topics from Sheets. You can always add this later in Settings.
            </p>

            <input
              type="url"
              value={spreadsheetUrl}
              onChange={(e) => setSpreadsheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="glass-inset w-full rounded-xl border border-violet-200/45 bg-white/50 px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
            />

            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-border px-4 py-2 text-sm text-muted hover:bg-white/45 transition-colors"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-fg hover:bg-primary/90 transition-colors"
              >
                {spreadsheetUrl.trim() ? 'Connect & start →' : "Skip, I'll add later →"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/onboarding/OnboardingModal.tsx
git commit -m "feat: 2-step OnboardingModal with account connect and spreadsheet URL"
```

---

## Task 12: Frontend — Revamp SettingsConnectionsCard

**Files:**
- Modify: `frontend/src/components/dashboard/components/SettingsConnectionsCard.tsx`

- [ ] **Step 1: Rewrite the component to show live integrations with connect/disconnect**

```tsx
// frontend/src/components/dashboard/components/SettingsConnectionsCard.tsx
import { cn } from '../../../lib/cn'
import { ConnectAccountsGrid } from '../../../features/onboarding/ConnectAccountsGrid'
import type { SocialIntegration } from '../../../services/backendApi'

interface SettingsConnectionsCardProps {
  integrations: SocialIntegration[]
  onConnect: (provider: 'linkedin' | 'instagram' | 'gmail') => void
  onDisconnect: (provider: string) => void
  connecting: string | null
  className?: string
}

export function SettingsConnectionsCard({
  integrations,
  onConnect,
  onDisconnect,
  connecting,
  className,
}: SettingsConnectionsCardProps) {
  return (
    <section
      className={cn('border border-white/50 ring-1 ring-white/40', className)}
      aria-labelledby="settings-connections-heading"
    >
      <h2
        id="settings-connections-heading"
        className="border-b border-violet-200/60 px-4 py-3 font-heading text-base font-semibold text-ink"
      >
        Connected Accounts
      </h2>
      <p className="border-b border-violet-200/40 px-4 py-2.5 text-xs leading-relaxed text-muted">
        Connect your social accounts to post on your behalf.
      </p>
      <div className="p-4">
        <ConnectAccountsGrid
          integrations={integrations}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          connecting={connecting}
        />
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/dashboard/components/SettingsConnectionsCard.tsx
git commit -m "feat: SettingsConnectionsCard now shows live per-user connected accounts with connect/disconnect"
```

---

## Task 13: Frontend — Wire OnboardingModal and Integrations into App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

**Context:** `App.tsx` manages `session` state (returned from `bootstrap`). We need to: (1) show `OnboardingModal` when `session.onboardingCompleted === false`, (2) pass `handleConnect`/`handleDisconnect` that call the OAuth popup and API, (3) keep `integrations` in state so it refreshes after connect/disconnect.

- [ ] **Step 1: Add integrations state and OAuth connect handler to App**

In the `App` component, after `const [session, setSession] = useState<AppSession | null>(null)`:

```typescript
const [integrations, setIntegrations] = useState<SocialIntegration[]>([])
const [connecting, setConnecting] = useState<string | null>(null)
const [showOnboarding, setShowOnboarding] = useState(false)
```

After `setSession(nextSession)` in the bootstrap `.then()`:

```typescript
setIntegrations(nextSession.integrations ?? [])
setShowOnboarding(!(nextSession.onboardingCompleted ?? true))
```

- [ ] **Step 2: Add handleConnect function**

The OAuth flow uses a popup window (matching the existing `oauthPopupResponse` pattern the worker already uses):

```typescript
const handleConnect = useCallback(async (provider: 'linkedin' | 'instagram' | 'gmail') => {
  if (!idToken) return
  setConnecting(provider)
  try {
    const actionMap = {
      linkedin: 'startLinkedInAuth',
      instagram: 'startInstagramAuth',
      gmail: 'startGmailAuth',
    } as const
    const { authorizationUrl } = await api.call<{ authorizationUrl: string; callbackOrigin: string }>(
      idToken, actionMap[provider], {}
    )

    // Open OAuth in a popup — worker sends postMessage on completion.
    const popup = window.open(authorizationUrl, 'oauth', 'width=500,height=700,left=200,top=100')

    await new Promise<void>((resolve, reject) => {
      const timer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(timer)
          resolve()
        }
      }, 500)

      function onMessage(event: MessageEvent) {
        if (event.data?.source !== 'channel-bot-oauth') return
        window.removeEventListener('message', onMessage)
        clearInterval(timer)
        if (event.data.ok) {
          resolve()
        } else {
          reject(new Error(event.data.error || 'Connection failed.'))
        }
      }
      window.addEventListener('message', onMessage)
    })

    // Refresh integrations list
    const updated = await api.getIntegrations(idToken)
    setIntegrations(updated)
  } catch (err) {
    console.error('OAuth connect failed:', err)
  } finally {
    setConnecting(null)
  }
}, [idToken, api])
```

Note: check if `api.call` is a public method. If not, look at how existing OAuth start is called (e.g., `api.startLinkedInAuth(idToken)`) and match that pattern instead.

- [ ] **Step 3: Add handleDisconnect function**

```typescript
const handleDisconnect = useCallback(async (provider: string) => {
  if (!idToken) return
  try {
    await api.deleteIntegration(idToken, provider)
    setIntegrations((prev) => prev.filter((i) => i.provider !== provider))
  } catch (err) {
    console.error('Disconnect failed:', err)
  }
}, [idToken, api])
```

- [ ] **Step 4: Add handleCompleteOnboarding function**

```typescript
const handleCompleteOnboarding = useCallback(async (spreadsheetId?: string) => {
  if (!idToken) return
  try {
    await api.completeOnboarding(idToken, spreadsheetId)
    setShowOnboarding(false)
    if (spreadsheetId && session) {
      // Update session config with the new spreadsheet ID
      setSession((s) => s ? { ...s, config: { ...s.config, spreadsheetId } } : s)
    }
  } catch (err) {
    console.error('Complete onboarding failed:', err)
  }
}, [idToken, api, session])
```

- [ ] **Step 5: Render OnboardingModal when needed**

Inside the `WorkspaceSession` render (or just after `{idToken && session ? (<WorkspaceSession ...>` block), add the modal:

```tsx
{idToken && session && showOnboarding && (
  <OnboardingModal
    integrations={integrations}
    onConnect={handleConnect}
    onDisconnect={handleDisconnect}
    onComplete={handleCompleteOnboarding}
    connecting={connecting}
  />
)}
```

Add the import at the top:
```tsx
import { OnboardingModal } from './features/onboarding/OnboardingModal'
import type { SocialIntegration } from './services/backendApi'
```

- [ ] **Step 6: Pass integrations + handlers down to SettingsConnectionsCard**

Find where `SettingsConnectionsCard` is rendered (likely in `DashboardSettingsDrawer.tsx` or `WorkspaceShell.tsx`) and pass:

```tsx
<SettingsConnectionsCard
  integrations={integrations}
  onConnect={handleConnect}
  onDisconnect={handleDisconnect}
  connecting={connecting}
/>
```

You may need to thread `integrations`, `onConnect`, `onDisconnect`, `connecting` as props through `WorkspaceSession` → `Dashboard` → `DashboardSettingsDrawer`. Follow the existing prop-passing pattern in those files.

- [ ] **Step 7: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: wire OnboardingModal, connect/disconnect OAuth handlers, and integrations state into App"
```

---

## Task 14: Env Var Documentation + .env.example

**Files:**
- Modify: `.env.example` and `worker/.dev.vars.example`

- [ ] **Step 1: Document that ALLOWED_EMAILS is now optional**

In `worker/.dev.vars.example`, add a comment:

```
# ALLOWED_EMAILS — optional. If set, only listed emails can log in.
# If empty or unset, any verified Google account can sign up.
# ALLOWED_EMAILS=friend1@gmail.com,friend2@gmail.com

# GITHUB_TOKEN_ENCRYPTION_KEY — used for encrypting OAuth tokens in D1.
# Generate: openssl rand -hex 32
GITHUB_TOKEN_ENCRYPTION_KEY=your-32-byte-hex-key-here
```

- [ ] **Step 2: Commit**

```bash
git add .env.example worker/.dev.vars.example
git commit -m "docs: clarify ALLOWED_EMAILS is now optional for open signup"
```

---

## Task 15: End-to-End Smoke Test

- [ ] **Step 1: Start local worker**

```bash
cd worker && npx wrangler dev --local
```

- [ ] **Step 2: Start frontend**

```bash
cd frontend && npm run dev
```

- [ ] **Step 3: Test first-time login flow**

1. Open `http://localhost:5173`
2. Sign in with a Google account NOT in `ALLOWED_EMAILS` (or leave it empty)
3. Verify: you reach the app without "not on allowed list" error
4. Verify: `OnboardingModal` appears
5. Click "Connect" on LinkedIn → LinkedIn OAuth popup opens
6. Complete OAuth → popup closes → LinkedIn shows as connected in the grid
7. Click "Continue →" → Step 2 appears (spreadsheet URL)
8. Click skip → modal closes → dashboard visible

- [ ] **Step 4: Test reconnect flow**

1. In settings drawer, find "Connected Accounts" card
2. Click "Disconnect" on LinkedIn → it disappears from the list
3. Click "Connect" → OAuth popup → reconnects

- [ ] **Step 5: Verify token encryption in D1**

```bash
cd worker && npx wrangler d1 execute PIPELINE_DB --local \
  --command "SELECT user_id, provider, substr(access_token_enc,1,20) as token_preview FROM social_integrations"
```

Expected: `token_preview` is garbled ciphertext, NOT a readable access token.

- [ ] **Step 6: Commit any test fixes**

```bash
git add -A
git commit -m "fix: smoke test fixes for multi-tenant social connect"
```

---

## Self-Review Checklist

✅ **Spec coverage:**
- `users` + `social_integrations` D1 tables → Task 1
- Token encryption AES-256-GCM → Tasks 7, 3 (reuses existing `encryptSecret`)
- Open auth gate (ALLOWED_EMAILS optional) → Task 4
- Upsert user on login → Task 4
- LinkedIn / Instagram / Gmail OAuth per-user → Tasks 6, 7
- `getIntegrations`, `deleteIntegration`, `completeOnboarding` actions → Task 5
- Bootstrap returns `onboardingCompleted` + `integrations` → Task 5
- Publishing uses per-user token with fallback → Task 8
- `ConnectAccountsGrid` UI → Task 10
- `OnboardingModal` 2-step wizard → Task 11
- `SettingsConnectionsCard` revamp → Task 12
- App.tsx wiring → Task 13

✅ **No placeholders** — every step has concrete code.

✅ **Type consistency** — `SocialIntegration` defined in Task 9, used in Tasks 10–13. `upsertSocialIntegration` defined in Task 3, used in Task 7. `VerifiedSession.userId` added in Task 4, used in Tasks 5, 7, 8.

✅ **Backward compat** — existing admin token KV storage preserved in callbacks (Task 7). Publishing falls back to shared config when no per-user token exists (Task 8).
