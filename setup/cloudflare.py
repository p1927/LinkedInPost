from __future__ import annotations

import json
import os
import re
import tempfile
from pathlib import Path

from .constants import WORKER_DEV_VARS, WORKER_DIR, WORKER_WRANGLER_CONFIG
from .utils import ensure_command, ok, run_command, warn
from .worker_config import (
    WorkerBootstrap,
    build_worker_dev_values,
    build_worker_secret_values,
    extract_namespace_id,
    extract_worker_url,
    read_existing_kv_ids,
    update_wrangler_config,
)


def ensure_cloudflare_auth() -> None:
    api_token = os.environ.get('CLOUDFLARE_API_TOKEN', '').strip()
    if api_token:
        return
    raise RuntimeError(
        'CLOUDFLARE_API_TOKEN is required for Cloudflare setup in non-interactive runs. '
        'Create a Cloudflare API token with Workers and KV permissions, export it as '
        'CLOUDFLARE_API_TOKEN, then rerun setup.py.'
    )


def install_worker_dependencies() -> None:
    ensure_command('npm', 'Install Node.js and npm so setup.py can install Worker dependencies.')
    package_lock = WORKER_DIR / 'package-lock.json'
    node_modules = WORKER_DIR / 'node_modules'
    local_wrangler = node_modules / '.bin' / 'wrangler'
    should_install = not node_modules.exists() or not local_wrangler.exists()
    npm_command = ['npm', 'ci'] if package_lock.exists() else ['npm', 'install']
    if should_install:
        run_command(npm_command, cwd=WORKER_DIR, capture_output=True)
        ok('Worker dependencies', f'installed with {" ".join(npm_command)}')
    else:
        ok('Worker dependencies', 'already installed')


def create_kv_namespace(preview: bool) -> str:
    command = ['npx', 'wrangler', 'kv', 'namespace', 'create', 'CONFIG_KV']
    if preview:
        command.append('--preview')
    try:
        result = run_command([*command, '--json'], cwd=WORKER_DIR, capture_output=True)
    except RuntimeError as error:
        if 'Unknown argument: json' not in str(error):
            raise
        result = run_command(command, cwd=WORKER_DIR, capture_output=True)
    namespace_id = extract_namespace_id(result.stdout)
    if not namespace_id:
        raise RuntimeError(f'Unable to parse KV namespace ID from Wrangler output: {result.stdout}')
    return namespace_id


def create_cloudflare_kv_namespaces(worker_bootstrap: WorkerBootstrap) -> None:
    existing_ids = read_existing_kv_ids(WORKER_WRANGLER_CONFIG)
    if existing_ids[0] and existing_ids[1]:
        worker_bootstrap.kv_namespace_id = existing_ids[0]
        worker_bootstrap.kv_preview_id = existing_ids[1]
        ok('Cloudflare KV namespace', worker_bootstrap.kv_namespace_id)
        ok('Cloudflare KV preview namespace', worker_bootstrap.kv_preview_id)
        return
    ensure_command('npx', 'Install Node.js so setup.py can call Wrangler.')
    worker_bootstrap.kv_namespace_id = create_kv_namespace(preview=False)
    worker_bootstrap.kv_preview_id = create_kv_namespace(preview=True)
    ok('Cloudflare KV namespace', worker_bootstrap.kv_namespace_id)
    ok('Cloudflare KV preview namespace', worker_bootstrap.kv_preview_id)


def _is_strict_json(text: str) -> bool:
    try:
        json.loads(text)
        return True
    except json.JSONDecodeError:
        return False


def _extract_d1_database_id(output: str) -> str:
    try:
        parsed = json.loads(output)
        if isinstance(parsed, dict):
            return str(parsed.get('uuid', '') or parsed.get('id', '')).strip()
    except json.JSONDecodeError:
        pass
    match = re.search(r'"uuid"\s*:\s*"([^"]+)"', output)
    if match:
        return match.group(1)
    match = re.search(r'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', output, re.IGNORECASE)
    return match.group(1) if match else ''


def _patch_d1_database_id(database_id: str) -> None:
    text = WORKER_WRANGLER_CONFIG.read_text()
    patched = re.sub(
        r'("database_id"\s*:\s*)"[^"]*"',
        lambda m: f'{m.group(1)}"{database_id}"',
        text,
    )
    if patched != text:
        WORKER_WRANGLER_CONFIG.write_text(patched)
        ok('wrangler.jsonc patched', f'database_id = {database_id}')


def _apply_d1_migrations(remote: bool = False) -> None:
    flag = '--remote' if remote else '--local'
    print(f'\n[D1] Applying migrations ({flag})...')
    try:
        run_command(
            ['npx', 'wrangler', 'd1', 'migrations', 'apply', 'linkedin-pipeline-db', flag],
            cwd=WORKER_DIR,
            capture_output=True,
        )
        ok('D1 migrations', f'applied {flag}')
    except RuntimeError as error:
        warn('D1 migrations', str(error)[:300])


