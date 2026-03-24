# LinkedIn Automation Bot

This repository contains an automated workflow that connects Google Sheets (as a content calendar/table), Google Drive, OpenAI, Google Custom Search, and LinkedIn to automatically draft, research, and publish LinkedIn posts.

## How it works

1. **The Data Source:** You maintain a Google Sheet with a list of Topics and a "Status" column.
2. **Drafting (GitHub Actions):** Every hour, a GitHub Action runs `python linkedin_bot.py draft`. It looks for rows marked `Pending`.
   - It researches the topic using OpenAI.
   - It generates 4 distinct post variants (e.g., Storytelling, Analytical, Punchy, Engaging).
   - It searches for 4 relevant images via Google Custom Search.
   - It uploads the images to a Google Drive folder.
   - It updates the Google Sheet row with the 4 text variants and links to the 4 images, and changes the status to `Drafted`.
3. **Approval (Human-in-the-loop):** You review the Google Sheet. 
   - You paste your favorite text variant into the `Selected Text` column.
   - You paste the corresponding Drive image link into the `Selected Image ID` column (optional).
   - You set a `Post Time` (e.g., `2026-03-24 14:00`).
   - You change the Status to `Approved`.
4. **Publishing (GitHub Actions):** Every hour, the workflow also runs `python linkedin_bot.py publish`. It looks for rows marked `Approved` whose `Post Time` has passed.
   - It automatically posts the selected text and image to your LinkedIn account via the LinkedIn API.
   - It updates the status to `Published`.

## Setup Instructions

This workflow requires connecting several APIs. 

### 1. Web UI Setup (GitHub Pages)
1. In this repository, go to **Settings > Pages**.
2. Under "Build and deployment", select **GitHub Actions** as the source.
3. The `.github/workflows/deploy-pages.yml` workflow will automatically build and publish the React frontend.
4. Once deployed, visit your GitHub Pages URL to access the dashboard.

### 2. Google Sheets Setup
Create a new Google Sheet with the following columns (A to N):
- A: Topic
- B: Date (informational)
- C: Status (`Pending`, `Drafted`, `Approved`, `Published`)
- D to G: Variant 1, Variant 2, Variant 3, Variant 4 (Leave blank, the script fills these)
- H to K: Image Link 1, Image Link 2, Image Link 3, Image Link 4 (Leave blank, the script fills these)
- L: Selected Text (You fill this when approving)
- M: Selected Image ID (You fill this when approving)
- N: Post Time (Format: `YYYY-MM-DD HH:MM` - You fill this when approving)

### 3. Google Cloud API (Sheets, Drive & Docs)
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Enable the **Google Sheets API**, **Google Drive API**, and **Google Docs API**.
4. Create **Service Account** credentials. Download the JSON key file.
5. In your Google Sheet, click "Share" and share it with the email address of the service account you just created (give it Editor access).
6. Create a folder in Google Drive to store images, and share it with the service account email (Editor access). Note the Folder ID from the URL (`https://drive.google.com/drive/folders/<FOLDER_ID>`).
7. Create a Google Doc named "Posted" and share it with the service account email (Editor access). Note the Document ID from the URL (`https://docs.google.com/document/d/<DOCUMENT_ID>/edit`).
8. Keep the Service Account JSON string for GitHub Secrets.
9. **For the Web UI**: Create an OAuth 2.0 Client ID for a Web Application. Add your GitHub Pages URL to the "Authorized JavaScript origins". Add the Client ID to `frontend/src/main.tsx` as `VITE_GOOGLE_CLIENT_ID`.

### 3. Google Custom Search (Images)
1. In the Google Cloud Console, enable the **Custom Search API**.
2. Go to the [Programmable Search Engine](https://programmablesearchengine.google.com/) control panel.
3. Create a new search engine. Set it to search the entire web and enable **Image Search**.
4. Get your Search Engine ID (`CX`).
5. Create an API Key in Google Cloud Console.

### 4. Gemini API
1. Get an API key from [Google AI Studio](https://aistudio.google.com/).

### 5. LinkedIn API
1. Go to the [LinkedIn Developer Portal](https://developer.linkedin.com/).
2. Create an App.
3. Request access to the "Share on LinkedIn" and "Sign In with LinkedIn" products.
4. Generate an OAuth 2.0 Access Token with scopes `w_member_social`, `r_liteprofile`.
5. Get your Person URN (it looks like `urn:li:person:123456789`). You can find this by querying the `/v2/me` endpoint with your token.

### 6. GitHub Secrets Configuration
Go to your GitHub Repository -> Settings -> Secrets and variables -> Actions.
Add the following "New repository secrets":

- `GOOGLE_SHEET_ID`: The ID of your spreadsheet from its URL.
- `GOOGLE_DRIVE_FOLDER_ID`: The ID of the Drive folder you created.
- `GOOGLE_CREDENTIALS_JSON`: Paste the ENTIRE contents of the service account JSON file here.
- `GEMINI_API_KEY`: Your Gemini API key.
- `GOOGLE_SEARCH_API_KEY`: Your Google Custom Search API key.
- `GOOGLE_SEARCH_CX`: Your Google Custom Search Engine ID.
- `LINKEDIN_ACCESS_TOKEN`: Your LinkedIn access token.
- `LINKEDIN_PERSON_URN`: Your LinkedIn Person URN.
- `GOOGLE_DOC_ID`: The ID of the Google Doc used for logging published posts.

### Running it Locally
You can also run this script locally by creating a `.env` file with the above variables and running:
```bash
# To draft new posts
python linkedin_bot.py draft

# To publish approved posts
python linkedin_bot.py publish
```