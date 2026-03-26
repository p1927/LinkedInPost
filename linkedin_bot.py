import os
import sys
import json
import datetime
import requests
from dotenv import load_dotenv
load_dotenv()
import google.generativeai as genai
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
import io

# ==========================================
# CONFIGURATION
# ==========================================
# Google APIs
SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/documents']
SHEET_ID = os.environ.get('GOOGLE_SHEET_ID') # ID of your Google Sheet
DRIVE_FOLDER_ID = os.environ.get('GOOGLE_DRIVE_FOLDER_ID') # ID of a Google Drive folder to store images
GOOGLE_CREDENTIALS_JSON = os.environ.get('GOOGLE_CREDENTIALS_JSON') # Service Account JSON
GOOGLE_DOC_ID = os.environ.get('GOOGLE_DOC_ID') # ID of the 'Posted' Google Doc

# Gemini for Research and Post Generation
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
GOOGLE_MODEL = os.environ.get('GOOGLE_MODEL', 'gemini-2.5-flash')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Search configuration
VERTEX_AI_SEARCH_PROJECT_ID = os.environ.get('VERTEX_AI_SEARCH_PROJECT_ID', '').strip()
VERTEX_AI_SEARCH_LOCATION = os.environ.get('VERTEX_AI_SEARCH_LOCATION', 'global').strip() or 'global'
VERTEX_AI_SEARCH_ENGINE_ID = (
    os.environ.get('VERTEX_AI_SEARCH_ENGINE_ID', '').strip()
    or os.environ.get('VERTEX_AI_SEARCH_APP_ID', '').strip()
)
VERTEX_AI_SEARCH_SERVING_CONFIG = os.environ.get('VERTEX_AI_SEARCH_SERVING_CONFIG', '').strip()
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

TOPICS_SHEET = 'Topics'
DRAFT_SHEET = 'Draft'
POST_SHEET = 'Post'
TOPICS_HEADERS = ['Topic', 'Date']
PIPELINE_HEADERS = [
    'Topic', 'Date', 'Status',
    'Variant 1', 'Variant 2', 'Variant 3', 'Variant 4',
    'Image Link 1', 'Image Link 2', 'Image Link 3', 'Image Link 4',
    'Selected Text', 'Selected Image ID', 'Post Time',
]
DISCOVERY_ENGINE_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'


def load_service_account_info():
    if not GOOGLE_CREDENTIALS_JSON:
        raise ValueError('Missing GOOGLE_CREDENTIALS_JSON')
    service_account_info = json.loads(GOOGLE_CREDENTIALS_JSON)
    private_key = service_account_info.get('private_key')
    if isinstance(private_key, str) and '\\n' in private_key:
        service_account_info['private_key'] = private_key.replace('\\n', '\n')
    return service_account_info


def get_vertex_ai_search_project_id():
    if VERTEX_AI_SEARCH_PROJECT_ID:
        return VERTEX_AI_SEARCH_PROJECT_ID
    try:
        return load_service_account_info().get('project_id', '').strip()
    except Exception:
        return ''


def has_vertex_ai_search_config():
    return bool(VERTEX_AI_SEARCH_SERVING_CONFIG or VERTEX_AI_SEARCH_ENGINE_ID)


def get_vertex_serving_config():
    if VERTEX_AI_SEARCH_SERVING_CONFIG:
        return VERTEX_AI_SEARCH_SERVING_CONFIG

    project_id = get_vertex_ai_search_project_id()
    if not project_id or not VERTEX_AI_SEARCH_ENGINE_ID:
        return ''

    return (
        f'projects/{project_id}/locations/{VERTEX_AI_SEARCH_LOCATION}/collections/default_collection/'
        f'engines/{VERTEX_AI_SEARCH_ENGINE_ID}/servingConfigs/default_search'
    )


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

    if action == 'draft':
        missing = [
            name for name in ['GOOGLE_SHEET_ID', 'GOOGLE_DRIVE_FOLDER_ID', 'GOOGLE_CREDENTIALS_JSON', 'GEMINI_API_KEY']
            if not os.environ.get(name)
        ]

        if not get_vertex_serving_config():
            missing.append('VERTEX_AI_SEARCH_ENGINE_ID or VERTEX_AI_SEARCH_SERVING_CONFIG')
        if not get_vertex_ai_search_project_id():
            missing.append('VERTEX_AI_SEARCH_PROJECT_ID')
    else:
        missing = [name for name in required.get(action, []) if not os.environ.get(name)]

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

    print('The frontend Save Configuration button stores settings in your personal Google Drive app data.')
    print('It does not update GitHub Actions secrets used by linkedin_bot.py.')
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
        return None, None
    creds_dict = load_service_account_info()
    creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
    sheets_service = build('sheets', 'v4', credentials=creds)
    drive_service = build('drive', 'v3', credentials=creds)
    docs_service = build('docs', 'v1', credentials=creds)
    return sheets_service, drive_service, docs_service


