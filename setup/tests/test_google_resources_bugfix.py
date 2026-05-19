"""Regression tests for google_resources.py bug fixes.

Tests:
1. fetch_linkedin_person_urn handles requests.RequestException gracefully
2. create_google_resources folder sharing catches only specific exceptions, not KeyboardInterrupt
3. create_google_resources sheet tabs setup catches only specific exceptions, not KeyboardInterrupt
"""
from __future__ import annotations

import os
import sys
from unittest.mock import MagicMock, patch

import pytest
import requests


# Add setup module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


class TestFetchLinkedinPersonUrnNetworkError:
    """Bug 1: fetch_linkedin_person_urn should handle network errors gracefully."""

    def test_requests_get_timeout_is_handled(self):
        """requests.get() timeout should be caught and return empty string."""
        from setup.google_resources import fetch_linkedin_person_urn

        with patch.dict(os.environ, {
            'LINKEDIN_ACCESS_TOKEN': 'test_token',
            'LINKEDIN_PERSON_URN': '',
        }):
            with patch('setup.google_resources.requests.get') as mock_get:
                mock_get.side_effect = requests.Timeout('Connection timed out')

                result = fetch_linkedin_person_urn()

                assert result == ''
                mock_get.assert_called_once()

    def test_requests_get_connection_error_is_handled(self):
        """requests.get() ConnectionError should be caught and return empty string."""
        from setup.google_resources import fetch_linkedin_person_urn

        with patch.dict(os.environ, {
            'LINKEDIN_ACCESS_TOKEN': 'test_token',
            'LINKEDIN_PERSON_URN': '',
        }):
            with patch('setup.google_resources.requests.get') as mock_get:
                mock_get.side_effect = requests.ConnectionError('Connection refused')

                result = fetch_linkedin_person_urn()

                assert result == ''
                mock_get.assert_called_once()

    def test_requests_get_generic_request_exception_is_handled(self):
        """requests.RequestException (base class) should be caught."""
        from setup.google_resources import fetch_linkedin_person_urn

        with patch.dict(os.environ, {
            'LINKEDIN_ACCESS_TOKEN': 'test_token',
            'LINKEDIN_PERSON_URN': '',
        }):
            with patch('setup.google_resources.requests.get') as mock_get:
                mock_get.side_effect = requests.RequestException('Some network error')

                result = fetch_linkedin_person_urn()

                assert result == ''
                mock_get.assert_called_once()

    def test_requests_get_http_error_is_handled(self):
        """requests.HTTPError should be caught."""
        from setup.google_resources import fetch_linkedin_person_urn

        with patch.dict(os.environ, {
            'LINKEDIN_ACCESS_TOKEN': 'test_token',
            'LINKEDIN_PERSON_URN': '',
        }):
            with patch('setup.google_resources.requests.get') as mock_get:
                mock_get.side_effect = requests.HTTPError('HTTP Error')

                result = fetch_linkedin_person_urn()

                assert result == ''
                mock_get.assert_called_once()


