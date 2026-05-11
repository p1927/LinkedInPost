"""Tests for setup/worker_config module.

Tests pure functions: normalize_space_delimited, normalize_origin,
read_worker_dev_var, load_worker_encryption_key, read_existing_kv_ids,
extract_namespace_id, extract_worker_url, pick_verification_origin.
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from setup.worker_config import (
    _merge_cors_origins,
    extract_namespace_id,
    extract_worker_url,
    normalize_origin,
    normalize_space_delimited,
    pick_verification_origin,
    read_existing_kv_ids,
    read_worker_dev_var,
)


class TestNormalizeSpaceDelimited:
    """Tests for normalize_space_delimited()."""

    def test_joins_space_delimited_parts(self):
        result = normalize_space_delimited('a b c')
        assert result == 'a b c'
        assert len(result) == 5

    def test_joins_comma_delimited_parts(self):
        result = normalize_space_delimited('a,b,c')
        assert result == 'a b c'
        assert 'b' in result

    def test_joins_mixed_delimiters(self):
        result = normalize_space_delimited('a b,c d')
        assert result == 'a b c d'
        assert result.count(' ') == 3

    def test_removes_empty_parts(self):
        result = normalize_space_delimited('a  b  c')
        assert result == 'a b c'
        assert '  ' not in result

    def test_strips_whitespace(self):
        result = normalize_space_delimited('  a b c  ')
        assert result == 'a b c'
        assert result.startswith('a')

    def test_returns_empty_for_empty_string(self):
        result = normalize_space_delimited('')
        assert result == ''
        assert len(result) == 0

    def test_returns_empty_for_whitespace_only(self):
        result = normalize_space_delimited('   ')
        assert result == ''
        assert result.strip() == ''


class TestMergeCorsOrigins:
    """Tests for _merge_cors_origins()."""

    def test_preserves_existing_origins(self):
        result = _merge_cors_origins('https://a.com https://b.com', '')
        assert result == 'https://a.com https://b.com'
        assert 'https://a.com' in result

    def test_appends_new_origins_not_in_existing(self):
        result = _merge_cors_origins('https://a.com', 'https://b.com https://c.com')
        assert 'https://a.com' in result
        assert 'https://b.com' in result
        assert 'https://c.com' in result
        assert len(result.split()) == 3

    def test_skips_duplicates(self):
        result = _merge_cors_origins('https://a.com', 'https://a.com')
        assert result == 'https://a.com'
        assert result.count('https://a.com') == 1

    def test_empty_existing_returns_only_new(self):
        result = _merge_cors_origins('', 'https://a.com')
        assert result == 'https://a.com'
        assert 'https://a.com' in result

    def test_empty_incoming_returns_existing(self):
        result = _merge_cors_origins('https://a.com', '')
        assert result == 'https://a.com'
        assert 'https://b.com' not in result


class TestNormalizeOrigin:
    """Tests for normalize_origin()."""

    def test_returns_full_url_for_valid_url(self):
        result = normalize_origin('https://example.com/')
        assert result == 'https://example.com'
        assert result.startswith('https://')

    def test_strips_trailing_slash_from_url(self):
        result = normalize_origin('https://example.com/')
        assert result == 'https://example.com'
        assert not result.endswith('/')

    def test_returns_value_for_plain_hostname(self):
        result = normalize_origin('example.com')
        assert result == 'example.com'
        assert '.' in result

    def test_strips_path_from_origin(self):
        result = normalize_origin('https://example.com/path/to/page')
        assert result == 'https://example.com'
        assert '/path' not in result

    def test_returns_empty_for_whitespace_only(self):
        result = normalize_origin('   ')
        assert result == ''
        assert result.strip() == ''

    def test_returns_empty_for_empty_string(self):
        result = normalize_origin('')
        assert result == ''
        assert len(result) == 0


class TestReadWorkerDevVar:
    """Tests for read_worker_dev_var()."""

    def test_returns_empty_when_file_missing(self):
        result = read_worker_dev_var(Path('/nonexistent/.dev.vars'), 'MY_KEY')
        assert result == ''
        assert isinstance(result, str)

    def test_returns_empty_when_key_not_in_file(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.dev.vars', delete=False) as f:
            f.write('OTHER_KEY=some_value\n')
            f.flush()
            path = Path(f.name)
        try:
            result = read_worker_dev_var(path, 'MY_KEY')
            assert result == ''
            assert 'MY_KEY' not in open(path).read()
        finally:
            path.unlink()

    def test_returns_value_when_key_present(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.dev.vars', delete=False) as f:
            f.write('MY_KEY=my_value\n')
            f.flush()
            path = Path(f.name)
        try:
            result = read_worker_dev_var(path, 'MY_KEY')
            assert result == 'my_value'
            assert len(result) > 0
        finally:
            path.unlink()

    def test_ignores_comment_lines(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.dev.vars', delete=False) as f:
            f.write('# MY_KEY=ignored\nMY_KEY=actual_value\n')
            f.flush()
            path = Path(f.name)
        try:
            result = read_worker_dev_var(path, 'MY_KEY')
            assert result == 'actual_value'
            assert '#' not in result
        finally:
            path.unlink()

    def test_strips_whitespace_from_value(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.dev.vars', delete=False) as f:
            f.write('MY_KEY=  trimmed_value  \n')
            f.flush()
            path = Path(f.name)
        try:
            result = read_worker_dev_var(path, 'MY_KEY')
            assert result == 'trimmed_value'
            assert '  ' not in result
        finally:
            path.unlink()


class TestReadExistingKvIds:
    """Tests for read_existing_kv_ids()."""

    def test_returns_empty_when_no_kv_namespaces(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonc', delete=False) as f:
            json.dump({'name': 'worker'}, f)
            f.flush()
            path = Path(f.name)
        try:
            result = read_existing_kv_ids(path)
            assert result == ('', '')
            assert isinstance(result, tuple)
            assert len(result) == 2
        finally:
            path.unlink()

    def test_returns_ids_from_first_namespace(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonc', delete=False) as f:
            json.dump({
                'kv_namespaces': [
                    {'id': 'abc123', 'preview_id': 'xyz789'}
                ]
            }, f)
            f.flush()
            path = Path(f.name)
        try:
            result = read_existing_kv_ids(path)
            assert result == ('abc123', 'xyz789')
            assert 'abc123' in result
            assert 'xyz789' in result
        finally:
            path.unlink()

    def test_returns_empty_for_replacement_placeholder(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonc', delete=False) as f:
            json.dump({
                'kv_namespaces': [
                    {'id': 'REPLACE_WITH_KV_NAMESPACE_ID', 'preview_id': 'REPLACE_WITH_KV_PREVIEW_ID'}
                ]
            }, f)
            f.flush()
            path = Path(f.name)
        try:
            result = read_existing_kv_ids(path)
            assert result == ('', '')
            assert 'REPLACE' not in str(result)
        finally:
            path.unlink()


class TestExtractNamespaceId:
    """Tests for extract_namespace_id()."""

    def test_returns_empty_on_empty_string(self):
        result = extract_namespace_id('')
        assert result == ''
        assert len(result) == 0

    def test_extracts_from_json_object(self):
        result = extract_namespace_id('{"id": "abc123"}')
        assert result == 'abc123'
        assert len(result) == 6

    def test_extracts_from_json_with_whitespace(self):
        result = extract_namespace_id('  {"id": "abc123"}  ')
        assert result == 'abc123'
        assert result.strip() == 'abc123'

    def test_extracts_id_from_plain_text_with_regex(self):
        result = extract_namespace_id('Created namespace abcdef1234567890abcdef1234567890 for testing')
        assert result == 'abcdef1234567890abcdef1234567890'
        assert len(result) == 32

    def test_returns_empty_when_no_match(self):
        result = extract_namespace_id('No id here')
        assert result == ''
        assert len(result) == 0


class TestExtractWorkerUrl:
    """Tests for extract_worker_url()."""

    def test_returns_empty_on_empty_string(self):
        result = extract_worker_url('')
        assert result == ''
        assert len(result) == 0

    def test_extracts_workers_dev_url(self):
        result = extract_worker_url('Worker deployed at https://my-worker.test-subdomain.workers.dev')
        assert result == 'https://my-worker.test-subdomain.workers.dev'
        assert result.startswith('https://')
        assert '.workers.dev' in result

    def test_returns_empty_when_no_url(self):
        result = extract_worker_url('No URL here')
        assert result == ''
        assert len(result) == 0


class TestPickVerificationOrigin:
    """Tests for pick_verification_origin()."""

    def test_returns_first_valid_origin(self):
        result = pick_verification_origin('https://a.com https://b.com')
        assert result == 'https://a.com'
        assert result.startswith('https://')

    def test_skips_empty_parts(self):
        result = pick_verification_origin('  https://a.com   https://b.com')
        assert result == 'https://a.com'
        assert 'https://a.com' in result

    def test_returns_empty_when_all_invalid(self):
        result = pick_verification_origin('')
        assert result == ''
        assert len(result) == 0

    def test_normalizes_and_returns_valid_origin(self):
        result = pick_verification_origin('https://example.com/path')
        assert result == 'https://example.com'
        assert '/path' not in result