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
            assert isinstance(result, dict)
            assert 'newsResearch' in result

    def test_returns_defaults_on_yaml_error(self, tmp_path):
        bad_yaml = tmp_path / 'features.yaml'
        bad_yaml.write_text('invalid: yaml: content: [')
        with patch('setup.features.FEATURES_YAML', bad_yaml):
            from setup.features import load_features_map
            result = load_features_map()
            assert result == {'newsResearch': True}
            assert isinstance(result, dict)
            assert 'newsResearch' in result

    def test_loads_newsresearch_flag(self, tmp_path):
        yaml_file = tmp_path / 'features.yaml'
        yaml_file.write_text('newsResearch: false\n')
        with patch('setup.features.FEATURES_YAML', yaml_file):
            from setup.features import load_features_map
            result = load_features_map()
            assert result['newsResearch'] is False
            assert isinstance(result, dict)
            assert len(result) == 1


class TestRunGenerateFeaturesScriptTimeout:
    """Regression: run_generate_features_script must handle subprocess timeout."""

    def test_does_not_raise_on_timeout(self, tmp_path):
        """TimeoutExpired is caught; subprocess.run is called with a timeout kwarg."""
        import subprocess
        from unittest.mock import MagicMock
        from setup.features import run_generate_features_script

        script = tmp_path / 'scripts' / 'generate_features.py'
        script.parent.mkdir()
        script.write_text('pass')

        mock_run = MagicMock(side_effect=subprocess.TimeoutExpired('cmd', 30))
        with patch('setup.features.ROOT', tmp_path):
            with patch('subprocess.run', mock_run):
                run_generate_features_script()  # Must not raise

        # Verify timeout= was passed to subprocess.run
        assert mock_run.called
        _, kwargs = mock_run.call_args
        assert 'timeout' in kwargs and kwargs['timeout'] > 0

    def test_timeout_emits_warning_with_timeout_in_message(self, tmp_path):
        """TimeoutExpired warns with 'timed out' in the message."""
        import subprocess
        from setup.features import run_generate_features_script

        script = tmp_path / 'scripts' / 'generate_features.py'
        script.parent.mkdir()
        script.write_text('pass')

        with patch('setup.features.ROOT', tmp_path):
            with patch('subprocess.run', side_effect=subprocess.TimeoutExpired('cmd', 30)):
                with patch('setup.features.warn') as mock_warn:
                    run_generate_features_script()

        assert mock_warn.called
        call_module, call_msg = mock_warn.call_args[0]
        assert 'timed out' in call_msg
        assert 'generate_features.py' in call_module


class TestLoadFeaturesMapDuplicateKeys:
    """Regression: duplicate keys in features.yaml must be reported."""

    def test_duplicate_key_reports_warning(self, tmp_path):
        """When features.yaml has duplicate keys, warn() is called for each dup."""
        from setup.features import load_features_map
        from unittest.mock import MagicMock

        yaml_file = tmp_path / 'features.yaml'
        yaml_file.write_text('newsResearch: true\ncampaign: true\nnewsResearch: false\n')

        with patch('setup.features.FEATURES_YAML', yaml_file):
            with patch('setup.features.warn') as mock_warn:
                result = load_features_map()
                # Should have warned about duplicate newsResearch
                assert mock_warn.called
                _, msg = mock_warn.call_args[0]
                assert 'newsResearch' in msg
                assert 'duplicate' in msg.lower()
                # Last value wins (false)
                assert result['newsResearch'] is False

    def test_conflicting_snake_case_variant_logs_warning(self, tmp_path):
        """snake_case news_research key should emit a warning and use its bool value."""
        from setup.features import load_features_map

        yaml_file = tmp_path / 'features.yaml'
        yaml_file.write_text('newsResearch: false\nnews_research: true\n')

        with patch('setup.features.FEATURES_YAML', yaml_file):
            with patch('setup.features.warn') as mock_warn:
                result = load_features_map()
            assert result['newsResearch'] is True
            assert mock_warn.called
            _, msg = mock_warn.call_args[0]
            assert 'news_research' in msg
            assert 'camelCase' in msg

    def test_snake_case_only_is_used_without_warning_for_valid_key(self, tmp_path):
        """If only snake_case key exists (no camelCase), apply it silently."""
        from setup.features import load_features_map

        yaml_file = tmp_path / 'features.yaml'
        yaml_file.write_text('news_research: true\n')

        with patch('setup.features.FEATURES_YAML', yaml_file):
            with patch('setup.features.warn') as mock_warn:
                result = load_features_map()
            assert result['newsResearch'] is True
            # Only the "use camelCase" warning should fire, not a dup key warning
            camel_warnings = [c for c in mock_warn.call_args_list if 'news_research' in str(c) and 'camelCase' in str(c)]
            assert len(camel_warnings) == 1
