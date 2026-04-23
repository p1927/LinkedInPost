import os
import sys
import json
import json5
import datetime
import mimetypes
import re
from urllib.parse import quote, urlparse
import uuid
import requests
from dotenv import load_dotenv
load_dotenv()
from google.cloud import storage
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from scheduler.cloudflare_publish_scheduler import decide_publish_timing, schedule_linkedin_publish_with_worker

import linkedin_d1

# ==========================================
# CONFIGURATION
# ==========================================
# Google APIs
SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/documents']
SHEET_ID = os.environ.get('GOOGLE_SHEET_ID') # ID of your Google Sheet
GCS_BUCKET_NAME = os.environ.get('GOOGLE_CLOUD_STORAGE_BUCKET', '').strip()
GCS_OBJECT_PREFIX = os.environ.get('GOOGLE_CLOUD_STORAGE_PREFIX', 'linkedin-images').strip().strip('/')
GOOGLE_CREDENTIALS_JSON = os.environ.get('GOOGLE_CREDENTIALS_JSON') # Service Account JSON
GOOGLE_DOC_ID = os.environ.get('GOOGLE_DOC_ID') # ID of the 'Posted' Google Doc
DELETE_UNUSED_GENERATED_IMAGES = os.environ.get('DELETE_UNUSED_GENERATED_IMAGES', 'true').strip().lower() not in {'0', 'false', 'no'}

# Search configuration
SERPAPI_API_KEY = os.environ.get('SERPAPI_API_KEY', '').strip()
SERPAPI_BASE_URL = 'https://serpapi.com/search.json'
SERPAPI_QUERY_MAX_LEN = max(80, int(os.environ.get('SERPAPI_QUERY_MAX_LEN', '400')))
IMAGE_SEARCH_QUERY_MAX_CHARS = max(40, int(os.environ.get('IMAGE_SEARCH_QUERY_MAX_CHARS', '120')))
DRAFT_MODE = os.environ.get('DRAFT_MODE', '').strip().lower()
TARGET_TOPIC = os.environ.get('TARGET_TOPIC', '').strip()
TARGET_DATE = os.environ.get('TARGET_DATE', '').strip()
REFINE_TOPIC = os.environ.get('REFINE_TOPIC', '').strip()
REFINE_DATE = os.environ.get('REFINE_DATE', '').strip()
REFINE_BASE_TEXT = os.environ.get('REFINE_BASE_TEXT', '').strip()
REFINE_INSTRUCTIONS = os.environ.get('REFINE_INSTRUCTIONS', '').strip()

# LinkedIn API
LINKEDIN_ACCESS_TOKEN = os.environ.get('LINKEDIN_ACCESS_TOKEN')
LINKEDIN_PERSON_URN = os.environ.get('LINKEDIN_PERSON_URN') # e.g., urn:li:person:123456
WORKER_URL = os.environ.get('VITE_WORKER_URL', '').strip()
WORKER_SCHEDULER_SECRET = os.environ.get('WORKER_SCHEDULER_SECRET', '').strip()

TOPICS_SHEET = 'Topics'
DRAFT_SHEET = 'Draft'
POST_SHEET = 'Post'
TOPICS_HEADERS = ['Topic', 'Date', 'Topic Id']
PIPELINE_HEADERS = [
    'Topic', 'Date', 'Status',
    'Variant 1', 'Variant 2', 'Variant 3', 'Variant 4',
    'Image Link 1', 'Image Link 2', 'Image Link 3', 'Image Link 4',
    'Selected Text', 'Selected Image ID', 'Post Time',
]


def load_service_account_info():
    if not GOOGLE_CREDENTIALS_JSON:
        raise ValueError('Missing GOOGLE_CREDENTIALS_JSON')
    service_account_info = json.loads(GOOGLE_CREDENTIALS_JSON)
    private_key = service_account_info.get('private_key')
    if isinstance(private_key, str) and '\\n' in private_key:
        service_account_info['private_key'] = private_key.replace('\\n', '\n')
    return service_account_info


def validate_environment(action):
    """Fail fast with actionable guidance when required environment variables are missing."""
    required = {
        'publish': [
            'GOOGLE_SHEET_ID',
            'GOOGLE_CREDENTIALS_JSON',
            'LINKEDIN_ACCESS_TOKEN',
            'LINKEDIN_PERSON_URN',
        ],
    }

    worker_env = ('VITE_WORKER_URL', 'WORKER_SCHEDULER_SECRET')

    if action == 'draft':
        missing = [
            name for name in ['GOOGLE_SHEET_ID', 'GOOGLE_CLOUD_STORAGE_BUCKET', 'GOOGLE_CREDENTIALS_JSON']
            if not os.environ.get(name)
        ]
        if not SERPAPI_API_KEY:
            missing.append('SERPAPI_API_KEY')
        for name in worker_env:
            if not os.environ.get(name, '').strip():
                missing.append(name)
    else:
        missing = [name for name in required.get(action, []) if not os.environ.get(name)]
        if action == 'publish':
            for name in worker_env:
                if not os.environ.get(name, '').strip():
                    missing.append(name)

    if not missing:
        return

    print('Missing required environment variables for action:', action)
    for name in missing:
        print(f'- {name}')

    if 'GOOGLE_SHEET_ID' in missing:
        print(
            'GOOGLE_SHEET_ID is empty. In GitHub Actions this usually means the repository secret '
            'GOOGLE_SHEET_ID has not been added under Settings -> Secrets and variables -> Actions.'
        )

    print('The dashboard configuration UI does not update GitHub Actions secrets used by linkedin_bot.py.')
    sys.exit(1)

    
def should_process_target(topic, date_str):
    if not TARGET_TOPIC and not TARGET_DATE:
        return True

    if not TARGET_TOPIC or not TARGET_DATE:
        raise ValueError('TARGET_TOPIC and TARGET_DATE must be provided together.')

    return build_topic_key(topic, date_str) == build_topic_key(TARGET_TOPIC, TARGET_DATE)

