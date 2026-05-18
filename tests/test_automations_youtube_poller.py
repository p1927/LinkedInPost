import pytest
import sys
import json
from unittest.mock import patch, MagicMock
from automations.youtube_poller import (
    yt_get,
    fetch_rule,
    apply_template,
    post_reply,
    record_poll,
    load_replied,
    save_replied,
)


class MockResponse:
    """Minimal context manager that behaves like urllib response."""
    def __init__(self, body_bytes):
        self._body = body_bytes

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return None

    def read(self):
        return self._body


class TestYtGet:
    def test_returns_valid_json(self):
        with patch("automations.youtube_poller.urllib.request.urlopen") as mock:
            mock.return_value = MockResponse(b'{"items": [{"id": "vid1"}]}')
            result = yt_get("search", {"key": "test", "part": "id"})
            assert result == {"items": [{"id": "vid1"}]}
            # Verify the request URL contains the encoded params
            called_url = mock.call_args[0][0]
            assert "part=id" in called_url

    def test_returns_empty_dict_on_http_error(self, capsys):
        import urllib.error
        with patch("automations.youtube_poller.urllib.request.urlopen") as mock:
            mock.side_effect = urllib.error.HTTPError(
                "url", 500, "Server Error", {}, None
            )
            result = yt_get("search", {"key": "test"})
            assert result == {}
            stderr = capsys.readouterr().err
            assert "500" in stderr

    def test_returns_empty_dict_on_url_error(self, capsys):
        import urllib.error
        with patch("automations.youtube_poller.urllib.request.urlopen") as mock:
            mock.side_effect = urllib.error.URLError("connection refused")
            result = yt_get("search", {"key": "test"})
            assert result == {}
            stderr = capsys.readouterr().err
            assert "connection refused" in stderr

    def test_returns_empty_dict_on_json_decode_error(self, capsys):
        with patch("automations.youtube_poller.urllib.request.urlopen") as mock:
            mock.return_value = MockResponse(b"not json")
            result = yt_get("search", {"key": "test"})
            assert result == {}
            stderr = capsys.readouterr().err
            assert "invalid JSON" in stderr


class TestFetchRule:
    def test_returns_rule_data(self):
        with patch("automations.youtube_poller.urllib.request.urlopen") as mock:
            mock.return_value = MockResponse(b'{"data": {"enabled": true, "triggers": ["comment"]}}')
            result = fetch_rule("http://worker", "channel123", "secret")
            assert result == {"enabled": True, "triggers": ["comment"]}
            # Verify the request URL contains channelId param
            called_url = mock.call_args[0][0]
            assert "channel123" in called_url.full_url

    def test_returns_none_on_exception(self, capsys):
        with patch("automations.youtube_poller.urllib.request.urlopen") as mock:
            mock.side_effect = Exception("connection refused")
            result = fetch_rule("http://worker", "channel123", "secret")
            assert result is None
            stderr = capsys.readouterr().err
            assert "connection refused" in stderr

    def test_returns_none_when_data_missing(self):
        with patch("automations.youtube_poller.urllib.request.urlopen") as mock:
            mock.return_value = MockResponse(b'{"other": "field"}')
            result = fetch_rule("http://worker", "channel123", "secret")
            assert result is None
            # Verify the HTTP call was actually made (not short-circuited)
            mock.assert_called_once()


class TestApplyTemplate:
    def test_replaces_name_placeholder(self):
        original = "Hello {name}!"
        result = apply_template(original, "Alice")
        assert result == "Hello Alice!"
        assert original == "Hello {name}!"  # original unchanged

    def test_handles_missing_placeholder(self):
        result = apply_template("Hello world!", "Bob")
        assert result == "Hello world!"
        assert isinstance(result, str)

    def test_replaces_multiple_occurrences(self):
        result = apply_template("Hi {name}, {name} here", "Carol")
        assert result == "Hi Carol, Carol here"
        assert result.count("Carol") == 2