def build_topic_key(topic, date_str):
    return f"{topic.strip()}::{date_str.strip()}"


def pad_row(row, width):
    return row + [''] * (width - len(row))


def ensure_sheet_exists(sheets_service, title, headers):
    metadata = sheets_service.spreadsheets().get(spreadsheetId=SHEET_ID).execute()
    sheets = metadata.get('sheets', [])
    existing_titles = {sheet.get('properties', {}).get('title') for sheet in sheets}

    if title not in existing_titles:
        sheets_service.spreadsheets().batchUpdate(
            spreadsheetId=SHEET_ID,
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
            }
        ).execute()

    header_range = f"{title}!A1"
    response = sheets_service.spreadsheets().values().get(
        spreadsheetId=SHEET_ID,
        range=header_range,
    ).execute()
    header_values = response.get('values', [])

    if not header_values:
        sheets_service.spreadsheets().values().update(
            spreadsheetId=SHEET_ID,
            range=header_range,
            valueInputOption='RAW',
            body={'values': [headers]},
        ).execute()


def ensure_required_sheets(sheets_service):
    ensure_sheet_exists(sheets_service, TOPICS_SHEET, TOPICS_HEADERS)
    ensure_sheet_exists(sheets_service, DRAFT_SHEET, PIPELINE_HEADERS)
    ensure_sheet_exists(sheets_service, POST_SHEET, PIPELINE_HEADERS)


def get_sheet_rows(sheets_service, sheet_name, expected_width):
    sheet_range = f"{sheet_name}!A2:{chr(ord('A') + expected_width - 1)}1000"
    result = sheets_service.spreadsheets().values().get(
        spreadsheetId=SHEET_ID,
        range=sheet_range,
    ).execute()
    return result.get('values', [])


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


def build_drive_preview_url(file_id):
    return f"https://drive.google.com/thumbnail?id={file_id}&sz=w1600"


def extract_google_api_error(response):
    try:
        payload = response.json()
    except ValueError:
        return {
            'message': response.text[:1000],
            'status': response.status_code,
            'reasons': [],
            'api_status': '',
        }

    error = payload.get('error', {})
    errors = error.get('errors', [])
    reasons = [entry.get('reason', '') for entry in errors if entry.get('reason')]

    return {
        'message': error.get('message', response.text[:1000]),
        'status': error.get('code', response.status_code),
        'reasons': reasons,
        'api_status': error.get('status', ''),
    }


def get_vertex_search_fix_hints(status_code, message='', api_status=''):
    normalized_message = (message or '').lower()
    normalized_status = (api_status or '').upper()
    hints = []

    if status_code == 404:
        hints.append('Verify VERTEX_AI_SEARCH_ENGINE_ID and VERTEX_AI_SEARCH_SERVING_CONFIG point to an existing Vertex AI Search app and serving config.')

    if status_code == 403 or normalized_status in {'PERMISSION_DENIED', 'UNAUTHENTICATED'}:
        hints.append('Ensure the Discovery Engine API is enabled and the service account from GOOGLE_CREDENTIALS_JSON can call Vertex AI Search.')
        hints.append('Grant the service account a role that includes discoveryengine.servingConfigs.search on the Vertex AI Search app.')

    if 'failed_precondition' in normalized_status.lower() or 'public website search' in normalized_message:
        hints.append('Vertex AI Search searchLite only supports public website search. For service-account auth, make sure the app is a website search app and the serving config is valid.')

    if 'enterprise edition' in normalized_message:
        hints.append('Enable Enterprise edition features for the Vertex AI Search website app before using text or image search results.')

    if 'advanced website indexing' in normalized_message:
        hints.append('Enable Advanced website indexing for the Vertex AI Search website app before using image search.')

    if not hints:
        hints.append('Verify the Vertex AI Search app is a website search engine, the serving config path is correct, and the service account has Discovery Engine search permission.')

    return hints


