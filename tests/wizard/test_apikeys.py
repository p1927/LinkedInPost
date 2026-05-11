"""Tests for setup/wizard/steps/apikeys module.

Tests validate_gemini_key and _write_key business logic.
Flask routes tested by wizard integration tests.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest


class TestValidateGeminiKey:
    """Tests for validate_gemini_key()."""

    def test_returns_false_on_empty_key(self):
        """Must return False when key is empty string."""
        from setup.wizard.steps.apikeys import validate_gemini_key
        assert validate_gemini_key('') is False

    def test_returns_false_on_whitespace_key(self):
        """Must return False when key is only whitespace."""
        from setup.wizard.steps.apikeys import validate_gemini_key
        assert validate_gemini_key('   ') is False

    def test_returns_false_on_http_400(self):
        """Must return False when API returns 400 Bad Request."""
        mock_resp = MagicMock()
        mock_resp.status_code = 400
        with patch('requests.post', return_value=mock_resp):
            from setup.wizard.steps.apikeys import validate_gemini_key
            assert validate_gemini_key('test-key') is False

    def test_returns_false_on_http_401(self):
        """Must return False when API returns 401 Unauthorized."""
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        with patch('requests.post', return_value=mock_resp):
            from setup.wizard.steps.apikeys import validate_gemini_key
            assert validate_gemini_key('test-key') is False

    def test_returns_true_on_http_200(self):
        """Must return True when API returns 200."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        with patch('requests.post', return_value=mock_resp):
            from setup.wizard.steps.apikeys import validate_gemini_key
            assert validate_gemini_key('test-key') is True

    def test_returns_true_on_http_500(self):
        """Must return True when API returns 500 (server error, not auth issue)."""
        mock_resp = MagicMock()
        mock_resp.status_code = 500
        with patch('requests.post', return_value=mock_resp):
            from setup.wizard.steps.apikeys import validate_gemini_key
            assert validate_gemini_key('test-key') is True

    def test_raises_on_network_error(self):
        """Must raise OSError when network request fails (no exception handling)."""
        with patch('requests.post', side_effect=OSError('Connection refused')):
            from setup.wizard.steps.apikeys import validate_gemini_key
            with pytest.raises(OSError):
                validate_gemini_key('test-key')

    def test_posts_to_correct_endpoint_with_key(self):
        """Must call the correct Gemini endpoint with the provided key."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        with patch('requests.post', return_value=mock_resp) as mock_post:
            from setup.wizard.steps.apikeys import validate_gemini_key
            validate_gemini_key('my-test-key')
            mock_post.assert_called_once()
            call_args = mock_post.call_args
            url = call_args[0][0] if call_args[0] else call_args[1].get('url', '')
            assert 'my-test-key' in url
            assert 'generativelanguage.googleapis.com' in url


class TestWriteKey:
    """Tests for _write_key()."""

    def test_does_nothing_when_value_is_empty(self):
        """Must not call set_key when value is empty string."""
        with patch('setup.wizard.steps.apikeys.set_key') as mock_set_key:
            from setup.wizard.steps.apikeys import _write_key
            _write_key('/tmp/test.env', 'MY_KEY', '')
            mock_set_key.assert_not_called()

    def test_does_nothing_when_value_is_none(self):
        """Must not call set_key when value is None."""
        with patch('setup.wizard.steps.apikeys.set_key') as mock_set_key:
            from setup.wizard.steps.apikeys import _write_key
            _write_key('/tmp/test.env', 'MY_KEY', None)
            mock_set_key.assert_not_called()

    def test_calls_set_key_with_correct_args(self):
        """Must call dotenv.set_key with correct env file and key-value pair."""
        with patch('setup.wizard.steps.apikeys.set_key') as mock_set_key:
            from setup.wizard.steps.apikeys import _write_key
            _write_key('/tmp/test.env', 'MY_KEY', 'my-value')
            mock_set_key.assert_called_once_with('/tmp/test.env', 'MY_KEY', 'my-value')

    def test_calls_set_key_with_value_unchanged(self):
        """Must call dotenv.set_key with the value as-is (no whitespace trimming)."""
        with patch('setup.wizard.steps.apikeys.set_key') as mock_set_key:
            from setup.wizard.steps.apikeys import _write_key
            _write_key('/tmp/test.env', 'MY_KEY', '  my-value  ')
            mock_set_key.assert_called_once_with('/tmp/test.env', 'MY_KEY', '  my-value  ')