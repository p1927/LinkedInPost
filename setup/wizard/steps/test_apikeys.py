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


def test_validate_gemini_key_network_error_returns_false():
    """Network error (ConnectionError, Timeout, etc.) must not crash validate_gemini_key."""
    import requests as req
    from setup.wizard.steps.apikeys import validate_gemini_key
    with patch('setup.wizard.steps.apikeys.requests.post', side_effect=req.ConnectionError('no network')):
        assert validate_gemini_key('some-key') is False


def test_validate_gemini_key_timeout_error_returns_false():
    """requests.Timeout must not crash validate_gemini_key — return False instead."""
    import requests as req
    from setup.wizard.steps.apikeys import validate_gemini_key
    with patch('setup.wizard.steps.apikeys.requests.post', side_effect=req.Timeout('timed out')):
        assert validate_gemini_key('some-key') is False


def test_show_renders(client):
    """GET /step/apikeys returns 200."""
    with patch('setup.wizard.steps.apikeys.load') as mock_load, \
         patch('setup.wizard.steps.apikeys.render_template') as mock_render:
        mock_load.return_value = {'apikeys': False}
        mock_render.return_value = 'OK'
        resp = client.get('/step/apikeys')
        assert resp.status_code == 200


def test_validate_gemini_key_passes_key_in_url():
    """Regression: key must be interpolated into the API URL, not hardcoded as ***."""
    from setup.wizard.steps.apikeys import validate_gemini_key
    mock_resp = MagicMock()
    mock_resp.status_code = 200

    with patch('setup.wizard.steps.apikeys.requests.post', return_value=mock_resp) as mock_post:
        result = validate_gemini_key('my-test-api-key-12345')
        assert result is True
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        url = call_args[0][0]
        # Key must appear in URL, not as literal '***'
        assert 'key=my-test-api-key-12345' in url, f"key not in URL: {url}"
        assert 'key=***' not in url, f"hardcoded *** still in URL: {url}"
