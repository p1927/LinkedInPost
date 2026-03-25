#!/usr/bin/env python3
"""
Bootstrap script for LinkedIn Bot.

The script is the source of truth for the repository bootstrap flow.
Keep Cloudflare deployment notes in worker/README.md and SETUP.md in sync with
this file. If you update either side, update the other in the same change.

The script can provision Google resources and, when requested, prepare most of
the Cloudflare Worker and GitHub configuration needed by the shared dashboard.

Examples:
    python setup.py
    python setup.py --cloudflare
    python setup.py --all
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import secrets
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from setup_worker import (
    WorkerBootstrap,
    build_worker_dev_values,
    build_worker_secret_values,
    extract_namespace_id,
    extract_worker_url,
    load_worker_encryption_key,
    normalize_origin,
    normalize_space_delimited,
    pick_verification_origin,
    print_bootstrap_summary,
    read_existing_kv_ids,
    update_wrangler_config,
)

load_dotenv()


SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/documents',
]

SHEET_HEADERS = [
    'Topic', 'Date', 'Status',
    'Variant 1', 'Variant 2', 'Variant 3', 'Variant 4',
    'Image Link 1', 'Image Link 2', 'Image Link 3', 'Image Link 4',
    'Selected Text', 'Selected Image ID', 'Post Time',
]
TOPICS_HEADERS = ['Topic', 'Date']
ROOT = Path(__file__).resolve().parent
WORKER_DIR = ROOT / 'worker'
WORKER_WRANGLER_CONFIG = WORKER_DIR / 'wrangler.jsonc'
WORKER_DEV_VARS = WORKER_DIR / '.dev.vars'


@dataclass
class GoogleResources:
    service_account_email: str
    shared_email: str
    linkedin_folder_id: str
    linkedin_folder_url: str
    sheet_id: str
    images_folder_id: str
    doc_id: str
    linkedin_person_urn: str
    credentials_json: str


def ensure_sheet_tab(sheets: Any, spreadsheet_id: str, title: str, headers: list[str]) -> None:
    metadata = sheets.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    existing = {
        sheet.get('properties', {}).get('title')
        for sheet in metadata.get('sheets', [])
    }

    if title not in existing:
        sheets.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id,
            body={
                'requests': [
                    {
                        'addSheet': {
                            'properties': {
                                'title': title,
                            }
                        }
                    }
                ]
            },
        ).execute()

    header_response = sheets.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id,
        range=f'{title}!A1',
    ).execute()
    if not header_response.get('values'):
        sheets.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=f'{title}!A1',
            valueInputOption='RAW',
            body={'values': [headers]},
        ).execute()


def ok(label: str, value: str) -> None:
    print(f'  [ok] {label}: {value}')


def warn(label: str, value: str) -> None:
    print(f'  [warn] {label}: {value}')


def fail(label: str, reason: str) -> None:
    print(f'  [fail] {label}: {reason}')


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Bootstrap LinkedIn Bot resources and deployment config.')
    parser.add_argument('--install-worker-deps', action='store_true', help='Install Worker dependencies, including Wrangler, before any Worker-related steps.')
    parser.add_argument('--cloudflare', action='store_true', help='Create Worker config, KV namespaces, and .dev.vars when possible.')
    parser.add_argument('--deploy-worker', action='store_true', help='Deploy the Worker after Cloudflare bootstrap.')
    parser.add_argument('--sync-github-secrets', action='store_true', help='Sync available GitHub Actions secrets using gh CLI.')
    parser.add_argument('--skip-google', action='store_true', help='Skip Google resource creation and use existing env values instead.')
    parser.add_argument('--share-email', default=os.environ.get('GOOGLE_SHARE_EMAIL', '').strip(), help='Email to share the LINKEDIN folder with.')
    parser.add_argument('--allowed-emails', default=os.environ.get('ALLOWED_EMAILS', '').strip(), help='Worker allowlist emails separated by spaces or commas.')
    parser.add_argument('--admin-emails', default=os.environ.get('ADMIN_EMAILS', '').strip(), help='Worker admin emails separated by spaces or commas.')
    parser.add_argument('--google-client-id', default=os.environ.get('VITE_GOOGLE_CLIENT_ID', '').strip() or os.environ.get('GOOGLE_CLIENT_ID', '').strip(), help='Google web client ID for frontend and Worker validation.')
    parser.add_argument('--github-pages-origin', default=os.environ.get('GITHUB_PAGES_ORIGIN', '').strip(), help='Origin allowed to call the Worker, for example https://user.github.io.')
    parser.add_argument('--github-repo', default=os.environ.get('GITHUB_REPO', '').strip(), help='GitHub repository in owner/repo format.')
    parser.add_argument('--instagram-app-id', default=os.environ.get('INSTAGRAM_APP_ID', '').strip(), help='Instagram app ID used for the admin connect flow.')
    parser.add_argument('--instagram-app-secret', default=os.environ.get('INSTAGRAM_APP_SECRET', '').strip(), help='Instagram app secret stored as a Worker secret.')
    parser.add_argument('--linkedin-client-id', default=os.environ.get('LINKEDIN_CLIENT_ID', '').strip(), help='LinkedIn OAuth client ID used for the admin connect flow.')
    parser.add_argument('--linkedin-client-secret', default=os.environ.get('LINKEDIN_CLIENT_SECRET', '').strip(), help='LinkedIn OAuth client secret stored as a Worker secret.')
    parser.add_argument('--linkedin-person-urn', default=os.environ.get('LINKEDIN_PERSON_URN', '').strip(), help='LinkedIn member URN used by the Worker for direct publishing.')
    parser.add_argument('--telegram-bot-token', default=os.environ.get('TELEGRAM_BOT_TOKEN', '').strip(), help='Telegram bot token stored as a Worker secret for direct delivery.')
    parser.add_argument('--meta-app-id', default=os.environ.get('META_APP_ID', '').strip(), help='Meta app ID used for the WhatsApp Business connect flow.')
    parser.add_argument('--meta-app-secret', default=os.environ.get('META_APP_SECRET', '').strip(), help='Meta app secret stored as a Worker secret.')
    parser.add_argument('--whatsapp-phone-number-id', default=os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '').strip(), help='Meta WhatsApp phone number ID used by the Worker for direct sending.')
    parser.add_argument('--all', action='store_true', help='Run Google setup, Cloudflare bootstrap, Worker deploy, and GitHub secret sync.')
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.all:
        args.install_worker_deps = True
        args.cloudflare = True
        args.deploy_worker = True
        args.sync_github_secrets = True
    if args.deploy_worker:
        args.cloudflare = True

    if args.cloudflare or args.deploy_worker or args.sync_github_secrets:
        args.install_worker_deps = True

    if args.cloudflare or args.deploy_worker:
        ensure_cloudflare_auth()

    if args.install_worker_deps:
        install_worker_dependencies()

    google_resources = None if args.skip_google else create_google_resources(args.share_email)
    if args.skip_google:
        warn('Google resource creation', 'skipped by flag')

    worker_bootstrap = None
    if args.cloudflare or args.deploy_worker or args.sync_github_secrets:
        worker_bootstrap = bootstrap_worker_config(args, google_resources)

    if args.cloudflare:
        create_cloudflare_kv_namespaces(worker_bootstrap)
        update_worker_wrangler_config(worker_bootstrap)
        write_worker_dev_vars(worker_bootstrap, google_resources)

    if args.deploy_worker:
        ensure_worker_deploy(worker_bootstrap, google_resources)

    if args.sync_github_secrets:
        sync_github_secrets(worker_bootstrap, google_resources)

    print_bootstrap_summary(args, google_resources, worker_bootstrap, WORKER_DEV_VARS, WORKER_WRANGLER_CONFIG)


def create_google_resources(shared_email: str) -> GoogleResources:
    creds_json = os.environ.get('GOOGLE_CREDENTIALS_JSON', '').strip()
    if not creds_json:
        fail('GOOGLE_CREDENTIALS_JSON', 'not set. Add it to .env or your shell and rerun setup.py.')
        sys.exit(1)

    try:
        creds_dict = json.loads(creds_json)
    except json.JSONDecodeError as error:
        fail('GOOGLE_CREDENTIALS_JSON', f'invalid JSON: {error}')
        sys.exit(1)

    service_account_email = creds_dict.get('client_email', 'unknown')
    creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
    sheets = build('sheets', 'v4', credentials=creds)
    drive = build('drive', 'v3', credentials=creds)

    print(f'\nService account: {service_account_email}')
    if shared_email:
        print(f'Sharing resources with: {shared_email}')
    else:
        print('No GOOGLE_SHARE_EMAIL provided. Resource sharing will be skipped.')

    print("\n[0/4] Checking for existing 'LINKEDIN' folder in Google Drive...")
    existing = drive.files().list(
        q="name='LINKEDIN' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        spaces='drive',
        fields='files(id, webViewLink)',
        pageSize=1,
    ).execute()

    if existing.get('files'):
        linkedin_folder_id = existing['files'][0]['id']
        linkedin_folder_url = existing['files'][0].get('webViewLink', '')
        ok('LINKEDIN folder ID (existing)', linkedin_folder_id)
    else:
        print('  Creating new LINKEDIN folder...')
        linkedin_folder = drive.files().create(
            body={'name': 'LINKEDIN', 'mimeType': 'application/vnd.google-apps.folder'},
            fields='id, webViewLink',
        ).execute()
        linkedin_folder_id = linkedin_folder['id']
        linkedin_folder_url = linkedin_folder.get('webViewLink', '')
        ok('LINKEDIN folder ID (new)', linkedin_folder_id)

    if shared_email:
        try:
            drive.permissions().create(
                fileId=linkedin_folder_id,
                body={'type': 'user', 'role': 'writer', 'emailAddress': shared_email},
            ).execute()
            ok('LINKEDIN folder shared with', shared_email)
        except Exception as error:
            warn('LINKEDIN folder share', str(error))

    print("\n[1/4] Checking for existing 'Content Calendar' sheet...")
    existing_sheet = drive.files().list(
        q=(
            "name='Content Calendar' and mimeType='application/vnd.google-apps.spreadsheet' "
            f"and '{linkedin_folder_id}' in parents and trashed=false"
        ),
        spaces='drive',
        fields='files(id)',
        pageSize=1,
    ).execute()

    if existing_sheet.get('files'):
        sheet_id = existing_sheet['files'][0]['id']
        ok('Google Sheet ID (existing)', sheet_id)
    else:
        print('  Creating new Content Calendar sheet via Drive API...')
        sheet_file = drive.files().create(
            body={
                'name': 'Content Calendar',
                'mimeType': 'application/vnd.google-apps.spreadsheet',
                'parents': [linkedin_folder_id],
            },
            fields='id',
        ).execute()
        sheet_id = sheet_file['id']
        ok('Google Sheet ID (new)', sheet_id)

    try:
        ensure_sheet_tab(sheets, sheet_id, 'Topics', TOPICS_HEADERS)
        ensure_sheet_tab(sheets, sheet_id, 'Draft', SHEET_HEADERS)
        ensure_sheet_tab(sheets, sheet_id, 'Post', SHEET_HEADERS)
        ok('Google Sheet tabs', 'Topics, Draft, Post')
    except Exception as error:
        warn('Google Sheet tabs', str(error))

    print("\n[2/4] Checking for existing 'Images' subfolder...")
    existing_images = drive.files().list(
        q=(
            "name='Images' and mimeType='application/vnd.google-apps.folder' "
            f"and '{linkedin_folder_id}' in parents and trashed=false"
        ),
        spaces='drive',
        fields='files(id)',
        pageSize=1,
    ).execute()

    if existing_images.get('files'):
        images_folder_id = existing_images['files'][0]['id']
        ok('Google Drive Images Folder ID (existing)', images_folder_id)
    else:
        print('  Creating new Images folder...')
        images_folder = drive.files().create(
            body={
                'name': 'Images',
                'mimeType': 'application/vnd.google-apps.folder',
                'parents': [linkedin_folder_id],
            },
            fields='id',
        ).execute()
        images_folder_id = images_folder['id']
        ok('Google Drive Images Folder ID (new)', images_folder_id)

    print("\n[3/4] Checking for existing 'Published Posts' doc...")
    existing_doc = drive.files().list(
        q=(
            "name='Published Posts' and mimeType='application/vnd.google-apps.document' "
            f"and '{linkedin_folder_id}' in parents and trashed=false"
        ),
        spaces='drive',
        fields='files(id)',
        pageSize=1,
    ).execute()

    if existing_doc.get('files'):
        doc_id = existing_doc['files'][0]['id']
        ok('Google Doc ID (existing)', doc_id)
    else:
        print('  Creating new Published Posts doc via Drive API...')
        doc_file = drive.files().create(
            body={
                'name': 'Published Posts',
                'mimeType': 'application/vnd.google-apps.document',
                'parents': [linkedin_folder_id],
            },
            fields='id',
        ).execute()
        doc_id = doc_file['id']
        ok('Google Doc ID (new)', doc_id)

    linkedin_person_urn = fetch_linkedin_person_urn()

    return GoogleResources(
        service_account_email=service_account_email,
        shared_email=shared_email,
        linkedin_folder_id=linkedin_folder_id,
        linkedin_folder_url=linkedin_folder_url,
        sheet_id=sheet_id,
        images_folder_id=images_folder_id,
        doc_id=doc_id,
        linkedin_person_urn=linkedin_person_urn,
        credentials_json=creds_json,
    )


def fetch_linkedin_person_urn() -> str:
    explicit = os.environ.get('LINKEDIN_PERSON_URN', '').strip()
    if explicit:
        ok('LinkedIn Person URN', explicit)
        return explicit

    access_token = os.environ.get('LINKEDIN_ACCESS_TOKEN', '').strip()
    if not access_token:
        warn('LinkedIn Person URN', 'LINKEDIN_ACCESS_TOKEN not set. You will need to set LINKEDIN_PERSON_URN manually.')
        return ''

    print("\n[4/4] Fetching LinkedIn Person URN...")
    response = requests.get(
        'https://api.linkedin.com/v2/me',
        headers={'Authorization': f'Bearer {access_token}'},
        timeout=30,
    )
    if not response.ok:
        warn('LinkedIn Person URN', f'status {response.status_code}. Set LINKEDIN_PERSON_URN manually.')
        return ''

    urn = f"urn:li:person:{response.json()['id']}"
    ok('LinkedIn Person URN', urn)
    return urn


def bootstrap_worker_config(args: argparse.Namespace, google_resources: GoogleResources | None) -> WorkerBootstrap:
    github_repo = args.github_repo or infer_github_repo()
    github_pages_origin = normalize_origin(args.github_pages_origin) or infer_github_pages_origin(github_repo)
    allowed_emails = normalize_space_delimited(args.allowed_emails or args.share_email)
    admin_emails = normalize_space_delimited(args.admin_emails or args.share_email)
    google_client_id = args.google_client_id
    encryption_key = load_worker_encryption_key(WORKER_DEV_VARS, generate_encryption_key)

    if not allowed_emails:
        warn('ALLOWED_EMAILS', 'not provided. Worker access control must be set before deployment.')
    if not google_client_id:
        warn('VITE_GOOGLE_CLIENT_ID', 'not provided. Frontend login and Worker audience checks will remain unconfigured.')

    return WorkerBootstrap(
        allowed_emails=allowed_emails,
        admin_emails=admin_emails,
        google_client_id=google_client_id,
        cors_allowed_origins=normalize_space_delimited(
            f'http://localhost:5173 {github_pages_origin}'.strip()
        ),
        encryption_key=encryption_key,
        github_repo=github_repo,
        instagram_app_id=args.instagram_app_id,
        instagram_app_secret=args.instagram_app_secret,
        linkedin_client_id=args.linkedin_client_id,
        linkedin_client_secret=args.linkedin_client_secret,
        linkedin_person_urn=args.linkedin_person_urn or (google_resources.linkedin_person_urn if google_resources else ''),
        telegram_bot_token=args.telegram_bot_token,
        meta_app_id=args.meta_app_id,
        meta_app_secret=args.meta_app_secret,
        whatsapp_phone_number_id=os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '').strip() or args.whatsapp_phone_number_id,
    )


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


def update_worker_wrangler_config(worker_bootstrap: WorkerBootstrap) -> None:
    update_wrangler_config(WORKER_WRANGLER_CONFIG, worker_bootstrap)
    ok('wrangler.jsonc updated', str(WORKER_WRANGLER_CONFIG))


def write_worker_dev_vars(worker_bootstrap: WorkerBootstrap, google_resources: GoogleResources | None) -> None:
    credentials_json = google_resources.credentials_json if google_resources else os.environ.get('GOOGLE_CREDENTIALS_JSON', '').strip()
    values = build_worker_dev_values(worker_bootstrap, credentials_json)
    lines = [f'{key}={value}' for key, value in values.items() if value]
    WORKER_DEV_VARS.write_text('\n'.join(lines) + '\n')
    ok('Worker local env file', str(WORKER_DEV_VARS))


def ensure_worker_deploy(worker_bootstrap: WorkerBootstrap, google_resources: GoogleResources | None) -> None:
    ensure_command('npx', 'Install Node.js so setup.py can call Wrangler.')
    credentials_json = google_resources.credentials_json if google_resources else os.environ.get('GOOGLE_CREDENTIALS_JSON', '').strip()

    if not credentials_json:
        raise RuntimeError('GOOGLE_CREDENTIALS_JSON is required to deploy the Worker.')

    secret_values = build_worker_secret_values(worker_bootstrap, credentials_json)

    with build_wrangler_secrets_file(secret_values) as secrets_file:
        result = run_command(
            ['npx', 'wrangler', 'deploy', '--secrets-file', secrets_file],
            cwd=WORKER_DIR,
            capture_output=True,
        )

    worker_bootstrap.worker_url = extract_worker_url(result.stdout)
    if worker_bootstrap.worker_url:
        verify_worker_endpoint(worker_bootstrap.worker_url, worker_bootstrap.cors_allowed_origins)
        ok('Worker deployed', worker_bootstrap.worker_url)
    else:
        warn('Worker deploy output', 'completed, but setup.py could not parse the deployment URL')


def build_wrangler_secrets_file(secret_values: dict[str, str]):
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


class TemporaryPath:
    def __init__(self, path: str) -> None:
        self.path = path

    def __enter__(self) -> str:
        return self.path

    def __exit__(self, exc_type, exc, traceback) -> None:
        Path(self.path).unlink(missing_ok=True)


def verify_worker_endpoint(worker_url: str, cors_allowed_origins: str) -> None:
    try:
        response = requests.get(worker_url, timeout=30)
        status_code = response.status_code
        content_type = response.headers.get('content-type', '').lower()
        body_text = response.text
        try:
            payload = response.json()
        except json.JSONDecodeError as error:
            raise RuntimeError(
                f'Worker verification failed for {worker_url}: response body was not valid JSON.'
            ) from error
    except requests.exceptions.SSLError:
        status_code, headers, body_text = curl_http_request(worker_url)
        content_type = headers.get('content-type', '').lower()
        try:
            payload = json.loads(body_text)
        except json.JSONDecodeError as error:
            raise RuntimeError(
                f'Worker verification failed for {worker_url}: response body was not valid JSON.'
            ) from error

    if status_code < 200 or status_code >= 300:
        raise RuntimeError(
            f'Worker verification failed for {worker_url}: GET returned status {status_code}.'
        )

    if 'application/json' not in content_type:
        snippet = body_text[:160].replace('\n', ' ').strip()
        raise RuntimeError(
            'Worker verification failed: '
            f'{worker_url} returned {content_type or "an unknown content type"} instead of JSON. '
            'This usually means the workers.dev hostname is serving a static site instead of the API Worker. '
            f'Response preview: {snippet}'
        )

    backend = payload.get('data', {}).get('backend') if isinstance(payload, dict) else None
    if backend != 'cloudflare-worker':
        raise RuntimeError(
            'Worker verification failed: '
            f'{worker_url} did not return the expected backend marker. Found: {backend!r}'
        )

    origin = pick_verification_origin(cors_allowed_origins)
    if not origin:
        return

    try:
        preflight = requests.options(
            worker_url,
            headers={
                'Origin': origin,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type',
            },
            timeout=30,
        )
        preflight_status = preflight.status_code
        allow_origin = preflight.headers.get('Access-Control-Allow-Origin', '')
    except requests.exceptions.SSLError:
        preflight_status, preflight_headers, _body_text = curl_http_request(
            worker_url,
            method='OPTIONS',
            headers={
                'Origin': origin,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type',
            },
        )
        allow_origin = preflight_headers.get('access-control-allow-origin', '')

    if preflight_status != 204 or allow_origin not in {'*', origin}:
        raise RuntimeError(
            'Worker verification failed: '
            f'preflight for origin {origin} returned status {preflight_status} '
            f'and Access-Control-Allow-Origin={allow_origin!r}.'
        )


def curl_http_request(url: str, method: str = 'GET', headers: dict[str, str] | None = None) -> tuple[int, dict[str, str], str]:
    ensure_command('curl', 'curl is required when Python cannot verify the Worker TLS certificate chain.')

    with tempfile.NamedTemporaryFile('w+', delete=False) as headers_file:
        headers_path = headers_file.name
    with tempfile.NamedTemporaryFile('w+', delete=False) as body_file:
        body_path = body_file.name

    command = ['curl', '--silent', '--show-error', '--location', '--request', method, '--dump-header', headers_path, '--output', body_path, url]
    for header_name, header_value in (headers or {}).items():
        command.extend(['--header', f'{header_name}: {header_value}'])

    try:
        result = subprocess.run(command, cwd=ROOT, check=True, capture_output=True, text=True)
        response_headers = parse_curl_headers(Path(headers_path).read_text())
        status_code = int(response_headers.get(':status') or response_headers.get('status') or '0')
        body_text = Path(body_path).read_text()
        return status_code, response_headers, body_text
    except subprocess.CalledProcessError as error:
        stderr = error.stderr.strip() if error.stderr else ''
        raise RuntimeError(f'curl verification failed for {url}: {stderr}') from error
    finally:
        Path(headers_path).unlink(missing_ok=True)
        Path(body_path).unlink(missing_ok=True)


def parse_curl_headers(raw_headers: str) -> dict[str, str]:
    header_blocks = re.split(r'\r?\n\r?\n', raw_headers.strip())
    last_block = header_blocks[-1] if header_blocks else ''
    parsed: dict[str, str] = {}
    for index, line in enumerate(last_block.splitlines()):
        if index == 0:
            status_match = re.search(r'\s(\d{3})(?:\s|$)', line)
            if status_match:
                parsed['status'] = status_match.group(1)
            continue

        if ':' not in line:
            continue

        name, value = line.split(':', 1)
        parsed[name.strip().lower()] = value.strip()
    return parsed


def sync_github_secrets(worker_bootstrap: WorkerBootstrap, google_resources: GoogleResources | None) -> None:
    ensure_command('gh', 'Install GitHub CLI to sync repository secrets automatically.')

    worker_url = worker_bootstrap.worker_url or os.environ.get('VITE_WORKER_URL', '').strip()
    if worker_url:
        verify_worker_endpoint(worker_url, worker_bootstrap.cors_allowed_origins)

    secrets_to_sync: dict[str, str] = {
        'VITE_GOOGLE_CLIENT_ID': worker_bootstrap.google_client_id,
        'VITE_WORKER_URL': worker_url,
        'GOOGLE_CREDENTIALS_JSON': google_resources.credentials_json if google_resources else os.environ.get('GOOGLE_CREDENTIALS_JSON', '').strip(),
        'GOOGLE_SHEET_ID': google_resources.sheet_id if google_resources else os.environ.get('GOOGLE_SHEET_ID', '').strip(),
        'GOOGLE_DRIVE_FOLDER_ID': google_resources.images_folder_id if google_resources else os.environ.get('GOOGLE_DRIVE_FOLDER_ID', '').strip(),
        'GOOGLE_DOC_ID': google_resources.doc_id if google_resources else os.environ.get('GOOGLE_DOC_ID', '').strip(),
        'GEMINI_API_KEY': os.environ.get('GEMINI_API_KEY', '').strip(),
        'GOOGLE_SEARCH_API_KEY': os.environ.get('GOOGLE_SEARCH_API_KEY', '').strip(),
        'GOOGLE_SEARCH_CX': os.environ.get('GOOGLE_SEARCH_CX', '').strip(),
        'LINKEDIN_ACCESS_TOKEN': os.environ.get('LINKEDIN_ACCESS_TOKEN', '').strip(),
        'LINKEDIN_PERSON_URN': google_resources.linkedin_person_urn if google_resources else os.environ.get('LINKEDIN_PERSON_URN', '').strip(),
        'WHATSAPP_ACCESS_TOKEN': os.environ.get('WHATSAPP_ACCESS_TOKEN', '').strip(),
        'WHATSAPP_PHONE_NUMBER_ID': os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '').strip(),
    }

    for name, value in secrets_to_sync.items():
        if not value:
            warn('GitHub secret skipped', f'{name} has no value')
            continue
        run_command(['gh', 'secret', 'set', name, '--body', value], cwd=ROOT, capture_output=True)
        ok('GitHub secret synced', name)




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


def get_git_remote_url() -> str:
    try:
        result = subprocess.run(
            ['git', 'config', '--get', 'remote.origin.url'],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return ''


def generate_encryption_key() -> str:
    return base64.b64encode(secrets.token_bytes(32)).decode('ascii')


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
        return

    ok('Worker dependencies', 'already installed')


def ensure_cloudflare_auth() -> None:
    api_token = os.environ.get('CLOUDFLARE_API_TOKEN', '').strip()
    if api_token:
        return

    raise RuntimeError(
        'CLOUDFLARE_API_TOKEN is required for Cloudflare setup in non-interactive runs. '
        'Create a Cloudflare API token with Workers and KV permissions, export it as '
        'CLOUDFLARE_API_TOKEN, then rerun setup.py.'
    )


def ensure_command(command: str, help_text: str) -> None:
    if shutil.which(command):
        return
    raise RuntimeError(f'{command} is not available. {help_text}')


def run_command(
    command: list[str],
    cwd: Path,
    capture_output: bool,
    input_text: str | None = None,
) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            command,
            cwd=cwd,
            check=True,
            capture_output=capture_output,
            text=True,
            input=input_text,
        )
    except subprocess.CalledProcessError as error:
        stdout = error.stdout.strip() if error.stdout else ''
        stderr = error.stderr.strip() if error.stderr else ''
        details = '\n'.join(part for part in [stdout, stderr] if part)
        raise RuntimeError(f'Command failed: {" ".join(command)}\n{details}') from error


if __name__ == '__main__':
    try:
        main()
    except RuntimeError as error:
        fail('setup.py', str(error))
        sys.exit(1)
