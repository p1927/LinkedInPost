"""Tests for setup/wizard/steps/mode module.

Tests set_deployment_mode business logic.
Flask routes tested by wizard integration tests.
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest


class TestSetDeploymentMode:
    """Tests for set_deployment_mode()."""

    def _mock_features_file(self, tmp_path, content):
        path = tmp_path / 'features.yaml'
        path.write_text(content)
        return path

    def test_replaces_existing_deploymentsaas_mode(self, tmp_path):
        """Must replace existing deploymentMode: saas with new mode."""
        features_file = self._mock_features_file(tmp_path, 'deploymentMode: saas\nother: value\n')
        with patch('setup.wizard.steps.mode.FEATURES_FILE', features_file), \
             patch('subprocess.run') as mock_run:
            from setup.wizard.steps.mode import set_deployment_mode
            set_deployment_mode('selfHosted')
            result = features_file.read_text()
            assert 'deploymentMode: selfHosted' in result
            assert 'deploymentMode: saas' not in result

    def test_replaces_existing_deploymentselfHosted_mode(self, tmp_path):
        """Must replace existing deploymentMode: selfHosted with new mode."""
        features_file = self._mock_features_file(tmp_path, 'deploymentMode: selfHosted\nother: value\n')
        with patch('setup.wizard.steps.mode.FEATURES_FILE', features_file), \
             patch('subprocess.run') as mock_run:
            from setup.wizard.steps.mode import set_deployment_mode
            set_deployment_mode('saas')
            result = features_file.read_text()
            assert 'deploymentMode: saas' in result
            assert 'deploymentMode: selfHosted' not in result

    def test_adds_deployment_mode_when_missing(self, tmp_path):
        """Must add deploymentMode line when none exists."""
        features_file = self._mock_features_file(tmp_path, 'other: value\n')
        with patch('setup.wizard.steps.mode.FEATURES_FILE', features_file), \
             patch('subprocess.run') as mock_run:
            from setup.wizard.steps.mode import set_deployment_mode
            set_deployment_mode('saas')
            result = features_file.read_text()
            assert 'deploymentMode: saas' in result
            assert result.endswith('\n')

    def test_runs_generate_features_script(self, tmp_path):
        """Must call generate_features.py after updating features.yaml."""
        features_file = self._mock_features_file(tmp_path, 'deploymentMode: saas\n')
        with patch('setup.wizard.steps.mode.FEATURES_FILE', features_file), \
             patch('subprocess.run') as mock_run:
            from setup.wizard.steps.mode import set_deployment_mode
            set_deployment_mode('selfHosted')
            mock_run.assert_called_once_with(
                ['python3', 'scripts/generate_features.py'],
                check=True
            )
            assert 'deploymentMode: selfHosted' in features_file.read_text()

    def test_raises_on_missing_features_file(self, tmp_path):
        """Must raise FileNotFoundError when features.yaml does not exist."""
        features_file = tmp_path / 'features.yaml'
        with patch('setup.wizard.steps.mode.FEATURES_FILE', features_file), \
             patch('subprocess.run'):
            from setup.wizard.steps.mode import set_deployment_mode
            with pytest.raises(FileNotFoundError):
                set_deployment_mode('saas')
            assert not features_file.exists()

    def test_raises_on_subprocess_failure(self, tmp_path):
        """Must propagate subprocess.CalledProcessError when generate_features fails."""
        features_file = self._mock_features_file(tmp_path, 'deploymentMode: saas\n')
        with patch('setup.wizard.steps.mode.FEATURES_FILE', features_file), \
             patch('subprocess.run', side_effect=Exception('subprocess failed')):
            from setup.wizard.steps.mode import set_deployment_mode
            with pytest.raises(Exception, match='subprocess failed'):
                set_deployment_mode('selfHosted')
            # File was written before subprocess ran, so it has the updated mode
            assert 'deploymentMode: selfHosted' in features_file.read_text()
            assert features_file.exists()

    def test_preserves_other_yaml_content(self, tmp_path):
        """Must not modify other lines in features.yaml."""
        features_file = self._mock_features_file(tmp_path,
            'deploymentMode: saas\notherKey: otherValue\nanotherKey: anotherValue\n')
        with patch('setup.wizard.steps.mode.FEATURES_FILE', features_file), \
             patch('subprocess.run') as mock_run:
            from setup.wizard.steps.mode import set_deployment_mode
            set_deployment_mode('selfHosted')
            result = features_file.read_text()
            assert 'otherKey: otherValue' in result
            assert 'anotherKey: anotherValue' in result

    def test_appends_final_newline(self, tmp_path):
        """Must ensure file ends with newline after modification."""
        features_file = self._mock_features_file(tmp_path, 'deploymentMode: saas')
        with patch('setup.wizard.steps.mode.FEATURES_FILE', features_file), \
             patch('subprocess.run') as mock_run:
            from setup.wizard.steps.mode import set_deployment_mode
            set_deployment_mode('selfHosted')
            result = features_file.read_text()
            assert result.endswith('\n')
            assert 'deploymentMode: selfHosted' in result
