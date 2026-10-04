"""SEO calibration via the official YouTube Data API (search.list + videos.list; search costs 100 quota units).
Usage: python seo.py "how does wireless charging work" [n]"""
import sys

import requests

import adapters.common  # noqa: F401  (system trust store)
from adapters.common import env


def search(query: str, n: int = 10, short_only: bool = True) -> list:
    key = env("YOUTUBE_API_KEY")
    p = {"part": "snippet", "q": query, "type": "video", "maxResults": n, "order": "relevance",
         "regionCode": "US", "relevanceLanguage": "en", "key": key}
    if short_only:
        p["videoDuration"] = "short"  # < 4 min
    r = requests.get("https://www.googleapis.com/youtube/v3/search", params=p, timeout=30).json()
    if "error" in r:
        raise RuntimeError(r["error"].get("message", str(r["error"])))
    ids = [i["id"]["videoId"] for i in r.get("items", [])]
    if not ids:
        return []
    v = requests.get("https://www.googleapis.com/youtube/v3/videos",
                     params={"part": "snippet,statistics,contentDetails", "id": ",".join(ids), "key": key}, timeout=30).json()
    out = []
    for it in v.get("items", []):
        out.append({"id": it["id"], "title": it["snippet"]["title"], "channel": it["snippet"]["channelTitle"],
                    "published": it["snippet"]["publishedAt"][:10], "views": int(it["statistics"].get("viewCount", 0)),
                    "duration": it["contentDetails"]["duration"], "url": f"https://youtube.com/watch?v={it['id']}"})
    return sorted(out, key=lambda x: -x["views"])


if __name__ == "__main__":
    q = sys.argv[1]
    for x in search(q, int(sys.argv[2]) if len(sys.argv) > 2 else 10):
        print(f"{x['views']:>12,}  {x['published']}  {x['title'][:80]}  [{x['channel'][:24]}]")
