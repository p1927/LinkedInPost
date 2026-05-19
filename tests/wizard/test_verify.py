"""Tests for setup/wizard/steps/verify module.

Tests get_worker_url, check_worker_health, check_env_key functions.
Flask route tests added in TestVerifyShowRoute.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# verify.py uses relative imports (from ..state import ...).
# We need the real setup.wizard.state in sys.modules for the import to work.


def _load_verify():
    """Load verify.py with the real state module available."""
    import setup.wizard.steps  # ensure package is registered
    from setup.wizard.steps import verify
    return verify


class TestGetWorkerUrl:
    """Tests for get_worker_url()."""

    def test_returns_none_when_wrangler_jsonc_missing(self):
        """Must return None when worker/wrangler.jsonc does not exist."""
        module = _load_verify()

        with patch.object(Path, 'exists', return_value=False):
            result = module.get_worker_url()
        assert result is None
        assert isinstance(result, type(None))

    def test_returns_none_when_subdomain_not_set(self):
        """Must return None when CLOUDFLARE_SUBDOMAIN is not set."""
        module = _load_verify()

        mock_path_instance = MagicMock()
        mock_path_instance.exists.return_value = True
        mock_path_instance.read_text.return_value = json.dumps({'name': 'my-worker'})

        with patch.dict(os.environ, {}, clear=True):
            with patch.object(Path, '__call__', return_value=mock_path_instance):
                result = module.get_worker_url()
        assert result is None
        assert isinstance(result, type(None))

    def test_returns_none_when_json_parse_fails(self):
        """Must return None when wrangler.jsonc is not valid JSON."""
        module = _load_verify()

        mock_path_instance = MagicMock()
        mock_path_instance.exists.return_value = True
        mock_path_instance.read_text.side_effect = json.JSONDecodeError('', '', 0)

        with patch.object(Path, '__call__', return_value=mock_path_instance):
            result = module.get_worker_url()
        assert result is None
        assert isinstance(result, type(None))

    def test_returns_none_when_name_missing_from_json(self):
        """Must return None when wrangler.jsonc has no 'name' field."""
        module = _load_verify()

        mock_path_instance = MagicMock()
        mock_path_instance.exists.return_value = True
        mock_path_instance.read_text.return_value = json.dumps({'no-name': 'value'})

        with patch.object(Path, '__call__', return_value=mock_path_instance):
            result = module.get_worker_url()
        assert result is None
        assert isinstance(result, type(None))


class TestCheckEnvKey:
    """Tests for check_env_key()."""

    def test_returns_true_when_key_set(self):
        """Must return True when environment variable is set and non-empty."""
        module = _load_verify()

        with patch.dict(os.environ, {'MY_TEST_KEY': 'some-value'}):
            result = module.check_env_key('MY_TEST_KEY')
        assert result is True
        assert isinstance(result, bool)

    def test_returns_false_when_key_empty(self):
        """Must return False when environment variable is set but empty or whitespace."""
        module = _load_verify()

        with patch.dict(os.environ, {'MY_TEST_KEY': '   '}):
            result = module.check_env_key('MY_TEST_KEY')
        assert result is False
        assert isinstance(result, bool)

    def test_returns_false_when_key_not_set(self):
        """Must return False when environment variable is not set."""
        module = _load_verify()

        with patch.dict(os.environ, {}, clear=True):
            result = module.check_env_key('NONEXISTENT_KEY_12345')
        assert result is False
        assert isinstance(result, bool)


class TestCheckWorkerHealth:
    """Tests for check_worker_health()."""

    def test_returns_true_and_status_code_on_success(self):
        """Must return (True, status_code) when GET /health returns 200."""
        module = _load_verify()

        mock_response = MagicMock()
        mock_response.ok = True
        mock_response.status_code = 200

        with patch('requests.get', return_value=mock_response) as mock_get:
            ok, msg = module.check_worker_health('https://my-worker.test-subdomain.workers.dev')
            assert ok is True
            assert msg == '200'
            mock_get.assert_called_once_with('https://my-worker.test-subdomain.workers.dev/health', timeout=10)

    def test_returns_false_with_status_code_on_http_error(self):
        """Must return (False, status_code) when GET /health returns non-200."""
        module = _load_verify()

        mock_response = MagicMock()
        mock_response.ok = False
        mock_response.status_code = 503

        with patch('requests.get', return_value=mock_response):
            ok, msg = module.check_worker_health('https://my-worker.test-subdomain.workers.dev')
            assert ok is False
            assert msg == '503'
            assert isinstance(ok, bool)

    def test_returns_false_with_exception_message_on_network_error(self):
        """Must return (False, exception_string) when request raises an exception."""
        module = _load_verify()

        with patch('requests.get', side_effect=OSError('Connection refused')):
            ok, msg = module.check_worker_health('https://my-worker.test-subdomain.workers.dev')
            assert ok is False
            assert 'Connection refused' in msg
            assert isinstance(msg, str)


class TestCheckWorkerHealthErrorPaths:
    """Tests for check_worker_health RuntimeError path."""

    def test_unexpected_exception_raises_runtime_error(self, monkeypatch):
        """Programming errors (TypeError, AttributeError) must raise RuntimeError, not silently caught."""
        import requests as requests_lib
        from setup.wizard.steps import verify as verify_module

        def fake_get(*args, **kwargs):
            raise TypeError('unexpected type error in requests.get')

        monkeypatch.setattr(requests_lib, 'get', fake_get)
        try:
            verify_module.check_worker_health('https://worker.example.com/health')
            assert False, "Expected RuntimeError to be raised"
        except RuntimeError as exc:
            assert 'Unexpected error in health check' in str(exc)
            assert 'unexpected type error' in str(exc)


class TestVerifyShowRoute:
    """Tests for verify.show() Flask route (GET /step/verify)."""

    def test_show_renders_verify_page(self, client, tmp_env, monkeypatch):
        """GET /step/verify must return 200 and render the verification page."""
        from setup.wizard.steps import verify as verify_module
        monkeypatch.setenv('GEMINI_API_KEY', 'test-key')
        monkeypatch.setenv('GOOGLE_SERVICE_ACCOUNT_JSON', '{"type":"service_account"}')
        monkeypatch.setenv('CLOUDFLARE_API_TOKEN', 'test-token')
        monkeypatch.setenv('CLOUDFLARE_SUBDOMAIN', 'test-subdomain')
        mock_resp = type('MockResp', (), {'ok': True, 'status_code': 200})()
        monkeypatch.setattr(verify_module.requests, 'get', lambda *a, **kw: mock_resp)
        monkeypatch.setattr(verify_module, 'get_worker_url', lambda: 'https://my-worker.test-subdomain.workers.dev')
        r = client.get('/step/verify')
        assert r.status_code == 200
        assert b'verify' in r.data.lower() or b'verification' in r.data.lower()

    def test_show_all_ok_marks_verify_complete(self, client, tmp_env, monkeypatch):
        """When all checks pass, verify step must be marked complete in state."""
        from setup.wizard import state as state_module
        from setup.wizard.steps import verify as verify_module
        monkeypatch.setattr(state_module, '_state', None)
        monkeypatch.setenv('GEMINI_API_KEY', 'test-key')
        monkeypatch.setenv('GOOGLE_SERVICE_ACCOUNT_JSON', '{"type":"service_account"}')
        monkeypatch.setenv('CLOUDFLARE_API_TOKEN', 'test-token')
        monkeypatch.setenv('CLOUDFLARE_SUBDOMAIN', 'test-subdomain')
        mock_resp = type('MockResp', (), {'ok': True, 'status_code': 200})()
        monkeypatch.setattr(verify_module.requests, 'get', lambda *a, **kw: mock_resp)
        monkeypatch.setattr(verify_module, 'get_worker_url', lambda: 'https://my-worker.test-subdomain.workers.dev')
        r = client.get('/step/verify')
        assert r.status_code == 200
        assert state_module.is_complete('verify') is True

    def test_show_missing_wrangler_jsonc_still_renders(self, client, tmp_env, monkeypatch):
        """When worker/wrangler.jsonc is missing (get_worker_url returns None), show() must still render (not 500)."""
        from setup.wizard import state as state_module
        from setup.wizard.steps import verify as verify_module
        monkeypatch.setattr(state_module, '_state', None)
        monkeypatch.setenv('GEMINI_API_KEY', 'test-key')
        monkeypatch.setenv('GOOGLE_SERVICE_ACCOUNT_JSON', '{"type":"service_account"}')
        monkeypatch.setenv('CLOUDFLARE_API_TOKEN', 'test-token')
        monkeypatch.setenv('CLOUDFLARE_SUBDOMAIN', 'test-subdomain')
        # get_worker_url returns None = worker URL unknown
        monkeypatch.setattr(verify_module, 'get_worker_url', lambda: None)
        mock_resp = type('MockResp', (), {'ok': False, 'status_code': 500})()
        monkeypatch.setattr(verify_module.requests, 'get', lambda *a, **kw: mock_resp)
        r = client.get('/step/verify')
        assert r.status_code == 200
        assert b'unknown' in r.data.lower() or b'not found' in r.data.lower()

    def test_show_graceful_on_mark_complete_oserror(self, client, tmp_env, monkeypatch):
        """When mark_complete('verify') raises OSError, show() must still render with all_ok=False."""
        from setup.wizard import state as state_module
        from setup.wizard.steps import verify as verify_module
        monkeypatch.setattr(state_module, '_state', None)
        monkeypatch.setenv('GEMINI_API_KEY', 'test-key')
        monkeypatch.setenv('GOOGLE_SERVICE_ACCOUNT_JSON', '{"type":"service_account"}')
        monkeypatch.setenv('CLOUDFLARE_API_TOKEN', 'test-token')
        monkeypatch.setenv('CLOUDFLARE_SUBDOMAIN', 'test-subdomain')
        mock_resp = type('MockResp', (), {'ok': True, 'status_code': 200})()
        monkeypatch.setattr(verify_module.requests, 'get', lambda *a, **kw: mock_resp)
        monkeypatch.setattr(verify_module, 'get_worker_url', lambda: 'https://my-worker.test-subdomain.workers.dev')
        # Patch mark_complete at the usage site (verify module) to raise OSError
        monkeypatch.setattr(verify_module, 'mark_complete', lambda step: (_ for _ in ()).throw(OSError('read-only file system')))
        r = client.get('/step/verify')
        assert r.status_code == 200
        # State should NOT be marked complete due to the OSError
        assert state_module.is_complete('verify') is False
