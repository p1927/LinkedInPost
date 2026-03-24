#!/usr/bin/env python3
"""
One-time setup script for LinkedIn Bot.

This script auto-creates all required Google resources (Sheet, Drive folder, Doc)
using your service account, shares them with your personal Gmail, optionally fetches
your LinkedIn Person URN, and prints the exact values needed as GitHub Secrets.

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
    docs   = build('docs',   'v1', credentials=creds)

    print(f"\nService account: {service_account_email}")
    user_email = input("Enter your personal Google email (for sharing access): ").strip()
    if not user_email:
        print("No email entered — resources will be owned by the service account only.")

    # ── 1. Google Sheet ───────────────────────────────────────────────────────
    print("\n[1/3] Creating Google Sheet...")
    spreadsheet = sheets.spreadsheets().create(body={
        'properties': {'title': 'LinkedIn Bot Content Calendar'},
        'sheets': [{
            'properties': {'title': 'Sheet1', 'sheetId': 0},
            'data': [{'startRow': 0, 'startColumn': 0, 'rowData': [{
                'values': [{'userEnteredValue': {'stringValue': h}} for h in SHEET_HEADERS]
            }]}],
        }],
    }).execute()
    sheet_id = spreadsheet['spreadsheetId']
    ok('Google Sheet ID', sheet_id)

    if user_email:
        drive.permissions().create(
            fileId=sheet_id,
            body={'type': 'user', 'role': 'writer', 'emailAddress': user_email}
        ).execute()
        ok('Sheet shared with', user_email)

    # ── 2. Drive folder ───────────────────────────────────────────────────────
    print("\n[2/3] Creating Google Drive folder for images...")
    folder = drive.files().create(
        body={'name': 'LinkedIn Bot Images', 'mimeType': 'application/vnd.google-apps.folder'},
        fields='id',
    ).execute()
    folder_id = folder['id']
    ok('Google Drive Folder ID', folder_id)
    # The Python bot (service account) is the only one that needs folder access.

    # ── 3. Google Doc ─────────────────────────────────────────────────────────
    print("\n[3/3] Creating Google Doc for published posts log...")
    doc = docs.documents().create(body={'title': 'LinkedIn Bot - Published Posts'}).execute()
    doc_id = doc['documentId']
    ok('Google Doc ID', doc_id)

    if user_email:
        drive.permissions().create(
            fileId=doc_id,
            body={'type': 'user', 'role': 'writer', 'emailAddress': user_email}
        ).execute()
        ok('Doc shared with', user_email)

    # ── Optional: LinkedIn Person URN ─────────────────────────────────────────
    li_urn = ''
    li_token = os.environ.get('LINKEDIN_ACCESS_TOKEN', '')
    if li_token:
        print("\n[Optional] Fetching LinkedIn Person URN...")
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
    print("  ADD THESE TO: GitHub Repo \u2192 Settings \u2192 Secrets \u2192 Actions")
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
    print("\nSetup complete. See SETUP.md for full instructions.\n")


if __name__ == '__main__':
    main()
