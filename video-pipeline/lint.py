"""Script/episode linter. Errors block approval; warnings are advice. Thresholds are defaults for the ELI5 profile
(see direction/audience.yaml and direction/qa_checklist.yaml for the rationale; evidence level of each rule is tagged there)."""
import json
import re
from pathlib import Path

import registry
from adapters.common import ROOT

import yaml

_RULES = {}
try:
    _RULES = {r["id"]: r for r in yaml.safe_load((ROOT / "direction" / "qa_checklist.yaml").read_text())["rules"]}
except FileNotFoundError:  # checklist missing: fall back to defaults below (a malformed one must fail loudly, not silently use defaults)
    pass


def thr(rid, key="threshold", default=None):
    return _RULES.get(rid, {}).get(key, default)


def sev(rid, default="warn"):
    return _RULES.get(rid, {}).get("severity", default)


def _sentences(text: str) -> list:
    return [s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s]


_SCHEMA_FILE = ROOT / "direction" / "episode.schema.json"
_LEGACY_REQUIRED = ["id", "title", "scenes"]  # episodes without `audience` predate the full contract


_KEY_HINTS = {"seconds": "duration_s", "duration": "duration_s", "secs": "duration_s", "length_s": "duration_s",
              "dialect": "medium", "style": "medium", "look": "medium", "scenes": "scene_ids", "shots": "scene_ids",
              "source_url": "url", "source": "url", "link": "url", "href": "url"}


def _schema_msg(e) -> str:
    """jsonschema message, plus the allowed key names for a closed object (the writer must learn the real names),
    a rename hint when a required key is missing but a known alias is present, and an 'omit it' hint for nulls."""
    msg = e.message[:160]
    if e.instance is None and e.validator in ("type", "enum", "const", "oneOf", "anyOf", "minLength", "pattern"):
        return "is null: omit the key instead of sending null (optional fields are left out, never set to null)"
    if e.validator == "pattern" and e.validator_value == "\\w":
        return f"{e.instance!r} has no words (empty, '...' or punctuation only): write the real spoken line (a cold-open scene: one line of 1-6 words)"
    if e.validator == "required" and isinstance(e.instance, dict):
        m = re.match(r"'([^']+)' is a required property", e.message)
        alias = [k for k in e.instance if m and _KEY_HINTS.get(k) == m.group(1)]
        if alias:
            return f"{msg}; found '{alias[0]}': rename it to '{m.group(1)}' ('{alias[0]}' -> '{m.group(1)}')"
    if e.validator == "additionalProperties" and isinstance(e.schema, dict) and isinstance(e.instance, dict):
        allowed = sorted(e.schema.get("properties") or {})
        extra = [k for k in e.instance if k not in allowed and not k.startswith("x-")]
        hints = [f"'{k}' -> '{_KEY_HINTS[k]}'" for k in extra if _KEY_HINTS.get(k) in allowed]
        msg = (f"unknown key(s) {extra}; allowed keys: {allowed}" + (f"; did you mean {', '.join(hints)}" if hints else ""))
    return msg


def schema_issues(ep: dict, limit: int = 10) -> list:
    """Shape check against direction/episode.schema.json (the one validator; director.py and `run.py lint` both call it)."""
    import jsonschema
    if not isinstance(ep, dict):
        return [("error", "schema", "(root): episode is not a JSON object")]
    schema = json.loads(_SCHEMA_FILE.read_text())
    if not ep.get("audience"):
        schema["required"] = _LEGACY_REQUIRED
    errs = sorted(jsonschema.Draft202012Validator(schema).iter_errors(ep), key=lambda e: list(map(str, e.absolute_path)))
    short = {tuple(e.absolute_path) for e in errs if e.validator == "minLength"}  # '' fails minLength and the \w pattern: report once
    errs = [e for e in errs if not (e.validator == "pattern" and tuple(e.absolute_path) in short)][:limit]
    return [("error", "schema", f"{'/'.join(map(str, e.absolute_path)) or '(root)'}: {_schema_msg(e)}") for e in errs]


def shape_issues(ep) -> list:
    """Minimum shape lint.run needs (a draft saved mid-write may lack it). Empty list = safe to lint."""
    if not isinstance(ep, dict):
        return [("error", "schema", "(root): episode is not a JSON object")]
    if not isinstance(ep.get("id"), str):
        return [("error", "schema", "id: missing or not a string")]
    sc = ep.get("scenes")
    if not isinstance(sc, list) or not sc:
        return [("error", "schema", "scenes: missing or empty (draft saved without scenes; re-run the director or restore the scenes)")]
    bad = [str(i) for i, s in enumerate(sc) if not (isinstance(s, dict) and isinstance(s.get("id"), str) and isinstance(s.get("beat"), str)
                                                    and isinstance(s.get("narration"), str) and isinstance(s.get("visual"), dict)
                                                    and isinstance(s["visual"].get("type"), str))]
    if bad:
        return [("error", "schema", f"scenes/{','.join(bad[:5])}: each scene needs id, beat, narration (strings) and visual {{type}}")]
    return []


def _clip_seconds():
    """Configured provider clip length (config/providers.yaml video.init_args.duration), or None if unreadable."""
    try:
        return float(yaml.safe_load((ROOT / "config" / "providers.yaml").read_text())["video"]["init_args"]["duration"])
    except (OSError, KeyError, TypeError, ValueError, yaml.YAMLError):
        return None


def _low_authority_domains() -> set:
    """Non-authoritative domains from config/source_quality.yaml (optional file; absent or unparsable = no check).
    Accepts a top-level list, or a mapping with one of the keys below holding a list of domains (or {domain: ...})."""
    f = ROOT / "config" / "source_quality.yaml"
    if not f.exists():
        return set()
    try:
        data = yaml.safe_load(f.read_text())
    except yaml.YAMLError:
        return set()
    vals = data if isinstance(data, list) else None
    if isinstance(data, dict):
        for k in ("non_authoritative", "low_authority", "low_authority_domains", "non_authoritative_domains", "low", "blocklist", "deny"):
            if data.get(k):
                vals = data[k]
                break
    if isinstance(vals, dict):
        vals = list(vals)
    out = set()
    for v in vals or []:
        d = v.get("domain") if isinstance(v, dict) else v
        if isinstance(d, str) and d.strip():
            out.add(d.strip().lower().lstrip(".").removeprefix("www."))
    return out


def _domain(url: str) -> str:
    from urllib.parse import urlparse
    return (urlparse(url or "").hostname or "").lower().removeprefix("www.")


def provenance(ep: dict, catalog_urls) -> list:
    """Claim gate (semantics ported from vendor/youtube-automation-agent utils/provenance-service.js, MIT):
    a claim is `supported` only if its source_url was actually fetched into the source catalog; empty -> `unsupported`.
    Marks claim['verified'] accordingly and returns error issues for unsupported claims. URL provenance only:
    whether the page really backs the sentence is still the human reviewer's job."""
    cat, issues = set(catalog_urls), []
    for i, c in enumerate(ep.get("claims") or []):
        url = c.pop("source_url", None) or c.get("url") or ""   # canonical key is `url` (older drafts used source_url)
        c["url"] = url
        c["verified"] = url in cat
        if not c["verified"]:
            issues.append(("error", "claims_urls_in_catalog", f"claim {i + 1} cites a URL that was not fetched: {url or '(none)'}"))
    return issues


