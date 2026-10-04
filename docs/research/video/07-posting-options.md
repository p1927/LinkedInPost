# 07 - Posting options: finished vertical MP4 -> YouTube Shorts + Instagram Reels

Date: 2026-10-05. Scope: solo creator, ~1 video/day, schedule + read back post URL and stats.
Labels: [V] verified on an official/vendor page fetched today; [S] from third-party search snippet; [U] unverified.

## TL;DR
- Fastest to a working flow: a hosted API-first scheduler (Upload-Post free/Basic, or Zernio). No Google/Meta app approval, one HTTP call, MP4 + title + caption.
- Best long term: Postiz (AGPL, self-host or cloud) if you want an owned UI/queue, or direct Google/Meta APIs inside the existing Worker once volume or lock-in matters. Direct YouTube needs an audit; direct Instagram needs only Standard access for your own account.

## Comparison (1 video/day = ~30/month)

| Option | Cost for ~30 videos/mo | Setup time | API / automation | Account risk | Lock-in | Post URL + analytics |
|---|---|---|---|---|---|---|
| Upload-Post | Free: 10 uploads/mo [V]; Basic $24/mo ($16 annual), 5 profiles, unlimited uploads, scheduling, analytics [V] | ~30 min | REST, Python/JS SDK, n8n/Make/Zapier, MCP (40 tools) [V] | Low (uses official APIs; they own the approved apps - which app/audit status they hold is [U]) | Low (thin REST) | Analytics yes [V]; exact post-URL field [U] - check docs.upload-post.com |
| Zernio (ex Late/getlate) | First 2 accounts free, then $6/acct (3-10) [S]; 2 accounts (YT+IG) = $0 | ~30 min | Unified API, 15 platforms, all features on every tier [S] | Low | Low | [U] verify post URL/analytics endpoints |
| Blotato | $29/mo Starter, 20 accounts, 200 scheduled posts, 400 MB upload [V]; no free tier; API ends trial immediately [V] | ~30 min | REST + MCP (36 tools), 9 platforms incl. YouTube, IG [V] | Low | Medium (credits/AI features bundled) | Analytics on 8 platforms [V]; URL field [U] |
| Postiz Cloud | $29/mo Standard (5 channels), unlimited posts, API+CLI+MCP all plans, 7-day trial [V] | ~20 min | Public API, Node SDK, n8n node, Make, MCP, CLI [V]; 100 create-post req/hr (cloud) [V] | Low | Low (open source, exportable) | Analytics tab [V]; programmatic post-URL [U] |
| Postiz self-host | $0 software + VPS (Postgres, Redis, Temporal, Docker) [V]; unlimited channels | 0.5-2 days | Same API; `API_LIMIT` configurable [V] | Medium (your tokens, your apps) | Lowest | Same |
| Ayrshare | $149/mo Premium, 1 profile; unlimited API calls [V] | ~30 min | Mature API, 14+ networks [V] | Low | Medium | Strong analytics [V], post URLs returned [S] |
| Buffer | API on all plans, free plan 1 key / 3,000 req/mo [S]; plan price [U] | ~30 min | API + webhooks [S] | Low | Medium | Limited [U] |
| Publer | Free 3 channels; API only on Business tier+ [S]; price [U] | ~30 min | API gated to Business [S] | Low | Medium | [U] |
| Metricool | [U] not researched in detail; API tied to paid plans | - | - | - | - | - |
| Direct YouTube + IG (in Worker) | $0 | 2-5 days + YouTube audit wait | Full control | Medium | None | Yes (video id -> URL; IG permalink via media fields) |

Notes: prices change; verify before paying. Vendor-run comparison blogs (Blotato about Zernio/Postiz/Upload-Post) are biased and were not relied on.

## Option detail and gotchas

