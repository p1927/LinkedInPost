"""Tests for frontend/eslint.config.js module."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))


class TestEslintConfig:
    def test_config_file_exists(self):
        config_path = Path(__file__).resolve().parents[3] / 'frontend/eslint.config.js'
        assert config_path.exists()

    def test_config_contains_expected_keys(self):
        # The eslint config is a JS file — verify key strings are present
        config_path = Path(__file__).resolve().parents[3] / 'frontend/eslint.config.js'
        content = config_path.read_text()
        assert '@eslint/js' in content
        assert 'typescript-eslint' in content
        assert 'eslint-plugin-react-hooks' in content
