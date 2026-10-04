"""YouTube upload via the Data API (resumable). One-time OAuth in the browser; token cached in .secrets/.
NOTE (official docs): videos from unverified API projects (created after 2020-07-28) are forced to PRIVATE until the
project passes Google's API compliance audit. Default visibility here is private for that reason."""
import json
import os
from pathlib import Path

from adapters.common import ROOT, secrets_dir

SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"]


def client_secrets() -> Path:
    p = Path(os.environ.get("YOUTUBE_OAUTH_CLIENT_JSON") or (secrets_dir() / "youtube_client.json"))
    if not p.exists():
        raise SystemExit(f"Missing Google OAuth client file: {p}\nCreate a 'Desktop app' OAuth client in Google Cloud Console "
                         "(APIs & Services > Credentials), enable YouTube Data API v3, download the JSON to that path.")
    return p


def credentials():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    tok = secrets_dir() / "youtube_token.json"
    creds = Credentials.from_authorized_user_file(str(tok), SCOPES) if tok.exists() else None
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    if not creds or not creds.valid:
        creds = InstalledAppFlow.from_client_secrets_file(str(client_secrets()), SCOPES).run_local_server(port=0)
    tok.write_text(creds.to_json())
    return creds


def upload(path: Path, title: str, description: str, tags: list, privacy: str = "private", synthetic: bool = True) -> dict:
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    yt = build("youtube", "v3", credentials=credentials(), cache_discovery=False)
    body = {"snippet": {"title": title[:100], "description": description, "tags": tags, "categoryId": "27"},
            "status": {"privacyStatus": privacy, "selfDeclaredMadeForKids": False, "containsSyntheticMedia": bool(synthetic)}}
    req = yt.videos().insert(part="snippet,status", body=body, media_body=MediaFileUpload(str(path), chunksize=8 * 1024 * 1024, resumable=True))
    resp = None
    while resp is None:
        status, resp = req.next_chunk()
        if status:
            print(f"  upload {int(status.progress() * 100)}%")
    vid = resp["id"]
    return {"id": vid, "url": f"https://youtube.com/shorts/{vid}", "privacy": resp.get("status", {}).get("privacyStatus", privacy)}
