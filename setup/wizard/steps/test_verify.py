from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
import requests

# Ensure the package is importable
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from setup.wizard.steps.verify import check_env_key, check_worker_health, get_worker_url


class TestCheckEnvKey:
    def test_key_present_and_non_empty_returns_true(self):
        with patch.dict(os.environ, {'MY_KEY': 'some-value'}):
            result = check_env_key('MY_KEY')
            assert result is True
            assert 'MY_KEY' in os.environ

    def test_key_not_present_returns_false(self):
        with patch.dict(os.environ, {}, clear=True):
            result = check_env_key('MISSING_KEY')
            assert result is False
            assert 'MISSING_KEY' not in os.environ

    def test_key_present_but_whitespace_only_returns_false(self):
        with patch.dict(os.environ, {'WHITESPACE_KEY': '   '}):
            result = check_env_key('WHITESPACE_KEY')
            assert result is False
            assert 'WHITESPACE_KEY' in os.environ


class TestGetWorkerUrl:
    def setup_method(self):
        self.temp_dir = tempfile.mkdtemp()
        self.original_cwd = os.getcwd()
        os.chdir(self.temp_dir)

    def teardown_method(self):
        os.chdir(self.original_cwd)

    def test_wrangler_jsonc_missing_returns_none(self):
        Path('worker').mkdir()
        result = get_worker_url()
        assert result is None
        assert not (Path('worker') / 'wrangler.jsonc').exists()

    def test_wrangler_jsonc_exists_but_no_subdomain_returns_none(self, tmp_path):
        os.chdir(tmp_path)
        (tmp_path / 'worker').mkdir()
        (tmp_path / 'worker' / 'wrangler.jsonc').write_text(
            json.dumps({'name': 'my-worker'})
        )
        with patch.dict(os.environ, {}, clear=True):
            result = get_worker_url()
            assert result is None
            assert (tmp_path / 'worker' / 'wrangler.jsonc').exists()

    def test_wrangler_jsonc_with_name_and_subdomain_returns_correct_url(self, tmp_path):
        os.chdir(tmp_path)
        (tmp_path / 'worker').mkdir()
        (tmp_path / 'worker' / 'wrangler.jsonc').write_text(
            json.dumps({'name': 'my-worker'})
        )
        with patch.dict(os.environ, {'CLOUDFLARE_SUBDOMAIN': 'example.com'}):
            result = get_worker_url()
            assert result == 'https://my-worker.example.com.workers.dev'
            assert os.environ.get('CLOUDFLARE_SUBDOMAIN') == 'example.com'

    def test_invalid_json_in_wrangler_jsonc_returns_none(self, tmp_path):
        os.chdir(tmp_path)
        (tmp_path / 'worker').mkdir()
        (tmp_path / 'worker' / 'wrangler.jsonc').write_text('{ invalid json }')
        with patch.dict(os.environ, {'CLOUDFLARE_SUBDOMAIN': 'example.com'}):
            result = get_worker_url()
            assert result is None
            assert (tmp_path / 'worker' / 'wrangler.jsonc').exists()


class TestCheckWorkerHealth:
    @patch('setup.wizard.steps.verify.requests.get')
    def test_mocked_successful_response_returns_true_and_status_code(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.status_code = 200
        mock_get.return_value = mock_resp

        result = check_worker_health('https://example.com')
        assert result == (True, '200')
        mock_get.assert_called_once()

    @patch('setup.wizard.steps.verify.requests.get')
    def test_mocked_http_error_response_returns_false_and_status_code(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.ok = False
        mock_resp.status_code = 500
        mock_get.return_value = mock_resp

        result = check_worker_health('https://example.com')
        assert result == (False, '500')
        mock_get.assert_called_once()

    @patch('setup.wizard.steps.verify.requests.get')
    def test_mocked_connection_error_returns_false_with_message(self, mock_get):
        mock_get.side_effect = requests.RequestException('connection failed')

        result = check_worker_health('https://example.com')
        assert result == (False, 'connection failed')
        mock_get.assert_called_once()