def log_vertex_search_failure(feature_name, topic, response):
    details = extract_google_api_error(response)
    message = details['message']
    api_status = details.get('api_status', '')
    print(f"Vertex AI Search {feature_name} request failed for topic '{topic}'.")
    print(f"- HTTP status: {details['status']}")
    print(f"- Google message: {message}")
    if api_status:
        print(f"- Google status: {api_status}")

    print('- Likely fixes:')
    for hint in get_vertex_search_fix_hints(response.status_code, message=message, api_status=api_status):
        print(f"  * {hint}")


def build_vertex_search_headers():
    creds = Credentials.from_service_account_info(
        load_service_account_info(),
        scopes=[DISCOVERY_ENGINE_SCOPE],
    )
    creds.refresh(GoogleAuthRequest())
    headers = {
        'Authorization': f'Bearer {creds.token}',
        'Content-Type': 'application/json',
    }

    project_id = get_vertex_ai_search_project_id()
    if project_id:
        headers['X-Goog-User-Project'] = project_id

    return headers


def build_vertex_search_url():
    serving_config = get_vertex_serving_config()
    if not serving_config:
        raise ValueError('Missing Vertex AI Search serving config. Set VERTEX_AI_SEARCH_ENGINE_ID or VERTEX_AI_SEARCH_SERVING_CONFIG.')
    return f'https://discoveryengine.googleapis.com/v1/{serving_config}:search', serving_config


def extract_vertex_candidate_maps(result):
    document = result.get('document', {}) if isinstance(result, dict) else {}
    return [
        result if isinstance(result, dict) else {},
        document if isinstance(document, dict) else {},
        document.get('derivedStructData', {}) if isinstance(document, dict) else {},
        document.get('structData', {}) if isinstance(document, dict) else {},
        document.get('jsonData', {}) if isinstance(document, dict) else {},
    ]


def first_non_empty(*values):
    for value in values:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ''


def extract_vertex_snippet(result):
    for candidate in extract_vertex_candidate_maps(result):
        snippet = first_non_empty(candidate.get('snippet', ''), candidate.get('htmlSnippet', ''))
        if snippet:
            return snippet

        snippets = candidate.get('snippets', [])
        if isinstance(snippets, list):
            for entry in snippets:
                if isinstance(entry, dict):
                    snippet = first_non_empty(entry.get('snippet', ''), entry.get('htmlSnippet', ''))
                    if snippet:
                        return snippet

        extractive_answers = candidate.get('extractiveAnswers', [])
        if isinstance(extractive_answers, list):
            for entry in extractive_answers:
                if isinstance(entry, dict):
                    snippet = first_non_empty(entry.get('content', ''), entry.get('snippet', ''))
                    if snippet:
                        return snippet

    return ''


def extract_vertex_title_and_link(result):
    title = ''
    link = ''
    for candidate in extract_vertex_candidate_maps(result):
        if not title:
            title = first_non_empty(candidate.get('title', ''), candidate.get('htmlTitle', ''))
        if not link:
            image = candidate.get('image', {})
            link = first_non_empty(
                candidate.get('link', ''),
                candidate.get('uri', ''),
                image.get('link', '') if isinstance(image, dict) else '',
                image.get('contextLink', '') if isinstance(image, dict) else '',
            )
        if title and link:
            break
    return title, link


def run_vertex_search(topic, page_size, image_search=False):
    url, serving_config = build_vertex_search_url()
    payload = {
        'servingConfig': serving_config,
        'query': topic,
        'pageSize': page_size,
        'safeSearch': True,
        'userPseudoId': 'linkedin-bot',
    }

    if image_search:
        payload['params'] = {
            'search_type': 1,
            'searchType': 1,
        }
    else:
        payload['contentSearchSpec'] = {
            'snippetSpec': {
                'returnSnippet': True,
            }
        }

    response = requests.post(url, headers=build_vertex_search_headers(), json=payload, timeout=30)
    if not response.ok:
        log_vertex_search_failure('image' if image_search else 'research', topic, response)
        response.raise_for_status()
    return response.json()


