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




class TestPrereqsShowRoute:
    """Tests for prereqs.show() Flask route (GET /step/prereqs)."""

    def test_show_renders_prereqs_page(self, client, tmp_env, monkeypatch):
        """GET /step/prereqs must return 200 and render the prerequisites page."""
        from setup.wizard.steps import prereqs as prereqs_module
        monkeypatch.setattr(prereqs_module, 'check_prereqs', lambda: [
            {'name': 'Python 3.11+', 'ok': True, 'found': '3.12', 'fix': ''},
            {'name': 'Node.js 18+', 'ok': True, 'found': '20.0', 'fix': ''},
            {'name': 'Wrangler CLI', 'ok': True, 'found': '/usr/bin/wrangler', 'fix': ''},
            {'name': 'Git', 'ok': True, 'found': '/usr/bin/git', 'fix': ''},
        ])
        r = client.get('/step/prereqs')
        assert r.status_code == 200
        assert b'Python' in r.data or b'prereq' in r.data.lower()

    def test_show_passes_checks_to_template(self, client, tmp_env, monkeypatch):
        """show() must pass checks and all_ok to the template."""
        from setup.wizard.steps import prereqs as prereqs_module
        monkeypatch.setattr(prereqs_module, 'check_prereqs', lambda: [
            {'name': 'Python 3.11+', 'ok': False, 'found': '3.10', 'fix': 'Install Python 3.11+'},
            {'name': 'Node.js 18+', 'ok': True, 'found': '20.0', 'fix': ''},
            {'name': 'Wrangler CLI', 'ok': True, 'found': '/usr/bin/wrangler', 'fix': ''},
            {'name': 'Git', 'ok': True, 'found': '/usr/bin/git', 'fix': ''},
        ])
        r = client.get('/step/prereqs')
        assert r.status_code == 200
        # Since not all checks pass, all_ok should be False in the rendered page
        assert b'Python' in r.data or b'3.10' in r.data


class TestPrereqsCompleteRoute:
    """Tests for prereqs.complete() Flask route (POST /step/prereqs/complete)."""

    def test_complete_redirects_on_success(self, client, tmp_env, monkeypatch):
        """When all checks pass, complete() must redirect to google.show."""
        from setup.wizard.steps import prereqs as prereqs_module
        from setup.wizard import state as state_module
        monkeypatch.setattr(state_module, '_state', None)
        monkeypatch.setattr(prereqs_module, 'check_prereqs', lambda: [
            {'name': 'Python 3.11+', 'ok': True, 'found': '3.12', 'fix': ''},
            {'name': 'Node.js 18+', 'ok': True, 'found': '20.0', 'fix': ''},
            {'name': 'Wrangler CLI', 'ok': True, 'found': '/usr/bin/wrangler', 'fix': ''},
            {'name': 'Git', 'ok': True, 'found': '/usr/bin/git', 'fix': ''},
        ])
        r = client.post('/step/prereqs/complete')
        assert r.status_code == 302
        assert 'google' in r.location
        # prereqs step must be marked complete in state
        assert state_module.is_complete('prereqs') is True

    def test_complete_re_renders_when_checks_fail(self, client, tmp_env, monkeypatch):
        """When any check fails, complete() must NOT redirect — must re-render the page."""
        from setup.wizard.steps import prereqs as prereqs_module
        from setup.wizard import state as state_module
        monkeypatch.setattr(state_module, '_state', None)
        monkeypatch.setattr(prereqs_module, 'check_prereqs', lambda: [
            {'name': 'Python 3.11+', 'ok': False, 'found': '3.10', 'fix': 'Install Python 3.11+'},
            {'name': 'Node.js 18+', 'ok': True, 'found': '20.0', 'fix': ''},
            {'name': 'Wrangler CLI', 'ok': True, 'found': '/usr/bin/wrangler', 'fix': ''},
            {'name': 'Git', 'ok': True, 'found': '/usr/bin/git', 'fix': ''},
        ])
        r = client.post('/step/prereqs/complete')
        assert r.status_code == 200
        # Must NOT redirect
        # r.location is None for non-redirect (200) responses
        assert r.location is None or "google" not in r.location
        # State must NOT be marked complete
        assert state_module.is_complete('prereqs') is False

    def test_complete_shows_error_on_mark_complete_oserror(self, client, tmp_env, monkeypatch):
        """When mark_complete() raises OSError, complete() must re-render with an error, not redirect."""
        from setup.wizard.steps import prereqs as prereqs_module
        from setup.wizard import state as state_module
        monkeypatch.setattr(state_module, '_state', None)
        monkeypatch.setattr(prereqs_module, 'check_prereqs', lambda: [
            {'name': 'Python 3.11+', 'ok': True, 'found': '3.12', 'fix': ''},
            {'name': 'Node.js 18+', 'ok': True, 'found': '20.0', 'fix': ''},
            {'name': 'Wrangler CLI', 'ok': True, 'found': '/usr/bin/wrangler', 'fix': ''},
            {'name': 'Git', 'ok': True, 'found': '/usr/bin/git', 'fix': ''},
        ])
        # Replace mark_complete in the prereqs module's namespace so complete() finds it
        import sys
        prereqs_mod = sys.modules['setup.wizard.steps.prereqs']
        prereqs_mod.mark_complete = lambda step: (_ for _ in ()).throw(OSError('read-only file system'))
        r = client.post('/step/prereqs/complete')
        # Must re-render (200), not redirect (302)
        assert r.status_code == 200
        # State must NOT be marked complete (the OSError prevented it)
        assert state_module.is_complete('prereqs') is False
