"""Tests for setup.utils module."""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class TestOk:
    def test_ok_is_callable(self):
        from setup.utils import ok
        # Smoke test — ok() just prints
        ok('test', 'value')


class TestWarn:
    def test_warn_is_callable(self):
        from setup.utils import warn
        warn('test', 'warning')


class TestFail:
    def test_fail_is_callable(self):
        from setup.utils import fail
        # fail() just prints, does not raise
        fail('test', 'failing')


class TestGenerateEncryptionKey:
    def test_returns_base64_string(self):
        from setup.utils import generate_encryption_key
        key = generate_encryption_key()
        assert isinstance(key, str)
        assert len(key) > 20  # base64 of 32 bytes

    def test_returns_different_keys_each_call(self):
        from setup.utils import generate_encryption_key
        k1 = generate_encryption_key()
        k2 = generate_encryption_key()
        assert k1 != k2


class TestEnsureCommand:
    def test_passes_for_existing_command(self):
        from setup.utils import ensure_command
        ensure_command('python3', 'Python is required')

    def test_raises_for_nonexistent_command(self):
        from setup.utils import ensure_command
        with pytest.raises(RuntimeError, match='nonexistent_cmd_12345 is not available'):
            ensure_command('nonexistent_cmd_12345', 'This command does not exist')