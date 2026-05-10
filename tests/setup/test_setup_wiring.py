"""Tests for setup.py wiring: generation-worker dev vars gated on deploy_worker.

Validates that write_generation_worker_dev_vars is only called when
--cloudflare AND --deploy-worker are both set (not --cloudflare alone).
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest


class MockArgs:
    """Minimal argparse.Namespace stub for setup.py main() calls."""
    def __init__(
        self,
        web: bool = False,
        all: bool = False,
        install_worker_deps: bool = False,
        cloudflare: bool = False,
        deploy_worker: bool = False,
        sync_github_secrets: bool = False,
        skip_google: bool = True,
        share_email: str = '',
        gmail_client_id: str = '',
        gmail_client_secret: str = '',
        github_repo: str = '',
        github_pages_origin: str = '',
        allowed_emails: str = '',
        admin_emails: str = '',
        google_client_id: str = '',
        instagram_app_id: str = '',
        instagram_app_secret: str = '',
        linkedin_client_id: str = '',
        linkedin_client_secret: str = '',
        linkedin_person_urn: str = '',
        telegram_bot_token: str = '',
        meta_app_id: str = '',
        meta_app_secret: str = '',
        whatsapp_phone_number_id: str = '',
    ):
        self.web = web
        self.all = all
        self.install_worker_deps = install_worker_deps
        self.cloudflare = cloudflare
        self.deploy_worker = deploy_worker
        self.sync_github_secrets = sync_github_secrets
        self.skip_google = skip_google
        self.share_email = share_email
        self.gmail_client_id = gmail_client_id
        self.gmail_client_secret = gmail_client_secret
        self.github_repo = github_repo
        self.github_pages_origin = github_pages_origin
        self.allowed_emails = allowed_emails
        self.admin_emails = admin_emails
        self.google_client_id = google_client_id
        self.instagram_app_id = instagram_app_id
        self.instagram_app_secret = instagram_app_secret
        self.linkedin_client_id = linkedin_client_id
        self.linkedin_client_secret = linkedin_client_secret
        self.linkedin_person_urn = linkedin_person_urn
        self.telegram_bot_token = telegram_bot_token
        self.meta_app_id = meta_app_id
        self.meta_app_secret = meta_app_secret
        self.whatsapp_phone_number_id = whatsapp_phone_number_id


@pytest.fixture(autouse=True)
def isolate_env(tmp_path, monkeypatch):
    """Point all writable paths into a temp dir so tests never touch the real repo."""
    root = tmp_path / 'repo'
    root.mkdir()

    worker_dir = root / 'worker'
    worker_dir.mkdir()
    (worker_dir / 'tsconfig.json').write_text('{}')

    gen_worker_dir = root / 'generation-worker'
    gen_worker_dir.mkdir()
    (gen_worker_dir / 'tsconfig.json').write_text('{}')
    (gen_worker_dir / 'wrangler.jsonc').write_text('{"main": "./src/index.ts"}')

    frontend_dir = root / 'frontend'
    frontend_dir.mkdir()
    (frontend_dir / 'tsconfig.json').write_text('{}')

    monkeypatch.setenv('CLOUDFLARE_API_TOKEN', 'fake-token')
    monkeypatch.setenv('XAI_API_KEY', 'xai-test-key')
    monkeypatch.setenv('SECRET_ENCRYPTION_KEY', 'test-enc-key-32-chars-long-xxxx')
    monkeypatch.setenv('WORKER_SCHEDULER_SECRET', 'test-sched-secret')
    monkeypatch.setenv('GENERATION_WORKER_SECRET', 'test-gen-secret')
    return root


def _load_setup_with_patched_root(isolate_env, monkeypatch):
    """Load setup.py with a clean slate and patched paths.

    conftest.py pre-imports setup.* modules, causing GEN_WORKER_DIR to resolve
    to the real path before monkeypatch takes effect. This helper evicts the
    cached modules and re-imports after patching setup.constants.ROOT.
    """
    import importlib
    import sys

    # Evict all setup.* so we get fresh imports
    for key in list(sys.modules.keys()):
        if key == 'setup' or key.startswith('setup.'):
            del sys.modules[key]

    # Patch ROOT before importing anything from setup
    import setup.constants
    monkeypatch.setattr(setup.constants, 'ROOT', isolate_env)

    # Now import setup.cloudflare - it will see patched ROOT
    import setup.cloudflare as cloudflare_module
    import setup.github as github_module
    import setup.python_requirements as pr_module

    # Re-patch the cloudflare module path refs so functions use temp dir
    monkeypatch.setattr(cloudflare_module, 'GEN_WORKER_DIR', isolate_env / 'generation-worker')
    monkeypatch.setattr(cloudflare_module, 'GEN_WORKER_DEV_VARS', isolate_env / 'generation-worker' / '.dev.vars')

    # Mock all cloudflare functions that would run before write_generation_worker_dev_vars
    monkeypatch.setattr(cloudflare_module, 'ensure_cloudflare_auth', lambda: None)
    monkeypatch.setattr(cloudflare_module, 'install_worker_dependencies', lambda: None)
    monkeypatch.setattr(cloudflare_module, 'run_typescript_dry_run', lambda: None)
    monkeypatch.setattr(cloudflare_module, 'ensure_worker_deploy', lambda *a, **kw: None)
    monkeypatch.setattr(cloudflare_module, 'push_llm_secrets', lambda: None)
    monkeypatch.setattr(cloudflare_module, 'write_worker_dev_vars', lambda *a, **kw: None)

    # Mock github bootstrap to return a fully-populated WorkerBootstrap
    monkeypatch.setattr(github_module, 'bootstrap_worker_config', lambda *a, **kw: MagicMock(
        allowed_emails='', admin_emails='', google_client_id='',
        google_cloud_storage_bucket='', delete_unused_generated_images='true',
        cors_allowed_origins='http://localhost:5173', encryption_key='enc',
        scheduler_secret='sched', generation_worker_secret='gen',
        github_repo='', instagram_app_id='', instagram_app_secret='',
        linkedin_client_id='', linkedin_client_secret='', linkedin_person_urn='',
        telegram_bot_token='', meta_app_id='', meta_app_secret='',
        whatsapp_phone_number_id='', gmail_client_id='', gmail_client_secret='',
    ))

    # Mock google setup deps check
    monkeypatch.setattr(pr_module, 'ensure_google_setup_python_deps', lambda: None)

    # Load setup.py as a module
    setup_py_path = Path(__file__).resolve().parents[2] / 'setup.py'
    spec = importlib.util.spec_from_file_location('setup_runner2', setup_py_path)
    setup_runner2 = importlib.util.module_from_spec(spec)
    sys.modules['setup_runner2'] = setup_runner2
    spec.loader.exec_module(setup_runner2)

    return setup_runner2


def test_cloudflare_only_does_not_call_write_generation_worker_dev_vars(isolate_env, monkeypatch):
    """--cloudflare without --deploy-worker must NOT call write_generation_worker_dev_vars.

    When only --cloudflare is passed (no --deploy-worker), the generation worker
    wrangler.jsonc may not yet have the database_id from provision_generation_worker_d1.
    Calling write_generation_worker_dev_vars at this point would write an incomplete
    .dev.vars for the generation worker. The call must be deferred to --deploy_worker.
    """
    # Evict cached setup.* modules and reload with patched ROOT
    for key in list(__import__('sys').modules.keys()):
        if key == 'setup' or key.startswith('setup.'):
            del __import__('sys').modules[key]

    import setup.cloudflare as cloudflare_module
    import setup.github as github_module
    import setup.python_requirements as pr_module

    import setup.constants
    monkeypatch.setattr(setup.constants, 'ROOT', isolate_env)

    monkeypatch.setattr(cloudflare_module, 'GEN_WORKER_DIR', isolate_env / 'generation-worker')
    monkeypatch.setattr(cloudflare_module, 'GEN_WORKER_DEV_VARS', isolate_env / 'generation-worker' / '.dev.vars')
    monkeypatch.setattr(cloudflare_module, 'ensure_cloudflare_auth', lambda: None)
    monkeypatch.setattr(cloudflare_module, 'install_worker_dependencies', lambda: None)
    monkeypatch.setattr(cloudflare_module, 'run_typescript_dry_run', lambda: None)
    monkeypatch.setattr(cloudflare_module, 'write_worker_dev_vars', lambda *a, **kw: None)

    monkeypatch.setattr(github_module, 'bootstrap_worker_config', lambda *a, **kw: MagicMock(
        allowed_emails='', admin_emails='', google_client_id='',
        google_cloud_storage_bucket='', delete_unused_generated_images='true',
        cors_allowed_origins='http://localhost:5173', encryption_key='enc',
        scheduler_secret='sched', generation_worker_secret='gen',
        github_repo='', instagram_app_id='', instagram_app_secret='',
        linkedin_client_id='', linkedin_client_secret='', linkedin_person_urn='',
        telegram_bot_token='', meta_app_id='', meta_app_secret='',
        whatsapp_phone_number_id='', gmail_client_id='', gmail_client_secret='',
    ))

    monkeypatch.setattr(pr_module, 'ensure_google_setup_python_deps', lambda: None)

    import importlib.util
    import sys

    setup_py_path = Path(__file__).resolve().parents[2] / 'setup.py'
    spec = importlib.util.spec_from_file_location('setup_runner', setup_py_path)
    setup_runner = importlib.util.module_from_spec(spec)
    sys.modules['setup_runner'] = setup_runner
    spec.loader.exec_module(setup_runner)

    args = MockArgs(cloudflare=True, deploy_worker=False, skip_google=True)

    with patch('setup.cli.parse_args', return_value=args), patch.object(sys, 'argv', ['setup.py']):
        setup_runner.main()

    # The .dev.vars file must not exist — write_generation_worker_dev_vars
    # must NOT have been called (it is only called when --deploy-worker is set)
    gen_dev_vars = isolate_env / 'generation-worker' / '.dev.vars'
    assert not gen_dev_vars.exists(), (
        f"generation-worker/.dev.vars was created with only --cloudflare; "
        f"write_generation_worker_dev_vars should only be called when --deploy-worker is set"
    )


def test_deploy_worker_calls_write_generation_worker_dev_vars(isolate_env, monkeypatch):
    """--deploy-worker must call write_generation_worker_dev_vars.

    When --deploy-worker is set, the generation worker wrangler.jsonc has the
    database_id from provision_generation_worker_d1, so it's safe to write
    the .dev.vars file.
    """
    # Clear cached modules so constants re-resolve with patched ROOT
    import sys
    for key in list(sys.modules.keys()):
        if key == 'setup' or key.startswith('setup.'):
            del sys.modules[key]

    # Patch ROOT first so subsequent imports see the temp path
    import setup.constants
    monkeypatch.setattr(setup.constants, 'ROOT', isolate_env)

    # Import fresh after ROOT is patched
    import setup.cloudflare as cloudflare_module
    import setup.github as github_module
    import setup.python_requirements as pr_module

    # Re-bind cloudflare module's path constants to temp dir
    monkeypatch.setattr(cloudflare_module, 'GEN_WORKER_DIR', isolate_env / 'generation-worker')
    monkeypatch.setattr(cloudflare_module, 'GEN_WORKER_DEV_VARS', isolate_env / 'generation-worker' / '.dev.vars')

    # Mock all cloudflare functions that would run before write_generation_worker_dev_vars
    monkeypatch.setattr(cloudflare_module, 'ensure_cloudflare_auth', lambda: None)
    monkeypatch.setattr(cloudflare_module, 'install_worker_dependencies', lambda: None)
    monkeypatch.setattr(cloudflare_module, 'run_typescript_dry_run', lambda: None)
    monkeypatch.setattr(cloudflare_module, 'create_cloudflare_kv_namespaces', lambda *a, **kw: None)
    monkeypatch.setattr(cloudflare_module, 'provision_d1_database', lambda *a, **kw: None)
    monkeypatch.setattr(cloudflare_module, 'provision_generation_worker_d1', lambda *a, **kw: None)
    monkeypatch.setattr(cloudflare_module, 'update_worker_wrangler_config', lambda *a, **kw: None)
    monkeypatch.setattr(cloudflare_module, 'write_worker_dev_vars', lambda *a, **kw: None)
    monkeypatch.setattr(cloudflare_module, 'ensure_worker_deploy', lambda *a, **kw: None)
    monkeypatch.setattr(cloudflare_module, 'push_llm_secrets', lambda: None)

    monkeypatch.setattr(github_module, 'bootstrap_worker_config', lambda *a, **kw: MagicMock(
        allowed_emails='', admin_emails='', google_client_id='',
        google_cloud_storage_bucket='', delete_unused_generated_images='true',
        cors_allowed_origins='http://localhost:5173', encryption_key='enc',
        scheduler_secret='sched', generation_worker_secret='gen',
        github_repo='', instagram_app_id='', instagram_app_secret='',
        linkedin_client_id='', linkedin_client_secret='', linkedin_person_urn='',
        telegram_bot_token='', meta_app_id='', meta_app_secret='',
        whatsapp_phone_number_id='', gmail_client_id='', gmail_client_secret='',
    ))

    monkeypatch.setattr(pr_module, 'ensure_google_setup_python_deps', lambda: None)

    import importlib.util

    setup_py_path = Path(__file__).resolve().parents[2] / 'setup.py'
    spec = importlib.util.spec_from_file_location('setup_runner2', setup_py_path)
    setup_runner2 = importlib.util.module_from_spec(spec)
    sys.modules['setup_runner2'] = setup_runner2
    spec.loader.exec_module(setup_runner2)

    args = MockArgs(cloudflare=True, deploy_worker=True, skip_google=True)

    # Also patch parse_args binding inside setup_runner2 namespace since
    # setup.py uses `from setup.cli import parse_args` creating a local reference
    # that patch('setup.cli.parse_args') can't intercept once setup.py is loaded
    setup_runner2.parse_args = lambda: args

    with patch.object(sys, 'argv', ['setup.py']):
        setup_runner2.main()

    # The .dev.vars file MUST be created when --deploy-worker is set
    gen_dev_vars = isolate_env / 'generation-worker' / '.dev.vars'
    assert gen_dev_vars.exists(), (
        "generation-worker/.dev.vars was NOT created with --deploy-worker; "
        "write_generation_worker_dev_vars must be called when --deploy-worker is set"
    )
    content = gen_dev_vars.read_text()
    assert 'WORKER_SHARED_SECRET=gen' in content, (
        f"generation-worker/.dev.vars missing WORKER_SHARED_SECRET; content: {content}"
    )
    assert 'XAI_API_KEY=xai-test-key' in content, (
        f"generation-worker/.dev.vars missing XAI_API_KEY; content: {content}"
    )