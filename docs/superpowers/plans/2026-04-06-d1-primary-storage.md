# D1 Primary Storage + Sheets Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make D1 the primary data store for topics/drafts so tenants without a Google Sheet get full functionality. Google Sheets becomes an optional write-through sync target.

**Architecture:** The existing `pipeline_state` D1 table already stores all row fields keyed by `(spreadsheet_id, topic_key)`. We rebuild it with `(user_id, topic_id)` as the primary key so no-sheet tenants can store data. The `PipelineStore` grows a D1-only read path. All write operations write to D1 first, then fire-and-forget to Sheets if configured. The `ensureSpreadsheetConfigured` guard is removed from every action that only needs data access (not Sheets-specific ops like template listing).

**Tech Stack:** Cloudflare Workers, D1/SQLite, TypeScript. No new frontend dependencies.

---

## Background: Current Architecture

- `pipeline_state` already mirrors all `SheetRow` fields (variant1–4, image_link1–4, etc.)
- `getMergedRows(sheets, spreadsheetId)` reads Topics from Sheets → merges with D1 cache
- All write ops (`saveDraftVariants`, `updateRowStatus`, etc.) write to D1 AND Sheets
- Primary key is `(spreadsheet_id, topic_key)` — breaks for tenants with no sheet
- `ensureSpreadsheetConfigured` blocks every data action when no sheet set

---

## File Map

**Create:**
- `worker/migrations/0010_pipeline_user_primary.sql` — rebuild `pipeline_state` with `user_id` PK

**Modify:**
- `worker/src/persistence/pipeline-db/types.ts` — add `user_id` to `PipelineStateDbRow`
- `worker/src/persistence/pipeline-db/pipeline.ts` — add D1-only read/write paths
- `worker/src/persistence/drafts.ts` — make Sheets writes optional (check spreadsheetId before calling)
- `worker/src/index.ts` — remove `ensureSpreadsheetConfigured` from data actions; thread `userId` into pipeline calls; add `syncFromSheets` action; add D1-native `addTopic` path

---

## Task 1: D1 migration — rebuild pipeline_state with user_id primary key

**Files:**
- Create: `worker/migrations/0010_pipeline_user_primary.sql`

- [ ] **Write the migration**

