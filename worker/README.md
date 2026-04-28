# Main Cloudflare Worker (`linkedin-bot-api`)

The main API worker. It verifies Google ID tokens, runs the action dispatcher, owns OAuth callback flows, schedules publishing through a Durable Object, and proxies the generation pipeline to the generation worker.

For the system-wide picture see [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md). For the deployment runbook see [`../SETUP.md`](../SETUP.md).

## What runs here

- **HTTP routes** — exact-match prefixes resolved before falling through to the action dispatcher.
- **`POST /action`** — single dispatcher with ~100 cases (session, topics, generation, channels, scheduling, feed enrichment, automations).
- **`POST /api/generate/stream`** — SSE proxy to the generation worker.
- **OAuth popups** — `/auth/{linkedin,instagram,whatsapp,gmail,youtube}/callback`.
- **Internal endpoints** — Durable Object alarm callback, GitHub Actions integration, internal pipeline upserts.
- **Webhooks + automations** — `/webhooks/*`, `/automations/*`, `/automations/internal/*`.
- **Cron** — nightly `0 3 * * *` for housekeeping.

## Bindings (`wrangler.jsonc`)

| Binding | Type | Notes |
|---|---|---|
| `PIPELINE_DB` | D1 | `linkedin-pipeline-db`; migrations under [`migrations/`](migrations/) |
| `CONFIG_KV` | KV | shared dashboard config |
| `SCHEDULED_LINKEDIN_PUBLISH` | Durable Object | class `ScheduledPublishAlarm` (alarms re-enter via `/internal/schedule-linkedin-publish`) |
| `GENERATION_WORKER` | Service binding | → `linkedin-generation-worker` |

`vars.GENERATION_WORKER_URL` doubles as the externally reachable URL of the generation worker (used when the service binding is unavailable, e.g. local dev across Wrangler instances). `GENERATION_WORKER_SECRET` (secret) must equal `WORKER_SHARED_SECRET` on the generation worker.

## HTTP routes

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | API health JSON envelope (root `wrangler.jsonc` also serves built `frontend/` assets here) |
| `GET` | `/v1/image-gen-catalog` | Image-gen model catalog |
| `GET` | `/api/usage` | Per-user token usage + budget |
| `GET` | `/auth/linkedin/callback` | OAuth popup |
| `GET` | `/auth/instagram/callback` | OAuth popup |
| `GET` | `/auth/whatsapp/callback` | OAuth popup |
| `GET` | `/auth/gmail/callback` | OAuth popup |
| `GET` | `/auth/youtube/callback` | OAuth popup |
| `POST` | `/api/waitlist` | SaaS waitlist signup |
| `POST` | `/internal/schedule-linkedin-publish` | Durable Object alarm callback |
| `POST` | `/internal/merged-rows` | Internal Sheets+D1 merge |
| `POST` | `/internal/pipeline-upsert` | Internal row upsert |
| `GET` | `/internal/github-automation-gemini-model` | GitHub Actions ↔ worker integration |
| `POST` | `/internal/github-automation-generate-variants` | GitHub Actions ↔ worker integration |
| `POST` | `/api/generate/stream` | Main generation flow — SSE or JSON; proxies the generation worker |
| `*` | `/webhooks/*` | Inbound channel webhooks |
| `*` | `/automations/*` | Automation rule CRUD + triggers |
| `*` | `/automations/internal/*` | Internal automation runners |
| `POST` | `/action` | Default action dispatcher |

## Action dispatcher highlights