# ==========================================
# 1. RESEARCH & GENERATE (GEMINI)
# ==========================================
def fetch_web_research(topic, num_results=3):
    research_text = ""
    print(f"Fetching web research for: {topic}")

    try:
        results = run_vertex_search(topic, num_results, image_search=False)
        for item in results.get('results', []):
            title, _link = extract_vertex_title_and_link(item)
            snippet = extract_vertex_snippet(item)
            if title or snippet:
                research_text += f"- {title or 'Result'}: {snippet}\n"

        if not research_text:
            print(f"No Vertex AI Search research items returned for topic '{topic}'. Response keys: {list(results.keys())}")
    except Exception as e:
        print(f"Error fetching Vertex AI Search web research: {e}")
        
    return research_text

def research_and_generate(topic, base_text='', refinement_instructions=''):
    """Uses LLM to write 4 variants of a LinkedIn post based on the topic."""
    print(f"Generating variants with model: {GOOGLE_MODEL}")
    # Read the recipe
    recipe_content = ""
    try:
        with open("recipe.md", "r", encoding="utf-8") as f:
            recipe_content = f.read()
    except Exception as e:
        print(f"Could not read recipe.md: {e}")

    # Fetch web research
    web_research = fetch_web_research(topic)

    refinement_context = ""
    if base_text:
        refinement_context += f'\nUse this draft as the starting point and preserve its strongest ideas:\n"""{base_text}"""\n'

    if refinement_instructions:
        refinement_context += f'\nApply these improvement notes while generating the new variants:\n{refinement_instructions}\n'

    prompt = f"""
    Act as an expert LinkedIn ghostwriter. Write 4 distinct, engaging variants for a LinkedIn post about the topic: "{topic}".
    
    Here is some web research on the topic to include in your post:
    {web_research}
    
    Follow this recipe/guideline for writing the post:
    {recipe_content}

    {refinement_context}

    Make each variant distinct in tone (e.g., 1. Storytelling, 2. Analytical/Data-driven, 3. Short & Punchy, 4. Question/Engagement focused).
    If a draft and refinement notes are provided, treat them as instructions to improve the post instead of starting from scratch.
    Do NOT include hashtags in the text block itself, but keep them at the end.
    
    Output JSON format ONLY:
    {{
        "variant1": "...",
        "variant2": "...",
        "variant3": "...",
        "variant4": "..."
    }}
    """
    
    model = genai.GenerativeModel(GOOGLE_MODEL)
    response = model.generate_content(
        prompt,
        generation_config={"response_mime_type": "application/json"}
    )
    
    content = json.loads(response.text)
    return content

# ==========================================
# 2. IMAGE SEARCH & UPLOAD
# ==========================================
def fetch_images(topic, num_images=4):
    print(f"Searching for images on: {topic}")

    try:
        results = run_vertex_search(topic, num_images, image_search=True)
    except Exception as e:
        print(f"Vertex AI Search image request failed for '{topic}': {e}")
        return []
    
    image_urls = []
    if 'results' in results:
        for index, item in enumerate(results['results'], start=1):
            _title, image_url = extract_vertex_title_and_link(item)
            image_urls.append(image_url)
            print(f"Vertex AI Search image result {index} for '{topic}': {image_url}")
    else:
        print(f"No Vertex AI Search image items returned for '{topic}'. Raw response: {json.dumps(results)[:1000]}")

    return image_urls

