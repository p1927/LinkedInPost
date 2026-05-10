"""Tests for setup.constants module."""

import importlib.util
import sys
from pathlib import Path


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


class TestConstants:
    def test_root_is_absolute_path(self):
        module = load_module('setup_constants', Path('/home/openclaw/workspaces/linkedin-post/setup/constants.py'))
        assert module.ROOT.is_absolute()

    def test_worker_dir_resolved(self):
        module = load_module('setup_constants2', Path('/home/openclaw/workspaces/linkedin-post/setup/constants.py'))
        assert module.WORKER_DIR == module.ROOT / 'worker'

    def test_pipeline_tab_headers_length(self):
        module = load_module('setup_constants3', Path('/home/openclaw/workspaces/linkedin-post/setup/constants.py'))
        assert len(module.PIPELINE_TAB_HEADERS) > 10

    def test_scopes_is_list_of_urls(self):
        module = load_module('setup_constants4', Path('/home/openclaw/workspaces/linkedin-post/setup/constants.py'))
        assert isinstance(module.SCOPES, list)
        assert all('googleapis.com' in s for s in module.SCOPES)