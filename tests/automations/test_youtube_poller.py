"""Tests for automations.youtube_poller."""
import json
import os
import sys
import urllib.error
import unittest
from io import StringIO
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from automations import youtube_poller


class TestYtGet(unittest.TestCase):
    """Test yt_get error handling."""

    @patch("automations.youtube_poller.urllib.request.urlopen")
    def test_returns_empty_dict_on_http_error(self, mock_urlopen):
        """HTTPError from YouTube API should return {}, not crash."""
        mock_resp = MagicMock()
        mock_resp.read.return_value = b'{"error": {"message": "Bad Request"}}'
        http_err = urllib.error.HTTPError(
            "url", 400, "Bad Request", {}, mock_resp
        )
        mock_urlopen.side_effect = http_err

        stderr = StringIO()
        with patch.object(sys, "stderr", stderr):
            result = youtube_poller.yt_get("search", {"q": "test"})

        self.assertEqual(result, {})
        self.assertIn("[poller] yt_get search failed: HTTP 400", stderr.getvalue())

    @patch("automations.youtube_poller.urllib.request.urlopen")
    def test_returns_empty_dict_on_url_error(self, mock_urlopen):
        """URLError (network failure) should return {}, not crash."""
        mock_urlopen.side_effect = urllib.error.URLError("Connection refused")

        stderr = StringIO()
        with patch.object(sys, "stderr", stderr):
            result = youtube_poller.yt_get("search", {"q": "test"})

        self.assertEqual(result, {})
        self.assertIn("[poller] yt_get search failed:", stderr.getvalue())

    @patch("automations.youtube_poller.urllib.request.urlopen")
    def test_returns_parsed_json_on_success(self, mock_urlopen):
        """Valid JSON response should be returned as dict."""
        mock_resp = MagicMock()
        mock_resp.__enter__ = MagicMock(return_value=mock_resp)
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_resp.read.return_value = json.dumps({"items": []}).encode()
        mock_urlopen.return_value = mock_resp

        result = youtube_poller.yt_get("search", {"q": "test"})
        self.assertEqual(result, {"items": []})


class TestApplyTemplate(unittest.TestCase):
    """Test apply_template."""

    def test_replaces_name_placeholder(self):
        result = youtube_poller.apply_template("Hello {name}!", "Alice")
        self.assertEqual(result, "Hello Alice!")

    def test_no_placeholder_unchanged(self):
        result = youtube_poller.apply_template("Hello world!", "Bob")
        self.assertEqual(result, "Hello world!")


class TestPostReply(unittest.TestCase):
    """Test post_reply."""

    @patch("automations.youtube_poller.urllib.request.urlopen")
    def test_returns_true_on_200(self, mock_urlopen):
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.__enter__ = MagicMock(return_value=mock_resp)
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_resp

        ok = youtube_poller.post_reply("vid", "parent", "text", "token")
        self.assertTrue(ok)

    @patch("automations.youtube_poller.urllib.request.urlopen")
    def test_returns_false_on_http_error(self, mock_urlopen):
        mock_resp = MagicMock()
        mock_resp.read.return_value = b'{"error": " quota exceeded "}'
        mock_urlopen.side_effect = urllib.error.HTTPError(
            "url", 429, "Too Many Requests", {}, mock_resp
        )

        stderr = StringIO()
        with patch.object(sys, "stderr", stderr):
            ok = youtube_poller.post_reply("vid", "parent", "text", "token")

        self.assertFalse(ok)
        self.assertIn("[poller] reply failed:", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()