```sql
-- worker/migrations/0010_pipeline_user_primary.sql
-- Rebuild pipeline_state with user_id as part of the primary key.
-- This allows tenants without a Google Sheet to store rows keyed by user_id + topic_id.

CREATE TABLE IF NOT EXISTS pipeline_state_new (
  user_id TEXT NOT NULL DEFAULT '',
  spreadsheet_id TEXT NOT NULL DEFAULT '',
  topic_id TEXT NOT NULL DEFAULT '',
  topic_key TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Pending',
  variant1 TEXT NOT NULL DEFAULT '',
  variant2 TEXT NOT NULL DEFAULT '',
  variant3 TEXT NOT NULL DEFAULT '',
  variant4 TEXT NOT NULL DEFAULT '',
  image_link1 TEXT NOT NULL DEFAULT '',
  image_link2 TEXT NOT NULL DEFAULT '',
  image_link3 TEXT NOT NULL DEFAULT '',
  image_link4 TEXT NOT NULL DEFAULT '',
  selected_text TEXT NOT NULL DEFAULT '',
  selected_image_id TEXT NOT NULL DEFAULT '',
  selected_image_urls_json TEXT NOT NULL DEFAULT '',
  post_time TEXT NOT NULL DEFAULT '',
  email_to TEXT NOT NULL DEFAULT '',
  email_cc TEXT NOT NULL DEFAULT '',
  email_bcc TEXT NOT NULL DEFAULT '',
  email_subject TEXT NOT NULL DEFAULT '',
  topic_generation_rules TEXT NOT NULL DEFAULT '',
  generation_template_id TEXT NOT NULL DEFAULT '',
  published_at TEXT,
  topic_delivery_channel TEXT NOT NULL DEFAULT '',
  topic_generation_model TEXT NOT NULL DEFAULT '',
  content_review_fingerprint TEXT NOT NULL DEFAULT '',
  content_review_at TEXT,
  content_review_json TEXT NOT NULL DEFAULT '',
  generation_run_id TEXT NOT NULL DEFAULT '',
  pattern_id TEXT NOT NULL DEFAULT '',
  pattern_name TEXT NOT NULL DEFAULT '',
  pattern_rationale TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, topic_id)
);

-- Copy existing rows; backfill user_id from users table via spreadsheet_id.
-- Rows where user_id cannot be resolved are kept with user_id = spreadsheet_id (fallback).
INSERT OR IGNORE INTO pipeline_state_new
SELECT
  COALESCE(
    (SELECT id FROM users WHERE users.spreadsheet_id = pipeline_state.spreadsheet_id AND users.spreadsheet_id != '' LIMIT 1),
    pipeline_state.spreadsheet_id
  ) AS user_id,
  pipeline_state.spreadsheet_id,
  COALESCE(pipeline_state.topic_id, pipeline_state.topic_key) AS topic_id,
  pipeline_state.topic_key,
  pipeline_state.topic,
  pipeline_state.date,
  pipeline_state.status,
  pipeline_state.variant1,
  pipeline_state.variant2,
  pipeline_state.variant3,
  pipeline_state.variant4,
  pipeline_state.image_link1,
  pipeline_state.image_link2,
  pipeline_state.image_link3,
  pipeline_state.image_link4,
  pipeline_state.selected_text,
  pipeline_state.selected_image_id,
  COALESCE(pipeline_state.selected_image_urls_json, '') AS selected_image_urls_json,
  pipeline_state.post_time,
  pipeline_state.email_to,
  pipeline_state.email_cc,
  pipeline_state.email_bcc,
  pipeline_state.email_subject,
  pipeline_state.topic_generation_rules,
  pipeline_state.generation_template_id,
  pipeline_state.published_at,
  COALESCE(pipeline_state.topic_delivery_channel, '') AS topic_delivery_channel,
  COALESCE(pipeline_state.topic_generation_model, '') AS topic_generation_model,
  COALESCE(pipeline_state.content_review_fingerprint, '') AS content_review_fingerprint,
  pipeline_state.content_review_at,
  COALESCE(pipeline_state.content_review_json, '') AS content_review_json,
  COALESCE(pipeline_state.generation_run_id, '') AS generation_run_id,
  COALESCE(pipeline_state.pattern_id, '') AS pattern_id,
  COALESCE(pipeline_state.pattern_name, '') AS pattern_name,
  COALESCE(pipeline_state.pattern_rationale, '') AS pattern_rationale,
  pipeline_state.created_at,
  pipeline_state.updated_at
FROM pipeline_state;

DROP TABLE pipeline_state;
ALTER TABLE pipeline_state_new RENAME TO pipeline_state;

CREATE INDEX IF NOT EXISTS idx_pipeline_user ON pipeline_state(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_spreadsheet ON pipeline_state(spreadsheet_id) WHERE spreadsheet_id != '';
CREATE INDEX IF NOT EXISTS idx_pipeline_topic_id ON pipeline_state(topic_id);
```

- [ ] **Apply migration locally**

```bash
cd worker && npx wrangler d1 migrations apply linkedin-pipeline-db --local
```

Expected: `✅ Applied 1 migration(s)`

- [ ] **Apply migration remotely**

```bash
npx wrangler d1 migrations apply linkedin-pipeline-db --remote
```

Expected: `✅ Applied 1 migration(s)`

- [ ] **Commit**

```bash
git add worker/migrations/0010_pipeline_user_primary.sql
git commit -m "feat(db): rebuild pipeline_state with user_id primary key for no-sheet tenants"
```

---

## Task 2: Update PipelineStateDbRow type

**Files:**
- Modify: `worker/src/persistence/pipeline-db/types.ts`

- [ ] **Add `user_id` field to the interface**

In `types.ts`, add `user_id: string;` as the first field of `PipelineStateDbRow`:

