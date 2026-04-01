"""Worker bootstrap config — ported from setup_worker.py."""
from __future__ import annotations

import copy
import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from .constants import GEN_WORKER_WRANGLER_CONFIG, WORKER_DEV_VARS


def load_wrangler_jsonc(wrangler_config_path: Path) -> dict[str, Any]:
    """Parse worker/wrangler.jsonc. Wrangler allows JSONC (trailing commas, comments); stdlib json does not."""
    raw = wrangler_config_path.read_text()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    try:
        import json5
    except ImportError as exc:
        raise RuntimeError(
            'wrangler.jsonc is not valid strict JSON. Cloudflare allows JSONC (e.g. trailing commas). '
            'Install json5: pip install -r requirements.txt'
        ) from exc
    return json5.loads(raw)


@dataclass
class WorkerBootstrap:
    allowed_emails: str
    admin_emails: str
    google_client_id: str
    google_cloud_storage_bucket: str
    delete_unused_generated_images: str
    cors_allowed_origins: str
    encryption_key: str
    scheduler_secret: str
    generation_worker_secret: str
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
    gmail_client_id: str
    gmail_client_secret: str
    kv_namespace_id: str = ''
    kv_preview_id: str = ''
    worker_url: str = ''
    generation_worker_url: str = ''


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
    config = load_wrangler_jsonc(wrangler_config_path)
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


def _read_existing_var(config: dict[str, Any], name: str) -> str:
    return str(config.get('vars', {}).get(name, '') or '').strip()


def update_wrangler_config(wrangler_config_path: Path, worker_bootstrap: WorkerBootstrap) -> None:
    config = load_wrangler_jsonc(wrangler_config_path)

    existing_d1 = config.get('d1_databases', [])
    if not existing_d1:
        existing_d1 = [{
            'binding': 'PIPELINE_DB',
            'database_name': 'linkedin-pipeline-db',
            'database_id': 'REPLACE_WITH_D1_DATABASE_ID',
            'migrations_dir': 'migrations',
        }]
    config['d1_databases'] = existing_d1

    existing_triggers = config.get('triggers', {})
    if not existing_triggers.get('crons'):
        existing_triggers['crons'] = ['0 3 * * *']
    config['triggers'] = existing_triggers

    config['kv_namespaces'] = [{
        'binding': 'CONFIG_KV',
        'id': worker_bootstrap.kv_namespace_id or 'REPLACE_WITH_KV_NAMESPACE_ID',
        'preview_id': worker_bootstrap.kv_preview_id or 'REPLACE_WITH_KV_PREVIEW_ID',
    }]
    news_snapshot_max = _read_existing_var(config, 'NEWS_SNAPSHOT_MAX_PER_TOPIC') or '10'
    gen_worker_url = (
        worker_bootstrap.generation_worker_url.strip()
        or _read_existing_var(config, 'GENERATION_WORKER_URL')
    )
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
        'GMAIL_CLIENT_ID': worker_bootstrap.gmail_client_id,
        'NEWS_SNAPSHOT_MAX_PER_TOPIC': news_snapshot_max,
        'GENERATION_WORKER_URL': gen_worker_url,
    }
    config['durable_objects'] = {
        'bindings': [{'name': 'SCHEDULED_LINKEDIN_PUBLISH', 'class_name': 'ScheduledPublishAlarm'}]
    }
    config['migrations'] = [{'tag': 'v1', 'new_sqlite_classes': ['ScheduledPublishAlarm']}]
    preview_binding_id = worker_bootstrap.kv_preview_id or 'REPLACE_WITH_KV_PREVIEW_ID'
    local_d1 = copy.deepcopy(existing_d1)
    config['env'] = {
        'local': {
            'durable_objects': copy.deepcopy(config['durable_objects']),
            'migrations': copy.deepcopy(config['migrations']),
            'vars': copy.deepcopy(config['vars']),
            'kv_namespaces': [{'binding': 'CONFIG_KV', 'id': preview_binding_id, 'preview_id': preview_binding_id}],
            'd1_databases': local_d1,
        }
    }
    wrangler_config_path.write_text(json.dumps(config, indent=2) + '\n')


