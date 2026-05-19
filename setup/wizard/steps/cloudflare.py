# setup/wizard/steps/cloudflare.py
from __future__ import annotations

import os
import subprocess

import requests
from dotenv import set_key
from flask import Blueprint, redirect, render_template, request, url_for

from ..state import load, mark_complete

ENV_FILE = '.env'
bp = Blueprint('cloudflare', __name__)


def validate_cf_token(token: str) -> tuple[bool, str]:
    # Short‑circuit for empty tokens to avoid unnecessary network calls and failures.
    if not token:
        return False, 'Empty token'
    resp = requests.get(
        'https://api.cloudflare.com/client/v4/user/tokens/verify',
        headers={'Authorization': f'Bearer {token}'},
        timeout=10,
    )
    if not resp.ok:
        return False, 'Request failed'
    data = resp.json()
    if data.get('success'):
        result = data.get('result')
        if isinstance(result, dict) and 'status' in result:
            return True, result['status']
        return False, 'Invalid response: result missing or malformed'
    return False, str(data.get('errors', 'Unknown error'))


def get_cf_account_id(token: str) -> str | None:
    resp = requests.get(
        'https://api.cloudflare.com/client/v4/accounts',
        headers={'Authorization': f'Bearer {token}'},
        timeout=10,
    )
    if not resp.ok:
        return None
    accounts = resp.json().get('result', [])
    if accounts and isinstance(accounts[0], dict) and 'id' in accounts[0]:
        return accounts[0]['id']
    return None


@bp.get('/step/cloudflare')
def show():
    return render_template('step_cloudflare.html',
                           wizard_state=load(),
                           current_step='cloudflare',
                           error=None,
                           provisioning_done=False)


@bp.post('/step/cloudflare')
def submit():
    token = request.form.get('cloudflare_api_token', '').strip()
    ok, msg = validate_cf_token(token)
    if not ok:
        return render_template('step_cloudflare.html',
                               wizard_state=load(),
                               current_step='cloudflare',
                               error=f'Token validation failed: {msg}',
                               provisioning_done=False)

    set_key(ENV_FILE, 'CLOUDFLARE_API_TOKEN', token)
    os.environ['CLOUDFLARE_API_TOKEN'] = token

    # Run Cloudflare provisioning using existing setup module
    result = subprocess.run(
        ['python', 'setup.py', '--cloudflare'],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        return render_template('step_cloudflare.html',
                               wizard_state=load(),
                               current_step='cloudflare',
                               error=result.stderr or result.stdout,
                               provisioning_done=False)

    mark_complete('cloudflare')
    return redirect(url_for('apikeys.show'))
