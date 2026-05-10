"""Tests for setup.utils module."""

import importlib.util
import sys
from pathlib import Path


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


class TestOk:
    def test_ok_is_callable(self):
        module = load_module(
            'setup_utils',
            Path('/home/openclaw/workspaces/linkedin-post/setup/utils.py')
        )
        assert callable(module.ok)
        module.ok('test', 'value')

    def test_warn_is_callable(self):
        module = load_module(
            'setup_utils2',
            Path('/home/openclaw/workspaces/linkedin-post/setup/utils.py')
        )
        assert callable(module.warn)
        module.warn('test', 'warning')

    def test_fail_is_callable(self):
        module = load_module(
            'setup_utils3',
            Path('/home/openclaw/workspaces/linkedin-post/setup/utils.py')
        )
        assert callable(module.fail)
        module.fail('test', 'failing')


class TestGenerateEncryptionKey:
    def test_returns_base64_string(self):
        module = load_module(
            'setup_utils4',
            Path('/home/openclaw/workspaces/linkedin-post/setup/utils.py')
        )
        key = module.generate_encryption_key()
        assert isinstance(key, str)
        assert len(key) > 20

    def test_returns_different_keys_each_call(self):
        module = load_module(
            'setup_utils5',
            Path('/home/openclaw/workspaces/linkedin-post/setup/utils.py')
        )
        k1 = module.generate_encryption_key()
        k2 = module.generate_encryption_key()
        assert k1 != k2


class TestEnsureCommand:
    def test_passes_for_existing_command(self):
        module = load_module(
            'setup_utils6',
            Path('/home/openclaw/workspaces/linkedin-post/setup/utils.py')
        )
        module.ensure_command('python3', 'Python is required')

    def test_raises_for_nonexistent_command(self):
        import pytest
        module = load_module(
            'setup_utils7',
            Path('/home/openclaw/workspaces/linkedin-post/setup/utils.py')
        )
        with pytest.raises(RuntimeError, match='nonexistent_cmd_12345 is not available'):
            module.ensure_command('nonexistent_cmd_12345', 'This command does not exist')