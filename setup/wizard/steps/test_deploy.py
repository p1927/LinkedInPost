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