```typescript
export interface PipelineStateDbRow {
  user_id: string;
  spreadsheet_id: string;
  topic_id: string;
  topic_key: string;
  topic: string;
  date: string;
  status: string;
  variant1: string;
  variant2: string;
  variant3: string;
  variant4: string;
  image_link1: string;
  image_link2: string;
  image_link3: string;
  image_link4: string;
  selected_text: string;
  selected_image_id: string;
  selected_image_urls_json: string;
  post_time: string;
  email_to: string;
  email_cc: string;
  email_bcc: string;
  email_subject: string;
  topic_generation_rules: string;
  generation_template_id: string;
  published_at: string | null;
  topic_delivery_channel: string;
  topic_generation_model: string;
  content_review_fingerprint: string;
  content_review_at: string | null;
  content_review_json: string;
  generation_run_id: string;
  pattern_id: string;
  pattern_name: string;
  pattern_rationale: string;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Type-check**

```bash
cd worker && npx tsc --noEmit
```

Fix any type errors caused by the new field (should be minimal since it's additive).

- [ ] **Commit**

```bash
git add worker/src/persistence/pipeline-db/types.ts
git commit -m "feat(types): add user_id to PipelineStateDbRow"
```

---

## Task 3: Add D1-only read path to PipelineStore

**Files:**
- Modify: `worker/src/persistence/pipeline-db/pipeline.ts`

The current `INSERT_PIPELINE_ROW_SQL` and `getMergedRows` need to be updated to include `user_id`.

- [ ] **Update INSERT SQL** — add `user_id` as the first bind parameter

Find `INSERT_PIPELINE_ROW_SQL` in `pipeline.ts` and update it to include `user_id` as `?1`, shifting all other bind params up by 1:

```typescript
const INSERT_PIPELINE_ROW_SQL = `
INSERT OR REPLACE INTO pipeline_state (
  user_id, spreadsheet_id, topic_id, topic_key, topic, date, status,
  variant1, variant2, variant3, variant4,
  image_link1, image_link2, image_link3, image_link4,
  selected_text, selected_image_id, selected_image_urls_json,
  post_time, email_to, email_cc, email_bcc, email_subject,
  topic_generation_rules, generation_template_id, published_at,
  topic_delivery_channel, topic_generation_model,
  content_review_fingerprint, content_review_at, content_review_json,
  generation_run_id, pattern_id, pattern_name, pattern_rationale
) VALUES (
  ?1, ?2, ?3, ?4, ?5, ?6, ?7,
  ?8, ?9, ?10, ?11,
  ?12, ?13, ?14, ?15,
  ?16, ?17, ?18,
  ?19, ?20, ?21, ?22, ?23,
  ?24, ?25, ?26,
  ?27, ?28,
  ?29, ?30, ?31,
  ?32, ?33, ?34, ?35
)
`;
```

- [ ] **Update all `.bind(...)` calls for INSERT_PIPELINE_ROW_SQL** — wherever this SQL is executed, add `userId` as the first bind argument. Search for all usages:

```bash
grep -n "INSERT_PIPELINE_ROW_SQL\|upsertFull\|upsertRow\|upsertPipelineRow" worker/src/persistence/pipeline-db/pipeline.ts | head -20
```

For each `.bind(...)` call that uses this SQL, prepend `userId` as the first argument. The function signatures for `upsertFull`, `saveDraftVariants`, etc. must also accept `userId: string` as a new first parameter.

- [ ] **Add `getRowsByUserId` method to `PipelineStore`** — D1-only read without needing Sheets:

```typescript
async getRowsByUserId(userId: string): Promise<SheetRow[]> {
  const { results } = await this.db
    .prepare(
      `SELECT * FROM pipeline_state WHERE user_id = ?1 ORDER BY date ASC, topic ASC`,
    )
    .bind(userId)
    .all<PipelineStateDbRow>();
  return (results ?? []).map((row) => pipelineDbRowToSheetRow(row));
}
```

You'll need a `pipelineDbRowToSheetRow` helper (if one doesn't already exist). Check if `mergeTopicWithPipeline` or similar mapper in `mappers.ts` does this — if so, call it. If not, add:

```typescript
function pipelineDbRowToSheetRow(row: PipelineStateDbRow): SheetRow {
  return {
    rowIndex: 0,
    sourceSheet: 'Draft',
    topicId: row.topic_id,
    topic: row.topic,
    date: row.date,
    status: row.status,
    variant1: row.variant1,
    variant2: row.variant2,
    variant3: row.variant3,
    variant4: row.variant4,
    imageLink1: row.image_link1,
    imageLink2: row.image_link2,
    imageLink3: row.image_link3,
    imageLink4: row.image_link4,
    selectedText: row.selected_text,
    selectedImageId: row.selected_image_id,
    selectedImageUrlsJson: row.selected_image_urls_json,
    postTime: row.post_time,
    emailTo: row.email_to,
    emailCc: row.email_cc,
    emailBcc: row.email_bcc,
    emailSubject: row.email_subject,
    topicGenerationRules: row.topic_generation_rules,
    generationTemplateId: row.generation_template_id,
    publishedAt: row.published_at ?? undefined,
    topicDeliveryChannel: row.topic_delivery_channel,
    topicGenerationModel: row.topic_generation_model,
    contentReviewFingerprint: row.content_review_fingerprint,
    contentReviewAt: row.content_review_at ?? undefined,
    contentReviewJson: row.content_review_json,
    generationRunId: row.generation_run_id,
    patternId: row.pattern_id,
    patternName: row.pattern_name,
    patternRationale: row.pattern_rationale,
  };
}
```

- [ ] **Add `addTopicToD1` method to `PipelineStore`** — creates a topic row without needing Sheets:

```typescript
async addTopicToD1(userId: string, topic: string, date: string, topicId: string): Promise<SheetRow> {
  const row: Partial<PipelineStateDbRow> = {
    user_id: userId,
    spreadsheet_id: '',
    topic_id: topicId,
    topic_key: buildTopicKey(topic, date),
    topic,
    date,
    status: 'Pending',
  };
  await this.db
    .prepare(INSERT_PIPELINE_ROW_SQL)
    .bind(
      userId, '', topicId, buildTopicKey(topic, date), topic, date, 'Pending',
      '', '', '', '',
      '', '', '', '',
      '', '', '',
      '', '', '', '', '',
      '', '', null,
      '', '',
      '', null, '',
      '', '', '', '',
    )
    .run();
  return pipelineDbRowToSheetRow(row as PipelineStateDbRow);
}
```

- [ ] **Type-check**

```bash
cd worker && npx tsc --noEmit
```

Fix any errors, especially callers of `upsertFull`, `saveDraftVariants`, etc. that need `userId` added.

- [ ] **Commit**

```bash
git add worker/src/persistence/pipeline-db/pipeline.ts
git commit -m "feat(pipeline): add user_id to D1 writes; add getRowsByUserId and addTopicToD1"
```

---

## Task 4: Update index.ts — thread userId and remove spreadsheet guards

**Files:**
- Modify: `worker/src/index.ts`

This is the largest change. Work through these sub-steps one at a time.

- [ ] **Step 4a: Update `getRows` action** — use D1-only path when no sheet configured:

Find `case 'getRows':` (around line 942) and replace:

```typescript
case 'getRows':
  ensureSpreadsheetConfigured(storedConfig);
  return pipeline.getMergedRows(sheets, storedConfig.spreadsheetId);
