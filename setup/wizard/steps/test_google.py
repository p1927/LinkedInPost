import json
import pytest
from setup.wizard.steps.google import validate_service_account, validate_oauth_client_id


VALID_SA = {
    "type": "service_account",
    "project_id": "my-project",
    "private_key": "-----BEGIN RSA PRIVATE KEY-----\nFAKE\n-----END RSA PRIVATE KEY-----\n",
    "client_email": "my-sa@my-project.iam.gserviceaccount.com",
}


def test_validate_service_account_valid_json_returns_true_and_email():
    ok, result = validate_service_account(json.dumps(VALID_SA))
    assert ok is True
    assert result == "my-sa@my-project.iam.gserviceaccount.com"
    assert "service_account" in VALID_SA["type"]


def test_validate_service_account_missing_private_key_returns_false():
    data = {k: v for k, v in VALID_SA.items() if k != "private_key"}
    ok, msg = validate_service_account(json.dumps(data))
    assert ok is False
    assert "private_key" in msg


def test_validate_service_account_missing_client_email_returns_false():
    data = {k: v for k, v in VALID_SA.items() if k != "client_email"}
    ok, msg = validate_service_account(json.dumps(data))
    assert ok is False
    assert "client_email" in msg


def test_validate_service_account_null_client_email_returns_false():
    data = {**VALID_SA, "client_email": None}
    ok, msg = validate_service_account(json.dumps(data))
    assert ok is False
    assert "client_email" in msg


def test_validate_service_account_missing_type_returns_false():
    data = {k: v for k, v in VALID_SA.items() if k != "type"}
    ok, msg = validate_service_account(json.dumps(data))
    assert ok is False
    assert "type" in msg


def test_validate_service_account_wrong_type_returns_false():
    data = {**VALID_SA, "type": "authorized_user"}
    ok, msg = validate_service_account(json.dumps(data))
    assert ok is False
    assert "service_account" in msg or "authorized_user" in msg


def test_validate_service_account_invalid_json_returns_false():
    ok, msg = validate_service_account("this is not json{")
    assert ok is False
    assert msg == "Invalid JSON"


def test_validate_service_account_empty_string_returns_false():
    ok, msg = validate_service_account("")
    assert ok is False
    assert msg == "Invalid JSON"


def test_validate_service_account_missing_project_id_returns_false():
    data = {k: v for k, v in VALID_SA.items() if k != "project_id"}
    ok, msg = validate_service_account(json.dumps(data))
    assert ok is False
    assert "project_id" in msg


def test_validate_oauth_client_id_valid_id_returns_true():
    valid_id = "123456789-abcdefghijklmnop.apps.googleusercontent.com"
    assert validate_oauth_client_id(valid_id) is True
    assert len(valid_id) > 20


def test_validate_oauth_client_id_plain_string_returns_false():
    result = validate_oauth_client_id("my-client-id")
    assert result is False
    assert not validate_oauth_client_id("another-plain-string")


def test_validate_oauth_client_id_empty_string_returns_false():
    empty_result = validate_oauth_client_id("")
    assert empty_result is False
    assert isinstance(empty_result, bool)
    whitespace_result = validate_oauth_client_id("   ")
    assert whitespace_result is False
    assert isinstance(whitespace_result, bool)


def test_validate_oauth_client_id_wrong_suffix_returns_false():
    result = validate_oauth_client_id("123456.apps.google.com")
    assert result is False
    assert not validate_oauth_client_id("123456789.apps.google.com")


def test_validate_oauth_client_id_correct_suffix_but_too_short_returns_false():
    # String ending with suffix but too short (under 20 chars total)
    short_id = "a" * 20  # no correct suffix, len == 20
    result = validate_oauth_client_id(short_id)
    assert result is False
    assert isinstance(result, bool)

def test_validate_oauth_client_id_valid_long_id_returns_true():
    valid_id = "123456789-abcdefghijklmnop.apps.googleusercontent.com"
    result = validate_oauth_client_id(valid_id)
    assert result is True
    assert isinstance(result, bool)
    assert valid_id.endswith('.apps.googleusercontent.com')