def generation_worker_url_for_dev(worker_bootstrap: WorkerBootstrap, dev_vars_path: Path) -> str:
    if worker_bootstrap.generation_worker_url.strip():
        return worker_bootstrap.generation_worker_url.strip()
    env_url = os.environ.get('GENERATION_WORKER_URL', '').strip()
    if env_url:
        return env_url
    persisted = read_worker_dev_var(dev_vars_path, 'GENERATION_WORKER_URL')
    if persisted:
        return persisted
    return 'http://127.0.0.1:8788'


def build_worker_dev_values(worker_bootstrap: WorkerBootstrap, credentials_json: str) -> dict[str, str]:
    return {
        'ALLOWED_EMAILS': worker_bootstrap.allowed_emails,
        'ADMIN_EMAILS': worker_bootstrap.admin_emails,
        'GOOGLE_CLIENT_ID': worker_bootstrap.google_client_id,
        'GOOGLE_CLOUD_STORAGE_BUCKET': worker_bootstrap.google_cloud_storage_bucket,
        'DELETE_UNUSED_GENERATED_IMAGES': worker_bootstrap.delete_unused_generated_images,
        'GOOGLE_SERVICE_ACCOUNT_JSON': credentials_json,
        'GEMINI_API_KEY': os.environ.get('GEMINI_API_KEY', '').strip(),
        'XAI_API_KEY': os.environ.get('XAI_API_KEY', '').strip(),
        'SERPAPI_API_KEY': os.environ.get('SERPAPI_API_KEY', '').strip(),
        'NEWSAPI_KEY': os.environ.get('NEWSAPI_KEY', '').strip(),
        'GNEWS_API_KEY': os.environ.get('GNEWS_API_KEY', '').strip(),
        'NEWSDATA_API_KEY': os.environ.get('NEWSDATA_API_KEY', '').strip(),
        'RESEARCHER_RSS_FEEDS': os.environ.get('RESEARCHER_RSS_FEEDS', '').strip(),
        'GITHUB_TOKEN_ENCRYPTION_KEY': worker_bootstrap.encryption_key,
        'WORKER_SCHEDULER_SECRET': worker_bootstrap.scheduler_secret,
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
        'GMAIL_CLIENT_ID': worker_bootstrap.gmail_client_id,
        'GMAIL_CLIENT_SECRET': worker_bootstrap.gmail_client_secret,
        'INSTAGRAM_ACCESS_TOKEN': os.environ.get('INSTAGRAM_ACCESS_TOKEN', '').strip(),
        'INSTAGRAM_USER_ID': os.environ.get('INSTAGRAM_USER_ID', '').strip(),
        'LINKEDIN_ACCESS_TOKEN': os.environ.get('LINKEDIN_ACCESS_TOKEN', '').strip(),
        'WHATSAPP_ACCESS_TOKEN': os.environ.get('WHATSAPP_ACCESS_TOKEN', '').strip(),
        'GENERATION_WORKER_URL': generation_worker_url_for_dev(worker_bootstrap, WORKER_DEV_VARS),
        'GENERATION_WORKER_SECRET': worker_bootstrap.generation_worker_secret,
    }