def _explanation_checks(ep: dict) -> list:
    """Mechanical 'did we actually explain it' checks for audience-declared episodes (see GAPS-AND-IMPROVEMENT-PLAN.md)."""
    out = []
    card_f = ROOT / "direction" / "audiences" / f"{ep['audience']}.yaml"
    if not card_f.exists():
        return [("error", "audience_known", f"unknown audience '{ep['audience']}'")]
    card = yaml.safe_load(card_f.read_text())
    sc = ep["scenes"]
    idx = {s["id"]: i for i, s in enumerate(sc)}
    # card limits
    for s in sc:
        for sent in _sentences(s["narration"]):
            if len(sent.split()) > card["sentence_words_max"]:
                out.append(("error", "audience_sentence_max", f"{s['id']}: {len(sent.split())} words > {card['sentence_words_max']} for '{card['id']}'"))
    words = sum(len(s["narration"].split()) for s in sc)
    est = words / card["pace_wps"]
    lo, hi = card["length_sec"]
    if not (lo - 5 <= est <= hi + 5):
        out.append(("warn", "audience_length", f"~{est:.0f}s at {card['pace_wps']} w/s; '{card['id']}' target {lo}-{hi}s"))
    # mechanism: the 'how', step by step, each step narrated and shown
    mech = ep.get("mechanism") or []
    mlo, mhi = card["mechanism_steps"]
    if not mech:
        out.append(("error", "mechanism_present", "episode has no `mechanism` chain (the numbered 'how it works' steps)"))
    else:
        if not (mlo <= len(mech) <= mhi):
            out.append(("warn", "mechanism_steps", f"{len(mech)} steps; '{card['id']}' expects {mlo}-{mhi}"))
        last = -1
        for m in mech:
            sid = m.get("scene")
            if sid not in idx:
                out.append(("error", "mechanism_mapped", f"mechanism step '{m.get('step','?')[:40]}' maps to unknown scene {sid}"))
                continue
            if idx[sid] < last:
                out.append(("warn", "mechanism_order", f"step '{m['step'][:40]}' appears before the previous step"))
            last = max(last, idx[sid])
            if not (m.get("source") or "").startswith("http"):
                out.append(("warn", "mechanism_sourced", f"step '{m['step'][:40]}' has no source URL"))
    kinds = {s["visual"]["type"] for s in sc}
    if not kinds & {"diagram", "steps", "orbit", "clip"}:
        out.append(("error", "mechanism_visual", "no scene SHOWS the mechanism (need a diagram/steps scene or a clip)"))
    # concepts introduced before use
    new_terms = 0
    for c in ep.get("concepts", []):
        if c.get("kind", "term") == "term":
            new_terms += 1
        i0 = idx.get(c.get("introduced_in"), None)
        if i0 is None:
            out.append(("error", "concept_introduced", f"concept '{c.get('name')}' has no valid introduced_in scene"))
            continue
        if not c.get("definition"):
            out.append(("warn", "concept_defined", f"concept '{c['name']}' has no plain definition"))
        for n in c.get("needed_in", []):
            if idx.get(n, 99) < i0:
                out.append(("error", "concept_before_intro", f"'{c['name']}' is used in {n} before it is introduced in {c['introduced_in']}"))
    if new_terms > card["jargon_budget"]:
        out.append(("warn", "jargon_budget", f"{new_terms} new terms; '{card['id']}' budget is {card['jargon_budget']}"))
    # open loops
    for lp in ep.get("loops", []):
        r, pd = idx.get(lp.get("raised_in")), idx.get(lp.get("paid_in"))
        if r is None or pd is None or pd <= r:
            out.append(("error", "loop_paid_off", f"question '{str(lp.get('question'))[:50]}' is not answered in a later scene"))
    if not ep.get("loops"):
        out.append(("warn", "loops_declared", "no `loops` ledger (every question the hook raises must be answered later)"))
    # variety / provenance
    mix = {}
    for s in sc:
        mix[s["visual"]["type"]] = mix.get(s["visual"]["type"], 0) + 1
    top = max(mix.values()) / len(sc)
    if top > 0.5:
        out.append(("warn", "template_mix", f"{max(mix, key=mix.get)} scenes are {top:.0%} of the video (slideshow risk); mix: {mix}"))
    n_clips = sum(1 for s in sc if s["visual"]["type"] == "clip")
    if n_clips < thr("min_clip_scenes", "threshold", 1):
        out.append((sev("min_clip_scenes", "error"), "min_clip_scenes", f"{n_clips} clip scene(s): every video must include at least {thr('min_clip_scenes', 'threshold', 1)} MiniMax Hailuo clip (owner requirement)"))
    if not ep.get("news_hook", {}).get("url"):
        out.append(("warn", "news_hook", "no `news_hook` {event,date,url}"))
    if not (ep.get("original_contribution") or "").strip():
        out.append(("warn", "original_contribution", "state the episode's original contribution (policy: added value)"))
    return out


_NEG = re.compile(r"\b(no|not|without|never|don't|doesn't|avoid|nothing|none)\b[^.,;:!?\n]{0,40}", re.I)
_NEG_OK = re.compile(r"\b(no|not|without)\s+(any\s+)?(visible\s+)?(text|letters?|numbers?|words?|watermarks?)\b", re.I)


_CJK = re.compile(r"[぀-ヿ㐀-䶿一-鿿가-힯＀-￯]+")
# Natural-language camera moves (H3 HF form, dialects/hailuo.md 12.4): move type, optionally amplitude/speed words.
_CAM_MOVE = (r"push(?:es|ing|ed)?[- ]?in|pull(?:s|ing|ed)?[- ]?(?:out|back)|pan(?:s|ning|ned)?(?:\s+(?:left|right|across))?"
             r"|tilt(?:s|ing|ed)?\s+(?:up|down)|truck(?:s|ing)?\s+(?:left|right)|pedestal(?:s|ing)?\s+(?:up|down)"
             r"|zoom(?:s|ing|ed)?\s+(?:in|out)|dolly(?:ing)?|dollies|track(?:s|ing)?(?:\s+shot)?|orbit(?:s|ing)?|arc(?:s|ing)?(?:\s+shot)?"
             r"|crane(?:s)?\s+(?:up|down)|static\s+shot|static\s+camera|locked[- ]off|handheld|hand-held|shake(?:s)?\s+(?:slightly|strongly)"
             r"|roll(?:s)?\s+(?:clockwise|counterclockwise)|pov\s+shot")
