"""Tiered page reader for claim checking and research (no new infrastructure required; Steel and BrowserOS are opt-in).
  read(url) -> readable text or "" (never raises). Tier 1: plain fetch via news_rss.read_article (SSRF-guarded, public http(s) only).
  Tier 2: a Steel browser scrape, only if STEEL_API_URL is set (the docker service from the owner's Trade stack, default http://localhost:3000;
  optional STEEL_API_KEY). Steel renders JavaScript pages and gets past walls the plain fetch cannot, e.g. nseindia.com.
  Tier 3: BrowserOS MCP, only if BROWSEROS_MCP_URL is set and the probe confirms it is reachable. Opens the page via
  the BrowserOS local Chromium app (third_party/trade/browseros_client.py copied from Trade, never imported from Trade).
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


def _browseros_read(url: str, limit: int, timeout: int = 60) -> str:
    """Tier 3: read a page via the local BrowserOS MCP app (BROWSEROS_MCP_URL must be set).
    Copies from third_party/trade/browseros_client.py (copied from Trade; never imported from Trade).
    Only called when the probe confirms BrowserOS is reachable."""
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from third_party.trade.browseros_probe import browseros_configured
    from third_party.trade.browseros_client import BrowserOSClient, extract_run_text, BrowserOSPageError

    base_url = os.environ.get("BROWSEROS_MCP_URL", "").strip()
    if not base_url:
        return ""
    if not browseros_configured(base_url):
        return ""
    news_rss._check_url(url)
    client = BrowserOSClient(base_url)
    try:
        with client.open_page(url, wait_ms=3000, timeout_s=timeout) as (session_id, page_id):
            result = client.call_tool(
                "run",
                {"code": f"return await browser.pages.getText({page_id});"},
                timeout_s=timeout,
                session_id=session_id,
            )
            text, _err = extract_run_text(result)
            return _strip_html(text)[:limit] if text else ""
    except (BrowserOSPageError, Exception):
        return ""


def read(url: str, limit: int = 6000) -> str:
    """Tiered page reader: plain -> Steel -> BrowserOS. Returns "" (never raises)."""
    text = news_rss.read_article(url, limit)
    if text:
        return text
    try:
        text = _steel_read(url, limit)
    except Exception:
        text = ""
    if text and len(text) > _MIN_CHARS:
        return text
    try:
        text = _browseros_read(url, limit)
    except Exception:
        return ""
    return text if len(text) > _MIN_CHARS else ""
