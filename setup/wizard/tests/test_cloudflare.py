"""Tests for the Cloudflare token step."""

from __future__ import annotations


def test_cloudflare_rejects_invalid_token(client, tmp_env, mock_cloudflare):
    mock_cloudflare(success=False)
    r = client.post('/step/cloudflare', data={'cloudflare_api_token': 'bogus'})
    assert r.status_code == 200
    assert b'validation failed' in r.data
    assert 'CLOUDFLARE_API_TOKEN' not in tmp_env.read_root()


def test_cloudflare_advances_on_valid_token(client, tmp_env):
    # mock_cloudflare default: success
    r = client.post('/step/cloudflare', data={'cloudflare_api_token': 'cf-good-token'})
    assert r.status_code == 302
    assert r.headers['Location'].endswith('/step/apikeys')
    assert tmp_env.read_root()['CLOUDFLARE_API_TOKEN'] == 'cf-good-token'


def test_cloudflare_subprocess_failure_blocks_advance(client, tmp_env, mock_subprocess):
    mock_subprocess.set_run_exit(1)  # type: ignore[attr-defined]
    r = client.post('/step/cloudflare', data={'cloudflare_api_token': 'cf-good-token'})
    # When the subprocess fails, page re-renders with the error.
    assert r.status_code == 200
    # The wizard captured a subprocess invocation (provisioning attempt)
    assert any('--cloudflare' in args for args in mock_subprocess.runs)
