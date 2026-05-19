"""Tests for setup/wizard/steps/google module.

Tests validate_service_account and validate_oauth_client_id business logic.
Flask routes tested by wizard integration tests.
"""

from __future__ import annotations

import json
from unittest.mock import patch

import pytest


class TestValidateServiceAccount:
    """Tests for validate_service_account()."""

    def test_returns_true_with_valid_account(self):
        """Must return (True, client_email) for a valid service account JSON."""
        from setup.wizard.steps.google import validate_service_account
        valid_sa = json.dumps({
            'type': 'service_account',
            'project_id': 'my-project',
            'private_key': '-----BEGIN RSA KEY-----\ntest\n-----END RSA KEY-----',
            'client_email': 'test@my-project.iam.gserviceaccount.com'
        })
        ok, msg = validate_service_account(valid_sa)
        assert ok is True
        assert msg == 'test@my-project.iam.gserviceaccount.com'

    def test_returns_false_on_invalid_json(self):
        """Must return (False, 'Invalid JSON') when input is not valid JSON."""
        from setup.wizard.steps.google import validate_service_account
        ok, msg = validate_service_account('{not valid json')
        assert ok is False
        assert msg == 'Invalid JSON'

    def test_returns_false_on_missing_type(self):
        """Must return False when type field is missing."""
        from setup.wizard.steps.google import validate_service_account
        invalid_sa = json.dumps({
            'project_id': 'my-project',
            'private_key': 'key',
            'client_email': 'test@my-project.iam.gserviceaccount.com'
        })
        ok, msg = validate_service_account(invalid_sa)
        assert ok is False
        assert 'Missing field' in msg

    def test_returns_false_on_missing_project_id(self):
        """Must return False when project_id field is missing."""
        from setup.wizard.steps.google import validate_service_account
        invalid_sa = json.dumps({
            'type': 'service_account',
            'private_key': 'key',
            'client_email': 'test@my-project.iam.gserviceaccount.com'
        })
        ok, msg = validate_service_account(invalid_sa)
        assert ok is False
        assert 'Missing field: project_id' in msg

    def test_returns_false_on_missing_private_key(self):
        """Must return False when private_key field is missing."""
        from setup.wizard.steps.google import validate_service_account
        invalid_sa = json.dumps({
            'type': 'service_account',
            'project_id': 'my-project',
            'client_email': 'test@my-project.iam.gserviceaccount.com'
        })
        ok, msg = validate_service_account(invalid_sa)
        assert ok is False
        assert 'Missing field: private_key' in msg

    def test_returns_false_on_missing_client_email(self):
        """Must return False when client_email field is missing."""
        from setup.wizard.steps.google import validate_service_account
        invalid_sa = json.dumps({
            'type': 'service_account',
            'project_id': 'my-project',
            'private_key': 'key'
        })
        ok, msg = validate_service_account(invalid_sa)
        assert ok is False
        assert 'Missing field: client_email' in msg

    def test_returns_false_on_wrong_type(self):
        """Must return False when type is not 'service_account'."""
        from setup.wizard.steps.google import validate_service_account
        invalid_sa = json.dumps({
            'type': 'wrong_type',
            'project_id': 'my-project',
            'private_key': 'key',
            'client_email': 'test@my-project.iam.gserviceaccount.com'
        })
        ok, msg = validate_service_account(invalid_sa)
        assert ok is False
        assert 'JSON must be a service_account key' in msg

    def test_returns_false_on_json_array(self):
        """Must return False when JSON parses to an array instead of an object."""
        from setup.wizard.steps.google import validate_service_account
        ok, msg = validate_service_account('[1, 2, 3]')
        assert ok is False
        assert 'Invalid JSON structure' in msg

    def test_returns_false_on_json_string(self):
        """Must return False when JSON parses to a string instead of an object."""
        from setup.wizard.steps.google import validate_service_account
        ok, msg = validate_service_account('"just a string"')
        assert ok is False
        assert 'Invalid JSON structure' in msg

    def test_returns_false_on_json_number(self):
        """Must return False when JSON parses to a number instead of an object."""
        from setup.wizard.steps.google import validate_service_account
        ok, msg = validate_service_account('12345')
        assert ok is False
        assert 'Invalid JSON structure' in msg

    def test_returns_false_on_json_null(self):
        """Must return False when JSON parses to null instead of an object."""
        from setup.wizard.steps.google import validate_service_account
        ok, msg = validate_service_account('null')
        assert ok is False
        assert 'Invalid JSON structure' in msg


class TestValidateOAuthClientId:
    """Tests for validate_oauth_client_id()."""

    def test_returns_true_for_valid_client_id(self):
        """Must return True for client ID ending with .apps.googleusercontent.com."""
        from setup.wizard.steps.google import validate_oauth_client_id
        result = validate_oauth_client_id('123456789-abc.apps.googleusercontent.com')
        assert result is True
        assert isinstance(result, bool)

    def test_returns_false_when_missing_dot_suffix(self):
        """Must return False when client ID does not end with required suffix."""
        from setup.wizard.steps.google import validate_oauth_client_id
        assert validate_oauth_client_id('123456789-abc.apps.googleusercontent') is False
        assert validate_oauth_client_id('abcgoogleusercontent.com') is False
        assert validate_oauth_client_id('not-ending-correct.apps.googleusercontent.com.bad') is False

    def test_returns_false_when_too_short(self):
        """Must return False when client ID is too short (< 20 chars)."""
        from setup.wizard.steps.google import validate_oauth_client_id
        # 18 chars total — below 20 threshold
        assert validate_oauth_client_id('ab.apps.googleuserconte') is False
        # 22 chars — above 20 but wrong suffix
        assert validate_oauth_client_id('123456789012.apps.goog') is False
        # valid — above 20 and correct suffix
        assert validate_oauth_client_id('123456789012.apps.googleusercontent.com') is True

    def test_returns_false_on_empty_string(self):
        """Must return False for empty string."""
        from setup.wizard.steps.google import validate_oauth_client_id
        assert validate_oauth_client_id('') is False
        assert isinstance(validate_oauth_client_id(''), bool)

    def test_returns_false_on_whitespace(self):
        """Must return False for whitespace-only string."""
        from setup.wizard.steps.google import validate_oauth_client_id
        assert validate_oauth_client_id('   ') is False
        assert isinstance(validate_oauth_client_id('   '), bool)
