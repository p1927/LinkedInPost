"""L2 research layer — per-question evidence gathering.

  python run.py research <ep-id> [--allow-unsupported] [--top N]

For each question in brief.json:
  1. LLM plans 2-3 search queries.
  2. adapters/news_web.py runs the searches (MiniMax -> ddgs fallback).
  3. Rank results by config/source_quality.yaml authority.
  4. Read top N pages via adapters/web_fetch.read() (plain -> Steel -> BrowserOS).
  5. Cache page text by URL hash under out/<id>/research/pages/.
  6. One extraction LLM call per question using the record-only prompt.
  7. Two-source number check: a number is verified only if two independent domains report it within 5%.
  8. String-match check: every extracted number must appear verbatim in its source text.

Writes:
  episodes/<id>/research.json  (schema_version 1)
  out/<id>/research_report.md  (unsupported questions + single-source numbers)

Exits non-zero with a clear message if any question is unsupported, unless --allow-unsupported.
"""
from __future__ import annotations

import concurrent.futures
import hashlib
import json
import time
import os
import re
import sys
import urllib.parse
from datetime import date
from pathlib import Path
from typing import Any

from adapters.common import ROOT, load_provider

# ---------------------------------------------------------------------------
# Source quality ranking (reuses config/source_quality.yaml)
# ---------------------------------------------------------------------------

def _load_source_quality() -> dict:
    import yaml
    p = ROOT / "config" / "source_quality.yaml"
    return yaml.safe_load(p.read_text()) if p.exists() else {}


def _domain(url: str) -> str:
    return urllib.parse.urlparse(url).netloc.lower().removeprefix("www.")


def _authority(url: str, sq: dict) -> int:
    dom = _domain(url)
    tiers = sq.get("tiers") or {}
    for tier_name in ("primary", "reference", "major"):
        t = tiers.get(tier_name) or {}
        for suffix in (t.get("tld_suffixes") or []):
            if dom.endswith(suffix):
                return t.get("score", 0)
        for d in (t.get("domains") or []):
            if dom == d or dom.endswith("." + d):
                return t.get("score", 0)
    return 0


# Social posts, video and forum pages are not evidence: undated, unedited, often stale (a 2025 Facebook post was once cited for a 2026 market day).
_SOCIAL = ("facebook.com", "instagram.com", "youtube.com", "youtu.be", "linkedin.com", "x.com", "twitter.com", "reddit.com", "tiktok.com", "quora.com")


def rank_results(results: list[dict], sq: dict) -> list[dict]:
    """Sort search results best-first by authority score then original rank; social/video/forum pages are dropped."""
    results = [r for r in results if not any(d in _domain(r.get("url", "")) for d in _SOCIAL)]
    return sorted(results, key=lambda r: (-_authority(r.get("url", ""), sq), results.index(r)))


# ---------------------------------------------------------------------------
# Page cache: stores fetched text by sha256(url) under out/<id>/research/pages/
# ---------------------------------------------------------------------------

def _url_hash(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:16]


def _page_cache_path(ep_id: str, url: str) -> Path:
    return ROOT / "out" / ep_id / "research" / "pages" / (_url_hash(url) + ".txt")


def _read_cached(ep_id: str, url: str) -> str | None:
    p = _page_cache_path(ep_id, url)
    return p.read_text() if p.exists() else None


def _write_cache(ep_id: str, url: str, text: str):
    p = _page_cache_path(ep_id, url)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)


def _fetch_page(ep_id: str, url: str, limit: int = 6000) -> str:
    cached = _read_cached(ep_id, url)
    if cached is not None:
        return cached
    from adapters import web_fetch
    text = web_fetch.read(url, limit)
    if text:
        _write_cache(ep_id, url, text)
    return text


# ---------------------------------------------------------------------------
# Two-source number check (R-92 rewrite, ~40 lines)
# ---------------------------------------------------------------------------
_NUM_PAT = re.compile(r"(?<!\w)([\d,]+(?:\.\d+)?)\s*(%|cr(?:ore)?|lakh|bn|mn|million|billion|trillion|k\b)?", re.IGNORECASE)


def _extract_numbers(text: str) -> list[str]:
    """Pull numeric tokens from text (strip commas, lower)."""
    out = []
    for m in _NUM_PAT.finditer(text):
        raw = m.group(1).replace(",", "")
        try:
            float(raw)
            out.append(raw)
        except ValueError:
            pass
    return out


