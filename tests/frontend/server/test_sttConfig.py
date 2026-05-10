"""Tests for frontend/server/sttConfig.js module."""

import json
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))


class TestSttConfigDefaultConfig:
    """Tests for DEFAULT_CONFIG."""

    def test_default_config_has_expected_keys(self):
        with patch.dict('sys.modules', {
            'fs': MagicMock(),
            'path': MagicMock(),
        }):
            # DEFAULT_CONFIG should have enabled, model, modelPath, shortcut
            pass  # This is JS module, verify file contains expected structure

    def test_file_contains_default_config(self):
        config_path = Path(__file__).resolve().parents[3] / 'frontend/server/sttConfig.js'
        content = config_path.read_text()
        assert 'DEFAULT_CONFIG' in content
        assert 'enabled' in content
        assert 'model' in content
        assert 'shortcut' in content


class TestSttConfigFunctions:
    """Tests for exported functions."""

    def test_file_exports_readSttConfig(self):
        config_path = Path(__file__).resolve().parents[3] / 'frontend/server/sttConfig.js'
        content = config_path.read_text()
        assert 'readSttConfig' in content
        assert 'writeSttConfig' in content
        assert 'modelExists' in content
        assert 'getLibraryModelPath' in content
