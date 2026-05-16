"""Tests for setup/wizard/steps/deploy module.

Tests _run_deploy business logic.
Flask routes tested via Flask test client.
"""

from __future__ import annotations

import queue
import subprocess
import sys
import threading
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest


class TestRunDeploy:
    """Tests for _run_deploy()."""

    def _reset_deploy_state(self):
        """Drain queue and reset events for test isolation."""
        from setup.wizard.steps import deploy as deploy_module
        deploy_module._deploy_done.clear()
        deploy_module._deploy_success.clear()
        # Drain queue of any residual items
        while not deploy_module._log_queue.empty():
            try:
                deploy_module._log_queue.get_nowait()
            except queue.Empty:
                break

    def test_runs_setup_deploy_worker_command(self):
        """Must invoke python setup.py --deploy-worker."""
        from setup.wizard.steps import deploy as deploy_module
        self._reset_deploy_state()

        with patch('subprocess.Popen') as mock_popen:
            mock_proc = MagicMock()
            mock_proc.stdout = iter(['done\n'])
            mock_proc.returncode = 0
            mock_proc.wait.return_value = 0
            mock_popen.return_value = mock_proc

            deploy_module._run_deploy()

            mock_popen.assert_called_once()
            cmd = mock_popen.call_args[0][0]
            assert 'setup.py' in cmd
            assert '--deploy-worker' in cmd

    def test_pumps_stdout_lines_to_queue(self):
        """Must put each stdout line from subprocess into _log_queue."""
        from setup.wizard.steps import deploy as deploy_module
        self._reset_deploy_state()
        lines_seen = []

        def capture_queue(q):
            while True:
                item = q.get()
                if item is None:
                    break
                lines_seen.append(item)

        with patch('subprocess.Popen') as mock_popen:
            mock_proc = MagicMock()
            mock_stdout = iter(['line one\n', 'line two\n', 'line three\n'])
            mock_proc.stdout = mock_stdout
            mock_proc.returncode = 0
            mock_proc.wait.return_value = 0
            mock_popen.return_value = mock_proc

            reader = threading.Thread(target=capture_queue, args=(deploy_module._log_queue,), daemon=True)
            reader.start()

            deploy_module._run_deploy()
            reader.join(timeout=2)

            assert 'line one\n' in lines_seen
            assert 'line two\n' in lines_seen

    def test_sets_success_event_on_zero_returncode(self):
        """Must set _deploy_success when subprocess exits with code 0."""
        from setup.wizard.steps import deploy as deploy_module
        self._reset_deploy_state()

        with patch('subprocess.Popen') as mock_popen:
            mock_proc = MagicMock()
            mock_proc.stdout = iter(['done\n'])
            mock_proc.returncode = 0
            mock_proc.wait.return_value = 0
            mock_popen.return_value = mock_proc

            deploy_module._run_deploy()

            assert deploy_module._deploy_success.is_set() is True
            assert deploy_module._deploy_done.is_set() is True

    def test_does_not_set_success_event_on_nonzero_returncode(self):
        """Must NOT set _deploy_success when subprocess exits with non-zero code."""
        from setup.wizard.steps import deploy as deploy_module
        self._reset_deploy_state()

        with patch('subprocess.Popen') as mock_popen:
            mock_proc = MagicMock()
            mock_proc.stdout = iter(['error\n'])
            mock_proc.returncode = 1
            mock_proc.wait.return_value = 1
            mock_popen.return_value = mock_proc

            deploy_module._run_deploy()

            assert deploy_module._deploy_success.is_set() is False
            assert deploy_module._deploy_done.is_set() is True

    def test_sets_deploy_done_event_after_completion(self):
        """Must set _deploy_done event after subprocess completes."""
        from setup.wizard.steps import deploy as deploy_module
        self._reset_deploy_state()

        with patch('subprocess.Popen') as mock_popen:
            mock_proc = MagicMock()
            mock_proc.stdout = iter(['done\n'])
            mock_proc.returncode = 0
            mock_proc.wait.return_value = 0
            mock_popen.return_value = mock_proc

            assert deploy_module._deploy_done.is_set() is False

            deploy_module._run_deploy()

            assert deploy_module._deploy_done.is_set() is True


class TestDeployRoutes:
    """Tests for Flask routes via test client."""

    def _reset_deploy_state(self):
        """Drain queue and reset events for test isolation."""
        from setup.wizard.steps import deploy as deploy_module
        deploy_module._deploy_done.clear()
        deploy_module._deploy_success.clear()
        while not deploy_module._log_queue.empty():
            try:
                deploy_module._log_queue.get_nowait()
            except queue.Empty:
                break

    def _app(self):
        """Create test Flask app with real deploy module state."""
        from setup.wizard.server import create_app
        app = create_app()
        app.config['TESTING'] = True
        return app

    def test_show_renders_step_deploy_html(self):
        """GET /step/deploy must return 200 and render step_deploy.html."""
        app = self._app()
        with app.test_client() as client:
            response = client.get('/step/deploy')
            assert response.status_code == 200
            assert b'<html' in response.data or b'deploy' in response.data.lower()

    def test_start_spawns_thread_and_returns_204(self):
        """POST /step/deploy/start must spawn thread and return 204 No Content."""
        self._reset_deploy_state()
        app = self._app()
        with app.test_client() as client:
            response = client.post('/step/deploy/start')
            assert response.status_code == 204
            assert len(response.data) == 0

    def test_stream_returns_sse_format(self):
        """GET /step/deploy/stream must return text/event-stream."""
        self._reset_deploy_state()
        app = self._app()
        with app.test_client() as client:
            response = client.get('/step/deploy/stream')
            assert response.status_code == 200
            assert response.content_type.startswith('text/event-stream')

    def test_stream_yields_data_lines(self):
        """SSE stream must yield properly formatted data lines."""
        self._reset_deploy_state()
        from setup.wizard.steps import deploy as deploy_module
        deploy_module._log_queue.put('log line one\n')
        deploy_module._log_queue.put(None)  # sentinel triggers __DONE__

        app = self._app()
        with app.test_client() as client:
            response = client.get('/step/deploy/stream')
            data = response.data.decode()
            lines = data.split('\n')
            data_lines = [l for l in lines if l.startswith('data: ')]
            assert len(data_lines) >= 1
            assert any('log line one' in l for l in data_lines)
