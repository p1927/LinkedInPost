# `setup/` — setup helpers

Python modules used by the top-level `setup.py` CLI and a Node-based browser wizard. The full deployment guide lives in [`../SETUP.md`](../SETUP.md).

## Layout

```
setup/
├── cli.py             # Argument parsing for `python setup.py`
├── cloudflare.py      # Wrangler + D1 + KV provisioning
├── worker_config.py   # Reads/writes worker/ and generation-worker/ wrangler.jsonc
├── google_resources.py# Sheet, Drive folder, Docs log, GCS bucket bootstrap
├── github.py          # `gh secret set` for GitHub Actions secrets
├── verification.py    # Post-deploy health checks
├── features.py        # Loads features.yaml
├── constants.py       # Shared paths and names
├── utils.py           # Helpers
└── wizard/            # Browser wizard (Node + Playwright). `python setup.py --web`
```

## Usage cheatsheet

```bash
python setup.py --web                 # browser wizard at http://localhost:4242
python setup.py --all                 # full headless: Cloudflare provision + deploy + GH secrets
python setup.py --install-worker-deps # only install npm deps for both workers
python setup.py --cloudflare          # only provision D1 + KV, write wrangler.jsonc
python setup.py --deploy-worker       # deploy both workers
python setup.py --sync-github-secrets # push values to GitHub Actions
```

For the full step-by-step guide, environment variables, and verification checklist, see [`../SETUP.md`](../SETUP.md).
