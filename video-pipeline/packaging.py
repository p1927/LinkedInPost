"""Packaging lint: human-sounding, SEO-sane titles/descriptions/captions. Rules: direction/packaging.md"""
import re

BANNED = ["delve", "dive into", "unlock", "unleash", "game-changer", "game changer", "revolutioniz", "elevate", "journey",
          "tapestry", "landscape", "navigate", "seamless", "robust", "testament", "crucial", "it's important to note",
          "it is important to note", "in today's", "buckle up", "ever wondered", "let's explore", "lets explore",
          "look no further", "in this video", "ultimate guide", "mind-blowing", "you won't believe"]
EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿]")

# Engagement bait: lines that ask for the ACT of engagement instead of its content (packaging.md "Engagement bait").
# (pattern, rewrite hint). Craft/brand rule plus Meta's engagement-bait demotion; YouTube itself allows plain like/subscribe asks.
_RW_OPINION = "ask for the content of an opinion: 'Tell me I'm wrong about <specific claim>.'"
_RW_SEND = "name one recipient: 'Send this to the friend who <specific situation>.'"
_RW_NEXT = "name the next thing: 'Next: <specific next episode>.' or cut it"
BAIT = [
    (re.compile(r"\bcomment\s+(?:yes|below|down\s+below|[\"'“‘]\w+)", re.I), _RW_OPINION),
    (re.compile(r"\b[Cc]omment\s+[A-Z]{2,}\b"), "no keyword-comment triggers; put the link in the description or pinned comment"),
    (re.compile(r"\btag\s+(?:a|your|one|two|three|four|five|\d+)\s+(?:friends?|people|mates?|someone)\b", re.I), _RW_SEND),
    (re.compile(r"\blike\s+(?:this\s+)?(?:for|if)\b", re.I), _RW_NEXT),
    (re.compile(r"\b(?:share|send)\s+(?:this\s+|it\s+)?(?:with|to)\s+(?:\d+|two|three|four|five|ten|all\s+your|every(?:one|body))\b", re.I), _RW_SEND),
    (re.compile(r"\bfollow\s+(?:me\s+|us\s+)?for\s+more\b", re.I), _RW_NEXT),
    (re.compile(r"\b(?:smash|hit|tap)\s+(?:that|the)\s+like\b", re.I), "cut it; let the payoff land"),
    (re.compile(r"\blike\s+(?:and|&)\s+subscribe\b", re.I), _RW_NEXT),
    (re.compile(r"\bdouble[- ]tap\b|\bdrop\s+an?\s+(?:heart|like|emoji)\b", re.I), "cut it"),
    (re.compile(r"\bstop\s+scrolling\b", re.I), "open on the hook object instead (hooks.md); never command the scroll"),
    (re.compile(r"\b(?:dm|message)\s+(?:me|us)\b|\bcheck\s+your\s+dms?\b|\bi'?ll\s+dm\s+you\b", re.I), "no comment-to-DM funnels; link the source openly"),
]
_ASK_VERBS = ("like", "save", "share", "follow", "comment", "subscribe")
# a SPECIFIC pointer: "Next: ...", a quoted title, or a URL ("part 2" or "more" is not specific)
POINTER = re.compile(r"\bnext\s*:\s*\w|\bnext\s+(?:episode|video)\s*(?::|is|explains|covers)|[\"“][^\"”]{6,}[\"”]|https?://", re.I)
LONGFORM = re.compile(r"\bfull\s+(?:video|breakdown|version)\b|\blong(?:er)?[- ]?(?:form|version)\b|\bon\s+(?:my|our)\s+channel\b", re.I)
CONTENT_TYPES = ("explainer", "recommendation", "opinion", "entertainment")
_SEND = re.compile(r"\b(?:send|share)\b", re.I)
_SAVE = re.compile(r"\bsave\b", re.I)
_GROWNUP = re.compile(r"\bask\s+(?:a|your)\s+grown[- ]?ups?\b", re.I)  # kids audience card CTA
_STANCE = re.compile(r"\btell\s+(?:me|us)\b|\bam\s+i\s+wrong\b|\b(?:which|what)\s+(?:one\s+)?would\s+you\b|\?", re.I)
_RECIPIENT = re.compile(r"\b(?:who|whose|that|family|colleague|grown[- ]?up|your\s+\w+)\b", re.I)
_OBJECTION = re.compile(r"^\s*(?:yes|no)\b|\bbefore\s+you\s+(?:ask|say|comment)\b|\bto\s+be\s+clear\b|\bnot\s+(?:sponsored|paid)\b|\bcommon\s+question\b|\bpeople\s+ask\b", re.I)
_STOP = {"how", "why", "what", "when", "where", "who", "does", "do", "did", "is", "are", "was", "the", "a", "an", "with", "of", "to",
         "in", "on", "for", "and", "or", "your", "you", "my", "it", "its", "work", "works", "actually", "really"}
