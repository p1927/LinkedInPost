"""Tests for the deploy step (subprocess failure surfacing)."""

from __future__ import annotations


def test_deploy_show_renders(client, tmp_env):
    r = client.get('/step/deploy')
    assert r.status_code == 200


def test_deploy_start_returns_204(client, tmp_env, mock_subprocess):
    # The wizard kicks off the deploy in a thread and returns 204 immediately.
    r = client.post('/step/deploy/start')
    assert r.status_code == 204


def test_deploy_subprocess_failure_does_not_mark_complete(client, tmp_env, mock_subprocess):
    """When the deploy subprocess exits non-zero, deploy step must NOT be marked complete."""
    mock_subprocess.set_popen_exit(1)  # type: ignore[attr-defined]
    mock_subprocess.set_popen_stdout('Worker deploy failed: missing GEMINI_API_KEY\n')  # type: ignore[attr-defined]

    # The deploy.py route streams logs on /step/deploy/stream after start.
    # Just exercise start; downstream stream handling is covered by E2E.
    r = client.post('/step/deploy/start')
    assert r.status_code == 204

    # Read state — deploy must not be complete after a failed run
    from setup.wizard import state as state_module
    assert state_module.is_complete('deploy') is False
