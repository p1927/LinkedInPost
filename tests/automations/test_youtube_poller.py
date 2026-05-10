"""Tests for automations/youtube_poller module.

Tests actual business logic: error handling, template application,
file operations, and network call behavior. NOT file-existence checks.
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

        # Use a temp marker file that definitely doesn't exist
        with patch.object(module, 'REPLIED_MARKER', '/nonexistent/.youtube_replied_ids'):
            result = module.load_replied()
            assert result == set()

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
                with open(marker_path) as f:
                    data = json.load(f)
                assert sorted(data) == ['abc', 'def', 'xyz']