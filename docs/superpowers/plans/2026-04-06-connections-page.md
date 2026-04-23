# Connections Page + 403 Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Google Sheets 403 for new tenants via Drive auto-share and add a `/connections` workspace page where tenants can see, connect, disconnect, and switch all integrations.

**Architecture:** A new worker action `connectSpreadsheet` uses the user's short-lived Drive access token (obtained via incremental Google OAuth consent on the frontend) to share the sheet with the service account, then verifies access. A new `/connections` page renders cards for the Google Sheet and all social providers using data from existing `getIntegrations` plus two new actions `getSpreadsheetStatus` and `getServiceAccountEmail`.

**Tech Stack:** Cloudflare Workers, D1, TypeScript, React, Tailwind, `@react-oauth/google` (`useGoogleLogin` hook), Google Drive API v3, Google Sheets API v4.

---

## File Map

**Create:**
- `worker/src/google/drivePermissions.ts` — `shareFileWithUser(fileId, userToken, email)`
- `frontend/src/pages/connections/ConnectionsPage.tsx` — main page
- `frontend/src/pages/connections/SheetConnectionCard.tsx` — Google Sheet card with Drive consent flow
- `frontend/src/pages/connections/SocialAccountCard.tsx` — per-provider social card

**Modify:**
- `worker/src/index.ts` — add `connectSpreadsheet`, `getSpreadsheetStatus`, `getServiceAccountEmail` actions
- `frontend/src/services/backendApi.ts` — add 3 new API methods + `SpreadsheetStatus` type
- `frontend/src/components/workspace/AppSidebar.tsx` — add 'connections' to `WorkspaceNavPage`, sidebar entry
- `frontend/src/components/workspace/WorkspaceHeader.tsx` — add `connections: 'Connections'` to `PAGE_TITLES`
- `frontend/src/features/topic-navigation/utils/workspaceRoutes.ts` — add `/connections` path
- `frontend/src/components/dashboard/index.tsx` — add `/connections` route + import
- `frontend/src/features/onboarding/OnboardingModal.tsx` — step 2 triggers Drive consent flow

---

## Task 1: Worker — Drive permissions helper

**Files:**
- Create: `worker/src/google/drivePermissions.ts`

- [ ] **Create the helper**

```typescript
// worker/src/google/drivePermissions.ts

/**
 * Grants editor access to a Google Drive file using the caller's OAuth access token.
 * Used during sheet onboarding so the service account can read/write the tenant's sheet.
 */
export async function shareFileWithUser(
  fileId: string,
  userAccessToken: string,
  emailAddress: string,
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'writer', type: 'user', emailAddress }),
    },
  );
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(
      `Drive permission grant failed (${res.status}): ${msg.slice(0, 300)}`,
    );
  }
}
```

- [ ] **Type-check**

```bash
cd worker && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add worker/src/google/drivePermissions.ts
git commit -m "feat(worker): add Drive permissions helper for service account share"
```

---

## Task 2: Worker — connectSpreadsheet, getSpreadsheetStatus, getServiceAccountEmail actions

**Files:**
- Modify: `worker/src/index.ts` (add import + 3 cases to the action switch)

- [ ] **Add import at top of index.ts** (near other google imports)

```typescript
import { shareFileWithUser } from './google/drivePermissions';
```

- [ ] **Add the three action cases** in `worker/src/index.ts` in the main switch, after the `getIntegrations` case (around line 1325):

