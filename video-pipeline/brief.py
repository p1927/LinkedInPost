"""L1 brief layer — parse the owner's request and write episodes/<id>/brief.json.

  python run.py brief <ep-id> --text "<owner request>" [--genre explainer] [--question "..."] ...
  python run.py brief <ep-id> --from-episode   # reconstruct from existing episode.json (ep24 style)

brief.json is locked after write. Questions and dates are stored verbatim and must never be altered
by any later layer. Use assert_intact(brief, episode) to verify this invariant after every LLM call.

Schema: direction/brief.schema.json (schema_version 1).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

from adapters.common import ROOT

# ---------------------------------------------------------------------------
# Date normaliser: find explicit YYYY-MM-DD, YYYY-MM, or "N Month YYYY" dates.
# "yesterday", "last week" etc. are refused (ambiguous). Keeps raw text + iso.
# ---------------------------------------------------------------------------
_MONTH_MAP = {
    "january": "01", "february": "02", "march": "03", "april": "04",
    "may": "05", "june": "06", "july": "07", "august": "08",
    "september": "09", "october": "10", "november": "11", "december": "12",
    "jan": "01", "feb": "02", "mar": "03", "apr": "04",
    "jun": "06", "jul": "07", "aug": "08", "sep": "09",
    "oct": "10", "nov": "11", "dec": "12",
}
_ISO_FULL = re.compile(r"\b(\d{4}-\d{2}-\d{2})\b")
_ISO_MON  = re.compile(r"\b(\d{4}-\d{2})\b")
_D_MON_Y  = re.compile(r"\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b")
_MON_D_Y  = re.compile(r"\b([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\b")
_MON_Y    = re.compile(r"\b([A-Za-z]+)\s+(\d{4})\b")


_D_MON_ONLY = re.compile(r"\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b(?!\s*,?\s*\d{4})", re.I)
_MON_D_ONLY = re.compile(r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?\b(?!\s*,?\s*\d{4})", re.I)


def _extract_dates(text: str) -> list[dict]:
    """Return [{raw, iso}] for explicit dates found in text. No duplicates."""
    found: list[dict] = []
    seen: set[str] = set()

    def _add(raw: str, iso: str):
        if iso not in seen:
            seen.add(iso)
            found.append({"raw": raw.strip(), "iso": iso})

    for m in _ISO_FULL.finditer(text):
        _add(m.group(1), m.group(1))
    for m in _ISO_MON.finditer(text):
        if m.group(1) not in seen:
            _add(m.group(1), m.group(1))
    for m in _D_MON_Y.finditer(text):
        mon = _MONTH_MAP.get(m.group(2).lower())
        if mon:
            iso = f"{m.group(3)}-{mon}-{int(m.group(1)):02d}"
            _add(m.group(0), iso)
    for m in _MON_D_Y.finditer(text):
        mon = _MONTH_MAP.get(m.group(1).lower())
        if mon:
            iso = f"{m.group(3)}-{mon}-{int(m.group(2)):02d}"
            _add(m.group(0), iso)
    for m in _MON_Y.finditer(text):
        mon = _MONTH_MAP.get(m.group(1).lower())
        if mon:
            iso = f"{m.group(2)}-{mon}"
            if iso not in seen:
                _add(m.group(0), iso)
    # day + month with no year ("1 October"): kept verbatim so a rewrite to another day is caught; iso is year-less (--MM-DD)
    for m in _D_MON_ONLY.finditer(text):
        mon = _MONTH_MAP.get(m.group(2).lower())
        if mon:
            _add(m.group(0), f"--{mon}-{int(m.group(1)):02d}")
    for m in _MON_D_ONLY.finditer(text):
        mon = _MONTH_MAP.get(m.group(1).lower())
        if mon:
            _add(m.group(0), f"--{mon}-{int(m.group(2)):02d}")
    return found


# ---------------------------------------------------------------------------
# Integrity check
# ---------------------------------------------------------------------------

def _normalise_ws(s: str) -> str:
    return " ".join(s.lower().split())


def assert_intact(brief: dict, episode: dict) -> None:
    """Fail with AssertionError if any brief question wording or date is no longer
    present (case-insensitive, whitespace-normalised) in the episode's content.
    Call after every LLM rewrite of episode.json."""
    ep_text = _normalise_ws(json.dumps(episode))
    for q in brief.get("questions", []):
        qtext = _normalise_ws(q["text"])
        if qtext not in ep_text:
            raise AssertionError(
                f"Brief integrity violation: question {q['id']!r} wording changed or missing.\n"
                f"  Expected (normalised): {qtext!r}\n"
                f"  Not found in episode text."
            )
    for d in brief.get("dates", []):
        raw_n = _normalise_ws(d["raw"])
        iso_n = _normalise_ws(d["iso"])
        if raw_n not in ep_text and iso_n not in ep_text:
            raise AssertionError(
                f"Brief integrity violation: date {d['raw']!r} (iso {d['iso']!r}) "
                f"no longer appears in the episode."
            )


# ---------------------------------------------------------------------------
# Build a brief dict
# ---------------------------------------------------------------------------

def _build_brief(ep_id: str, text: str, questions: list[str],
                 genre: str = "explainer", audience: str = "curious_adult") -> dict:
    all_text = " ".join([text] + questions)
    dates = _extract_dates(all_text)

    # Questions: explicit --question flags take precedence over text
    if questions:
        q_list = [{"id": f"q{i + 1}", "text": q.strip()} for i, q in enumerate(questions)]
    else:
        # Treat the text as a single question
        q_list = [{"id": "q1", "text": text.strip()}]

    return {
        "schema_version": 1,
        "id": ep_id,
        "genre": genre,
        "audience": audience,
        "topic": text.strip(),
        "questions": q_list,
        "dates": dates,
        "constraints": {},
        "approvals": {"outline": False, "script": True, "preview": True, "publish": True},
    }


def _reconstruct_from_episode(ep_id: str, ep: dict) -> dict:
    """Build a brief.json from an old episode.json that has a brief[] list of {question, answered_in}.
    Genre defaults to explainer; audience taken from episode."""
    questions_raw = ep.get("brief") or []
    q_list = [{"id": f"q{i + 1}", "text": q["question"].strip()}
              for i, q in enumerate(questions_raw) if q.get("question")]
    topic = (ep.get("topic") or {}).get("headline") or ep.get("title") or ep_id
    all_text = " ".join(q["text"] for q in q_list) + " " + topic
    dates = _extract_dates(all_text)
    return {
        "schema_version": 1,
        "id": ep_id,
        "genre": ep.get("genre") or "explainer",
        "audience": ep.get("audience") or "curious_adult",
        "topic": topic,
        "questions": q_list,
        "dates": dates,
        "constraints": {},
        "approvals": {"outline": False, "script": True, "preview": True, "publish": True},
    }


# ---------------------------------------------------------------------------
# Validate against schema
# ---------------------------------------------------------------------------

def _validate(brief: dict) -> list[str]:
    """Minimal structural validation without jsonschema dependency."""
    errors = []
    if brief.get("schema_version") != 1:
        errors.append("schema_version must be 1")
    if not brief.get("id"):
        errors.append("id is required")
    if not brief.get("questions"):
        errors.append("questions must not be empty")
    for i, q in enumerate(brief.get("questions", [])):
        if not q.get("text"):
            errors.append(f"questions[{i}].text is empty")
    return errors


# ---------------------------------------------------------------------------
# CLI entry point (called from run.py)
# ---------------------------------------------------------------------------

def main(argv: list[str]) -> int:
    """brief <ep-id> --text "..." [--genre G] [--question "..."]... [--from-episode]
    Writes episodes/<ep-id>/brief.json and prints it.
    Returns 0 on success, 1 on error."""
    if not argv:
        print("usage: run.py brief <ep-id> --text \"...\" [--genre G] [--question \"...\"]...", file=sys.stderr)
        return 1

    ep_id = argv[0]
    ep_dir = ROOT / "episodes" / ep_id
    out = ep_dir / "brief.json"

    flags = argv[1:]
    text = ""
    genre = "explainer"
    audience = "curious_adult"
    questions: list[str] = []
    from_episode = False

    i = 0
    while i < len(flags):
        f = flags[i]
        if f == "--text" and i + 1 < len(flags):
            text = flags[i + 1]; i += 2
        elif f.startswith("--text="):
            text = f[7:]; i += 1
        elif f == "--genre" and i + 1 < len(flags):
            genre = flags[i + 1]; i += 2
        elif f.startswith("--genre="):
            genre = f[8:]; i += 1
        elif f == "--audience" and i + 1 < len(flags):
            audience = flags[i + 1]; i += 2
        elif f == "--question" and i + 1 < len(flags):
            questions.append(flags[i + 1]); i += 2
        elif f.startswith("--question="):
            questions.append(f[11:]); i += 1
        elif f == "--from-episode":
            from_episode = True; i += 1
        else:
            i += 1

    if from_episode:
        ep_json = ep_dir / "episode.json"
        if not ep_json.exists():
            print(f"error: {ep_json} not found", file=sys.stderr)
            return 1
        ep = json.loads(ep_json.read_text())
        brief = _reconstruct_from_episode(ep_id, ep)
    else:
        if not text:
            print("error: --text is required (or use --from-episode)", file=sys.stderr)
            return 1
        brief = _build_brief(ep_id, text, questions, genre, audience)

    errors = _validate(brief)
    if errors:
        for e in errors:
            print(f"validation error: {e}", file=sys.stderr)
        return 1

    ep_dir.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(brief, indent=2, ensure_ascii=False))
    print(json.dumps(brief, indent=2, ensure_ascii=False))
    return 0


# ---------------------------------------------------------------------------
# Convenience loader (used by research.py, outline.py)
# ---------------------------------------------------------------------------

def load(ep_id: str) -> dict:
    """Load brief.json for ep_id. Raises FileNotFoundError if missing."""
    p = ROOT / "episodes" / ep_id / "brief.json"
    if not p.exists():
        raise FileNotFoundError(f"brief.json not found for {ep_id}: {p}")
    return json.loads(p.read_text())
