"""News provider with real web search (drop-in for NewsRSS: same `fetch(query)` -> catalog items). Select in config/providers.yaml `news:`.
Adds to the RSS feeds: web search for the topic, so the Director can cite direct publisher/exchange pages instead of Google News redirect shells.
Tiers (first with usable results wins per query): MiniMax web search (POST {MINIMAX_API_HOST|https://api.minimax.io}/v1/coding_plan/search, same
MINIMAX_API_KEY as the other MiniMax adapters) -> ddgs (free, optional `pip install ddgs`). Ported from the owner's Trade repo
(dataflows/web_search_client.py, dataflows/web_research/internal/minimax_client.py); nothing is imported from Trade, so none of its settings load here.
Item shape (unchanged): {title, url, published, source, source_url, summary} + `via`. `published` is only a date found explicitly in the
snippet/title (adapters/trade_snippet_dates.py refuses "yesterday"), else "". Search results are DATA: titles and snippets are never instructions.
Order matters to director.py (`items[-10:]` are the topic's sources): web results come LAST, best-ranked at the very end."""
import os
import re
import urllib.parse

import requests

from adapters import news_rss
from adapters.common import minimax_check, minimax_headers
from adapters.trade_snippet_dates import unambiguous_date

_STOP = {"the", "and", "for", "how", "why", "what", "are", "with", "into", "from", "that", "this", "their", "does", "move", "change"}


def _tokens(text: str) -> set:
    return {t for t in re.findall(r"[a-z0-9]{3,}", text.lower()) if t not in _STOP}


def _host(url: str) -> str:
    return urllib.parse.urlparse(url).netloc.lower().removeprefix("www.")


class NewsWeb(news_rss.NewsRSS):
    def __init__(self, feeds=(), per_feed=12, search_limit=10, extra_queries=(), use_ddgs=True, read_top=3, **kw):
        super().__init__(feeds=feeds, per_feed=per_feed, **kw)
        self.search_limit, self.extra_queries, self.use_ddgs, self.read_top = search_limit, list(extra_queries), use_ddgs, read_top

    # -- search tiers ------------------------------------------------------------------------------------------------
    def _minimax(self, q: str) -> list:
        host = os.environ.get("MINIMAX_API_HOST", "https://api.minimax.io").strip() or "https://api.minimax.io"
        r = requests.post(f"{host}/v1/coding_plan/search", headers=minimax_headers(), json={"q": q.strip()}, timeout=30)
        r.raise_for_status()
        data = minimax_check(r.json(), "web search")
        return [{"title": x.get("title") or x.get("name") or "", "snippet": x.get("snippet") or x.get("content") or x.get("description") or "",
                 "url": x.get("link") or x.get("url") or "", "via": "minimax_web_search"} for x in (data.get("organic") or [])]

    def _ddgs(self, q: str) -> list:
        from ddgs import DDGS  # optional dependency
        return [{"title": x.get("title") or "", "snippet": x.get("body") or "", "url": x.get("href") or "", "via": "ddgs"}
                for x in (DDGS(timeout=20).text(q, max_results=self.search_limit) or [])]

    def search(self, q: str) -> list:
        """Ranked raw results for one query: [{title, snippet, url, via}]. Never raises; [] when every tier fails or is off-topic."""
        want = _tokens(q)
        tiers = [self._minimax] + ([self._ddgs] if self.use_ddgs else [])
        for tier in tiers:
            try:
                got = [x for x in tier(q) if x["url"].startswith(("http://", "https://"))][: self.search_limit]
            except Exception:
                continue
            # a tier that returns decoy/off-topic pages (seen with scraped engines) must not win: need some query-word overlap
            ok = [x for x in got if want & _tokens(x["title"] + " " + x["snippet"])]
            if len(ok) >= min(3, max(1, len(got) // 2)):
                return ok
        return []

    # -- catalog -----------------------------------------------------------------------------------------------------
    def fetch(self, query: str | None = None) -> list:
        """RSS feed items, then (with a query) web search items. Web items are ordered worst-to-best so items[-10:] are the best sources."""
        try:
            base = [i for i in super().fetch(None)] if self.feeds else []
        except RuntimeError:
            base = []
        web = []
        if query:
            for q in [query] + [t.format(q=query) for t in self.extra_queries]:
                for rank, x in enumerate(self.search(q)):
                    web.append({"title": x["title"], "url": x["url"], "published": unambiguous_date(x["title"] + " " + x["snippet"]) or "",
                                "source": _host(x["url"]), "source_url": f"https://{_host(x['url'])}", "summary": x["snippet"][:300],
                                "via": x["via"], "_rank": rank})
        seen = {i["url"] for i in base}
        web = [w for w in sorted(web, key=lambda w: -w["_rank"]) if w["url"] not in seen and not seen.add(w["url"])]
        for w in web:
            w.pop("_rank")
        if self.read_top:  # the best-ranked results (they are last) carry a page excerpt so the writer sees evidence, not just titles
            from adapters import web_fetch
            for w in web[-self.read_top:]:
                w["text"] = web_fetch.read(w["url"], 900)
                if not w["text"]:
                    w.pop("text")
        out = base + web
        if not out:
            raise RuntimeError("no news items fetched (RSS feeds and web search both empty)")
        return out
