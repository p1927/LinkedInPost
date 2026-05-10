"""Tests for setup.cloudflare module."""

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class TestD1IdIsPlaceholder:
    """Tests for _d1_id_is_placeholder helper."""

    def test_empty_string_is_placeholder(self):
        from setup.cloudflare import _d1_id_is_placeholder
        assert _d1_id_is_placeholder("") is True

    def test_replace_with_placeholder(self):
        from setup.cloudflare import _d1_id_is_placeholder
        assert _d1_id_is_placeholder("REPLACE_WITH_REAL_ID") is True

    def test_to_be_created_placeholder(self):
        from setup.cloudflare import _d1_id_is_placeholder
        assert _d1_id_is_placeholder("to_be_created") is True

    def test_zero_id_placeholder(self):
        from setup.cloudflare import _d1_id_is_placeholder
        assert _d1_id_is_placeholder("00000000-0000-0000-0000-000000000001") is True

    def test_valid_uuid_not_placeholder(self):
        from setup.cloudflare import _d1_id_is_placeholder
        assert _d1_id_is_placeholder("550e8400-e29b-41d4-a716-446655440000") is False


class TestExtractD1DatabaseId:
    """Tests for _extract_d1_database_id helper."""

    def test_parses_json_uuid(self):
        from setup.cloudflare import _extract_d1_database_id
        result = _extract_d1_database_id('{"uuid": "abc12345-1234-1234-1234-123456789abc"}')
        assert result == "abc12345-1234-1234-1234-123456789abc"

    def test_parses_json_id(self):
        from setup.cloudflare import _extract_d1_database_id
        result = _extract_d1_database_id('{"id": "xyz99999-9999-9999-9999-999999999999"}')
        assert result == "xyz99999-9999-9999-9999-999999999999"

    def test_parses_plain_uuid_in_text(self):
        from setup.cloudflare import _extract_d1_database_id
        result = _extract_d1_database_id('Created database ABC12345-1234-1234-1234-123456789ABC')
        assert result == "ABC12345-1234-1234-1234-123456789ABC"

    def test_returns_empty_on_failure(self):
        from setup.cloudflare import _extract_d1_database_id
        result = _extract_d1_database_id("No UUID here")
        assert result == ""