### (a) Postiz (github.com/gitroomhq/postiz-app) [V]
- License AGPL-3.0. Stack: Next.js, NestJS, Prisma/Postgres, Temporal, Redis; Docker/Coolify/Railway. Supports YouTube, Instagram, TikTok, LinkedIn, X, Threads and more.
- Hosted: Standard $29, Team $39, Pro $49, Ultimate $99 per month; MCP, CLI, API on all plans; 7-day trial (https://postiz.com/pricing).
- API: API key or OAuth `pos_` token, `/upload` for media then create post with `now` or scheduled time (https://docs.postiz.com/public-api/introduction).
- Approval model: hosted uses Postiz's already-approved Google/Meta apps (you just click connect). Self-host: you create your own Google Cloud project and Meta app and put keys in .env [V/S]; therefore YOUR YouTube project is unverified -> uploads forced private until audit (see c). Self-host is NOT the fast path for YouTube.
- Self-host token/upload breakage is a common complaint in the issue tracker [S].

### (b) Hosted API schedulers
- They hold the audited YouTube project and approved Meta app, so videos publish public on first call. Trade-off: you depend on their approval staying valid.
- Upload-Post: https://www.upload-post.com/pricing, docs https://docs.upload-post.com. Free tier 10 uploads/mo is too small for daily posting (30), so Basic $24 is the minimum [V].
- Zernio: https://zernio.com; free 2 accounts is the cheapest daily flow [S, confirm on site].
- Ayrshare is priced for agencies; $149/mo is hard to justify solo [V].
- Instagram requires a Business/Creator account through any provider [V for direct API].
- Check each provider for: Shorts detection (vertical, <=3 min [U] for current limit), `title` vs `description` mapping for YouTube, max upload size (Blotato 400 MB [V]), and whether it accepts a URL (R2/GCS signed URL) rather than multipart.

### (c) Direct APIs
YouTube Data API v3:
- `videos.insert`: resumable upload, scopes `youtube.upload` or `youtube` [V] (https://developers.google.com/youtube/v3/docs/videos/insert).
- Quota: the page lists a 1-unit cost in a separate Video Uploads bucket with 100 calls/day for new projects [V from fetched page; older docs cited 1,600 units of a 10,000/day pool - the 100 uploads/day default is ample for 1/day]. See https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits [V].
- Private lock: "All videos uploaded via videos.insert from unverified API projects created after 28 July 2020 will be restricted to private viewing mode" until a compliance audit passes [V]. Audit form: "Audit & Quota Extension" [V]. Turnaround is [U]; expect days to weeks. Workaround for personal use: upload private via API and flip to public manually, or let the audit run.
- Also: OAuth consent screen in "Testing" mode makes refresh tokens expire after 7 days [U from experience; verify]; publish the consent screen (sensitive-scope verification may be required for `youtube`/`youtube.upload`) [U].
- Shorts = vertical/square, <= 3 min [U current limit]; add #Shorts in title/description to be safe.
- Post URL = https://youtube.com/shorts/{id} from response id. Stats via `videos.list?part=statistics` (1 unit).

Instagram Graph API Reels [V] (https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing):
- Professional (Business/Creator) account; permission `instagram_business_content_publish` (IG Login) or `instagram_content_publish` (FB Login).
- Standard Access suffices to publish to your own account (no App Review needed for own account) [V].
- Flow: POST /{ig-id}/media with `media_type=REELS`, `video_url` (must be publicly reachable when Meta fetches it) or resumable upload via rupload.facebook.com; poll GET /{container-id}?fields=status_code (IN_PROGRESS / FINISHED / ERROR / EXPIRED); then POST /media_publish.
- Limit: 100 API-published posts per 24h rolling [V]. Fine for 1/day.
- Specs (length, ratio, size) not on the fetched page [U]; check the reference for Reels (typically 9:16, H.264/AAC, up to ~90s-15 min depending on version).
- Permalink: GET /{media-id}?fields=permalink; insights via /{media-id}/insights [U page not fetched].
- Tokens: long-lived tokens (60 days) need refresh [U].

### (d) Existing LinkedInPost repo (read-only review)
- `worker/src/integrations/instagram/index.ts` (186 lines): already has Graph v25.0, `/media`, `waitForContainerReady` polling of `status_code`, `/media_publish`, retry helper. Handles only images/carousels (`resolveInstagramImageUrls`); no `media_type=REELS`/`video_url`. Adding Reels is small: new `publishInstagramReel({videoUrl, caption})` reusing container + poll + publish, with longer polling timeouts. Effort ~0.5-1 day.
- `worker/src/index.ts`: `startYouTubeAuth` (line ~3433) already does Google OAuth with offline access and `prompt=consent`, scope `https://www.googleapis.com/auth/youtube` (covers upload), stores encrypted access + refresh tokens. No uploader exists. `publishContent` (line ~4816) has `mediaMode: 'image' | 'text'`, branches per channel (instagram ~4891, linkedin ~4960, telegram, gmail) with no youtube branch. Needs a `video` mediaMode and a YouTube branch.
- YouTube uploader effort: Workers can stream a resumable upload (fetch with body stream from GCS/R2); refresh-token exchange exists. ~1-2 days including testing. Large MP4 memory limits on Workers: stream, do not buffer [U].
- Scheduler Durable Object and GCS bucket exist, so scheduling and a public/signed `video_url` host are covered (GCS public or signed URL works for IG `video_url`).
- Real blocker is YouTube project verification (private lock), not code. Check which Google Cloud project `YOUTUBE_CLIENT_ID` belongs to and whether it was created before 28 Jul 2020 (unlikely).

## Recommendation

Fastest to a working full flow (topic -> video -> posted, today): Upload-Post Basic ($24/mo) or Zernio free (2 accounts). Single HTTP call with MP4 URL, title, caption, `scheduled_date`; connect YouTube + Instagram with their OAuth; publishes public immediately. Keep the call behind a small `Publisher` interface in the pipeline (`publish(video, meta) -> {url, id}`; `stats(id)`) so swapping is cheap. Confirm post-URL/analytics fields in docs during the checklist; fall back to polling their status/analytics endpoint if URL not in the response.

Best long term: owned integration in the existing Worker for Instagram (no approval needed, code mostly there) plus YouTube direct once the compliance audit is approved (submit it in parallel, day 1, since it is the long pole). Postiz Cloud ($29) is the middle path if you want a UI and TikTok/LinkedIn later without writing four integrations; self-host Postiz only if you accept running Temporal/Redis/Postgres and your own unverified YouTube project.

TikTok later: direct Content Posting API also requires an audit for public posts [U, verify]; another reason to keep an aggregator for TikTok/LinkedIn.

## Setup checklist (recommended: Upload-Post as fast path, direct IG/YT as parallel track)

1. Instagram: convert to Professional (Creator/Business) account; confirm login works.
2. Create Upload-Post account (free tier), connect YouTube channel and Instagram; create API key.
3. Host the finished MP4 at a public/signed URL (existing GCS bucket) - 9:16, H.264/AAC.
4. Test call via curl: MP4 URL, `title`, `description`/caption, platforms `youtube,instagram`, then a scheduled variant. Check the YouTube video is public and shows as a Short; check Reel appears.
5. Record which fields return post URL/id; call the analytics endpoint; store `{platform, url, id, scheduled_at, status}` in the sheet/DB row.
6. Add a Publisher module to the pipeline (Python `video-pipeline/run.py` or the Worker) with a cron/poll to fill stats after 24h.
7. Upgrade to Basic ($24) before the 10th upload (free cap 10/mo).
8. Parallel track: create Google Cloud project, enable YouTube Data API v3, submit "Audit & Quota Extension" form describing a single-creator uploader; publish OAuth consent screen. Create Meta app, add Instagram product, use Standard access with your own account.
9. In repo: add `publishInstagramReel` in `worker/src/integrations/instagram/index.ts`, a YouTube resumable uploader, and a `video` mediaMode in `publishContent`; switch channel by config flag when audit clears.
10. Add alerting for token expiry (IG 60-day long-lived token, Google refresh-token revocation).

## Sources
- https://github.com/gitroomhq/postiz-app ; https://postiz.com/pricing ; https://docs.postiz.com/public-api/introduction
- https://www.upload-post.com/pricing ; https://www.upload-post.com/llms-full.txt
- https://www.ayrshare.com/pricing/ ; https://www.blotato.com/pricing.md
- https://developers.google.com/youtube/v3/docs/videos/insert ; https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits
- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing
- Search snippets [S]: Zernio pricing (softwareadvice/capterra listings), Buffer/Publer API access (socialk.it, postfa.st), Postiz self-host app creation (mintlify install page)
