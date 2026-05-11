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
    """Load setup.py with a clean slate and patched paths."""
    import importlib
    import sys

    for key in list(sys.modules.keys()):
        if key == 'setup' or key.startswith('setup.'):
            del sys.modules[key]

    import setup.constants
    monkeypatch.setattr(setup.constants, 'ROOT', isolate_env)

    import setup.cloudflare as cloudflare_module
    import setup.github as github_module
    import setup.python_requirements as pr_module

    monkeypatch.setattr(cloudflare_module, 'GEN_WORKER_DIR', isolate_env / 'generation-worker')
    monkeypatch.setattr(cloudflare_module, 'GEN_WORKER_DEV_VARS', isolate_env / 'generation-worker' / '.dev.vars')

    monkeypatch.setattr(cloudflare_module, 'ensure_cloudflare_auth', lambda: None)
    monkeypatch.setattr(cloudflare_module, 'install_worker_dependencies', lambda: None)
    monkeypatch.setattr(cloudflare_module, 'run_typescript_dry_run', lambda: None)
    monkeypatch.setattr(cloudflare_module, 'ensure_worker_deploy', lambda *a, **kw: None)
    monkeypatch.setattr(cloudflare_module, 'push_llm_secrets', lambda: None)
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

    setup_py_path = Path(__file__).resolve().parents[2] / 'setup.py'
    spec = importlib.util.spec_from_file_location('setup_runner2', setup_py_path)
    setup_runner2 = importlib.util.module_from_spec(spec)
    sys.modules['setup_runner2'] = setup_runner2
    spec.loader.exec_module(setup_runner2)

    return setup_runner2


def test_cloudflare_only_does_not_call_write_generation_worker_dev_vars(isolate_env, monkeypatch):
    """--cloudflare without --deploy-worker must NOT call write_generation_worker_dev_vars."""
    import sys
    for key in list(sys.modules.keys()):
        if key == 'setup' or key.startswith('setup.'):
            del sys.modules[key]

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

    setup_py_path = Path(__file__).resolve().parents[2] / 'setup.py'
    spec = importlib.util.spec_from_file_location('setup_runner', setup_py_path)
    setup_runner = importlib.util.module_from_spec(spec)
    sys.modules['setup_runner'] = setup_runner
    spec.loader.exec_module(setup_runner)

    args = MockArgs(cloudflare=True, deploy_worker=False, skip_google=True)

    with patch('setup.cli.parse_args', return_value=args), patch.object(sys, 'argv', ['setup.py']):
        setup_runner.main()

    gen_dev_vars = isolate_env / 'generation-worker' / '.dev.vars'
    assert not gen_dev_vars.exists(), (
        "generation-worker/.dev.vars was created with only --cloudflare; "
        "write_generation_worker_dev_vars should only be called when --deploy-worker is set"
    )


def test_deploy_worker_alone_without_cloudflare_still_skips(isolate_env, monkeypatch):
    """--deploy-worker without --cloudflare must NOT call write_generation_worker_dev_vars."""
    import sys
    for key in list(sys.modules.keys()):
        if key == 'setup' or key.startswith('setup.'):
            del sys.modules[key]

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

    setup_py_path = Path(__file__).resolve().parents[2] / 'setup.py'
    spec = importlib.util.spec_from_file_location('setup_runner3', setup_py_path)
    setup_runner3 = importlib.util.module_from_spec(spec)
    sys.modules['setup_runner3'] = setup_runner3
    spec.loader.exec_module(setup_runner3)

    args = MockArgs(cloudflare=False, deploy_worker=True, skip_google=True)

    with patch('setup.cli.parse_args', return_value=args), patch.object(sys, 'argv', ['setup.py']):
        setup_runner3.main()

    gen_dev_vars = isolate_env / 'generation-worker' / '.dev.vars'
    # --deploy-worker alone implies cloudflare but still no KV/DB provisioned
    # The actual gate is in the if args.cloudflare block, not deploy_worker
    assert not gen_dev_vars.exists(), (
        "generation-worker/.dev.vars was created with only --deploy-worker; "
        "write_generation_worker_dev_vars should only be called when --cloudflare is set"
    )


def test_all_flag_enables_cloudflare_and_deploy_worker(isolate_env, monkeypatch):
    """--all must enable both cloudflare and deploy_worker, creating the dev vars."""
    import sys
    for key in list(sys.modules.keys()):
        if key == 'setup' or key.startswith('setup.'):
            del sys.modules[key]

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
    # Mock sync_github_secrets to avoid HTTP verification call
    monkeypatch.setattr(github_module, 'sync_github_secrets', lambda *a, **kw: None)

    monkeypatch.setattr(pr_module, 'ensure_google_setup_python_deps', lambda: None)

    import importlib.util

    setup_py_path = Path(__file__).resolve().parents[2] / 'setup.py'
    spec = importlib.util.spec_from_file_location('setup_runner4', setup_py_path)
    setup_runner4 = importlib.util.module_from_spec(spec)
    sys.modules['setup_runner4'] = setup_runner4
    spec.loader.exec_module(setup_runner4)

    args = MockArgs(all=True, cloudflare=False, deploy_worker=False, skip_google=True)

    setup_runner4.parse_args = lambda: args

    with patch.object(sys, 'argv', ['setup.py']):
        setup_runner4.main()

    gen_dev_vars = isolate_env / 'generation-worker' / '.dev.vars'
    assert gen_dev_vars.exists(), (
        "generation-worker/.dev.vars was NOT created with --all; "
        "--all should set cloudflare=True and deploy_worker=True"
    )
    content = gen_dev_vars.read_text()
    assert 'WORKER_SHARED_SECRET=gen' in content
    assert 'XAI_API_KEY=xai-test-key' in content


def test_deploy_worker_calls_write_generation_worker_dev_vars(isolate_env, monkeypatch):
    """--deploy-worker must call write_generation_worker_dev_vars."""
    import sys
    for key in list(sys.modules.keys()):
        if key == 'setup' or key.startswith('setup.'):
            del sys.modules[key]

    import setup.constants
    monkeypatch.setattr(setup.constants, 'ROOT', isolate_env)

    import setup.cloudflare as cloudflare_module
    import setup.github as github_module
    import setup.python_requirements as pr_module

    monkeypatch.setattr(cloudflare_module, 'GEN_WORKER_DIR', isolate_env / 'generation-worker')
    monkeypatch.setattr(cloudflare_module, 'GEN_WORKER_DEV_VARS', isolate_env / 'generation-worker' / '.dev.vars')

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

    setup_runner2.parse_args = lambda: args

    with patch.object(sys, 'argv', ['setup.py']):
        setup_runner2.main()

    gen_dev_vars = isolate_env / 'generation-worker' / '.dev.vars'
    assert gen_dev_vars.exists(), (
        "generation-worker/.dev.vars was NOT created with --deploy-worker; "
        "write_generation_worker_dev_vars must be called when --deploy-worker is set"
    )
    content = gen_dev_vars.read_text()
    assert 'WORKER_SHARED_SECRET=gen' in content
    assert 'XAI_API_KEY=xai-test-key' in content