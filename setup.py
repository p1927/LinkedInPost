#!/usr/bin/env python3
"""
One-time setup script for LinkedIn Bot.

This script creates all required Google resources inside a single 'LINKEDIN'
folder in Google Drive:

    LINKEDIN/
    ├── Content Calendar          (Google Sheet)
    ├── Images/                   (Drive folder — bot uploads images here)
    └── Published Posts           (Google Doc)

It uses your service account, shares the parent folder with your personal
Gmail, optionally fetches your LinkedIn Person URN, and prints the exact
values needed as GitHub Secrets.

Usage:
    python setup.py

Prerequisites:
    GOOGLE_CREDENTIALS_JSON  - your service account key JSON (as a string)
    LINKEDIN_ACCESS_TOKEN    - optional, to auto-fetch your Person URN

These can be set in a .env file or exported as shell variables.
"""
import os
import sys
import json
import requests
from dotenv import load_dotenv

load_dotenv()

from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

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


def ensure_sheet_tab(sheets, spreadsheet_id: str, title: str, headers: list[str]) -> None:
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
    print(f"  \u2713 {label}: {value}")


def fail(label: str, reason: str) -> None:
    print(f"  \u2717 {label}: {reason}")


def main() -> None:
    creds_json = os.environ.get('GOOGLE_CREDENTIALS_JSON')
    if not creds_json:
        fail('GOOGLE_CREDENTIALS_JSON', 'not set — add it to .env and retry')
        sys.exit(1)

    creds_dict = json.loads(creds_json)
    service_account_email = creds_dict.get('client_email', 'unknown')

    creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
    sheets = build('sheets', 'v4', credentials=creds)
    drive  = build('drive',  'v3', credentials=creds)

    print(f"\nService account: {service_account_email}")
    user_email = "99pratyush@gmail.com"
    print(f"Sharing resources with: {user_email}")

    # ── 0. Parent 'LINKEDIN' folder ───────────────────────────────────────────
    print("\n[0/4] Checking for existing 'LINKEDIN' folder in Google Drive...")
    
    # Check if LINKEDIN folder already exists
    existing = drive.files().list(
        q="name='LINKEDIN' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        spaces='drive',
        fields='files(id, webViewLink)',
        pageSize=1
    ).execute()
    
    if existing.get('files'):
        linkedin_folder_id = existing['files'][0]['id']
        ok('LINKEDIN folder ID (existing)', linkedin_folder_id)
        ok('LINKEDIN folder URL', existing['files'][0].get('webViewLink', ''))
    else:
        print("  Creating new LINKEDIN folder...")
        linkedin_folder = drive.files().create(
            body={'name': 'LINKEDIN', 'mimeType': 'application/vnd.google-apps.folder'},
            fields='id, webViewLink',
        ).execute()
        linkedin_folder_id = linkedin_folder['id']
        ok('LINKEDIN folder ID (new)', linkedin_folder_id)
        ok('LINKEDIN folder URL', linkedin_folder.get('webViewLink', ''))

    if user_email:
        drive.permissions().create(
            fileId=linkedin_folder_id,
            body={'type': 'user', 'role': 'writer', 'emailAddress': user_email}
        ).execute()
        ok('LINKEDIN folder shared with', user_email)

    # ── 1. Google Sheet (create via Drive API using MIME type) ─────────────────
    print("\n[1/4] Checking for existing 'Content Calendar' sheet...")

    existing_sheet = drive.files().list(
        q=f"name='Content Calendar' and mimeType='application/vnd.google-apps.spreadsheet' and '{linkedin_folder_id}' in parents and trashed=false",
        spaces='drive',
        fields='files(id)',
        pageSize=1
    ).execute()

    if existing_sheet.get('files'):
        sheet_id = existing_sheet['files'][0]['id']
        ok('Google Sheet ID (existing)', sheet_id)
    else:
        print("  Creating new Content Calendar sheet via Drive API...")
        sheet_file = drive.files().create(
            body={
                'name': 'Content Calendar',
                'mimeType': 'application/vnd.google-apps.spreadsheet',
                'parents': [linkedin_folder_id],
            },
            fields='id',
        ).execute()
        sheet_id = sheet_file['id']

        # Write headers using the Sheets API now that the file exists
        try:
            sheets = build('sheets', 'v4', credentials=creds)
            ensure_sheet_tab(sheets, sheet_id, 'Topics', TOPICS_HEADERS)
            ensure_sheet_tab(sheets, sheet_id, 'Draft', SHEET_HEADERS)
            ensure_sheet_tab(sheets, sheet_id, 'Post', SHEET_HEADERS)
            ok('Google Sheet ID (new, with headers)', sheet_id)
        except Exception as e:
            ok('Google Sheet ID (new, headers failed — add manually)', sheet_id)
            print(f"    Topics headers: {', '.join(TOPICS_HEADERS)}")
            print(f"    Draft/Post headers: {', '.join(SHEET_HEADERS)}")

    try:
        ensure_sheet_tab(sheets, sheet_id, 'Topics', TOPICS_HEADERS)
        ensure_sheet_tab(sheets, sheet_id, 'Draft', SHEET_HEADERS)
        ensure_sheet_tab(sheets, sheet_id, 'Post', SHEET_HEADERS)
    except Exception:
        print("  Warning: could not fully verify Topics/Draft/Post tabs. You can create them manually if needed.")

    # ── 2. Images subfolder inside LINKEDIN ───────────────────────────────────
    print("\n[2/4] Checking for existing 'Images' subfolder...")
    
    # Check if Images folder already exists inside LINKEDIN
    existing_images = drive.files().list(
        q=f"name='Images' and mimeType='application/vnd.google-apps.folder' and '{linkedin_folder_id}' in parents and trashed=false",
        spaces='drive',
        fields='files(id)',
        pageSize=1
    ).execute()
    
    if existing_images.get('files'):
        folder_id = existing_images['files'][0]['id']
        ok('Google Drive Images Folder ID (existing)', folder_id)
    else:
        print("  Creating new Images folder...")
        images_folder = drive.files().create(
            body={
                'name': 'Images',
                'mimeType': 'application/vnd.google-apps.folder',
                'parents': [linkedin_folder_id],
            },
            fields='id',
        ).execute()
        folder_id = images_folder['id']
        ok('Google Drive Images Folder ID (new)', folder_id)

    # ── 3. Google Doc (create via Drive API using MIME type) ───────────────────
    print("\n[3/4] Checking for existing 'Published Posts' doc...")

    existing_doc = drive.files().list(
        q=f"name='Published Posts' and mimeType='application/vnd.google-apps.document' and '{linkedin_folder_id}' in parents and trashed=false",
        spaces='drive',
        fields='files(id)',
        pageSize=1
    ).execute()

    if existing_doc.get('files'):
        doc_id = existing_doc['files'][0]['id']
        ok('Google Doc ID (existing)', doc_id)
    else:
        print("  Creating new Published Posts doc via Drive API...")
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

    # ── Optional: LinkedIn Person URN ─────────────────────────────────────────
    li_urn = ''
    li_token = os.environ.get('LINKEDIN_ACCESS_TOKEN', '')
    if li_token:
        print("\n[4/4] Fetching LinkedIn Person URN...")
        resp = requests.get(
            'https://api.linkedin.com/v2/me',
            headers={'Authorization': f'Bearer {li_token}'},
        )
        if resp.ok:
            li_urn = f"urn:li:person:{resp.json()['id']}"
            ok('LinkedIn Person URN', li_urn)
        else:
            fail('LinkedIn Person URN', f"status {resp.status_code} — set LINKEDIN_PERSON_URN manually")

    # ── Print GitHub Secrets ──────────────────────────────────────────────────
    print("\n" + "=" * 64)
    print("  All resources created inside your Google Drive 'LINKEDIN' folder.")
    print("  ADD THESE TO: GitHub Repo → Settings → Secrets → Actions")
    print("=" * 64)
    print(f"GOOGLE_SHEET_ID         = {sheet_id}")
    print(f"GOOGLE_DRIVE_FOLDER_ID  = {folder_id}")
    print(f"GOOGLE_DOC_ID           = {doc_id}")
    print(f"GOOGLE_CREDENTIALS_JSON = <paste full service account JSON>")
    print(f"GEMINI_API_KEY          = <your Gemini API key from aistudio.google.com>")
    print(f"GOOGLE_SEARCH_API_KEY   = <your Custom Search API key>")
    print(f"GOOGLE_SEARCH_CX        = <your Programmable Search Engine ID>")
    print(f"LINKEDIN_ACCESS_TOKEN   = <your LinkedIn OAuth 2.0 token>")
    if li_urn:
        print(f"LINKEDIN_PERSON_URN     = {li_urn}")
    else:
        print(f"LINKEDIN_PERSON_URN     = urn:li:person:<your_id>")
    print(f"VITE_GOOGLE_CLIENT_ID   = <your Google OAuth Web Client ID>")
    print("=" * 64)
    print(f"\nYour Google Drive folder: LINKEDIN/")
    print(f"  ├── Content Calendar          (Sheet  — ID: {sheet_id})")
    print(f"  ├── Images/                   (Folder — ID: {folder_id})")
    print(f"  └── Published Posts           (Doc    — ID: {doc_id})")
    print("\nSetup complete. See SETUP.md for full instructions.\n")


if __name__ == '__main__':
    main()
