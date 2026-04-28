"""Tests for the Google credentials step (service account JSON + OAuth client ID)."""

from __future__ import annotations

import json


def test_google_rejects_invalid_service_account_json(client, tmp_env, valid_oauth_client_id):
    r = client.post('/step/google', data={
        'service_account_json': '{this is not json}',
        'google_client_id': valid_oauth_client_id,
    })
    assert r.status_code == 200
    assert b'Invalid JSON' in r.data
    # Nothing written
    assert tmp_env.read_root() == {}


def test_google_rejects_missing_required_field(client, tmp_env, valid_oauth_client_id):
    bad = json.dumps({'type': 'service_account', 'project_id': 'p'})  # missing private_key, client_email
    r = client.post('/step/google', data={
        'service_account_json': bad,
        'google_client_id': valid_oauth_client_id,
    })
    assert r.status_code == 200
    assert b'Missing field' in r.data


def test_google_rejects_wrong_account_type(client, tmp_env, valid_oauth_client_id):
    bad = json.dumps({
        'type': 'authorized_user',  # wrong — must be service_account
        'project_id': 'p',
        'private_key': '...',
        'client_email': 'x@y.com',
    })
    r = client.post('/step/google', data={
        'service_account_json': bad,
        'google_client_id': valid_oauth_client_id,
    })
    assert r.status_code == 200
    assert b'service_account' in r.data


def test_google_rejects_invalid_oauth_client_id(client, tmp_env, valid_service_account_json):
    r = client.post('/step/google', data={
        'service_account_json': valid_service_account_json,
        'google_client_id': 'not-a-real-client-id',
    })
    assert r.status_code == 200
    assert b'apps.googleusercontent.com' in r.data


def test_google_writes_three_keys_on_success(client, tmp_env, valid_service_account_json, valid_oauth_client_id):
    r = client.post('/step/google', data={
        'service_account_json': valid_service_account_json,
        'google_client_id': valid_oauth_client_id,
    })
    assert r.status_code == 302
    assert r.headers['Location'].endswith('/step/cloudflare')

    root = tmp_env.read_root()
    # Two copies of client ID (frontend + worker) and the service account JSON
    assert root['VITE_GOOGLE_CLIENT_ID'] == valid_oauth_client_id
    assert root['GOOGLE_CLIENT_ID'] == valid_oauth_client_id
    assert 'GOOGLE_SERVICE_ACCOUNT_JSON' in root
