# L2 Research

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Status: PLAN · Output: `episodes/<id>/research.json` (+ `research/` page text and data files)

## Purpose
For each brief question: find the best sources, read the actual pages (including JS-heavy and blocked ones), extract facts and data series with provenance, rate the evidence, and report honestly when a question cannot be supported. The writer receives evidence, not titles.

## Have in this project (verified)
- `adapters/news_web.py` (91 lines): RSS feeds + web search (MiniMax `/v1/coding_plan/search`, ddgs fallback), then `web_fetch.read()` on the top `read_top` (=5) results for a 900-character excerpt.
- `adapters/web_fetch.py`: tiered reader (plain HTTP, then Steel if `STEEL_API_URL` is set). `adapters/news_rss.py`, `adapters/trade_snippet_dates.py` (ported date parsing).
- Source quality ranking (`config/source_quality.yaml`, `rank_sources`, `authority`), forced sources via `--source`, a catalog the writer may cite from (`sources.json`), provenance gate in lint (claims need URLs from the catalog).
- Verified earlier: NSE JSON endpoint and participant-OI CSV are readable; SEBI bulletin PDF needs `pypdf` (throwaway venv); NSE cash API returns only the latest day.
- ep24 evidence: 21 items, but only 3 had page text (NSE 218 chars, moneyvesta 900, LinkedIn 900). Ventura, Tata MF, SSRN, Quora, valueresearch, repec returned nothing.

## What Trade has (read-only survey of `/Users/pratyushmishra/Documents/GitHub/Trade`, 2026-10-06)
Module root `integrations/trade_integrations/` (call it `I`).
| Piece | Where | What it does | Portability |
|---|---|---|---|
| Search tier waterfall | `I/dataflows/web_search_client.py` (945 lines; `search_web` L542, tier order L268) | MiniMax web research then ddgs; filters, URL dedup, domain allowlist, credibility gate, slow-tier circuit breaker, `verify_scalar` cross-vendor number check | Tied to Trade internals; port the idea, not the file |
| MiniMax search client | `I/dataflows/web_research/internal/minimax_client.py` (170 lines) | POST `/v1/coding_plan/search` `{"q":...}` -> `organic[]`; VLM at `/v1/coding_plan/vlm`; Bearer `MINIMAX_API_KEY`; 30 s timeout, 3 retries, account-wide rpm pacing | Rewrite the ~40-line `_post` with plain httpx (we already do in `llm_minimax`/`news_web`); add pacing and retries |
| BrowserOS client | `I/browser_research/browseros_client/client.py` | Local Chromium app with an MCP server over HTTP (JSON-RPC + SSE): `initialize`, session header, `tools/call` (`run` JS, `search`); `probe.py` health check | Self-contained (httpx + stdlib): copy |
| Backend abstraction | `I/browser_research/backends/{base,browseros_backend,steel_backend,registry}.py` | `BrowserBackend` protocol (`fetch_text`, `screenshot`, `search`, `available`); `BROWSER_BACKEND=browseros|steel|auto`; explicit choice never silently falls back; 60 s cache | Self-contained: copy |
| Steel | `steel_backend.py` (433 lines), `docker-compose.stack.yml` L141-152 | `POST /v1/scrape {url, delay, format}`, `/v1/screenshot`, `/v1/pdf`; docker `ghcr.io/steel-dev/steel-browser` ports 3000 and 9223 | Copy backend; run container |
| Fetch chain | `chain.py` (164 lines) | backend chain, then crawl4ai fallback | Tied to crawl4ai engine; simplify |
| crawl4ai engine | `crawl4ai_engine.py` (1,846 lines) | stealth crawler, popup/cookie dismissal JS, block detection, parallel batch | Optional; heavy; maybe later |
| Block/rate helpers | `page_block_detector.py`, `domain_rate_limiter.py`, `batch_url_dedup.py`, `url_policy.py` (in `dataflows/index_research/external_predictions/`) | detect captchas/blocks, per-domain pacing, URL dedup | Small; copy selected functions |
| Agentic browse | `agent/agent.py` (760 lines), prompts (`fact_check`, `record_only` no-fabrication, `schema`) | Claude Agent SDK through a local gateway to MiniMax, pooled clients | Tied to gateway; prompts are reusable ideas |
| Research UI | `ui/server.py`, `ui/html.py` on :8922 | Operator console for fetch/query/agent calls | Not needed |
| Tests (intended behaviour) | `tests/test_web_search_client.py`, `test_browseros_research_browser_backends.py`, `test_crawl4ai_browseros_first.py`, `test_minimax_*` (pace/deadline), `test_browseros_research_record_only_honesty.py` | tier waterfall, backend selection, BrowserOS-first, pacing, no-fabrication | Use as specs for our tests |
Hazard: `I/__init__.py` (L23-27) calls `load_dotenv` on Trade's repo-root `.env`; importing any `trade_integrations.*` loads Trade's secrets. Rule stays: copy code, never import it; read keys only from this project's env.
Local state found (2026-10-06): BrowserOS app is running (listeners 9010/9011/9110/9210; MCP port not confirmed). Docker has no Steel or SearXNG container; nothing on 3000, 8921, 8922.