def upload_image_to_drive(drive_service, image_url, topic, index):
    """Downloads an image from the web and uploads it to Google Drive."""
    try:
        print(f"Downloading image {index} for '{topic}': {image_url}")
        response = requests.get(image_url, stream=True, timeout=30)
        response.raise_for_status()
        mime_type = response.headers.get('Content-Type', 'image/jpeg').split(';')[0] or 'image/jpeg'
        
        file_metadata = {
            'name': f"{topic.replace(' ', '_')}_{index}.jpg",
            'parents': [DRIVE_FOLDER_ID]
        }
        media = MediaIoBaseUpload(io.BytesIO(response.content), mimetype=mime_type, resumable=True)
        file = drive_service.files().create(body=file_metadata, media_body=media, fields='id, webViewLink, webContentLink').execute()
        
        # Make the file readable by anyone with the link
        drive_service.permissions().create(
            fileId=file.get('id'),
            body={'type': 'anyone', 'role': 'reader'}
        ).execute()

        file_id = file.get('id')
        preview_url = build_drive_preview_url(file_id)
        print(
            f"Uploaded image {index} for '{topic}'. "
            f"file_id={file_id}, preview_url={preview_url}, webViewLink={file.get('webViewLink')}"
        )
        
        return preview_url, file_id
    except Exception as e:
        print(f"Error uploading image {index}: {e}")
        return "", ""


