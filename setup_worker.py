from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit


@dataclass
class WorkerBootstrap:
    allowed_emails: str
    admin_emails: str
    google_client_id: str
    google_cloud_storage_bucket: str
    delete_unused_generated_images: str
    cors_allowed_origins: str
    encryption_key: str
    github_repo: str
    instagram_app_id: str
    instagram_app_secret: str
    linkedin_client_id: str
    linkedin_client_secret: str
    linkedin_person_urn: str
    telegram_bot_token: str
    meta_app_id: str
    meta_app_secret: str
    whatsapp_phone_number_id: str
    kv_namespace_id: str = ''
    kv_preview_id: str = ''
    worker_url: str = ''


def normalize_space_delimited(value: str) -> str:
    return ' '.join(part for part in re.split(r'[\s,]+', value.strip()) if part)


def normalize_origin(value: str) -> str:
    trimmed = value.strip()
    if not trimmed:
        return ''

    parsed = urlsplit(trimmed)
    if not parsed.scheme or not parsed.netloc:
        return trimmed.rstrip('/')

    return f'{parsed.scheme}://{parsed.netloc}'.rstrip('/')


def read_worker_dev_var(dev_vars_path: Path, name: str) -> str:
    if not dev_vars_path.exists():
        return ''

    prefix = f'{name}='
    for raw_line in dev_vars_path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or not line.startswith(prefix):
            continue
        return line[len(prefix):].strip()

    return ''


def load_worker_encryption_key(dev_vars_path: Path, generate_encryption_key: Any) -> str:
    env_key = os.environ.get('GITHUB_TOKEN_ENCRYPTION_KEY', '').strip()
    if env_key:
        return env_key

    persisted_key = read_worker_dev_var(dev_vars_path, 'GITHUB_TOKEN_ENCRYPTION_KEY')
    if persisted_key:
        return persisted_key

    return generate_encryption_key()


def read_existing_kv_ids(wrangler_config_path: Path) -> tuple[str, str]:
    config = json.loads(wrangler_config_path.read_text())
    namespaces = config.get('kv_namespaces', [])
    if not namespaces:
        return '', ''

    namespace = namespaces[0]
    namespace_id = str(namespace.get('id', '')).strip()
    preview_id = str(namespace.get('preview_id', '')).strip()
    if namespace_id.startswith('REPLACE_WITH_'):
        namespace_id = ''
    if preview_id.startswith('REPLACE_WITH_'):
        preview_id = ''
    return namespace_id, preview_id


def update_wrangler_config(wrangler_config_path: Path, worker_bootstrap: WorkerBootstrap) -> None:
    config = json.loads(wrangler_config_path.read_text())
    config['kv_namespaces'] = [
        {
            'binding': 'CONFIG_KV',
            'id': worker_bootstrap.kv_namespace_id or 'REPLACE_WITH_KV_NAMESPACE_ID',
            'preview_id': worker_bootstrap.kv_preview_id or 'REPLACE_WITH_KV_PREVIEW_ID',
        }
    ]
    config['vars'] = {
        'ALLOWED_EMAILS': worker_bootstrap.allowed_emails,
        'ADMIN_EMAILS': worker_bootstrap.admin_emails,
        'GOOGLE_CLIENT_ID': worker_bootstrap.google_client_id,
        'GOOGLE_CLOUD_STORAGE_BUCKET': worker_bootstrap.google_cloud_storage_bucket,
        'DELETE_UNUSED_GENERATED_IMAGES': worker_bootstrap.delete_unused_generated_images,
        'CORS_ALLOWED_ORIGINS': worker_bootstrap.cors_allowed_origins,
        'INSTAGRAM_APP_ID': worker_bootstrap.instagram_app_id,
        'LINKEDIN_CLIENT_ID': worker_bootstrap.linkedin_client_id,
        'LINKEDIN_PERSON_URN': worker_bootstrap.linkedin_person_urn,
        'META_APP_ID': worker_bootstrap.meta_app_id,
        'WHATSAPP_PHONE_NUMBER_ID': worker_bootstrap.whatsapp_phone_number_id,
    }
    wrangler_config_path.write_text(json.dumps(config, indent=2) + '\n')