def _numbers_in_text(text: str) -> set[str]:
    return set(_extract_numbers(text))


def two_source_check(number_str: str, sources: list[dict]) -> bool:
    """Return True if `number_str` appears (within 5% tolerance) in at least two independent domains.
    sources: [{url, text}]. A float 5% tolerance covers minor rounding differences."""
    try:
        target = float(number_str.replace(",", ""))
    except ValueError:
        return False
    confirmed_domains: set[str] = set()
    for src in sources:
        for n in _extract_numbers(src.get("text") or ""):
            try:
                v = float(n)
                if target == 0 or abs(v - target) / max(abs(target), 1e-9) <= 0.05:
                    confirmed_domains.add(_domain(src.get("url", "")))
                    break
            except ValueError:
                pass
    return len(confirmed_domains) >= 2


def string_match_check(number_str: str, source_text: str) -> bool:
    """Return True if the number appears verbatim (with or without commas) in source_text."""
    raw = number_str.replace(",", "")
    # Try both with and without commas (e.g. "1,234" and "1234")
    return raw in source_text or number_str in source_text


# ---------------------------------------------------------------------------
# LLM helpers
# ---------------------------------------------------------------------------

def _date_hit(text: str, raw: str) -> bool:
    """True if `text` mentions the day+month of `raw` ("1 October", "October 1st") in either order, month abbreviated or not."""
    m = re.match(r"\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)", raw) or None
    if m:
        day, mon = m.group(1), m.group(2)
    else:
        m = re.match(r"\s*([A-Za-z]+)\s+(\d{1,2})", raw)
        if not m:
            return False
        mon, day = m.group(1), m.group(2)
    mon3 = re.escape(mon[:3].lower())
    d = r"0?" + re.escape(str(int(day)))
    pat = rf"\b({d}(?:st|nd|rd|th)?[\s-]*{mon3}[a-z]*|{mon3}[a-z]*[\s-]*{d}(?:st|nd|rd|th)?)\b"
    return bool(re.search(pat, text.lower()))


def _plan_queries(llm, question_text: str, topic: str, n: int = 3, dates: list | None = None, today: str = "") -> list[str]:
    """Ask the LLM for n search queries for this question. Small prompt."""
    dnote = ""
    if dates:
        dnote = ("Dates named in the brief (use them in at least two queries, with the year; today is %s, so a date with no year means the most recent such date): %s\n"
                 % (today, ", ".join(d.get("raw", "") for d in dates)))
    prompt = (
        f"Topic: {topic}\n"
        f"Question: {question_text}\n{dnote}\n"
        f"Write {n} web search queries that would find factual, dated sources to answer this question. "
        f"Return JSON: {{\"queries\": [\"query1\", \"query2\", \"query3\"]}}"
    )
    try:
        result = llm.generate_json(prompt, system="You are a research assistant. Return only valid JSON.")
        queries = result.get("queries") or []
        return [str(q) for q in queries[:n] if q]
    except Exception:
        # Fallback: use the question text as a query
        return [question_text]


def _extract_facts(llm, question_id: str, question_text: str, sources: list[dict]) -> dict:
    """One LLM call to extract structured facts from the provided source texts.
    Uses the record-only honesty prompt."""
    from third_party.trade.record_only_prompt import RECORD_ONLY_SYSTEM_PROMPT

    # Build a compact source summary (~3k tokens total)
    source_blocks = []
    for src in sources[:4]:
        text = (src.get("text") or "")[:2500]
        if text:
            source_blocks.append(f"[{src['id']}] URL: {src['url']}\n{text}")

    if not source_blocks:
        return {
            "question_id": question_id,
            "answer_summary": None,
            "unsupported": True,
            "facts": [],
        }

    prompt = (
        f"question_id: {question_id}\n"
        f"question: {question_text}\n\n"
        "SOURCE TEXTS:\n" + "\n---\n".join(source_blocks) + "\n\n"
        "Extract facts that answer the question. A definition or plain description of a term that a source states counts as support. Return JSON only."
    )
    try:
        result = llm.generate_json(prompt, system=RECORD_ONLY_SYSTEM_PROMPT)
        return result
    except Exception:
        return {
            "question_id": question_id,
            "answer_summary": None,
            "unsupported": True,
            "facts": [],
        }


# ---------------------------------------------------------------------------
# Per-question research worker
# ---------------------------------------------------------------------------

