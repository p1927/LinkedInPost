# Frontend

React 19 + Vite SPA for the LinkedIn-Post dashboard. Talks to the Cloudflare Worker over a single `POST /action` dispatcher (and SSE for generation).

For the full picture, see [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Stack

| Concern | Choice |
|---|---|
| Framework | React 19 + React Router 7 |
| Build | Vite 8 + TypeScript 5.9 |
| Styling | Tailwind v4, `tw-animate-css`, Framer Motion |
| UI primitives | `@base-ui/react`, `lucide-react`, `class-variance-authority` |
| Auth | `@react-oauth/google` (ID token kept in `localStorage.google_id_token`) |
| Audio / media | `@huggingface/transformers`, `nodejs-whisper`, `ffmpeg-static` (local STT server) |
| Validation | `zod` |
| Tests | Playwright 1.59 (e2e), Vitest 4.1 (unit) |

## Local dev

```bash
npm install
npm run dev
```

`npm run dev` boots three concurrent servers via `concurrently`:

1. **Vite** on port **5174** (`strictPort` — change in `vite.config.ts` if needed)
2. **STT server** — `server/sttServer.js` for local Whisper transcription
3. **Setup wizard** — `server/setupWizard.js` on port **3456**

Set `VITE_WORKER_URL` (and `VITE_GOOGLE_CLIENT_ID`) before starting:

```bash
echo 'VITE_WORKER_URL=http://localhost:8787' >> .env.local
echo 'VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com' >> .env.local
```

Then run the worker on port 8787 in a second shell — see [`../worker/README.md`](../worker/README.md).

## Build

```bash
npm run build       # tsc -b && vite build → dist/
npm run preview     # serve the build locally
```

`prebuild` regenerates `src/generated/features.ts` (from root `features.yaml` via `scripts/generate_features.py`) and `src/generated/google-models.json` (`scripts/generate-google-models.mjs`).

## Routes

Defined in [`src/features/topic-navigation/utils/workspaceRoutes.ts`](src/features/topic-navigation/utils/workspaceRoutes.ts) and wired in [`src/App.tsx`](src/App.tsx).

| Path | Page |
|---|---|
| `/` | SaaS landing or login screen (depends on `deploymentMode`) |
| `/about`, `/pricing`, `/terms`, `/privacy-policy` | Marketing pages |
| `/topics`, `/topics/new` | Queue + scratchpad form |
| `/topics/:topicId` | Variant carousel |
| `/topics/:topicId/editor/:variantSlot` | 3-panel draft editor |
| `/connections`, `/settings`, `/rules` | Channel hookup, bot config, generation rules |
| `/campaign` | Bulk import (gated by `FEATURE_CAMPAIGN`) |
| `/feed`, `/trending`, `/enrichment` | Article feed, trending panels, multi-skill workspace |
| `/automations` | Admin automation rules |
| `/usage` | Token usage + budget (SaaS) |
| `/setup`, `/admin` | Admin setup wizard + tenant settings |

The router uses `import.meta.env.BASE_URL` as `basename` so the same build serves both `/` (Cloudflare) and a GitHub Pages sub-path.

## API contract

All server traffic flows through one client — [`src/services/backendApi.ts`](src/services/backendApi.ts):

```ts
const api = new BackendApi();              // reads VITE_WORKER_URL
const session = await api.bootstrap(idToken);
await api.addTopic(idToken, topic, meta);
```

Under the hood every method posts:

```json
POST {VITE_WORKER_URL}/action
{ "action": "addTopic", "payload": { ... }, "idToken": "..." }
```

The one exception is generation: `streamCallGenerationWorker()` opens an SSE connection to `POST /api/generate/stream` and emits `progress` / `complete` / `error` events.

OAuth popups call `startLinkedInAuth` (etc.), open the returned `authorizationUrl` in a popup window, and listen for a `postMessage` of shape `{ source: 'channel-bot-oauth', ok, payload | error }` from `/auth/<provider>/callback`.

## Feature flags

`src/generated/features.ts` is auto-generated from root `features.yaml`. Current flags:

- `deploymentMode: 'saas' | 'selfHosted'`
- `FEATURE_CAMPAIGN`
- `FEATURE_CONTENT_FLOW`
- `FEATURE_CONTENT_REVIEW`
- `FEATURE_ENRICHMENT`
- `FEATURE_MULTI_PROVIDER_LLM`
- `FEATURE_NEWS_RESEARCH`

Edit `features.yaml`, then `python3 scripts/generate_features.py` (or any `python setup.py` run) before rebuilding.

## Tests

```bash
npm run test:e2e          # Playwright headless
npm run test:e2e:ui       # Playwright UI mode
npm run test:e2e:headed   # visible browser
npm run test:e2e:setup    # only setup-wizard flow
```

The setup-wizard suite is also runnable from the repo root with `npm run test:setup` (combines the Python wizard tests with the React wizard tests).

## Source layout

```
src/
├── App.tsx                  # Router + auth + bootstrap
├── components/              # Shared UI (Dashboard, WorkspaceShell, dialogs, …)
├── features/                # 29 feature folders — generation, feed, campaign, review, …
├── pages/                   # Static pages (Pricing, About, Terms)
├── services/backendApi.ts   # Single API client
├── integrations/channels.ts # Channel registry (linkedin, instagram, gmail, whatsapp, telegram, youtube)
├── hooks/                   # Custom hooks
├── lib/                     # Utilities (motion, postLoginRedirect, document title)
├── plugins/                 # Dev plugins (Google auth bypass)
├── generated/               # AUTO-GENERATED — do not edit
└── utils/                   # Helpers (Google ID token parsing, …)
```
