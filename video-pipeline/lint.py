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
except Exception:  # checklist missing: fall back to defaults below
    pass


def thr(rid, key="threshold", default=None):
    return _RULES.get(rid, {}).get(key, default)


def sev(rid, default="warn"):
    return _RULES.get(rid, {}).get("severity", default)


def _sentences(text: str) -> list:
    return [s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s]


def provenance(ep: dict, catalog_urls) -> list:
    """Claim gate (semantics ported from vendor/youtube-automation-agent utils/provenance-service.js, MIT):
    a claim is `supported` only if its source_url was actually fetched into the source catalog; empty -> `unsupported`.
    Marks claim['verified'] accordingly and returns error issues for unsupported claims. URL provenance only:
    whether the page really backs the sentence is still the human reviewer's job."""
    cat, issues = set(catalog_urls), []
    for i, c in enumerate(ep.get("claims") or []):
        ok = bool(c.get("source_url")) and c["source_url"] in cat
        c["verified"] = ok
        if not ok:
            issues.append(("error", "claims_urls_in_catalog", f"claim {i + 1} cites a URL that was not fetched: {c.get('source_url') or '(none)'}"))
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
    if not kinds & {"diagram", "steps", "clip"}:
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
    if not ep.get("news_hook", {}).get("url"):
        out.append(("warn", "news_hook", "no `news_hook` {event,date,url}"))
    if not (ep.get("original_contribution") or "").strip():
        out.append(("warn", "original_contribution", "state the episode's original contribution (policy: added value)"))
    return out


def run(ep: dict) -> list:
    out = ROOT / "out" / ep["id"]
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
            total_sec += n / 2.5
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
    if first["beat"] not in ("story_hook", "hook") or not ("?" in first["narration"] or len(first["narration"].split()) <= 12):
        add("error", "hook_in_first_scene", "scene 1 must be a hook beat: a question or <=12 words")
    if sc[-1]["beat"] != "cta":
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
    bad = re.compile(r"\b(says|reads|saying|text|letters|words|logo|caption|headline)\b", re.I)
    for s in sc:
        v = s["visual"]
        if v["type"] == "illustration":
            if bad.search(v["prompt"]):
                add("warn", "no_text_in_image_prompts", f"{s['id']}: prompt mentions text-like words; generated text is unreliable")
    if style and "no text" not in style.lower():
        add("warn", "no_text_in_image_prompts", "illustration_style should say 'no text, no letters'")
    idx_ill = next((i for i, s in enumerate(sc) if s["visual"]["type"] == "illustration"), None)
    for i, s in enumerate(sc):
        if s["visual"].get("term") and idx_ill is not None and i <= idx_ill:
            add("error", "term_after_picture", f"{s['id']}: the real term must come after the picture/analogy, not in the first illustration scene")
    seq = [s["beat"] for s in sc]
    for d in registry.episode_dirs():
        o = registry.read(d)
        if o["id"] != ep["id"] and [s["beat"] for s in o["scenes"]] == seq:
            add("warn", "repeated_structure", f"identical beat sequence to {o['id']}: vary structure/visual treatment (YouTube 'inauthentic content' risk)")
    if ep.get("audience"):
        issues.extend(_explanation_checks(ep))
    if ep.get("packaging") or ep.get("audience"):  # new-style episodes must be fully packaged
        import packaging
        issues.extend(packaging.run(ep))
    if ep.get("disclosure"):
        add("warn", "on_frame_ai_text", "episode has an on-frame disclosure; owner preference is none (use platform AI labels at upload)")
    return issues


def report(ep: dict) -> int:
    issues = run(ep)
    for sev, rid, msg in issues:
        print(f"[{sev.upper():5}] {rid}: {msg}")
    errs = sum(1 for i in issues if i[0] == "error")
    print(f"lint {ep['id']}: {errs} error(s), {len(issues) - errs} warning(s)")
    return 1 if errs else 0
