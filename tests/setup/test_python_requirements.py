"""Tests for setup.python_requirements module."""

import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class TestGoogleStackImportable:
    """Tests for _google_stack_importable()."""

    def test_returns_false_when_google_not_importable(self):
        """Must return False when google.cloud.storage is not importable."""
        original_modules = sys.modules.copy()
        for key in list(sys.modules.keys()):
            if key.startswith('google'):
                del sys.modules[key]

        import builtins
        original_import = builtins.__import__
        def mock_import(name, *args, **kwargs):
            if name == 'google' or name.startswith('google.'):
                raise ImportError(f"No module named '{name}'")
            return original_import(name, *args, **kwargs)

        with patch.object(builtins, '__import__', mock_import):
            from setup.python_requirements import _google_stack_importable
            result = _google_stack_importable()
        sys.modules.update(original_modules)
        assert result is False
        assert isinstance(result, bool)

    def test_result_is_bool_type(self):
        """Must return a boolean value."""
        original_modules = sys.modules.copy()
        for key in list(sys.modules.keys()):
            if key.startswith('google'):
                del sys.modules[key]

        from setup.python_requirements import _google_stack_importable
        result = _google_stack_importable()
        sys.modules.update(original_modules)
        assert isinstance(result, bool)
        assert result in (True, False)


class TestEnsureGoogleSetupPythonDeps:
    """Smoke tests for ensure_google_setup_python_deps()."""

    def test_function_exists_and_is_callable(self):
        from setup.python_requirements import ensure_google_setup_python_deps
        assert callable(ensure_google_setup_python_deps)
        assert ensure_google_setup_python_deps is not None