_CAM_VERB = r"follows|holds|moves|drifts|rises|descends|circles|glides|sweeps|stays|remains|lifts|lowers"  # only after "camera"
_CAM_RE = re.compile(rf"\b(?:the\s+)?camera\s+(?:\w+\s+){{0,3}}?(?:{_CAM_MOVE}|{_CAM_VERB})\b"   # "the camera slowly pushes in", "camera holds"
                     rf"|\b(?:slow|slowly|gentle|gently|smooth|steady|subtle|fast|quick|small|large|medium)\b[\w\s,-]{{0,25}}?\b(?:{_CAM_MOVE})\b"
                     rf"|\b(?:{_CAM_MOVE})\b[\w\s,-]{{0,30}}?\b(?:amplitude|speed|slowly|steadily|gently)\b"
                     r"|\b(?:static|tracking|arc|pov)\s+shot\b|\blocked[- ]off\b|\bhandheld\b", re.I)


_PLACEHOLDER = re.compile(r"^[\W_]*$")  # whitespace, '...', '…', '--' and other punctuation-only narration


def placeholder_narration(text) -> bool:
    return not isinstance(text, str) or bool(_PLACEHOLDER.match(text))


_MOVE_CATS = {  # camera move categories shared by camera_command_syntax wording and dir_camera_move_mismatch
    "push_in": r"push(?:es|ing|ed)?[- ]?in\b|dolly(?:ing)?[- ]in|dollies in|\[push in",
    "pull_out": r"pull(?:s|ing|ed)?[- ]?(?:out|back)\b|dolly(?:ing)?[- ](?:out|back)|dollies (?:out|back)",
    "pan": r"\bpan(?:s|ning|ned)?\b(?:\s+(?:left|right|across))?",
    "tilt": r"\btilt(?:s|ing|ed)?\s+(?:up|down)",
    "truck": r"\btruck(?:s|ing)?\s+(?:left|right)",
    "pedestal": r"\bpedestal(?:s|ing)?\s+(?:up|down)|\bcrane(?:s|ing)?\s+(?:up|down)",
    "zoom": r"\bzoom(?:s|ing|ed)?\s+(?:in|out)",
    "track": r"\btracking shot\b|\bcamera\s+(?:\w+\s+){0,2}?(?:tracks|follows)\b|\btrack(?:s|ing)?\s+(?:alongside|with)\b",
    "orbit": r"\bcamera\s+(?:\w+\s+){0,2}?(?:orbits|arcs|circles)\b|\barc shot\b|\borbit shot\b",
    "static": r"\bstatic(?:\s+(?:shot|camera|frame|hold))?\b|\blocked[- ]off\b|\blocked\b|\bcamera\s+(?:\w+\s+){0,2}?(?:holds|stays|remains)\b|\bholds? (?:a )?(?:static|steady|still)\b|\bno camera move",
}
_MOVE_RE = {k: re.compile(v, re.I) for k, v in _MOVE_CATS.items()}


def camera_moves(text: str) -> set:
    """Camera move categories named in a prompt or a shot.move string (handheld/shake are modifiers, not moves)."""
    return {k for k, rx in _MOVE_RE.items() if rx.search(text or "")}


def camera_phrase(text: str):
    """The first natural camera-move phrase in a motion prompt, or None (accepted by camera_command_syntax like a bracket)."""
    m = _CAM_RE.search(text or "")
    return m.group(0) if m else None


# Words that ask the image model FOR text. Checked after strip_no_text_tail(), so the required universal no-text tail
# ("absolutely no text, no letters, no numbers, no words"; the same _NEG_OK exemption positive_phrasing uses) never counts.
_TEXT_ASK = re.compile(r"\b(says|reads|saying|text|letters|words|logo|caption|headline|labell?ed|labels?|signage|lettering|written)\b", re.I)


def strip_no_text_tail(text: str) -> str:
    """The prompt minus its exempt no-text phrases (one source of truth with positive_phrasing: _NEG_OK)."""
    return _NEG_OK.sub(" ", text or "")


def asks_for_text(text: str) -> list:
    """Text-like words left after the exempt no-text tail is removed: the prompt asks the model to draw text/labels/signs."""
    return [m.group(0) for m in _TEXT_ASK.finditer(strip_no_text_tail(text))]


def _negations(text: str) -> list:
    """Negated phrases in a prompt, minus the exempt universal no-text tail (qa_checklist positive_phrasing)."""
    return [m.group(0).strip() for m in _NEG.finditer(text or "") if not _NEG_OK.match(m.group(0))]


def scene_reference_images(ep: dict, s: dict) -> list:
    """Declared reference image paths for a scene (raw strings, not checked on disk; run.py validates them).
    visual.reference_images[] wins; otherwise each character named in shot.continuity_ids contributes its
    continuity.characters[].canon_frame (or its sheet: a path, or the first of a list of panel paths)."""
    v = s.get("visual") or {}
    if v.get("reference_images"):
        return [str(x) for x in v["reference_images"] if x]
    chars = {c.get("id"): c for c in (ep.get("continuity") or {}).get("characters", []) if isinstance(c, dict)}
    out = []
    for cid in (s.get("shot") or {}).get("continuity_ids", []):
        c = chars.get(cid) or {}
        ref = c.get("canon_frame") or c.get("sheet")
        if isinstance(ref, list):
            ref = ref[0] if ref else None
        if ref:
            out.append(str(ref))
    return out