```typescript
case 'connectSpreadsheet': {
  const { spreadsheetId, driveAccessToken } = payload as {
    spreadsheetId: string;
    driveAccessToken: string;
  };
  if (!String(spreadsheetId || '').trim()) throw new Error('spreadsheetId is required.');
  if (!String(driveAccessToken || '').trim()) throw new Error('driveAccessToken is required.');
  const sid = String(spreadsheetId).trim();
  const token = String(driveAccessToken).trim();

  // Parse service account email from env
  let saEmail = '';
  try {
    const saJson = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}') as { client_email?: string };
    saEmail = String(saJson.client_email || '').trim();
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.');
  }
  if (!saEmail) throw new Error('Service account email not configured on this Worker.');

  // Share sheet with service account using user's Drive token
  await shareFileWithUser(sid, token, saEmail);

  // Verify service account can now access it
  const saToken = await mintGoogleAccessToken(env);
  const verifyRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sid)}?fields=properties.title`,
    { headers: { Authorization: `Bearer ${saToken}` } },
  );
  if (!verifyRes.ok) {
    throw new Error(
      `Sheet shared but service account still cannot access it (${verifyRes.status}). ` +
      `Please verify the URL is correct and try again.`,
    );
  }
  const meta = await verifyRes.json() as { properties?: { title?: string } };
  const title = String(meta.properties?.title ?? '');

  // Persist spreadsheet ID for this user
  await setUserSpreadsheetId(env.PIPELINE_DB, session.userId, sid);
  return { ok: true, title };
}

case 'getSpreadsheetStatus': {
  // Prefer per-user spreadsheet_id from D1, fall back to global config
  const sid = String(userRow.spreadsheet_id || storedConfig.spreadsheetId || '').trim();
  if (!sid) return { accessible: false, title: '' };
  try {
    const saToken = await mintGoogleAccessToken(env);
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sid)}?fields=properties.title`,
      { headers: { Authorization: `Bearer ${saToken}` } },
    );
    if (!res.ok) return { accessible: false, title: '' };
    const meta = await res.json() as { properties?: { title?: string } };
    return { accessible: true, title: String(meta.properties?.title ?? '') };
  } catch {
    return { accessible: false, title: '' };
  }
}

case 'getServiceAccountEmail': {
  try {
    const saJson = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}') as { client_email?: string };
    return { email: String(saJson.client_email || '').trim() };
  } catch {
    return { email: '' };
  }
}
```

- [ ] **Check that `userRow` is in scope** — search for where `userRow` is defined in index.ts:

```bash
grep -n "userRow" worker/src/index.ts | head -5
```

If `userRow` doesn't exist as a variable, replace `userRow.spreadsheet_id` with the result of a D1 lookup. Look for how `storedConfig.spreadsheetId` is populated and use the same pattern, or query D1 directly:

```typescript
// If userRow is not in scope, fetch inline:
const userRowForSheet = await env.PIPELINE_DB
  .prepare('SELECT spreadsheet_id FROM users WHERE id = ?1')
  .bind(session.userId)
  .first<{ spreadsheet_id: string }>();
const sid = String(userRowForSheet?.spreadsheet_id || storedConfig.spreadsheetId || '').trim();
```

- [ ] **Type-check**

```bash
cd worker && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add worker/src/index.ts
git commit -m "feat(worker): add connectSpreadsheet, getSpreadsheetStatus, getServiceAccountEmail actions"
```

---

## Task 3: Frontend — backendApi.ts additions

**Files:**
- Modify: `frontend/src/services/backendApi.ts`

- [ ] **Add `SpreadsheetStatus` type** near the top of the file with other interfaces:

```typescript
export interface SpreadsheetStatus {
  accessible: boolean;
  title: string;
}
```

- [ ] **Add 3 methods** to the `BackendApi` class (after `getIntegrations`):

```typescript
async connectSpreadsheet(
  idToken: string,
  spreadsheetId: string,
  driveAccessToken: string,
): Promise<{ ok: true; title: string }> {
  return this.post<{ ok: true; title: string }>('connectSpreadsheet', idToken, {
    spreadsheetId,
    driveAccessToken,
  });
}

async getSpreadsheetStatus(idToken: string): Promise<SpreadsheetStatus> {
  const data = await this.post<SpreadsheetStatus>('getSpreadsheetStatus', idToken, {});
  return data ?? { accessible: false, title: '' };
}

async getServiceAccountEmail(idToken: string): Promise<string> {
  const data = await this.post<{ email: string }>('getServiceAccountEmail', idToken, {});
  return data?.email ?? '';
}
```

