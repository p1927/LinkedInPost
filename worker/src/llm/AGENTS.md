<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# worker/src/llm

## Purpose
LLM client wrappers and utilities for the main worker. Provides a configured gateway to AI providers, structured JSON output helpers, pricing/policy enforcement, and provider management.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | LLM module entry point |
| `gateway.ts` | AI provider gateway — routes requests to the correct provider |
| `catalog.ts` | Model catalog available in the worker context |
| `policy.ts` | Usage policy enforcement (rate limits, model restrictions) |
| `pricing.ts` | Token cost estimation per model |
| `structuredJson.ts` | Helpers for requesting and parsing structured JSON from LLMs |
| `types.ts` | LLM interaction types |
| `d1Settings.ts` | D1-persisted LLM settings (model preferences per user) |
| `genWorkerDefaults.ts` | Default model/config for generation worker calls |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `providers/` | Individual provider implementations (Anthropic, Google, etc.) |

## For AI Agents

### Working In This Directory
- Use `gateway.ts` for all LLM calls — do not instantiate provider clients directly in feature code
- `structuredJson.ts` wraps LLM calls that need typed JSON responses — prefer it over parsing raw strings
- Model selection respects `policy.ts` constraints; adding a new model requires updating `catalog.ts` and `providers/`

<!-- MANUAL: -->
