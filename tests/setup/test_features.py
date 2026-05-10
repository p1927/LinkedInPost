"""Tests for setup.features module."""

import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class TestLoadFeaturesMap:
    """Tests for load_features_map()."""

    def test_returns_defaults_when_file_missing(self, tmp_path):
        with patch('setup.features.FEATURES_YAML', tmp_path / 'features.yaml'):
            from setup.features import load_features_map
            result = load_features_map()
            assert result == {'newsResearch': True}

    def test_returns_defaults_on_yaml_error(self, tmp_path):
        bad_yaml = tmp_path / 'features.yaml'
        bad_yaml.write_text('invalid: yaml: content: [')
        with patch('setup.features.FEATURES_YAML', bad_yaml):
            from setup.features import load_features_map
            result = load_features_map()
            assert result == {'newsResearch': True}

    def test_loads_newsresearch_flag(self, tmp_path):
        yaml_file = tmp_path / 'features.yaml'
        yaml_file.write_text('newsResearch: false\n')
        with patch('setup.features.FEATURES_YAML', yaml_file):
            from setup.features import load_features_map
            result = load_features_map()
            assert result['newsResearch'] is False