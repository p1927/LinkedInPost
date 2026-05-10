"""Tests for setup.cloudflare module."""

import importlib.util
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def ensure_setup_package():
    """Ensure setup package and its dependencies are in sys.modules."""
    # Ensure setup is a proper package
    if 'setup' not in sys.modules:
        spec = importlib.util.spec_from_file_location(
            'setup',
            Path('/home/openclaw/workspaces/linkedin-post/setup/__init__.py')
        )
        module = importlib.util.module_from_spec(spec)
        sys.modules['setup'] = module
        spec.loader.exec_module(module)

    # Ensure dependencies
    for name, path in [
        ('setup.constants', '/home/openclaw/workspaces/linkedin-post/setup/constants.py'),
        ('setup.utils', '/home/openclaw/workspaces/linkedin-post/setup/utils.py'),
    ]:
        if name not in sys.modules:
            spec = importlib.util.spec_from_file_location(name, Path(path))
            module = importlib.util.module_from_spec(spec)
            sys.modules[name] = module
            spec.loader.exec_module(module)


class TestD1IdIsPlaceholder:
    """Tests for _d1_id_is_placeholder helper."""

    def test_empty_string_is_placeholder(self):
        ensure_setup_package()
        if 'setup.cloudflare' in sys.modules:
            del sys.modules['setup.cloudflare']
        module = load_module(
            'setup.cloudflare',
            Path('/home/openclaw/workspaces/linkedin-post/setup/cloudflare.py')
        )
        assert module._d1_id_is_placeholder("") is True

    def test_replace_with_placeholder(self):
        ensure_setup_package()
        if 'setup.cloudflare' in sys.modules:
            del sys.modules['setup.cloudflare']
        module = load_module(
            'setup.cloudflare2',
            Path('/home/openclaw/workspaces/linkedin-post/setup/cloudflare.py')
        )
        assert module._d1_id_is_placeholder("REPLACE_WITH_REAL_ID") is True

    def test_to_be_created_placeholder(self):
        ensure_setup_package()
        if 'setup.cloudflare' in sys.modules:
            del sys.modules['setup.cloudflare']
        module = load_module(
            'setup.cloudflare3',
            Path('/home/openclaw/workspaces/linkedin-post/setup/cloudflare.py')
        )
        assert module._d1_id_is_placeholder("to_be_created") is True

    def test_zero_id_placeholder(self):
        ensure_setup_package()
        if 'setup.cloudflare' in sys.modules:
            del sys.modules['setup.cloudflare']
        module = load_module(
            'setup.cloudflare4',
            Path('/home/openclaw/workspaces/linkedin-post/setup/cloudflare.py')
        )
        assert module._d1_id_is_placeholder("00000000-0000-0000-0000-000000000001") is True

    def test_valid_uuid_not_placeholder(self):
        ensure_setup_package()
        if 'setup.cloudflare' in sys.modules:
            del sys.modules['setup.cloudflare']
        module = load_module(
            'setup.cloudflare5',
            Path('/home/openclaw/workspaces/linkedin-post/setup/cloudflare.py')
        )
        assert module._d1_id_is_placeholder("550e8400-e29b-41d4-a716-446655440000") is False


class TestExtractD1DatabaseId:
    """Tests for _extract_d1_database_id helper."""

    def _load_cloudflare(self, name):
        ensure_setup_package()
        if 'setup.cloudflare' in sys.modules:
            del sys.modules['setup.cloudflare']
        return load_module(
            f'setup.cloudflare_{name}',
            Path('/home/openclaw/workspaces/linkedin-post/setup/cloudflare.py')
        )

    def test_parses_json_uuid(self):
        module = self._load_cloudflare('cf6')
        result = module._extract_d1_database_id('{"uuid": "abc12345-1234-1234-1234-123456789abc"}')
        assert result == "abc12345-1234-1234-1234-123456789abc"

    def test_parses_json_id(self):
        module = self._load_cloudflare('cf7')
        result = module._extract_d1_database_id('{"id": "xyz99999-9999-9999-9999-999999999999"}')
        assert result == "xyz99999-9999-9999-9999-999999999999"

    def test_parses_plain_uuid_in_text(self):
        module = self._load_cloudflare('cf8')
        result = module._extract_d1_database_id('Created database ABC12345-1234-1234-1234-123456789ABC')
        assert result == "ABC12345-1234-1234-1234-123456789ABC"

    def test_returns_empty_on_failure(self):
        module = self._load_cloudflare('cf9')
        result = module._extract_d1_database_id("No UUID here")
        assert result == ""