# ==========================================
# GOOGLE APIS INIT
# ==========================================
def get_google_services():
    if not GOOGLE_CREDENTIALS_JSON:
        print("Missing GOOGLE_CREDENTIALS_JSON")
        return None, None, None
    creds_dict = load_service_account_info()
    creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
    sheets_service = build('sheets', 'v4', credentials=creds)
    docs_service = build('docs', 'v1', credentials=creds)
    storage_client = storage.Client.from_service_account_info(
        creds_dict,
        project=creds_dict.get('project_id'),
    )
    storage_bucket = storage_client.bucket(GCS_BUCKET_NAME)
    return sheets_service, docs_service, storage_bucket


def build_topic_key(topic, date_str):
    return f"{topic.strip()}::{date_str.strip()}"


def pad_row(row, width):
    return row + [''] * (width - len(row))


def ensure_required_sheets(sheets_service, include_draft_post_tabs=True):
    """Ensure Topics (and optionally Draft/Post) exist with correct headers using minimal API calls (2 reads)."""
    required = [
        (TOPICS_SHEET, TOPICS_HEADERS),
    ]
    if include_draft_post_tabs:
        required.extend([
            (DRAFT_SHEET, PIPELINE_HEADERS),
            (POST_SHEET, PIPELINE_HEADERS),
        ])

    # 1 read: get all sheet metadata at once
    metadata = sheets_service.spreadsheets().get(spreadsheetId=SHEET_ID).execute()
    existing_titles = {
        sheet.get('properties', {}).get('title')
        for sheet in metadata.get('sheets', [])
    }

    # create all missing sheets in one batchUpdate
    missing_sheets = [title for title, _ in required if title not in existing_titles]
    if missing_sheets:
        sheets_service.spreadsheets().batchUpdate(
            spreadsheetId=SHEET_ID,
            body={
                'requests': [
                    {'addSheet': {'properties': {'title': title}}}
                    for title in missing_sheets
                ]
            }
        ).execute()

    # 1 read: check all header rows at once
    header_ranges = [f"{title}!A1" for title, _ in required]
    batch_result = sheets_service.spreadsheets().values().batchGet(
        spreadsheetId=SHEET_ID,
        ranges=header_ranges,
    ).execute()
    value_ranges = batch_result.get('valueRanges', [])

    # write all missing headers in one batchUpdate
    missing_headers = []
    for i, (title, headers) in enumerate(required):
        vr = value_ranges[i].get('values', []) if i < len(value_ranges) else []
        first = vr[0] if vr else []
        if not first:
            missing_headers.append({'range': f'{title}!A1', 'values': [headers]})
            continue
        if title == TOPICS_SHEET and len(first) < len(TOPICS_HEADERS):
            missing_headers.append({'range': f'{title}!A1', 'values': [headers]})
    if missing_headers:
        sheets_service.spreadsheets().values().batchUpdate(
            spreadsheetId=SHEET_ID,
            body={'valueInputOption': 'RAW', 'data': missing_headers},
        ).execute()


def get_sheet_rows(sheets_service, sheet_name, expected_width):
    sheet_range = f"{sheet_name}!A2:{chr(ord('A') + expected_width - 1)}1000"
    result = sheets_service.spreadsheets().values().get(
        spreadsheetId=SHEET_ID,
        range=sheet_range,
    ).execute()
    return result.get('values', [])


def batch_get_sheet_rows(sheets_service, sheets):
    """Fetch multiple sheet ranges in a single API call.

    sheets: list of (sheet_name, expected_width) tuples
    Returns: list of row lists in the same order as input
    """
    ranges = [
        f"{name}!A2:{chr(ord('A') + width - 1)}1000"
        for name, width in sheets
    ]
    result = sheets_service.spreadsheets().values().batchGet(
        spreadsheetId=SHEET_ID,
        ranges=ranges,
    ).execute()
    return [vr.get('values', []) for vr in result.get('valueRanges', [])]


def build_existing_row_map(rows, expected_width):
    existing = {}
    for index, row in enumerate(rows, start=2):
        padded = pad_row(row, expected_width)
        topic = padded[0].strip()
        if not topic:
            continue
        key = build_topic_key(topic, padded[1])
        existing[key] = {
            'row_index': index,
            'row': padded,
        }
    return existing


def ensure_topic_ids_in_topics_sheet(sheets_service):
    """Backfill column C (Topic Id) so D1 / Worker rows align with the Topics sheet."""
    [topic_rows] = batch_get_sheet_rows(sheets_service, [(TOPICS_SHEET, 3)])
    updates = []
    for index, row in enumerate(topic_rows, start=2):
        padded = pad_row(row, 3)
        if not padded[0].strip():
            continue
        if padded[2].strip():
            continue
        new_id = str(uuid.uuid4())
        updates.append({'range': f'{TOPICS_SHEET}!C{index}', 'values': [[new_id]]})
    if updates:
        sheets_service.spreadsheets().values().batchUpdate(
            spreadsheetId=SHEET_ID,
            body={'valueInputOption': 'RAW', 'data': updates},
        ).execute()


def find_sheet_row_index_for_topic_date(sheets_service, sheet_name, topic, date_str):
    """1-based sheet row index for topic+date in column A:B, or None."""
    [rows] = batch_get_sheet_rows(sheets_service, [(sheet_name, 2)])
    key = build_topic_key(topic, date_str)
    for index, row in enumerate(rows, start=2):
        padded = pad_row(row, 2)
        if build_topic_key(padded[0], padded[1]) == key:
            return index
    return None


def read_topics_with_ids(sheets_service):
    """Topics rows with stable ids (column C)."""
    ensure_topic_ids_in_topics_sheet(sheets_service)
    [topic_rows] = batch_get_sheet_rows(sheets_service, [(TOPICS_SHEET, 3)])
    entries = []
    for index, row in enumerate(topic_rows, start=2):
        padded = pad_row(row, 3)
        if not padded[0].strip():
            continue
        tid = padded[2].strip()
        if not tid:
            continue
        entries.append({
            'row_index': index,
            'topic': padded[0].strip(),
            'date': padded[1].strip(),
            'topic_id': tid,
        })
    return entries


