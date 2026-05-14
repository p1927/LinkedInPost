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
            assert isinstance(result, dict)
            assert len(result) > 0

    def test_loads_values_from_features_yaml(self, tmp_path):
        """When features.yaml exists, loads values from it (merged with defaults)."""
        features_yaml = tmp_path / "features.yaml"
        features_yaml.write_text("newsResearch: true\ndeploymentMode: enterprise\n")
        with patch('scripts.generate_features.FEATURES_FILE', features_yaml):
            from scripts.generate_features import load_feature_map
            result = load_feature_map()
            assert result["newsResearch"] is True
            assert result["deploymentMode"] == "enterprise"
            assert isinstance(result, dict)
            assert len(result) >= 2

    def test_overrides_defaults_from_features_yaml(self, tmp_path):
        """Features.yaml values override defaults."""
        features_yaml = tmp_path / "features.yaml"
        features_yaml.write_text("newsResearch: false\n")
        with patch('scripts.generate_features.FEATURES_FILE', features_yaml):
            from scripts.generate_features import load_feature_map
            result = load_feature_map()
            assert result["newsResearch"] is False
            assert isinstance(result, dict)

    def test_warns_on_wrong_type_uses_default(self, tmp_path):
        """Wrong type in features.yaml prints warning and falls back to default."""
        features_yaml = tmp_path / "features.yaml"
        features_yaml.write_text("newsResearch: 'yes'\n")  # string instead of bool
        with patch('scripts.generate_features.FEATURES_FILE', features_yaml):
            from scripts.generate_features import load_feature_map, emit_ts
            result = load_feature_map()
            # Wrong type causes default (True) to be used, not the string value
            assert result["newsResearch"] is True  # falls back to default, not 'yes'
            # emit_ts should include the feature using the default value
            ts_output = emit_ts(result)
            # Feature is emitted with default value (true) since wrong type triggered default
            assert "FEATURE_NEWS_RESEARCH = true" in ts_output

    def test_handles_100kb_string_value(self, tmp_path):
        """Very long string value (100KB) in features.yaml does not crash load_feature_map."""
        features_yaml = tmp_path / "features.yaml"
        long_string = "x" * 102400
        features_yaml.write_text(f"campaign: '{long_string}'\n")
        with patch('scripts.generate_features.FEATURES_FILE', features_yaml):
            from scripts.generate_features import load_feature_map, emit_ts
            result = load_feature_map()
            # campaign should use its default (True) since the string value is not a valid bool
            # The load succeeds without crash and logs a type warning
            assert result["campaign"] is True
            ts_output = emit_ts(result)
            assert "FEATURE_CAMPAIGN = true" in ts_output



class TestEmitTs:
    """Tests for emit_ts()."""

    def test_emits_boolean_feature_as_const(self):
        from scripts.generate_features import emit_ts
        result = emit_ts({"newsResearch": True})
        assert "FEATURE_NEWS_RESEARCH = true" in result
        assert "as const" in result
        assert "// AUTO-GENERATED" in result

    def test_emits_string_feature_as_const(self):
        from scripts.generate_features import emit_ts
        result = emit_ts({"deploymentMode": "enterprise"})
        assert "deploymentMode = 'enterprise'" in result
        assert "as const" in result
        assert "export const" in result

    def test_emits_sorted_output(self):
        from scripts.generate_features import emit_ts
        result = emit_ts({"zFeature": False, "aFeature": True})
        a_pos = result.find("FEATURE_AFEATURE")
        z_pos = result.find("FEATURE_ZFEATURE")
        assert a_pos != -1 and z_pos != -1, "both constants should be present"
        assert a_pos < z_pos, "features should be sorted by constant name"
        assert "FEATURE_AFEATURE" in result
        assert "FEATURE_ZFEATURE" in result

    def test_emits_ts_special_characters_and_unicode(self):
        """emit_ts handles special characters and Unicode without crash or encoding errors."""
        from scripts.generate_features import emit_ts
        features = {
            "deploymentMode": "café_naïve_日本語",
            "newsResearch": True,
            "campaign": False,
        }
        result = emit_ts(features)
        assert "café_naïve_日本語" in result
        assert "deploymentMode = 'café_naïve_日本語'" in result
        assert "FEATURE_NEWS_RESEARCH = true" in result
        assert "FEATURE_CAMPAIGN = false" in result
        assert "// AUTO-GENERATED" in result
        # Valid TypeScript: no invalid identifier chars in exported const names
        for line in result.splitlines():
            if line.startswith("export const FEATURE_") or line.startswith("export const deploymentMode"):
                assert "as const" in line, f"missing type annotation: {line}"


class TestEmitTsSpecialChars:
    """Tests for emit_ts() with special characters and Unicode."""

    def test_handles_unicode_deployment_mode(self):
        """deploymentMode with Unicode characters emits valid TypeScript."""
        from scripts.generate_features import emit_ts
        result = emit_ts({"deploymentMode": "日本語テスト", "newsResearch": True})
        assert "日本語テスト" in result
        assert "export const deploymentMode = '日本語テスト' as const;" in result

    def test_handles_accented_characters(self):
        """Accented characters (é, ï, ü) are preserved in output."""
        from scripts.generate_features import emit_ts
        result = emit_ts({"deploymentMode": "café_naïve", "newsResearch": True})
        assert "café_naïve" in result
        assert "export const deploymentMode = 'café_naïve' as const;" in result

    def test_handles_emoji_in_string_values(self):
        """Emoji in deploymentMode string is preserved in TypeScript output."""
        from scripts.generate_features import emit_ts
        result = emit_ts({"deploymentMode": "test🚀mode", "newsResearch": True})
        assert "test🚀mode" in result
        assert "export const deploymentMode = 'test🚀mode' as const;" in result

    def test_handles_newlines_and_tabs_in_strings(self):
        """Newlines and tabs in string values are escaped for valid TypeScript."""
        from scripts.generate_features import emit_ts
        result = emit_ts({"deploymentMode": "line1\nline2\ttab3", "newsResearch": True})
        # Newline and tab are escaped to \\n and \\t for valid TypeScript string literals
        assert "line1\\nline2" in result  # newline escaped
        assert "\\t" in result  # tab escaped
        assert "as const" in result

    def test_no_crash_on_empty_string_value(self):
        """Empty string for deploymentMode emits valid TypeScript."""
        from scripts.generate_features import emit_ts
        result = emit_ts({"deploymentMode": "", "newsResearch": True})
        assert "deploymentMode = ''" in result
        assert "as const" in result
