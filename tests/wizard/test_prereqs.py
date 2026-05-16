"""Tests for setup/wizard/steps/prereqs module.

Tests check_prereqs business logic.
Flask routes tested by wizard integration tests.
"""

from __future__ import annotations

import sys
from unittest.mock import patch

import pytest


class TestCheckPrereqs:
    """Tests for check_prereqs()."""

    def test_returns_list_of_checks(self):
        """Must return a list of dictionaries."""
        from setup.wizard.steps.prereqs import check_prereqs
        result = check_prereqs()
        assert isinstance(result, list)
        assert len(result) >= 4

    def test_python_check_present(self):
        """Must include a Python version check."""
        from setup.wizard.steps.prereqs import check_prereqs
        result = check_prereqs()
        py_check = next((c for c in result if 'Python' in c['name']), None)
        assert py_check is not None
        assert 'found' in py_check
        assert 'ok' in py_check
        assert 'fix' in py_check

    def test_python_check_passes_on_current_version(self):
        """Must report ok=True when Python version is 3.11+."""
        from setup.wizard.steps.prereqs import check_prereqs
        major, minor = sys.version_info[:2]
        result = check_prereqs()
        py_check = next((c for c in result if 'Python' in c['name']), None)
        assert py_check is not None
        expected_ok = (major, minor) >= (3, 11)
        assert py_check['ok'] == expected_ok
        assert py_check['found'] == f'{major}.{minor}'

    def test_node_check_present(self):
        """Must include a Node.js version check."""
        from setup.wizard.steps.prereqs import check_prereqs
        result = check_prereqs()
        node_check = next((c for c in result if 'Node' in c['name']), None)
        assert node_check is not None
        assert 'found' in node_check
        assert 'ok' in node_check
        assert 'fix' in node_check

    def test_wrangler_check_present(self):
        """Must include a Wrangler CLI check."""
        from setup.wizard.steps.prereqs import check_prereqs
        result = check_prereqs()
        wrangler_check = next((c for c in result if 'Wrangler' in c['name']), None)
        assert wrangler_check is not None
        assert 'found' in wrangler_check
        assert 'ok' in wrangler_check
        assert 'fix' in wrangler_check

    def test_git_check_present(self):
        """Must include a Git check."""
        from setup.wizard.steps.prereqs import check_prereqs
        result = check_prereqs()
        git_check = next((c for c in result if 'Git' in c['name']), None)
        assert git_check is not None
        assert 'found' in git_check
        assert 'ok' in git_check
        assert 'fix' in git_check

    def test_node_not_found_when_which_returns_none(self):
        """Must report node not found when shutil.which returns None."""
        from setup.wizard.steps.prereqs import check_prereqs
        with patch('shutil.which', return_value=None):
            from importlib import reload
            import setup.wizard.steps.prereqs as prereqs_module
            reload(prereqs_module)
            result = prereqs_module.check_prereqs()
            node_check = next((c for c in result if 'Node' in c['name']), None)
            assert node_check is not None
            assert node_check['ok'] is False
            assert 'not found' in node_check['found']

    def test_all_checks_have_required_keys(self):
        """Every check must have name, ok, found, and fix keys."""
        from setup.wizard.steps.prereqs import check_prereqs
        result = check_prereqs()
        for check in result:
            assert 'name' in check
            assert 'ok' in check
            assert isinstance(check['ok'], bool)
            assert 'found' in check
            assert 'fix' in check

    def test_checks_are_independent_dicts(self):
        """Each check must be an independent dict (not same object)."""
        from setup.wizard.steps.prereqs import check_prereqs
        result = check_prereqs()
        assert len(result) == len(set(id(c) for c in result))
        assert all(isinstance(c, dict) for c in result)
