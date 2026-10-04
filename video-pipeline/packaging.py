"""Packaging lint: human-sounding, SEO-sane titles/descriptions/captions. Rules: direction/packaging.md"""
import re

BANNED = ["delve", "dive into", "unlock", "unleash", "game-changer", "game changer", "revolutioniz", "elevate", "journey",
          "tapestry", "landscape", "navigate", "seamless", "robust", "testament", "crucial", "it's important to note",
          "it is important to note", "in today's", "buckle up", "ever wondered", "let's explore", "lets explore",
          "look no further", "in this video", "ultimate guide", "mind-blowing", "you won't believe"]
EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿]")


def _txt_checks(label: str, text: str, issues: list, max_excl=1):
    text = re.sub(r"https?://\S+", "", text)  # URL slugs are not prose
    low = text.lower()
    for b in BANNED:
        if b in low:
            issues.append(("warn", "ai_sounding_phrase", f"{label}: contains '{b}'"))
    if text.count("—") > 1:
        issues.append(("warn", "ai_sounding_phrase", f"{label}: more than one em dash"))
    if text.count("!") > max_excl:
        issues.append(("warn", "ai_sounding_phrase", f"{label}: more than {max_excl} exclamation mark(s)"))
    if len(EMOJI.findall(text)) > 2:
        issues.append(("warn", "emoji_overuse", f"{label}: more than 2 emoji"))


def run(ep: dict) -> list:
    issues = []
    pk = ep.get("packaging")
    if not pk:
        return [("error", "packaging_present", "episode has no packaging block (primary_keyword, title, description, tags, thumbnail)")]
    kw = (pk.get("primary_keyword") or "").strip().lower()
    title, desc = pk.get("title", ""), pk.get("description", "")
    if not kw:
        issues.append(("error", "primary_keyword", "packaging.primary_keyword missing"))
    if not title:
        issues.append(("error", "title_present", "packaging.title missing"))
    else:
        if len(title) > 100:
            issues.append(("error", "title_length", f"{len(title)} chars (YouTube max 100)"))
        elif len(title) > 65:
            issues.append(("warn", "title_length", f"{len(title)} chars; aim for <= 60 so phones do not truncate it"))
        if kw and kw.split()[0] not in title.lower()[:50] and not all(w in title.lower() for w in kw.split()[:3]):
            issues.append(("warn", "title_keyword", f"primary keyword '{kw}' not clearly in the first ~45 characters of the title"))
        if title.isupper():
            issues.append(("warn", "title_caps", "title is ALL CAPS"))
        if "#" in title:
            issues.append(("warn", "title_hashtag", "keep hashtags out of the title"))
        _txt_checks("title", title, issues, max_excl=0)
    if len(pk.get("title_options", [])) < 3:
        issues.append(("warn", "title_options", "write >= 3 title options and record the rationale"))
    if desc:
        first = desc.strip().split("\n")[0][:140].lower()
        if kw and not any(w in first for w in kw.split()):
            issues.append(("warn", "description_hook", "primary keyword words not in the first ~140 characters of the description"))
        tags = re.findall(r"#\w+", desc)
        if len(tags) > 5:
            issues.append(("warn", "hashtag_count", f"{len(tags)} hashtags; use 3-5"))
        if (ep.get("claims") or ep.get("sources")) and "http" not in desc:
            issues.append(("warn", "description_sources", "description lists no source URLs"))
        _txt_checks("description", desc, issues)
    else:
        issues.append(("error", "description_present", "packaging.description missing"))
    if sum(len(t) for t in pk.get("tags", [])) > 480:
        issues.append(("warn", "tags_length", "tags exceed ~480 characters"))
    ig = pk.get("instagram_caption", "")
    if ig:
        _txt_checks("instagram_caption", ig, issues)
    th = pk.get("thumbnail") or {}
    if not th.get("text"):
        issues.append(("error", "thumbnail_text", "packaging.thumbnail.text missing (<= 4 words)"))
    elif len(th["text"].split()) > 4:
        issues.append(("warn", "thumbnail_text", f"thumbnail text has {len(th['text'].split())} words (max 4)"))
    return issues