def topic_id_for_topic_date(sheets_service, topic, date_str):
    key = build_topic_key(topic, date_str)
    for entry in read_topics_with_ids(sheets_service):
        if build_topic_key(entry['topic'], entry['date']) == key:
            return entry['topic_id']
    return ''


def resolve_topic_row_index_from_merge(sheets_service, merged_row, key):
    tri = int(merged_row.get('topicRowIndex') or merged_row.get('rowIndex') or 0)
    if tri > 0:
        return tri
    for entry in read_topics_with_ids(sheets_service):
        if build_topic_key(entry['topic'], entry['date']) == key:
            return entry['row_index']
    return 0


def build_gcs_public_url(bucket_name, object_name):
    return f"https://storage.googleapis.com/{bucket_name}/{quote(object_name, safe='/')}"


def build_gcs_object_name(topic, index, mime_type):
    extension = mimetypes.guess_extension(mime_type) or '.jpg'
    if extension == '.jpe':
        extension = '.jpg'
    slug = re.sub(r'[^a-z0-9]+', '-', topic.lower()).strip('-') or 'image'
    timestamp = datetime.datetime.utcnow().strftime('%Y%m%d-%H%M%S')
    filename = f"{slug}-{timestamp}-{uuid.uuid4().hex[:8]}-{index}{extension}"
    if GCS_OBJECT_PREFIX:
        return f"{GCS_OBJECT_PREFIX}/{filename}"
    return filename


def parse_gcs_object_reference(url):
    value = (url or '').strip()
    if not value:
        return '', ''

    if value.startswith('gs://'):
        bucket_and_object = value[5:]
        bucket_name, _, object_name = bucket_and_object.partition('/')
        return bucket_name, object_name

    parsed = urlparse(value)
    host = parsed.netloc.lower()
    path = parsed.path.lstrip('/')

    if host == 'storage.googleapis.com':
        bucket_name, _, object_name = path.partition('/')
        return bucket_name, object_name

    if host.endswith('.storage.googleapis.com'):
        bucket_name = host[:-len('.storage.googleapis.com')]
        return bucket_name, path

    return '', ''


def delete_unused_gcs_images(storage_bucket, image_urls, selected_image_url):
    if not storage_bucket or not DELETE_UNUSED_GENERATED_IMAGES:
        return set()

    selected = (selected_image_url or '').strip()
    deleted_urls = set()

    for image_url in image_urls:
        candidate = (image_url or '').strip()
        if not candidate or candidate == selected:
            continue

        bucket_name, object_name = parse_gcs_object_reference(candidate)
        if bucket_name != storage_bucket.name or not object_name:
            continue

        try:
            storage_bucket.blob(object_name).delete()
            print(f"Deleted unused GCS image: {object_name}")
            deleted_urls.add(candidate)
        except Exception as error:
            print(f"Unable to delete unused GCS image '{candidate}': {error}")

    return deleted_urls


def clear_deleted_image_slots(row, deleted_urls):
    if not deleted_urls:
        return row[:]

    updated_row = row[:]
    for column_index in range(7, 11):
        if updated_row[column_index].strip() in deleted_urls:
            updated_row[column_index] = ''
    return updated_row


def extract_api_error(response):
    try:
        payload = response.json()
    except ValueError:
        return {
            'message': response.text[:1000],
            'status': response.status_code,
        }

    error = payload.get('error')
    if isinstance(error, dict):
        message = error.get('message', response.text[:1000])
    elif isinstance(error, str):
        message = error
    else:
        message = payload.get('message', response.text[:1000])

    return {
        'message': message,
        'status': response.status_code,
    }


def get_serpapi_fix_hints(status_code, message=''):
    normalized_message = (message or '').lower()
    hints = []

    if status_code in {401, 403} or 'api key' in normalized_message:
        hints.append('Verify SERPAPI_API_KEY is valid and available to the runtime environment.')

    if status_code == 429 or 'rate limit' in normalized_message:
        hints.append('Check the SerpApi account quota and retry after the current rate-limit window resets.')

    if status_code >= 500:
        hints.append('SerpApi returned a server-side error. Retry the request or inspect SerpApi status if the failure persists.')

    if not hints:
        hints.append('Verify the query is valid, the SerpApi key is active, and the account still has search credits available.')

    return hints


def cap_serpapi_query(query):
    """Keep SerpApi GET URLs within practical limits for very long topics."""
    q = normalize_search_text(query)
    if len(q) <= SERPAPI_QUERY_MAX_LEN:
        return q
    return q[:SERPAPI_QUERY_MAX_LEN].rstrip()


def log_serpapi_failure(feature_name, topic, response):
    details = extract_api_error(response)
    message = details['message']
    print(f"SerpApi {feature_name} request failed for topic '{topic}'.")
    print(f"- HTTP status: {details['status']}")
    print(f"- API message: {message}")

    print('- Likely fixes:')
    for hint in get_serpapi_fix_hints(response.status_code, message=message):
        print(f"  * {hint}")


def run_serpapi_search(topic, num_results, image_search=False):
    params = {
        'api_key': SERPAPI_API_KEY,
        'q': cap_serpapi_query(topic),
        'num': max(1, num_results),
        'safe': 'active',
        'hl': 'en',
        'no_cache': 'true',
    }

    if image_search:
        params['engine'] = 'google_images'
    else:
        params['engine'] = 'google'

    response = requests.get(SERPAPI_BASE_URL, params=params, timeout=30)
    if not response.ok:
        log_serpapi_failure('image' if image_search else 'research', topic, response)
        response.raise_for_status()

    payload = response.json()
    if payload.get('error'):
        message = payload.get('error')
        raise RuntimeError(f"SerpApi {'image' if image_search else 'research'} request failed for '{topic}': {message}")

    return payload


