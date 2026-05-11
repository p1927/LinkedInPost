"""Tests for frontend/eslint.config.js module."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))


class TestEslintConfig:
    def test_config_file_exists(self):
        config_path = Path(__file__).resolve().parents[3] / 'frontend/eslint.config.js'
        assert config_path.exists()
        assert config_path.is_file()

    def test_config_contains_expected_keys(self):
        config_path = Path(__file__).resolve().parents[3] / 'frontend/eslint.config.js'
        content = config_path.read_text()
        assert '@eslint/js' in content
        assert 'typescript-eslint' in content
        assert 'eslint-plugin-react-hooks' in content
        assert isinstance(content, str)
        assert len(content) > 100