The full case list is in [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md#4-main-worker-worker). A few groupings worth calling out here:

- **Session** — `bootstrap`, `completeOnboarding`, `connectSpreadsheet`, `getIntegrations`
- **Generation** — `generateQuickChange`, `generateVariantsPreview`, `callGenerationWorker`, `runContentReview`
- **Feed enrichment & debate mode** — `analyzeTopicInsights`, `analyzeFeedArticle`, `findDraftConnections`, `findDebateArticle`, `crossDomainInsight`, `opinionLeaderInsights`, `clusterDraftClips`
- **Trending research** — `trendingSearch`, `trendingYouTube`, `trendingLinkedIn`, `trendingInstagram`
- **Channel OAuth** — `startLinkedInAuth`, `startInstagramAuth`, `startWhatsAppAuth`, `startGmailAuth`, `startYouTubeAuth`, `completeWhatsAppConnection`, `verifyTelegramChat`
- **Publish + schedule** — `publishContent`, `cancelScheduledPublish`, `updatePostSchedule`

## Generation flow (`POST /api/generate/stream`)

1. Frontend opens an SSE connection with `Accept: text/event-stream`.
2. Worker authenticates the Google ID token, builds the `RequirementReport`, and forwards to the generation worker over the service binding (Bearer = `GENERATION_WORKER_SECRET`).
3. Each upstream `progress` event is forwarded to the client. The terminal `complete` event triggers post-processing (D1 trace persist, image promotion, channel adapter).
4. JSON callers (no SSE accept header) get a single response after the pipeline finishes.

## LLM providers (`src/llm/providers/`)

Pluggable provider abstraction shared with the frontend through `@repo/llm-core`:

- `gemini.ts` — Google Gemini (default)
- `grok.ts` — xAI Grok
- `openrouter.ts` — OpenRouter (multi-model gateway)
- `minimax.ts` — Minimax

Multi-provider UI is gated by `FEATURE_MULTI_PROVIDER_LLM` (set in `features.yaml`). Per-user provider/model preferences live in the `llm_settings` D1 table; per-call usage is logged to `llm_usage`.

## D1 schema

Migrations live in [`migrations/`](migrations/) (currently `0001_pipeline_init.sql` through `0020_feed_interest_groups_clips.sql`). Major tables:

| Table | Purpose |
|---|---|
| `users` | email, onboarding flag, spreadsheet id, tenant settings, status, budget |
| `social_integrations` | connected channels (provider, internal id, display name, avatar, reauth flag) |
| `sheet_rows` | mirror of Google Sheets rows + variants + status + schedule |
| `llm_settings`, `llm_usage` | per-user provider preferences + per-call cost log |
| `post_templates`, `template_assignments` | saved generation rules + assignments |
| `pattern_assignments` | pattern A/B test groups |
| `interest_groups`, `clips` | feed taxonomy + reusable clip library |
| `node_runs` | generation pipeline trace per row |
| `image_gen_model_catalog` | image-gen models + provider configs |
| `custom_personas`, `custom_workflows` | user-defined personas + workflow nodes |
| `newsletters`, `newsletter_voice` | newsletter feature tables |
| `news_snapshots` | cached news research per topic |

The Durable Object holds scheduled-publish alarms — its state is migrated under the same `migrations` config (new SQLite class `ScheduledPublishAlarm`).

## Setup

`setup.py` is the source of truth for the Cloudflare bootstrap flow. Run `python setup.py --all` from the repo root for the full path. Manual steps below if you need finer control. If you update this guide or `setup.py`, update the other in the same change.

The optional **generation worker** is bootstrapped by the same script: `python setup.py --cloudflare` provisions its D1 database; `python setup.py --deploy-worker` deploys it when at least one of `GEMINI_API_KEY` or `XAI_API_KEY` is set, then sets `GENERATION_WORKER_URL` and `GENERATION_WORKER_SECRET` on the main worker. See Step 3 in [`../SETUP.md`](../SETUP.md).

### Install dependencies

```bash
cd worker
npm install
```

The setup script runs this automatically before any worker-related bootstrap action. It also installs `generation-worker/` dependencies.

### Create the KV namespace

```bash
cd worker
npx wrangler kv namespace create CONFIG_KV
npx wrangler kv namespace create CONFIG_KV --preview
```

The setup script can do this for you and update [`wrangler.jsonc`](wrangler.jsonc) automatically.

### Configure local development

Copy `.dev.vars.example` to `.dev.vars`, then fill in the real values.

Generate the encryption key with:

```bash
openssl rand -base64 32
```

Use `CORS_ALLOWED_ORIGINS` to list the frontend origins that can call the worker. The Vite dev server uses **port 5174** (`strictPort` in `frontend/vite.config.ts`), so include both `http://localhost:5173` and `http://localhost:5174` unless you change it.

The setup script writes [`.dev.vars`](.dev.vars) automatically when you run `python setup.py --cloudflare` or `python setup.py --all`.

Run the worker with `npm run dev` from this directory. That uses Wrangler `--env local` and listens on **port 8787** so it matches `VITE_WORKER_URL=http://localhost:8787`. The `local` environment binds `CONFIG_KV` to the **preview** namespace only so local runs do not touch production KV. Variants:

- `npm run dev:remote` — same `local` bindings but on Cloudflare's network
- `npm run dev:default` — root profile (no `local` env)

If Wrangler logs `Error: self-signed certificate in certificate chain`, point Node at your org's CA bundle: `export NODE_EXTRA_CA_CERTS=/path/to/corp-root.pem`.

Preview KV often has no `shared-config` yet, so the queue stays empty until you either copy that key from production KV or set `DEV_SPREADSHEET_ID` in `.dev.vars` to your sheet id.

### Required environment values

| Variable | Purpose |
|---|---|
| `ALLOWED_EMAILS` | Space- or comma-separated Gmail addresses allowed to use the dashboard |
| `ADMIN_EMAILS` | Optional list of users with elevated UI |
| `GOOGLE_CLIENT_ID` | OAuth client id used by the frontend Google sign-in button |
| `GOOGLE_CLOUD_STORAGE_BUCKET` | Bucket used for generated draft images and post-publish cleanup |
| `DELETE_UNUSED_GENERATED_IMAGES` | Enables deletion of non-selected generated images after publish |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Full service-account JSON used to call Google Sheets (secret) |
| `SECRET_ENCRYPTION_KEY` | Base64-encoded 32-byte AES key used to encrypt every stored OAuth / channel token at rest (secret) |
| `POSTED_LOG_DOC_ID` | Optional Google Doc ID. When set, every successful publish appends a human-readable line to that Doc (channel + topic + body + image URLs + post id + UTC timestamp). Service account must have edit access. Failures are logged but do not fail the publish. |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins for CORS |
| `GENERATION_WORKER_URL` | URL of the deployed generation worker |
| `GENERATION_WORKER_SECRET` | Bearer secret matching the generation worker's `WORKER_SHARED_SECRET` (secret) |

To enable popup-based channel connections from the dashboard, also configure:

| Variable | Purpose |
|---|---|
| `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` | Instagram app |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth |
| `META_APP_ID` / `META_APP_SECRET` | Meta app (used for WhatsApp Business) |
| `WHATSAPP_PHONE_NUMBER_ID` | Sender phone id for WhatsApp |
| `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` | Gmail Web OAuth client |

Register these redirect URLs in the provider dashboards:

- `https://<your-worker-domain>/auth/instagram/callback`
- `https://<your-worker-domain>/auth/linkedin/callback`
- `https://<your-worker-domain>/auth/whatsapp/callback`
- `https://<your-worker-domain>/auth/gmail/callback`
- `https://<your-worker-domain>/auth/youtube/callback`

Instagram publishing currently supports approved image posts only — text is used as the caption and text-only rows are rejected for that channel.

Telegram delivery does not require an OAuth app. After the worker is deployed, an admin can store a Telegram bot token in dashboard settings and add saved chat IDs (`@channelusername` or `-1001234567890`).

For generated images, the worker uploads to Google Cloud Storage. Grant the service account `roles/storage.objectAdmin` on that bucket. The worker keeps the selected image and deletes the non-selected variants after a successful delivery on LinkedIn, Instagram, Telegram, or WhatsApp. If you plan to call the bucket from a browser, add a CORS policy for your dashboard origins.

### Run locally

```bash
cd worker
npm run dev
```

### Deploy

Prepare a JSON secrets file:

```bash
cd worker
cat > .deploy-secrets.json <<'EOF'
{
  "GOOGLE_SERVICE_ACCOUNT_JSON": "{\"type\":\"service_account\",...}",
  "SECRET_ENCRYPTION_KEY": "base64-encoded-key",
  "GENERATION_WORKER_SECRET": "matches generation-worker WORKER_SHARED_SECRET"
}
EOF
```

`python setup.py --deploy-worker` (or `--all`) builds an equivalent temporary file for you.

Then:

```bash
cd worker
npx wrangler deploy --env "" --secrets-file .deploy-secrets.json
```

Remove the temporary file after deployment. Copy the worker URL into the frontend as `VITE_WORKER_URL`. The production URL must return JSON from `GET /` — if it returns HTML, that hostname is serving a static deployment and should not be used as the API URL.

## Behaviour summary

- The worker re-verifies the Google ID token on every action call.
- Shared dashboard config is stored in KV under one key.
- Channel OAuth codes are exchanged server-side; the resulting access tokens are stored encrypted (using `SECRET_ENCRYPTION_KEY`).
- Telegram bot tokens are encrypted before storage.
- The browser never talks to Google Sheets directly.
- Scheduled publishes are owned by the `SCHEDULED_LINKEDIN_PUBLISH` Durable Object — alarms re-enter the worker at `/internal/schedule-linkedin-publish`.
- Channel publish fetches (LinkedIn, Instagram, Gmail, WhatsApp) are wrapped in [`fetchWithRetry`](src/integrations/_shared/fetchWithRetry.ts): up to 3 attempts on 429 / 5xx / network errors, exponential backoff (1s → 2s → 4s, capped at 8s), `Retry-After` honoured.
- When `POSTED_LOG_DOC_ID` is set, every successful publish appends a line to that Google Doc as a human-readable history log. Append failures are logged to the worker console and do **not** fail the publish.