def first_non_empty(*values):
    for value in values:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ''


def normalize_search_text(value):
    return re.sub(r'\s+', ' ', value or '').strip()


def derive_search_subject(topic):
    subject = normalize_search_text(topic)
    if not subject:
        return ''

    subject = re.sub(
        r'\b\d+\s*(?:word|words|sentence|sentences|sentexteces|sentextece|line|lines|caption|captions)\b',
        ' ',
        subject,
        flags=re.IGNORECASE,
    )
    subject = re.sub(r'\b(?:in|within|under)\s+\d+\s*words?\b', ' ', subject, flags=re.IGNORECASE)
    subject = re.sub(r'\bwith\s+[^.?!,;]{0,120}?\bimages?\b.*$', ' ', subject, flags=re.IGNORECASE)
    subject = re.sub(r'\bwith\s+[^.?!,;]{0,120}?\bpictures?\b.*$', ' ', subject, flags=re.IGNORECASE)
    subject = normalize_search_text(subject)

    lowered = subject.lower()
    for separator in (' about ', ' on '):
        index = lowered.find(separator)
        if index > -1 and len(subject[:index].split()) <= 6:
            subject = subject[index + len(separator):]
            lowered = subject.lower()

    subject = re.sub(
        r'^(?:write|draft|create|generate|make|give|prepare|find|show)\s+',
        '',
        subject,
        flags=re.IGNORECASE,
    )
    subject = re.sub(r'^(?:a|an|the)\s+', '', subject, flags=re.IGNORECASE)
    subject = re.sub(r'^(?:topic|caption|captions|post|posts|sentence|sentences)\s+', '', subject, flags=re.IGNORECASE)
    subject = re.sub(r'^(?:about|on)\s+', '', subject, flags=re.IGNORECASE)
    subject = re.sub(r'\bfor\s+linkedin\b', ' ', subject, flags=re.IGNORECASE)
    subject = normalize_search_text(subject.strip(' -:,.'))

    return subject or normalize_search_text(topic)


def build_search_queries(topic, image_search=False):
    subject = derive_search_subject(topic)
    candidates = []

    def add_candidate(value):
        normalized = normalize_search_text(value)
        lowered = normalized.lower()
        if normalized and lowered not in seen:
            seen.add(lowered)
            candidates.append(normalized)

    seen = set()
    add_candidate(subject)

    if image_search:
        add_candidate(f'{subject} image')
        add_candidate(f'{subject} cartoon image')
        add_candidate(f'{subject} characters')
    else:
        add_candidate(f'{subject} cartoon')
        add_candidate(f'{subject} characters')
        add_candidate(f'{subject} background')

    add_candidate(topic)
    return candidates


def extract_requested_word_limit(*texts):
    patterns = [
        r'\b(?:make|keep|limit|under|within)\s+(?:it|them|each variant|each post|the post)?\s*(\d+)\s+words?\s+or\s+less\b',
        r'\b(\d+)\s+words?\s+or\s+less\b',
        r'\bunder\s+(\d+)\s+words?\b',
        r'\bwithin\s+(\d+)\s+words?\b',
        r'\bmax(?:imum)?\s+(\d+)\s+words?\b',
        r'\b(\d+)\s+word\b',
    ]

    for text in texts:
        normalized = normalize_search_text(text)
        if not normalized:
            continue
        for pattern in patterns:
            match = re.search(pattern, normalized, flags=re.IGNORECASE)
            if match:
                try:
                    limit = int(match.group(1))
                except (TypeError, ValueError):
                    continue
                if limit > 0:
                    return limit

    return None


def stringify_generated_variant(value):
    if value is None:
        return ''

    if isinstance(value, str):
        return value.strip()

    if isinstance(value, list):
        parts = [stringify_generated_variant(item) for item in value]
        return '\n'.join(part for part in parts if part).strip()

    if isinstance(value, dict):
        post_text = stringify_generated_variant(
            value.get('post')
            or value.get('text')
            or value.get('caption')
            or value.get('body')
            or value.get('content')
        )
        hashtags_value = value.get('hashtags') or value.get('tags') or []

        if isinstance(hashtags_value, str):
            hashtags = hashtags_value.strip()
        elif isinstance(hashtags_value, list):
            hashtags = ' '.join(
                stringify_generated_variant(item)
                for item in hashtags_value
                if stringify_generated_variant(item)
            ).strip()
        else:
            hashtags = ''

        if post_text and hashtags:
            return f'{post_text}\n\n{hashtags}'.strip()
        if post_text:
            return post_text
        if hashtags:
            return hashtags

        parts = []
        for key, item in value.items():
            rendered = stringify_generated_variant(item)
            if rendered:
                parts.append(rendered)
        return '\n'.join(parts).strip()

    return str(value).strip()


def normalize_generated_variants(content):
    if not isinstance(content, dict):
        raise ValueError(f'Expected variants JSON object, received {type(content).__name__}.')

    normalized = {}
    for index in range(1, 5):
        key = f'variant{index}'
        normalized[key] = stringify_generated_variant(content.get(key, ''))

    return normalized


def normalize_llm_image_query(text):
    """Short, SerpApi-friendly image search string: keywords/terms, no hashtags, length-capped."""
    if not isinstance(text, str):
        return ''
    without_tags = re.sub(r'#\w+', ' ', text)
    without_tags = re.sub(r'[,;]+', ' ', without_tags)
    s = normalize_search_text(without_tags)
    if len(s) > IMAGE_SEARCH_QUERY_MAX_CHARS:
        s = s[:IMAGE_SEARCH_QUERY_MAX_CHARS].rstrip()
    return s


def normalize_llm_image_queries(content):
    """Extract three deduplicated LLM image keyword queries from the generation payload."""
    if not isinstance(content, dict):
        return []
    seen = set()
    out = []
    for key in ('imageSearchQuery1', 'imageSearchQuery2', 'imageSearchQuery3'):
        q = normalize_llm_image_query(content.get(key, '') or '')
        if not q:
            continue
        low = q.lower()
        if low in seen:
            continue
        seen.add(low)
        out.append(q)
    return out


