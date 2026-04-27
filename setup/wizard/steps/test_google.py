import json
import pytest
from setup.wizard.steps.google import validate_service_account, validate_oauth_client_id


# ---------------------------------------------------------------------------
# validate_service_account
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# validate_oauth_client_id
# ---------------------------------------------------------------------------

def test_validate_oauth_client_id_valid_id_returns_true():
    valid_id = "123456789-abcdefghijklmnop.apps.googleusercontent.com"
    assert validate_oauth_client_id(valid_id) is True


def test_validate_oauth_client_id_plain_string_returns_false():
    assert validate_oauth_client_id("my-client-id") is False


def test_validate_oauth_client_id_empty_string_returns_false():
    assert validate_oauth_client_id("") is False


def test_validate_oauth_client_id_wrong_suffix_returns_false():
    assert validate_oauth_client_id("123456.apps.google.com") is False


def test_validate_oauth_client_id_correct_suffix_but_too_short_returns_false():
    # Build a string that ends with the required suffix but whose total length
    # is exactly 20 characters (the guard is len > 20, so 20 must return False).
    # suffix = ".apps.googleusercontent.com" is 27 chars alone, so it is
    # impossible to construct a string ending with it that is <= 20 chars.
    # The length guard therefore only fires for strings shorter than the suffix.
    # We document this by confirming a 20-char string without the suffix fails.
    short_id = "a" * 20  # no correct suffix, len == 20
    assert validate_oauth_client_id(short_id) is False
