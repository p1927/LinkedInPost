"""Regression tests for verify.py — step 7 verification screen.

Bugs fixed:
1. check_worker_health used to raise requests.RequestException on network errors,
   crashing the /step/verify page with a 500. Now returns (False, error_msg) instead.
2. get_worker_url returned malformed URL like "https://.cf_subdomain.workers.dev"
   when wrangler.jsonc had an empty/missing name field. Now returns None.
3. A bare "except Exception" in check_worker_health caught KeyboardInterrupt/SystemExit.
   Now only catches Exception as a last resort and re-raises as RuntimeError.
"""

from __future__ import annotations

import json
import subprocess
from unittest.mock import MagicMock

import pytest
import requests

from setup.wizard.steps import verify as verify_module


class TestCheckWorkerHealth:
    """Tests for check_worker_health error handling."""

    def test_network_error_returns_false_with_message(self, monkeypatch):
        """Network failures (ConnectionError, Timeout) return (False, msg) — not 500."""
        def fake_get(*_args, **_kwargs):
            raise requests.ConnectionError('Connection refused')

        monkeypatch.setattr(requests, 'get', fake_get)
        ok, msg = verify_module.check_worker_health('https://worker.example.com/health')
        assert ok is False
        assert 'Connection refused' in msg

    def test_http_error_returns_false_with_status_code(self, monkeypatch):
        """HTTP errors (4xx/5xx) return (False, status_code) — not 500."""
        response = MagicMock()
        response.ok = False
        response.status_code = 503

        def fake_get(*_args, **_kwargs):
            return response

        monkeypatch.setattr(requests, 'get', fake_get)
        ok, msg = verify_module.check_worker_health('https://worker.example.com/health')
        assert ok is False
        assert '503' in msg

    def test_unexpected_error_raises_runtime_error(self, monkeypatch):
        """Programming errors (TypeError, AttributeError) raise RuntimeError, not silently swallowed."""
        def fake_get(*_args, **_kwargs):
            raise TypeError('unexpected type error')

        monkeypatch.setattr(requests, 'get', fake_get)
        with pytest.raises(RuntimeError, match='Unexpected error in health check'):
            verify_module.check_worker_health('https://worker.example.com/health')


class TestGetWorkerUrl:
    """Tests for get_worker_url URL construction."""

    def test_empty_name_returns_none(self, monkeypatch, tmp_path):
        """When wrangler.jsonc has no 'name' field, return None — not a malformed URL."""
        monkeypatch.chdir(tmp_path)
        worker_dir = tmp_path / 'worker'
        worker_dir.mkdir()
        (worker_dir / 'wrangler.jsonc').write_text(json.dumps({'name': ''}))

        result = verify_module.get_worker_url()
        assert result is None

    def test_missing_name_returns_none(self, monkeypatch, tmp_path):
        """When wrangler.jsonc omits 'name' entirely, return None — not a malformed URL."""
        monkeypatch.chdir(tmp_path)
        worker_dir = tmp_path / 'worker'
        worker_dir.mkdir()
        (worker_dir / 'wrangler.jsonc').write_text(json.dumps({'zone_id': 'abc'}))

        result = verify_module.get_worker_url()
        assert result is None

    def test_valid_name_returns_correct_url(self, monkeypatch, tmp_path):
        """When name is present and CLOUDFLARE_SUBDOMAIN is set, return correct workers.dev URL."""
        monkeypatch.chdir(tmp_path)
        monkeypatch.setenv('CLOUDFLARE_SUBDOMAIN', 'myteam')
        worker_dir = tmp_path / 'worker'
        worker_dir.mkdir()
        (worker_dir / 'wrangler.jsonc').write_text(json.dumps({'name': 'my-worker'}))

        result = verify_module.get_worker_url()
        assert result == 'https://my-worker.myteam.workers.dev'

    def test_no_subdomain_returns_none(self, monkeypatch, tmp_path):
        """When CLOUDFLARE_SUBDOMAIN is not set, return None even with a valid name."""
        monkeypatch.chdir(tmp_path)
        monkeypatch.delenv('CLOUDFLARE_SUBDOMAIN', raising=False)
        worker_dir = tmp_path / 'worker'
        worker_dir.mkdir()
        (worker_dir / 'wrangler.jsonc').write_text(json.dumps({'name': 'my-worker'}))

        result = verify_module.get_worker_url()
        assert result is None
