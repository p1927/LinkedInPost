"""Regression tests for features.py bug fixes."""

from __future__ import annotations

import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest
import yaml


class TestLoadFeaturesMapBareExcept:
    """Test that bare except no longer swallows KeyboardInterrupt/SystemExit."""

    def test_keyboard_interrupt_propagates(self, tmp_path: Path) -> None:
        """KeyboardInterrupt must NOT be caught by the yaml error handler."""
        # Point FEATURES_YAML to a temp file
        features_yaml = tmp_path / "features.yaml"
        features_yaml.write_text("newsResearch: true\n")

        with patch("setup.constants.FEATURES_YAML", features_yaml):
            # Simulate yaml.safe_load raising KeyboardInterrupt
            with patch("yaml.safe_load", side_effect=KeyboardInterrupt) as mock_load:
                with pytest.raises(KeyboardInterrupt):
                    from setup.features import load_features_map
                    # Reload to pick up patched FEATURES_YAML
                    import importlib
                    import setup.features
                    importlib.reload(setup.features)
                    setup.features.load_features_map()
                mock_load.assert_called_once()

    def test_system_exit_propagates(self, tmp_path: Path) -> None:
        """SystemExit must NOT be caught by the yaml error handler."""
        features_yaml = tmp_path / "features.yaml"
        features_yaml.write_text("newsResearch: true\n")

        with patch("setup.constants.FEATURES_YAML", features_yaml):
            with patch("yaml.safe_load", side_effect=SystemExit) as mock_load:
                with pytest.raises(SystemExit):
                    import importlib
                    import setup.features
                    importlib.reload(setup.features)
                    setup.features.load_features_map()
                mock_load.assert_called_once()

    def test_yaml_error_returns_defaults(self, tmp_path: Path) -> None:
        """YAMLError (e.g., corrupted YAML) must return defaults gracefully."""
        features_yaml = tmp_path / "features.yaml"
        features_yaml.write_text("invalid: [yaml: content\n")

        with patch("setup.constants.FEATURES_YAML", features_yaml):
            with patch("yaml.safe_load") as mock_load:
                mock_load.return_value = {"newsResearch": True}
                import importlib
                import setup.features
                importlib.reload(setup.features)
                result = setup.features.load_features_map()
                assert result == {"newsResearch": True}
                mock_load.assert_called_once()

    def test_corrupted_yaml_returns_defaults(self, tmp_path: Path) -> None:
        """Truly corrupted YAML (not just bad data) returns default values."""
        features_yaml = tmp_path / "features.yaml"
        # Invalid YAML syntax
        features_yaml.write_text("  indent mismatch:\n   bad: [unclosed\n")

        with patch("setup.constants.FEATURES_YAML", features_yaml):
            with patch("yaml.safe_load") as mock_load:
                mock_load.return_value = {"newsResearch": True}
                import importlib
                import setup.features
                importlib.reload(setup.features)
                result = setup.features.load_features_map()
                assert result == {"newsResearch": True}
                mock_load.assert_called_once()
