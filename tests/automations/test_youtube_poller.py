"""Tests for automations/youtube_poller module.

Tests actual business logic: error handling, template application,
file operations, and network call behavior.
"""

from __future__ import annotations

import importlib.util
import json
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest


class TestYtGet:
    """Tests for yt_get HTTP error handling."""

    def test_returns_empty_dict_on_http_error(self):
        """yt_get must return {} (not raise) when HTTPError occurs."""
        spec = importlib.util.spec_from_file_location(
            'youtube_poller_err',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        module = importlib.util.module_from_spec(spec)
        sys.modules['youtube_poller_err'] = module
        spec.loader.exec_module(module)

        with patch('urllib.request.urlopen') as mock_urlopen:
            from urllib.error import HTTPError
            mock_urlopen.side_effect = HTTPError(
                'https://example.com',
                403,
                'Forbidden',
                {},
                None,
            )
            result = module.yt_get('search', {'key': 'test'})
            assert result == {}
            assert isinstance(result, dict)

    def test_returns_empty_dict_on_network_error(self):
        """yt_get must return {} (not raise) when URLError occurs."""
        spec = importlib.util.spec_from_file_location(
            'youtube_poller_net',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        module = importlib.util.module_from_spec(spec)
        sys.modules['youtube_poller_net'] = module
        spec.loader.exec_module(module)

        with patch('urllib.request.urlopen') as mock_urlopen:
            from urllib.error import URLError
            mock_urlopen.side_effect = URLError('Connection refused')
            result = module.yt_get('search', {'key': 'test'})
            assert result == {}
            assert isinstance(result, dict)

    def test_returns_false_on_non_httpurl_error(self):
        """yt_get must return {} when urlopen raises a non-HTTP URL error."""
        spec = importlib.util.spec_from_file_location(
            'youtube_poller_exc',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        module = importlib.util.module_from_spec(spec)
        sys.modules['youtube_poller_exc'] = module
        spec.loader.exec_module(module)

        with patch('urllib.request.urlopen') as mock_urlopen:
            from urllib.error import URLError
            mock_urlopen.side_effect = URLError('Unknown error')
            result = module.yt_get('search', {'key': 'test'})
            assert result == {}
            assert isinstance(result, dict)
            assert len(result) == 0


class TestApplyTemplate:
    """Tests for apply_template business logic."""

    def test_replaces_name_placeholder(self):
        spec = importlib.util.spec_from_file_location(
            'youtube_poller_tmpl1',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        module = importlib.util.module_from_spec(spec)
        sys.modules['youtube_poller_tmpl1'] = module
        spec.loader.exec_module(module)

        result = module.apply_template('Hi {name}, welcome!', 'Alice')
        assert result == 'Hi Alice, welcome!'
        assert 'Alice' in result
        assert '{name}' not in result

    def test_preserves_string_without_placeholder(self):
        spec = importlib.util.spec_from_file_location(
            'youtube_poller_tmpl2',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        module = importlib.util.module_from_spec(spec)
        sys.modules['youtube_poller_tmpl2'] = module
        spec.loader.exec_module(module)

        result = module.apply_template('Hello world', 'Bob')
        assert result == 'Hello world'
        assert 'Bob' not in result

    def test_replaces_multiple_occurrences(self):
        spec = importlib.util.spec_from_file_location(
            'youtube_poller_tmpl3',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        module = importlib.util.module_from_spec(spec)
        sys.modules['youtube_poller_tmpl3'] = module
        spec.loader.exec_module(module)

        result = module.apply_template('{name} said: Hi {name}!', 'Carol')
        assert result == 'Carol said: Hi Carol!'
        assert result.count('Carol') == 2

    def test_empty_template_unchanged(self):
        spec = importlib.util.spec_from_file_location(
            'youtube_poller_tmpl4',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        module = importlib.util.module_from_spec(spec)
        sys.modules['youtube_poller_tmpl4'] = module
        spec.loader.exec_module(module)

        result = module.apply_template('', 'Anyone')
        assert result == ''
        assert len(result) == 0

    def test_template_with_only_placeholder(self):
        spec = importlib.util.spec_from_file_location(
            'youtube_poller_tmpl5',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        module = importlib.util.module_from_spec(spec)
        sys.modules['youtube_poller_tmpl5'] = module
        spec.loader.exec_module(module)

        result = module.apply_template('{name}', 'Dave')
        assert result == 'Dave'
        assert '{name}' not in result


class TestFetchRule:
    """Tests for fetch_rule network behavior."""

    def test_returns_none_on_network_error(self):
        """fetch_rule must return None (not raise) when URL fetch fails."""
        spec = importlib.util.spec_from_file_location(
            'youtube_poller_fetch1',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        module = importlib.util.module_from_spec(spec)
        sys.modules['youtube_poller_fetch1'] = module
        spec.loader.exec_module(module)

        with patch('urllib.request.urlopen') as mock_urlopen:
            mock_urlopen.side_effect = OSError('Connection failed')
            result = module.fetch_rule('https://example.com/worker', 'channel123', 'secret123')
            assert result is None
            assert result != ''

    def test_returns_none_on_invalid_json_response(self):
        """fetch_rule must return None when response is not valid JSON."""
        spec = importlib.util.spec_from_file_location(
            'youtube_poller_fetch2',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        module = importlib.util.module_from_spec(spec)
        sys.modules['youtube_poller_fetch2'] = module
        spec.loader.exec_module(module)

        mock_response = MagicMock()
        mock_response.read.return_value = b'not json at all'
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)

        with patch('urllib.request.urlopen', return_value=mock_response):
            result = module.fetch_rule('https://example.com/worker', 'channel123', 'secret123')
            assert result is None
            assert result != {'error': 'not json'}
            assert isinstance(result, type(None))

    def test_returns_none_on_http_error_response(self):
        """fetch_rule must return None when HTTP response is error status."""
        spec = importlib.util.spec_from_file_location(
            'youtube_poller_fetch3',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        module = importlib.util.module_from_spec(spec)
        sys.modules['youtube_poller_fetch3'] = module
        spec.loader.exec_module(module)

        mock_response = MagicMock()
        mock_response.read.return_value = b'error occurred'
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)

        with patch('urllib.request.urlopen') as mock_urlopen:
            from urllib.error import HTTPError
            mock_urlopen.side_effect = HTTPError('https://example.com', 500, 'Server Error', {}, None)
            result = module.fetch_rule('https://example.com/worker', 'channel123', 'secret123')
            assert result is None
            assert isinstance(result, type(None))
            assert result is not False


class TestPostReply:
    """Tests for post_reply HTTP response handling."""

    def test_returns_false_on_http_error(self):
        """post_reply must return False (not raise) when HTTPError occurs."""
        spec = importlib.util.spec_from_file_location(
            'youtube_poller_reply1',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        module = importlib.util.module_from_spec(spec)
        sys.modules['youtube_poller_reply1'] = module
        spec.loader.exec_module(module)

        with patch('urllib.request.urlopen') as mock_urlopen:
            from urllib.error import HTTPError
            err_response = MagicMock()
            err_response.read.return_value = b'{"error": "bad token"}'
            mock_urlopen.side_effect = HTTPError(
                'https://example.com',
                401,
                'Unauthorized',
                {},
                err_response,
            )
            result = module.post_reply('vid123', 'parent456', 'Hello', 'bad_token')
            assert result is False
            assert result != True

    def test_returns_true_on_success(self):
        """post_reply must return True when HTTP response is 200."""
        spec = importlib.util.spec_from_file_location(
            'youtube_poller_reply2',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        module = importlib.util.module_from_spec(spec)
        sys.modules['youtube_poller_reply2'] = module
        spec.loader.exec_module(module)

        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)

        with patch('urllib.request.urlopen', return_value=mock_response):
            result = module.post_reply('vid123', 'parent456', 'Hello', 'token123')
            assert result is True
            assert isinstance(result, bool)
            assert result != False


class TestLoadRepliedSaveReplied:
    """Tests for load_replied and save_replied file operations."""

    def test_load_replied_returns_empty_set_when_file_missing(self):
        """load_replied must return an empty set when REPLIED_MARKER doesn't exist."""
        spec = importlib.util.spec_from_file_location(
            'youtube_poller_load1',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        module = importlib.util.module_from_spec(spec)
        sys.modules['youtube_poller_load1'] = module
        spec.loader.exec_module(module)

        with patch.object(module, 'REPLIED_MARKER', '/nonexistent/.youtube_replied_ids'):
            result = module.load_replied()
            assert result == set()
            assert isinstance(result, set)
            assert len(result) == 0

    def test_load_replied_returns_set_from_file(self):
        """load_replied must return a set containing IDs from JSON file."""
        spec = importlib.util.spec_from_file_location(
            'youtube_poller_load2',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        module = importlib.util.module_from_spec(spec)
        sys.modules['youtube_poller_load2'] = module
        spec.loader.exec_module(module)

        with tempfile.NamedTemporaryFile(suffix='.json', delete=False, mode='w') as f:
            json.dump(['id1', 'id2', 'id3'], f)
            f.flush()
            marker_path = f.name

        try:
            with patch.object(module, 'REPLIED_MARKER', marker_path):
                result = module.load_replied()
                assert result == {'id1', 'id2', 'id3'}
                assert isinstance(result, set)
                assert len(result) == 3
        finally:
            os.unlink(marker_path)

    def test_save_replied_writes_correct_json(self):
        """save_replied must write a JSON array of IDs to the marker file."""
        spec = importlib.util.spec_from_file_location(
            'youtube_poller_save1',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        module = importlib.util.module_from_spec(spec)
        sys.modules['youtube_poller_save1'] = module
        spec.loader.exec_module(module)

        with tempfile.TemporaryDirectory() as tmpdir:
            marker_path = os.path.join(tmpdir, '.youtube_replied_ids')
            with patch.object(module, 'REPLIED_MARKER', marker_path):
                module.save_replied({'abc', 'def', 'xyz'})
                assert os.path.exists(marker_path), "File was not created"
                with open(marker_path) as f:
                    data = json.load(f)
                assert sorted(data) == ['abc', 'def', 'xyz']
                assert isinstance(data, list)
                assert len(data) == 3

    def test_load_replied_handles_empty_json_array(self):
        """load_replied must return empty set when file contains empty list."""
        spec = importlib.util.spec_from_file_location(
            'youtube_poller_load3',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        module = importlib.util.module_from_spec(spec)
        sys.modules['youtube_poller_load3'] = module
        spec.loader.exec_module(module)

        with tempfile.NamedTemporaryFile(suffix='.json', delete=False, mode='w') as f:
            json.dump([], f)
            f.flush()
            marker_path = f.name

        try:
            with patch.object(module, 'REPLIED_MARKER', marker_path):
                result = module.load_replied()
                assert result == set()
                assert len(result) == 0
        finally:
            os.unlink(marker_path)