_SCREEN_KEYS = ("text", "title", "label", "value", "unit", "colA", "colB", "caption", "on_screen_text", "steps", "rows")


def _sentences(text: str) -> list:
    return [s for s in re.split(r"(?<=[.!?])\s+|\n+", text) if s.strip()]


def bait_checks(label: str, text: str, issues: list, short=True):
    """Warn `packaging_bait` on engagement-bait shapes; each message carries the rewrite."""
    if not text:
        return
    for rx, hint in BAIT:
        m = rx.search(text)
        if m:
            issues.append(("warn", "packaging_bait", f"{label}: '{m.group(0)}' asks for the act of engagement; {hint}"))
    for s in _sentences(text):
        low = s.lower()
        if short and re.search(r"\bsubscribe\b", low) and not POINTER.search(s):
            issues.append(("warn", "packaging_bait", f"{label}: 'subscribe' with no specific pointer; a Short names the next episode or long-form ('Next: <title>') or says nothing"))
        asks = {v for v in _ASK_VERBS if re.search(rf"\b{v}\b", low)}
        if len(asks) >= 3:
            issues.append(("warn", "packaging_bait", f"{label}: stacked asks ({', '.join(sorted(asks))}); pick one"))


def _kw_words(kw: str) -> list:
    return [w for w in re.findall(r"[a-z0-9]+", kw.lower()) if w not in _STOP]


