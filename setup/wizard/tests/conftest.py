"""Shared pytest fixtures for Flask setup wizard e2e tests.

The Flask wizard has several module-level constants and external dependencies
that must be isolated per-test:

* `state.STATE_FILE` — path to `.wizard_state.json`
* `apikeys.ROOT_ENV` / `WORKER_DEV_VARS` / `GEN_WORKER_DEV_VARS` — env file paths
* `google.ENV_FILE`, `cloudflare.ENV_FILE` — root .env path
* `mode.FEATURES_FILE` — path to `features.yaml`
* `requests.post` (apikeys) — Gemini key validation
* `requests.get` (cloudflare, verify) — Cloudflare API and Worker health
* `subprocess.run` / `subprocess.Popen` — deploy / cloudflare provisioning / features regen

Each fixture monkeypatches the right symbol so tests run hermetically.
"""

from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock

import pytest

from setup.wizard import server
from setup.wizard import state as state_module
from setup.wizard.steps import apikeys as apikeys_module
from setup.wizard.steps import cloudflare as cloudflare_module
from setup.wizard.steps import google as google_module
from setup.wizard.steps import mode as mode_module


# ---------------------------------------------------------------------------
# Env file isolation
# ---------------------------------------------------------------------------


@dataclass
class TmpEnvFiles:
    """Holds temp paths for the three env files the wizard writes to."""
    root: Path
    worker: Path
    gen_worker: Path
    features_yaml: Path
    state_file: Path

    def read_root(self) -> dict[str, str]:
        return _parse_env(self.root)

    def read_worker(self) -> dict[str, str]:
        return _parse_env(self.worker)

    def read_gen_worker(self) -> dict[str, str]:
        return _parse_env(self.gen_worker)