- [ ] **Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add frontend/src/services/backendApi.ts
git commit -m "feat(frontend): add connectSpreadsheet, getSpreadsheetStatus, getServiceAccountEmail to backendApi"
```

---

## Task 4: Frontend — Add 'connections' to routing

**Files:**
- Modify: `frontend/src/components/workspace/AppSidebar.tsx`
- Modify: `frontend/src/components/workspace/WorkspaceHeader.tsx`
- Modify: `frontend/src/features/topic-navigation/utils/workspaceRoutes.ts`
- Modify: `frontend/src/components/dashboard/index.tsx`

- [ ] **AppSidebar.tsx** — add `'connections'` to `WorkspaceNavPage` type (line 13) and add the sidebar nav entry. Import `PlugZap` from lucide-react:

```typescript
// Change the type:
export type WorkspaceNavPage = 'topics' | 'settings' | 'rules' | 'campaign' | 'usage' | 'connections';
```

Add `PlugZap` to the lucide-react import line, then add the nav item in the sidebar nav list (after the usage item and before settings):

```tsx
<NavLink
  to={WORKSPACE_PATHS.connections}
  className={({ isActive }) =>
    clsx(navButtonBase, RAIL_RADIUS, RAIL_ICON, collapsed ? RAIL_TILE : 'gap-3 px-3',
      isActive ? navActive : navInactive)
  }
  aria-label="Connections"
  title="Connections"
>
  <PlugZap aria-hidden className="shrink-0" />
  {!collapsed && <span className="min-w-0 truncate">Connections</span>}
</NavLink>
```

- [ ] **WorkspaceHeader.tsx** — add `connections` to `PAGE_TITLES`:

```typescript
const PAGE_TITLES: Record<WorkspaceNavPage, string> = {
  topics: 'Topics',
  settings: 'Settings',
  rules: 'Rules',
  campaign: 'Campaign',
  usage: 'Usage',
  connections: 'Connections',
};
```

- [ ] **workspaceRoutes.ts** — add connections path:

```typescript
export const WORKSPACE_PATHS = {
  topics: '/topics',
  settings: '/settings',
  rules: '/rules',
  campaign: '/campaign',
  usage: '/usage',
  connections: '/connections',
} as const;

export const WORKSPACE_ROUTE_PATHS = {
  topicEditor: '/topics/:topicId/editor/:variantSlot',
  topicVariants: '/topics/:topicId',
  topics: '/topics',
  settings: '/settings',
  rules: '/rules',
  campaign: '/campaign',
  usage: '/usage',
  connections: '/connections',
} as const;
```

- [ ] **dashboard/index.tsx** — add import and route:

```typescript
// Add import near other page imports:
import { ConnectionsPage } from '../../pages/connections/ConnectionsPage';
```

Inside the `<Routes>` block, add:
```tsx
<Route
  path={WORKSPACE_ROUTE_PATHS.connections}
  element={
    <ConnectionsPage
      idToken={idToken}
      api={api}
      integrations={integrations}
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
      connecting={connecting}
    />
  }
/>
```

(Pass whatever props `ConnectionsPage` needs — align with the component definition in Task 7.)

- [ ] **Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add frontend/src/components/workspace/AppSidebar.tsx \
        frontend/src/components/workspace/WorkspaceHeader.tsx \
        frontend/src/features/topic-navigation/utils/workspaceRoutes.ts \
        frontend/src/components/dashboard/index.tsx
git commit -m "feat(frontend): add connections route to workspace nav"
```

---

## Task 5: Frontend — SocialAccountCard component

**Files:**
- Create: `frontend/src/pages/connections/SocialAccountCard.tsx`

- [ ] **Create the component**

