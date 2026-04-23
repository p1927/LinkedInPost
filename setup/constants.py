from __future__ import annotations

from pathlib import Path

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
]
TOPICS_HEADERS = ['Topic', 'Date', 'Topic Id']
POST_TEMPLATES_HEADERS = ['Template id', 'Name', 'Rules']

ROOT = Path(__file__).resolve().parent.parent
WORKER_DIR = ROOT / 'worker'
WORKER_WRANGLER_CONFIG = WORKER_DIR / 'wrangler.jsonc'
WORKER_DEV_VARS = WORKER_DIR / '.dev.vars'
GEN_WORKER_DIR = ROOT / 'generation-worker'
GEN_WORKER_WRANGLER_CONFIG = GEN_WORKER_DIR / 'wrangler.jsonc'
GEN_WORKER_DEV_VARS = GEN_WORKER_DIR / '.dev.vars'
GEN_WORKER_DB_NAME = 'linkedin-gen-worker-db'
FEATURES_YAML = ROOT / 'features.yaml'
