# Design: Connections Page + D1 Primary Storage + Sheets Sync

**Date:** 2026-04-06
**Status:** Approved for implementation

---

## Overview

Two sequenced projects:

1. **Project 1 — Connections Page + 403 Fix**: Add a `/connections` workspace page for tenants to manage all integrations. Fix Google Sheets 403 via auto-share using the user's Drive access token.
2. **Project 2 — D1 as Primary Storage + Sheets Sync**: Move topics/drafts/posts to D1 as the source of truth. Google Sheets becomes an optional sync target.

---

## Project 1: Connections Page + 403 Fix

### Worker Changes

**3 new actions in `worker/src/index.ts`:**

- `connectSpreadsheet(spreadsheetId, driveAccessToken)` — Uses user's Drive access token to POST to `drive.permissions.create` adding the service account email as editor. Then verifies with the service account. Stores `spreadsheetId` in the `users` table on success. Returns `{ ok: true, title: string }` or throws with a descriptive error.
- `getSpreadsheetStatus()` — Returns `{ accessible: boolean, title?: string }` by attempting a Sheets read with the service account. Used by the connections page for health checks.
- `getServiceAccountEmail()` — Extracts `client_email` from `GOOGLE_SERVICE_ACCOUNT_JSON`. Returned as fallback when Drive consent is denied so user can share manually.

**Helper:** `worker/src/google/drivePermissions.ts` — `shareFileWithServiceAccount(spreadsheetId, driveAccessToken, serviceAccountEmail)` calls `https://www.googleapis.com/drive/v3/files/{id}/permissions`.

### Frontend Changes

**New workspace page `/connections`:**
- Added to `WorkspaceNavPage` type in `AppSidebar.tsx`
- Sidebar icon: `PlugZap`, label: "Connections"
- Added to `workspaceRoutes.ts` and router in `dashboard/index.tsx`
- Added to `PAGE_TITLES` in `WorkspaceHeader.tsx`

**`frontend/src/pages/ConnectionsPage.tsx`:**
- Section 1: **Google Workspace** — `SheetConnectionCard` showing spreadsheet name/status, Connect/Change/Verify/Disconnect actions
- Section 2: **Social Accounts** — grid of `SocialAccountCard` for LinkedIn, Instagram, Gmail, Telegram, WhatsApp

**`SheetConnectionCard.tsx`:**
- Status: Connected (green) / Not Connected / Permission Error (yellow "Re-authorize")
- Connect/Change triggers Drive consent → `connectSpreadsheet` action
- If Drive consent denied: shows service account email with copy button + manual instructions + Verify button

**`SocialAccountCard.tsx`:**
- Shows provider icon, connected account avatar/name
- Status badge: Connected / Needs Reauth / Not Connected
- Actions: Connect / Disconnect / Switch Account / Re-authorize

**Drive consent flow:**
- Uses `useGoogleLogin` hook from `@react-oauth/google` with `scope: 'https://www.googleapis.com/auth/drive'`
- Triggered only when connecting a sheet — not at sign-in
- Access token is short-lived, sent directly to `connectSpreadsheet`, never stored

**Updated `OnboardingModal.tsx`:**
- Step 2 (Connect Sheet) triggers Drive consent → `connectSpreadsheet`
- Fallback: if consent denied, show service account email + copy button + Verify button
- On successful onboarding, navigate to `/connections` page

**`backendApi.ts` additions:**
- `connectSpreadsheet(idToken, spreadsheetId, driveAccessToken)`
- `getSpreadsheetStatus(idToken)`
- `getServiceAccountEmail(idToken)`

---

## Project 2: D1 as Primary Storage + Sheets Sync

### New D1 Tables (migration file `worker/migrations/0009_topics_drafts.sql`)

