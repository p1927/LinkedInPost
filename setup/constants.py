from __future__ import annotations

from pathlib import Path

# Google API OAuth scopes for Sheets, Drive, and Docs access.
SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/documents',
]

# Must match `PIPELINE_HEADERS` in `worker/src/persistence/drafts.ts`.
PIPELINE_TAB_HEADERS = [
    'Topic', 'Date', 'Status',
    'Variant 1', 'Variant 2', 'Variant 3', 'Variant 4',
    'Image Link 1', 'Image Link 2', 'Image Link 3', 'Image Link 4',
    'Selected Text', 'Selected Image ID', 'Post Time',
    'Email To', 'Email Cc', 'Email Bcc', 'Email Subject',
    'Topic rules', 'Image URLs JSON', 'Generation template id', 'Topic Id',
    'Delivery channel', 'Generation model',
]
# Column layout for the Topics sheet tab.
TOPICS_HEADERS = ['Topic', 'Date', 'Topic Id']
# Column layout for the Post Templates sheet tab.
POST_TEMPLATES_HEADERS = ['Template id', 'Name', 'Rules']

# Project root directory (resolved from this file's location).
ROOT = Path(__file__).resolve().parent.parent
# Path to the Cloudflare Worker source directory.
WORKER_DIR = ROOT / 'worker'
# Wrangler v2 config path for the backend worker.
WORKER_WRANGLER_CONFIG = WORKER_DIR / 'wrangler.jsonc'
# .dev.vars secret file path for local worker dev.
WORKER_DEV_VARS = WORKER_DIR / '.dev.vars'
# Path to the generation Worker source directory.
GEN_WORKER_DIR = ROOT / 'generation-worker'
# Wrangler config path for the generation worker.
GEN_WORKER_WRANGLER_CONFIG = GEN_WORKER_DIR / 'wrangler.jsonc'
# .dev.vars path for local generation worker dev.
GEN_WORKER_DEV_VARS = GEN_WORKER_DIR / '.dev.vars'
# D1 database name for the generation worker.
GEN_WORKER_DB_NAME = 'linkedin-gen-worker-db'
# Feature flags configuration file path.
FEATURES_YAML = ROOT / 'features.yaml'
