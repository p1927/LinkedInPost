"""Regression tests for wizard/steps/cloudflare.py bugs.

Bug: validate_cf_token() crashes with TypeError when Cloudflare API returns result: null
Bug: get_cf_account_id() crashes with KeyError when first account dict has no 'id' key
"""
from __future__ import annotations

from unittest.mock import patch, MagicMock

import pytest


class TestValidateCfTokenResultNull:
    """Bug: validate_cf_token() crashes when API returns result: null."""

    def test_result_null_raises_type_error(self) -> None:
        """When Cloudflare API returns {"success": true, "result": null}, function must not crash."""
        from setup.wizard.steps.cloudflare import validate_cf_token

        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {'success': True, 'result': None}

        with patch('setup.wizard.steps.cloudflare.requests.get', return_value=mock_resp):
            ok, msg = validate_cf_token('test_token')
            assert ok is False
            assert 'result' in msg.lower() or 'null' in msg.lower() or 'invalid' in msg.lower()

    def test_result_missing_raises_key_error(self) -> None:
        """When Cloudflare API returns {"success": true} without result key, function must not crash."""
        from setup.wizard.steps.cloudflare import validate_cf_token

        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {'success': True}

        with patch('setup.wizard.steps.cloudflare.requests.get', return_value=mock_resp):
            ok, msg = validate_cf_token('test_token')
            assert ok is False

    def test_result_empty_dict_raises_key_error(self) -> None:
        """When Cloudflare API returns {"success": true, "result": {}}, function must not crash."""
        from setup.wizard.steps.cloudflare import validate_cf_token

        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {'success': True, 'result': {}}

        with patch('setup.wizard.steps.cloudflare.requests.get', return_value=mock_resp):
            ok, msg = validate_cf_token('test_token')
            assert ok is False

    def test_result_missing_status_key_raises_key_error(self) -> None:
        """When Cloudflare API returns result without 'status' key, function must not crash."""
        from setup.wizard.steps.cloudflare import validate_cf_token

        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {'success': True, 'result': {'id': 'some-id'}}

        with patch('setup.wizard.steps.cloudflare.requests.get', return_value=mock_resp):
            ok, msg = validate_cf_token('test_token')
            assert ok is False

    def test_valid_response_still_works(self) -> None:
        """Normal valid response with result.status should still work."""
        from setup.wizard.steps.cloudflare import validate_cf_token

        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {'success': True, 'result': {'status': 'Active'}}

        with patch('setup.wizard.steps.cloudflare.requests.get', return_value=mock_resp):
            ok, msg = validate_cf_token('test_token')
            assert ok is True
            assert msg == 'Active'


class TestGetCfAccountIdMissingId:
    """Bug: get_cf_account_id() crashes when first account has no 'id' key."""

    def test_first_account_missing_id_raises_key_error(self) -> None:
        """When API returns account list where first account has no 'id' key, must not crash."""
        from setup.wizard.steps.cloudflare import get_cf_account_id

        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {'result': [{'name': 'Test Account'}]}  # no 'id' key

        with patch('setup.wizard.steps.cloudflare.requests.get', return_value=mock_resp):
            result = get_cf_account_id('test_token')
            assert result is None

    def test_empty_accounts_list_returns_none(self) -> None:
        """When API returns empty accounts list, should return None gracefully."""
        from setup.wizard.steps.cloudflare import get_cf_account_id

        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {'result': []}

        with patch('setup.wizard.steps.cloudflare.requests.get', return_value=mock_resp):
            result = get_cf_account_id('test_token')
            assert result is None

    def test_valid_account_returns_id(self) -> None:
        """Normal response with valid account id should still work."""
        from setup.wizard.steps.cloudflare import get_cf_account_id

        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {'result': [{'id': 'account-123', 'name': 'Test'}]}

        with patch('setup.wizard.steps.cloudflare.requests.get', return_value=mock_resp):
            result = get_cf_account_id('test_token')
            assert result == 'account-123'