def provision_d1_database() -> None:
    """Create the D1 database if not yet provisioned and patch database_id into wrangler.jsonc."""
    ensure_command('npx', 'Install Node.js so setup.py can call Wrangler.')
    try:
        import json5
        raw = WORKER_WRANGLER_CONFIG.read_text()
        config = json5.loads(raw) if not _is_strict_json(raw) else json.loads(raw)
    except Exception:
        config = {}

    existing_d1 = config.get('d1_databases', [])
    current_id = str(existing_d1[0].get('database_id', '') if existing_d1 else '').strip()
    is_placeholder = not current_id or current_id.startswith('REPLACE_WITH_') or current_id == '00000000-0000-0000-0000-000000000001'

    if not is_placeholder:
        ok('D1 database ID', current_id)
        _apply_d1_migrations(remote=True)
        return

    print('\n[D1] Creating D1 database linkedin-pipeline-db...')
    try:
        result = run_command(
            ['npx', 'wrangler', 'd1', 'create', 'linkedin-pipeline-db', '--json'],
            cwd=WORKER_DIR, capture_output=True,
        )
        stdout = result.stdout.strip()
    except RuntimeError:
        result = run_command(
            ['npx', 'wrangler', 'd1', 'create', 'linkedin-pipeline-db'],
            cwd=WORKER_DIR, capture_output=True,
        )
        stdout = result.stdout.strip()

    database_id = _extract_d1_database_id(stdout)
    if not database_id:
        warn('D1 database', 'Could not parse database_id from wrangler output. Patch wrangler.jsonc manually.')
        warn('D1 database output', stdout[:400])
        return

    _patch_d1_database_id(database_id)
    ok('D1 database ID', database_id)
    _apply_d1_migrations(remote=True)


def update_worker_wrangler_config(worker_bootstrap: WorkerBootstrap) -> None:
    update_wrangler_config(WORKER_WRANGLER_CONFIG, worker_bootstrap)
    ok('wrangler.jsonc updated', str(WORKER_WRANGLER_CONFIG))


def write_worker_dev_vars(worker_bootstrap: WorkerBootstrap, google_resources: object | None) -> None:
    credentials_json = (
        getattr(google_resources, 'credentials_json', None)
        or os.environ.get('GOOGLE_CREDENTIALS_JSON', '').strip()
    )
    values = build_worker_dev_values(worker_bootstrap, credentials_json)
    lines = [f'{key}={value}' for key, value in values.items() if value]
    WORKER_DEV_VARS.write_text('\n'.join(lines) + '\n')
    ok('Worker local env file', str(WORKER_DEV_VARS))


class TemporaryPath:
    def __init__(self, path: str) -> None:
        self.path = path

    def __enter__(self) -> str:
        return self.path

    def __exit__(self, exc_type: object, exc: object, traceback: object) -> None:
        Path(self.path).unlink(missing_ok=True)


def build_wrangler_secrets_file(secret_values: dict[str, str]) -> TemporaryPath:
    missing = [name for name, value in secret_values.items() if not value]
    if missing:
        missing_list = ', '.join(missing)
        raise RuntimeError(f'Missing required Worker secrets before deployment: {missing_list}')

    handle = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False)
    try:
        json.dump(secret_values, handle)
        handle.flush()
        handle.close()
        ok('Worker secrets prepared', 'temporary deploy secrets file created')
        return TemporaryPath(handle.name)
    except Exception:
        handle.close()
        Path(handle.name).unlink(missing_ok=True)
        raise


def ensure_worker_deploy(worker_bootstrap: WorkerBootstrap, google_resources: object | None) -> None:
    ensure_command('npx', 'Install Node.js so setup.py can call Wrangler.')
    credentials_json = (
        getattr(google_resources, 'credentials_json', None)
        or os.environ.get('GOOGLE_CREDENTIALS_JSON', '').strip()
    )
    if not credentials_json:
        raise RuntimeError('GOOGLE_CREDENTIALS_JSON is required to deploy the Worker.')

    secret_values = build_worker_secret_values(worker_bootstrap, credentials_json)

    with build_wrangler_secrets_file(secret_values) as secrets_file:
        result = run_command(
            ['npx', 'wrangler', 'deploy', '--env', '', '--secrets-file', secrets_file],
            cwd=WORKER_DIR,
            capture_output=True,
        )

    worker_bootstrap.worker_url = extract_worker_url(result.stdout)
    if worker_bootstrap.worker_url:
        from .verification import verify_worker_endpoint
        verify_worker_endpoint(worker_bootstrap.worker_url, worker_bootstrap.cors_allowed_origins)
        ok('Worker deployed', worker_bootstrap.worker_url)
    else:
        warn('Worker deploy output', 'completed, but setup.py could not parse the deployment URL')