## Others have
- OpenMontage research stage and juspay/director: research as a pipeline stage with source notes, before scripting.
- Tavily/Exa/Brave-style search APIs (Exa MCP is available in this environment); crawl4ai, Firecrawl, Jina Reader for readable text; Playwright/Steel/BrowserOS for rendered pages.
- Trade's own pattern is the best local reference: multi-tier search, credibility gate, block detection, corroborate-a-number-across-two-vendors.

## Want
1. **Per-question research plan**: from `brief.json` produce 3-6 queries per question (with date scope), run them, rank by authority, and keep a per-question evidence bundle.
2. **Reader chain**: plain HTTP, then Steel `/v1/scrape`, then BrowserOS `run`/`search` for blocked or JS pages, then PDF text (`pypdf`). Return clean text plus a status (`ok|blocked|empty|paywall`) per URL.
3. **Data extraction**: from text, tables and JSON endpoints pull dated facts and series (e.g. daily FII/DII net values with dates) into `research.json` as `{series_id, points[{date,value}], unit, source_url, retrieved_at}`; no per-site adapters (owner rule). An LLM extraction call with a strict schema and "record only, do not infer" prompt; numbers checked against the source text by string match.
4. **Corroboration**: key numbers must appear in two independent sources, or are marked single-source (Trade's `verify_scalar` idea).
5. **Evidence ids**: every fact gets `ev-N` that L3 outline and L4 scenes cite; claims in the episode link back.
6. **Honest stop**: if a brief question has no source with page text and a dated fact, research reports `unsupported: [question ids]` and the run stops with an actionable message.
7. **Cache and budget**: cache by URL+date; per-domain pacing; wall-clock budget per layer; progress in the live runs UI.

## Flaws found (ep24)
1. Single search for the whole topic, not per question; the NSE API gave only the latest day.
2. 7 of 10 pages unread; no fallback when the plain fetch is empty; Steel not running locally.
3. No data extraction step; nothing produced a series for a chart.
4. No check that the date in the brief appears in the evidence.
5. The model saw titles and snippets and filled in the rest.

## Work items
- L2.1 **Copy from Trade (exact, per the 2026-10-06 module survey; paths under `Trade/integrations/trade_integrations/`):**
  - `browser_research/browseros_client/client.py` (271 lines, single file, `httpx` + `BROWSEROS_MCP_URL`) into `third_party/trade/browseros_client.py`, plus optional `probe.py` (100 lines). Copy the files, never import the package: `trade_integrations/__init__.py` loads Trade's `.env`.
  - `browser_research/prompts/record_only.py` (70 lines, pure text), reworded to drop the Trade tool names, as the honesty prompt for the extraction call.
  - `browser_research/backends/base.py` (135 lines, stdlib; `BrowserResult`, `strip_untrusted_wrapper`) only if the BrowserOS tier needs it.
- L2.2 **Already ported, keep as is:** MiniMax search (`adapters/news_web.py`, POST `/v1/coding_plan/search`, ddgs fallback) and Steel scrape (`adapters/web_fetch.py`, `/v1/scrape`). Not copied from Trade because they depend on Trade internals and crawl4ai: `chain.py`, `web_search_client.py` (searxng tier), `crawl4ai_engine.py`. Rebuild the chain in `web_fetch.py`: plain fetch, then Steel, then BrowserOS, then PDF text.
- L2.2b **Two-source number check:** rewrite Trade's `verify_scalar` (about 40 lines of pure Python: extract numbers from results, require two independent sources within a tolerance, else no value) into `research.py`; the real one lives inside the 945-line `web_search_client.py` and cannot be copied alone.
- L2.2c Check `adapters/common.py`: it runs `load_dotenv` on this project's `.env` and the parent `../.env`; confirm the parent path is not Trade's `.env` before any secret-bearing run.
- L2.3 Reader chain with status codes, PDF support (`pypdf` added to requirements), block detector.
- L2.4 `research.py`: query planner per brief question, run, rank (`source_quality.yaml`), read top N per question, write `research.json` + page texts.
- L2.5 Extraction call (schema `research.schema.json`) + string-match verification of every number.
- L2.6 `run.py research <id>` + report with unsupported questions.
- L2.7 Local services doc and `run.py research-doctor` (checks Steel at :3000, BrowserOS MCP URL, MiniMax key present, without printing secrets). Start Steel: `docker compose` service copied from Trade's compose.
- L2.8 Selfcheck + tests modelled on Trade's `test_web_search_client`, `test_crawl4ai_browseros_first`, record-only honesty.

## Acceptance
- Golden brief (FII/DII, 1 Oct): at least 2 sources with page text per question; a dated series for 30 Sep to 5 Oct with FII and DII net values from NSE or an equivalent, corroborated by a second source; or an explicit unsupported report.
- Every number in the extraction appears verbatim in its source text (test).
- With Steel and BrowserOS stopped the layer degrades to plain + ddgs and says so; with an explicit backend that is down it fails loudly.

## Depends on
L1. Feeds L3, L4, L6 (provenance). Extraction call runs on the existing MiniMax chain (X1).

## Open questions
- None. Owner decisions: no backend selection (use the copied chain; each tier is used when available), search is MiniMax + ddgs, no extra paid search keys.
- Should crawl4ai be ported now or only if the reader chain proves insufficient?

## Setup scope (rev 3)
This phase only delivers the layer kit (master plan 6.1): `research.json` contract and a per-question runner using the Trade-ported search and page reader, `unsupported` flag that stops the run, fixture with one answerable and one unanswerable question. Backlog: B-L2-*. Everything else in Want and Work items is improvement work, to be picked from the backlog after setup.

## Reuse and parallelism (rev 2, 2026-10-06)
IDs refer to [R1](R1-reuse-register.md). Items are leads until a work package opens and runs the file.
- **Take:** R-80 MoneyPrinterTurbo `material*.py` (MIT) only if stock footage or images are wanted for b-roll; R-81 mining refs for topic angles (TEXT). Core research stays the Trade port already in this plan (no new repo needed).
- **Parallel:** one worker per brief question; page fetch/read in a pool with per-host rate limits (R-73 `rate_limiter.py`). Output `research.json` is the only join point.

## Risks and mitigations (rev 5)
- Thin or unreadable pages (7 of 10 had no text in ep24): reader chain with BrowserOS tier, per-question `unsupported` flag that stops the run instead of writing around the gap.
- Wrong numbers: two-source check and string match (C1 claim ledger).
- Time: questions researched in parallel with per-host rate limits; page text cached by URL hash.