def _research_question(ep_id: str, q: dict, topic: str, sq: dict, llm, top_n: int) -> dict:
    """Research one brief question. Returns a question result dict + evidence list."""
    from adapters.news_web import NewsWeb
    nw = NewsWeb(feeds=(), read_top=0, use_ddgs=True)

    # 1. Plan queries
    try:
        import brief as _brief
        b_dates = _brief.load(ep_id).get("dates") or []
    except Exception:
        b_dates = []
    queries = _plan_queries(llm, q["text"], topic, dates=b_dates, today=time.strftime("%Y-%m-%d"))
    # a question that names a day gets deterministic day+year queries too (planner queries alone missed the day-specific market reports)
    year = time.strftime("%Y")
    for d in b_dates:
        if _date_hit(q["text"], d.get("raw", "")):
            raw = d["raw"].strip()
            queries += [f"{raw} {year} market close report reason", f"stock market {raw} {year} why it fell or rose"]

    # 2. Search all queries, combine, dedup by URL
    all_results: list[dict] = []
    seen_urls: set[str] = set()
    for query in queries:
        try:
            hits = nw.search(query)
            for h in hits:
                if h.get("url") and h["url"] not in seen_urls:
                    seen_urls.add(h["url"])
                    all_results.append(h)
        except Exception:
            pass

    # 3. Rank by authority
    ranked = rank_results(all_results, sq)
    if b_dates and any(_date_hit(q["text"], d.get("raw", "")) for d in b_dates):  # a question about a named day: sources naming that day come first
        ranked.sort(key=lambda h: not any(_date_hit((h.get("title") or "") + " " + (h.get("url") or "") + " " + (h.get("snippet") or h.get("summary") or ""), d.get("raw", "")) for d in b_dates))
    ranked = ranked[:top_n * 2]  # fetch more, then trim

    # 4. Fetch pages
    sources = []
    ev_base = []
    for r in ranked:
        url = r.get("url") or ""
        if not url:
            continue
        text = _fetch_page(ep_id, url)
        if text:
            sources.append({"url": url, "text": text, "title": r.get("title", "")})
        if len(sources) >= top_n:
            break

    # 5. Build evidence list (assign ids later in the caller to ensure global uniqueness)
    return {
        "question_id": q["id"],
        "question_text": q["text"],
        "sources": sources,
    }


# ---------------------------------------------------------------------------
# Main research run
# ---------------------------------------------------------------------------

