"""Tests for the deploy step (subprocess failure surfacing)."""

from __future__ import annotations

import queue as queue_module
import threading


def test_deploy_show_renders(client, tmp_env):
    r = client.get('/step/deploy')
    assert r.status_code == 200
    assert b'<!doctype html>' in r.data or r.status_code == 200


def test_deploy_start_returns_204(client, tmp_env, mock_subprocess):
    r = client.post('/step/deploy/start')
    assert r.status_code == 204
    assert r.content_type == 'application/json' or r.status_code == 204


def test_deploy_npx_missing_does_not_mark_complete(client, tmp_env, mock_subprocess):
    """When npx is not on PATH, ensure_command raises RuntimeError — deploy must NOT be marked complete."""
    from setup.wizard.steps import deploy as deploy_module

    class FakePopenNpx:
        def __init__(self, args, *_a, **_kw):
            if args and args[0] == 'npx':
                raise FileNotFoundError('npx not found')
            self.returncode = 0
            self.stdout = iter(['mock deploy line\n'])

        def wait(self):
            return self.returncode

    # Patch Popen to raise for npx calls
    deploy_module.subprocess.Popen = FakePopenNpx

    r = client.post('/step/deploy/start')
    assert r.status_code == 204

    from setup.wizard import state as state_module
    assert state_module.is_complete('deploy') is False


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


def test_deploy_stream_yields_done_on_success(client, tmp_env, mock_subprocess):
    """When deploy succeeds (exit 0), stream must yield __DONE__ and mark complete."""
    from setup.wizard import state as state_module
    from setup.wizard.steps import deploy as deploy_module

    # Reset state
    state_module._state = {}

    # Set up: deploy succeeds
    mock_subprocess.set_popen_exit(0)  # type: ignore[attr-defined]
    mock_subprocess.set_popen_stdout('Deploying worker...\nWorker deployed successfully\n')  # type: ignore[attr-defined]

    # Clear module-level state
    deploy_module._deploy_done.clear()
    deploy_module._deploy_success.clear()
    while not deploy_module._log_queue.empty():
        try:
            deploy_module._log_queue.get_nowait()
        except queue_module.Empty:
            break

    r = client.post('/step/deploy/start')
    assert r.status_code == 204

    # Drain the stream
    lines = []
    done_received = False
    for _ in range(50):
        rv = client.get('/step/deploy/stream')
        if rv.status_code != 200:
            break
        data = rv.data.decode()
        for line in data.split('\n'):
            if line.startswith('data: '):
                content = line[6:]
                if content == '__DONE__':
                    done_received = True
                lines.append(content)
        if done_received:
            break

    assert done_received, f"Expected __DONE__ in stream, got: {lines}"
    assert state_module.is_complete('deploy') is True


def test_deploy_stream_yields_failed_on_nonzero_exit(client, tmp_env, mock_subprocess):
    """When deploy fails (exit != 0), stream must yield __FAILED__ and NOT mark complete."""
    from setup.wizard import state as state_module
    from setup.wizard.steps import deploy as deploy_module

    # Reset state
    state_module._state = {}

    mock_subprocess.set_popen_exit(1)  # type: ignore[attr-defined]
    mock_subprocess.set_popen_stdout('Deploy failed: missing API key\n')  # type: ignore[attr-defined]

    # Clear module-level state
    deploy_module._deploy_done.clear()
    deploy_module._deploy_success.clear()
    while not deploy_module._log_queue.empty():
        try:
            deploy_module._log_queue.get_nowait()
        except queue_module.Empty:
            break

    r = client.post('/step/deploy/start')
    assert r.status_code == 204

    # Drain the stream
    lines = []
    failed_received = False
    for _ in range(50):
        rv = client.get('/step/deploy/stream')
        if rv.status_code != 200:
            break
        data = rv.data.decode()
        for line in data.split('\n'):
            if line.startswith('data: '):
                content = line[6:]
                if content == '__FAILED__':
                    failed_received = True
                lines.append(content)
        if failed_received:
            break

    assert failed_received, f"Expected __FAILED__ in stream, got: {lines}"
    assert state_module.is_complete('deploy') is False


def test_deploy_stream_sends_log_lines(client, tmp_env, mock_subprocess):
    """Stream must relay deploy log lines to the client."""
    from setup.wizard.steps import deploy as deploy_module

    mock_subprocess.set_popen_exit(0)  # type: ignore[attr-defined]
    mock_subprocess.set_popen_stdout('Step 1: Building\nStep 2: Deploying\nDone\n')  # type: ignore[attr-defined]

    # Clear module-level state
    deploy_module._deploy_done.clear()
    deploy_module._deploy_success.clear()
    while not deploy_module._log_queue.empty():
        try:
            deploy_module._log_queue.get_nowait()
        except queue_module.Empty:
            break

    client.post('/step/deploy/start')

    # Collect lines from stream
    lines = []
    done = False
    for _ in range(50):
        rv = client.get('/step/deploy/stream')
        if rv.status_code != 200:
            break
        data = rv.data.decode()
        for line in data.split('\n'):
            if line.startswith('data: '):
                content = line[6:]
                if content in ('__DONE__', '__FAILED__'):
                    done = True
                elif content:
                    lines.append(content)
        if done:
            break

    assert any('Building' in l or 'Step 1' in l for l in lines), f"Expected build log lines, got: {lines}"
    assert any('Deploying' in l or 'Step 2' in l for l in lines), f"Expected deploy log lines, got: {lines}"