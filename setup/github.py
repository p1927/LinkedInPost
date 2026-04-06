from __future__ import annotations

import argparse
import os
import re
import subprocess

from .constants import ROOT, WORKER_DEV_VARS
from .utils import generate_encryption_key, ok, run_command, warn
from .worker_config import (
    WorkerBootstrap,
    load_worker_encryption_key,
    normalize_origin,
    normalize_space_delimited,
    read_worker_dev_var,
)


def get_git_remote_url() -> str:
    try:
        result = subprocess.run(
            ['git', 'config', '--get', 'remote.origin.url'],
            cwd=ROOT, check=True, capture_output=True, text=True,
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return ''


def infer_github_repo() -> str:
    remote = get_git_remote_url()
    if not remote:
        return ''
    match = re.search(r'[:/]([^/]+)/([^/]+?)(?:\.git)?$', remote)
    if not match:
        return ''
    return f'{match.group(1)}/{match.group(2)}'


def infer_github_pages_origin(github_repo: str) -> str:
    if not github_repo or '/' not in github_repo:
        return ''
    owner, _repo = github_repo.split('/', 1)
    return f'https://{owner}.github.io'


def bootstrap_worker_config(args: argparse.Namespace, google_resources: object | None) -> WorkerBootstrap:
    github_repo = args.github_repo or infer_github_repo()
    github_pages_origin = normalize_origin(args.github_pages_origin) or infer_github_pages_origin(github_repo)
    allowed_emails = normalize_space_delimited(args.allowed_emails or args.share_email)
    admin_emails = normalize_space_delimited(args.admin_emails or args.share_email)
    google_client_id = args.google_client_id
    encryption_key = load_worker_encryption_key(WORKER_DEV_VARS, generate_encryption_key)
    scheduler_secret = (
        os.environ.get('WORKER_SCHEDULER_SECRET', '').strip()
        or read_worker_dev_var(WORKER_DEV_VARS, 'WORKER_SCHEDULER_SECRET')
        or generate_encryption_key()
    )
    generation_worker_secret = (
        os.environ.get('GENERATION_WORKER_SECRET', '').strip()
        or read_worker_dev_var(WORKER_DEV_VARS, 'GENERATION_WORKER_SECRET')
        or os.environ.get('WORKER_SHARED_SECRET', '').strip()
        or read_worker_dev_var(WORKER_DEV_VARS, 'WORKER_SHARED_SECRET')
        or generate_encryption_key()
    )

    if not allowed_emails:
        warn('ALLOWED_EMAILS', 'not provided — any verified Google account can sign up. Set this to restrict access to specific emails.')
    if not google_client_id:
        warn('VITE_GOOGLE_CLIENT_ID', 'not provided. Frontend login and Worker audience checks will remain unconfigured.')

    gmail_client_id = (args.gmail_client_id or google_client_id).strip()
    if not gmail_client_id:
        warn('GMAIL_CLIENT_ID', 'not set. Connect Gmail stays disabled until the Worker has GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET (GMAIL_CLIENT_ID defaults to VITE_GOOGLE_CLIENT_ID when that is set).')
    if gmail_client_id and not args.gmail_client_secret.strip():
        warn('GMAIL_CLIENT_SECRET', 'not set. Gmail OAuth token exchange requires the Web application client secret in the Worker.')

    return WorkerBootstrap(
        allowed_emails=allowed_emails,
        admin_emails=admin_emails,
        google_client_id=google_client_id,
        google_cloud_storage_bucket=os.environ.get('GOOGLE_CLOUD_STORAGE_BUCKET', '').strip(),
        delete_unused_generated_images=os.environ.get('DELETE_UNUSED_GENERATED_IMAGES', 'true').strip() or 'true',
        cors_allowed_origins=normalize_space_delimited(f'http://localhost:5173 {github_pages_origin}'.strip()),
        encryption_key=encryption_key,
        scheduler_secret=scheduler_secret,
        generation_worker_secret=generation_worker_secret,
        github_repo=github_repo,
        instagram_app_id=args.instagram_app_id,
        instagram_app_secret=args.instagram_app_secret,
        linkedin_client_id=args.linkedin_client_id,
        linkedin_client_secret=args.linkedin_client_secret,
        linkedin_person_urn=args.linkedin_person_urn or (getattr(google_resources, 'linkedin_person_urn', '') if google_resources else ''),
        telegram_bot_token=args.telegram_bot_token,
        meta_app_id=args.meta_app_id,
        meta_app_secret=args.meta_app_secret,
        whatsapp_phone_number_id=os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '').strip() or args.whatsapp_phone_number_id,
        gmail_client_id=gmail_client_id,
        gmail_client_secret=args.gmail_client_secret.strip(),
    )


