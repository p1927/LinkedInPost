from __future__ import annotations

import json
import os
from pathlib import Path

import requests
from flask import Blueprint, render_template

from ..state import load, mark_complete

bp = Blueprint('verify', __name__)


def get_worker_url() -> str | None:
    wrangler_path = Path('worker/wrangler.jsonc')
    if not wrangler_path.exists():
        return None
    try:
        import re
        text = wrangler_path.read_text()
        # Strip JSONC comments
        text = re.sub(r'//.*', '', text)
        data = json.loads(text)
        name = data.get('name', '')
        # Derive workers.dev URL from worker name
        cf_subdomain = os.environ.get('CLOUDFLARE_SUBDOMAIN', '')
        if cf_subdomain:
            return f'https://{name}.{cf_subdomain}.workers.dev'
        return None
    except Exception:
        return None


def check_worker_health(worker_url: str) -> tuple[bool, str]:
    try:
        resp = requests.get(f'{worker_url}/health', timeout=10)
        return resp.ok, str(resp.status_code)
    except Exception as e:
        return False, str(e)


def check_env_key(key: str) -> bool:
    return bool(os.environ.get(key, '').strip())


@bp.get('/step/verify')
def show():
    worker_url = get_worker_url()
    worker_ok, worker_msg = check_worker_health(worker_url) if worker_url else (False, 'Worker URL unknown')
    checks = [
        {'name': 'Worker responds', 'ok': worker_ok, 'detail': worker_msg},
        {'name': 'Gemini API key set', 'ok': check_env_key('GEMINI_API_KEY'), 'detail': ''},
        {'name': 'Google service account set', 'ok': check_env_key('GOOGLE_SERVICE_ACCOUNT_JSON'), 'detail': ''},
        {'name': 'Cloudflare token set', 'ok': check_env_key('CLOUDFLARE_API_TOKEN'), 'detail': ''},
        {'name': 'LinkedIn configured (optional)', 'ok': check_env_key('LINKEDIN_CLIENT_ID'), 'detail': 'optional'},
        {'name': 'Telegram configured (optional)', 'ok': check_env_key('TELEGRAM_BOT_TOKEN'), 'detail': 'optional'},
    ]
    all_ok = all(c['ok'] for c in checks if 'optional' not in c['detail'])
    if all_ok:
        mark_complete('verify')
    return render_template('step_verify.html',
                           checks=checks,
                           all_ok=all_ok,
                           worker_url=worker_url,
                           wizard_state=load(),
                           current_step='verify')
