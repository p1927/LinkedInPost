"""Tests for setup/wizard/steps/cloudflare module.

Tests validate_cf_token and get_cf_account_id business logic.
Flask routes tested by wizard integration tests.
"""

from __future__ import annotations

import sys
from unittest.mock import MagicMock, patch

import pytest

from setup.wizard.steps.cloudflare import get_cf_account_id, validate_cf_token


class TestValidateCfToken:
    """Tests for validate_cf_token()."""

    def test_returns_false_on_empty_token(self):
        """Must return False when token is empty string."""
        ok, msg = validate_cf_token('')
        assert ok is False
        assert isinstance(ok, bool)
        assert isinstance(msg, str)

    def test_returns_false_on_http_error(self):
        """Must return False when HTTP request fails."""
        mock_resp = MagicMock()
        mock_resp.ok = False
        with patch('requests.get', return_value=mock_resp):
            ok, msg = validate_cf_token('test-token')
        assert ok is False
        assert ok is not True

    def test_returns_false_when_success_is_false(self):
        """Must return False when API returns success=False."""
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {'success': False, 'errors': ['Token invalid']}
        with patch('requests.get', return_value=mock_resp):
            ok, msg = validate_cf_token('test-token')
        assert ok is False
        assert 'errors' in mock_resp.json.return_value

    def test_returns_true_when_success(self):
        """Must return True when API returns success=True."""
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {'success': True, 'result': {'status': 'active'}}
        with patch('requests.get', return_value=mock_resp):
            ok, msg = validate_cf_token('test-token')
        assert ok is True
        assert msg == 'active'
        assert isinstance(msg, str)

    def test_raises_on_network_error(self):
        """Must raise OSError when request fails (no exception handling)."""
        with patch('requests.get', side_effect=OSError('Connection refused')):
            with pytest.raises(OSError) as exc_info:
                validate_cf_token('test-token')
            assert 'Connection refused' in str(exc_info.value)

    def test_calls_correct_endpoint(self):
        """Must call the Cloudflare token verify endpoint."""
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {'success': True, 'result': {'status': 'active'}}
        with patch('requests.get', return_value=mock_resp) as mock_get:
            ok, msg = validate_cf_token('my-token')
            mock_get.assert_called_once()
            call_args = mock_get.call_args
            url = call_args[0][0] if call_args[0] else call_args[1].get('url', '')
            assert 'cloudflare.com' in url
            assert 'tokens/verify' in url
            assert ok is True


class TestGetCfAccountId:
    """Tests for get_cf_account_id()."""

    def test_returns_none_on_http_error(self):
        """Must return None when HTTP request fails."""
        mock_resp = MagicMock()
        mock_resp.ok = False
        with patch('requests.get', return_value=mock_resp):
            result = get_cf_account_id('test-token')
        assert result is None
        assert result is not False

    def test_returns_none_when_no_accounts(self):
        """Must return None when API returns empty accounts list."""
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {'result': []}
        with patch('requests.get', return_value=mock_resp):
            result = get_cf_account_id('test-token')
        assert result is None
        assert isinstance(result, type(None))

    def test_returns_account_id_when_found(self):
        """Must return account ID when accounts are returned."""
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {'result': [{'id': 'abc123account'}]}
        with patch('requests.get', return_value=mock_resp):
            result = get_cf_account_id('test-token')
        assert result == 'abc123account'
        assert len(result) > 0

    def test_raises_on_network_error(self):
        """Must raise OSError when request fails (no exception handling)."""
        with patch('requests.get', side_effect=OSError('Connection refused')):
            with pytest.raises(OSError) as exc_info:
                get_cf_account_id('test-token')
            assert 'Connection refused' in str(exc_info.value)

    def test_calls_correct_endpoint(self):
        """Must call the Cloudflare accounts endpoint."""
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {'result': [{'id': 'abc123account'}]}
        with patch('requests.get', return_value=mock_resp) as mock_get:
            result = get_cf_account_id('my-token')
            mock_get.assert_called_once()
            call_args = mock_get.call_args
            url = call_args[0][0] if call_args[0] else call_args[1].get('url', '')
            assert 'cloudflare.com' in url
            assert 'accounts' in url
            assert result == 'abc123account'