```tsx
// frontend/src/pages/connections/SocialAccountCard.tsx
import clsx from 'clsx';
import type { SocialIntegration } from '@/services/backendApi';

interface SocialAccountCardProps {
  provider: 'linkedin' | 'instagram' | 'gmail' | 'telegram' | 'whatsapp';
  label: string;
  integration: SocialIntegration | undefined;
  onConnect: () => void;
  onDisconnect: () => void;
  connecting: boolean;
  /** Optional — shown for Telegram/WhatsApp instead of OAuth name */
  configuredLabel?: string;
}

const PROVIDER_COLORS: Record<string, string> = {
  linkedin: 'bg-[#0A66C2] text-white',
  instagram: 'bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white',
  gmail: 'bg-white text-[#EA4335] border border-border',
  telegram: 'bg-[#2AABEE] text-white',
  whatsapp: 'bg-[#25D366] text-white',
};

const PROVIDER_INITIALS: Record<string, string> = {
  linkedin: 'in',
  instagram: 'ig',
  gmail: 'G',
  telegram: 'tg',
  whatsapp: 'wa',
};

export function SocialAccountCard({
  provider,
  label,
  integration,
  onConnect,
  onDisconnect,
  connecting,
  configuredLabel,
}: SocialAccountCardProps) {
  const isConnected = Boolean(integration);
  const needsReauth = integration?.needsReauth ?? false;
  const displayName = integration?.displayName || configuredLabel || '';

  let statusLabel = 'Not connected';
  let statusClass = 'bg-slate-100 text-slate-500';
  if (isConnected && needsReauth) {
    statusLabel = 'Needs reauth';
    statusClass = 'bg-amber-100 text-amber-700';
  } else if (isConnected) {
    statusLabel = 'Connected';
    statusClass = 'bg-emerald-100 text-emerald-700';
  }

  return (
    <div className="glass-panel flex flex-col gap-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={clsx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
            PROVIDER_COLORS[provider],
          )}
          aria-hidden
        >
          {integration?.profilePicture ? (
            <img
              src={integration.profilePicture}
              alt={displayName}
              className="h-10 w-10 rounded-xl object-cover"
            />
          ) : (
            PROVIDER_INITIALS[provider]
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{label}</p>
          {displayName ? (
            <p className="truncate text-xs text-muted">{displayName}</p>
          ) : null}
        </div>
        <span className={clsx('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', statusClass)}>
          {statusLabel}
        </span>
      </div>

      <div className="flex gap-2">
        {!isConnected ? (
          <button
            type="button"
            onClick={onConnect}
            disabled={connecting}
            className="flex-1 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-fg transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {connecting ? 'Connecting…' : 'Connect'}
          </button>
        ) : (
          <>
            {needsReauth && (
              <button
                type="button"
                onClick={onConnect}
                disabled={connecting}
                className="flex-1 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
              >
                Re-authorize
              </button>
            )}
            <button
              type="button"
              onClick={onConnect}
              disabled={connecting}
              className="flex-1 rounded-xl border border-border bg-white/50 px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-white/80 disabled:opacity-50"
            >
              Switch account
            </button>
            <button
              type="button"
              onClick={onDisconnect}
              className="rounded-xl border border-border bg-white/50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Type-check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add frontend/src/pages/connections/SocialAccountCard.tsx
git commit -m "feat(frontend): add SocialAccountCard component"
```

---

## Task 6: Frontend — SheetConnectionCard component

**Files:**
- Create: `frontend/src/pages/connections/SheetConnectionCard.tsx`

- [ ] **Create the component**