def _checklist_checks(ep: dict, out: Path) -> list:
    """Checklist rules (direction/qa_checklist.yaml) that need no audience card. Ids match the checklist so thr()/sev() apply."""
    res = []
    sc = ep["scenes"]

    def add(rid, msg, default="warn"):
        res.append((sev(rid, default), rid, msg))

    def secs(s):  # real TTS duration when generated, else words at 2.5 w/s (same estimate as total_duration_range)
        a = out / "audio" / f"{s['id']}.json"
        if a.exists():
            return json.loads(a.read_text())["duration"]
        return len(s["narration"].split()) / (2.5 * (ep.get("voice_override") or {}).get("speed", 1.0))

    total_words = sum(len(s["narration"].split()) for s in sc)
    total_sec = sum(secs(s) for s in sc)
    wmin = thr("words_per_second_min", default=1.5)
    if total_words / max(total_sec, 1) < wmin:
        add("words_per_second_min", f"{total_words / total_sec:.2f} words/s overall (min {wmin}); may feel sparse")
    sents = [t for s in sc for t in _sentences(s["narration"])]
    avg = sum(len(t.split()) for t in sents) / max(len(sents), 1)
    if avg > thr("sentence_words_avg", default=12):
        add("sentence_words_avg", f"average sentence is {avg:.1f} words (max {thr('sentence_words_avg', default=12)})")
    smax, src = thr("scene_duration_max", default=8), "checklist default"
    card_f = ROOT / "direction" / "audiences" / f"{ep.get('audience')}.yaml"
    if ep.get("audience") and card_f.exists():  # the audience card owns scene length (kids 3-6 s, adults 4-8 s, older 6-10 s)
        smax, src = yaml.safe_load(card_f.read_text())["scene_len_sec"][1], f"'{ep['audience']}' card"
    for s in sc:
        if secs(s) > smax:
            add("scene_duration_max", f"{s['id']}: ~{secs(s):.1f}s on one visual (max {smax}s per {src})")
    first = sc[0]
    if len(first["narration"].split()) > thr("hook_length_max", default=15):
        add("hook_length_max", f"hook scene is {len(first['narration'].split())} words (max {thr('hook_length_max', default=15)})")
    for s in sc:  # optional field; validated when present (what the viewer should get from the scene, not a copy of the narration)
        it = (s.get("intent") or "").strip()
        if it and (len(it) > thr("scene_intent", default=120) or it.lower().rstrip(".") in s["narration"].lower()):
            add("scene_intent", f"{s['id']}: intent must be at most {thr('scene_intent', default=120)} chars and say why the scene exists, not repeat the narration")
    beats = [s["beat"] for s in sc]
    for i, b in enumerate(beats):
        if b.endswith("cta") and any(x in ("payoff", "story_payoff") for x in beats[i + 1:]):
            add("cta_after_payoff", f"{sc[i]['id']}: CTA appears before the payoff", "error")
    hook_i = next((i for i, b in enumerate(beats) if "hook" in b), 0)
    cta_i = next((i for i, b in enumerate(beats) if b.endswith("cta")), len(beats))
    for i, b in enumerate(beats):
        if "sponsor" in b and not hook_i < i <= cta_i:
            add("sponsor_beat_placement", f"{sc[i]['id']}: sponsor beat should sit after the hook and before or at the CTA")
    an = ep.get("analogy")
    if an is not None:
        if not (an.get("limitation") or "").strip():
            add("analogy_limitation_present", "analogy.limitation must be a non-empty string", "error")
        if len(an.get("mapping") or []) < thr("analogy_mapping_present", default=1):
            add("analogy_mapping_present", "analogy.mapping needs at least one [from, to] pair")
    cmds = {c.lower() for c in thr("camera_command_syntax", "known_commands", [])}
    for s in sc:
        v = s["visual"]
        if v["type"] != "clip":
            continue
        mp = v.get("motion_prompt", "") or ""
        found = [c.strip().lower() for b in re.findall(r"\[([^\]]+)\]", mp) for c in b.split(",")]
        natural = camera_phrase(mp)  # H3 house default (dialects/hailuo.md 0b, 12.4, 12.6): a natural camera sentence
        if not found and not natural:
            add("camera_command_syntax", f"{s['id']}: clip motion_prompt names no camera move: write a natural camera sentence "
                "('The camera pushes in with small amplitude at slow speed toward ...', or 'holds a static shot') or a [Camera command]")
        elif found and cmds and not set(found) & cmds and not natural:
            add("camera_command_syntax", f"{s['id']}: no known camera command in {found} (known: see qa_checklist.yaml)")
    for s in sc:  # model leakage into paid prompts (ep13 had the CJK token for 'camera lens' inside a motion_prompt)
        for key in ("prompt", "keyframe_prompt", "motion_prompt", "last_frame_prompt"):
            hit = _CJK.findall(s["visual"].get(key) or "")
            if hit:
                add("prompt_cjk_leak", f"{s['id']}.{key}: non-English CJK text {''.join(hit)[:20]!r} in a generation prompt (model leakage); rewrite in English", "error")
    for s in sc:  # H3: last_frame cannot be combined with reference images (dialects/hailuo.md section 0b)
        v = s["visual"]
        if v["type"] == "clip" and (v.get("last_frame_prompt") or "").strip() and scene_reference_images(ep, s):
            add("last_frame_exclusive", f"{s['id']}: clip has last_frame_prompt and reference images "
                f"({', '.join(scene_reference_images(ep, s)[:2])}); H3 cannot combine them: drop one", "error")
    for s in sc:
        for key in ("prompt", "keyframe_prompt", "motion_prompt"):
            neg = _negations(s["visual"].get(key, ""))
            if neg:
                add("positive_phrasing", f"{s['id']}.{key}: negated phrasing {neg[:3]}; describe what is in frame instead (fail-describe-dont-negate)")
    if ep.get("format_id"):
        ids = {f["id"] for f in yaml.safe_load((ROOT / "direction" / "format_catalog.yaml").read_text())["formats"]}
        if ep["format_id"] not in ids:
            add("format_id_valid", f"format_id '{ep['format_id']}' is not in format_catalog.yaml")
    if ep.get("audience") and not (ep.get("one_idea") or "").strip():
        add("one_idea_field_present", "episode.one_idea is empty")
    dup = [o["id"] for _, o in registry.episodes()].count(ep["id"])
    if dup > 1:
        add("episode_id_unique_slug", f"episode id '{ep['id']}' is used by {dup} episodes")
    return res


import brain as _brain
_BRIDGES = _brain.RENDERABLE_BRIDGES  # one list for lint, director and renderer docs
_ARCH_META = ("arch-conventions", "arch-ai-safe", "arch-router")  # archetypes.yaml cards that are rules, not archetypes


