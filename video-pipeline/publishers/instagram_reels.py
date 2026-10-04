"""Instagram Reels via the Instagram Graph API (same host/version as worker/src/integrations/instagram).
Token: .secrets/instagram.json (refreshable) else INSTAGRAM_ACCESS_TOKEN from .env."""
import json
import time
from datetime import datetime, timezone

import requests

from adapters.common import env, secrets_dir

BASE = "https://graph.instagram.com/v25.0"
TOKEN_FILE = "instagram.json"


def token() -> str:
    f = secrets_dir() / TOKEN_FILE
    if f.exists():
        return json.loads(f.read_text())["access_token"]
    return env("INSTAGRAM_ACCESS_TOKEN")


def _err(j: dict) -> str:
    return (j.get("error") or {}).get("message", str(j))[:300]


def me() -> dict:
    r = requests.get(f"{BASE}/me", params={"fields": "user_id,username,account_type", "access_token": token()}, timeout=30)
    j = r.json()
    if "error" in j:
        raise RuntimeError(f"Instagram token check failed: {_err(j)}")
    return j


def refresh() -> str:
    r = requests.get("https://graph.instagram.com/refresh_access_token",
                     params={"grant_type": "ig_refresh_token", "access_token": token()}, timeout=30)
    j = r.json()
    if "error" in j:
        raise RuntimeError(f"Instagram token refresh failed: {_err(j)} (an expired token cannot be refreshed; generate a new one)")
    (secrets_dir() / TOKEN_FILE).write_text(json.dumps({"access_token": j["access_token"],
        "refreshed_at": datetime.now(timezone.utc).isoformat(), "expires_in": j.get("expires_in")}))
    return f"refreshed; valid for {round(j.get('expires_in', 0) / 86400)} days"


def publish_reel(video_url: str, caption: str, share_to_feed: bool = True, cover_url: str = None) -> dict:
    t = token()
    uid = me()["user_id"]
    data = {"media_type": "REELS", "video_url": video_url, "caption": caption,
            "share_to_feed": str(share_to_feed).lower(), "access_token": t}
    if cover_url:
        data["cover_url"] = cover_url
    j = requests.post(f"{BASE}/{uid}/media", data=data, timeout=120).json()
    if "id" not in j and cover_url:  # cover not accepted: retry without it rather than lose the post
        print(f"  note: cover_url rejected ({_err(j)}); retrying without a custom cover")
        data.pop("cover_url")
        j = requests.post(f"{BASE}/{uid}/media", data=data, timeout=120).json()
    if "id" not in j:
        raise RuntimeError(f"Reel container failed: {_err(j)}")
    cid = j["id"]
    for _ in range(90):  # up to ~15 min
        s = requests.get(f"{BASE}/{cid}", params={"fields": "status_code,status", "access_token": t}, timeout=30).json()
        code = s.get("status_code")
        if code == "FINISHED":
            break
        if code in ("ERROR", "EXPIRED"):
            raise RuntimeError(f"Reel processing failed: {s}")
        time.sleep(10)
    else:
        raise TimeoutError("Reel processing timed out")
    p = requests.post(f"{BASE}/{uid}/media_publish", data={"creation_id": cid, "access_token": t}, timeout=120).json()
    if "id" not in p:
        raise RuntimeError(f"Reel publish failed: {_err(p)}")
    link = requests.get(f"{BASE}/{p['id']}", params={"fields": "permalink", "access_token": t}, timeout=30).json().get("permalink", "")
    return {"id": p["id"], "url": link}