```tsx
// frontend/src/pages/connections/SheetConnectionCard.tsx
import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import clsx from 'clsx';
import { CheckCircle2, Copy, ExternalLink, XCircle } from 'lucide-react';
import type { BackendApi, SpreadsheetStatus } from '@/services/backendApi';

interface SheetConnectionCardProps {
  idToken: string;
  api: BackendApi;
  status: SpreadsheetStatus;
  onConnected: (title: string) => void;
}

function extractSpreadsheetId(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] ?? url.trim();
}

export function SheetConnectionCard({ idToken, api, status, onConnected }: SheetConnectionCardProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceAccountEmail, setServiceAccountEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Called after Drive consent is granted — shares sheet with service account
  async function handleShare(driveAccessToken: string) {
    const spreadsheetId = extractSpreadsheetId(url);
    if (!spreadsheetId) {
      setError('Please enter a valid Google Sheets URL.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.connectSpreadsheet(idToken, spreadsheetId, driveAccessToken);
      onConnected(result.title);
      setUrl('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect sheet. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Fallback when Drive consent is denied — show service account email for manual share
  async function handleConsentDenied() {
    setLoading(false);
    const email = await api.getServiceAccountEmail(idToken).catch(() => '');
    setServiceAccountEmail(email);
    setError(
      'Drive access was denied. Share your spreadsheet manually with the service account below, then use "Verify access".',
    );
  }

  const triggerDriveConsent = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive',
    flow: 'implicit',
    onSuccess: (tokenResponse) => handleShare(tokenResponse.access_token),
    onError: () => handleConsentDenied(),
    onNonOAuthError: () => handleConsentDenied(),
  });

  async function handleVerifyOnly() {
    const spreadsheetId = extractSpreadsheetId(url);
    if (!spreadsheetId) {
      setError('Please enter a valid Google Sheets URL first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Store the URL and check status
      const freshStatus = await api.getSpreadsheetStatus(idToken);
      if (freshStatus.accessible) {
        onConnected(freshStatus.title);
        setUrl('');
      } else {
        setError('The service account still cannot access your sheet. Make sure you shared it with the email above.');
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!serviceAccountEmail) return;
    navigator.clipboard.writeText(serviceAccountEmail).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isConnected = status.accessible;

  return (
    <div className="glass-panel rounded-2xl border border-white/40 bg-white/60 p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white text-sm font-bold">
          S
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Google Sheets</p>
          {isConnected && status.title ? (
            <p className="truncate text-xs text-muted">{status.title}</p>
          ) : null}
        </div>
        <span
          className={clsx(
            'flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            isConnected
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-500',
          )}
        >
          {isConnected ? (
            <><CheckCircle2 className="h-3 w-3" aria-hidden /> Connected</>
          ) : (
            <><XCircle className="h-3 w-3" aria-hidden /> Not connected</>
          )}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null); setServiceAccountEmail(null); }}
          placeholder={isConnected ? 'Paste new spreadsheet URL to switch…' : 'https://docs.google.com/spreadsheets/d/…'}
          className="glass-inset w-full rounded-xl border border-violet-200/45 bg-white/50 px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
        />

        {error ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : null}

        {serviceAccountEmail ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="min-w-0 flex-1 truncate text-xs font-mono text-amber-900">
              {serviceAccountEmail}
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-lg p-1 text-amber-700 hover:bg-amber-100"
              aria-label="Copy service account email"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <a
              href={`https://docs.google.com/spreadsheets`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg p-1 text-amber-700 hover:bg-amber-100"
              aria-label="Open Google Sheets"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setLoading(true); triggerDriveConsent(); }}
            disabled={loading || !url.trim()}
            className="flex-1 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-fg transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Connecting…' : isConnected ? 'Switch sheet' : 'Connect sheet'}
          </button>
          {serviceAccountEmail ? (
            <button
              type="button"
              onClick={handleVerifyOnly}
              disabled={loading || !url.trim()}
              className="rounded-xl border border-border bg-white/50 px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-white/80 disabled:opacity-50"
            >
              Verify access
            </button>
          ) : null}
          {isConnected ? (
            <button
              type="button"
              onClick={async () => {
                // Disconnect: clear spreadsheet ID by setting empty
                setLoading(true);
                try {
                  await api.connectSpreadsheet(idToken, '', '');
                } catch {
                  // ignore — server will clear on empty spreadsheetId
                }
                onConnected('');
                setLoading(false);
              }}
              disabled={loading}
              className="rounded-xl border border-border bg-white/50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              Disconnect
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
```

**Note:** The "Disconnect" button calls `connectSpreadsheet` with empty strings. Add a `disconnectSpreadsheet` worker action instead to keep things clean — add `case 'disconnectSpreadsheet'` in `index.ts` that calls `setUserSpreadsheetId(env.PIPELINE_DB, session.userId, '')` and add `api.disconnectSpreadsheet(idToken)` in `backendApi.ts`. Then update the Disconnect button to call that.

- [ ] **Type-check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add frontend/src/pages/connections/SheetConnectionCard.tsx
git commit -m "feat(frontend): add SheetConnectionCard with Drive consent auto-share"
```

---

## Task 7: Frontend — ConnectionsPage

**Files:**
- Create: `frontend/src/pages/connections/ConnectionsPage.tsx`

- [ ] **Create the page**

```tsx
// frontend/src/pages/connections/ConnectionsPage.tsx
import { useEffect, useState } from 'react';
import type { BackendApi, SocialIntegration, SpreadsheetStatus } from '@/services/backendApi';
import { SheetConnectionCard } from './SheetConnectionCard';
import { SocialAccountCard } from './SocialAccountCard';
import { useRegisterWorkspaceChrome } from '@/components/workspace/WorkspaceChromeContext';

interface ConnectionsPageProps {
  idToken: string;
  api: BackendApi;
  integrations: SocialIntegration[];
  onConnect: (provider: 'linkedin' | 'instagram' | 'gmail') => void;
  onDisconnect: (provider: string) => void;
  connecting: string | null;
}

const SOCIAL_PROVIDERS: Array<{
  key: 'linkedin' | 'instagram' | 'gmail';
  label: string;
}> = [
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'gmail', label: 'Gmail' },
];

export function ConnectionsPage({
  idToken,
  api,
  integrations,
  onConnect,
  onDisconnect,
  connecting,
}: ConnectionsPageProps) {
  const [sheetStatus, setSheetStatus] = useState<SpreadsheetStatus>({ accessible: false, title: '' });

  useRegisterWorkspaceChrome({ page: 'connections' });

  useEffect(() => {
    api.getSpreadsheetStatus(idToken).then(setSheetStatus).catch(() => {});
  }, [idToken, api]);

  function getIntegration(provider: string): SocialIntegration | undefined {
    return integrations.find((i) => i.provider === provider);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      {/* Google Workspace */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
          Google Workspace
        </h2>
        <SheetConnectionCard
          idToken={idToken}
          api={api}
          status={sheetStatus}
          onConnected={(title) =>
            setSheetStatus(title ? { accessible: true, title } : { accessible: false, title: '' })
          }
        />
      </section>

      {/* Social Publishing */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
          Social Publishing
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOCIAL_PROVIDERS.map(({ key, label }) => (
            <SocialAccountCard
              key={key}
              provider={key}
              label={label}
              integration={getIntegration(key)}
              onConnect={() => onConnect(key)}
              onDisconnect={() => onDisconnect(key)}
              connecting={connecting === key}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors. Fix any prop type mismatches.

- [ ] **Commit**

```bash
git add frontend/src/pages/connections/ConnectionsPage.tsx
git commit -m "feat(frontend): add ConnectionsPage"
```

---

## Task 8: Frontend — Update OnboardingModal step 2 with Drive consent

**Files:**
- Modify: `frontend/src/features/onboarding/OnboardingModal.tsx`

- [ ] **Update OnboardingModal** to use Drive consent on step 2:

```tsx
// frontend/src/features/onboarding/OnboardingModal.tsx
import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { ConnectAccountsGrid } from './ConnectAccountsGrid';
import type { SocialIntegration } from '@/services/backendApi';

interface OnboardingModalProps {
  integrations: SocialIntegration[];
  onConnect: (provider: 'linkedin' | 'instagram' | 'gmail') => void;
  onDisconnect: (provider: string) => void;
  onComplete: (spreadsheetId?: string, driveAccessToken?: string) => void;
  connecting: string | null;
}

export function OnboardingModal({
  integrations,
  onConnect,
  onDisconnect,
  onComplete,
  connecting,
}: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [shareError, setShareError] = useState<string | null>(null);

  const hasAnyConnected = integrations.length > 0;

  function extractSpreadsheetId(url: string): string {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match?.[1] ?? url.trim();
  }

  const triggerDriveConsent = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive',
    flow: 'implicit',
    onSuccess: (tokenResponse) => {
      const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
      onComplete(spreadsheetId, tokenResponse.access_token);
    },
    onError: () => {
      setShareError(
        'Drive access was denied. You can connect your sheet later from the Connections page.',
      );
      // Still complete onboarding, just without sheet
      onComplete(undefined, undefined);
    },
    onNonOAuthError: () => {
      setShareError(null);
      onComplete(undefined, undefined);
    },
  });

  function handleFinish() {
    if (!spreadsheetUrl.trim()) {
      onComplete(undefined, undefined);
      return;
    }
    setShareError(null);
    triggerDriveConsent();
  }

  return (
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
              Optionally paste a Google Spreadsheet URL. We'll request Drive access to share it with our service account automatically.
            </p>
            <input
              type="url"
              value={spreadsheetUrl}
              onChange={(e) => { setSpreadsheetUrl(e.target.value); setShareError(null); }}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="glass-inset w-full rounded-xl border border-violet-200/45 bg-white/50 px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {shareError ? (
              <p className="mt-2 text-xs text-amber-600">{shareError}</p>
            ) : null}
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
  );
}
```

- [ ] **Update the `handleCompleteOnboarding` in `frontend/src/components/dashboard/index.tsx`** (or wherever `onComplete` is handled) to accept the new signature and call `api.connectSpreadsheet` when `driveAccessToken` is provided:

Find the existing `handleCompleteOnboarding` callback and update it to:

```typescript
const handleCompleteOnboarding = useCallback(async (spreadsheetId?: string, driveAccessToken?: string) => {
  if (!idToken) return;
  try {
    if (spreadsheetId && driveAccessToken) {
      await api.connectSpreadsheet(idToken, spreadsheetId, driveAccessToken);
    }
    await api.completeOnboarding(idToken, spreadsheetId && !driveAccessToken ? spreadsheetId : undefined);
    setShowOnboarding(false);
    navigate(WORKSPACE_PATHS.connections);
  } catch (err) {
    console.error('Complete onboarding failed:', err);
    // Still close onboarding even if sheet connect fails
    await api.completeOnboarding(idToken).catch(() => {});
    setShowOnboarding(false);
  }
}, [idToken, api, navigate]);
```

Also update the `OnboardingModal` usage in the JSX to pass the updated `onComplete` prop.

- [ ] **Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add frontend/src/features/onboarding/OnboardingModal.tsx \
        frontend/src/components/dashboard/index.tsx
git commit -m "feat(frontend): update onboarding step 2 with Drive consent auto-share"
```