def build_worker_secret_values(worker_bootstrap: WorkerBootstrap, credentials_json: str) -> dict[str, str]:
    secret_values: dict[str, str] = {
        'GOOGLE_SERVICE_ACCOUNT_JSON': credentials_json,
        'GITHUB_TOKEN_ENCRYPTION_KEY': worker_bootstrap.encryption_key,
        'WORKER_SCHEDULER_SECRET': worker_bootstrap.scheduler_secret,
        'GENERATION_WORKER_SECRET': worker_bootstrap.generation_worker_secret,
    }
    serpapi_api_key = os.environ.get('SERPAPI_API_KEY', '').strip()
    if serpapi_api_key:
        secret_values['SERPAPI_API_KEY'] = serpapi_api_key
    optional: dict[str, str] = {
        'INSTAGRAM_APP_SECRET': worker_bootstrap.instagram_app_secret,
        'TELEGRAM_BOT_TOKEN': worker_bootstrap.telegram_bot_token,
        'GEMINI_API_KEY': os.environ.get('GEMINI_API_KEY', '').strip(),
        'XAI_API_KEY': os.environ.get('XAI_API_KEY', '').strip(),
        'NEWSAPI_KEY': os.environ.get('NEWSAPI_KEY', '').strip(),
        'GNEWS_API_KEY': os.environ.get('GNEWS_API_KEY', '').strip(),
        'NEWSDATA_API_KEY': os.environ.get('NEWSDATA_API_KEY', '').strip(),
        'RESEARCHER_RSS_FEEDS': os.environ.get('RESEARCHER_RSS_FEEDS', '').strip(),
        'LINKEDIN_CLIENT_SECRET': worker_bootstrap.linkedin_client_secret,
        'META_APP_SECRET': worker_bootstrap.meta_app_secret,
        'GMAIL_CLIENT_SECRET': worker_bootstrap.gmail_client_secret,
        'INSTAGRAM_ACCESS_TOKEN': os.environ.get('INSTAGRAM_ACCESS_TOKEN', '').strip(),
        'LINKEDIN_ACCESS_TOKEN': os.environ.get('LINKEDIN_ACCESS_TOKEN', '').strip(),
        'WHATSAPP_ACCESS_TOKEN': os.environ.get('WHATSAPP_ACCESS_TOKEN', '').strip(),
    }
    secret_values.update({name: value for name, value in optional.items() if value})
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
    gmail_callback = f'{worker_url}/auth/gmail/callback' if worker_url else 'https://<your-worker-domain>/auth/gmail/callback'
    vite_worker_url = worker_url or '<set VITE_WORKER_URL after Worker deploy>'

    prerequisites: list[str] = []
    if worker_bootstrap:
        if not worker_bootstrap.gmail_client_id or not worker_bootstrap.gmail_client_secret:
            prerequisites.append('Set GMAIL_CLIENT_ID (often the same Web client ID as VITE_GOOGLE_CLIENT_ID) and GMAIL_CLIENT_SECRET; for local wrangler dev add authorized redirect http://127.0.0.1:8787/auth/gmail/callback (or http://localhost:8787/auth/gmail/callback).')
        if not worker_bootstrap.instagram_app_id:
            prerequisites.append('Set INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET before testing Instagram popup auth.')
        if not worker_bootstrap.linkedin_client_id:
            prerequisites.append('Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET before testing LinkedIn popup auth.')
        if not worker_bootstrap.meta_app_id:
            prerequisites.append('Set META_APP_ID and META_APP_SECRET before testing WhatsApp popup auth.')

    core = [
        (
            'Google Cloud Console: APIs & Services → enable Gmail API. OAuth consent screen: add non-sensitive/sensitive scopes '
            'https://www.googleapis.com/auth/gmail.send and the OpenID scope email (matches the Worker). '
            f'Credentials → your Web application → Authorized redirect URIs: {gmail_callback}'
        ),
        f'Register the Instagram redirect URI: {instagram_callback}',
        f'Register the LinkedIn redirect URI: {linkedin_callback}',
        f'Register the Meta redirect URI: {whatsapp_callback}',
        f'Set VITE_WORKER_URL in the frontend build to: {vite_worker_url}',
        'Open the dashboard as an admin and use Connect Instagram, Connect LinkedIn, Connect WhatsApp Business, and Connect Gmail to store channel access in the Worker.',
        'For Telegram, set TELEGRAM_BOT_TOKEN once and save the target chat IDs in dashboard settings.',
        (
            'D1 database: if setup.py --cloudflare did not provision D1 automatically, run: '
            'cd worker && npx wrangler d1 create linkedin-pipeline-db  '
            'then patch the returned database_id into wrangler.jsonc d1_databases[0].database_id, '
            'then apply migrations: npx wrangler d1 migrations apply linkedin-pipeline-db --remote'
        ),
        (
            'Generation worker (AI Draft): setup.py --cloudflare provisions generation-worker D1; '
            'setup.py --deploy-worker deploys linkedin-generation-worker when GEMINI_API_KEY and/or XAI_API_KEY is set '
            '(missing both fails deploy). For local generation only: cd generation-worker && npm run dev (port 8788).'
        ),
        (
            'Image generation (variant images): set at least one image provider key in .env before deploying — '
            'PIXAZO_API_KEY (Pixazo SDXL, default), SEEDANCE_API_KEY (ByteDance Ark), or GEMINI_API_KEY (reused). '
            'Active provider and model are configurable per-workspace in dashboard Settings → Image Generation.'
        ),
    ]
    return prerequisites + core


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
        print(f'GMAIL_CLIENT_ID         = {worker_bootstrap.gmail_client_id or "<optional: same Web client as sign-in, for Connect Gmail>"}')
        print(f'GMAIL_CLIENT_SECRET     = {"<configured>" if worker_bootstrap.gmail_client_secret else "<optional: Worker secret for Gmail OAuth>"}')
        print(f'GITHUB_TOKEN_ENCRYPTION_KEY = {worker_bootstrap.encryption_key}')
        if worker_bootstrap.kv_namespace_id:
            print(f'CONFIG_KV production    = {worker_bootstrap.kv_namespace_id}')
        if worker_bootstrap.kv_preview_id:
            print(f'CONFIG_KV preview       = {worker_bootstrap.kv_preview_id}')
        try:
            _cfg = load_wrangler_jsonc(wrangler_config_path)
            _d1 = _cfg.get('d1_databases', [])
            _d1_id = str(_d1[0].get('database_id', '') if _d1 else '').strip()
            if _d1_id and not _d1_id.startswith('REPLACE_WITH_') and _d1_id != '00000000-0000-0000-0000-000000000001':
                print(f'PIPELINE_DB (D1)        = {_d1_id}')
            else:
                print('PIPELINE_DB (D1)        = <not yet provisioned — run setup.py --cloudflare or wrangler d1 create>')
        except Exception:
            pass
        try:
            if GEN_WORKER_WRANGLER_CONFIG.is_file():
                _gcfg = load_wrangler_jsonc(GEN_WORKER_WRANGLER_CONFIG)
                _gd1 = _gcfg.get('d1_databases', [])
                _gid = str(_gd1[0].get('database_id', '') if _gd1 else '').strip()
                low = _gid.lower()
                if _gid and not low.startswith('replace_with_') and low != 'to_be_created' and _gid != '00000000-0000-0000-0000-000000000001':
                    print(f'GEN_DB (generation D1)  = {_gid}')
                else:
                    print('GEN_DB (generation D1)  = <not yet provisioned — run setup.py --cloudflare>')
        except Exception:
            pass
        try:
            _cfg2 = load_wrangler_jsonc(wrangler_config_path)
            _gw = str(_cfg2.get('vars', {}).get('GENERATION_WORKER_URL', '') or '').strip()
            if _gw:
                print(f'GENERATION_WORKER_URL   = {_gw}')
            elif worker_bootstrap.generation_worker_url:
                print(f'GENERATION_WORKER_URL   = {worker_bootstrap.generation_worker_url}')
            else:
                print(
                    'GENERATION_WORKER_URL   = <empty in wrangler — run setup.py --deploy-worker with GEMINI_API_KEY '
                    'and/or XAI_API_KEY, or use local http://127.0.0.1:8788 via worker/.dev.vars>'
                )
        except Exception:
            pass
        print(
            'GENERATION_WORKER_SECRET = <stored in worker/.dev.vars and as a Worker secret; matches generation '
            "worker's WORKER_SHARED_SECRET>"
        )
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
