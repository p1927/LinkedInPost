"""
Tests for scripts/generate_features.py — build-time feature flag emitter.
"""

import subprocess
import sys
import textwrap
from pathlib import Path
from unittest.mock import patch

import pytest

# Run from project root
ROOT = Path(__file__).parent.parent


class TestLoadFeatureMap:
    """Tests for load_feature_map()."""

    def test_missing_file_returns_defaults(self, tmp_path, monkeypatch):
        """features.yaml missing → return DEFAULTS unchanged."""
        monkeypatch.setattr(
            "scripts.generate_features.FEATURES_FILE",
            tmp_path / "features.yaml",
        )
        from scripts import generate_features as gf
        result = gf.load_feature_map()
        assert result["deploymentMode"] == "saas"
        assert result["newsResearch"] is True
        assert result["campaign"] is True
        assert result["multiProviderLlm"] is False

    def test_empty_file_returns_defaults(self, tmp_path, monkeypatch):
        """features.yaml is empty → return DEFAULTS."""
        (tmp_path / "features.yaml").write_text("")
        monkeypatch.setattr(
            "scripts.generate_features.FEATURES_FILE",
            tmp_path / "features.yaml",
        )
        from scripts import generate_features as gf
        result = gf.load_feature_map()
        assert result["deploymentMode"] == "saas"
        assert result["newsResearch"] is True

    def test_valid_yaml_overrides_defaults(self, tmp_path, monkeypatch):
        """features.yaml with valid values overrides DEFAULTS."""
        (tmp_path / "features.yaml").write_text(
            "deploymentMode: ent\nnewsResearch: false\ncampaign: true\n"
        )
        monkeypatch.setattr(
            "scripts.generate_features.FEATURES_FILE",
            tmp_path / "features.yaml",
        )
        from scripts import generate_features as gf
        result = gf.load_feature_map()
        assert result["deploymentMode"] == "ent"
        assert result["newsResearch"] is False
        assert result["campaign"] is True

    def test_unknown_key_is_ignored(self, tmp_path, monkeypatch):
        """A key in YAML that is not in DEFAULTS is silently ignored."""
        (tmp_path / "features.yaml").write_text(
            "deploymentMode: ent\nunknownFeature: true\n"
        )
        monkeypatch.setattr(
            "scripts.generate_features.FEATURES_FILE",
            tmp_path / "features.yaml",
        )
        from scripts import generate_features as gf
        result = gf.load_feature_map()
        assert "unknownFeature" not in result
        assert result["deploymentMode"] == "ent"

    def test_wrong_type_for_bool_uses_default(self, tmp_path, monkeypatch, capsys):
        """newsResearch: string instead of bool → warning + default True."""
        (tmp_path / "features.yaml").write_text("newsResearch: 'yes'\n")
        monkeypatch.setattr(
            "scripts.generate_features.FEATURES_FILE",
            tmp_path / "features.yaml",
        )
        from scripts import generate_features as gf
        result = gf.load_feature_map()
        assert result["newsResearch"] is True
        captured = capsys.readouterr()
        assert "newsResearch='yes'" in captured.err
        assert "not a bool" in captured.err

    def test_wrong_type_for_str_uses_default(self, tmp_path, monkeypatch, capsys):
        """deploymentMode: bool instead of string → warning + default saas."""
        (tmp_path / "features.yaml").write_text("deploymentMode: true\n")
        monkeypatch.setattr(
            "scripts.generate_features.FEATURES_FILE",
            tmp_path / "features.yaml",
        )
        from scripts import generate_features as gf
        result = gf.load_feature_map()
        assert result["deploymentMode"] == "saas"
        captured = capsys.readouterr()
        assert "deploymentMode=True" in captured.err
        assert "not a string" in captured.err