```

With:

```typescript
case 'getRows': {
  const sid = String(storedConfig.spreadsheetId || userRow.spreadsheet_id || '').trim();
  if (!sid) {
    // No sheet configured — return rows from D1 only
    return pipeline.getRowsByUserId(session.userId);
  }
  // Sheet configured — merge Sheets + D1 as before
  return pipeline.getMergedRows(sheets, sid);
}
```

(Ensure `userRow` is in scope — it comes from the D1 `users` table lookup that happens at the start of the request handler. If it isn't in scope, add: `const userRow = await env.PIPELINE_DB.prepare('SELECT * FROM users WHERE id = ?1').bind(session.userId).first<DbUser>();`)

- [ ] **Step 4b: Update `addTopic` action** — write to D1 first, then Sheets if configured:

Find `case 'addTopic':` and replace:

```typescript
case 'addTopic':
  ensureSpreadsheetConfigured(storedConfig);
  return sheets.addTopic(storedConfig.spreadsheetId, String(payload.topic || '').trim());
```

With:

```typescript
case 'addTopic': {
  const topicText = String(payload.topic || '').trim();
  if (!topicText) throw new Error('topic is required.');
  const topicId = crypto.randomUUID();
  const date = String(payload.date || new Date().toISOString().slice(0, 10)).trim();
  const sid = String(storedConfig.spreadsheetId || userRow?.spreadsheet_id || '').trim();
  // Always write to D1
  const newRow = await pipeline.addTopicToD1(session.userId, topicText, date, topicId);
  // Async Sheets write if configured (fire-and-forget)
  if (sid) {
    ctx.waitUntil(
      sheets.addTopic(sid, topicText).catch((e) =>
        console.error('[addTopic] Sheets sync failed:', e),
      ),
    );
  }
  return newRow;
}
```

- [ ] **Step 4c: Update `saveDraftVariants` action** — add userId, keep Sheets write async:

Find `case 'saveDraftVariants':` and update to pass `session.userId` as the first argument to `pipeline.saveDraftVariants(...)`. If the method signature already accepts `spreadsheetId` as first arg, you may need to:

1. Add `userId: string` as first param to `saveDraftVariants` in `pipeline.ts`
2. Update the D1 upsert inside to use `userId`
3. Make the Sheets write conditional on `spreadsheetId` being non-empty

Remove `ensureSpreadsheetConfigured(storedConfig)` from this case.

- [ ] **Step 4d: Remove `ensureSpreadsheetConfigured` from all data-access actions**

Run:

```bash
grep -n "ensureSpreadsheetConfigured" worker/src/index.ts
```

For each line, decide:
- **Remove** from: `getRows`, `addTopic`, `saveDraftVariants`, `updateRowStatus`, `saveEmailFields`, `createDraftFromPublished`, `updatePostSchedule`, `saveTopicGenerationRules`, `saveGenerationTemplateId`, `saveTopicDeliveryPreferences`, `savePatternMetadata`, `assignPattern`, `getPatternAssignment`
- **Keep** for: `generateQuickChange`, `generateVariantsPreview` (these need Sheets for PostTemplates lookup — or add a D1 fallback for PostTemplates later), `publishContent` (needs channel config), scheduler endpoints

For each action where you remove the guard, thread `userId = session.userId` into the pipeline call.

- [ ] **Step 4e: Add `syncFromSheets` action** — pull Sheets into D1 on demand:

```typescript
case 'syncFromSheets': {
  const sid = String(storedConfig.spreadsheetId || userRow?.spreadsheet_id || '').trim();
  if (!sid) throw new Error('No Google Sheet is connected. Connect one from the Connections page first.');
  const rows = await pipeline.getMergedRows(sheets, sid);
  // Upsert all rows into D1
  await Promise.all(
    rows.map((row) =>
      pipeline.upsertFull(session.userId, sid, row).catch((e) =>
        console.error('[syncFromSheets] upsert failed for', row.topicId, e),
      ),
    ),
  );
  return { ok: true, count: rows.length };
}
```

- [ ] **Type-check after all index.ts changes**

```bash
cd worker && npx tsc --noEmit
```

Fix all errors before committing.

- [ ] **Commit**

```bash
git add worker/src/index.ts
git commit -m "feat(worker): D1-primary data access; remove spreadsheet guards from data actions; add syncFromSheets"
```

---

## Task 5: Make Sheets writes optional in pipeline methods

**Files:**
- Modify: `worker/src/persistence/pipeline-db/pipeline.ts`
- Modify: `worker/src/persistence/drafts.ts` (if Sheets writes happen there)

- [ ] **Find where Sheets writes happen in pipeline methods**

```bash
grep -n "sheets\.\|SheetsGateway\|appendRow\|updateRow\|batchUpdate" \
  worker/src/persistence/pipeline-db/pipeline.ts \
  worker/src/persistence/drafts.ts | head -30
