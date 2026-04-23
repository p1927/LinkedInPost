from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass
from typing import Any

import requests
from dotenv import load_dotenv
from google.cloud import storage
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

from .constants import PIPELINE_TAB_HEADERS, POST_TEMPLATES_HEADERS, SCOPES, TOPICS_HEADERS
from .utils import fail, ok, warn

load_dotenv()


@dataclass
class GoogleResources:
    service_account_email: str
    shared_email: str
    linkedin_folder_id: str
    linkedin_folder_url: str
    sheet_id: str
    gcs_bucket_name: str
    doc_id: str
    linkedin_person_urn: str
    credentials_json: str


def parse_service_account_json(raw_value: str) -> tuple[dict[str, Any], str]:
    try:
        creds_dict = json.loads(raw_value)
    except json.JSONDecodeError as error:
        fail('GOOGLE_CREDENTIALS_JSON', f'invalid JSON: {error}')
        sys.exit(1)

    private_key = creds_dict.get('private_key')
    if isinstance(private_key, str) and '\\n' in private_key:
        creds_dict['private_key'] = private_key.replace('\\n', '\n')

    return creds_dict, json.dumps(creds_dict)


def ensure_sheet_tab(sheets: Any, spreadsheet_id: str, title: str, headers: list[str]) -> None:
    metadata = sheets.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    existing = {
        sheet.get('properties', {}).get('title')
        for sheet in metadata.get('sheets', [])
    }

    if title not in existing:
        sheets.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id,
            body={'requests': [{'addSheet': {'properties': {'title': title}}}]},
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


def fetch_linkedin_person_urn() -> str:
    explicit = os.environ.get('LINKEDIN_PERSON_URN', '').strip()
    if explicit:
        ok('LinkedIn Person URN', explicit)
        return explicit

    access_token = os.environ.get('LINKEDIN_ACCESS_TOKEN', '').strip()
    if not access_token:
        warn('LinkedIn Person URN', 'LINKEDIN_ACCESS_TOKEN not set. You will need to set LINKEDIN_PERSON_URN manually.')
        return ''

    print('\n[4/4] Fetching LinkedIn Person URN...')
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


def create_google_resources(shared_email: str) -> GoogleResources:
    creds_json = os.environ.get('GOOGLE_CREDENTIALS_JSON', '').strip()
    if not creds_json:
        fail('GOOGLE_CREDENTIALS_JSON', 'not set. Add it to .env or your shell and rerun setup.py.')
        sys.exit(1)

    creds_dict, normalized_creds_json = parse_service_account_json(creds_json)
    gcs_bucket_name = os.environ.get('GOOGLE_CLOUD_STORAGE_BUCKET', '').strip()
    if not gcs_bucket_name:
        fail('GOOGLE_CLOUD_STORAGE_BUCKET', 'not set. Configure a Google Cloud Storage bucket for generated images before running setup.py.')
        sys.exit(1)

    service_account_email = creds_dict.get('client_email', 'unknown')
    creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
    sheets = build('sheets', 'v4', credentials=creds)
    drive = build('drive', 'v3', credentials=creds)

    if gcs_bucket_name:
        print('\n[GCS] Validating configured image bucket...')
        storage_client = storage.Client.from_service_account_info(
            creds_dict, project=creds_dict.get('project_id'),
        )
        bucket = storage_client.bucket(gcs_bucket_name)
        if not bucket.exists():
            fail('GOOGLE_CLOUD_STORAGE_BUCKET', f'bucket {gcs_bucket_name!r} does not exist or is not accessible to the service account.')
            sys.exit(1)
        bucket.reload()
        ok('Google Cloud Storage bucket', gcs_bucket_name)
        public_access_prevention = str(getattr(bucket.iam_configuration, 'public_access_prevention', '') or '').strip().lower()
        if public_access_prevention == 'enforced':
            warn('Google Cloud Storage public access prevention', 'is enforced for this bucket. Frontend previews and direct channel fetches from storage.googleapis.com will fail unless you use a proxy or different bucket policy.')
        if not bucket.cors:
            warn('Google Cloud Storage bucket CORS', 'no CORS rules are configured. Standard image tags still work, but browser fetch-based media tooling may need bucket CORS entries for your frontend origins.')

    print(f'\nService account: {service_account_email}')
    if shared_email:
        print(f'Sharing resources with: {shared_email}')
    else:
        print('No GOOGLE_SHARE_EMAIL provided. Resource sharing will be skipped.')

    print("\n[0/4] Checking for existing 'LINKEDIN' folder in Google Drive...")
    existing = drive.files().list(
        q="name='LINKEDIN' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        spaces='drive', fields='files(id, webViewLink)', pageSize=1,
        includeItemsFromAllDrives=True, supportsAllDrives=True,
    ).execute()

    if existing.get('files'):
        linkedin_folder_id = existing['files'][0]['id']
        linkedin_folder_url = existing['files'][0].get('webViewLink', '')
        ok('LINKEDIN folder ID (existing)', linkedin_folder_id)
    else:
        print('  Creating new LINKEDIN folder...')
        linkedin_folder = drive.files().create(
            body={'name': 'LINKEDIN', 'mimeType': 'application/vnd.google-apps.folder'},
            fields='id, webViewLink', supportsAllDrives=True,
        ).execute()
        linkedin_folder_id = linkedin_folder['id']
        linkedin_folder_url = linkedin_folder.get('webViewLink', '')
        ok('LINKEDIN folder ID (new)', linkedin_folder_id)

    if shared_email:
        try:
            drive.permissions().create(
                fileId=linkedin_folder_id,
                body={'type': 'user', 'role': 'writer', 'emailAddress': shared_email},
                supportsAllDrives=True,
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
        spaces='drive', fields='files(id)', pageSize=1,
        includeItemsFromAllDrives=True, supportsAllDrives=True,
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
            fields='id', supportsAllDrives=True,
        ).execute()
        sheet_id = sheet_file['id']
        ok('Google Sheet ID (new)', sheet_id)

    try:
        ensure_sheet_tab(sheets, sheet_id, 'Topics', TOPICS_HEADERS)
        ensure_sheet_tab(sheets, sheet_id, 'Draft', PIPELINE_TAB_HEADERS)
        ensure_sheet_tab(sheets, sheet_id, 'Post', PIPELINE_TAB_HEADERS)
        ensure_sheet_tab(sheets, sheet_id, 'PostTemplates', POST_TEMPLATES_HEADERS)
        ok('Google Sheet tabs', 'Topics, Draft, Post, PostTemplates')
        print('  [info] Pipeline content (drafts, news runs) lives in Worker D1; apply migrations from `worker/` (see module docstring). No NewsResearch sheet is created.')
    except Exception as error:
        warn('Google Sheet tabs', str(error))

    print("\n[2/3] Checking for existing 'Published Posts' doc...")
    existing_doc = drive.files().list(
        q=(
            "name='Published Posts' and mimeType='application/vnd.google-apps.document' "
            f"and '{linkedin_folder_id}' in parents and trashed=false"
        ),
        spaces='drive', fields='files(id)', pageSize=1,
        includeItemsFromAllDrives=True, supportsAllDrives=True,
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
            fields='id', supportsAllDrives=True,
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
        gcs_bucket_name=gcs_bucket_name,
        doc_id=doc_id,
        linkedin_person_urn=linkedin_person_urn,
        credentials_json=normalized_creds_json,
    )
