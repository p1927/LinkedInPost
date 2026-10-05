# COPIED VERBATIM from the owner's Trade repo (integrations/trade_integrations/dataflows/web_research/snippet_dates.py, commit 7ed18aa54, 2026-09-07).
# stdlib only (re, datetime). Do not edit here: re-copy from Trade to update. Used by adapters/news_web.py to date search snippets;
# it refuses relative dates ("yesterday") on purpose, so an undated snippet stays undated instead of being guessed.
"""Explicit dates out of search-snippet prose — the one date parser for web-research text.

Promoted verbatim out of `index_research.sources.web_research_events`, which hardened it over a
real live-verification round and is now one of two callers (the other is
`stock_simulator.recorder.macro_poller`, which needs the vendor's own date for an FII/DII
figure rather than the day it happened to poll). It lives here, in the `web_research` facade
package, because that is the one package both callers already depend on; a second, subtly
different date parser in the recorder is exactly what this module exists to prevent.

**What counts as a date, and what does not.** Only a date the snippet states *explicitly* is
returned. Relative text — "next week", "12 hours ago", "yesterday", "on Tuesday" — is refused,
because inferring a calendar date from it is a fabrication: the reader has no way to tell the
inferred date from a stated one once it is stored. This is a rule about *inference*, not about
format: an ISO `2026-09-02` and a prose `September 2` are equally explicit, only differently
spelled, so both are accepted (`Month Day[, Year]` and `Day Month[, Year]`, full or abbreviated
month names, optional weekday prefix, optional trailing time — all ignored). That extension was
made after live testing found the ISO-only form almost never fired against real
Bloomberg/Trading-Economics/Moneycontrol snippets
([[2026-08-27-web-research-events-low-yield-query]]).

**An omitted year is the current year, never rolled forward.** A generic web snippet carries no
known recurrence, so a bare "AUG 25" seen after August 25 is far more likely a past-tense
headline ("Stocks closed lower Tue AUG 25") than next year's August 25. Resolving it forward
would be precisely the wrong-date fabrication above. Callers decide what a past date means for
them: `web_research_events` discards it (a calendar of already-happened events is useless),
while `macro_poller` *wants* it (yesterday's flow figure is dated yesterday) and instead refuses
dates in the future.

**Sentence scoping** (`split_sentences`, `unambiguous_date`) exists for the `macro_poller` case
and has no effect on the events caller. A market-wrap article names several dates in one
snippet — the session it reports on, the next policy meeting, the article's own byline date.
Scanning the whole snippet for "the" date and attaching it to a number matched elsewhere in it
attributes the figure to whichever date the regex reached first, which is a coin flip. So a
caller that is dating a *specific matched span* asks only the sentence that span sits in, and
`unambiguous_date` returns `None` when that sentence names more than one distinct date rather
than picking one.

Sentence splitting deliberately does not split on a period that terminates a known abbreviation
(`Sept.`, `Rs.`, an initial) — splitting "Sept. 2" in half would destroy the very date being
looked for.
"""

from __future__ import annotations

import re
from datetime import date

_ISO_DATE_RE = re.compile(r"\b(20\d{2}-\d{2}-\d{2})\b")

MONTH_NAMES: dict[str, int] = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}
_MONTH_ALT = "|".join(sorted(MONTH_NAMES, key=len, reverse=True))
#: Separators use `[\s-]+`/`[,-]?\s*` rather than plain whitespace so that a hyphenated vendor
#: date like nseindia.com's `04-Sep-2026` matches alongside whitespace-separated prose
#: (`04 Sep 2026`, `September 4, 2026`) -- both are equally explicit, only differently spelled,
#: same as the ISO-vs-prose equivalence in the module docstring.
_MONTH_DAY_RE = re.compile(
    rf"\b(?:{_MONTH_ALT})\.?[\s-]+(\d{{1,2}})(?:st|nd|rd|th)?(?:[,-]?\s*(\d{{4}}))?\b",
    re.IGNORECASE,
)
_DAY_MONTH_RE = re.compile(
    rf"\b(\d{{1,2}})(?:st|nd|rd|th)?[\s-]+(?:{_MONTH_ALT})\.?(?:[,-]?\s*(\d{{4}}))?\b",
    re.IGNORECASE,
)
_MONTH_TOKEN_RE = re.compile(rf"({_MONTH_ALT})", re.IGNORECASE)

#: Words whose trailing period is part of the word, not a sentence end. Month abbreviations are
#: the load-bearing entries -- "Sept. 2" must survive splitting -- the rest are the abbreviations
#: that actually occur in Indian/global market prose.
_ABBREVIATIONS = set(MONTH_NAMES) | {
    "rs", "no", "vs", "inc", "ltd", "pvt", "co", "corp", "approx", "est", "etc", "mr", "mrs",
    "ms", "dr", "prof", "sen", "gov", "u.s", "a.m", "p.m",
}
_SENTENCE_BOUNDARY_RE = re.compile(r"[.!?;\n]+(?:\s+|$)")
_TRAILING_WORD_RE = re.compile(r"([A-Za-z]+)$")


