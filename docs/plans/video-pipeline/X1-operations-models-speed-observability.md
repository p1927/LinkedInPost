# X1 Operations: models, speed, cost, observability

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Status: live runs built; model routing and speed unsolved

## Purpose
Make runs fast enough to iterate (target: a full script in under 30 minutes, repairs in minutes), cheap, and visible while they run.

## Have (verified)
- `config/providers.yaml`: `llm` (picker, M3 then M2.7 then M2.5, temp 0.8), `llm_write` (writer and repair: M3 then M2.7, temp 0.7), `llm_verify` (verifier: M2.7 then M2.5, temp 0.2), `llm_gemini` present but disabled (`gemini-3.5-flash`, `gemini-2.5-flash`).
- `Budget.call`: token cap (300k), per-call timing, progress via `runlog.py`, wall-clock deadline per attempt (420 s), retries 30/90/180 s, model fallback.
- Live runs: `runlog.py` (`out/runs/<id>/meta.json` + log tee), `live_server.py` (127.0.0.1:8765, read-only, CORS allowlist, host check, redaction), frontend `LiveRunsPanel`, `run.py director-status`.
- ep24 timings: choose mode 44 s, analogy 180 s, writer 992 s (27k in, 4.4k out), mechanical repair 767 s and 828 s, semantic repair 880 s; about 5 output tokens per second; 8 calls, 101 minutes total, about 126k tokens.

## Others have
- Trade routes MiniMax through a local executor gateway with pooled clients, account-wide pacing and queue deadlines (tests: `test_minimax_httpx_pace`, `test_minimax_queue_bounded_lock`, `test_minimax_text_job_deadline`).
- Agent frameworks use a cheap model for planning/repair/judging and a strong one for the final write; prompt caching for static prefixes. (Owner decision: no separate fast model for us; all calls stay on MiniMax.)

## Want
- Keep the existing per-role MiniMax chains in `providers.yaml` as they are (M3 -> M2.7 -> M2.5); no Gemini or other provider; no new 'fast model' tier.
- Speed measurement per model (tokens per second, time to first token) recorded in the run log and a small benchmark command (`run.py llm-bench`), so we choose models by data.
- Parallelism where calls are independent (verifier passes, per-question research, per-scene writing).
- Static prefix caching or prompt trimming; track input tokens per call (writer system prompt is about 27k).
- Cost and time summary after every run, and a UI card with step, elapsed, model, tokens/second, and a clear "waiting on model" state (exists).
- Resumable runs: `run.py director --resume <run>` continues from the last finished layer using the on-disk artifacts.

## Flaws found
1. Every call uses a slow thinking model; repairs run on the same strong writer model.
2. All calls are sequential, including independent verifier passes.
3. No benchmark or per-model speed data; model choice is by assumption.
4. A run that ends in "mechanical budget used up" cannot resume without `--repair`.

## Work items
- X1.1 `llm-bench`: same prompt, each configured model, report latency and tokens/second (free except text-call cost).
- X1.2 Add `llm_outline` and `llm_extract` roles to `providers.yaml` pointing at the existing MiniMax chains (no new provider).
- X1.3 Parallelise independent verifier passes and per-question research calls.
- X1.4 Static-prefix trimming and caching where supported.
- X1.5 Resume support using layer artifacts, and the parallel lane runner: one-hour spike comparing `doit` (R-99, md5 file-dependency caching) with stdlib `concurrent.futures` + `cache.py`; adopt whichever needs fewer new lines. No hand-built DAG engine.
- X1.6 UI: per-call model and tokens/second in the Live runs panel, and the approval toggles (outline off by default, script, preview) as switches on the run page.

## Acceptance
- Benchmark table committed to docs; golden brief total LLM wall time under 30 minutes on default models, (speed from fewer calls, targeted repair and parallel lanes, not a different model); a killed run resumes without repeating finished layers.

## Depends on
L4 (call structure), L2 (extraction), X2 (golden brief).

## Open questions
- None: Gemini and other providers are out of scope (owner decision, all via MiniMax).

## Setup scope (rev 3)
This phase only delivers the layer kit (master plan 6.1): Per-stage timing log, retry and rate limiter wired, DAG runner for the parallel lanes, disk-space check before installs and renders. Backlog: B-X1-*. Everything else in Want and Work items is improvement work, to be picked from the backlog after setup.

## Reuse and parallelism (rev 2, 2026-10-06)
IDs refer to [R1](R1-reuse-register.md). Items are leads until a work package opens and runs the file.
- **Take:** R-73 ViMax `retry.py` / `rate_limiter.py` / `robust_json_parser.py` (MIT, COPY); R-85 cost ledger (estimate -> reserve -> reconcile into `cost_log.json`, warn/cap modes; CONCEPT from AGPL OpenMontage, own code) feeding `run.py` `clip_cost_gate`; R-86 provider scoring only if a second provider appears.
- **Work items added:** X1.5 concurrency settings per stage (LLM rate limiter, render chunks) and a per-stage timing log so the parallel graph in the master plan is measured, not assumed.
- **Parallel:** the master-plan execution graph is implemented here as a small DAG runner over the per-layer commands (run, cache by input hash, join at gates).

## Risks and mitigations (rev 5)
- **LLM speed (owner request: reasoning off):** MiniMax M3 accepts a switch to turn thinking off (**verified 2026-10-06, spike S-08 passed**: `thinking: {"type": "disabled"}` is the field that works; the `reasoning` / `reasoning_effort` variants still produced think text. Realistic outline call: 5.9 s with thinking off vs 35.0 s on, same model; M2.7, which always thinks, took 40.2 s). M2.5/M2.7 are always-thinking models, so the writer chain keeps M3 first with reasoning off and the verifier keeps M2.7 (thinking on, small prompts). **Done:** `adapters/llm_minimax.py` takes `reasoning=False` (sends the disable field for M3, no think overhead, keeps `reasoning_split` for M2.x); `providers.yaml` sets `reasoning: false` for `llm` and `llm_write`; `llm_verify` (M2.7) is unchanged. If quality drops, turn it back on for the writer only.
- Single provider: checkpointed layers, resume, per-stage retries; an outage stops a run but loses no finished work.
- Machine load: per-stage concurrency caps, disk watchdog, timing log.
- Time target is unproven: E1 records real stage times, targets are revised from data.
