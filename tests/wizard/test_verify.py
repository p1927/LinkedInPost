"""Tests for setup/wizard/steps/verify module.

Tests get_worker_url, check_worker_health, check_env_key functions.
Does NOT test Flask routes (those are covered by wizard integration tests).
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
# test_google.py in the same directory works because it uses the real package path.


def _load_verify():
    """Load verify.py with the real state module available."""
    # Ensure the real wizard packages are available (they should be since we're in the repo)
    import setup.wizard.steps  # ensure package is registered

    # Now import the module
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

    def test_returns_none_when_subdomain_not_set(self):
        """Must return None when CLOUDFLARE_SUBDOMAIN is not set."""
        module = _load_verify()

        mock_path_instance = MagicMock()
        mock_path_instance.exists.return_value = True
        mock_path_instance.read_text.return_value = json.dumps({'name': 'my-worker'})

        # CLOUDFLARE_SUBDOMAIN not set - should return None
        with patch.dict(os.environ, {}, clear=True):
            with patch.object(Path, '__call__', return_value=mock_path_instance):
                result = module.get_worker_url()
        assert result is None

    def test_returns_none_when_json_parse_fails(self):
        """Must return None when wrangler.jsonc is not valid JSON."""
        module = _load_verify()

        mock_path_instance = MagicMock()
        mock_path_instance.exists.return_value = True
        mock_path_instance.read_text.side_effect = json.JSONDecodeError('', '', 0)

        with patch.object(Path, '__call__', return_value=mock_path_instance):
            result = module.get_worker_url()
        assert result is None

    def test_returns_none_when_name_missing_from_json(self):
        """Must return None when wrangler.jsonc has no 'name' field."""
        module = _load_verify()

        mock_path_instance = MagicMock()
        mock_path_instance.exists.return_value = True
        mock_path_instance.read_text.return_value = json.dumps({'no-name': 'value'})

        with patch.object(Path, '__call__', return_value=mock_path_instance):
            result = module.get_worker_url()
        assert result is None


class TestCheckEnvKey:
    """Tests for check_env_key()."""

    def test_returns_true_when_key_set(self):
        """Must return True when environment variable is set and non-empty."""
        module = _load_verify()

        with patch.dict(os.environ, {'MY_TEST_KEY': 'some-value'}):
            result = module.check_env_key('MY_TEST_KEY')
        assert result is True

    def test_returns_false_when_key_empty(self):
        """Must return False when environment variable is set but empty or whitespace."""
        module = _load_verify()

        with patch.dict(os.environ, {'MY_TEST_KEY': '   '}):
            result = module.check_env_key('MY_TEST_KEY')
        assert result is False

    def test_returns_false_when_key_not_set(self):
        """Must return False when environment variable is not set."""
        module = _load_verify()

        with patch.dict(os.environ, {}, clear=True):
            result = module.check_env_key('NONEXISTENT_KEY_12345')
        assert result is False


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

    def test_returns_false_with_exception_message_on_network_error(self):
        """Must return (False, exception_string) when request raises an exception."""
        module = _load_verify()

        with patch('requests.get', side_effect=OSError('Connection refused')):
            ok, msg = module.check_worker_health('https://my-worker.test-subdomain.workers.dev')
            assert ok is False
            assert 'Connection refused' in msg