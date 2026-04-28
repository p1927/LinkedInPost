"""Tests for the deployment mode step."""

from __future__ import annotations

from setup.wizard import state as state_module


def test_mode_saas_writes_features_yaml(client, tmp_env, mock_subprocess):
    r = client.post('/step/mode', data={'mode': 'saas'})
    assert r.status_code == 302
    assert r.headers['Location'].endswith('/step/prereqs')

    text = tmp_env.features_yaml.read_text()
    assert 'deploymentMode: saas' in text
    assert state_module.is_complete('mode') is True
    # generate_features.py must be invoked to regenerate TS flags
    assert any('generate_features.py' in arg for args in mock_subprocess.runs for arg in args)


def test_mode_self_hosted_writes_features_yaml(client, tmp_env, mock_subprocess):
    r = client.post('/step/mode', data={'mode': 'selfHosted'})
    assert r.status_code == 302
    text = tmp_env.features_yaml.read_text()
    assert 'deploymentMode: selfHosted' in text


def test_mode_invalid_value_falls_back_to_saas(client, tmp_env, mock_subprocess):
    r = client.post('/step/mode', data={'mode': 'something-bogus'})
    assert r.status_code == 302
    text = tmp_env.features_yaml.read_text()
    assert 'deploymentMode: saas' in text


def test_mode_switch_between_saas_and_self_hosted(client, tmp_env, mock_subprocess):
    """User picks saas, then comes back and switches to self-hosted."""
    client.post('/step/mode', data={'mode': 'saas'})
    assert 'deploymentMode: saas' in tmp_env.features_yaml.read_text()

    client.post('/step/mode', data={'mode': 'selfHosted'})
    assert 'deploymentMode: selfHosted' in tmp_env.features_yaml.read_text()
    assert 'deploymentMode: saas' not in tmp_env.features_yaml.read_text()
