"""Happy-path tests for the full Flask wizard flow — both SaaS and self-hosted.

A real user runs `python setup.py --web` and walks through 7 steps. These tests
drive the same path via Flask test client, asserting each step redirects to
the next and the wizard state file accumulates completed steps.
"""

from __future__ import annotations

import pytest

from setup.wizard import state as state_module
from setup.wizard.steps import prereqs as prereqs_module


@pytest.fixture
def all_prereqs_ok(monkeypatch: pytest.MonkeyPatch):
    """Force the prereqs step to report all prerequisites OK regardless of host."""
    monkeypatch.setattr(prereqs_module, 'check_prereqs', lambda: [
        {'name': 'Python 3.11+', 'ok': True, 'found': '3.12', 'fix': ''},
        {'name': 'Node.js 18+', 'ok': True, 'found': '20.0.0', 'fix': ''},
        {'name': 'Wrangler CLI', 'ok': True, 'found': '/usr/local/bin/wrangler', 'fix': ''},
        {'name': 'Git', 'ok': True, 'found': '/usr/bin/git', 'fix': ''},
    ])


def _walk_through(
    client,
    *,
    mode: str,
    valid_service_account_json: str,
    valid_oauth_client_id: str,
    gemini_key: str = 'AIza-mock-gemini',
    cf_token: str = 'cf-mock-token',
):
    """Drive the wizard from mode → verify. Returns the verify-step response."""
    # 1. mode
    r = client.post('/step/mode', data={'mode': mode})
    assert r.status_code == 302
    assert r.headers['Location'].endswith('/step/prereqs')

    # 2. prereqs (POST to /complete sub-route)
    r = client.post('/step/prereqs/complete')
    assert r.status_code == 302
    assert r.headers['Location'].endswith('/step/google')

    # 3. google
    r = client.post('/step/google', data={
        'service_account_json': valid_service_account_json,
        'google_client_id': valid_oauth_client_id,
    })
    assert r.status_code == 302, r.data.decode()[:500]
    assert r.headers['Location'].endswith('/step/cloudflare')

    # 4. cloudflare
    r = client.post('/step/cloudflare', data={'cloudflare_api_token': cf_token})
    assert r.status_code == 302, r.data.decode()[:500]
    assert r.headers['Location'].endswith('/step/apikeys')

    # 5. apikeys
    r = client.post('/step/apikeys', data={
        'gemini_api_key': gemini_key,
        'fal_api_key': 'fal-mock',
        'pixazo_api_key': 'pixazo-mock',
        'worker_scheduler_secret': 'scheduler-secret',
        'secret_encryption_key': 'github-encrypt-key',
        'generation_worker_secret': 'shared-secret',
    })
    assert r.status_code == 302, r.data.decode()[:500]
    assert r.headers['Location'].endswith('/step/deploy')

    # 6. deploy renders (the actual deploy is async; we just assert page loads)
    r = client.get('/step/deploy')
    assert r.status_code == 200
    assert b'Deploy' in r.data or b'deploy' in r.data

    # 7. verify renders
    r = client.get('/step/verify')
    assert r.status_code == 200
    return r


def test_full_saas_flow_completes_all_steps(client, tmp_env, all_prereqs_ok,
                                              valid_service_account_json, valid_oauth_client_id):
    _walk_through(
        client,
        mode='saas',
        valid_service_account_json=valid_service_account_json,
        valid_oauth_client_id=valid_oauth_client_id,
    )

    # Every step except deploy/verify (which complete via async/conditional logic)
    # should be marked complete in the state file.
    s = state_module.load()
    assert s['mode'] is True
    assert s['prereqs'] is True
    assert s['google'] is True
    assert s['cloudflare'] is True
    assert s['apikeys'] is True

    # features.yaml should reflect saas
    assert 'deploymentMode: saas' in tmp_env.features_yaml.read_text()


def test_full_self_hosted_flow_completes_all_steps(client, tmp_env, all_prereqs_ok,
                                                    valid_service_account_json, valid_oauth_client_id):
    _walk_through(
        client,
        mode='selfHosted',
        valid_service_account_json=valid_service_account_json,
        valid_oauth_client_id=valid_oauth_client_id,
    )

    s = state_module.load()
    assert s['mode'] is True
    assert s['prereqs'] is True
    assert s['apikeys'] is True

    # features.yaml should reflect self-hosted
    assert 'deploymentMode: selfHosted' in tmp_env.features_yaml.read_text()