def build_image_serp_queries(topic, preferred_queries=None):
    """Ordered SerpApi image queries: LLM keyword queries first, then topic-derived fallbacks."""
    candidates = []
    seen_lower = set()

    def add_query(raw):
        q = normalize_search_text(raw or '')
        if not q:
            return
        q = cap_serpapi_query(q)
        low = q.lower()
        if low in seen_lower:
            return
        seen_lower.add(low)
        candidates.append(q)

    for q in preferred_queries or []:
        add_query(q)

    for q in build_search_queries(topic, image_search=True):
        add_query(q)

    return candidates


# ==========================================
# 1. RESEARCH & GENERATE (Worker LLM)
# ==========================================
def fetch_web_research(topic, num_results=3):
    print(f"Fetching web research for: {topic}")

    for query in build_search_queries(topic, image_search=False):
        try:
            print(f"Trying SerpApi research query: {query}")
            results = run_serpapi_search(query, num_results, image_search=False)
            research_lines = []
            for item in results.get('organic_results', []):
                title = first_non_empty(item.get('title', ''))
                snippet = first_non_empty(item.get('snippet', ''))
                link = first_non_empty(item.get('link', ''))
                if title or snippet or link:
                    research_lines.append(f"- {title or link or 'Result'}: {snippet or link}")

            if research_lines:
                return '\n'.join(research_lines) + '\n'

            answer_box = results.get('answer_box', {}) if isinstance(results, dict) else {}
            answer_summary = first_non_empty(
                answer_box.get('snippet', '') if isinstance(answer_box, dict) else '',
                answer_box.get('answer', '') if isinstance(answer_box, dict) else '',
            )
            if answer_summary:
                print(f"Using SerpApi answer box summary for '{query}' because no organic results were returned.")
                return f"- Summary: {answer_summary}\n"

            print(f"No SerpApi research items returned for query '{query}'. Response keys: {list(results.keys())}")
        except Exception as e:
            print(f"Error fetching SerpApi web research for query '{query}': {e}")

    return ""

def research_and_generate(topic, base_text='', refinement_instructions=''):
    """Uses the Cloudflare Worker (D1 github_automation LLM) to write 4 variants plus image-search keyword lines."""
    if not linkedin_d1.worker_base_url() or not linkedin_d1.worker_scheduler_secret():
        raise RuntimeError(
            'Draft LLM runs on the Worker. Set VITE_WORKER_URL and WORKER_SCHEDULER_SECRET for GitHub Actions / local draft.'
        )

    recipe_content = ''
    try:
        with open('recipe.md', 'r', encoding='utf-8') as f:
            recipe_content = f.read()
    except OSError as e:
        print(f'Could not read recipe.md: {e}')

    web_research = fetch_web_research(topic)
    word_limit = extract_requested_word_limit(refinement_instructions, topic)

    payload = {
        'topic': topic,
        'webResearch': web_research,
        'recipeContent': recipe_content,
        'baseText': base_text or '',
        'refinementInstructions': refinement_instructions or '',
        'wordLimitWords': word_limit,
        'imageSearchQueryMaxChars': IMAGE_SEARCH_QUERY_MAX_CHARS,
    }
    print('Generating variants via Worker /internal/github-automation-generate-variants')
    content = linkedin_d1.worker_github_automation_generate_variants(payload)
    image_queries = normalize_llm_image_queries(content)
    return normalize_generated_variants(content), image_queries

# ==========================================
# 2. IMAGE SEARCH & UPLOAD
# ==========================================
def fetch_images(topic, num_images=4, preferred_queries=None):
    """Collect up to ``num_images`` distinct image URLs, trying each Serp query until full or exhausted.

    Previously this returned on the first query that returned *any* images, so SerpApi only yielding
    e.g. two results left variant 3–4 with empty image links. We now merge results across queries.
    """
    print(f"Searching for images on: {topic}")
    if preferred_queries:
        print(f"Using {len(preferred_queries)} LLM image search queries before topic-derived fallbacks.")

    accumulated = []
    seen_urls = set()

    for query in build_image_serp_queries(topic, preferred_queries):
        if len(accumulated) >= num_images:
            break
        try:
            print(f"Trying SerpApi image query: {query}")
            results = run_serpapi_search(query, num_images, image_search=True)
        except Exception as e:
            print(f"SerpApi image request failed for '{query}': {e}")
            continue

        batch_added = 0
        for item in results.get('images_results', []) or []:
            if len(accumulated) >= num_images:
                break
            image_url = first_non_empty(item.get('original', ''), item.get('thumbnail', ''), item.get('link', ''))
            if image_url:
                normalized = image_url.strip()
                if normalized in seen_urls:
                    continue
                seen_urls.add(normalized)
                accumulated.append(image_url)
                batch_added += 1
                q_preview = query if len(query) <= 72 else query[:72] + '…'
                print(f"SerpApi image result {len(accumulated)} (query '{q_preview}'): {image_url}")

        if batch_added == 0:
            print(f"No SerpApi image items returned for query '{query}'. Raw response: {json.dumps(results)[:1000]}")

    return accumulated[:num_images]

def upload_image_to_gcs(storage_bucket, image_url, topic, index):
    try:
        print(f"Downloading image {index} for '{topic}': {image_url}")
        response = requests.get(image_url, stream=True, timeout=30)
        response.raise_for_status()
        mime_type = response.headers.get('Content-Type', 'image/jpeg').split(';')[0] or 'image/jpeg'
        
        if not mime_type.lower().startswith('image/'):
            print(f"Skipping URL {image_url} because it returned non-image content: {mime_type}")
            return "", ""
            
        object_name = build_gcs_object_name(topic, index, mime_type)
        blob = storage_bucket.blob(object_name)
        blob.upload_from_string(response.content, content_type=mime_type)
        try:
            blob.make_public()
        except Exception:
            pass  # Ignore uniform bucket-level access errors or ACL errors silently.
            
        public_url = build_gcs_public_url(storage_bucket.name, object_name)
        print(
            f"Uploaded image {index} for '{topic}' to GCS. "
            f"bucket={storage_bucket.name}, object={object_name}, public_url={public_url}"
        )
        return public_url, object_name
    except Exception as error:
        print(f"Error uploading image {index} to GCS: {error}")
        return "", ""