def _direction_checks(ep: dict) -> list:
    """Mechanical checks for episodes directed with the direction brain (`direction` key; legacy episodes are untouched).
    Rules live as cards in direction/craft/*.yaml (modes, archetypes, continuity, editing, realism); ids here are dir_*.
    Bridges: dir_bridge_renderable accepts all six cold-open bridges (freeze-rewind, j-cut and question-card are drawn by
    Episode.tsx since 2026-10-05) and warns only on an unknown one; dir_bridge_params errors on a question-card without
    cold_open.question (warns past 8 words) and warns on bridge_frames outside the bridge's range."""
    d = ep.get("direction")
    if not d:
        return []
    import brain
    res, sc, cs = [], ep["scenes"], brain.cards()

    def add(sev_, rid, msg):
        res.append((sev_, rid, msg))

    skills = d.get("skills_used") if isinstance(d.get("skills_used"), list) else []
    unknown = [i for i in skills if i not in cs and not re.match(r"^(dsk|ddr|vsk|avg|hf|hfs|hig|vis|Dir)-", str(i))]
    if unknown:
        add("warn", "dir_skills_known", f"direction.skills_used names unknown craft cards: {unknown[:5]}")
    mode, co = d.get("mode", "explainer"), d.get("cold_open") or {}
    if not isinstance(co, dict):
        co = {}
    if mode != "explainer" and not skills:
        add("warn", "dir_skills_used", f"mode {mode}: direction.skills_used is empty (list the craft card ids actually applied; traceability)")
    dur = co.get("duration_s", co.get("seconds"))  # `seconds` = legacy/invented key (schema rejects it); still check the value
    dur = dur if isinstance(dur, (int, float)) and not isinstance(dur, bool) else None
    segs = d.get("style_segments") if isinstance(d.get("style_segments"), list) else []
    try:  # style envelope = DESIGN_SYSTEM > profile > audience card (brain.style_envelope); craft choices must stay inside it
        env = brain.style_envelope(ep["audience"]) if ep.get("audience") else None
    except (FileNotFoundError, KeyError):
        env = None
    if env:
        if mode not in env["modes"]:
            add("error", "dir_mode_allowed", f"mode '{mode}' is not allowed for audience '{ep['audience']}' (allowed: {env['modes']}; "
                f"audiences/{ep['audience']}.yaml direction.modes). Repair: set direction.mode to one of {env['modes']} "
                f"(e.g. '{env['modes'][0]}') and restructure the opening for it (drop cold_open unless that mode uses one); "
                f"a repair that keeps mode '{mode}' can never pass")
        for n, seg in enumerate(segs):
            if not isinstance(seg, dict):
                add("error", "dir_style_segment", f"style segment {n} is {type(seg).__name__} {str(seg)[:40]!r}; it must be an object "
                    "{id, medium: native|cinematic, scene_ids}")
                continue
            m = seg.get("medium") or seg.get("dialect")  # `dialect` = legacy/invented key name: check its value anyway
            if not m:
                add("error", "dir_style_segment", f"style segment '{seg.get('id', n)}' declares no medium (native|cinematic)")
            elif m not in ("native", "cinematic"):
                add("warn", "dir_style_medium_known", f"style segment '{seg.get('id')}' medium '{m}' is not a known dialect (native|cinematic)")
            elif m not in env["dialects"]:
                add("error", "dir_style_segment", f"style segment '{seg.get('id')}' uses dialect '{m}' but profile '{env['profile']}' / audience '{ep['audience']}' allow {env['dialects']} (DESIGN_SYSTEM section 11)")
        if d.get("lens") and d["lens"] not in env["lenses"]:
            add("error", "dir_lens_allowed", f"lens '{d['lens']}' is not allowed here (allowed: {env['lenses']}); lenses must fit the audience and the profile's look '{env['look']}'")
        cap = env.get("cold_open_max_s")
        if cap and dur and dur > cap:
            add("error", "dir_cold_open_audience_cap", f"cold open {dur}s exceeds the {cap}s cap for audience '{ep['audience']}'")
        if len(segs) > 1 and not co.get("bridge"):
            add("error", "dir_style_bridge", "more than one style segment needs a declared direction.cold_open.bridge")
    words = sum(len(s["narration"].split()) for s in sc)
    long_form = words / 2.5 > 90
    if mode in ("cold-open-drama", "hybrid"):
        if not co:
            add("error", "dir_cold_open_present", f"mode {mode} needs direction.cold_open {{archetype, duration_s, bridge, scene_ids}}")
        else:
            missing = [k for k in ("archetype", "duration_s", "bridge", "scene_ids") if not co.get(k)]
            if missing:
                add("error", "dir_cold_open_fields", f"mode {mode}: direction.cold_open is missing {missing} (required: archetype, duration_s, "
                    "bridge, scene_ids); without them the budget, audience cap, scene order and wide-first checks cannot run")
            lo, hi = (10, 20) if long_form else (5, 10)
            if dur is not None and not lo <= dur <= hi:
                add("error" if dur > hi else "warn", "dir_cold_open_budget", f"cold open {dur}s outside the {'long-form' if long_form else 'Short'} budget {lo}-{hi}s (mode-cold-open-drama)")
            if co.get("bridge") and co["bridge"] not in _BRIDGES:
                add("warn", "dir_bridge_renderable", f"bridge '{co['bridge']}' is not rendered by Remotion (supported: {', '.join(_BRIDGES)})")
            if co.get("bridge") == "question-card" and not (co.get("question") or "").strip():
                add("error", "dir_bridge_params", "bridge question-card needs direction.cold_open.question (the card text, <= 8 words)")
            elif co.get("bridge") == "question-card" and len(co["question"].split()) > 8:
                add("warn", "dir_bridge_params", f"question-card text is {len(co['question'].split())} words (mode-bridge-question-card: <= 8)")
            bf = co.get("bridge_frames")
            rng = tuple(_brain.BRIDGE_FRAMES[co["bridge"]][1:]) if co.get("bridge") in _brain.BRIDGE_FRAMES else (6, 45)
            if bf is not None and not (isinstance(bf, int) and rng[0] <= bf <= rng[1]):
                add("warn", "dir_bridge_params", f"cold_open.bridge_frames {bf} outside {rng[0]}-{rng[1]} for bridge '{co.get('bridge')}' (the renderer clamps it)")
            ids = [s["id"] for s in sc]
            sids = co.get("scene_ids") or []
            if sids and (any(i not in ids for i in sids) or ids[:len(sids)] != sids):
                add("error", "dir_cold_open_scenes", f"cold_open.scene_ids {sids} must be the first scenes of the episode, in order")
            arch = None if "arch-" + str(co.get("archetype", "")) in _ARCH_META else cs.get("arch-" + str(co.get("archetype", "")))
            if co.get("archetype") and not arch:
                add("warn", "dir_archetype_known", f"cold_open.archetype '{co['archetype']}' has no card arch-{co['archetype']}")
            elif arch and arch.get("audience_fit") and ep.get("audience") not in arch["audience_fit"]:
                add("error", "dir_audience_archetype", f"archetype '{co['archetype']}' is not allowed for audience '{ep.get('audience')}' (allowed: {arch['audience_fit']}; see arch-router / kids_variant)")
    cap = (cs.get(f"mode-{mode}") or {}).get("cost_cap_paid_clips")
    if cap:
        n_clips = sum(1 for s in sc if s["visual"]["type"] == "clip")
        if n_clips > cap["long" if long_form else "short"]:
            add("warn", "dir_paid_clip_cap", f"{n_clips} paid clips exceeds the {mode} cap {cap['long' if long_form else 'short']} (cost gate)")
    shots = [(s["id"], s.get("shot") if isinstance(s.get("shot"), dict) else {}) for s in sc]
    known_arch = sorted(i[5:] for i in cs if i.startswith("arch-") and i not in _ARCH_META)
    for sid, sh in shots:
        a = str(sh.get("archetype") or "").removeprefix("arch-")  # writers sometimes cite the card id (arch-awe-scale)
        if a and a not in known_arch:
            add("warn", "dir_archetype_known", f"{sid}: shot.archetype '{a}' has no card arch-{a} (known: {', '.join(known_arch)})")
    clip_s = _clip_seconds()
    for s, (sid, sh) in zip(sc, shots):
        if s["visual"]["type"] != "clip" or not clip_s:
            continue
        for k in ("duration_s", "action_s"):
            v = sh.get(k)
            if isinstance(v, (int, float)) and not isinstance(v, bool) and v > clip_s:
                add("error", "dir_clip_length", f"{sid}: shot.{k} {v:g}s exceeds the {clip_s:g}s provider clip (config/providers.yaml "
                    f"video.init_args.duration); split it into two clips or shorten the action")
    for s, (sid, sh) in zip(sc, shots):  # the clip's camera wording must agree with its shot.move
        if s["visual"]["type"] != "clip" or not sh.get("move"):
            continue
        want, said = camera_moves(str(sh["move"])), camera_moves(s["visual"].get("motion_prompt") or "")
        if want and said and said != want:
            both = " (the prompt names a static hold AND a move)" if "static" in said and len(said) > 1 else ""
            add("warn", "dir_camera_move_mismatch", f"{sid}: shot.move '{sh['move']}' = {sorted(want)} but the motion_prompt says {sorted(said)}{both}; "
                "write exactly the shot's move in the prompt (one camera behaviour per clip, real-camera-behavior)")
    if mode in ("cold-open-drama", "hybrid") and co.get("scene_ids"):
        first = next((sh for i, sh in shots if i == co["scene_ids"][0]), {})
        if first.get("size") and first["size"] not in ("ews", "ws"):
            add("warn", "dir_wide_first", f"{co['scene_ids'][0]}: the cold open should open wide (ews/ws), got {first['size']} (arch-conventions)")
    run_ = 1
    for (i0, a), (i1, b) in zip(shots, shots[1:]):
        run_ = run_ + 1 if a.get("size") and a.get("size") == b.get("size") else 1
        if run_ >= 3:
            add("warn", "dir_size_variety", f"{i1}: three consecutive scenes with shot size '{b['size']}' (slideshow risk; edit-dual-contrast-cut)")
            run_ = 1
    ids_ = {c.get("id"): c for c in (ep.get("continuity") or {}).get("characters", []) if isinstance(c, dict)}
    for s in sc:
        sh = s.get("shot") or {}
        text = " ".join(s["visual"].get(k) or "" for k in ("keyframe_prompt", "motion_prompt", "prompt"))
        for cid in sh.get("continuity_ids", []):
            ident = (ids_.get(cid) or {}).get("identity_string") or (ids_.get(cid) or {}).get("identity")
            if ident and ident not in text:
                add("warn", "dir_identity_string", f"{s['id']}: identity string for '{cid}' is not repeated verbatim in the visual prompt (cont-identity-string)")
        if re.search(r"\b(in the style of|à la|directed by)\b", text, re.I):
            add("warn", "dir_no_named_director", f"{s['id']}: prompt names a style referent; describe observable parameters instead (direction/craft/lenses.yaml)")
    res += _segment_checks(ep, d, segs, env, mode, co, shots, long_form, dur, clip_s, skills)
    return res