```

- [ ] **Wrap each Sheets write with a spreadsheetId guard**

For any method that writes to Sheets (e.g., `saveDraftVariants`, `updateRowStatus`), find the Sheets write call and wrap it:

```typescript
// Before (always writes to Sheets):
await sheets.updateRow(spreadsheetId, rowIndex, values);

// After (only writes to Sheets when spreadsheetId is provided):
if (spreadsheetId) {
  // Fire-and-forget so D1 write already succeeded
  await sheets.updateRow(spreadsheetId, rowIndex, values).catch((e) =>
    console.error('[pipeline] Sheets sync failed:', e),
  );
}
```

**Important:** D1 write must happen first and succeed. Sheets write failure must not propagate to the caller.

- [ ] **Type-check**

```bash
cd worker && npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add worker/src/persistence/pipeline-db/pipeline.ts worker/src/persistence/drafts.ts
git commit -m "feat(pipeline): make Sheets writes optional and non-blocking when spreadsheetId empty"
```

---

## Task 6: Frontend — handle no-sheet tenants

**Files:**
- Modify: `frontend/src/components/dashboard/index.tsx` (or wherever the "spreadsheet not configured" error is shown)
- Modify: any component that shows a "connect your spreadsheet" error state

- [ ] **Find where the "spreadsheet not configured" error is surfaced in the frontend**

```bash
grep -rn "spreadsheet\|not configured\|connectSheet\|ensureSpreadsheet" \
  frontend/src/components/ frontend/src/pages/ frontend/src/features/ \
  --include="*.tsx" --include="*.ts" | grep -v node_modules | head -20