```sql
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  topic_id TEXT UNIQUE NOT NULL,
  topic TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  row_index INTEGER,
  variant1 TEXT DEFAULT '', variant2 TEXT DEFAULT '',
  variant3 TEXT DEFAULT '', variant4 TEXT DEFAULT '',
  image_link1 TEXT DEFAULT '', image_link2 TEXT DEFAULT '',
  image_link3 TEXT DEFAULT '', image_link4 TEXT DEFAULT '',
  selected_text TEXT DEFAULT '',
  selected_image_id TEXT DEFAULT '',
  selected_image_urls_json TEXT DEFAULT '',
  post_time TEXT DEFAULT '',
  email_to TEXT DEFAULT '', email_cc TEXT DEFAULT '',
  email_bcc TEXT DEFAULT '', email_subject TEXT DEFAULT '',
  topic_rules TEXT DEFAULT '',
  generation_template_id TEXT DEFAULT '',
  delivery_channel TEXT DEFAULT '',
  generation_model TEXT DEFAULT '',
  published_at TEXT,
  pattern_id TEXT DEFAULT '', pattern_name TEXT DEFAULT '',
  pattern_rationale TEXT DEFAULT '',
  content_review_fingerprint TEXT DEFAULT '',
  content_review_at TEXT DEFAULT '',
  content_review_json TEXT DEFAULT '',
  generation_run_id TEXT DEFAULT '',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (topic_id) REFERENCES topics(topic_id)
);

CREATE INDEX IF NOT EXISTS idx_topics_user_id ON topics(user_id);
CREATE INDEX IF NOT EXISTS idx_drafts_topic_id ON drafts(topic_id);
CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON drafts(user_id);
```

### Storage Abstraction (`worker/src/persistence/store.ts`)

```typescript
interface ITopicStore {
  listRows(userId: string, spreadsheetId?: string): Promise<SheetRow[]>;
  upsertRow(userId: string, row: SheetRow): Promise<void>;
  deleteRow(userId: string, topicId: string): Promise<void>;
  moveRow(userId: string, topicId: string, targetSheet: ManagedSheetName): Promise<void>;
}
```

Implementations:
- `D1TopicStore` — reads/writes `topics` + `drafts` tables; maps to `SheetRow` shape
- `SheetsTopicStore` — existing Sheets logic refactored behind the interface
- `RouterTopicStore` — always reads/writes D1; if tenant has `spreadsheetId` configured, async fire-and-forget write-through to Sheets (errors logged, not thrown)

### Sheets Sync Behavior

- **Write-through**: every D1 write triggers a background Sheets write (`waitUntil` in CF Workers)
- **Pull sync**: "Refresh" action calls `syncFromSheets()` — reads entire sheet, upserts all rows into D1 using `topic_id` as stable key
- **No sheet connected**: D1 only, Sheets writes no-op silently

### Migration for Existing Tenants

`migrateSheetToD1(db, sheetsGateway, userId, spreadsheetId)`:
- Runs on first `getQueue`/`bootstrap` call if tenant has `spreadsheetId` but zero D1 topics
- Reads all rows from all managed sheets (Topics, Draft, Post)
- Upserts into D1 topics + drafts tables
- Sets a `sheet_migrated_at` column in `users` table to prevent re-running
- Idempotent: keyed on `topic_id`

### Impact on Existing Code Paths

All direct `SheetsGateway` calls in `index.ts` for queue/row operations are replaced with `RouterTopicStore`:
- `getQueue` → `store.listRows()`
- `moveToDraft`, `moveToPost` → `store.moveRow()`
- `saveVariants`, `saveSelectedText` → `store.upsertRow()`
- Scheduler read/write → `store.listRows()` / `store.upsertRow()`
- Publish flow → reads from `store`, writes back via `store.upsertRow()`

`SheetsGateway` is retained but only used by `RouterTopicStore` for sync, not called directly from `index.ts`.

### Tenant Without Sheet

- `getQueue` returns D1 rows even if no `spreadsheetId`
- All actions that previously threw "spreadsheet not configured" now check D1 first
- `ensureSpreadsheetConfigured()` guard is replaced with `ensureDataAccessible()` which passes for D1-only tenants
- The connections page shows "Google Sheets: Not connected" with an optional Connect button

---

## Sequencing

1. Project 1 ships first (Connections page, 403 fix, Drive consent)
2. Project 2 migration runs behind Project 1 (D1 tables, store abstraction, migration)
3. Once Project 2 is live, `ensureSpreadsheetConfigured` guards are removed from actions that don't require Sheets specifically

---

## Out of Scope

- Bidirectional real-time sync (Sheets webhook → D1)
- Sheet creation by the service account on behalf of the tenant
- Conflict resolution for concurrent D1 + Sheets edits (last-write-wins)