def _vocab_re(words) -> "re.Pattern | None":
    alts = [re.escape(w.lower()).replace(r"\*", r"\w*") for w in words if isinstance(w, str) and w.strip()]
    return re.compile(r"(?<![\w-])(?:" + "|".join(sorted(alts, key=len, reverse=True)) + r")(?![\w-])", re.I) if alts else None


_DIALECT_FALLBACK = {  # used when direction/craft/grammar.yaml / lenses.yaml carry no `dialect_vocabulary`
    "cinematic": ["shallow depth of field", "depth of field", "bokeh", "anamorphic", "rack focus", "film grain", "volumetric*",
                  "photoreal*", "photographic", "realistic", "cinematic", "35mm", "50mm", "85mm"],
    "native": ["flat vector", "storybook", "gouache", "watercolor", "watercolour", "cartoon", "cel-shaded", "children's book", "crayon"]}


def dialect_vocabulary() -> dict:
    """{dialect: [phrases]} from the top-level `dialect_vocabulary` of direction/craft/grammar.yaml and lenses.yaml (merged), else the fallback."""
    out = {}
    for name in ("grammar.yaml", "lenses.yaml"):
        try:
            v = (yaml.safe_load((ROOT / "direction" / "craft" / name).read_text()) or {}).get("dialect_vocabulary") or {}
        except (OSError, yaml.YAMLError):
            continue
        for k, words in v.items() if isinstance(v, dict) else ():
            out.setdefault(k, [])
            out[k] += [w for w in words or [] if w not in out[k]]
    return out or {k: list(v) for k, v in _DIALECT_FALLBACK.items()}


def dialect_hits(text: str) -> dict:
    """{dialect: [matched phrases]} for one prompt."""
    hits = {}
    for k, words in dialect_vocabulary().items():
        rx = _vocab_re(words)
        found = sorted({m.group(0).lower() for m in rx.finditer(text or "")}) if rx else []
        if found:
            hits[k] = found
    return hits


_PROMPT_KEYS = ("prompt", "keyframe_prompt", "motion_prompt", "last_frame_prompt")


