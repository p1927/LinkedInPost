<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# setup

## Purpose
Python CLI setup wizard for first-run configuration. Guides users through connecting Google Sheets, configuring API keys, setting up Cloudflare Workers, and verifying the environment. Entry point is `../setup.py`.

## Key Files

| File | Description |
|------|-------------|
| `cli.py` | Main CLI orchestration — step sequencing and user prompts |
| `cloudflare.py` | Cloudflare Worker and KV/D1 provisioning helpers |
| `constants.py` | Shared constants (env var names, default values) |
| `features.py` | Feature flag detection and configuration |
| `github.py` | GitHub integration helpers |
| `google_resources.py` | Google Sheets and OAuth setup helpers |
| `utils.py` | Shared utility functions |
| `verification.py` | Post-setup verification checks |
| `worker_config.py` | Worker secrets and environment variable injection |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `wizard/` | Step-by-step wizard screens, templates, and tests |

## For AI Agents

### Working In This Directory
- Entry point is `setup.py` at the repo root — this imports from this directory
- After every `setup.py` invocation, a TypeScript dry-run build (`tsc --noEmit`) runs for both `frontend/` and `worker/`
- Python 3.9+ required; dependencies in `requirements.txt` at repo root
- Tests live in `wizard/tests/`

### Testing Requirements
- `python -m pytest setup/wizard/tests/` — runs setup wizard tests

### Common Patterns
- Each setup step is a function in `cli.py` that calls helpers from other modules
- Verification checks in `verification.py` confirm external services are reachable
- Constants in `constants.py` are the single source of truth for env var names

<!-- MANUAL: -->