def fetch_and_upload_images(storage_bucket, topic, num_images=4, image_queries=None):
    # Request only num_images from SerpApi per successful query (sheet supports four slots).
    image_urls = fetch_images(topic, num_images=num_images, preferred_queries=image_queries)
    if not image_urls:
        print(f"No image URLs found for '{topic}'.")
        return [''] * num_images

    drive_links = []
    for idx, img_url in enumerate(image_urls, start=1):
        drive_link, drive_id = upload_image_to_gcs(storage_bucket, img_url, topic, len(drive_links) + 1)
        if drive_link:
            drive_links.append(drive_link)
        else:
            print(f"Image candidate {idx} for '{topic}' could not be uploaded. Skipping.")
            
        if len(drive_links) >= num_images:
            break

    drive_links += [''] * (num_images - len(drive_links))
    return drive_links[:num_images]

# ==========================================
# 3. LINKEDIN PUBLISHING
# ==========================================
def post_to_linkedin(text, image_url):
    """Posts to LinkedIn with an optional image."""
    print("Posting to LinkedIn...")
    # Register image if URL provided (simplified for text-only first, then image)
    # Note: Full LinkedIn Image posting requires registering the upload, uploading bytes, then creating post.
    # For a robust solution using an image URL, you often need to download it and upload to LinkedIn.
    
    post_url = "https://api.linkedin.com/v2/ugcPosts"
    headers = {
        "Authorization": f"Bearer {LINKEDIN_ACCESS_TOKEN}",
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json",
    }
    
    # Simple text post payload
    payload = {
        "author": LINKEDIN_PERSON_URN,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {
                    "text": text
                },
                "shareMediaCategory": "NONE"
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
    }
    
    # If dealing with images, we would change shareMediaCategory to IMAGE and add media array.
    # (Leaving image attachment on LinkedIn out for simplicity, but it can be added here)
    
    response = requests.post(post_url, headers=headers, json=payload)
    if response.status_code == 201:
        print("Successfully posted to LinkedIn!")
        return True
    else:
        print(f"Failed to post to LinkedIn: {response.status_code}")
        print(response.text)
        return False

# ==========================================
# 4. GOOGLE DOCS LOGGING
# ==========================================
def log_to_google_doc(docs_service, topic, text):
    """Appends the published post to the 'Posted' Google Doc."""
    if not GOOGLE_DOC_ID:
        print("GOOGLE_DOC_ID not set. Skipping logging to Google Docs.")
        return

    print(f"Logging post for '{topic}' to Google Doc...")
    try:
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        
        # We append to the end of the document.
        # First, find the end of the document.
        doc = docs_service.documents().get(documentId=GOOGLE_DOC_ID).execute()
        content = doc.get('body').get('content')
        # The end index is the end index of the last element minus 1
        end_index = content[-1].get('endIndex') - 1 if content else 1
        
        # Define the text to insert
        text_to_insert = f"\n\n==========================================\nDate: {now_str}\nTopic: {topic}\n\n{text}\n"
        
        batch_requests = [
            {
                'insertText': {
                    'location': {
                        'index': end_index,
                    },
                    'text': text_to_insert
                }
            }
        ]
        
        docs_service.documents().batchUpdate(
            documentId=GOOGLE_DOC_ID, body={'requests': batch_requests}).execute()
        print("Successfully logged to Google Doc.")
    except Exception as e:
        print(f"Error logging to Google Doc: {e}")

# ==========================================
# MAIN WORKFLOW (DRAFT OR PUBLISH) — D1 via Worker
# ==========================================
def process_drafts(sheets_service, storage_bucket):
    """Generate drafts and upsert Cloudflare D1 via Worker; optionally mirror rows to the Draft sheet."""
    mirror = linkedin_d1.mirror_sheet_enabled()
    ensure_required_sheets(sheets_service, include_draft_post_tabs=mirror)
    ensure_topic_ids_in_topics_sheet(sheets_service)
    topics = read_topics_with_ids(sheets_service)
    merged = linkedin_d1.worker_get_merged_rows()
    merged_by_key = {build_topic_key(r.get('topic', ''), r.get('date', '')): r for r in merged}

    new_mirror_rows = []
    target_found = False
    for entry in topics:
        topic = entry['topic']
        date_str = entry['date']
        topic_id = entry['topic_id']
        row_index = entry['row_index']

        if not should_process_target(topic, date_str):
            continue

        target_found = True
        key = build_topic_key(topic, date_str)
        existing = merged_by_key.get(key)
        if existing and linkedin_d1.merged_row_blocks_new_draft(existing):
            print(f"Skipping topic '{topic}' on '{date_str}' because it already has pipeline content in D1.")
            continue

        print(f"Drafting for topic: {topic}")
        variants, image_queries = research_and_generate(topic)
        drive_links = fetch_and_upload_images(
            storage_bucket, topic, num_images=4, image_queries=image_queries
        )
        carry = existing if isinstance(existing, dict) else None
        payload = linkedin_d1.build_worker_sheet_row(
            topic_row_index=row_index,
            topic_id=topic_id,
            topic=topic,
            date=date_str,
            status='Drafted',
            variant1=variants.get('variant1', ''),
            variant2=variants.get('variant2', ''),
            variant3=variants.get('variant3', ''),
            variant4=variants.get('variant4', ''),
            image_link1=drive_links[0],
            image_link2=drive_links[1],
            image_link3=drive_links[2],
            image_link4=drive_links[3],
            carry_from=carry,
        )
        linkedin_d1.worker_pipeline_upsert(payload)
        print(f"Saved draft for '{topic}' to D1 via Worker.")

        if mirror:
            new_mirror_rows.append([
                topic,
                date_str,
                'Drafted',
                variants.get('variant1', ''),
                variants.get('variant2', ''),
                variants.get('variant3', ''),
                variants.get('variant4', ''),
                drive_links[0],
                drive_links[1],
                drive_links[2],
                drive_links[3],
                '',
                '',
                '',
            ])

    if (TARGET_TOPIC or TARGET_DATE) and not target_found:
        raise ValueError(f"Unable to find topic '{TARGET_TOPIC}' on '{TARGET_DATE}'.")

    if mirror and new_mirror_rows:
        sheets_service.spreadsheets().values().append(
            spreadsheetId=SHEET_ID,
            range=f"{DRAFT_SHEET}!A:N",
            valueInputOption='RAW',
            insertDataOption='INSERT_ROWS',
            body={'values': new_mirror_rows},
        ).execute()
        print("Mirrored new drafts to the Draft sheet.")