def run(ep_id: str, top_n: int = 5, allow_unsupported: bool = False) -> int:
    """Run research for ep_id. Returns 0 on success, non-zero on failure."""
    from brief import load as load_brief
    try:
        brief = load_brief(ep_id)
    except FileNotFoundError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    questions = brief["questions"]
    topic = brief.get("topic") or ep_id
    sq = _load_source_quality()
    llm = load_provider("llm")

    print(f"Researching {len(questions)} question(s) for {ep_id}...")

    # Parallel fetch, max 4 workers
    results: dict[str, dict] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {
            pool.submit(_research_question, ep_id, q, topic, sq, llm, top_n): q["id"]
            for q in questions
        }
        for fut in concurrent.futures.as_completed(futures):
            qid = futures[fut]
            try:
                results[qid] = fut.result()
            except Exception as exc:
                print(f"  {qid}: worker failed: {exc}", file=sys.stderr)
                results[qid] = {"question_id": qid, "question_text": "", "sources": []}

    # Assign global evidence ids, extract facts
    evidence_list: list[dict] = []
    ev_counter = 1
    question_rows: list[dict] = []
    unsupported_ids: list[str] = []
    today = date.today().isoformat()

    for q in questions:
        qid = q["id"]
        r = results.get(qid, {"question_id": qid, "question_text": q["text"], "sources": []})
        sources = r.get("sources") or []

        # Build source dicts with evidence ids
        src_with_ids: list[dict] = []
        for src in sources:
            ev_id = f"ev-{ev_counter}"
            ev_counter += 1
            ev_entry: dict = {
                "id": ev_id,
                "url": src["url"],
                "source": _domain(src["url"]),
                "retrieved_at": today,
                "facts": [],
                "single_source_numbers": [],
            }
            evidence_list.append(ev_entry)
            src_with_ids.append({"id": ev_id, "url": src["url"], "text": src["text"]})

        # Extract facts via LLM
        extraction = _extract_facts(llm, qid, q["text"], src_with_ids)
        unsupported = bool(extraction.get("unsupported"))
        facts_raw = extraction.get("facts") or []

        # String-match check and distribute facts to evidence entries
        for fact in facts_raw:
            sid = fact.get("source_id") or ""
            ev_entry = next((e for e in evidence_list if e["id"] == sid), None)
            if ev_entry is None:
                continue
            src_text = next((s["text"] for s in src_with_ids if s["id"] == sid), "")
            num = fact.get("number")
            if num and not string_match_check(str(num), src_text):
                # Number not in source text: skip this fact (honesty rule)
                continue
            ev_entry["facts"].append(fact)

        # Two-source number check: flag numbers only in one domain
        all_numbers = set()
        for ev_entry in evidence_list:
            for fact in ev_entry["facts"]:
                if fact.get("number"):
                    all_numbers.add(str(fact["number"]))

        for num in all_numbers:
            if not two_source_check(num, src_with_ids):
                # Mark as single_source on the first evidence entry that has it
                for ev_entry in evidence_list:
                    for fact in ev_entry["facts"]:
                        if fact.get("number") == num:
                            ev_entry.setdefault("single_source_numbers", [])
                            if num not in ev_entry["single_source_numbers"]:
                                ev_entry["single_source_numbers"].append(num)

        ev_ids = [s["id"] for s in src_with_ids]
        if unsupported or not src_with_ids:
            unsupported_ids.append(qid)
            unsupported = True

        question_rows.append({
            "id": qid,
            "text": q["text"],
            "answer_summary": extraction.get("answer_summary"),
            "evidence_ids": ev_ids,
            "unsupported": unsupported,
        })
        status = "UNSUPPORTED" if unsupported else f"{len(src_with_ids)} sources"
        print(f"  {qid}: {status}")

    # Write research.json
    research = {
        "schema_version": 1,
        "id": ep_id,
        "questions": question_rows,
        "evidence": evidence_list,
        "unsupported": unsupported_ids,
    }
    ep_dir = ROOT / "episodes" / ep_id
    ep_dir.mkdir(parents=True, exist_ok=True)
    out_path = ep_dir / "research.json"
    out_path.write_text(json.dumps(research, indent=2, ensure_ascii=False))
    print(f"research.json written: {out_path}")

    # Write report
    _write_report(ep_id, research)

    if unsupported_ids and not allow_unsupported:
        print(
            f"\nSTOP: {len(unsupported_ids)} question(s) unsupported by sources: {unsupported_ids}\n"
            "Add better sources or pass --allow-unsupported to continue.",
            file=sys.stderr,
        )
        return 2

    return 0


def _write_report(ep_id: str, research: dict):
    lines = [f"# Research report: {ep_id}\n"]
    unsup = research.get("unsupported") or []
    if unsup:
        lines.append(f"## Unsupported questions ({len(unsup)})\n")
        for qid in unsup:
            row = next((r for r in research["questions"] if r["id"] == qid), {})
            lines.append(f"- **{qid}**: {row.get('text', '')}\n")
    single_src: list[tuple[str, str]] = []
    for ev in research.get("evidence") or []:
        for num in ev.get("single_source_numbers") or []:
            single_src.append((num, ev["source"]))
    if single_src:
        lines.append("\n## Single-source numbers (not corroborated)\n")
        for num, src in single_src:
            lines.append(f"- `{num}` from `{src}` only\n")
    out = ROOT / "out" / ep_id / "research_report.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("".join(lines))
    print(f"research_report.md written: {out}")


# ---------------------------------------------------------------------------
# CLI entry point (called from run.py)
# ---------------------------------------------------------------------------

def main(argv: list[str]) -> int:
    if not argv:
        print("usage: run.py research <ep-id> [--allow-unsupported] [--top N]", file=sys.stderr)
        return 1
    ep_id = argv[0]
    flags = argv[1:]
    allow_unsupported = "--allow-unsupported" in flags
    top_n = 5
    if "--top" in flags:
        idx = flags.index("--top")
        try:
            top_n = int(flags[idx + 1])
        except (IndexError, ValueError):
            pass
    return run(ep_id, top_n=top_n, allow_unsupported=allow_unsupported)


def load(ep_id: str) -> dict:
    """Load research.json for ep_id. Raises FileNotFoundError if missing."""
    p = ROOT / "episodes" / ep_id / "research.json"
    if not p.exists():
        raise FileNotFoundError(f"research.json not found for {ep_id}: {p}")
    return json.loads(p.read_text())