class TestPostReply:
    def test_returns_true_on_success(self):
        with patch("automations.youtube_poller.urllib.request.urlopen") as mock:
            mock.return_value = MockResponse(b"")
            mock.return_value.status = 200
            result = post_reply("vid1", "parent1", "Great video!", "token123")
            assert result is True
            req = mock.call_args[0][0]
            assert "comments" in req.full_url
            assert req.get_header("Authorization") == "Bearer token123"

    def test_returns_false_on_http_error(self, capsys):
        import urllib.error
        err = urllib.error.HTTPError("url", 400, "Bad Request", {}, None)
        err.read = MagicMock(return_value=b'{"error": "bad request"}')
        with patch("automations.youtube_poller.urllib.request.urlopen") as mock:
            mock.side_effect = err
            result = post_reply("vid1", "parent1", "Great video!", "token123")
            assert result is False
            stderr = capsys.readouterr().err
            assert "reply failed" in stderr

    def test_returns_false_on_url_error(self, capsys):
        import urllib.error
        with patch("automations.youtube_poller.urllib.request.urlopen") as mock:
            mock.side_effect = urllib.error.URLError("connection refused")
            result = post_reply("vid1", "parent1", "Great video!", "token123")
            assert result is False
            stderr = capsys.readouterr().err
            assert "connection refused" in stderr


class TestRecordPoll:
    def test_calls_worker_endpoint(self):
        with patch("automations.youtube_poller.urllib.request.urlopen") as mock:
            mock.return_value = MockResponse(b"")
            record_poll("http://worker", "channel123", "secret")
            mock.assert_called_once()
            req = mock.call_args[0][0]
            assert "youtube/poll" in req.full_url
            # Verify request has JSON content-type header
            assert "application/json" in req.get_header("Content-type")

    def test_raises_on_connection_error(self, capsys):
        with patch("automations.youtube_poller.urllib.request.urlopen") as mock:
            mock.side_effect = Exception("connection refused")
            with pytest.raises(Exception) as exc_info:
                record_poll("http://worker", "channel123", "secret")
            assert "connection refused" in str(exc_info.value)
            stderr = capsys.readouterr().err
            assert "failed to record poll" in stderr


class TestLoadReplied:
    def test_returns_empty_set_for_missing_file(self, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        result = load_replied()
        assert result == set()
        assert isinstance(result, set)

    def test_returns_set_from_valid_json_file(self, tmp_path, monkeypatch):
        marker = tmp_path / ".youtube_replied_ids"
        marker.write_text('["id1", "id2"]')
        monkeypatch.chdir(tmp_path)
        result = load_replied()
        assert result == {"id1", "id2"}
        assert isinstance(result, set)

    def test_returns_empty_set_on_corrupt_json(self, tmp_path, monkeypatch, capsys):
        marker = tmp_path / ".youtube_replied_ids"
        marker.write_text("not json at all")
        monkeypatch.chdir(tmp_path)
        result = load_replied()
        assert result == set()
        stderr = capsys.readouterr().err
        assert "corrupt" in stderr


class TestSaveReplied:
    def test_writes_ids_to_file(self, tmp_path, monkeypatch):
        marker = tmp_path / ".youtube_replied_ids"
        monkeypatch.chdir(tmp_path)
        save_replied({"id1", "id2"})
        written = json.loads(marker.read_text())
        assert set(written) == {"id1", "id2"}
        assert len(written) == 2

    def test_handles_write_error(self, tmp_path, monkeypatch, capsys):
        marker = tmp_path / ".youtube_replied_ids"
        monkeypatch.chdir(tmp_path)
        with patch("builtins.open", side_effect=OSError("read-only filesystem")):
            save_replied({"id1"})
        stderr = capsys.readouterr().err
        assert "failed to save" in stderr
        # Verify marker file was NOT created (write failed silently)
        assert not marker.exists()