def _parse_env(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    out: dict[str, str] = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if '=' not in line:
            continue
        k, v = line.split('=', 1)
        # dotenv quotes values; strip outer single/double quotes
        v = v.strip()
        if (v.startswith("'") and v.endswith("'")) or (v.startswith('"') and v.endswith('"')):
            v = v[1:-1]
        out[k.strip()] = v
    return out


@pytest.fixture
def tmp_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TmpEnvFiles:
    """Redirect all wizard env-file paths into a tmp dir so tests are hermetic."""
    root = tmp_path / '.env'
    worker_dir = tmp_path / 'worker'
    worker_dir.mkdir()
    worker = worker_dir / '.dev.vars'
    gen_worker_dir = tmp_path / 'generation-worker'
    gen_worker_dir.mkdir()
    gen_worker = gen_worker_dir / '.dev.vars'

    # Touch each so dotenv.set_key works (it requires the file to exist).
    root.write_text('')
    worker.write_text('')
    gen_worker.write_text('')

    # apikeys writes to all three.
    monkeypatch.setattr(apikeys_module, 'ROOT_ENV', str(root))
    monkeypatch.setattr(apikeys_module, 'WORKER_DEV_VARS', str(worker))
    monkeypatch.setattr(apikeys_module, 'GEN_WORKER_DEV_VARS', str(gen_worker))

    # google + cloudflare use ENV_FILE.
    monkeypatch.setattr(google_module, 'ENV_FILE', str(root))
    monkeypatch.setattr(cloudflare_module, 'ENV_FILE', str(root))

    # features.yaml lives under mode_module.
    features = tmp_path / 'features.yaml'
    features.write_text(
        "deploymentMode: saas\n"
        "newsResearch: true\n"
        "campaign: true\n"
    )
    monkeypatch.setattr(mode_module, 'FEATURES_FILE', features)

    # state file
    state_file = tmp_path / '.wizard_state.json'
    monkeypatch.setattr(state_module, 'STATE_FILE', state_file)

    return TmpEnvFiles(
        root=root,
        worker=worker,
        gen_worker=gen_worker,
        features_yaml=features,
        state_file=state_file,
    )


# ---------------------------------------------------------------------------
# External call mocks
# ---------------------------------------------------------------------------


@dataclass
class MockResponse:
    status_code: int = 200
    _json: Any = None
    ok: bool = True

    def json(self) -> Any:
        return self._json if self._json is not None else {}


@pytest.fixture
def mock_gemini(monkeypatch: pytest.MonkeyPatch):
    """Mock `requests.post` inside apikeys (Gemini key validation).

    Returns a callable that lets tests configure the mock per-call:
        mock_gemini(success=True)  # default — validation passes
        mock_gemini(success=False) # validation fails
    """
    def _configure(success: bool = True):
        def fake_post(*_args, **_kwargs):
            return MockResponse(status_code=200 if success else 400, ok=success)
        monkeypatch.setattr(apikeys_module.requests, 'post', fake_post)

    _configure()  # default: success
    return _configure


@pytest.fixture
def mock_cloudflare(monkeypatch: pytest.MonkeyPatch):
    """Mock `requests.get` inside the cloudflare step (token verify + accounts list)."""
    def _configure(success: bool = True, account_id: str = 'cf-account-123'):
        def fake_get(url, *_args, **_kwargs):
            if 'tokens/verify' in url:
                if success:
                    return MockResponse(status_code=200, ok=True, _json={'success': True, 'result': {'status': 'active'}})
                return MockResponse(status_code=200, ok=True, _json={'success': False, 'errors': ['bad token']})
            if 'accounts' in url:
                return MockResponse(status_code=200, ok=True, _json={'result': [{'id': account_id}]})
            return MockResponse(status_code=404, ok=False, _json={})
        monkeypatch.setattr(cloudflare_module.requests, 'get', fake_get)

    _configure()
    return _configure


@dataclass
class SubprocessCalls:
    runs: list[list[str]] = field(default_factory=list)
    popens: list[list[str]] = field(default_factory=list)


@pytest.fixture
def mock_subprocess(monkeypatch: pytest.MonkeyPatch) -> SubprocessCalls:
    """Capture every subprocess.run / Popen call without executing it.

    Default behavior: success (returncode=0). Tests can override by setting
    `calls.exit_code` before triggering the wizard step.
    """
    calls = SubprocessCalls()
    state = {'run_exit': 0, 'popen_exit': 0, 'popen_stdout': ''}

    def fake_run(args, *_a, **kw):
        calls.runs.append(list(args))
        result = MagicMock()
        result.returncode = state['run_exit']
        result.stdout = ''
        result.stderr = '' if state['run_exit'] == 0 else 'mock subprocess failure'
        if kw.get('check') and state['run_exit'] != 0:
            raise subprocess.CalledProcessError(state['run_exit'], args)
        return result

    class FakePopen:
        def __init__(self, args, *_a, **_kw):
            calls.popens.append(list(args))
            self.returncode = state['popen_exit']
            self.stdout = iter(state['popen_stdout'].splitlines(keepends=True) or ['mock deploy line\n'])

        def wait(self):
            return self.returncode

    monkeypatch.setattr(subprocess, 'run', fake_run)
    monkeypatch.setattr(subprocess, 'Popen', FakePopen)
    # deploy module imports subprocess directly
    from setup.wizard.steps import deploy as deploy_module
    monkeypatch.setattr(deploy_module.subprocess, 'run', fake_run)
    monkeypatch.setattr(deploy_module.subprocess, 'Popen', FakePopen)
    monkeypatch.setattr(cloudflare_module.subprocess, 'run', fake_run)
    monkeypatch.setattr(mode_module.subprocess, 'run', fake_run)

    # Expose mutators on the SubprocessCalls so tests can flip behavior.
    calls.set_run_exit = lambda code: state.update(run_exit=code)  # type: ignore[attr-defined]
    calls.set_popen_exit = lambda code: state.update(popen_exit=code)  # type: ignore[attr-defined]
    calls.set_popen_stdout = lambda text: state.update(popen_stdout=text)  # type: ignore[attr-defined]
    return calls


# ---------------------------------------------------------------------------
# Flask test client + state seeding
# ---------------------------------------------------------------------------


@pytest.fixture
def app(tmp_env: TmpEnvFiles, mock_gemini, mock_cloudflare, mock_subprocess):
    """Build a Flask app instance with all external dependencies mocked.

    The order of fixture composition matters: `tmp_env` patches paths, then the
    remaining mocks patch the external calls. The fixture takes them as
    parameters to ensure they're applied before the app is constructed.
    """
    flask_app = server.create_app()
    flask_app.config['TESTING'] = True
    return flask_app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def seed_state(tmp_env: TmpEnvFiles):
    """Seed `.wizard_state.json` with the given completed steps.

    Usage:
        seed_state(['mode', 'prereqs'])
    """
    def _seed(completed: list[str]) -> None:
        state = {step: (step in completed) for step in state_module.STEPS}
        tmp_env.state_file.write_text(json.dumps(state))
    return _seed


@pytest.fixture
def valid_service_account_json() -> str:
    """A minimal but well-formed service account JSON string for the google step."""
    return json.dumps({
        'type': 'service_account',
        'project_id': 'test-project',
        'private_key_id': 'abc123',
        'private_key': '-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----\n',
        'client_email': 'test@test-project.iam.gserviceaccount.com',
        'client_id': '111111',
        'token_uri': 'https://oauth2.googleapis.com/token',
    })


@pytest.fixture
def valid_oauth_client_id() -> str:
    return '718831604482-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.apps.googleusercontent.com'