def _has_kw(words: list, text: str) -> bool:
    toks = re.findall(r"[a-z0-9]+", text.lower())
    hit = sum(1 for w in words if any(t.startswith(w[:5]) if len(w) >= 5 else t in (w, w + "s") for t in toks))
    return hit >= max(1, -(-len(words) // 2))


def _screen_text(v) -> str:
    if isinstance(v, str):
        return v
    if isinstance(v, list):
        return " ".join(_screen_text(x) for x in v)
    if isinstance(v, dict):
        return " ".join(_screen_text(x) for x in v.values())
    return ""


def keyword_surfaces(ep: dict, pk: dict, kw: str) -> list:
    """Three-surface agreement: headline/on-screen text, voiceover and written caption all carry the primary keyword."""
    words = _kw_words(kw)
    if not words:
        return []
    sc = ep.get("scenes") or []
    head = " ".join([pk.get("title", ""), (pk.get("thumbnail") or {}).get("text", "")] +
                    [_screen_text({k: s.get("visual", {}).get(k) for k in _SCREEN_KEYS}) + " " + (s.get("on_screen_text") or "") for s in sc])
    surfaces = {"headline/on-screen text": head, "voiceover": " ".join(s.get("narration", "") for s in sc),
                "written caption": pk.get("description", "") + " " + pk.get("instagram_caption", "")}
    miss = [n for n, t in surfaces.items() if not _has_kw(words, t)]
    if miss:
        return [("warn", "keyword_surfaces", f"primary keyword '{kw}' missing from: {', '.join(miss)} (headline, voiceover and caption should share it)")]
    return []


def cta_checks(ep: dict, pk: dict) -> list:
    """CTA by content type (packaging.md). Our default is explainer: reshare/save to a named recipient or a specific next/long-form pointer."""
    out = []
    ctype = pk.get("content_type", "explainer")
    if ctype not in CONTENT_TYPES:
        return [("warn", "cta_content_type", f"packaging.content_type '{ctype}' not one of {', '.join(CONTENT_TYPES)}")]
    sc = ep.get("scenes") or []
    cta = " ".join(s.get("narration", "") for s in sc if str(s.get("beat", "")).endswith("cta"))
    if not cta.strip():
        return out
    has_send, has_save, has_ptr = bool(_SEND.search(cta)), bool(_SAVE.search(cta)), bool(POINTER.search(cta) or LONGFORM.search(cta))
    if ctype == "explainer" and not (has_send or has_save or has_ptr or _GROWNUP.search(cta)):
        out.append(("warn", "cta_content_type", "explainer CTA has no reshare/save ask and no specific next-episode or long-form pointer (hooks.md: one reshare-framed CTA after the payoff)"))
    elif ctype == "recommendation" and not has_send:
        out.append(("warn", "cta_content_type", "recommendation CTA should be a send to a named recipient"))
    elif ctype == "opinion" and not _STANCE.search(cta):
        out.append(("warn", "cta_content_type", "opinion CTA should ask for a stance ('Tell me I'm wrong about <claim>')"))
    elif ctype == "entertainment" and any(re.search(rf"\b{v}\b", cta.lower()) for v in _ASK_VERBS + ("send",)):
        out.append(("warn", "cta_content_type", "pure entertainment: no CTA, let it loop"))
    if has_send and ep.get("audience") != "kids":
        for s in _sentences(cta):
            if _SEND.search(s) and not _RECIPIENT.search(s):
                out.append(("warn", "cta_recipient", f"send/share CTA names no recipient: '{s.strip()[:70]}' -> 'Send this to the friend who <specific situation>.'"))
    return out


def bridge_checks(ep: dict, pk: dict) -> list:
    """Short-to-long-form bridge: a long-form promise needs a real destination with a concrete extra."""
    out = []
    lf = pk.get("long_form") or {}
    sc = ep.get("scenes") or []
    said = " ".join([s.get("narration", "") for s in sc] + [pk.get("pinned_comment", ""), pk.get("instagram_caption", "")])
    if LONGFORM.search(said) and not lf.get("title"):
        out.append(("warn", "bridge_pointer", "mentions a full/long version but packaging.long_form {title, url, extra} is not set; name the exact long-form or cut the line"))
    if lf:
        if not lf.get("title"):
            out.append(("warn", "bridge_pointer", "packaging.long_form.title missing (the exact long-form title)"))
        extra = (lf.get("extra") or "").strip().lower()
        if not extra or re.fullmatch(r"(the\s+)?(longer|full|more|extended)(\s+(version|detail|details|video|breakdown))?\.?", extra):
            out.append(("warn", "bridge_pointer", "packaging.long_form.extra must name one concrete thing not in the Short ('longer version' earns no clicks)"))
        if lf.get("url") and pk.get("pinned_comment") and lf["url"] not in pk["pinned_comment"]:
            out.append(("warn", "bridge_pointer", "pinned comment should carry the long_form url"))
    return out


def pinned_checks(pk: dict) -> list:
    pc = (pk.get("pinned_comment") or "").strip()
    if not pc:
        return []
    out = []
    if "http" not in pc:
        out.append(("warn", "pinned_comment", "pinned comment has no source link (spec: question or objection-killer + source URL)"))
    if "?" not in pc and not _OBJECTION.search(pc):
        out.append(("warn", "pinned_comment", "pinned comment is neither a genuine question nor an objection-killer"))
    return out


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
    for label, text in (("title", title), ("description", desc), ("instagram_caption", ig), ("pinned_comment", pk.get("pinned_comment", ""))):
        bait_checks(label, re.sub(r"https?://\S+", "", text or ""), issues)
    for s in ep.get("scenes") or []:
        bait_checks(f"{s.get('id')} narration", s.get("narration", ""), issues)
        bait_checks(f"{s.get('id')} on-screen text", s.get("on_screen_text") or "", issues)
    issues.extend(cta_checks(ep, pk))
    issues.extend(bridge_checks(ep, pk))
    issues.extend(pinned_checks(pk))
    if kw:
        issues.extend(keyword_surfaces(ep, pk, kw))
    th = pk.get("thumbnail") or {}
    if not th.get("text"):
        issues.append(("error", "thumbnail_text", "packaging.thumbnail.text missing (<= 4 words)"))
    elif len(th["text"].split()) > 4:
        issues.append(("warn", "thumbnail_text", f"thumbnail text has {len(th['text'].split())} words (max 4)"))
    return issues
