#!/usr/bin/env python3
"""
Bootstrap script for LinkedIn Bot.

The script is the source of truth for the repository bootstrap flow.
Keep Cloudflare deployment notes in worker/README.md and SETUP.md in sync with
this file. If you update either side, update the other in the same change.

Modules live in setup/ — each file is under 500 lines:
  setup/constants.py       — shared paths and header constants
  setup/utils.py           — ok/warn/fail/run_command/ensure_command helpers
  setup/cli.py             — argument parser
  setup/features.py        — feature-flag loading and generation
  setup/google_resources.py — Google Drive/Sheets/GCS provisioning
  setup/worker_config.py   — WorkerBootstrap dataclass, wrangler config, secrets
  setup/cloudflare.py      — KV/D1 provisioning, Worker deploy
  setup/verification.py    — Worker endpoint and CORS verification
  setup/github.py          — GitHub repo inference, bootstrap, secret sync

Examples:
    python setup.py
    python setup.py --cloudflare
    python setup.py --all

Gmail connect: set GMAIL_CLIENT_SECRET in `.env` (and optionally GMAIL_CLIENT_ID;
otherwise the script reuses VITE_GOOGLE_CLIENT_ID). Run `python setup.py --cloudflare`
so `worker/.dev.vars` and `wrangler.jsonc` include Gmail vars.

Optional LLM and news research: when set in `.env`, `XAI_API_KEY`, `NEWSAPI_KEY`,
`GNEWS_API_KEY`, `NEWSDATA_API_KEY`, and `RESEARCHER_RSS_FEEDS` are copied into
`worker/.dev.vars`, included in Worker deploy secrets when non-empty, and synced
to GitHub Actions secrets with `--sync-github-secrets`.
"""

from __future__ import annotations

import sys

from dotenv import load_dotenv

from setup.cli import parse_args
from setup.cloudflare import (
    create_cloudflare_kv_namespaces,
    ensure_cloudflare_auth,
    ensure_worker_deploy,
    install_worker_dependencies,
    provision_d1_database,
    update_worker_wrangler_config,
    write_worker_dev_vars,
)
from setup.constants import WORKER_DEV_VARS, WORKER_WRANGLER_CONFIG
from setup.features import load_features_map, run_generate_features_script
from setup.github import bootstrap_worker_config, sync_github_secrets
from setup.utils import fail, warn
from setup.worker_config import print_bootstrap_summary

load_dotenv()


def main() -> None:
    args = parse_args()
    run_generate_features_script()

    if args.all:
        args.install_worker_deps = True
        args.cloudflare = True
        args.deploy_worker = True
        args.sync_github_secrets = True
    if args.deploy_worker:
        args.cloudflare = True
    if args.cloudflare or args.deploy_worker or args.sync_github_secrets:
        args.install_worker_deps = True
    if args.cloudflare or args.deploy_worker:
        ensure_cloudflare_auth()
    if args.install_worker_deps:
        install_worker_dependencies()

    google_resources = None if args.skip_google else _create_google_resources(args.share_email)
    if args.skip_google:
        warn('Google resource creation', 'skipped by flag')

    worker_bootstrap = None
    if args.cloudflare or args.deploy_worker or args.sync_github_secrets:
        worker_bootstrap = bootstrap_worker_config(args, google_resources)

    if args.cloudflare:
        create_cloudflare_kv_namespaces(worker_bootstrap)
        provision_d1_database()
        update_worker_wrangler_config(worker_bootstrap)
        write_worker_dev_vars(worker_bootstrap, google_resources)

    if args.deploy_worker:
        ensure_worker_deploy(worker_bootstrap, google_resources)

    if args.sync_github_secrets:
        sync_github_secrets(worker_bootstrap, google_resources)

    print_bootstrap_summary(args, google_resources, worker_bootstrap, WORKER_DEV_VARS, WORKER_WRANGLER_CONFIG)

    if not load_features_map().get('newsResearch', True):
        print(
            '  [features] newsResearch is false in features.yaml — Settings → News and the news search RPC '
            'are disabled; optional NEWSAPI_KEY, GNEWS_API_KEY, NEWSDATA_API_KEY, and RESEARCHER_RSS_FEEDS '
            'are not required. When enabled, search history is stored in D1, not in a Google sheet.',
        )


def _create_google_resources(shared_email: str) -> object:
    from setup.google_resources import create_google_resources
    return create_google_resources(shared_email)


if __name__ == '__main__':
    try:
        main()
    except RuntimeError as error:
        fail('setup.py', str(error))
        sys.exit(1)
