"""Tests for automations/youtube_poller module."""

import importlib.util
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


class TestYtGet:
    def test_yt_get_handles_http_error(self):
        module = load_module(
            'youtube_poller',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        result = module.yt_get("search", {"key": "invalid"})
        assert isinstance(result, dict)


class TestApplyTemplate:
    def test_apply_template_replaces_name(self):
        module = load_module(
            'youtube_poller2',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        result = module.apply_template("Hello {name}", "Alice")
        assert result == "Hello Alice"

    def test_apply_template_no_marker(self):
        module = load_module(
            'youtube_poller3',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        result = module.apply_template("Hello world", "Bob")
        assert result == "Hello world"


class TestLoadReplied:
    def test_load_replied_returns_set(self):
        module = load_module(
            'youtube_poller4',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        result = module.load_replied()
        assert isinstance(result, set)


class TestPostReply:
    def test_post_reply_returns_bool(self):
        module = load_module(
            'youtube_poller5',
            Path(__file__).resolve().parents[2] / 'automations' / 'youtube_poller.py'
        )
        result = module.post_reply("vid", "parent", "text", "invalid_token")
        assert isinstance(result, bool)