def process_refinement(sheets_service, storage_bucket):
    mirror = linkedin_d1.mirror_sheet_enabled()
    ensure_required_sheets(sheets_service, include_draft_post_tabs=mirror)
    ensure_topic_ids_in_topics_sheet(sheets_service)

    if not REFINE_TOPIC or not REFINE_DATE:
        raise ValueError('REFINE_TOPIC and REFINE_DATE are required for refine mode.')

    merged = linkedin_d1.worker_get_merged_rows()
    refine_key = build_topic_key(REFINE_TOPIC, REFINE_DATE)
    match = None
    for r in merged:
        if build_topic_key(r.get('topic', ''), r.get('date', '')) == refine_key:
            match = r
            break

    if not match:
        raise ValueError(f"Unable to find pipeline row for topic '{REFINE_TOPIC}' on '{REFINE_DATE}' in D1.")

    topic = match.get('topic') or REFINE_TOPIC
    date_str = match.get('date') or REFINE_DATE
    topic_id = (match.get('topicId') or '').strip()
    topic_row_index = int(match.get('topicRowIndex') or match.get('rowIndex') or 0)
    if not topic_id or topic_row_index <= 0:
        entries = read_topics_with_ids(sheets_service)
        for e in entries:
            if build_topic_key(e['topic'], e['date']) == refine_key:
                topic_id = e['topic_id']
                topic_row_index = e['row_index']
                break
    if not topic_id:
        raise ValueError(f"Missing Topic Id for '{REFINE_TOPIC}' on '{REFINE_DATE}'.")

    print(f"Refining draft in D1 for topic '{topic}' dated '{date_str}'.")

    variants, image_queries = research_and_generate(
        topic, base_text=REFINE_BASE_TEXT, refinement_instructions=REFINE_INSTRUCTIONS
    )
    image_links = [
        match.get('imageLink1') or '',
        match.get('imageLink2') or '',
        match.get('imageLink3') or '',
        match.get('imageLink4') or '',
    ]

    if any(link.strip() for link in image_links):
        print(f"Reusing existing image links for '{topic}': {image_links}")
    else:
        print(f"No existing image links found for '{topic}'. Fetching a fresh set during refinement.")
        image_links = fetch_and_upload_images(
            storage_bucket, topic, num_images=4, image_queries=image_queries
        )

    payload = linkedin_d1.build_worker_sheet_row(
        topic_row_index=topic_row_index,
        topic_id=topic_id,
        topic=topic,
        date=date_str,
        status='Drafted',
        variant1=variants.get('variant1', ''),
        variant2=variants.get('variant2', ''),
        variant3=variants.get('variant3', ''),
        variant4=variants.get('variant4', ''),
        image_link1=image_links[0],
        image_link2=image_links[1],
        image_link3=image_links[2],
        image_link4=image_links[3],
        selected_text=match.get('selectedText') or '',
        selected_image_id=match.get('selectedImageId') or '',
        post_time=match.get('postTime') or '',
        carry_from=match,
    )
    linkedin_d1.worker_pipeline_upsert(payload)
    print(f"Saved refined variants for '{topic}' to D1.")

    if mirror:
        draft_idx = find_sheet_row_index_for_topic_date(sheets_service, DRAFT_SHEET, topic, date_str)
        updated_row = [
            topic,
            date_str,
            'Drafted',
            variants.get('variant1', ''),
            variants.get('variant2', ''),
            variants.get('variant3', ''),
            variants.get('variant4', ''),
            image_links[0],
            image_links[1],
            image_links[2],
            image_links[3],
            match.get('selectedText') or '',
            match.get('selectedImageId') or '',
            match.get('postTime') or '',
        ]
        if draft_idx:
            sheets_service.spreadsheets().values().update(
                spreadsheetId=SHEET_ID,
                range=f"{DRAFT_SHEET}!A{draft_idx}:N{draft_idx}",
                valueInputOption='RAW',
                body={'values': [updated_row]},
            ).execute()
            print(f"Mirrored refined draft to Draft sheet row {draft_idx}.")
        else:
            sheets_service.spreadsheets().values().append(
                spreadsheetId=SHEET_ID,
                range=f"{DRAFT_SHEET}!A:N",
                valueInputOption='RAW',
                insertDataOption='INSERT_ROWS',
                body={'values': [updated_row]},
            ).execute()
            print("Appended refined draft to Draft sheet (no existing row to update).")


