"""Integration tests for prereqs step — regression tests for complete() gate."""

from __future__ import annotations


def test_prereqs_complete_redirects_on_success(client, tmp_env, monkeypatch):
    """When all checks pass, complete() must redirect to google.show."""
    from setup.wizard.steps import prereqs as prereqs_module
    # Patch checks to all pass
    monkeypatch.setattr(prereqs_module, 'check_prereqs', lambda: [
        {'name': 'Python 3.11+', 'ok': True, 'found': '3.11', 'fix': ''},
        {'name': 'Node.js 18+', 'ok': True, 'found': '20.0', 'fix': ''},
        {'name': 'Wrangler CLI', 'ok': True, 'found': '/usr/bin/wrangler', 'fix': ''},
        {'name': 'Git', 'ok': True, 'found': '/usr/bin/git', 'fix': ''},
    ])
    r = client.post('/step/prereqs/complete')
    assert r.status_code == 302
    assert 'google' in r.location


def test_prereqs_complete_re_renders_when_checks_fail(client, tmp_env, monkeypatch):
    """When any check fails, complete() must NOT redirect — must re-render the page.

    Regression test: previously complete() always redirected regardless of check
    results, allowing users to bypass the prerequisites gate.
    """
    from setup.wizard.steps import prereqs as prereqs_module
    # Patch checks to fail
    monkeypatch.setattr(prereqs_module, 'check_prereqs', lambda: [
        {'name': 'Python 3.11+', 'ok': False, 'found': '3.10', 'fix': 'Install Python 3.11+'},
        {'name': 'Node.js 18+', 'ok': True, 'found': '20.0', 'fix': ''},
        {'name': 'Wrangler CLI', 'ok': True, 'found': '/usr/bin/wrangler', 'fix': ''},
        {'name': 'Git', 'ok': True, 'found': '/usr/bin/git', 'fix': ''},
    ])
    r = client.post('/step/prereqs/complete')
    assert r.status_code == 200
    # Must re-render the step_prereqs template, not redirect
    assert b'step_prereqs' in r.data or b'Python' in r.data
    # Ensure state was not modified
    from setup.wizard import state as state_module
    state_val = state_module._state
    assert state_val is None or state_val.get('prereqs') is not True


def test_prereqs_complete_does_not_mark_complete_on_failure(client, tmp_env, monkeypatch):
    """When checks fail, the step must NOT be marked complete in state."""
    from setup.wizard.steps import prereqs as prereqs_module
    from setup.wizard import state as state_module
    # Ensure state is clean
    monkeypatch.setattr(state_module, '_state', None)
    # Patch checks to fail
    monkeypatch.setattr(prereqs_module, 'check_prereqs', lambda: [
        {'name': 'Python 3.11+', 'ok': False, 'found': '3.10', 'fix': 'Install Python 3.11+'},
        {'name': 'Node.js 18+', 'ok': True, 'found': '20.0', 'fix': ''},
        {'name': 'Wrangler CLI', 'ok': True, 'found': '/usr/bin/wrangler', 'fix': ''},
        {'name': 'Git', 'ok': True, 'found': '/usr/bin/git', 'fix': ''},
    ])
    r = client.post('/step/prereqs/complete')
    assert state_module.is_complete('prereqs') is False
    assert r.status_code == 200
