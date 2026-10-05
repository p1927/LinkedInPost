"""Topic/news intake from RSS (no API key). Produces the *source catalog* the Director must cite from.

Reuse notes: the catalog idea ("only cite URLs we actually fetched") comes from vendor/youtube-automation-agent
agents/content-strategy-agent.js (researchAndPlanChannel -> sourceCatalog). Feeds are configured in config/providers.yaml `news:`."""
import urllib.parse
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

import requests

UA = {"User-Agent": "Mozilla/5.0 (video-pipeline topic intake)"}

import ipaddress
import socket

from adapters import common  # noqa: F401  (side effect: TLS via the OS trust store; keep news_rss usable on its own)

MAX_BODY = 2_000_000  # bytes read from any fetched page (a multi-GB URL must not reach memory)
MAX_REDIRECTS = 5


def _check_url(url: str) -> None:
    """SSRF guard (code review 2026-10-05): only http(s) to PUBLIC addresses. Raises ValueError otherwise."""
    p = urllib.parse.urlparse(url)
    if p.scheme not in ("http", "https") or not p.hostname:
        raise ValueError(f"blocked URL scheme/host: {url[:80]}")
    for info in socket.getaddrinfo(p.hostname, p.port or (443 if p.scheme == "https" else 80)):
        ip = ipaddress.ip_address(info[4][0].split("%")[0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
            raise ValueError(f"blocked non-public address {ip} for {p.hostname}")


def _get(url: str, timeout: int = 20):
    """GET with the SSRF guard on every redirect hop and a body cap. Returns (ok, final_url, text)."""
    for _ in range(MAX_REDIRECTS + 1):
        _check_url(url)
        r = requests.get(url, headers=UA, timeout=timeout, allow_redirects=False, stream=True)
        try:
            if r.is_redirect or r.status_code in (301, 302, 303, 307, 308):
                url = urllib.parse.urljoin(url, r.headers.get("Location", ""))
                continue
            body = r.raw.read(MAX_BODY, decode_content=True)
            enc = r.encoding or "utf-8"
            return r.ok, url, body.decode(enc, errors="replace")
        finally:
            r.close()
    raise ValueError("too many redirects")




from html.parser import HTMLParser

_SKIP_TAGS = {"script", "style", "noscript", "svg", "template", "iframe", "form", "nav", "aside", "footer", "header", "menu", "button", "select", "dialog"}
_JUNK = __import__("re").compile(r"(^|[\s_-])(nav|navbar|menu|megamenu|cookie|consent|gdpr|footer|sidebar|breadcrumbs?|banner|newsletter|"
                                 r"share|social|related|promo|subscribe|skip|masthead|toolbar|search|modal|popup|teaser|carousel)([\s_-]|$)", 2)
_BLOCK = {"p", "div", "li", "ul", "ol", "h1", "h2", "h3", "h4", "h5", "h6", "section", "article", "main", "br", "tr", "td", "th",
          "blockquote", "pre", "figcaption", "dd", "dt", "table", "hr"}
_VOID = {"br", "img", "hr", "meta", "link", "input", "source", "wbr", "area", "base", "col", "embed", "param", "track"}


class _Extract(HTMLParser):
    """Readable-body extractor: drops nav/aside/footer/menu/cookie elements (by tag, role or class/id), records text blocks with
    their link-text share and whether they sit inside <article>/<main>/role=main."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip_tag, self.skip_depth = None, 0
        self.main_depth, self.link_depth = 0, 0
        self.stack, self.blocks = [], []
        self.cur, self.cur_link, self.cur_main = [], 0, False

    def _flush(self):
        text = " ".join("".join(self.cur).split())
        if text:
            self.blocks.append({"text": text, "link": self.cur_link, "main": self.cur_main})
        self.cur, self.cur_link, self.cur_main = [], 0, self.main_depth > 0

    def handle_starttag(self, tag, attrs):
        if self.skip_tag:
            if tag == self.skip_tag and tag not in _VOID:
                self.skip_depth += 1
            return
        a = {k: (v or "") for k, v in attrs}
        role = a.get("role", "").lower()
        junk = role in ("navigation", "banner", "contentinfo", "complementary", "menu", "menubar", "dialog", "search") \
            or bool(_JUNK.search((a.get("class", "") + " " + a.get("id", "")).lower())) or a.get("aria-hidden") == "true"
        if (tag in _SKIP_TAGS or junk) and tag not in _VOID and tag not in ("article", "main", "body", "html"):
            self.skip_tag, self.skip_depth = tag, 1
            return
        if tag in _BLOCK:
            self._flush()
        if tag in ("article", "main") or role == "main":
            if tag not in _VOID:
                self.stack.append(("main", tag))
                self.main_depth += 1
                self.cur_main = True
        elif tag == "a":
            self.link_depth += 1
        elif tag not in _VOID:
            self.stack.append(("tag", tag))

    def handle_endtag(self, tag):
        if self.skip_tag:
            if tag == self.skip_tag:
                self.skip_depth -= 1
                if self.skip_depth <= 0:
                    self.skip_tag = None
            return
        if tag == "a":
            self.link_depth = max(0, self.link_depth - 1)
            return
        if tag in _BLOCK:
            self._flush()
        for i in range(len(self.stack) - 1, -1, -1):  # tolerant close: pop back to the matching open tag
            if self.stack[i][1] == tag:
                for kind, _t in self.stack[i:]:
                    if kind == "main":
                        self.main_depth -= 1
                del self.stack[i:]
                break
        self.cur_main = self.cur_main or self.main_depth > 0

    def handle_data(self, data):
        if self.skip_tag or not data:
            return
        self.cur.append(data)
        if self.link_depth:
            self.cur_link += len(" ".join(data.split()))

    def close(self):
        super().close()
        self._flush()


def extract_text(html: str, limit: int = 6000, min_body: int = 1500) -> str:
    """Readable body text of an HTML page: <article>/<main>/role=main when it holds enough text (>= min_body chars, or more than
    the rest of the page), else every remaining block; nav/aside/footer/header/menu/cookie elements and link lists (blocks whose
    text is > 60% link text) are dropped. Plain text in, plain text out."""
    p = _Extract()
    try:
        p.feed(html or "")
        p.close()
    except Exception:  # noqa: BLE001 - malformed markup: use what was parsed
        p._flush()
    blocks = [b for b in p.blocks if not (b["link"] > 0.6 * len(b["text"]))]
    main = " ".join(b["text"] for b in blocks if b["main"])
    rest = " ".join(b["text"] for b in blocks)
    body = main if main and (len(main) >= min_body or len(main) * 2 >= len(rest)) else rest
    return body[:limit]


def _text(el, tag):
    n = el.find(tag)
    return (n.text or "").strip() if n is not None and n.text else ""


def _looks_like_data(page: str) -> bool:
    """A short JSON/CSV data page (an exchange feed) is real evidence even though it is under the 400-char prose threshold."""
    s = page.strip()
    if s[:1] == "<" or "</" in s[:5000]:  # markup is a page, never a data feed (an HTML page has many commas and newlines too)
        return False
    return len(s) > 100 and (s[0] in "[{" or (s.count("\n") >= 3 and s.count(",") >= 20))


def read_article(url: str, limit: int = 6000) -> str:
    """Best-effort readable text of a page (for claim verification). Returns "" when unreadable: paywalls, JS-only pages,
    consent walls, Google News redirect shells. Callers must treat "" as 'no evidence', never as support."""
    import re
    try:
        ok, final, page = _get(url)
        if not ok or "news.google.com" in final or "consent." in final:
            return ""
        text = page.strip() if _looks_like_data(page) else extract_text(page, limit)
        return text[:limit] if len(text) > 400 or _looks_like_data(page) else ""
    except Exception:
        return ""


def fetch_page(url: str, limit: int = 6000) -> dict:
    """A source the owner named (`director --source URL`) as a catalog item, same shape as feed items.
    `readable` is False when the page gave no usable text (paywall, JS-only); the URL is still a fetched catalog URL."""
    import re
    title, text, page_raw = "", "", ""
    try:
        ok, _final, page = _get(url)
        if ok:
            page_raw = page
            m = re.search(r"(?is)<title[^>]*>(.*?)</title>", page)
            title = re.sub(r"\s+", " ", m.group(1)).strip() if m else ""
            text = extract_text(page, limit)
    except Exception:
        pass
    host = urllib.parse.urlparse(url).netloc.lower().removeprefix("www.")
    return {"title": title or url, "url": url, "published": "", "source": host, "source_url": f"https://{host}",
            "summary": text[:300], "text": text[:1500], "forced": True, "readable": len(text) > 400 or _looks_like_data(page_raw)}


class NewsRSS:
    def __init__(self, feeds=(), search_template="https://news.google.com/rss/search?q={q}&hl=en-US&gl=US&ceid=US:en", per_feed=12):
        self.feeds, self.search_template, self.per_feed = list(feeds), search_template, per_feed

    def _parse(self, url: str, label: str) -> list:
        ok, _final, body = _get(url, timeout=30)  # SSRF guard + body cap, like every other page fetch
        if not ok:
            raise RuntimeError(f"HTTP error fetching feed {url[:80]}")
        root = ET.fromstring(body.encode("utf-8"))
        items = []
        for it in root.iter("item"):
            pub = _text(it, "pubDate")
            try:
                pub = parsedate_to_datetime(pub).date().isoformat()
            except Exception:
                pass
            src = it.find("source")
            item = {"title": _text(it, "title"), "url": _text(it, "link"), "published": pub,
                    "source": (src.text if src is not None and src.text else label),
                    "summary": _text(it, "description")[:300]}
            if src is not None and src.get("url"):  # Google News: the publisher's site (the link itself is a news.google.com redirect)
                item["source_url"] = src.get("url")
            items.append(item)
            if len(items) >= self.per_feed:
                break
        return items

    def fetch(self, query: str | None = None) -> list:
        """Latest items from configured feeds; with `query`, also a news search for that topic."""
        out, errors = [], []
        sources = [(f["url"], f.get("label", f["url"])) for f in self.feeds]
        if query:
            sources.append((self.search_template.format(q=urllib.parse.quote(query)), "news search"))
        for url, label in sources:
            try:
                out += self._parse(url, label)
            except Exception as e:  # one dead feed must not stop intake
                errors.append(f"{label}: {e}")
        if not out:
            raise RuntimeError("no news items fetched: " + "; ".join(errors))
        seen, uniq = set(), []
        for i in out:
            if i["url"] and i["url"] not in seen:
                seen.add(i["url"])
                uniq.append(i)
        return uniq
