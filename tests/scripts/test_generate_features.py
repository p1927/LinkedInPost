"""Tests for scripts.generate_features."""

import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class TestLoadFeatureMap:
    """Tests for load_feature_map()."""

    def test_defaults_when_features_file_missing(self, tmp_path):
        """When features.yaml doesn't exist, returns DEFAULTS."""
        with patch('scripts.generate_features.FEATURES_FILE', tmp_path / 'features.yaml'):
            from scripts.generate_features import load_feature_map, DEFAULTS
            result = load_feature_map()
            assert result == dict(DEFAULTS)

    def test_loads_values_from_features_yaml(self, tmp_path):
        """When features.yaml exists, loads values from it."""
        features_yaml = tmp_path / "features.yaml"
        features_yaml.write_text("newsResearch: true\ndeploymentMode: enterprise\n")
        with patch('scripts.generate_features.FEATURES_FILE', features_yaml):
            from scripts.generate_features import load_feature_map
            result = load_feature_map()
            assert result["newsResearch"] is True
            assert result["deploymentMode"] == "enterprise"


class TestEmitTs:
    """Tests for emit_ts()."""

    def test_emits_boolean_feature_as_const(self):
        from scripts.generate_features import emit_ts
        result = emit_ts({"newsResearch": True})
        assert "FEATURE_NEWS_RESEARCH = true" in result

    def test_emits_string_feature_as_const(self):
        from scripts.generate_features import emit_ts
        result = emit_ts({"deploymentMode": "enterprise"})
        assert "deploymentMode = 'enterprise'" in result

    def test_emits_sorted_output(self):
        from scripts.generate_features import emit_ts
        result = emit_ts({"zFeature": False, "aFeature": True})
        # FEATURE_AFEATURE sorts before FEATURE_ZFEATURE alphabetically
        a_pos = result.find("FEATURE_AFEATURE")
        z_pos = result.find("FEATURE_ZFEATURE")
        assert a_pos != -1 and z_pos != -1, "both constants should be present"
        assert a_pos < z_pos, "features should be sorted by constant name"