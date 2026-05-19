"""Tests for deploy.py"""
import pytest
from unittest.mock import patch, MagicMock
from flask import Flask


@pytest.fixture
def app():
    app = Flask(__name__)
    app.config['TESTING'] = True
    from ..steps import deploy
    app.register_blueprint(deploy.bp)
    return app


@pytest.fixture
def client(app):
    return app.test_client()


def test_show_renders_template(client):
    """show() renders step_deploy.html with correct current_step."""
    with patch('setup.wizard.steps.deploy.load') as mock_load, \
         patch('setup.wizard.steps.deploy.render_template') as mock_render:
        mock_load.return_value = {'deploy': False}
        mock_render.return_value = 'OK'
        resp = client.get('/step/deploy')
        assert resp.status_code == 200


def test_start_returns_204(client):
    """start() returns 204 after spawning deploy thread."""
    resp = client.post('/step/deploy/start')
    assert resp.status_code == 204


def test_deploy_kill_reaps_zombie_on_timeout():
    """Regression: proc.wait() must be called after proc.kill() to reap the zombie."""
    import queue, threading, time
    from unittest.mock import patch, MagicMock
    from setup.wizard.steps.deploy import _run_deploy, _DEPLOY_TIMEOUT_SEC

    mock_proc = MagicMock()
    mock_proc.stdout.__iter__ = MagicMock(return_value=iter(['line\n']))

    kill_order = []
    def tracked_kill():
        kill_order.append('kill')
    def tracked_wait():
        kill_order.append('wait')
    mock_proc.kill = tracked_kill
    mock_proc.wait = tracked_wait

    log_q = queue.Queue()
    call_count = [0]
    def fake_monotonic():
        call_count[0] += 1
        return 0.0 if call_count[0] == 1 else 700.0  # start=0, check=700 → timeout

    with patch('setup.wizard.steps.deploy.subprocess.Popen', return_value=mock_proc), \
         patch('setup.wizard.steps.deploy._log_queue', log_q), \
         patch.object(time, 'monotonic', fake_monotonic):
        t = threading.Thread(target=_run_deploy)
        t.start()
        t.join(timeout=3)

    assert 'kill' in kill_order, f"proc.kill() should be called on timeout, got: {kill_order}"
    assert 'wait' in kill_order, f"proc.wait() should be called to reap zombie, got: {kill_order}"
    assert kill_order.index('wait') > kill_order.index('kill'), \
        f"proc.wait() must be called AFTER proc.kill(), order: {kill_order}"


def test_deploy_popen_failure_logs_error_and_sends_sentinel():
    """Popen failure (e.g. setup.py missing) must not crash the thread — log error and send sentinel."""
    import queue, threading
    from unittest.mock import patch, MagicMock
    from setup.wizard.steps.deploy import _run_deploy

    log_q = queue.Queue()
    with patch('setup.wizard.steps.deploy.subprocess.Popen', side_effect=FileNotFoundError('setup.py not found')), \
         patch('setup.wizard.steps.deploy._log_queue', log_q):
        t = threading.Thread(target=_run_deploy)
        t.start()
        t.join(timeout=5)
        assert not t.is_alive(), "Thread must exit after Popen failure"

    # Should have sent sentinel (None) to signal done
    items = []
    while True:
        try:
            items.append(log_q.get_nowait())
        except queue.Empty:
            break
    assert None in items, f"Sentinel (None) must be in queue on Popen failure, got: {items}"


def test_deploy_stream_broken_logs_error_and_sends_sentinel():
    """stdout iteration failure must not crash thread — log error and send sentinel."""
    import queue, threading
    from unittest.mock import patch, MagicMock
    from setup.wizard.steps.deploy import _run_deploy

    mock_proc = MagicMock()
    mock_proc.stdout.__iter__ = MagicMock(side_effect=IOError('pipe broken'))

    log_q = queue.Queue()
    with patch('setup.wizard.steps.deploy.subprocess.Popen', return_value=mock_proc), \
         patch('setup.wizard.steps.deploy._log_queue', log_q):
        t = threading.Thread(target=_run_deploy)
        t.start()
        t.join(timeout=5)
        assert not t.is_alive(), "Thread must exit after stdout error"

    # Should have sent sentinel (None) to signal done
    items = []
    while True:
        try:
            items.append(log_q.get_nowait())
        except queue.Empty:
            break
    assert None in items, f"Sentinel (None) must be in queue after stdout error, got: {items}"
