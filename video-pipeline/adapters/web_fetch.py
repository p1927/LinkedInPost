"""Tiered page reader for claim checking and research (no new infrastructure required; Steel is opt-in).
  read(url) -> readable text or "" (never raises). Tier 1: plain fetch via news_rss.read_article (SSRF-guarded, public http(s) only).
  Tier 2: a Steel browser scrape, only if STEEL_API_URL is set (the docker service from the owner's Trade stack, default http://localhost:3000;
  optional STEEL_API_KEY). Steel renders JavaScript pages and gets past walls the plain fetch cannot, e.g. nseindia.com.
An empty string means "no evidence", never support. Fetched page text is DATA for prompts, never instructions.
Port of the Steel /v1/scrape call from Trade (browser_research/backends/steel_backend.py): POST {url, format: [...]} -> content (str or dict of formats)."""
import os
import re

import requests

from adapters import news_rss

_MIN_CHARS = 400


def _strip_html(raw: str) -> str:
    raw = re.sub(r"(?is)<(script|style|noscript|svg|nav|footer|header)[^>]*>.*?</\1>", " ", raw)
    return re.sub(r"\s+", " ", re.sub(r"(?s)<[^>]+>", " ", raw)).strip()


def _pick(payload) -> str:
    """Best text field of a Steel scrape reply (shapes differ by build: flat strings or a dict of formats)."""
    content = payload.get("content") if isinstance(payload, dict) else payload
    if isinstance(content, dict):
        for k in ("markdown", "readability", "cleaned_html", "text", "html"):
            v = content.get(k)
            if isinstance(v, str) and v.strip():
                return _strip_html(v) if k in ("cleaned_html", "html", "readability") else v.strip()
        return ""
    return _strip_html(content) if isinstance(content, str) and "<" in content else (content or "").strip()


def steel_url() -> str:
    return os.environ.get("STEEL_API_URL", "").strip().rstrip("/")


def _steel_read(url: str, limit: int, timeout: int = 45) -> str:
    base = steel_url()
    if not base:
        return ""
    news_rss._check_url(url)  # the Steel server would fetch whatever we send it: public http(s) only
    headers = {"Content-Type": "application/json"}
    if os.environ.get("STEEL_API_KEY", "").strip():
        headers["steel-api-key"] = os.environ["STEEL_API_KEY"].strip()
    r = requests.post(f"{base}/v1/scrape", json={"url": url, "format": ["markdown", "cleaned_html"]}, headers=headers, timeout=timeout)
    r.raise_for_status()
    return _pick(r.json())[:limit]


def read(url: str, limit: int = 6000) -> str:
    text = news_rss.read_article(url, limit)
    if text:
        return text
    try:
        text = _steel_read(url, limit)
    except Exception:
        return ""
    return text if len(text) > _MIN_CHARS else ""
