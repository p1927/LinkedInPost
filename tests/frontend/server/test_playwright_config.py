"""Tests for frontend/playwright.config.ts module."""

import sys
from pathlib import Path

sys.path.insert(0, '/home/openclaw/workspaces/linkedin-post')


class TestPlaywrightConfig:
    def test_config_file_exists(self):
        config_path = Path('/home/openclaw/workspaces/linkedin-post/frontend/playwright.config.ts')
        assert config_path.exists()

    def test_config_contains_expected_fields(self):
        config_path = Path('/home/openclaw/workspaces/linkedin-post/frontend/playwright.config.ts')
        content = config_path.read_text()
        assert 'defineConfig' in content
        assert 'testDir' in content
        assert 'chromium' in content
