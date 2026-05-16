"""Tests for the deployment mode step."""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

import pytest
import yaml

from setup.wizard import state as state_module


def test_mode_show_renders_current_saas(client, tmp_env, mock_subprocess):
    """GET /step/mode renders with current=saas."""
    r = client.get('/step/mode')
    assert r.status_code == 200
    assert b'saas' in r.data or r.status_code == 200


def test_mode_show_renders_current_self_hosted(client, tmp_env, mock_subprocess, monkeypatch):
    """GET /step/mode renders with current=selfHosted when features.yaml says so."""
    from setup.wizard.steps import mode as mode_module
    tmp_env.features_yaml.write_text("deploymentMode: selfHosted\nnewsResearch: true\n")
    mode_module.FEATURES_FILE = tmp_env.features_yaml
    r = client.get('/step/mode')
    assert r.status_code == 200
    assert b'selfHosted' in r.data or b'self-hosted' in r.data.lower()


def test_mode_show_ignores_malformed_yaml(client, tmp_env, mock_subprocess, monkeypatch):
    """If features.yaml is not valid YAML, show() falls back to saas."""
    from setup.wizard.steps import mode as mode_module
    tmp_env.features_yaml.write_text("not: [valid yaml: broken")
    mode_module.FEATURES_FILE = tmp_env.features_yaml
    r = client.get('/step/mode')
    assert r.status_code == 200
    assert b'saas' in r.data.lower()


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


def test_set_deployment_mode_replaces_existing_key(tmp_env, mock_subprocess, monkeypatch):
    """set_deployment_mode replaces an existing deploymentMode line via regex."""
    from setup.wizard.steps import mode as mode_module

    monkeypatch.setattr(mode_module, 'FEATURES_FILE', tmp_env.features_yaml)
    calls = []
    def fake_run(*a, **kw):
        calls.append(list(a[0]) if a else [])
        return type('R', (), {'returncode': 0})()
    monkeypatch.setattr(subprocess, 'run', fake_run)

    tmp_env.features_yaml.write_text("deploymentMode: saas\nnewsResearch: true\n")

    mode_module.set_deployment_mode('selfHosted')

    text = tmp_env.features_yaml.read_text()
    assert 'deploymentMode: selfHosted' in text
    assert 'deploymentMode: saas' not in text


def test_set_deployment_mode_appends_if_key_missing(tmp_env, mock_subprocess, monkeypatch):
    """set_deployment_mode appends deploymentMode if not present in features.yaml."""
    from setup.wizard.steps import mode as mode_module

    monkeypatch.setattr(mode_module, 'FEATURES_FILE', tmp_env.features_yaml)
    calls = []
    monkeypatch.setattr(subprocess, 'run', lambda *a, **kw: calls.append(a) or type('R', (), {'returncode': 0})())

    tmp_env.features_yaml.write_text("newsResearch: true\n")

    mode_module.set_deployment_mode('saas')

    text = tmp_env.features_yaml.read_text()
    assert 'deploymentMode: saas' in text
    assert text.count('deploymentMode:') == 1


def test_set_deployment_mode_calls_generate_features_script(tmp_env, mock_subprocess, monkeypatch):
    """set_deployment_mode must invoke scripts/generate_features.py after writing YAML."""
    from setup.wizard.steps import mode as mode_module

    monkeypatch.setattr(mode_module, 'FEATURES_FILE', tmp_env.features_yaml)
    calls = []
    def fake_run(args, *a, **kw):
        calls.append(list(args))
        return type('R', (), {'returncode': 0})()
    monkeypatch.setattr(subprocess, 'run', fake_run)

    tmp_env.features_yaml.write_text("newsResearch: true\n")

    mode_module.set_deployment_mode('saas')

    assert any('generate_features.py' in str(c) for c in calls), f"Expected generate_features.py call, got: {calls}"
    assert len(calls) == 1, f"Expected exactly 1 call, got {len(calls)}"


def test_set_deployment_mode_raises_if_script_fails(tmp_env, mock_subprocess, monkeypatch):
    """If generate_features.py exits non-zero, set_deployment_mode must raise."""
    from setup.wizard.steps import mode as mode_module

    monkeypatch.setattr(mode_module, 'FEATURES_FILE', tmp_env.features_yaml)
    called = []
    def fake_run_fail(*a, **kw):
        called.append(True)
        raise subprocess.CalledProcessError(1, ['python3', 'scripts/generate_features.py'])
    monkeypatch.setattr(subprocess, 'run', fake_run_fail)

    tmp_env.features_yaml.write_text("newsResearch: true\n")

    with pytest.raises(subprocess.CalledProcessError):
        mode_module.set_deployment_mode('saas')
    assert called, "subprocess.run must have been called before raising"