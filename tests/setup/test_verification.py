"""Tests for setup.verification module."""

import json
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class TestParseCurlHeaders:
    """Tests for parse_curl_headers helper."""

    def test_parses_status_line(self):
        from setup.verification import parse_curl_headers
        raw = "HTTP/1.1 200 OK\nContent-Type: application/json\n\n"
        result = parse_curl_headers(raw)
        assert result.get('status') == '200' or result.get(':status') == '200'
        assert isinstance(result, dict)
        assert len(result) > 0

    def test_parses_regular_headers(self):
        from setup.verification import parse_curl_headers
        raw = "HTTP/1.1 204 No Content\nAccess-Control-Allow-Origin: *\nContent-Type: text/plain\n\n"
        result = parse_curl_headers(raw)
        assert result.get('access-control-allow-origin') == '*'
        assert result.get('content-type') == 'text/plain'
        assert isinstance(result, dict)

    def test_ignores_non_header_lines(self):
        from setup.verification import parse_curl_headers
        raw = "HTTP/1.1 200 OK\nNotAHeader\nContent-Type: application/json\n\n"
        result = parse_curl_headers(raw)
        assert 'notaheadder' not in result
        assert 'content-type' in result

    def test_handles_multiline_headers(self):
        from setup.verification import parse_curl_headers
        raw = "HTTP/1.1 200 OK\nHost: example.com\nContent-Type: application/json\n\n"
        result = parse_curl_headers(raw)
        assert result.get('host') == 'example.com'
        assert isinstance(result, dict)
        assert len(result) > 2


class TestVerifyWorkerEndpoint:
    """Tests for verify_worker_endpoint."""

    def test_raises_on_non_json_response(self):
        from setup.verification import verify_worker_endpoint
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.headers = {'content-type': 'text/html'}
        mock_resp.text = '<html>not json</html>'
        mock_resp.json.side_effect = json.JSONDecodeError('not json', '', 0)
        with patch('setup.verification.requests.get', return_value=mock_resp):
            with pytest.raises(RuntimeError, match='not valid JSON') as exc_info:
                verify_worker_endpoint('https://example.com/worker', '*')
            assert 'not valid JSON' in str(exc_info.value)

    def test_raises_on_bad_backend_marker(self):
        from setup.verification import verify_worker_endpoint
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.headers = {'content-type': 'application/json'}
        mock_resp.json.return_value = {'data': {'backend': 'nginx'}}
        with patch('setup.verification.requests.get', return_value=mock_resp):
            with pytest.raises(RuntimeError, match='did not return the expected backend') as exc_info:
                verify_worker_endpoint('https://example.com/worker', '*')
            assert 'nginx' not in str(exc_info.value) or 'expected backend' in str(exc_info.value)

    def test_connection_error_falls_back_to_curl(self):
        import requests as req
        from setup.verification import verify_worker_endpoint
        mock_options_resp = MagicMock()
        mock_options_resp.status_code = 204
        mock_options_resp.headers = {'Access-Control-Allow-Origin': '*'}
        with patch('setup.verification.requests.get', side_effect=req.ConnectionError('connection failed')):
            with patch('setup.verification.requests.options', return_value=mock_options_resp):
                with patch('setup.verification.curl_http_request', return_value=(200, {'content-type': 'application/json'}, '{"data": {"backend": "cloudflare-worker"}}')) as mock_curl:
                    verify_worker_endpoint('https://example.com/worker', '*')
                    mock_curl.assert_called_once()

    def test_timeout_error_falls_back_to_curl(self):
        import requests as req
        from setup.verification import verify_worker_endpoint
        mock_options_resp = MagicMock()
        mock_options_resp.status_code = 204
        mock_options_resp.headers = {'Access-Control-Allow-Origin': '*'}
        with patch('setup.verification.requests.get', side_effect=req.Timeout('timed out')):
            with patch('setup.verification.requests.options', return_value=mock_options_resp):
                with patch('setup.verification.curl_http_request', return_value=(200, {'content-type': 'application/json'}, '{"data": {"backend": "cloudflare-worker"}}')) as mock_curl:
                    verify_worker_endpoint('https://example.com/worker', '*')
                    mock_curl.assert_called_once()

    def test_preflight_connection_error_uses_curl(self):
        import requests as req
        from setup.verification import verify_worker_endpoint
        mock_get_resp = MagicMock()
        mock_get_resp.status_code = 200
        mock_get_resp.headers = {'content-type': 'application/json'}
        mock_get_resp.text = '{"data": {"backend": "cloudflare-worker"}}'
        mock_get_resp.json.return_value = {'data': {'backend': 'cloudflare-worker'}}
        with patch('setup.verification.requests.get', return_value=mock_get_resp):
            with patch('setup.verification.requests.options', side_effect=req.ConnectionError('connection failed')):
                with patch('setup.verification.curl_http_request', return_value=(204, {'access-control-allow-origin': 'https://example.com'}, '')) as mock_curl:
                    verify_worker_endpoint('https://example.com/worker', 'https://example.com')
                    mock_curl.assert_called_once()

    def test_preflight_ssl_error_uses_curl(self):
        import requests as req
        from setup.verification import verify_worker_endpoint
        mock_get_resp = MagicMock()
        mock_get_resp.status_code = 200
        mock_get_resp.headers = {'content-type': 'application/json'}
        mock_get_resp.text = '{"data": {"backend": "cloudflare-worker"}}'
        mock_get_resp.json.return_value = {'data': {'backend': 'cloudflare-worker'}}
        with patch('setup.verification.requests.get', return_value=mock_get_resp):
            with patch('setup.verification.requests.options', side_effect=req.exceptions.SSLError('SSL failed')):
                with patch('setup.verification.curl_http_request', return_value=(204, {'access-control-allow-origin': 'https://example.com'}, '')) as mock_curl:
                    verify_worker_endpoint('https://example.com/worker', 'https://example.com')
                    mock_curl.assert_called_once()
