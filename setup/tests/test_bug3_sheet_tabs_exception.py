"""Regression tests for Bug 3: sheet tabs exception handling."""
from __future__ import annotations

import os
import sys
from unittest.mock import MagicMock, patch

import pytest
import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))


def _create_mock_build(mock_drive, mock_sheets):
    """Create a mock build function that returns drive or sheets based on call."""
    def mock_build(service, version, **kwargs):
        if service == 'sheets':
            return mock_sheets
        elif service == 'drive':
            return mock_drive
        return MagicMock()
    return mock_build


class TestSheetTabsExceptionHandling:
    """Bug 3: Sheet tabs setup should NOT catch KeyboardInterrupt or SystemExit."""

    def test_keyboard_interrupt_propagates_in_sheet_tabs(self):
        """KeyboardInterrupt raised in sheet tabs should NOT be caught."""
        from setup.google_resources import create_google_resources

        with patch.dict(os.environ, {
            'GOOGLE_CREDENTIALS_JSON': '{"client_email": "test@example.com", "project_id": "test-project", "private_key": "fake-key", "token_uri": "https://oauth2.googleapis.com/token"}',
            'GOOGLE_CLOUD_STORAGE_BUCKET': 'test-bucket',
            'GOOGLE_SHARE_EMAIL': '',
        }):
            with patch('setup.google_resources.parse_service_account_json') as mock_parse:
                mock_parse.return_value = (
                    {'client_email': 'test@example.com', 'project_id': 'test-project', 'private_key': 'fake-key', 'token_uri': 'https://oauth2.googleapis.com/token'},
                    '{"client_email": "test@example.com", "project_id": "test-project", "private_key": "fake-key", "token_uri": "https://oauth2.googleapis.com/token"}'
                )
                with patch('setup.google_resources._validate_project_id'):
                    with patch('setup.google_resources.storage.Client'):
                        with patch('setup.google_resources.Credentials.from_service_account_info') as mock_creds:
                            mock_creds.return_value = MagicMock()
                            mock_drive = MagicMock()
                            mock_sheets = MagicMock()
                            mock_build = _create_mock_build(mock_drive, mock_sheets)

                            with patch('setup.google_resources.build', mock_build):
                                mock_drive.files().list().execute.return_value = {
                                    'files': [{'id': 'folder123', 'webViewLink': 'https://drive.google.com/folders/folder123'}]
                                }

                                mock_sheets.spreadsheets().get().execute.side_effect = KeyboardInterrupt()

                                with pytest.raises(KeyboardInterrupt):
                                    create_google_resources('')

    def test_system_exit_propagates_in_sheet_tabs(self):
        """SystemExit raised in sheet tabs should NOT be caught."""
        from setup.google_resources import create_google_resources

        with patch.dict(os.environ, {
            'GOOGLE_CREDENTIALS_JSON': '{"client_email": "test@example.com", "project_id": "test-project", "private_key": "fake-key", "token_uri": "https://oauth2.googleapis.com/token"}',
            'GOOGLE_CLOUD_STORAGE_BUCKET': 'test-bucket',
            'GOOGLE_SHARE_EMAIL': '',
        }):
            with patch('setup.google_resources.parse_service_account_json') as mock_parse:
                mock_parse.return_value = (
                    {'client_email': 'test@example.com', 'project_id': 'test-project', 'private_key': 'fake-key', 'token_uri': 'https://oauth2.googleapis.com/token'},
                    '{"client_email": "test@example.com", "project_id": "test-project", "private_key": "fake-key", "token_uri": "https://oauth2.googleapis.com/token"}'
                )
                with patch('setup.google_resources._validate_project_id'):
                    with patch('setup.google_resources.storage.Client'):
                        with patch('setup.google_resources.Credentials.from_service_account_info') as mock_creds:
                            mock_creds.return_value = MagicMock()
                            mock_drive = MagicMock()
                            mock_sheets = MagicMock()
                            mock_build = _create_mock_build(mock_drive, mock_sheets)

                            with patch('setup.google_resources.build', mock_build):
                                mock_drive.files().list().execute.return_value = {
                                    'files': [{'id': 'folder123', 'webViewLink': 'https://drive.google.com/folders/folder123'}]
                                }

                                mock_sheets.spreadsheets().get().execute.side_effect = SystemExit(1)

                                with pytest.raises(SystemExit):
                                    create_google_resources('')

    def test_googleapiclient_http_error_is_caught_in_sheet_tabs(self):
        """googleapiclient.errors.HttpError in sheet tabs should be caught (warn)."""
        from setup.google_resources import create_google_resources
        from googleapiclient import errors as googleapiclient_errors

        with patch.dict(os.environ, {
            'GOOGLE_CREDENTIALS_JSON': '{"client_email": "test@example.com", "project_id": "test-project", "private_key": "fake-key", "token_uri": "https://oauth2.googleapis.com/token"}',
            'GOOGLE_CLOUD_STORAGE_BUCKET': 'test-bucket',
            'GOOGLE_SHARE_EMAIL': '',
        }):
            with patch('setup.google_resources.parse_service_account_json') as mock_parse:
                mock_parse.return_value = (
                    {'client_email': 'test@example.com', 'project_id': 'test-project', 'private_key': 'fake-key', 'token_uri': 'https://oauth2.googleapis.com/token'},
                    '{"client_email": "test@example.com", "project_id": "test-project", "private_key": "fake-key", "token_uri": "https://oauth2.googleapis.com/token"}'
                )
                with patch('setup.google_resources._validate_project_id'):
                    with patch('setup.google_resources.storage.Client'):
                        with patch('setup.google_resources.Credentials.from_service_account_info') as mock_creds:
                            mock_creds.return_value = MagicMock()
                            mock_drive = MagicMock()
                            mock_sheets = MagicMock()
                            mock_build = _create_mock_build(mock_drive, mock_sheets)

                            with patch('setup.google_resources.build', mock_build):
                                mock_drive.files().list().execute.return_value = {
                                    'files': [{'id': 'folder123', 'webViewLink': 'https://drive.google.com/folders/folder123'}]
                                }

                                mock_sheets.spreadsheets().get().execute.side_effect = googleapiclient_errors.HttpError(
                                    resp=MagicMock(status=500, reason='Internal Error'),
                                    content=b'Internal error'
                                )

                                result = create_google_resources('')
                                assert result is not None

    def test_requests_exception_is_caught_in_sheet_tabs(self):
        """requests.RequestException in sheet tabs should be caught (warn)."""
        from setup.google_resources import create_google_resources

        with patch.dict(os.environ, {
            'GOOGLE_CREDENTIALS_JSON': '{"client_email": "test@example.com", "project_id": "test-project", "private_key": "fake-key", "token_uri": "https://oauth2.googleapis.com/token"}',
            'GOOGLE_CLOUD_STORAGE_BUCKET': 'test-bucket',
            'GOOGLE_SHARE_EMAIL': '',
        }):
            with patch('setup.google_resources.parse_service_account_json') as mock_parse:
                mock_parse.return_value = (
                    {'client_email': 'test@example.com', 'project_id': 'test-project', 'private_key': 'fake-key', 'token_uri': 'https://oauth2.googleapis.com/token'},
                    '{"client_email": "test@example.com", "project_id": "test-project", "private_key": "fake-key", "token_uri": "https://oauth2.googleapis.com/token"}'
                )
                with patch('setup.google_resources._validate_project_id'):
                    with patch('setup.google_resources.storage.Client'):
                        with patch('setup.google_resources.Credentials.from_service_account_info') as mock_creds:
                            mock_creds.return_value = MagicMock()
                            mock_drive = MagicMock()
                            mock_sheets = MagicMock()
                            mock_build = _create_mock_build(mock_drive, mock_sheets)

                            with patch('setup.google_resources.build', mock_build):
                                mock_drive.files().list().execute.return_value = {
                                    'files': [{'id': 'folder123', 'webViewLink': 'https://drive.google.com/folders/folder123'}]
                                }

                                mock_sheets.spreadsheets().get().execute.side_effect = requests.Timeout('Sheet API timeout')

                                result = create_google_resources('')
                                assert result is not None