```

- [ ] **Replace hard error with a gentle prompt to visit Connections page**

For any component that shows an error when the spreadsheet isn't configured, replace the error with a call-to-action pointing to `/connections`:

```tsx
// Instead of blocking the page with an error, show empty state with link:
{!hasSheet && (
  <div className="flex flex-col items-center gap-3 py-16 text-center">
    <p className="text-sm text-muted">No content yet.</p>
    <a
      href="/connections"
      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary/90"
    >
      Connect a Google Sheet →
    </a>
    <p className="text-xs text-muted">
      Or add topics below — they'll be saved locally.
    </p>
  </div>
)}
```

- [ ] **Update `backendApi.ts`** — add `syncFromSheets` method:

```typescript
async syncFromSheets(idToken: string): Promise<{ ok: boolean; count: number }> {
  return this.post<{ ok: boolean; count: number }>('syncFromSheets', idToken, {});
}
```

- [ ] **Wire "Refresh" button to `syncFromSheets`** when sheet is configured (in the workspace header or queue panel). The existing refresh likely calls `getRows` — keep that, but additionally offer `syncFromSheets` for a "pull from Sheets" operation. This can be a separate button or the existing Refresh if it already calls the worker.

- [ ] **Type-check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add frontend/src/components/ frontend/src/pages/ frontend/src/services/backendApi.ts
git commit -m "feat(frontend): graceful no-sheet empty state; add syncFromSheets to backendApi"
```

---

## Task 7: Verify end-to-end

- [ ] **Start local dev worker**

```bash
cd worker && npx wrangler dev --local
```

- [ ] **Test: tenant with no sheet**

Using a test account that has no `spreadsheet_id`:
1. Call `getRows` — should return `[]` (empty D1), no 403 or error
2. Call `addTopic` with `{ topic: "Test topic", date: "2026-04-06" }` — should return a new row
3. Call `getRows` again — should return the new row from D1
4. No spreadsheet errors in worker logs

- [ ] **Test: tenant with sheet**

Using an account that has a `spreadsheet_id`:
1. Call `syncFromSheets` — should pull rows from Sheets into D1 and return `{ ok: true, count: N }`
2. Call `getRows` — should return the synced rows
3. Call `saveDraftVariants` — should write to D1 and async-write to Sheets
4. Check the actual Google Sheet — the variant should appear there too

- [ ] **Final type-check both packages**

```bash
cd worker && npx tsc --noEmit && cd ../frontend && npx tsc --noEmit
```

Expected: no errors on either.

- [ ] **Commit**

```bash
git add -A
git commit -m "chore: final type-check pass after D1-primary migration"
```

---

## Notes for Implementer

1. **`ctx` availability in action handler**: Cloudflare Workers' `ctx.waitUntil()` requires the `ExecutionContext` to be in scope. Verify `ctx` is passed into the action switch statement. If not, use `event.waitUntil()` or simply `await` the Sheets write directly (it will still be non-blocking if the D1 write succeeded first).

2. **Existing `userRow`**: Check whether the main request handler already fetches the user row from D1 before the action switch. If so, reuse it. If not, add one fetch at the top of the handler.

3. **`crypto.randomUUID()`**: Available in Cloudflare Workers runtime without polyfill. Use it for new topic IDs in `addTopic`.

4. **PostTemplates without Sheets**: `generateQuickChange` and `generateVariantsPreview` call `sheets.getPostTemplateRulesById`. These still require a sheet. Leave `ensureSpreadsheetConfigured` on those actions OR add a D1-backed PostTemplates table in a future plan.

5. **Scheduler endpoints**: The scheduler reads rows via `getMergedRows`. After this plan, update scheduler to use `getRowsByUserId` with the tenant's userId, or keep using `getMergedRows` when spreadsheetId is set.