def sync_github_secrets(worker_bootstrap: WorkerBootstrap, google_resources: object | None) -> None:
    from .verification import verify_worker_endpoint

    worker_url = worker_bootstrap.worker_url or os.environ.get('VITE_WORKER_URL', '').strip()
    if worker_url:
        verify_worker_endpoint(worker_url, worker_bootstrap.cors_allowed_origins)

    secrets_to_sync: dict[str, str] = {
        'VITE_GOOGLE_CLIENT_ID': worker_bootstrap.google_client_id,
        'VITE_WORKER_URL': worker_url,
        'WORKER_SCHEDULER_SECRET': worker_bootstrap.scheduler_secret,
        'GOOGLE_CREDENTIALS_JSON': getattr(google_resources, 'credentials_json', None) or os.environ.get('GOOGLE_CREDENTIALS_JSON', '').strip(),
        'GOOGLE_SHEET_ID': getattr(google_resources, 'sheet_id', None) or os.environ.get('GOOGLE_SHEET_ID', '').strip(),
        'GOOGLE_CLOUD_STORAGE_BUCKET': os.environ.get('GOOGLE_CLOUD_STORAGE_BUCKET', '').strip(),
        'GOOGLE_CLOUD_STORAGE_PREFIX': os.environ.get('GOOGLE_CLOUD_STORAGE_PREFIX', '').strip(),
        'GOOGLE_DOC_ID': getattr(google_resources, 'doc_id', None) or os.environ.get('GOOGLE_DOC_ID', '').strip(),
        'DELETE_UNUSED_GENERATED_IMAGES': os.environ.get('DELETE_UNUSED_GENERATED_IMAGES', 'true').strip(),
        'GEMINI_API_KEY': os.environ.get('GEMINI_API_KEY', '').strip(),
        'XAI_API_KEY': os.environ.get('XAI_API_KEY', '').strip(),
        'SERPAPI_API_KEY': os.environ.get('SERPAPI_API_KEY', '').strip(),
        'NEWSAPI_KEY': os.environ.get('NEWSAPI_KEY', '').strip(),
        'GNEWS_API_KEY': os.environ.get('GNEWS_API_KEY', '').strip(),
        'NEWSDATA_API_KEY': os.environ.get('NEWSDATA_API_KEY', '').strip(),
        'RESEARCHER_RSS_FEEDS': os.environ.get('RESEARCHER_RSS_FEEDS', '').strip(),
        'LINKEDIN_ACCESS_TOKEN': os.environ.get('LINKEDIN_ACCESS_TOKEN', '').strip(),
        'LINKEDIN_PERSON_URN': getattr(google_resources, 'linkedin_person_urn', None) or os.environ.get('LINKEDIN_PERSON_URN', '').strip(),
        'WHATSAPP_ACCESS_TOKEN': os.environ.get('WHATSAPP_ACCESS_TOKEN', '').strip(),
        'WHATSAPP_PHONE_NUMBER_ID': os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '').strip(),
    }

    for name, value in secrets_to_sync.items():
        if not value:
            warn('GitHub secret skipped', f'{name} has no value')
            continue
        run_command(['gh', 'secret', 'set', name, '--body', value], cwd=ROOT, capture_output=True)
        ok('GitHub secret synced', name)
