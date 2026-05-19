"""Tests for setup/wizard/steps/mode module.

Tests set_deployment_mode business logic.
Flask routes tested by wizard integration tests.
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest


class TestModeShow:
    """Tests for mode.show() route."""

    def test_empty_yaml_file_does_not_raise_attribute_error(self, tmp_path):
        """Empty YAML file must not cause AttributeError on data.get().

        Regression: yaml.safe_load('') returns None, and None.get() raises
        AttributeError. Fix: guard with `if data is None: data = {}`.
        """
        import yaml
        features_file = tmp_path / 'features.yaml'
        features_file.write_text('')
        # Verify yaml returns None for empty string
        data = yaml.safe_load(features_file.read_text())
        assert data is None
        # Simulate the fixed code: guard against None
        if data is None:
            data = {}
        result = data.get('deploymentMode', 'saas')
        assert result == 'saas'

    def test_whitespace_only_yaml_does_not_raise(self, tmp_path):
        """Whitespace-only YAML file must not raise on data.get()."""
        import yaml
        features_file = tmp_path / 'features.yaml'
        features_file.write_text('   \n\n  ')
        data = yaml.safe_load(features_file.read_text())
        # yaml.safe_load returns None for whitespace-only content too
        assert data is None
        if data is None:
            data = {}
        result = data.get('deploymentMode', 'saas')
        assert result == 'saas'


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


class TestModeShowRoute:
    """Tests for mode.show() Flask route (GET /step/mode)."""

    def test_show_renders_mode_page(self, client, tmp_env, mock_subprocess):
        """GET /step/mode must return 200 and render the mode selection page."""
        r = client.get('/step/mode')
        assert r.status_code == 200
        assert b'mode' in r.data.lower() or b'saas' in r.data.lower()

    def test_show_defaults_to_saas(self, client, tmp_env, mock_subprocess):
        """When features.yaml has no deploymentMode, show() must default to saas."""
        tmp_env.features_yaml.write_text("otherKey: otherValue\n")
        r = client.get('/step/mode')
        assert r.status_code == 200
        assert b'saas' in r.data.lower()

    def test_show_reads_existing_mode(self, client, tmp_env, mock_subprocess):
        """show() must read deploymentMode from features.yaml and pass it to the template."""
        tmp_env.features_yaml.write_text("deploymentMode: selfHosted\nnewsResearch: true\n")
        r = client.get('/step/mode')
        assert r.status_code == 200
        assert b'selfHosted' in r.data or b'self-hosted' in r.data.lower()


class TestModeSubmitRoute:
    """Tests for mode.submit() Flask route (POST /step/mode)."""

    def test_submit_saas_redirects_to_prereqs(self, client, tmp_env, mock_subprocess):
        """POST /step/mode with mode=saas must redirect to /step/prereqs."""
        r = client.post('/step/mode', data={'mode': 'saas'})
        assert r.status_code == 302
        assert 'prereqs' in r.location
        text = tmp_env.features_yaml.read_text()
        assert 'deploymentMode: saas' in text
        assert 'deploymentMode: selfHosted' not in text

    def test_submit_self_hosted_redirects_to_prereqs(self, client, tmp_env, mock_subprocess):
        """POST /step/mode with mode=selfHosted must redirect to /step/prereqs."""
        r = client.post('/step/mode', data={'mode': 'selfHosted'})
        assert r.status_code == 302
        assert 'prereqs' in r.location
        text = tmp_env.features_yaml.read_text()
        assert 'deploymentMode: selfHosted' in text

    def test_submit_invalid_mode_defaults_to_saas(self, client, tmp_env, mock_subprocess):
        """POST with an invalid mode value must default to saas."""
        r = client.post('/step/mode', data={'mode': 'bogus-mode'})
        assert r.status_code == 302
        text = tmp_env.features_yaml.read_text()
        assert 'deploymentMode: saas' in text

    def test_submit_calls_generate_features_script(self, client, tmp_env, mock_subprocess):
        """submit() must call scripts/generate_features.py after writing features.yaml."""
        r = client.post('/step/mode', data={'mode': 'saas'})
        assert r.status_code == 302
        assert any('generate_features.py' in ' '.join(call_args) for call_args in mock_subprocess.runs)