def _resolve_year(explicit_year: str | None) -> int:
    return int(explicit_year) if explicit_year else date.today().year


def extract_prose_date(text: str) -> str | None:
    """The first `Month Day` / `Day Month` date in `text`, ISO-formatted, or `None`."""
    for pattern, day_group, year_group in ((_MONTH_DAY_RE, 1, 2), (_DAY_MONTH_RE, 1, 2)):
        match = pattern.search(text)
        if not match:
            continue
        resolved = _resolve_match(match, day_group, year_group)
        if resolved is not None:
            return resolved
    return None


def extract_explicit_date(text: str) -> str | None:
    """The first explicitly-stated date in `text`, ISO-formatted, or `None` if it states none.

    ISO wins over prose when both are present, matching the order a snippet's own machine-
    readable date (when it has one) should outrank prose in its body.
    """
    text = text or ""
    match = _ISO_DATE_RE.search(text)
    if match:
        raw = match.group(1)
        try:
            date.fromisoformat(raw)
        except ValueError:
            return None
        return raw
    return extract_prose_date(text)


def all_explicit_dates(text: str) -> list[str]:
    """Every distinct explicitly-stated date in `text`, in order of first appearance.

    Used to detect ambiguity — a caller dating one specific figure needs to know that the text
    around it names two dates, not just what the first one was.
    """
    text = text or ""
    found: list[str] = []
    seen: set[str] = set()

    def _add(value: str | None) -> None:
        if value and value not in seen:
            seen.add(value)
            found.append(value)

    for match in _ISO_DATE_RE.finditer(text):
        raw = match.group(1)
        try:
            date.fromisoformat(raw)
        except ValueError:
            continue
        _add(raw)
    for pattern, day_group, year_group in ((_MONTH_DAY_RE, 1, 2), (_DAY_MONTH_RE, 1, 2)):
        for match in pattern.finditer(text):
            _add(_resolve_match(match, day_group, year_group))
    return found


def split_sentences(text: str) -> list[tuple[int, int, str]]:
    """`text` split into `(start, end, sentence)` spans on `.`/`!`/`?`/`;`/newline.

    Offsets are into `text` itself so a caller holding a regex match span can find the sentence
    it fell in (`sentence_for_span`). A period that ends a known abbreviation or a single-letter
    initial is not a boundary — see the module docstring.
    """
    text = text or ""
    spans: list[tuple[int, int, str]] = []
    start = 0
    for boundary in _SENTENCE_BOUNDARY_RE.finditer(text):
        head = text[start:boundary.start()]
        trailing = _TRAILING_WORD_RE.search(head)
        if trailing:
            word = trailing.group(1)
            if word.lower() in _ABBREVIATIONS or (len(word) == 1 and word.isupper()):
                continue
        spans.append((start, boundary.start(), head))
        start = boundary.end()
    if start < len(text):
        spans.append((start, len(text), text[start:]))
    return spans


def sentence_for_span(text: str, span: tuple[int, int]) -> str | None:
    """The sentence of `text` wholly containing `span`, or `None` if the span straddles two.

    A span that crosses a sentence boundary has no single sentence to take a date from, and
    guessing which side to use is the same coin flip the scoping rule exists to remove.
    """
    begin, end = span
    for start, stop, sentence in split_sentences(text):
        if start <= begin and end <= stop:
            return sentence
        if start <= begin < stop:
            return None
    return None


def unambiguous_date(text: str) -> str | None:
    """The single explicit date `text` states, or `None` if it states none — or more than one.

    Refusing a multi-date sentence is the point: "FIIs sold ₹5,805 crore on September 2, ahead
    of the September 30 policy review" states two dates and nothing in the text says which one
    the figure belongs to.
    """
    dates = all_explicit_dates(text)
    return dates[0] if len(dates) == 1 else None


def _resolve_match(match: "re.Match[str]", day_group: int, year_group: int) -> str | None:
    month_token = _MONTH_TOKEN_RE.search(match.group(0))
    if not month_token:
        return None
    month = MONTH_NAMES.get(month_token.group(1).lower())
    if not month:
        return None
    try:
        day = int(match.group(day_group))
    except (TypeError, ValueError):
        return None
    year = _resolve_year(match.group(year_group))
    try:
        return date(year, month, day).isoformat()
    except ValueError:
        return None


__all__ = [
    "MONTH_NAMES",
    "all_explicit_dates",
    "extract_explicit_date",
    "extract_prose_date",
    "sentence_for_span",
    "split_sentences",
    "unambiguous_date",
]