def process_publishing(sheets_service, docs_service, storage_bucket):
    """Publish from D1-backed merged rows; optionally mirror Draft/Post sheet updates."""
    mirror = linkedin_d1.mirror_sheet_enabled()
    ensure_required_sheets(sheets_service, include_draft_post_tabs=mirror)
    ensure_topic_ids_in_topics_sheet(sheets_service)

    merged = linkedin_d1.worker_get_merged_rows()
    post_by_key = {}
    if mirror:
        [post_rows] = batch_get_sheet_rows(sheets_service, [(POST_SHEET, 14)])
        post_by_key = build_existing_row_map(post_rows, 14)

    now = datetime.datetime.now()
    draft_updates = []
    post_appends = []
    post_updates = []
    target_found = False

    for row in merged:
        topic = (row.get('topic') or '').strip()
        date_str = (row.get('date') or '').strip()
        if not topic:
            continue

        if not should_process_target(topic, date_str):
            continue

        target_found = True
        status = (row.get('status') or '').strip()
        status_l = status.lower()
        selected_text = (row.get('selectedText') or '').strip()
        selected_image_id = (row.get('selectedImageId') or '').strip()
        post_time_str = (row.get('postTime') or '').strip()
        topic_id = (row.get('topicId') or '').strip()
        key = build_topic_key(topic, date_str)

        existing_post = post_by_key.get(key) if mirror else None
        existing_post_status = existing_post['row'][2].lower() if existing_post else ''

        if existing_post_status == 'published':
            if mirror:
                d_idx = find_sheet_row_index_for_topic_date(sheets_service, DRAFT_SHEET, topic, date_str)
                if d_idx:
                    draft_updates.append({
                        'range': f"{DRAFT_SHEET}!C{d_idx}",
                        'values': [['Published']],
                    })
            continue

        if status_l == 'published':
            continue

        if status_l == 'blocked':
            print(f"Skipping blocked row: {topic}")
            continue

        if status_l == 'approved' and selected_text:
            try:
                timing = decide_publish_timing(now, post_time_str)
                if timing.should_schedule_with_worker and timing.scheduled_time is not None:
                    tid = topic_id or topic_id_for_topic_date(sheets_service, topic, date_str)
                    schedule_linkedin_publish_with_worker(
                        WORKER_URL,
                        WORKER_SCHEDULER_SECRET,
                        topic,
                        date_str,
                        post_time_str,
                        topic_id=tid or None,
                    )
                    print(f"Scheduled Cloudflare minute-level publish for topic '{topic}' at {post_time_str}.")
                    continue

                should_post = timing.should_publish_now
                if should_post:
                    print(f"Time to post topic: {topic}")
                    success = post_to_linkedin(selected_text, selected_image_id)

                    if success:
                        log_to_google_doc(docs_service, topic, selected_text)

                        image_urls = [
                            row.get('imageLink1') or '',
                            row.get('imageLink2') or '',
                            row.get('imageLink3') or '',
                            row.get('imageLink4') or '',
                        ]
                        deleted_urls = delete_unused_gcs_images(storage_bucket, image_urls, selected_image_id)

                        row_list = linkedin_d1.merged_dict_to_sheet_row_14(row)
                        published_row = clear_deleted_image_slots(row_list, deleted_urls)
                        published_row[2] = 'Published'

                        topic_row_index = resolve_topic_row_index_from_merge(sheets_service, row, key)
                        if topic_row_index <= 0:
                            raise ValueError(f"Unable to resolve Topics row index for '{topic}' on '{date_str}'.")

                        pub_at = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).strftime('%Y-%m-%dT%H:%M:%SZ')
                        tid_final = topic_id or topic_id_for_topic_date(sheets_service, topic, date_str)
                        if not tid_final:
                            raise ValueError(f"Missing topicId for '{topic}' on '{date_str}'.")

                        base_for_publish = {**row, 'topicId': tid_final}
                        upsert_payload = linkedin_d1.upsert_row_after_publish(
                            base_for_publish, published_row, topic_row_index, pub_at
                        )
                        linkedin_d1.worker_pipeline_upsert(upsert_payload)
                        print(f"Marked '{topic}' as Published in D1.")

                        if mirror:
                            d_idx = find_sheet_row_index_for_topic_date(sheets_service, DRAFT_SHEET, topic, date_str)
                            if d_idx:
                                draft_updates.append({
                                    'range': f"{DRAFT_SHEET}!A{d_idx}:N{d_idx}",
                                    'values': [published_row],
                                })
                            if key in post_by_key:
                                pri = post_by_key[key]['row_index']
                                post_updates.append({
                                    'range': f"{POST_SHEET}!A{pri}:N{pri}",
                                    'values': [published_row],
                                })
                            else:
                                post_appends.append(published_row)
            except ValueError as err:
                print(f"Publish step error for '{topic}': {err}")

    if (TARGET_TOPIC or TARGET_DATE) and not target_found:
        raise ValueError(f"Unable to find draft row for topic '{TARGET_TOPIC}' on '{TARGET_DATE}'.")

    if mirror:
        if draft_updates:
            sheets_service.spreadsheets().values().batchUpdate(
                spreadsheetId=SHEET_ID,
                body={'valueInputOption': 'RAW', 'data': draft_updates},
            ).execute()

        if post_updates:
            sheets_service.spreadsheets().values().batchUpdate(
                spreadsheetId=SHEET_ID,
                body={'valueInputOption': 'RAW', 'data': post_updates},
            ).execute()

        if post_appends:
            sheets_service.spreadsheets().values().append(
                spreadsheetId=SHEET_ID,
                range=f"{POST_SHEET}!A:N",
                valueInputOption='RAW',
                insertDataOption='INSERT_ROWS',
                body={'values': post_appends},
            ).execute()

        if draft_updates or post_updates or post_appends:
            print("Mirrored published posts to Draft/Post sheets.")


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else 'draft'
    validate_environment(action)
    
    sheets_service, docs_service, storage_bucket = get_google_services()
    if not sheets_service:
        sys.exit(1)
        
    if action == 'draft':
        if DRAFT_MODE == 'refine':
            process_refinement(sheets_service, storage_bucket)
        else:
            process_drafts(sheets_service, storage_bucket)
    elif action == 'publish':
        process_publishing(sheets_service, docs_service, storage_bucket)
    else:
        print("Unknown action. Use 'draft' or 'publish'.")