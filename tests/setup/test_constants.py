"""Tests for setup.constants module."""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class TestConstants:
    def test_root_is_absolute_path(self):
        from setup.constants import ROOT
        assert ROOT.is_absolute()

    def test_worker_dir_resolved(self):
        from setup.constants import WORKER_DIR, ROOT
        assert WORKER_DIR == ROOT / 'worker'

    def test_pipeline_tab_headers_length(self):
        from setup.constants import PIPELINE_TAB_HEADERS
        assert len(PIPELINE_TAB_HEADERS) > 10

    def test_scopes_is_list_of_urls(self):
        from setup.constants import SCOPES
        assert isinstance(SCOPES, list)
        assert all('googleapis.com' in s for s in SCOPES)