def build_worker_dev_values(worker_bootstrap: WorkerBootstrap, credentials_json: str) -> dict[str, str]:
    return {
        'ALLOWED_EMAILS': worker_bootstrap.allowed_emails,
        'ADMIN_EMAILS': worker_bootstrap.admin_emails,
        'GOOGLE_CLIENT_ID': worker_bootstrap.google_client_id,
        'GOOGLE_CLOUD_STORAGE_BUCKET': worker_bootstrap.google_cloud_storage_bucket,
        'DELETE_UNUSED_GENERATED_IMAGES': worker_bootstrap.delete_unused_generated_images,
        'GOOGLE_SERVICE_ACCOUNT_JSON': credentials_json,
        'GEMINI_API_KEY': os.environ.get('GEMINI_API_KEY', '').strip(),
        'GITHUB_TOKEN_ENCRYPTION_KEY': worker_bootstrap.encryption_key,
        'CORS_ALLOWED_ORIGINS': worker_bootstrap.cors_allowed_origins,
        'INSTAGRAM_APP_ID': worker_bootstrap.instagram_app_id,
        'INSTAGRAM_APP_SECRET': worker_bootstrap.instagram_app_secret,
        'LINKEDIN_CLIENT_ID': worker_bootstrap.linkedin_client_id,
        'LINKEDIN_CLIENT_SECRET': worker_bootstrap.linkedin_client_secret,
        'LINKEDIN_PERSON_URN': worker_bootstrap.linkedin_person_urn,
        'TELEGRAM_BOT_TOKEN': worker_bootstrap.telegram_bot_token,
        'META_APP_ID': worker_bootstrap.meta_app_id,
        'META_APP_SECRET': worker_bootstrap.meta_app_secret,
        'WHATSAPP_PHONE_NUMBER_ID': worker_bootstrap.whatsapp_phone_number_id,
        'INSTAGRAM_ACCESS_TOKEN': os.environ.get('INSTAGRAM_ACCESS_TOKEN', '').strip(),
        'INSTAGRAM_USER_ID': os.environ.get('INSTAGRAM_USER_ID', '').strip(),
        'LINKEDIN_ACCESS_TOKEN': os.environ.get('LINKEDIN_ACCESS_TOKEN', '').strip(),
        'WHATSAPP_ACCESS_TOKEN': os.environ.get('WHATSAPP_ACCESS_TOKEN', '').strip(),
    }


def build_worker_secret_values(worker_bootstrap: WorkerBootstrap, credentials_json: str) -> dict[str, str]:
    secret_values = {
        'GOOGLE_SERVICE_ACCOUNT_JSON': credentials_json,
        'GITHUB_TOKEN_ENCRYPTION_KEY': worker_bootstrap.encryption_key,
    }

    optional_secret_values = {
        'INSTAGRAM_APP_SECRET': worker_bootstrap.instagram_app_secret,
        'TELEGRAM_BOT_TOKEN': worker_bootstrap.telegram_bot_token,
        'GEMINI_API_KEY': os.environ.get('GEMINI_API_KEY', '').strip(),
        'LINKEDIN_CLIENT_SECRET': worker_bootstrap.linkedin_client_secret,
        'META_APP_SECRET': worker_bootstrap.meta_app_secret,
        'INSTAGRAM_ACCESS_TOKEN': os.environ.get('INSTAGRAM_ACCESS_TOKEN', '').strip(),
        'LINKEDIN_ACCESS_TOKEN': os.environ.get('LINKEDIN_ACCESS_TOKEN', '').strip(),
        'WHATSAPP_ACCESS_TOKEN': os.environ.get('WHATSAPP_ACCESS_TOKEN', '').strip(),
    }
    secret_values.update({name: value for name, value in optional_secret_values.items() if value})
    return secret_values


def extract_namespace_id(output: str) -> str:
    output = output.strip()
    if not output:
        return ''

    try:
        parsed = json.loads(output)
        if isinstance(parsed, dict):
            return str(parsed.get('id', '')).strip()
    except json.JSONDecodeError:
        pass

    match = re.search(r'"id"\s*:\s*"([^"]+)"', output)
    if match:
        return match.group(1)

    match = re.search(r'([a-f0-9]{32})', output, re.IGNORECASE)
    return match.group(1) if match else ''


def extract_worker_url(output: str) -> str:
    match = re.search(r'https://[a-z0-9\-.]+\.workers\.dev', output, re.IGNORECASE)
    return match.group(0) if match else ''


def pick_verification_origin(cors_allowed_origins: str) -> str:
    normalized = normalize_space_delimited(cors_allowed_origins)
    for origin in normalized.split(' '):
        candidate = normalize_origin(origin)
        if candidate:
            return candidate
    return ''


def resolve_worker_public_url(worker_bootstrap: WorkerBootstrap | None) -> str:
    if worker_bootstrap and worker_bootstrap.worker_url:
        return worker_bootstrap.worker_url

    return os.environ.get('VITE_WORKER_URL', '').strip()


def build_post_setup_todos(worker_bootstrap: WorkerBootstrap | None) -> list[str]:
    worker_url = resolve_worker_public_url(worker_bootstrap)
    instagram_callback = f'{worker_url}/auth/instagram/callback' if worker_url else 'https://<your-worker-domain>/auth/instagram/callback'
    linkedin_callback = f'{worker_url}/auth/linkedin/callback' if worker_url else 'https://<your-worker-domain>/auth/linkedin/callback'
    whatsapp_callback = f'{worker_url}/auth/whatsapp/callback' if worker_url else 'https://<your-worker-domain>/auth/whatsapp/callback'
    vite_worker_url = worker_url or '<set VITE_WORKER_URL after Worker deploy>'

    todos = [
        f'Register the Instagram redirect URI: {instagram_callback}',
        f'Register the LinkedIn redirect URI: {linkedin_callback}',
        f'Register the Meta redirect URI: {whatsapp_callback}',
        f'Set VITE_WORKER_URL in the frontend build to: {vite_worker_url}',
        'Open the dashboard as an admin and use Connect Instagram, Connect LinkedIn, and Connect WhatsApp Business to store channel access in the Worker.',
        'For Telegram, set TELEGRAM_BOT_TOKEN once and save the target chat IDs in dashboard settings.',
    ]

    if worker_bootstrap and not worker_bootstrap.instagram_app_id:
        todos.insert(0, 'Set INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET before testing Instagram popup auth.')
    if worker_bootstrap and not worker_bootstrap.linkedin_client_id:
        todos.insert(1 if todos else 0, 'Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET before testing LinkedIn popup auth.')
    if worker_bootstrap and not worker_bootstrap.meta_app_id:
        todos.insert(2 if todos else 0, 'Set META_APP_ID and META_APP_SECRET before testing WhatsApp popup auth.')

    return todos


