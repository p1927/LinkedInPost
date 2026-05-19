"""Regression tests for Bug 1: fetch_linkedin_person_urn network error handling."""
from __future__ import annotations

import os
import sys
from unittest.mock import patch

import pytest
import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))


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
