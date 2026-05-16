"""Tests for setup/wizard/server module.

Tests create_app and run_wizard business logic.
"""

from __future__ import annotations

import threading
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest


class TestCreateApp:
    """Tests for create_app()."""

    def test_returns_flask_app(self):
        """Must return a Flask application instance."""
        from setup.wizard.server import create_app
        app = create_app()
        assert app is not None
        assert hasattr(app, 'route')

    def test_app_has_secret_key(self):
        """Must set a secret key on the Flask app."""
        from setup.wizard.server import create_app
        app = create_app()
        assert app.secret_key is not None
        assert len(app.secret_key) > 0

    def test_mode_step_returns_200(self):
        """GET /step/mode must return 200 and HTML."""
        from setup.wizard.server import create_app
        app = create_app()
        with app.test_client() as client:
            response = client.get('/step/mode')
            assert response.status_code == 200
            assert isinstance(response.status_code, int)
            assert b'<html' in response.data

    def test_prereqs_step_returns_200(self):
        """GET /step/prereqs must return 200 and HTML."""
        from setup.wizard.server import create_app
        app = create_app()
        with app.test_client() as client:
            response = client.get('/step/prereqs')
            assert response.status_code == 200
            assert isinstance(response.status_code, int)
            assert b'<html' in response.data

    def test_google_step_returns_200(self):
        """GET /step/google must return 200 and HTML."""
        from setup.wizard.server import create_app
        app = create_app()
        with app.test_client() as client:
            response = client.get('/step/google')
            assert response.status_code == 200
            assert isinstance(response.status_code, int)
            assert b'<html' in response.data

    def test_cloudflare_step_returns_200(self):
        """GET /step/cloudflare must return 200 and HTML."""
        from setup.wizard.server import create_app
        app = create_app()
        with app.test_client() as client:
            response = client.get('/step/cloudflare')
            assert response.status_code == 200
            assert isinstance(response.status_code, int)
            assert b'<html' in response.data

    def test_apikeys_step_returns_200(self):
        """GET /step/apikeys must return 200 and HTML."""
        from setup.wizard.server import create_app
        app = create_app()
        with app.test_client() as client:
            response = client.get('/step/apikeys')
            assert response.status_code == 200
            assert isinstance(response.status_code, int)
            assert b'<html' in response.data

    def test_deploy_step_returns_200(self):
        """GET /step/deploy must return 200 and HTML."""
        from setup.wizard.server import create_app
        app = create_app()
        with app.test_client() as client:
            response = client.get('/step/deploy')
            assert response.status_code == 200
            assert isinstance(response.status_code, int)
            assert b'<html' in response.data

    def test_verify_step_returns_200(self):
        """GET /step/verify must return 200 and HTML."""
        from setup.wizard.server import create_app
        app = create_app()
        with app.test_client() as client:
            response = client.get('/step/verify')
            assert response.status_code == 200
            assert isinstance(response.status_code, int)
            assert b'<html' in response.data

    def test_root_redirects_to_mode(self):
        """GET / must redirect to the mode step."""
        from setup.wizard.server import create_app
        app = create_app()
        with app.test_client() as client:
            response = client.get('/')
            assert response.status_code in (301, 302, 303, 307, 308)
            assert isinstance(response.status_code, int)
            assert response.location is not None

    def test_complete_page_renders(self):
        """GET /complete must return 200 with HTML content."""
        from setup.wizard.server import create_app
        app = create_app()
        with app.test_client() as client:
            response = client.get('/complete')
            assert response.status_code == 200
            assert isinstance(response.status_code, int)
            assert b'<html' in response.data


class TestRunWizard:
    """Tests for run_wizard()."""

    def test_opens_browser_after_delay(self):
        """Must call webbrowser.open with the correct URL after 1 second."""
        import time
        from setup.wizard.server import run_wizard
        with patch('webbrowser.open') as mock_open, \
             patch('setup.wizard.server.create_app') as mock_create_app, \
             patch('werkzeug.serving.run_simple') as mock_run_simple:
            mock_app = MagicMock()
            mock_create_app.return_value = mock_app
            # run_simple blocks, so prevent that so Timer can fire
            mock_run_simple.return_value = None

            run_wizard()
            time.sleep(1.5)  # let Timer(1.0, ...) fire

            mock_open.assert_called_once()
            args, kwargs = mock_open.call_args
            assert 'localhost' in args[0]
            assert '4242' in args[0]

    def test_runs_flask_app_on_port_4242(self):
        """Must run the Flask app on port 4242 with use_reloader disabled."""
        from setup.wizard.server import run_wizard
        with patch('webbrowser.open'), \
             patch('setup.wizard.server.create_app') as mock_create_app:
            mock_app = MagicMock()
            mock_create_app.return_value = mock_app

            run_wizard()

            mock_app.run.assert_called_once()
            args, kwargs = mock_app.run.call_args
            assert kwargs['host'] == '127.0.0.1'
            assert kwargs['port'] == 4242
            assert kwargs['use_reloader'] is False