def print_bootstrap_summary(
    args: Any,
    google_resources: Any,
    worker_bootstrap: WorkerBootstrap | None,
    worker_dev_vars_path: Path,
    wrangler_config_path: Path,
) -> None:
    print('\n' + '=' * 72)
    print('Bootstrap summary')
    print('=' * 72)

    if google_resources:
        print(f'GOOGLE_SHEET_ID         = {google_resources.sheet_id}')
        print(f'GOOGLE_DOC_ID           = {google_resources.doc_id}')
        print(f'GOOGLE_CLOUD_STORAGE_BUCKET = {google_resources.gcs_bucket_name or os.environ.get("GOOGLE_CLOUD_STORAGE_BUCKET", "").strip() or "<set this value>"}')
        print('GOOGLE_CREDENTIALS_JSON = <service account JSON already loaded from env>')
        print(f'LINKEDIN_PERSON_URN     = {google_resources.linkedin_person_urn or "urn:li:person:<your_id>"}')
        print(f'WHATSAPP_PHONE_NUMBER_ID = {os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "").strip() or "<set this value>"}')

    resolved_worker_url = resolve_worker_public_url(worker_bootstrap)

    if worker_bootstrap:
        print(f'VITE_GOOGLE_CLIENT_ID   = {worker_bootstrap.google_client_id or "<set this value>"}')
        print(f'GOOGLE_CLOUD_STORAGE_BUCKET = {worker_bootstrap.google_cloud_storage_bucket or "<optional: set this value>"}')
        print(f'DELETE_UNUSED_GENERATED_IMAGES = {worker_bootstrap.delete_unused_generated_images or "true"}')
        print(f'ALLOWED_EMAILS          = {worker_bootstrap.allowed_emails or "<set this value>"}')
        print(f'ADMIN_EMAILS            = {worker_bootstrap.admin_emails or "<set this value>"}')
        print(f'CORS_ALLOWED_ORIGINS    = {worker_bootstrap.cors_allowed_origins or "<set this value>"}')
        print(f'INSTAGRAM_APP_ID        = {worker_bootstrap.instagram_app_id or "<optional: set this for popup auth>"}')
        print(f'LINKEDIN_CLIENT_ID      = {worker_bootstrap.linkedin_client_id or "<optional: set this for popup auth>"}')
        print(f'LINKEDIN_PERSON_URN     = {worker_bootstrap.linkedin_person_urn or "<set this value>"}')
        print(f'TELEGRAM_BOT_TOKEN      = {"<configured>" if worker_bootstrap.telegram_bot_token else "<optional: set this for Telegram delivery>"}')
        print(f'META_APP_ID             = {worker_bootstrap.meta_app_id or "<optional: set this for popup auth>"}')
        print(f'WHATSAPP_PHONE_NUMBER_ID = {worker_bootstrap.whatsapp_phone_number_id or "<set this value>"}')
        print(f'GITHUB_TOKEN_ENCRYPTION_KEY = {worker_bootstrap.encryption_key}')
        if worker_bootstrap.kv_namespace_id:
            print(f'CONFIG_KV production    = {worker_bootstrap.kv_namespace_id}')
        if worker_bootstrap.kv_preview_id:
            print(f'CONFIG_KV preview       = {worker_bootstrap.kv_preview_id}')
    if resolved_worker_url:
        print(f'VITE_WORKER_URL         = {resolved_worker_url}')

    print('\nOutputs')
    if google_resources:
        print('  LINKEDIN/')
        print(f'    Content Calendar    (Sheet  ID: {google_resources.sheet_id})')
        print(f'    Generated images    (GCS   bucket: {google_resources.gcs_bucket_name})')
        print(f'    Published Posts     (Doc    ID: {google_resources.doc_id})')
    if worker_bootstrap:
        print(f'  Worker dev vars       ({worker_dev_vars_path})')
        print(f'  Wrangler config       ({wrangler_config_path})')

    print('\nNext steps')
    for index, item in enumerate(build_post_setup_todos(worker_bootstrap), start=1):
        print(f'  {index}. {item}')

    if not args.cloudflare and not args.deploy_worker and not args.sync_github_secrets:
        print('\nRun `python setup.py --all` to continue through Cloudflare bootstrap, Worker deploy, and GitHub secret sync.')
    print('')
