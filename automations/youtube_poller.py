#!/usr/bin/env python3
"""
YouTube comment poller — fetches recent comments on channel videos and posts
auto-replies using the configured automation rule from Cloudflare KV.

Usage:
  YOUTUBE_API_KEY=... YOUTUBE_CHANNEL_ID=... YOUTUBE_OAUTH_TOKEN=... \
  WORKER_URL=... WORKER_SCHEDULER_SECRET=... python3 automations/youtube_poller.py
"""
import os
import json
import sys
import urllib.request
import urllib.parse
import urllib.error

YT_API = "https://www.googleapis.com/youtube/v3"
REPLIED_MARKER = ".youtube_replied_ids"


def yt_get(path: str, params: dict) -> dict:
    url = f"{YT_API}/{path}?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url) as r:
        return json.loads(r.read())


def fetch_rule(worker_url: str, channel_id: str, secret: str) -> dict | None:
    url = (
        f"{worker_url}/automations/internal/rules/lookup"
        f"?platform=youtube&channelId={urllib.parse.quote(channel_id)}"
    )
    req = urllib.request.Request(url, headers={"X-Scheduler-Secret": secret})
    try:
        with urllib.request.urlopen(req) as r:
            body = json.loads(r.read())
            return body.get("data")
    except Exception as e:
        print(f"[poller] failed to fetch rule: {e}", file=sys.stderr)
        return None


def apply_template(template: str, name: str) -> str:
    return template.replace("{name}", name)


def post_reply(video_id: str, parent_id: str, text: str, oauth_token: str) -> bool:
    url = f"{YT_API}/comments?part=snippet"
    payload = json.dumps({
        "snippet": {
            "parentId": parent_id,
            "textOriginal": text,
        }
    }).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Bearer {oauth_token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status == 200
    except urllib.error.HTTPError as e:
        print(f"[poller] reply failed: {e.read().decode()}", file=sys.stderr)
        return False


def record_poll(worker_url: str, channel_id: str, secret: str) -> None:
    url = f"{worker_url}/automations/internal/youtube/poll"
    payload = json.dumps({"channelId": channel_id}).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"X-Scheduler-Secret": secret, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req):
            pass
    except Exception:
        pass


def load_replied() -> set:
    try:
        with open(REPLIED_MARKER) as f:
            return set(json.load(f))
    except FileNotFoundError:
        return set()


def save_replied(ids: set) -> None:
    with open(REPLIED_MARKER, "w") as f:
        json.dump(list(ids), f)


def main():
    api_key = os.environ.get("YOUTUBE_API_KEY", "")
    channel_id = os.environ.get("YOUTUBE_CHANNEL_ID", "")
    oauth_token = os.environ.get("YOUTUBE_OAUTH_TOKEN", "")
    worker_url = os.environ.get("WORKER_URL", "").rstrip("/")
    secret = os.environ.get("WORKER_SCHEDULER_SECRET", "")

    if not all([api_key, channel_id, oauth_token, worker_url]):
        print("[poller] missing required env vars", file=sys.stderr)
        sys.exit(1)

    rule = fetch_rule(worker_url, channel_id, secret)
    if not rule or not rule.get("enabled") or "comment" not in rule.get("triggers", []):
        print(f"[poller] no active comment rule for channel {channel_id}")
        return

    template = rule.get("comment_reply_template", "")
    if not template:
        print("[poller] no comment_reply_template set")
        return

    # Fetch recent videos
    videos_data = yt_get("search", {
        "part": "id",
        "channelId": channel_id,
        "type": "video",
        "order": "date",
        "maxResults": "10",
        "key": api_key,
    })
    video_ids = [item["id"]["videoId"] for item in videos_data.get("items", []) if item.get("id", {}).get("videoId")]

    replied = load_replied()
    new_replied = set(replied)
    total_replied = 0

    for video_id in video_ids:
        comments_data = yt_get("commentThreads", {
            "part": "snippet",
            "videoId": video_id,
            "order": "time",
            "maxResults": "50",
            "key": api_key,
        })
        for thread in comments_data.get("items", []):
            thread_id = thread["id"]
            if thread_id in replied:
                continue

            snippet = thread.get("snippet", {}).get("topLevelComment", {}).get("snippet", {})
            author = snippet.get("authorDisplayName", "there")
            reply_text = apply_template(template, author)

            ok = post_reply(video_id, thread_id, reply_text, oauth_token)
            if ok:
                new_replied.add(thread_id)
                total_replied += 1
                print(f"[poller] replied to {thread_id} by {author}")

    save_replied(new_replied)
    record_poll(worker_url, channel_id, secret)
    print(f"[poller] done — replied to {total_replied} comments")


if __name__ == "__main__":
    main()
