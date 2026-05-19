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
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            data = r.read()
            if not data:
                return {}
            return json.loads(data)
    except urllib.error.HTTPError as e:
        body = e.read()
        if isinstance(body, bytes):
            body = body.decode(errors="replace")
        body_str = str(body)[:200]
        print(f"[poller] yt_get {path} failed: HTTP {e.code} — {body_str!r}", file=sys.stderr)
        return {}
    except urllib.error.URLError as e:
        print(f"[poller] yt_get {path} failed: {e.reason}", file=sys.stderr)
        return {}
    except json.JSONDecodeError as e:
        print(f"[poller] yt_get {path} invalid JSON: {e}", file=sys.stderr)
        return {}


def fetch_rule(worker_url: str, channel_id: str, secret: str) -> dict | None:
    url = (
        f"{worker_url}/automations/internal/rules/lookup"
        f"?platform=youtube&channelId={urllib.parse.quote(channel_id)}"
    )
    req = urllib.request.Request(url, headers={"X-Scheduler-Secret": secret})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
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
        body = e.read()
        if isinstance(body, bytes):
            body = body.decode()
        body_str = str(body)[:200]
        print(f"[poller] reply failed HTTP {e.code}: {body_str}", file=sys.stderr)
        # 404 = comment deleted — permanent, don't retry.
        if e.code == 404:
            return True  # treat as succeeded so we don't re-reply
        # 403 has two distinct meanings in the YouTube API:
        #   - "comments disabled" (body contains "commentsDisabled")
        #   - quota exceeded / token revoked (body contains "quotaExceeded" / "forbidden")
        # We distinguish them by parsing the response body.
        if e.code == 403:
            if "commentsDisabled" in body_str or "forbidden" in body_str.lower():
                return True  # permanent failure — skip silently
            # Otherwise assume quota/token issue — retry on next run.
            return False
        if e.code == 429:
            print(f"[poller] reply rate-limited (429), retrying on next run", file=sys.stderr)
            return False
        return False  # retryable (5xx, etc.)
    except urllib.error.URLError as e:
        print(f"[poller] reply network error: {e.reason}", file=sys.stderr)
        return False  # retryable


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
    except Exception as e:
        print(f"[poller] failed to record poll: {e}", file=sys.stderr)


def load_replied() -> set:
    try:
        with open(REPLIED_MARKER) as f:
            return set(json.load(f))
    except FileNotFoundError:
        return set()
    except (json.JSONDecodeError, ValueError) as e:
        # Corrupted state file — start fresh rather than crashing the poller
        print(f"[poller] replied marker corrupt, resetting: {e}", file=sys.stderr)
        return set()


def save_replied(ids: set) -> None:
    try:
        with open(REPLIED_MARKER, "w") as f:
            json.dump(list(ids), f)
    except OSError as e:
        print(f"[poller] failed to save replied IDs: {e}", file=sys.stderr)
        # NOTE: IDs added to in-memory set before this call are LOST if the write
        # fails. Next run will re-read the stale file and may re-reply to those
        # comments. This is a known trade-off — failing the poll on disk-full
        # would cause repeated retries every invocation, which is worse than the
        # occasional duplicate reply. There is no safe partial-write here because
        # we need an atomic rename to avoid corrupting the marker on crash.


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

    # Fetch recent videos (paginate to completion)
    video_ids = []
    search_params = {
        "part": "id",
        "channelId": channel_id,
        "type": "video",
        "order": "date",
        "maxResults": "50",
        "key": api_key,
    }
    while True:
        try:
            videos_data = yt_get("search", search_params)
        except Exception:
            print("[poller] search API failed, aborting", file=sys.stderr)
            return
        # Empty {} means no results page; error sentinel means transient failure —
        # stop pagination but do not silently halt.
        if videos_data == {}:
            print("[poller] search API returned empty, aborting", file=sys.stderr)
            return
        for item in videos_data.get("items", []):
            vid = item.get("id", {}).get("videoId")
            if vid:
                video_ids.append(vid)
        next_page = videos_data.get("nextPageToken")
        if not next_page:
            break
        search_params["pageToken"] = next_page

    replied = load_replied()
    new_replied = set(replied)
    total_replied = 0

    for video_id in video_ids:
        comment_params = {
            "part": "snippet",
            "videoId": video_id,
            "order": "time",
            "maxResults": "100",
            "key": api_key,
        }
        while True:
            try:
                comments_data = yt_get("commentThreads", comment_params)
            except Exception:
                print(f"[poller] commentThreads API failed for video {video_id}, skipping remaining videos", file=sys.stderr)
                video_ids = []  # signal outer loop to stop
                break
            # {} means empty page; error sentinel means transient failure.
            if comments_data == {}:
                print(f"[poller] commentThreads API empty for video {video_id}", file=sys.stderr)
                break
            if "_error" in comments_data:
                print(f"[poller] commentThreads error for video {video_id}: {comments_data['_error']}", file=sys.stderr)
                break
            for thread in comments_data.get("items", []):
                thread_id = thread.get("snippet", {}).get("topLevelComment", {}).get("id")
                if not thread_id or thread_id in replied:
                    continue

                snippet = thread.get("snippet", {}).get("topLevelComment", {}).get("snippet", {})
                author = snippet.get("authorDisplayName", "there")
                reply_text = apply_template(template, author)

                ok = post_reply(video_id, thread_id, reply_text, oauth_token)
                if ok:
                    new_replied.add(thread_id)
                    total_replied += 1
                    print(f"[poller] replied to {thread_id} by {author}")
            next_page = comments_data.get("nextPageToken")
            if not next_page:
                break
            comment_params["pageToken"] = next_page

    save_replied(new_replied)
    try:
        record_poll(worker_url, channel_id, secret)
    except Exception:
        print("[poller] poll record failed, continuing", file=sys.stderr)
    print(f"[poller] done — replied to {total_replied} comments")


if __name__ == "__main__":
    main()