class TestFolderSharingExceptionHandling:
    """Bug 2: Folder sharing should NOT catch KeyboardInterrupt or SystemExit."""

    def _create_mock_build(self, mock_drive, mock_sheets):
        """Create a mock build function that returns drive or sheets based on call."""
        def mock_build(service, version, **kwargs):
            if service == 'sheets':
                return mock_sheets
            elif service == 'drive':
                return mock_drive
            return MagicMock()
        return mock_build

    def test_keyboard_interrupt_propagates_in_folder_sharing(self):
        """KeyboardInterrupt raised in folder sharing should NOT be caught."""
        from setup.google_resources import create_google_resources

        with patch.dict(os.environ, {
            'GOOGLE_CREDENTIALS_JSON': '{"client_email": "test@example.com", "project_id": "test-project", "private_key": "fake-key", "token_uri": "https://oauth2.googleapis.com/token"}',
            'GOOGLE_CLOUD_STORAGE_BUCKET': 'test-bucket',
            'GOOGLE_SHARE_EMAIL': 'share@example.com',
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
                            mock_build = self._create_mock_build(mock_drive, mock_sheets)

                            with patch('setup.google_resources.build', mock_build):
                                mock_drive.files().list().execute.return_value = {
                                    'files': [{'id': 'folder123', 'webViewLink': 'https://drive.google.com/folders/folder123'}]
                                }

                                mock_drive.permissions().create().execute.side_effect = KeyboardInterrupt()

                                with pytest.raises(KeyboardInterrupt):
                                    create_google_resources('share@example.com')
                                mock_drive.permissions().create().execute.assert_called_once()

    def test_system_exit_propagates_in_folder_sharing(self):
        """SystemExit raised in folder sharing should NOT be caught."""
        from setup.google_resources import create_google_resources

        with patch.dict(os.environ, {
            'GOOGLE_CREDENTIALS_JSON': '{"client_email": "test@example.com", "project_id": "test-project", "private_key": "fake-key", "token_uri": "https://oauth2.googleapis.com/token"}',
            'GOOGLE_CLOUD_STORAGE_BUCKET': 'test-bucket',
            'GOOGLE_SHARE_EMAIL': 'share@example.com',
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
                            mock_build = self._create_mock_build(mock_drive, mock_sheets)

                            with patch('setup.google_resources.build', mock_build):
                                mock_drive.files().list().execute.return_value = {
                                    'files': [{'id': 'folder123', 'webViewLink': 'https://drive.google.com/folders/folder123'}]
                                }

                                mock_drive.permissions().create().execute.side_effect = SystemExit(1)

                                with pytest.raises(SystemExit):
                                    create_google_resources('share@example.com')
                                mock_drive.permissions().create().execute.assert_called_once()

    def test_googleapiclient_http_error_is_caught_in_folder_sharing(self):
        """googleapiclient.errors.HttpError in folder sharing should be caught (warn)."""
        from setup.google_resources import create_google_resources
        from googleapiclient import errors as googleapiclient_errors

        with patch.dict(os.environ, {
            'GOOGLE_CREDENTIALS_JSON': '{"client_email": "test@example.com", "project_id": "test-project", "private_key": "fake-key", "token_uri": "https://oauth2.googleapis.com/token"}',
            'GOOGLE_CLOUD_STORAGE_BUCKET': 'test-bucket',
            'GOOGLE_SHARE_EMAIL': 'share@example.com',
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
                            mock_build = self._create_mock_build(mock_drive, mock_sheets)

                            with patch('setup.google_resources.build', mock_build):
                                mock_drive.files().list().execute.return_value = {
                                    'files': [{'id': 'folder123', 'webViewLink': 'https://drive.google.com/folders/folder123'}]
                                }

                                mock_drive.permissions().create().execute.side_effect = googleapiclient_errors.HttpError(
                                    resp=MagicMock(status=403),
                                    content=b'Permission denied'
                                )

                                result = create_google_resources('share@example.com')
                                assert result is not None
                                mock_drive.permissions().create().execute.assert_called_once()

    def test_requests_exception_is_caught_in_folder_sharing(self):
        """requests.RequestException in folder sharing should be caught (warn)."""
        from setup.google_resources import create_google_resources

        with patch.dict(os.environ, {
            'GOOGLE_CREDENTIALS_JSON': '{"client_email": "test@example.com", "project_id": "test-project", "private_key": "fake-key", "token_uri": "https://oauth2.googleapis.com/token"}',
            'GOOGLE_CLOUD_STORAGE_BUCKET': 'test-bucket',
            'GOOGLE_SHARE_EMAIL': 'share@example.com',
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
                            mock_build = self._create_mock_build(mock_drive, mock_sheets)

                            with patch('setup.google_resources.build', mock_build):
                                mock_drive.files().list().execute.return_value = {
                                    'files': [{'id': 'folder123', 'webViewLink': 'https://drive.google.com/folders/folder123'}]
                                }

                                mock_drive.permissions().create().execute.side_effect = requests.ConnectionError('Network error')

                                result = create_google_resources('share@example.com')
                                assert result is not None
                                mock_drive.permissions().create().execute.assert_called_once()


class TestSheetTabsExceptionHandling:
    """Bug 3: Sheet tabs setup should NOT catch KeyboardInterrupt or SystemExit."""

    def _create_mock_build(self, mock_drive, mock_sheets):
        """Create a mock build function that returns drive or sheets based on call."""
        def mock_build(service, version, **kwargs):
            if service == 'sheets':
                return mock_sheets
            elif service == 'drive':
                return mock_drive
            return MagicMock()
        return mock_build

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
                            mock_build = self._create_mock_build(mock_drive, mock_sheets)

                            with patch('setup.google_resources.build', mock_build):
                                mock_drive.files().list().execute.return_value = {
                                    'files': [{'id': 'folder123', 'webViewLink': 'https://drive.google.com/folders/folder123'}]
                                }

                                mock_sheets.spreadsheets().get().execute.side_effect = KeyboardInterrupt()

                                with pytest.raises(KeyboardInterrupt):
                                    create_google_resources('')
                                mock_sheets.spreadsheets().get().execute.assert_called_once()

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
                            mock_build = self._create_mock_build(mock_drive, mock_sheets)

                            with patch('setup.google_resources.build', mock_build):
                                mock_drive.files().list().execute.return_value = {
                                    'files': [{'id': 'folder123', 'webViewLink': 'https://drive.google.com/folders/folder123'}]
                                }

                                mock_sheets.spreadsheets().get().execute.side_effect = SystemExit(1)

                                with pytest.raises(SystemExit):
                                    create_google_resources('')
                                mock_sheets.spreadsheets().get().execute.assert_called_once()

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
                            mock_build = self._create_mock_build(mock_drive, mock_sheets)

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
                                mock_sheets.spreadsheets().get().execute.assert_called_once()

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
                            mock_build = self._create_mock_build(mock_drive, mock_sheets)

                            with patch('setup.google_resources.build', mock_build):
                                mock_drive.files().list().execute.return_value = {
                                    'files': [{'id': 'folder123', 'webViewLink': 'https://drive.google.com/folders/folder123'}]
                                }

                                mock_sheets.spreadsheets().get().execute.side_effect = requests.Timeout('Sheet API timeout')

                                result = create_google_resources('')
                                assert result is not None
                                mock_sheets.spreadsheets().get().execute.assert_called_once()
