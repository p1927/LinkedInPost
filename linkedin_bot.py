import os
import sys
import json
import datetime
import requests
from dotenv import load_dotenv
load_dotenv()
import google.generativeai as genai
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
GOOGLE_MODEL = os.environ.get('GOOGLE_MODEL', 'gemini-1.5-flash')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Search API (using Google Custom Search here as an example for images and web research)
GOOGLE_SEARCH_API_KEY = os.environ.get('GOOGLE_SEARCH_API_KEY')
GOOGLE_SEARCH_CX = os.environ.get('GOOGLE_SEARCH_CX')

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


def validate_environment(action):
    """Fail fast with actionable guidance when required environment variables are missing."""
    required = {
        'draft': [
            'GOOGLE_SHEET_ID',
            'GOOGLE_DRIVE_FOLDER_ID',
            'GOOGLE_CREDENTIALS_JSON',
            'GEMINI_API_KEY',
            'GOOGLE_SEARCH_API_KEY',
            'GOOGLE_SEARCH_CX',
        ],
        'publish': [
            'GOOGLE_SHEET_ID',
            'GOOGLE_CREDENTIALS_JSON',
            'LINKEDIN_ACCESS_TOKEN',
            'LINKEDIN_PERSON_URN',
        ],
    }

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

# ==========================================
# GOOGLE APIS INIT
# ==========================================
def get_google_services():
    if not GOOGLE_CREDENTIALS_JSON:
        print("Missing GOOGLE_CREDENTIALS_JSON")
        return None, None
    creds_dict = json.loads(GOOGLE_CREDENTIALS_JSON)
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

# ==========================================
# 1. RESEARCH & GENERATE (GEMINI)
# ==========================================
def fetch_web_research(topic, num_results=3):
    """Searches for text snippets related to the topic using Google Custom Search."""
    print(f"Fetching web research for: {topic}")
    url = f"https://www.googleapis.com/customsearch/v1"
    params = {
        'q': topic,
        'cx': GOOGLE_SEARCH_CX,
        'key': GOOGLE_SEARCH_API_KEY,
        'num': num_results,
        'safe': 'active'
    }
    
    research_text = ""
    try:
        response = requests.get(url, params=params)
        results = response.json()
        if 'items' in results:
            for item in results['items']:
                research_text += f"- {item.get('title')}: {item.get('snippet')}\n"
    except Exception as e:
        print(f"Error fetching web research: {e}")
        
    return research_text

def research_and_generate(topic):
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

    prompt = f"""
    Act as an expert LinkedIn ghostwriter. Write 4 distinct, engaging variants for a LinkedIn post about the topic: "{topic}".
    
    Here is some web research on the topic to include in your post:
    {web_research}
    
    Follow this recipe/guideline for writing the post:
    {recipe_content}

    Make each variant distinct in tone (e.g., 1. Storytelling, 2. Analytical/Data-driven, 3. Short & Punchy, 4. Question/Engagement focused).
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
    """Searches for images related to the topic using Google Custom Search."""
    print(f"Searching for images on: {topic}")
    url = f"https://www.googleapis.com/customsearch/v1"
    params = {
        'q': topic,
        'cx': GOOGLE_SEARCH_CX,
        'key': GOOGLE_SEARCH_API_KEY,
        'searchType': 'image',
        'num': num_images,
        'safe': 'active'
    }
    response = requests.get(url, params=params)
    results = response.json()
    
    image_urls = []
    if 'items' in results:
        for item in results['items']:
            image_urls.append(item['link'])
    return image_urls

def upload_image_to_drive(drive_service, image_url, topic, index):
    """Downloads an image from the web and uploads it to Google Drive."""
    try:
        response = requests.get(image_url, stream=True)
        response.raise_for_status()
        
        file_metadata = {
            'name': f"{topic.replace(' ', '_')}_{index}.jpg",
            'parents': [DRIVE_FOLDER_ID]
        }
        media = MediaIoBaseUpload(io.BytesIO(response.content), mimetype='image/jpeg', resumable=True)
        file = drive_service.files().create(body=file_metadata, media_body=media, fields='id, webViewLink').execute()
        
        # Make the file readable by anyone with the link
        drive_service.permissions().create(
            fileId=file.get('id'),
            body={'type': 'anyone', 'role': 'reader'}
        ).execute()
        
        return file.get('webViewLink'), file.get('id')
    except Exception as e:
        print(f"Error uploading image {index}: {e}")
        return "", ""

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
    for row in topic_rows:
        padded = pad_row(row, 2)
        topic, date_str = padded[0].strip(), padded[1].strip()
        if not topic:
            continue

        key = build_topic_key(topic, date_str)
        if key in existing_drafts or key in existing_posts:
            continue

        print(f"Drafting for topic: {topic}")
        variants = research_and_generate(topic)

        image_urls = fetch_images(topic, num_images=4)
        drive_links = []
        for idx, img_url in enumerate(image_urls):
            drive_link, drive_id = upload_image_to_drive(drive_service, img_url, topic, idx + 1)
            drive_links.append(drive_link)

        drive_links += [''] * (4 - len(drive_links))
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

    if new_rows:
        sheets_service.spreadsheets().values().append(
            spreadsheetId=SHEET_ID,
            range=f"{DRAFT_SHEET}!A:N",
            valueInputOption='RAW',
            insertDataOption='INSERT_ROWS',
            body={'values': new_rows},
        ).execute()
        print("Saved generated drafts in the Draft sheet.")

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
    
    for i, row in enumerate(rows):
        row = pad_row(row, 14)
        topic, date_str, status = row[0], row[1], row[2]
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
        process_drafts(sheets_service, drive_service)
    elif action == 'publish':
        process_publishing(sheets_service, docs_service)
    else:
        print("Unknown action. Use 'draft' or 'publish'.")