def fetch_and_upload_images(drive_service, topic, num_images=4):
    image_urls = fetch_images(topic, num_images=num_images)
    if not image_urls:
        print(f"No image URLs found for '{topic}'.")
        return [''] * num_images

    drive_links = []
    for idx, img_url in enumerate(image_urls, start=1):
        drive_link, drive_id = upload_image_to_drive(drive_service, img_url, topic, idx)
        if not drive_link:
            print(f"Image {idx} for '{topic}' could not be uploaded. drive_id={drive_id}")
        drive_links.append(drive_link)

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
# MAIN WORKFLOW (DRAFT OR PUBLISH)
# ==========================================
def process_drafts(sheets_service, drive_service):
    """Reads pending topics, generates content & images, saves drafts to Sheet."""
    ensure_required_sheets(sheets_service)
    topic_rows = get_sheet_rows(sheets_service, TOPICS_SHEET, 2)
    draft_rows = get_sheet_rows(sheets_service, DRAFT_SHEET, 14)
    post_rows = get_sheet_rows(sheets_service, POST_SHEET, 14)

    existing_drafts = build_existing_row_map(draft_rows, 14)
    existing_posts = build_existing_row_map(post_rows, 14)

    new_rows = []
    target_found = False
    for row in topic_rows:
        padded = pad_row(row, 2)
        topic, date_str = padded[0].strip(), padded[1].strip()
        if not topic:
            continue

        if not should_process_target(topic, date_str):
            continue

        target_found = True

        key = build_topic_key(topic, date_str)
        if key in existing_drafts or key in existing_posts:
            print(f"Skipping topic '{topic}' on '{date_str}' because it already has a draft or published row.")
            continue

        print(f"Drafting for topic: {topic}")
        variants = research_and_generate(topic)
        drive_links = fetch_and_upload_images(drive_service, topic, num_images=4)
        new_rows.append([
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

    if new_rows:
        sheets_service.spreadsheets().values().append(
            spreadsheetId=SHEET_ID,
            range=f"{DRAFT_SHEET}!A:N",
            valueInputOption='RAW',
            insertDataOption='INSERT_ROWS',
            body={'values': new_rows},
        ).execute()
        print("Saved generated drafts in the Draft sheet.")


def process_refinement(sheets_service, drive_service):
    ensure_required_sheets(sheets_service)
    draft_rows = get_sheet_rows(sheets_service, DRAFT_SHEET, 14)
    existing_drafts = build_existing_row_map(draft_rows, 14)
    refine_key = build_topic_key(REFINE_TOPIC, REFINE_DATE)
    existing_draft = existing_drafts.get(refine_key)

    if not REFINE_TOPIC or not REFINE_DATE:
        raise ValueError('REFINE_TOPIC and REFINE_DATE are required for refine mode.')

    if not existing_draft:
        raise ValueError(f"Unable to find draft row for topic '{REFINE_TOPIC}' on '{REFINE_DATE}'.")

    row_index = existing_draft['row_index']
    existing_row = existing_draft['row']
    topic = existing_row[0]
    date_str = existing_row[1]
    print(f"Refining draft row {row_index} for topic '{topic}' dated '{date_str}'.")

    variants = research_and_generate(topic, base_text=REFINE_BASE_TEXT, refinement_instructions=REFINE_INSTRUCTIONS)
    image_links = existing_row[7:11]

    if any(link.strip() for link in image_links):
        print(f"Reusing existing image links for '{topic}': {image_links}")
    else:
        print(f"No existing image links found for '{topic}'. Fetching a fresh set during refinement.")
        image_links = fetch_and_upload_images(drive_service, topic, num_images=4)

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
        '',
        '',
        '',
    ]

    sheets_service.spreadsheets().values().update(
        spreadsheetId=SHEET_ID,
        range=f"{DRAFT_SHEET}!A{row_index}:N{row_index}",
        valueInputOption='RAW',
        body={'values': [updated_row]},
    ).execute()
    print(f"Saved refined variants for '{topic}' to row {row_index}.")

def process_publishing(sheets_service, docs_service):
    """Finds 'Approved' rows whose scheduled time has passed and posts them."""
    ensure_required_sheets(sheets_service)
    rows = get_sheet_rows(sheets_service, DRAFT_SHEET, 14)
    post_rows = get_sheet_rows(sheets_service, POST_SHEET, 14)
    existing_posts = build_existing_row_map(post_rows, 14)

    now = datetime.datetime.now()
    draft_updates = []
    post_appends = []
    post_updates = []
    target_found = False
    
    for i, row in enumerate(rows):
        row = pad_row(row, 14)
        topic, date_str, status = row[0], row[1], row[2]
        if not topic:
            continue

        if not should_process_target(topic, date_str):
            continue

        target_found = True
        selected_text = row[11] # Col L
        selected_image_id = row[12] # Col M
        post_time_str = row[13] # Col N - expect format "YYYY-MM-DD HH:MM"
        key = build_topic_key(topic, date_str)
        existing_post = existing_posts.get(key)
        existing_post_status = existing_post['row'][2].lower() if existing_post else ''

        if existing_post_status == 'published':
            draft_updates.append({
                'range': f"{DRAFT_SHEET}!C{i + 2}",
                'values': [['Published']]
            })
            continue
        
        if status.lower() == 'approved' and selected_text:
            try:
                if post_time_str:
                    post_time = datetime.datetime.strptime(post_time_str, "%Y-%m-%d %H:%M")
                    should_post = now >= post_time
                else:
                    should_post = True  # No time set — post immediately
                if should_post:
                    print(f"Time to post topic: {topic}")
                    success = post_to_linkedin(selected_text, selected_image_id)
                    
                    if success:
                        log_to_google_doc(docs_service, topic, selected_text)

                        row_index = i + 2
                        published_row = row[:]
                        published_row[2] = 'Published'
                        draft_updates.append({
                            'range': f"{DRAFT_SHEET}!C{row_index}",
                            'values': [['Published']]
                        })

                        if key in existing_posts:
                            post_row_index = existing_posts[key]['row_index']
                            post_updates.append({
                                'range': f"{POST_SHEET}!A{post_row_index}:N{post_row_index}",
                                'values': [published_row]
                            })
                        else:
                            post_appends.append(published_row)
            except ValueError:
                print(f"Invalid date format in row {i+2}: {post_time_str}")

    if (TARGET_TOPIC or TARGET_DATE) and not target_found:
        raise ValueError(f"Unable to find draft row for topic '{TARGET_TOPIC}' on '{TARGET_DATE}'.")

    if draft_updates:
        for update in draft_updates:
            sheets_service.spreadsheets().values().update(
                spreadsheetId=SHEET_ID,
                range=update['range'],
                valueInputOption="RAW",
                body={'values': update['values']}
            ).execute()

    if post_updates:
        for update in post_updates:
            sheets_service.spreadsheets().values().update(
                spreadsheetId=SHEET_ID,
                range=update['range'],
                valueInputOption='RAW',
                body={'values': update['values']}
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
        print("Updated published posts in the Draft and Post sheets.")


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else 'draft'
    validate_environment(action)
    
    sheets_service, drive_service, docs_service = get_google_services()
    if not sheets_service:
        sys.exit(1)
        
    if action == 'draft':
        if DRAFT_MODE == 'refine':
            process_refinement(sheets_service, drive_service)
        else:
            process_drafts(sheets_service, drive_service)
    elif action == 'publish':
        process_publishing(sheets_service, docs_service)
    else:
        print("Unknown action. Use 'draft' or 'publish'.")