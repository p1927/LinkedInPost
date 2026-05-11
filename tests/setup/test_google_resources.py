"""Tests for setup.google_resources module."""

import json
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class TestParseServiceAccountJson:
    """Tests for parse_service_account_json()."""

    def test_parses_valid_json(self):
        with patch.dict('sys.modules', {
            'google': MagicMock(),
            'google.cloud': MagicMock(),
            'google.cloud.storage': MagicMock(),
            'google.oauth2': MagicMock(),
            'google.oauth2.service_account': MagicMock(),
            'googleapiclient': MagicMock(),
            'googleapiclient.discovery': MagicMock(),
        }):
            from setup.google_resources import parse_service_account_json
            raw = '{"client_email": "test@project.iam.gserviceaccount.com", "private_key": "key"}'
            creds_dict, normalized = parse_service_account_json(raw)
            assert creds_dict['client_email'] == 'test@project.iam.gserviceaccount.com'
            assert isinstance(creds_dict, dict)
            assert 'private_key' in creds_dict

    def test_normalizes_escaped_newlines_in_private_key(self):
        with patch.dict('sys.modules', {
            'google': MagicMock(),
            'google.cloud': MagicMock(),
            'google.cloud.storage': MagicMock(),
            'google.oauth2': MagicMock(),
            'google.oauth2.service_account': MagicMock(),
            'googleapiclient': MagicMock(),
            'googleapiclient.discovery': MagicMock(),
        }):
            from setup.google_resources import parse_service_account_json
            raw = '{"private_key": "line1\\nline2"}'
            creds_dict, normalized = parse_service_account_json(raw)
            assert '\\n' not in creds_dict['private_key']
            assert '\n' in creds_dict['private_key']
            assert len(creds_dict['private_key']) > 0

    def test_raises_on_invalid_json(self):
        with patch.dict('sys.modules', {
            'google': MagicMock(),
            'google.cloud': MagicMock(),
            'google.cloud.storage': MagicMock(),
            'google.oauth2': MagicMock(),
            'google.oauth2.service_account': MagicMock(),
            'googleapiclient': MagicMock(),
            'googleapiclient.discovery': MagicMock(),
        }):
            from setup.google_resources import parse_service_account_json
            with pytest.raises(SystemExit) as exc_info:
                parse_service_account_json('not json')
            assert exc_info.type == SystemExit


class TestGoogleResourcesDataclass:
    """Tests for GoogleResources dataclass."""

    def test_creation_with_all_fields(self):
        with patch.dict('sys.modules', {
            'google': MagicMock(),
            'google.cloud': MagicMock(),
            'google.cloud.storage': MagicMock(),
            'google.oauth2': MagicMock(),
            'google.oauth2.service_account': MagicMock(),
            'googleapiclient': MagicMock(),
            'googleapiclient.discovery': MagicMock(),
        }):
            from setup.google_resources import GoogleResources
            gr = GoogleResources(
                service_account_email='test@example.com',
                shared_email='share@example.com',
                linkedin_folder_id='folder123',
                linkedin_folder_url='https://drive.google.com/folders/f123',
                sheet_id='sheet123',
                gcs_bucket_name='bucket',
                doc_id='doc123',
                linkedin_person_urn='urn:li:person:abc',
                credentials_json='{}',
            )
            assert gr.service_account_email == 'test@example.com'
            assert gr.sheet_id == 'sheet123'
            assert isinstance(gr.linkedin_folder_id, str)
            assert len(gr.linkedin_person_urn) > 0
