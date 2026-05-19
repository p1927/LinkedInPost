"""Tests for apikeys.py"""
import pytest
from unittest.mock import patch, MagicMock
from flask import Flask


@pytest.fixture
def app():
    app = Flask(__name__)
    app.config['TESTING'] = True
    from ..steps import apikeys
    app.register_blueprint(apikeys.bp)
    return app


@pytest.fixture
def client(app):
    return app.test_client()


def test_validate_gemini_key_empty_returns_false():
    from setup.wizard.steps.apikeys import validate_gemini_key
    assert validate_gemini_key('') is False
    assert validate_gemini_key('   ') is False


def test_validate_gemini_key_200_returns_true():
    from setup.wizard.steps.apikeys import validate_gemini_key
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    with patch('setup.wizard.steps.apikeys.requests.post', return_value=mock_resp):
        assert validate_gemini_key('test-key') is True


def test_validate_gemini_key_401_returns_false():
    from setup.wizard.steps.apikeys import validate_gemini_key
    mock_resp = MagicMock()
    mock_resp.status_code = 401
    with patch('setup.wizard.steps.apikeys.requests.post', return_value=mock_resp):
        assert validate_gemini_key('bad-key') is False


def test_validate_gemini_key_500_returns_false():
    """HTTP 500 should not be treated as a valid key."""
    from setup.wizard.steps.apikeys import validate_gemini_key
    mock_resp = MagicMock()
    mock_resp.status_code = 500
    with patch('setup.wizard.steps.apikeys.requests.post', return_value=mock_resp):
        assert validate_gemini_key('valid-format-key') is False


def test_show_renders(client):
    """GET /step/apikeys returns 200."""
    with patch('setup.wizard.steps.apikeys.load') as mock_load, \
         patch('setup.wizard.steps.apikeys.render_template') as mock_render:
        mock_load.return_value = {'apikeys': False}
        mock_render.return_value = 'OK'
        resp = client.get('/step/apikeys')
        assert resp.status_code == 200