def _segment_checks(ep, d, segs, env, mode, co, shots, long_form, dur, clip_s, skills) -> list:
    """Round-2 direction checks (DIRECTION-AB-ep03.md section 6.4 items 10-12 and skills honesty)."""
    res, sc = [], ep["scenes"]
    ids = [s["id"] for s in sc]
    shot_of = dict(shots)

    def add(sev_, rid, msg):
        res.append((sev_, rid, msg))

    # style-segment coverage: every scene in exactly one declared segment
    segs = [g for g in segs if isinstance(g, dict)]
    seg_of, multi = {}, {}
    for g in segs:
        for sid in g.get("scene_ids") or []:
            if sid in seg_of:
                multi.setdefault(sid, [seg_of[sid]]).append(g.get("id"))
            seg_of.setdefault(sid, g.get("id"))
    if segs:
        uncovered = [i for i in ids if i not in seg_of]
        unknown = sorted({sid for g in segs for sid in g.get("scene_ids") or [] if sid not in ids})
        parts = ([f"scenes {uncovered} are in no segment"] if uncovered else []) + \
                ([f"scenes {sorted(multi)} are in more than one segment ({multi})"] if multi else []) + \
                ([f"segment scene_ids {unknown} are not scenes of this episode"] if unknown else [])
        if parts:
            add("error", "dir_style_coverage", "direction.style_segments must cover every scene exactly once: " + "; ".join(parts))
    # dialect inferred from prompt words vs the declared segment medium (or a native-only envelope)
    medium_of = {g.get("id"): (g.get("medium") or g.get("dialect")) for g in segs}
    native_only = bool(env) and list(env.get("dialects") or []) == ["native"]
    for s in sc:
        sid = s["id"]
        sh = shot_of.get(sid) or {}
        want = medium_of.get(seg_of.get(sid) or sh.get("style_segment")) or ("native" if native_only else None)
        if s["visual"]["type"] not in ("clip", "illustration", "photo") or want not in ("native", "cinematic"):
            continue
        text = " ".join(str(s["visual"].get(k) or "") for k in _PROMPT_KEYS) + " " + str(sh.get("light_source") or "")
        wrong = dialect_hits(text).get("cinematic" if want == "native" else "native")
        if wrong:
            why = "the audience envelope allows native only" if want == "native" and native_only and not seg_of.get(sid) else f"its segment is {want}"
            add("warn", "dir_dialect_mismatch", f"{sid}: prompt uses {'cinematic' if want == 'native' else 'native'} vocabulary {wrong[:5]} but {why}; "
                "rewrite the prompt in the segment's dialect or declare the right segment (DESIGN_SYSTEM section 11)")
    for g in segs:
        if g.get("medium") in ("native", "cinematic"):
            wrong = dialect_hits(g.get("description") or "").get("cinematic" if g["medium"] == "native" else "native")
            if wrong:
                add("warn", "dir_dialect_mismatch", f"style segment '{g.get('id')}' is labelled {g['medium']} but its description says {wrong[:4]}")
    if mode in ("cold-open-drama", "hybrid") and co.get("scene_ids"):
        sids = [i for i in co["scene_ids"] if i in ids]
        by_id = {s["id"]: s for s in sc}
        # narration before the bridge. The schema needs non-empty narration on every scene, so the rule (mode-cold-open-drama
        # "at most one in-scene line") is: each cold-open scene carries ONE short in-scene line of 1-6 words, <= 12 words in total.
        hint = "write ONE short in-scene line of 1-6 words per cold-open scene (e.g. 'Watch the capsule.'); keep the explanation after the bridge"
        for i in sids:
            n = by_id[i]["narration"]
            if placeholder_narration(n):
                add("error", "dir_cold_open_narration_empty", f"{i}: cold-open narration {n!r} is empty or a placeholder; {hint}")
                continue
            nw, nl = len(n.split()), len(_sentences(n))
            if nl > 1 or nw > 6:
                add("warn", "dir_cold_open_narration", f"{i}: cold-open line has {nl} sentence(s) / {nw} words (mode-cold-open-drama: one line, 1-6 words); {hint}")
        words = sum(len(by_id[i]["narration"].split()) for i in sids if not placeholder_narration(by_id[i]["narration"]))
        if words > 12:
            add("warn" if long_form else "error", "dir_cold_open_narration", f"cold open {sids} carries {words} narration words before the bridge "
                f"(mode-cold-open-drama: <= 12 words in total across the cold open); {hint}")
        # declared duration vs the shots it is made of
        parts = []
        for i in sids:
            v = (shot_of.get(i) or {}).get("duration_s")
            if not (isinstance(v, (int, float)) and not isinstance(v, bool)):
                v = clip_s if by_id[i]["visual"]["type"] == "clip" else len(by_id[i]["narration"].split()) / 2.5 or None  # Remotion scene: words at 2.5 w/s
            parts.append(v)
        if dur is not None and parts and all(p is not None for p in parts) and abs(sum(parts) - dur) > 1.5:
            add("warn", "dir_cold_open_duration_mismatch", f"cold_open.duration_s {dur:g}s but its scenes {sids} add up to {sum(parts):g}s "
                "(shot.duration_s, else the provider clip length for clips or words at 2.5 w/s for Remotion scenes); make them agree within 1.5 s")
    # skills_used honesty: mechanically checkable cards the director cites but the plan does not satisfy
    claimed = set(skills or [])
    chars = {c.get("id"): c for c in (ep.get("continuity") or {}).get("characters", []) if isinstance(c, dict)}
    if "cont-identity-string" in claimed:
        miss = []
        for s in sc:
            text = " ".join(str(s["visual"].get(k) or "") for k in _PROMPT_KEYS)
            for cid in (shot_of.get(s["id"]) or {}).get("continuity_ids") or []:
                ident = (chars.get(cid) or {}).get("identity_string") or (chars.get(cid) or {}).get("identity")
                if ident and ident not in text:
                    miss.append(f"{s['id']}:{cid}")
        used = any((shot_of.get(i) or {}).get("continuity_ids") for i in ids) and any((c or {}).get("identity_string") for c in chars.values())
        if miss or not used:
            add("warn", "dir_skills_claimed_unmet", "skills_used cites cont-identity-string but " +
                (f"the identity_string is not verbatim in the prompts of {miss[:6]}" if miss else "no shot.continuity_ids references a continuity character with an identity_string"))
    if "cont-axis-eyelines" in claimed:
        groups, cur = [], []
        for i in ids:  # scene groups = consecutive scenes in the same shot.location_id
            loc = (shot_of.get(i) or {}).get("location_id")
            if cur and loc and loc == (shot_of.get(cur[-1]) or {}).get("location_id"):
                cur.append(i)
            else:
                if len(cur) > 1:
                    groups.append(cur)
                cur = [i] if loc else []
        if len(cur) > 1:
            groups.append(cur)
        miss = [i for g in groups for i in g if not (shot_of.get(i) or {}).get("axis_side")]
        if not groups or miss:
            add("warn", "dir_skills_claimed_unmet", "skills_used cites cont-axis-eyelines but " +
                (f"shot.axis_side is missing on cuts within a location: {miss[:6]}" if miss else "no two consecutive shots share a shot.location_id with axis_side declared"))
    if "arch-conventions" in claimed:
        first_id = (co.get("scene_ids") or [None])[0] if mode in ("cold-open-drama", "hybrid") else None
        first_id = first_id or next((s["id"] for s in sc if s["visual"]["type"] in ("clip", "illustration", "photo")), None)
        size = (shot_of.get(first_id) or {}).get("size")
        if first_id and size not in ("ews", "ws"):
            add("warn", "dir_skills_claimed_unmet", f"skills_used cites arch-conventions but the opening shot {first_id} is not wide first (size {size or 'unset'}; want ews/ws)")
    return res


IDENTITY_RULES = ("identity_present", "identity_contrast", "identity_banned_default", "identity_variety")  # emitted below / by identity.py


def _identity_checks(ep: dict) -> list:
    """Per-episode visual identity: required for new audience episodes, contrast-checked, never a repeat of a recent look."""
    import identity
    if not ep.get("identity"):
        if ep.get("audience") and registry.status_of(ep) in ("idea", "scripted"):
            return [(sev("identity_present", "warn"), "identity_present", "no `identity`: the look would fall back to the shared audience profile. Run `run.py identity pick <episode>` (information decides the look)")]
        return []
    return [(sev(r, s), r, m) for s, r, m in identity.validate(ep["identity"]) + identity.variety_issues(ep)]


def _apply_waivers(ep: dict, issues: list) -> list:
    """A waiver (episode.waivers[{rule, reason}]) downgrades one rule's issues to 'waived' for that episode only: still printed, never blocking."""
    waived = {w["rule"]: w["reason"] for w in ep.get("waivers") or []}
    return [("waived", rid, f"{msg} [waived: {waived[rid]}]") if rid in waived and s in ("error", "warn") else (s, rid, msg)
            for s, rid, msg in issues]