---

## Task 9: Add disconnectSpreadsheet worker action (cleanup from Task 6)

**Files:**
- Modify: `worker/src/index.ts`
- Modify: `frontend/src/services/backendApi.ts`
- Modify: `frontend/src/pages/connections/SheetConnectionCard.tsx`

- [ ] **Add case to index.ts** (after `connectSpreadsheet`):

```typescript
case 'disconnectSpreadsheet': {
  await setUserSpreadsheetId(env.PIPELINE_DB, session.userId, '');
  return { ok: true };
}
```

- [ ] **Add method to backendApi.ts**:

```typescript
async disconnectSpreadsheet(idToken: string): Promise<void> {
  await this.post<{ ok: true }>('disconnectSpreadsheet', idToken, {});
}
```

- [ ] **Update SheetConnectionCard.tsx** Disconnect button to call `api.disconnectSpreadsheet(idToken)` instead of `api.connectSpreadsheet(idToken, '', '')`.

- [ ] **Type-check**

```bash
cd frontend && npx tsc --noEmit
cd worker && npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add worker/src/index.ts frontend/src/services/backendApi.ts \
        frontend/src/pages/connections/SheetConnectionCard.tsx
git commit -m "feat: add disconnectSpreadsheet action"
```

---

## Final Check

- [ ] Run both TS checks together:

```bash
cd /path/to/repo && cd worker && npx tsc --noEmit && cd ../frontend && npx tsc --noEmit
```

Expected: clean on both.
