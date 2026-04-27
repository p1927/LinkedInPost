from __future__ import annotations

import json
import os

from dotenv import set_key
from flask import Blueprint, redirect, render_template, request, url_for

from ..state import load, mark_complete

ENV_FILE = '.env'
bp = Blueprint('google', __name__)


def validate_service_account(json_str: str) -> tuple[bool, str]:
    try:
        data = json.loads(json_str)
    except json.JSONDecodeError:
        return False, 'Invalid JSON'
    required = ['type', 'project_id', 'private_key', 'client_email']
    for field in required:
        if field not in data:
            return False, f'Missing field: {field}'
    if data.get('type') != 'service_account':
        return False, 'JSON must be a service_account key, not ' + data.get('type', '?')
    return True, data['client_email']


def validate_oauth_client_id(client_id: str) -> bool:
    return client_id.endswith('.apps.googleusercontent.com') and len(client_id) > 20


@bp.get('/step/google')
def show():
    existing_client_id = os.environ.get('VITE_GOOGLE_CLIENT_ID', '')
    return render_template('step_google.html',
                           existing_client_id=existing_client_id,
                           wizard_state=load(),
                           current_step='google',
                           error=None,
                           success=None)


@bp.post('/step/google')
def submit():
    sa_json = request.form.get('service_account_json', '').strip()
    client_id = request.form.get('google_client_id', '').strip()

    ok_sa, msg = validate_service_account(sa_json)
    if not ok_sa:
        return render_template('step_google.html',
                               existing_client_id=client_id,
                               wizard_state=load(),
                               current_step='google',
                               error=f'Service account error: {msg}',
                               success=None)

    if not validate_oauth_client_id(client_id):
        return render_template('step_google.html',
                               existing_client_id=client_id,
                               wizard_state=load(),
                               current_step='google',
                               error='OAuth Client ID must end with .apps.googleusercontent.com',
                               success=None)

    # Write to .env
    set_key(ENV_FILE, 'GOOGLE_SERVICE_ACCOUNT_JSON', sa_json)
    set_key(ENV_FILE, 'VITE_GOOGLE_CLIENT_ID', client_id)
    set_key(ENV_FILE, 'GOOGLE_CLIENT_ID', client_id)
    mark_complete('google')
    return redirect(url_for('cloudflare.show'))