class TestEmitTs:
    """Tests for emit_ts()."""

    def test_deployment_mode_emits_type_and_const(self):
        from scripts.generate_features import emit_ts
        features = {"deploymentMode": "ent"}
        out = emit_ts(features)
        assert "export const deploymentMode = 'ent' as const;" in out
        assert "export type DeploymentMode = typeof deploymentMode;" in out

    def test_bool_feature_emits_const(self):
        from scripts.generate_features import emit_ts
        features = {"newsResearch": True, "campaign": False}
        out = emit_ts(features)
        assert "export const FEATURE_NEWS_RESEARCH = true as const;" in out
        assert "export const FEATURE_CAMPAIGN = false as const;" in out

    def test_unknown_bool_feature_uppercases_key(self):
        from scripts.generate_features import emit_ts
        features = {"someFeature": True}
        out = emit_ts(features)
        assert "export const FEATURE_SOMEFEATURE = true as const;" in out
        assert "FEATURE_SOMEFEATURE" in out

    def test_output_sorted_alphabetically(self):
        from scripts.generate_features import emit_ts
        features = {"newsResearch": True, "campaign": False, "deploymentMode": "ent"}
        out = emit_ts(features)
        campaign_pos = out.index("FEATURE_CAMPAIGN")
        newsresearch_pos = out.index("FEATURE_NEWS_RESEARCH")
        assert campaign_pos < newsresearch_pos, "bool features should be sorted"
        # Verify deploymentMode const is also present (separate sorting group)
        assert "deploymentMode = 'ent'" in out


class TestUpdateWranglerDeploymentMode:
    """Tests for update_wrangler_deployment_mode()."""

    def test_updates_wrangler_deployment_mode(self, tmp_path, monkeypatch):
        """Updates DEPLOYMENT_MODE value in wrangler.jsonc via regex."""
        wrangler = tmp_path / "worker" / "wrangler.jsonc"
        wrangler.parent.mkdir(parents=True)
        wrangler.write_text('{"name":"worker","DEPLOYMENT_MODE":"saas"}')
        monkeypatch.setattr("scripts.generate_features.ROOT", tmp_path)
        from scripts import generate_features as gf
        gf.update_wrangler_deployment_mode("ent")
        text = wrangler.read_text()
        assert "DEPLOYMENT_MODE" in text
        assert '"DEPLOYMENT_MODE": "ent"' in text

    def test_missing_wrangler_file_is_noop(self, tmp_path, monkeypatch):
        """If wrangler.jsonc does not exist, no error is raised."""
        monkeypatch.setattr("scripts.generate_features.ROOT", tmp_path)
        from scripts import generate_features as gf
        gf.update_wrangler_deployment_mode("ent")
        # Verify wrangler.jsonc was not created
        assert not (tmp_path / "worker" / "wrangler.jsonc").exists()
        # Calling again with different value is also safe
        gf.update_wrangler_deployment_mode("saas")
        assert not (tmp_path / "worker" / "wrangler.jsonc").exists()


class TestMain:
    """Integration test for main()."""

    def test_main_writes_ts_files(self, tmp_path, monkeypatch):
        """main() creates generated/features.ts in worker and frontend."""
        features_yaml = tmp_path / "features.yaml"
        features_yaml.write_text("deploymentMode: ent\nnewsResearch: false\n")
        (tmp_path / "worker" / "src" / "generated").mkdir(parents=True, exist_ok=True)
        (tmp_path / "frontend" / "src" / "generated").mkdir(parents=True, exist_ok=True)
        monkeypatch.setattr("scripts.generate_features.ROOT", tmp_path)
        monkeypatch.setattr("scripts.generate_features.FEATURES_FILE", features_yaml)

        from scripts import generate_features as gf
        gf.main()

        ts = tmp_path / "worker" / "src" / "generated" / "features.ts"
        assert ts.exists(), f"features.ts not created"
        content = ts.read_text()
        assert "deploymentMode = 'ent'" in content
        assert "FEATURE_NEWS_RESEARCH = false" in content

    def test_main_updates_wrangler_deployment_mode(self, tmp_path, monkeypatch):
        """main() updates wrangler DEPLOYMENT_MODE to match features.yaml."""
        features_yaml = tmp_path / "features.yaml"
        features_yaml.write_text("deploymentMode: ent\n")
        wrangler = tmp_path / "worker" / "wrangler.jsonc"
        wrangler.parent.mkdir(parents=True)
        wrangler.write_text('{"name":"worker","DEPLOYMENT_MODE":"saas"}')
        monkeypatch.setattr("scripts.generate_features.ROOT", tmp_path)
        monkeypatch.setattr("scripts.generate_features.FEATURES_FILE", features_yaml)

        from scripts import generate_features as gf
        gf.main()

        text = wrangler.read_text()
        assert '"DEPLOYMENT_MODE": "ent"' in text
        assert "saas" not in text  # old value should be replaced