def _core_checks(ep: dict, out: Path) -> list:
    issues = []

    def add(sev, rid, msg):
        issues.append((sev, rid, msg))

    sc = ep["scenes"]
    lo, hi = thr("scene_count_range", "threshold_min", 4), thr("scene_count_range", "threshold_max", 16)
    if not (lo <= len(sc) <= hi):
        add(sev("scene_count_range", "error"), "scene_count_range", f"{len(sc)} scenes (expected {lo}-{hi})")
    # total runtime: real TTS durations when generated, else 2.5 words/s estimate
    total_words, total_sec, have_audio = 0, 0.0, True
    for s in sc:
        n = len(s["narration"].split())
        total_words += n
        a = out / "audio" / f"{s['id']}.json"
        if a.exists():
            total_sec += json.loads(a.read_text())["duration"]
        else:
            have_audio = False
            total_sec += n / (2.5 * (ep.get('voice_override') or {}).get('speed', 1.0))
    dlo, dhi = thr("total_duration_range", "threshold_min", 25), thr("total_duration_range", "threshold_max", 90)
    if not (dlo <= total_sec <= dhi):
        add(sev("total_duration_range", "error"), "total_duration_range", f"~{total_sec:.0f}s{'' if have_audio else ' (estimated)'} (target {dlo}-{dhi}s)")
    wps_max = thr("words_per_second_max", default=3.0)
    if total_words / max(total_sec, 1) > wps_max:
        add(sev("words_per_second_max", "error"), "words_per_second_max", f"{total_words / total_sec:.2f} words/s overall (max {wps_max})")
    smax = thr("sentence_words_max", default=18)
    for s in sc:
        sents = _sentences(s["narration"])
        if len(sents) > 4:
            add(sev("one_idea_per_scene", "warn"), "one_idea_per_scene", f"{s['id']}: {len(sents)} sentences in one scene")
        for t in sents:
            if len(t.split()) > smax:
                add(sev("sentence_words_max", "error"), "sentence_words_max", f"{s['id']}: {len(t.split())}-word sentence: '{t[:60]}...'")
        a = out / "audio" / f"{s['id']}.json"
        if a.exists():
            wps = len(s["narration"].split()) / max(json.loads(a.read_text())["duration"], 0.1)
            if wps > wps_max + 0.2:
                add("warn", "scene_pace", f"{s['id']}: {wps:.1f} words/s in this scene (kids may find it fast)")
    first = sc[0]
    if not (first["beat"] == "story_hook" or first["beat"].startswith("hook") or first["beat"].endswith("hook")) or not ("?" in first["narration"] or len(first["narration"].split()) <= 12):
        add("error", "hook_in_first_scene", f"scene 1 (beat '{first['beat']}') must be a hook beat (name contains hook) with a question or <=12 words")
    if not sc[-1]["beat"].endswith("cta"):
        add("warn", "cta_present", "last scene is not a CTA beat")
    srcs = ep.get("claims") or ep.get("sources") or []
    if not srcs or any(not (c.get("url") or "").startswith("http") for c in srcs):
        add("error", "claims_have_sources", "every claim needs a source URL (episode.sources / claims[])")
    sp = ep.get("sponsor")
    if sp:
        if not (isinstance(sp, dict) and sp.get("disclosure_line")):
            add("error", "sponsor_disclosure_present", "sponsor set but no sponsor.disclosure_line")
        if not ep.get("publish"):
            add("warn", "sponsor_disclosure_present", "sponsor set but no publish block (paid-promotion flag must be ticked at upload)")
    style = ep.get("style", {}).get("illustration_style", "")
    for s in sc:
        v = s["visual"]
        if v["type"] == "illustration":
            asks = asks_for_text(v["prompt"])
            if asks:
                add("warn", "no_text_in_image_prompts", f"{s['id']}: prompt asks for text in the image ({asks[:3]}); generated text is unreliable: "
                    "render words, labels and numbers as Remotion overlays")
    if style and "no text" not in style.lower():
        add("warn", "no_text_in_image_prompts", "illustration_style should say 'no text, no letters'")
    idx_ill = next((i for i, s in enumerate(sc) if s["visual"]["type"] == "illustration"), None)
    for i, s in enumerate(sc):
        if s["visual"].get("term") and idx_ill is not None and i <= idx_ill:
            add("error", "term_after_picture", f"{s['id']}: the real term must come after the picture/analogy, not in the first illustration scene")
    low = _low_authority_domains()  # config/source_quality.yaml (optional): claims citing a non-authoritative domain
    for i, c in enumerate(ep.get("claims") or []):
        dom = _domain(c.get("url") or "") if isinstance(c, dict) else ""
        if low and dom and any(dom == x or dom.endswith("." + x) for x in low):
            add("warn", "claims_low_authority", f"claim {i + 1} cites {dom}, listed as non-authoritative in config/source_quality.yaml; "
                "back it with a primary or reference source")
    seq = [s["beat"] for s in sc]
    for _, o in registry.episodes():  # read_safe: a half-written draft elsewhere never breaks this episode's lint
        if o["id"] != ep["id"] and isinstance(o.get("scenes"), list) and [s.get("beat") for s in o["scenes"] if isinstance(s, dict)] == seq:
            add("warn", "repeated_structure", f"identical beat sequence to {o['id']}: vary structure/visual treatment (YouTube 'inauthentic content' risk)")
    return issues


def _packaging(ep: dict) -> list:
    import packaging
    return packaging.run(ep)


def run(ep: dict) -> list:
    """All lint checks. Safe on schema-invalid drafts: a draft without the minimum shape gets the shape error; otherwise every
    section runs, and a section that trips over a malformed field reports `lint_incomplete` instead of hiding the other sections."""
    bad = shape_issues(ep)
    if bad:  # never crash on a half-written draft: report the shape problem instead
        return bad
    out = ROOT / "out" / ep["id"]
    issues = []

    def section(name, fn):
        try:
            issues.extend(fn())
        except Exception as e:  # noqa: BLE001 - a malformed draft field must not hide every other lint finding
            issues.append(("warn", "lint_incomplete", f"{name} checks stopped on this draft ({type(e).__name__}: {str(e)[:120]}); "
                           "fix the schema errors and re-lint"))

    section("core", lambda: _core_checks(ep, out))
    if ep.get("audience"):
        section("explanation", lambda: _explanation_checks(ep))
    if ep.get("packaging") or ep.get("audience"):  # new-style episodes must be fully packaged
        section("packaging", lambda: _packaging(ep))
    if ep.get("disclosure"):
        issues.append(("warn", "on_frame_ai_text", "episode has an on-frame disclosure; owner preference is none (use platform AI labels at upload)"))
    section("checklist", lambda: _checklist_checks(ep, out))
    section("direction", lambda: _direction_checks(ep))
    section("identity", lambda: _identity_checks(ep))
    return _apply_waivers(ep, issues)


def all_issues(ep) -> list:
    """Schema errors first, then every lint finding (lint.run is safe on invalid drafts). What `run.py lint` prints and what a
    repair prompt should see, so one repair can fix everything at once."""
    sch = schema_issues(ep, limit=20)
    if not isinstance(ep, dict):
        return sch
    rest = run(ep)
    if sch:  # shape_issues may restate a schema error: keep one copy
        seen = {m for _, _, m in sch}
        rest = [i for i in rest if not (i[1] == "schema" and i[2] in seen)]
    return sch + rest


def report(ep: dict) -> int:
    issues = all_issues(ep)  # schema errors first, then the lint findings (no longer hidden by a schema error)
    for sev, rid, msg in issues:
        print(f"[{sev.upper():5}] {rid}: {msg}")
    errs = sum(1 for i in issues if i[0] == "error")
    waived = sum(1 for i in issues if i[0] == "waived")
    print(f"lint {ep.get('id', '?') if isinstance(ep, dict) else '?'}: {errs} error(s), {len(issues) - errs - waived} warning(s)" + (f", {waived} waived" if waived else ""))
    return 1 if errs else 0
