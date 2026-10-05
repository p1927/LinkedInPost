"""Director: news/topic -> sourced research -> schema-valid, lint-passing episode.json (status `scripted`).

Usage (via run.py):  python run.py director [--topic "text"] [--source URL ...] [--audience kids|curious_adult|older_adult|techie] [--format id] [--mode explainer|cold-open-drama|hybrid|montage|documentary [--force-mode]] [--candidates N] [--pick | --choose N] [--dry] | --repair <id> [--repairs N] [--force-mode]

This module is deliberately thin. It owns NO craft rules of its own; it assembles what already exists:
  prompts / rules : direction/director_prompt.md, audiences/<card>.yaml, audience.yaml, hooks.md, shots.md, packaging.md, format_catalog.yaml, qa_checklist.yaml
  schema          : direction/episode.schema.json (shape; its direction/continuity/shot parts are rendered into the prompt at runtime) + direction/script_template.yaml (field meanings)
  craft           : brain.py (direction/craft cards, style envelope, archetype/lens/bridge cards, video-model dialect sections)
  QA              : lint.run (script, explanation and packaging rules) + lint.provenance (claims must cite URLs we actually fetched)
                    + director_checks (director-side: cold-open required fields, CJK in prompts, source authority, envelope mode before the schema gate)
  sources         : news intake (config/providers.yaml news:), `--source URL` pages, ranked by config/source_quality.yaml
  look / voice / music : the audience card (kids, curious_adult, ...) -> remotion_profile, voice, music_mood; resolved in run.py
  state           : registry (episode dirs, status) -- a Director run only ever produces status `scripted`
  providers       : config/providers.yaml  llm: / llm_write: / news:   (adapters/llm_minimax.py, adapters/news_rss.py)
Variety (anti-repeat) is computed from existing episodes, so there is no separate topic-memory file.
Quality: schema/lint/director checks -> mechanical repairs (MAX_MECH_REPAIRS) -> verify.run (independent verifier agents) -> semantic
repairs with the verifier's findings (MAX_SEMANTIC_REPAIRS, a separate budget); every call prints its token estimate and the run is
capped at MAX_RUN_TOKENS. Sources are cited by id (S1, S2 ...) in every prompt and mapped back to the exact fetched URL in code.
After each repair, required keys the repair dropped are restored from the previous draft. The approval gate lives in registry.set_status.
Robustness: the episode id is reserved atomically (out/director_ids/epNN lock dir + exclusive mkdir) and sources.json is written
before the long writer call, so concurrent runs never share an id and `--repair` works after a crash.
Cost: the full system prompt is sent once (writer call); repairs send a short pack (errors + only the cards/rules they cite).
Paid media stages (tts/images/clips) are never started here; they stay behind human approval in run.py.
Design + reuse map: docs/plans/youtube-automation/DIRECTOR-AND-VARIETY-PLAN.md; bug list: DIRECTION-AB-ep03.md"""
import copy
import datetime
import json
import os
import random
import re
import sys
import time
import urllib.parse

import yaml

import brain
import lint
import registry
import verify
from adapters.common import ROOT, load_provider

D = ROOT / "direction"
DATA = ROOT  # writable state (episodes/, out/); tests point it at a temp dir. Config and direction files always come from ROOT.
CANDIDATES = ROOT / "out" / "director_candidates.json"  # last news list shown to the owner (for --choose)
MAX_MECH_REPAIRS = 2      # schema / lint / director-check repairs
MAX_SEMANTIC_REPAIRS = 2  # verifier-finding repairs (separate budget: mechanical errors can no longer starve them)
MAX_REPAIRS = MAX_MECH_REPAIRS  # backwards-compatible name
MAX_RUN_TOKENS = 300_000  # estimated LLM tokens (in + out, cl100k stand-in) one director run may spend; a call past it is refused
MIN_RELEVANCE = 2         # distinct topic words a news item must share before its authority counts (--source items are exempt)
REPAIR_RULES = """HOW TO FIX (follow strictly):
- If `one_analogy` or `analogy_misleads` is listed: do NOT patch sentences. Choose ONE analogy whose every mapped pair is accurate for the real mechanism (test each pair: does the analogy predict the real behaviour?), rewrite the narration, analogy, mechanism, concepts and image prompts to use only that world, and add one SPOKEN sentence saying where the analogy stops. If no accurate analogy exists, explain the mechanism with the real parts in order and use a metaphor for one beat only.
- If `claim_unsupported`: reword to exactly what the evidence says, or drop the claim and the sentence; never add details (e.g. 'escrow', amounts, dates) that the evidence does not state.
- If `limitation_in_script`: add the spoken limitation sentence.
- Sentence-length problems: rewrite ONLY the sentences listed under SENTENCES OVER THE LIMIT (split or cut words); do not rewrite other narration.
- `skills_used claims X but ...`: either apply card X (for cont-identity-string: repeat the identity string verbatim in every prompt that shows the character) or REMOVE X from direction.skills_used; removing is acceptable.
- Cold-open narration: at most ONE short in-scene line (<= 12 words in total across the cold-open scenes); other cold-open scenes get a 1-3 word sound word ('Hiss.'); never empty or '...'.
- Keep scene ids, the audience card's limits, at least one `clip` scene, and every other requirement of the contract. Return the FULL corrected JSON only."""
# warnings worth a repair pass. NOT no_text_in_image_prompts: it fires on the audience card's required "no text" tail, so a
# repair cannot fix it (the lint agent is fixing the rule itself).
# Card-claim honesty is a repair target: the writer applies the card or removes the id from skills_used (both are acceptable).
FIX_WARNINGS = {"audience_length", "template_mix", "mechanism_order", "description_sources", "cta_present", "director_skills_used", "dir_skills_used",
                "director_skills_honest", "dir_skills_claimed_unmet"}
# Narration that is empty or punctuation only ('', '...'): games the schema's minLength and says nothing (ep17 s1/s2, ep19 s1)
PLACEHOLDER = re.compile(r"^[\W_]*$")
COLD_OPEN_NARRATION_RULE = ("COLD-OPEN NARRATION: the cold-open scenes together carry at most ONE short in-scene line, <= 12 words in total "
                            "(e.g. 'Docking in ten.'); a cold-open scene without that line gets a 1-3 word diegetic sound or call ('Hiss.', 'Clank.', 'Contact.'). "
                            "Narration is never empty, never '...' or punctuation only; the explanation starts after the bridge.")

RENDERABLE_BRIDGES = brain.RENDERABLE_BRIDGES  # one list for the whole pipeline (brain.py); lint.py should import it too
COLD_OPEN_REQUIRED = ("archetype", "duration_s", "bridge", "scene_ids")
# CJK ideographs, kana, hangul, CJK punctuation and full-width forms: model leakage (ep13 s5 had a Chinese "camera lens" token)
_CJK_RANGES = ((0x2E80, 0x2FDF), (0x3000, 0x303F), (0x3040, 0x30FF), (0x3100, 0x31FF), (0x3400, 0x4DBF), (0x4E00, 0x9FFF),
               (0xA960, 0xA97F), (0xAC00, 0xD7AF), (0xF900, 0xFAFF), (0xFE30, 0xFE4F), (0xFF00, 0xFFEF))
CJK = re.compile("[" + "".join(f"{chr(a)}-{chr(b)}" for a, b in _CJK_RANGES) + "]")
# Lint/verify rule ids -> the craft cards a short repair pack loads for them (rule ids that ARE card ids load themselves)
RULE_CARDS = {
    "dir_mode_allowed": ["mode-selection"], "director_mode_allowed": ["mode-selection"],
    "dir_cold_open_present": ["mode-cold-open-drama", "mode-cold-open-beats"], "director_cold_open_required": ["mode-cold-open-drama", "mode-cold-open-beats", "mode-bridge-rules"],
    "dir_cold_open_budget": ["mode-cold-open-drama"], "dir_cold_open_audience_cap": ["mode-cold-open-drama"], "dir_cold_open_scenes": ["mode-cold-open-drama"],
    "dir_bridge_renderable": ["mode-bridge-rules"], "dir_bridge_params": ["mode-bridge-question-card", "mode-bridge-rules"],
    "dir_archetype_known": ["arch-router"], "dir_audience_archetype": ["arch-router"], "director_shot_archetype": ["arch-router"],
    "dir_style_segment": ["cont-style-bridge"], "dir_style_bridge": ["cont-style-bridge"], "dir_style_medium_known": ["cont-style-bridge"],
    "dir_lens_allowed": ["lens-apply"], "dir_wide_first": ["arch-conventions", "gram-shot-size"], "dir_size_variety": ["edit-dual-contrast-cut"],
    "dir_identity_string": ["cont-identity-string"], "dir_paid_clip_cap": ["mode-selection", "flow-reuse-before-generate"],
    "director_prompt_cjk": ["prompt-leakage-sweep"], "director_clip_duration": ["plan-clip-envelope"], "camera_command_syntax": ["gram-camera-moves"],
    "positive_phrasing": ["fail-describe-dont-negate"], "director_skills_used": ["mode-selection"],
    "director_visual_type": ["flow-reuse-before-generate"], "director_native_cinematic_words": ["cont-style-lock", "cont-style-bridge"],
}
# director-side rule -> the lint.py rule that covers the same thing (lint wins when it reports it; until then the director check runs)
LINT_EQUIVALENT = {"director_prompt_cjk": "prompt_cjk_leak", "director_cold_open_required": "dir_cold_open_fields",
                   "director_clip_duration": "dir_clip_length", "director_skills_used": "dir_skills_used",
                   "director_native_cinematic_words": "dir_dialect_mismatch", "director_skills_honest": "dir_skills_claimed_unmet",
                   "director_placeholder_narration": "dir_cold_open_narration_empty"}
for _d, _l in LINT_EQUIVALENT.items():
    RULE_CARDS.setdefault(_l, RULE_CARDS.get(_d, []))
_CARD_ID_RE = re.compile(r"\b(?:mode|arch|real|cont|lens|edit|prompt|fail|plan|gram|flow)-[a-z0-9-]+[a-z0-9]")
_SQ: dict = {}


def _read(name: str) -> str:
    return (D / name).read_text()


def formats() -> dict:
    return {f["id"]: f for f in yaml.safe_load(_read("format_catalog.yaml"))["formats"]}


def existing() -> list:
    return [ep for _, ep in registry.episodes()]  # read_safe: a half-written draft must never break a new run


def cards() -> dict:
    """Audience cards whose remotion_profile exists (a card pointing at a missing profile cannot render)."""
    out = {}
    for f in sorted((D / "audiences").glob("*.yaml")):
        c = yaml.safe_load(f.read_text())
        if (ROOT / "config" / "profiles" / f"{c['remotion_profile']}.json").exists():
            out[c["id"]] = c
    return out


def bridges_sentence() -> str:
    """Derived from brain.RENDERABLE_BRIDGES so the prompt can never drift from what the renderer draws."""
    return f"Cold-open bridges (all {len(RENDERABLE_BRIDGES)} render in Remotion today; pick exactly one): {', '.join(RENDERABLE_BRIDGES)}."


def video_clip_seconds() -> int | None:
    try:
        return int((yaml.safe_load((ROOT / "config" / "providers.yaml").read_text())["video"].get("init_args") or {}).get("duration"))
    except (KeyError, TypeError, ValueError):
        return None


# ---------------------------------------------------------------- variety / mode


def variety(eps: list, rng: random.Random, force_format=None, force_audience=None, force_mode=None, override: bool = False) -> dict:
    """Anti-repeat rotation computed from existing episodes: audience alternates, formats and analogy domains not used recently.
    A forced --mode must sit inside the audience's style envelope (brain.style_envelope(aud)['modes']); --force-mode overrides with a warning."""
    cs = cards()
    last_aud = [e.get("audience") for e in eps if e.get("audience")][-1:]
    aud = force_audience or next((a for a in cs if a not in last_aud), next(iter(cs)))
    if aud not in cs:
        raise SystemExit(f"audience '{aud}' unavailable; options: {', '.join(cs)}")
    recent_fmt = [e.get("format_id") for e in eps[-3:]]
    recent_dom = [(e.get("analogy") or {}).get("domain") for e in eps[-3:]]
    fmts = [f for f in formats() if f not in recent_fmt] or list(formats())
    doms = [d for d in cs[aud]["analogy_domains"] if d not in recent_dom] or cs[aud]["analogy_domains"]
    rng.shuffle(fmts)
    rng.shuffle(doms)
    forced_out = False
    if force_mode:
        if force_mode not in brain.MODES:
            raise SystemExit(f"mode '{force_mode}' unknown; options: {', '.join(brain.MODES)}")
        allowed = brain.style_envelope(aud)["modes"]
        if force_mode not in allowed:
            if not override:
                raise SystemExit(f"mode '{force_mode}' is not allowed for audience '{aud}' (allowed: {', '.join(allowed)}; "
                                 f"direction/audiences/{aud}.yaml direction.modes). Choose one of those, or add --force-mode to override "
                                 f"(the draft will still fail lint dir_mode_allowed until the card allows it).")
            print(f"WARNING: --force-mode: '{force_mode}' is outside the '{aud}' envelope {allowed}; lint will report dir_mode_allowed and the draft cannot be approved as is.")
            forced_out = True
        modes = [force_mode]
    else:
        modes = brain.allowed_modes(cs[aud], [(e.get("direction") or {}).get("mode", "explainer") for e in eps])
    return {"audience": aud, "card": cs[aud], "formats": [force_format] if force_format else fmts[:3], "domains": doms[:2], "modes": modes,
            "mode_forced_outside_envelope": forced_out}


def _slug(title: str) -> str:
    stop = {"the", "a", "an", "why", "how", "does", "do", "is", "are", "of", "to", "and", "your", "you"}
    words = [w for w in re.sub(r"[^a-z0-9 ]", "", title.lower()).split() if w not in stop]
    return "-".join(words[:3]) or "episode"


def next_id(title: str, eps: list) -> str:
    """Preview only (no reservation). Real runs use reserve_id(), which is safe against concurrent runs."""
    n = 1 + max([int(m.group(1)) for e in eps if (m := re.match(r"ep(\d+)-", e["id"]))] or [0])
    return f"ep{n:02d}-{_slug(title)}"


def reserve_id(title: str) -> tuple:
    """Atomically reserve the next episode number and create its folder. Returns (id, folder).
    The number is claimed by an exclusive mkdir of out/director_ids/epNN (atomic on POSIX); a collision, or a folder some
    other process or a human made meanwhile, moves on to the next number. The folder exists from the start, without an
    episode.json, so registry/lint ignore it until the first draft is saved."""
    eps_dir, locks = DATA / "episodes", DATA / "out" / "director_ids"
    eps_dir.mkdir(parents=True, exist_ok=True)
    locks.mkdir(parents=True, exist_ok=True)
    nums = [int(m.group(1)) for p in list(eps_dir.iterdir()) + list(locks.iterdir()) if (m := re.match(r"ep(\d+)", p.name))]
    n, slug = 1 + max(nums or [0]), _slug(title)
    for _ in range(200):
        try:
            (locks / f"ep{n:02d}").mkdir(exist_ok=False)
        except FileExistsError:
            n += 1
            continue
        ep_id = f"ep{n:02d}-{slug}"
        if any(eps_dir.glob(f"ep{n:02d}-*")):  # made by hand (no lock) between the scan and now
            n += 1
            continue
        try:
            (eps_dir / ep_id).mkdir(exist_ok=False)
        except FileExistsError:
            n += 1
            continue
        (locks / f"ep{n:02d}" / "owner.json").write_text(json.dumps({"id": ep_id, "pid": os.getpid(), "at": datetime.datetime.now().isoformat(timespec="seconds")}))
        return ep_id, eps_dir / ep_id
    raise RuntimeError("could not reserve an episode id after 200 attempts")


def write_sources(ep_dir, items: list) -> None:
    """episodes/<id>/sources.json = the fetched source catalog (claims may only cite these URLs). Written before the long
    writer call so `--repair` has the catalog even if the run dies; finish() narrows it to what the episode cites."""
    tmp = ep_dir / "sources.json.tmp"
    tmp.write_text(json.dumps(items, indent=1, ensure_ascii=False))
    tmp.replace(ep_dir / "sources.json")


# ---------------------------------------------------------------- sources


def source_quality() -> dict:
    if "cfg" not in _SQ:
        f = ROOT / "config" / "source_quality.yaml"
        _SQ["cfg"] = yaml.safe_load(f.read_text()) if f.exists() else {"tiers": {}, "names": {}}
    return _SQ["cfg"]


def _domain(url: str) -> str:
    return urllib.parse.urlparse(url or "").netloc.lower().split(":")[0].removeprefix("www.")


def authority(item_or_url) -> tuple:
    """(tier, score) of a catalog item or URL per config/source_quality.yaml; ('other', 0) when unknown.
    Google News links are redirects, so an item's publisher (`source_url`, else the `source` name) decides."""
    cfg = source_quality()
    tiers, names = cfg.get("tiers") or {}, cfg.get("names") or {}
    it = item_or_url if isinstance(item_or_url, dict) else {"url": item_or_url}
    doms = [d for d in (_domain(it.get("source_url", "")), _domain(it.get("url", ""))) if d and d != "news.google.com"]
    best = ("other", 0)
    for tier, t in tiers.items():
        sc = t.get("score", 0)
        for dom in doms:
            hit = any(dom == x or dom.endswith("." + x) for x in t.get("domains") or []) or any(dom.endswith(s) for s in t.get("tld_suffixes") or [])
            if hit and sc > best[1]:
                best = (tier, sc)
        src = str(it.get("source") or "")
        named = src in (names.get(tier) or []) or any(p.lower() in src.lower() for p in (cfg.get("name_patterns") or {}).get(tier) or [])
        if named and sc > best[1]:
            best = (tier, sc)
    return best


def _words(text: str) -> set:
    stop = {"the", "a", "an", "why", "how", "does", "do", "is", "are", "of", "to", "and", "your", "you", "in", "on", "for", "can", "with", "it", "that", "this", "what", "under", "just", "by"}
    return {w for w in re.findall(r"[a-z0-9]+", (text or "").lower()) if len(w) > 2 and w not in stop}


def relevance(item: dict, topic_text: str) -> int:
    """Distinct topic words (light plural folding) shared with the item's title + summary (HTML stripped)."""
    fold = lambda ws: {w[:-1] if w.endswith("s") and len(w) > 4 else w for w in ws}  # noqa: E731
    text = item.get("title", "") + " " + re.sub(r"<[^>]+>", " ", item.get("summary") or "")
    return len(fold(_words(topic_text)) & fold(_words(text)))


def rank_sources(items: list, topic_text: str, k: int = 10) -> list:
    """Topic grounding for --topic (DIRECTION-AB D8, 6.4 #8): relevance FIRST. An item must share at least MIN_RELEVANCE
    distinct topic words (fewer only when the topic itself has fewer content words); --source items always pass. Only then
    is it ordered by authority, then relevance, then intake order. Returns [] when nothing is relevant (caller asks for --source)."""
    need = min(MIN_RELEVANCE, max(1, len(_words(topic_text))))
    scored = []
    for n, i in enumerate(items):
        rel = relevance(i, topic_text)
        if i.get("forced") or rel >= need:
            scored.append((-(10 if i.get("forced") else authority(i)[1]), -rel, n, i))
    return [i for *_, i in sorted(scored, key=lambda t: t[:3])][:k]


def fetch_forced(urls: list) -> list:
    """`--source URL` (repeatable): fetch each page now so it is a real catalog item (lint.provenance accepts it)."""
    from adapters import news_rss
    out = []
    for u in urls:
        it = news_rss.fetch_page(u)
        if not it.get("readable"):  # plain fetch got nothing usable: try the Steel tier (only if STEEL_API_URL is set)
            from adapters import web_fetch
            t = web_fetch.read(u, 1500)
            if t:
                it.update(text=t, summary=t[:300], readable=True)
        tier = authority(it)[0]
        print(f"source: {u} ({tier}{'' if it.get('readable') else '; WARNING: no readable text, the verifier will find no evidence there'})")
        out.append(it)
    return out


def source_report(ep: dict, items: list) -> list:
    """Director-side claim check: a claim citing only a low-authority domain gets `director_source_authority` (warn).
    (Hook for lint.py: the same rule could live there as `claims_source_authority` using director.authority.)"""
    by_url = {i["url"]: i for i in items}
    out = []
    for c in ep.get("claims") or []:
        if not isinstance(c, dict) or not c.get("url"):
            continue
        tier, _ = authority(by_url.get(c["url"]) or c["url"])
        if tier == "other":
            who = (by_url.get(c["url"]) or {}).get("source") or _domain(c["url"])
            out.append(("warn", "director_source_authority", f"claim '{str(c.get('claim', ''))[:60]}' cites {who}, not a primary/reference/major source "
                        "(config/source_quality.yaml); cite one of those or rerun with --source URL"))
    return out


# ---------------------------------------------------------------- prompt assembly


def prompt_envelope(var: dict) -> dict:
    """The audience style envelope as the writer sees it. With --force-mode outside the envelope the forced mode is added
    (marked) so the prompt never says 'allowed: [...]' and 'use mode X' with X outside that list (DIRECTION-AB D2)."""
    env = dict(brain.style_envelope(var["audience"]))
    mode = var.get("mode") or "explainer"
    if mode not in env["modes"]:
        env["modes"] = list(env["modes"]) + [f"{mode} (owner override for this episode)"]
    return env


_HINTS = {
    "direction.lens": "a lens card id from the envelope; OMIT the key when there is no lens (never null)",
    "direction.skills_used": "card ids you actually applied (non-empty)",
    "direction.cold_open.archetype": "archetype id WITHOUT 'arch-' (e.g. reveal)",
    "direction.cold_open.duration_s": "seconds of the whole cold open = the sum of its shots' duration_s",
    "direction.cold_open.scene_ids": "the first scene ids, in order, that form the cold open (1-4 scenes)",
    "direction.cold_open.question": "question-card text, <= 8 words",
    "direction.style_segments[].scene_ids": "scene ids in this segment",
    "continuity.characters": "[{id, identity_string (verbatim descriptor repeated in every prompt that shows them)}]",
    "continuity.locations": "[{id, description}]",
    "continuity.props": "[{id, description}]",
    "continuity.ledger": "[{scene, state}] what changed",
    "shot.archetype": "archetype id without 'arch-'",
    "shot.duration_s": "seconds on screen (a clip is at most the provider clip length)",
    "shot.continuity_ids": "continuity character/prop ids in frame",
    "shot.style_segment": "style_segments[].id",
    "claims[].url": "a SOURCE ID (S1, S2 ...) from SOURCES; the director writes the exact URL",
    "sources[].url": "a SOURCE ID (S1, S2 ...)",
    "mechanism[].source": "a SOURCE ID (S1, S2 ...)",
    "news_hook.url": "a SOURCE ID (S1, S2 ...)",
    "mechanism[].step": "the step as a short sentence (a string, never a number)",
    "mechanism[].scene": "scene id that narrates AND shows it",
    "visual.number.source": "short attribution text such as 'NASA' (not a URL)",
    "visual.orbit.rings": "[{id, r (0.57-0.72), main?: bool}]",
    "visual.orbit.bodies": "[{id, ring, label, color (palette key: coral|mint|sky|ink), startAngle? (degrees CCW, 0 = right, 90 = top)}] physical mode: speed follows the ring radius (Kepler); write NO keyframes",
    "visual.orbit.reveal": "[{at (0-1), caption?, show?: [body ids], highlight?: [body ids], burn?: {body, dir?: prograde|retrograde}, move?: {body, toRing, over (frames)}, readout?: {label?, value}, hideGap?: bool}]",
    "visual.orbit.gap": "{body1, body2}",
    "visual.orbit.shots": "cannon mode: [{speed (fraction of circular speed), label, at (0-1), color}]",
    "visual.orbit.site": "groundtrack mode: {lon, lat, label}",
}
_OBJ_NOTES = {"packaging.long_form": "OMIT unless a real long-form video exists (never null)", "visual.clip.term": "optional", "visual.illustration.term": "optional"}
# visual fields per writer-usable type (schema allOf gives the required ones; these are the optional extras, kept only if the schema has them)
VISUAL_FIELDS = {
    "illustration": ["prompt", "term"],
    "clip": ["keyframe_prompt", "motion_prompt", "last_frame_prompt", "term"],
    "steps": ["title", "steps"],
    "number": ["value", "unit", "label", "source", "animation"],
    "compare": ["colA", "colB", "rows", "winner"],
    "orbit": ["mode", "rings", "bodies", "gap", "reveal", "lapSec", "note", "shots", "site", "inclination", "laps", "lapShift"],
    "chart": ["kind", "series", "title", "unit", "zero", "highlight", "source"],
    "timeline": ["events", "title", "source"],
    "forces": ["left", "right", "center", "title", "source"],
}
NATURAL_FORMS = ("chart", "timeline", "forces")  # information in its natural form: change over time, sequence, push against push
HAND_AUTHORED = ("diagram", "photo", "remotion")  # need hand data (node layouts, licensed stills, templates): never written by the director
SPACE_WORDS = {"space", "orbit", "orbital", "orbits", "station", "iss", "satellite", "rocket", "launch", "planet", "moon", "mars", "nasa", "astronaut",
               "astronauts", "spacecraft", "capsule", "rendezvous", "docking", "comet", "asteroid", "galaxy", "telescope", "spacex", "dragon", "crew"}
TOP_LEVEL_SHAPES = ("claims", "sources", "mechanism", "concepts", "loops", "news_hook", "packaging")


def is_space_topic(*texts) -> bool:
    """orbit (Remotion, free) is offered only for space/astronomy topics."""
    words = set(re.findall(r"[a-z]+", " ".join(t or "" for t in texts).lower()))
    return len(words & SPACE_WORDS) >= 1 or "astronomy" in words


def _schema() -> dict:
    return json.loads((D / "episode.schema.json").read_text())


def _shape(node: dict, path: str, depth: int = 0, enums: dict | None = None) -> str:
    """Compact pseudo-JSON for a schema node: exact key names (optional keys end in '?'), enums, ranges, string lengths."""
    enums = enums or {}
    if path in enums:
        return "|".join(enums[path])
    if "enum" in node:
        return "|".join(map(str, node["enum"]))
    t = node.get("type")
    if t == "object" and node.get("properties"):
        req = set(node.get("required") or [])
        inner = ", ".join(f"{k}{'' if k in req else '?'}: {_shape(v, f'{path}.{k}', depth + 1, enums)}" for k, v in node["properties"].items())
        return "{" + inner + "}" + (f" ({_OBJ_NOTES[path]})" if path in _OBJ_NOTES else "")
    if t == "array" and isinstance(node.get("items"), dict) and node["items"] and path not in _HINTS:
        return "[" + _shape(node["items"], path + "[]", depth + 1, enums) + "]"
    if path in _HINTS:
        h = _HINTS[path]
        return h if h.startswith(("[", "{")) else f"{t or 'any'} ({h})"
    if t == "integer" and ("minimum" in node or "maximum" in node):
        return f"integer {node.get('minimum', '')}-{node.get('maximum', '')}"
    if t == "string" and ("maxLength" in node or "minLength" in node):
        return f"string ({node.get('minLength', 0)}-{node['maxLength']} chars)" if "maxLength" in node else f"string (>= {node['minLength']} chars)"
    return "|".join(t) if isinstance(t, list) else (t or "any")


def _nullable_paths(node, path="") -> list:
    out = []
    if isinstance(node, dict):
        t = node.get("type")
        if t == "null" or (isinstance(t, list) and "null" in t):
            out.append(path or "(root)")
        for k, v in (node.get("properties") or {}).items():
            out += _nullable_paths(v, f"{path}.{k}" if path else k)
        if isinstance(node.get("items"), dict):
            out += _nullable_paths(node["items"], path + "[]")
    return out


def visual_variants(space: bool = False) -> list:
    """One line per visual type the writer may emit: required fields from the schema's allOf if/then, optional extras from
    VISUAL_FIELDS that the schema actually has, shapes rendered by _shape. Read at runtime."""
    vis = _schema()["properties"]["scenes"]["items"]["properties"]["visual"]
    props = vis.get("properties") or {}
    req = {}
    for rule in vis.get("allOf") or []:
        t = (((rule.get("if") or {}).get("properties") or {}).get("type") or {}).get("const")
        if t:
            req[t] = list((rule.get("then") or {}).get("required") or [])
    lines = []
    for t, extra in VISUAL_FIELDS.items():
        if t not in (props.get("type") or {}).get("enum", []) or (t == "orbit" and not space):
            continue
        keys = [k for k in dict.fromkeys(req.get(t, []) + extra) if k in props]
        body = ", ".join(f"{k}{'' if k in req.get(t, []) else '?'}: {_shape(props[k], f'visual.{t}.{k}')}" for k in keys)
        lines.append(f"  {t}: {{type: \"{t}\", {body}}}")
    return lines


def shape_skeleton(env: dict | None = None, space: bool = False) -> str:
    """Episode shapes read from direction/episode.schema.json at call time (cannot drift): the contract objects (claims,
    sources, mechanism, concepts, loops, news_hook, packaging), scenes[] with each visual variant, direction, continuity, shot."""
    schema = _schema()
    props = schema["properties"]
    scene = props["scenes"].get("items") or {}
    sprops = scene.get("properties") or {}
    shot = sprops.get("shot") or {}
    dialects = [d for d in (env or {}).get("dialects", ["native", "cinematic"]) if d in ("native", "cinematic")] or ["native"]
    enums = {"direction.style_segments[].medium": dialects}
    nulls = _nullable_paths(schema)
    lines = ["SHAPES (exact key names and enums from direction/episode.schema.json; keys ending in '?' are optional; use no other keys):",
             "- No field accepts null" + (f" except {nulls}" if nulls else "") + ": OMIT an optional key instead of writing null (e.g. direction.lens, packaging.long_form)."]
    for key in TOP_LEVEL_SHAPES:
        if key in props:
            lines.append(f"{key}: {_shape(props[key], key, enums=enums)}")
    sreq = set(scene.get("required") or [])
    sk = ", ".join(f"{k}{'' if k in sreq else '?'}: {'<one visual variant below>' if k == 'visual' else ('<shot below>' if k == 'shot' else _shape(v, f'scene.{k}'))}"
                   for k, v in sprops.items())
    lines.append(f"scenes[]: {{{sk}}}  (term lives inside visual, never on the scene)")
    lines.append("visual variants (paid: clip; FREE Remotion: " + ", ".join(t for t in NATURAL_FORMS + ("steps", "number", "compare") + (("orbit",) if space else ())) + "; illustration = one generated still):")
    lines += visual_variants(space)
    lines.append(f"- never emit visual.type {' / '.join(HAND_AUTHORED + (() if space else ('orbit',)))} (hand-authored; the director's check rejects them).")
    lines.append("- Choose each scene's visual by the RELATIONSHIP it shows, not by habit: change over time -> chart (kind line or bar, direct labels, one highlight); a sequence of dated events -> timeline (in time order, 6 events at most); "
                 "one force pushing against another -> forces (left vs right with a centre outcome); ONE headline figure -> number; two things defined side by side -> compare; a short process -> steps; "
                 "a metaphor or real object -> illustration; real-world footage a camera could record -> clip" + ("; orbits -> orbit" if space else "") + ". "
                 "Text and number tiles (number, compare, steps) may be at most 40% of the scenes: lint fails a draft above 60%. Spend a paid clip only on real footage, never on animated dots or diagrams.")
    for key in ("direction", "continuity"):
        if key in props:
            lines.append(f"{key}: {_shape(props[key], key, enums=enums)}")
    if shot:
        lines.append(f"scenes[].shot: {_shape(shot, 'shot', enums=enums)}")
    lines.append(f"style_segments[].medium is native|cinematic; this audience allows: {dialects}.")
    return "\n".join(lines)


def required_block(var: dict, env: dict) -> str:
    """REQUIRED fields the director's own check enforces (DIRECTION-AB L2): stated in the prompt so the writer fills them."""
    mode = var.get("mode") or "explainer"
    if mode not in brain.DRAMA_MODES:
        return f"For mode '{mode}' omit direction.cold_open; still set direction.mode, mode_reason, skills_used, and a `shot` object on each clip scene."
    cap = env.get("cold_open_max_s")
    clip = video_clip_seconds()
    return "\n".join([
        f"REQUIRED for mode '{mode}' (the director's check FAILS the draft if any is missing):",
        "- direction.cold_open.archetype: one archetype id (without 'arch-') from the archetype cards below" + (f"; use '{var['arch'].removeprefix('arch-')}' unless it cannot fit" if var.get("arch") else ""),
        f"- direction.cold_open.duration_s: Short 5-8 s (max 10){f'; audience cap {cap} s' if cap else ''}; long-form 10-20 s",
        f"- direction.cold_open.bridge: one of {list(RENDERABLE_BRIDGES)}" + (f"; use '{var['bridge']}' unless it cannot fit" if var.get("bridge") else "") + "; question-card also needs direction.cold_open.question (<= 8 words)",
        "- direction.cold_open.scene_ids: the FIRST 1-4 scene ids in order; the cold open ends at the bridge (it is not a whole-video beat sheet)",
        "- the first cold-open scene opens wide (shot.size ews or ws)",
        "- " + COLD_OPEN_NARRATION_RULE,
        "- direction.skills_used: non-empty; a `shot` object on every scene" + (f"; a clip's shot.duration_s <= {clip} s (provider clip length)" if clip else ""),
        "- if any scene uses the cinematic dialect: direction.style_segments covering every scene, joined by the bridge"])


EXAMPLE_COLD_OPEN = {  # original, illustrative only (ears popping on a descent); shape and quality bar, never copy its content
    "direction": {"mode": "cold-open-drama", "mode_reason": "A visible moment (a passenger pressing her ear on the descent) embodies the question; drama 4 vs explainer 3.",
                  "lens": "lens-procedural-precision", "skills_used": ["mode-cold-open-drama", "arch-impact", "mode-bridge-question-card", "cont-identity-string", "arch-conventions"],
                  "cold_open": {"archetype": "impact", "duration_s": 6, "bridge": "question-card", "bridge_frames": 30, "question": "Why do your ears pop?", "scene_ids": ["s1", "s2"]},
                  "style_segments": [{"id": "open", "medium": "cinematic", "scene_ids": ["s1", "s2"]}, {"id": "explain", "medium": "native", "scene_ids": ["s3", "s4", "s5", "s6"]}]},
    "continuity": {"characters": [{"id": "pax", "identity_string": "a woman in her thirties with short dark hair and a grey knit scarf"}],
                   "locations": [{"id": "cabin", "description": "narrow aircraft cabin at dusk, window seat on the left"}], "props": [], "ledger": [],
                   "style_lock": "warm reading-light key, cool window fill, the profile accent on the scarf"},
    "scenes": [
        {"id": "s1", "beat": "hook", "narration": "Descending now.",
         "visual": {"type": "clip", "keyframe_prompt": "Wide shot down a narrow aircraft cabin at dusk; a woman in her thirties with short dark hair and a grey knit scarf sits at the left window, lit warm from above and cool from the window.",
                    "motion_prompt": "The camera holds a static shot as the cabin tilts gently forward; the woman winces and lifts one hand toward her ear. Ends with her hand pressed behind the ear."},
         "shot": {"archetype": "impact", "size": "ws", "move": "static", "light_source": "overhead reading light, window fill camera-left", "action": "she lifts her hand to her ear", "duration_s": 3, "continuity_ids": ["pax"], "location_id": "cabin", "style_segment": "open"}},
        {"id": "s2", "beat": "hook_turn", "narration": "Pop.",
         "visual": {"type": "clip", "keyframe_prompt": "Insert close on the hand of a woman in her thirties with short dark hair and a grey knit scarf, fingertips pressed just behind her ear, warm overhead light.",
                    "motion_prompt": "The camera pushes in with small amplitude at slow speed toward her fingers; she swallows and her shoulders drop as the pressure eases. Ends with her hand relaxing."},
         "shot": {"archetype": "impact", "size": "insert", "move": "push in, small amplitude, slow", "duration_s": 3, "continuity_ids": ["pax"], "location_id": "cabin", "style_segment": "open"}},
        {"id": "s3", "beat": "question", "narration": "Why do your ears pop? The air inside your ear has to match the air outside.",
         "visual": {"type": "steps", "title": "Inside your ear", "steps": ["Cabin air pressure rises", "Air behind the eardrum lags", "Swallowing opens a tube", "Pressures match: pop"]},
         "shot": {"size": "ms", "style_segment": "explain"}}]}


def example_block() -> str:
    return ("DIRECTED EXAMPLE (cold-open fragment; original and illustrative: copy the SHAPE and the discipline, never the content; scenes s4-s6 omitted):\n"
            + json.dumps(EXAMPLE_COLD_OPEN, ensure_ascii=False, separators=(",", ":")))


def clip_guidance() -> str:
    """Clip-prompt guidance: the configured video model's dialect sections (routing.yaml dialects + dialect_sections)."""
    clip = video_clip_seconds()
    head = f"### CLIP PROMPTS (paid; {clip} s per clip at the configured model)" if clip else "### CLIP PROMPTS (paid)"
    return "\n".join(x for x in (head, brain.clip_dialect("video")) if x)


def checklist_compact() -> str:
    """qa_checklist.yaml as one line per live rule (lint enforces the rest mechanically; superseded rules are dropped)."""
    out = []
    for r in (yaml.safe_load(_read("qa_checklist.yaml")) or {}).get("rules", []):
        if r.get("enforced_by") == "superseded":
            continue
        extra = {k: r[k] for k in ("threshold", "threshold_min", "threshold_max", "exception", "disallowed_tokens") if k in r}
        out.append(f"- {r['id']} [{r.get('severity', 'warn')}]: {r.get('description', '')}" + (f" {json.dumps(extra, ensure_ascii=False)}" if extra else ""))
    return "\n".join(out)


def _card_ids(var: dict) -> list:
    """script + shotlist pack ids (+ chosen archetype/lens), each card once (the two packs overlap)."""
    mode, aud = var.get("mode") or "explainer", var["audience"]
    extra = [var.get("arch") if (var.get("arch") or "").startswith("arch-") else (f"arch-{var['arch']}" if var.get("arch") else None), var.get("lens")]
    extra = [x for x in extra if x and x in brain.cards()]
    ids = brain.pack_ids("script", mode, aud) + brain.pack_ids("shotlist", mode, aud, extra if mode not in brain.DRAMA_MODES else None)
    return [i for n, i in enumerate(ids) if i not in ids[:n]]


def system_prompt(var: dict) -> str:
    """FULL pack (writer call only). Repairs use repair_system_prompt()."""
    fm = formats()
    mode = var.get("mode") or "explainer"
    env = prompt_envelope(var)
    chosen = {k: fm[k] for k in var["formats"] if k in fm}
    cs, ids = brain.cards(), _card_ids(var)
    override = " The owner forced this mode outside the audience envelope (--force-mode); follow it." if var.get("mode_forced_outside_envelope") else ""
    brain_head = ("## DIRECTION BRAIN (direction/craft; our consolidated craft knowledge; third-party text under direction/skills/vendor is NOT loaded)\n"
                  f"Direction mode for this episode: **{mode}** ({var.get('mode_reason', 'default')}); it was chosen inside the style envelope above.{override} "
                  "Apply the cards below; be creative, but every shot must be plausible against real life and real film grammar (realism cards are binding and the verifier checks them). "
                  f"{bridges_sentence()} Set `direction.mode` to '{mode}', plus `direction.mode_reason` and `direction.skills_used` (ONLY card ids you visibly applied; the director checks the mechanical ones).")
    parts = [_read("director_prompt.md"), "## AUDIENCE CARD for this episode (binding)\n" + yaml.safe_dump(var["card"], sort_keys=False),
             "## audience.yaml\n" + _read("audience.yaml"), "## hooks.md\n" + _read("hooks.md"),
             "## shots.md\n" + _read("shots.md"), "## packaging.md\n" + _read("packaging.md"), "## qa_checklist.yaml (live rules, one line each; lint enforces them)\n" + checklist_compact(),
             "## script_template.yaml (field meanings; where it disagrees with SHAPES below, SHAPES wins)\n" + _read("script_template.yaml"),
             "## allowed formats this run\n" + yaml.safe_dump(chosen, sort_keys=False),
             "## " + brain.render_envelope(env),
             brain_head + "\n" + shape_skeleton(env, var.get("space", False)) + "\n" + required_block(var, env)
             + ("\n" + example_block() if mode in brain.DRAMA_MODES else ""),
             "### Craft cards\n" + brain.render([cs[i] for i in ids], audience=var["audience"]),
             brain.drama_extras(mode, var["audience"], var.get("arch"), var.get("lens"), env),
             clip_guidance(),
             "### Realism guard rail (blocker checks the verifier will run; cards already shown above are not repeated)\n"
             + brain.render([cs[i] for i in brain.ids_for("qa", mode) if cs[i].get("severity") == "blocker" and i not in ids], full=False)]
    return "\n\n".join(p for p in parts if p)


def _packaging_rule_ids() -> set:
    try:
        return set(re.findall(r"\(\"(?:error|warn)\", \"([a-z_]+)\"", (ROOT / "packaging.py").read_text()))
    except FileNotFoundError:
        return set()


def repair_cards(problems: list) -> list:
    """Craft card ids a repair pass needs: rule ids that are card ids (real-*, mode-* ...), card ids named in messages,
    and RULE_CARDS for lint/director rule ids. Nothing else is re-sent."""
    cs, out = brain.cards(), []
    for _, rid, msg in problems:
        out += [rid] if rid in cs else []
        out += RULE_CARDS.get(rid, [])
        out += [m for m in _CARD_ID_RE.findall(str(msg)) if m in cs]
    return [i for n, i in enumerate(out) if i in cs and i not in out[:n]]


def repair_system_prompt(var: dict, problems: list) -> str:
    """SHORT pack for repair calls (DIRECTION-AB D12): the binding audience card, the envelope, the shapes, the cards and
    qa_checklist rules the listed problems cite, and packaging.md / hooks.md / the dialect only when a cited rule needs them."""
    mode = var.get("mode") or "explainer"
    env = prompt_envelope(var)
    rids = {r for _, r, _ in problems}
    rules = [r for r in (yaml.safe_load(_read("qa_checklist.yaml")) or {}).get("rules", []) if r.get("id") in rids]
    ids = repair_cards(problems)
    parts = ["You are repairing an episode.json for an explainer video channel. Fix ONLY the listed problems; keep the shape, scene ids, every required key "
             "and everything not listed. Output the FULL corrected JSON object only. Cite sources ONLY by their SOURCE ID (S1, S2 ...); never type a URL.",
             "## AUDIENCE CARD (binding)\n" + yaml.safe_dump(var["card"], sort_keys=False),
             "## " + brain.render_envelope(env),
             f"## DIRECTION\nMode: **{mode}**. {bridges_sentence()}\n" + shape_skeleton(env, var.get("space", False)) + "\n" + required_block(var, env)]
    if rules:
        parts.append("## qa_checklist rules cited by the problems\n" + yaml.safe_dump(rules, sort_keys=False, allow_unicode=True))
    if ids:
        parts.append("## Craft cards cited by the problems\n" + brain.render([brain.cards()[i] for i in ids], audience=var["audience"]))
    if rids & _packaging_rule_ids() or any(r.startswith(("packaging", "title", "thumbnail", "description")) for r in rids):
        parts.append("## packaging.md\n" + _read("packaging.md"))
    if any("hook" in r or "cta" in r for r in rids):
        parts.append("## hooks.md\n" + _read("hooks.md"))
    if rids & {"camera_command_syntax", "director_prompt_cjk", "positive_phrasing", "director_native_cinematic_words"}:
        parts.append(brain.clip_dialect("video"))
    return "\n\n".join(p for p in parts if p)


def token_count(text: str) -> int:
    """cl100k_base tokens when tiktoken is installed (a proxy: MiniMax's tokenizer differs a little), else chars/4."""
    try:
        import tiktoken
        return len(tiktoken.get_encoding("cl100k_base").encode(text))
    except Exception:
        return len(text) // 4


def _progress(**kw) -> None:
    """Live step info for the current run (runlog.py: out/runs/<id>/meta.json, shown by `run.py director-status` and the web UI)."""
    import runlog
    runlog.update(**kw)


def status() -> int:
    """`run.py director-status`: what the latest Director run is doing, and for how long."""
    import runlog
    runs = [r for r in runlog.list_runs(10) if r.get("label") == "director"]
    if not runs:
        print("no Director run recorded yet (only runs started after 2026-10-05 are recorded)")
        return 1
    p, t, now = runs[0], datetime.datetime.fromisoformat, datetime.datetime.now()
    print(f"run {p['id']} | {p['state'].upper()} | activity: {p.get('activity', '-')} | stage: {p.get('stage', '-')}")
    print(f"started {p['started_at']} ({(now - t(p['started_at'])).total_seconds() / 60:.1f} min ago); last update {(now - t(p['updated_at'])).total_seconds():.0f}s ago")
    if p["state"] == "running" and p.get("activity") == "waiting for model" and p.get("call_started_at"):
        w = (now - t(p["call_started_at"])).total_seconds()
        print(f"waiting {w:.0f}s on the model for '{p.get('stage')}' (~{p.get('tokens_in')} tokens in). Normal for thinking models: 2-7 min. "
              f"Per-attempt timeout is 420 s, then retries after 30/90/180 s, then the next model.")
    print(f"LLM calls done: {len(p.get('calls_done', []))} | ~{p.get('tokens_so_far', 0)} tokens so far")
    for label, secs in p.get("calls_done", []):
        print(f"   {label}: {secs}s")
    for k in ("episode", "error"):
        if p.get(k):
            print(f"{k}: {p[k]}")
    return 0


class Budget:
    """Estimated LLM tokens for one director run (input = system + prompt; output = the returned JSON). Every call prints
    its estimate before it is sent; a call that would push the run past `cap` is refused (BudgetExceeded)."""

    def __init__(self, cap: int = MAX_RUN_TOKENS, spent: int = 0, calls: list | None = None):
        self.cap, self.spent, self.calls = cap, int(spent or 0), [tuple(c) for c in calls or []]

    def call(self, llm, label: str, prompt: str, system: str | None = None, expect_out: int = 6000):
        tin = token_count(prompt) + (token_count(system) if system else 0)
        if self.spent + tin + expect_out > self.cap:
            raise BudgetExceeded(f"{label}: ~{tin} in + ~{expect_out} out would exceed the run cap {self.cap} (spent ~{self.spent}); stopping")
        print(f"[{time.strftime('%H:%M:%S')}] LLM {label}: ~{tin} tokens in (system ~{token_count(system) if system else 0}, cl100k stand-in); run total so far ~{self.spent}", flush=True)
        t0 = time.time()
        _progress(activity="waiting for model", stage=label, call_started_at=datetime.datetime.now().isoformat(timespec="seconds"), tokens_in=tin, tokens_so_far=self.spent)
        res = llm.generate_json(prompt, system=system) if system is not None else llm.generate_json(prompt)
        dt = time.time() - t0
        tout = token_count(json.dumps(res, ensure_ascii=False)) if res is not None else 0
        print(f"[{time.strftime('%H:%M:%S')}] LLM {label}: done in {dt:.0f}s (~{tout} tokens out)", flush=True)
        _progress(activity="between calls", stage=label, tokens_so_far=self.spent + tin + tout, calls_done=(self._done() + [[label, round(dt)]]))
        self.spent += tin + tout
        self.calls.append((label, tin, tout))
        return res

    @staticmethod
    def _done() -> list:
        try:
            import runlog
            return list(runlog.meta().get("calls_done", []))
        except Exception:  # noqa: BLE001
            return []

    def charge(self, label: str, tokens: int) -> None:
        """Calls made elsewhere (verify.run) are estimated and counted, not metered."""
        self.spent += tokens
        self.calls.append((label, tokens, 0))


class BudgetExceeded(RuntimeError):
    pass


# ---------------------------------------------------------------- source ids (D9: the model never types a URL)


def source_ids(items: list) -> dict:
    """S1, S2 ... in catalog order -> exact fetched URL."""
    return {f"S{n + 1}": i["url"] for n, i in enumerate(items) if i.get("url")}


def _url_fields() -> list:
    """(array-or-object key, field) pairs whose values are source URLs, read from the schema: claims/sources `url`,
    mechanism `source`, news_hook `url`."""
    props = _schema()["properties"]
    out = []
    for key in ("claims", "sources", "mechanism", "news_hook"):
        node = props.get(key) or {}
        node = node.get("items", node) if node.get("type") == "array" else node
        for f in ("url", "source_url", "source"):
            if f in (node.get("properties") or {}):
                out.append((key, f))
                break
    return out


_SID = re.compile(r"\{?\[?\b(S\d{1,3})\b\]?\}?")


def to_ids(ep: dict, ids: dict) -> dict:
    """Replace catalog URLs by their ids in the source fields and in packaging text (prompt side)."""
    back = {u: k for k, u in ids.items()}
    ep = copy.deepcopy(ep)
    for key, f in _url_fields():
        for it in (ep.get(key) if isinstance(ep.get(key), list) else [ep.get(key)]):
            if isinstance(it, dict) and it.get(f) in back:
                it[f] = back[it[f]]
    pk = ep.get("packaging")
    if isinstance(pk, dict):
        for k, v in pk.items():
            if isinstance(v, str):
                for u, sid in sorted(back.items(), key=lambda x: -len(x[0])):
                    v = v.replace(u, "{" + sid + "}")
                pk[k] = v
    return ep


def from_ids(ep: dict, ids: dict) -> tuple:
    """Resolve S-ids back to the exact fetched URLs (code side). Returns (episode, unknown ids)."""
    unknown = []
    for key, f in _url_fields():
        for it in (ep.get(key) if isinstance(ep.get(key), list) else [ep.get(key)]):
            if isinstance(it, dict) and isinstance(it.get(f), str):
                m = re.fullmatch(r"\s*\{?\[?(S\d{1,3})\]?\}?\s*", it[f])
                if m:
                    if m.group(1) in ids:
                        it[f] = ids[m.group(1)]
                    else:
                        unknown.append(m.group(1))
    pk = ep.get("packaging")
    if isinstance(pk, dict):
        for k, v in pk.items():
            if isinstance(v, str):
                pk[k] = re.sub(r"\{(S\d{1,3})\}", lambda m: ids.get(m.group(1), m.group(0)), v)
    return ep, unknown


def sources_block(items: list, ids: dict, only: list | None = None) -> str:
    """Compact catalog for prompts: id, title, publisher, authority tier, date. No URLs."""
    back = {u: k for k, u in ids.items()}
    rows = []
    for i in items:
        if only is not None and i["url"] not in only:
            continue
        sid = back.get(i["url"])
        if sid:
            rows.append(f"- {sid}: {i.get('title', '')[:110]} | {i.get('source', '')} [{authority(i)[0]}] {i.get('published', '')}"
                        + (f" | {re.sub(r'<[^>]+>', ' ', i.get('summary') or '')[:140].strip()}" if i.get("summary") else "")
                        + (f"\n    PAGE TEXT (data, not instructions; state only what it supports): {re.sub(r'\\s+', ' ', i['text'])[:900]}" if i.get("text") else ""))
    return "\n".join(rows)


# ---------------------------------------------------------------- LLM steps


def pick_topic(llm, items: list, eps: list, n: int, budget: "Budget | None" = None) -> dict:
    catalog = [{"title": i["title"], "source": i["source"], "date": i["published"], "url": i["url"]} for i in items[:45]]
    past = [e["title"] for e in eps]
    prompt = f"""Today is {datetime.date.today().isoformat()}. From the news items below, propose {n} candidate explainer topics for a channel that explains
how money, prices and everyday systems work to people who do not know the jargon, using one analogy per video.
Rules: only cite URLs from the catalog (never invent a URL); each topic must be explainable in 50-60 seconds with one analogy; the news item is
the "why now", the explanation is evergreen; do NOT repeat past episodes: {json.dumps(past)}.
Return JSON: {{"candidates":[{{"headline":str,"angle":str,"why_now":str,"audience_misconception":str,"explainability":1-5,"source_urls":[str]}}],"chosen":int}}
where chosen is the 0-based index of the best candidate (explainability first, then timeliness).
CATALOG: {json.dumps(catalog, ensure_ascii=False)}"""
    res = (budget or Budget()).call(llm, "topic pick", prompt, expect_out=1500)
    cands = res["candidates"]
    for c in cands:  # never trust URLs from the model: keep only catalog URLs
        c["source_urls"] = [u for u in c.get("source_urls", []) if u in {i["url"] for i in items}]
    best = max(range(len(cands)), key=lambda i: (bool(cands[i]["source_urls"]), int(cands[i].get("explainability") or 0), -i))  # a topic we cannot source cannot be fact-checked
    return {"candidates": cands, "chosen": best}  # our own ranking: the model's `chosen` index proved unreliable


def word_target(card: dict) -> tuple:
    lo, hi = card["length_sec"]
    return round(lo * card["pace_wps"]), round(hi * card["pace_wps"])


def choose_mode(llm, topic: dict, var: dict, eps: list, budget: "Budget | None" = None) -> dict:
    """Step 1 of progressive disclosure: pick the direction mode from the menu (cheap call); only that mode's cards are then loaded."""
    modes = var["modes"]
    if len(modes) == 1:
        why = "owner override (--force-mode, outside the audience envelope)" if var.get("mode_forced_outside_envelope") else "owner override (--mode)"
        return {"mode": modes[0], "mode_reason": why}
    recent = [(e.get("direction") or {}).get("mode", "explainer") for e in eps[-5:]]
    prompt = f"""Choose the direction MODE for one short explainer episode. Follow the mode-selection procedure below (score, apply variety and the audience filter, prefer the cheaper mode on ties).
TOPIC: {json.dumps({k: topic.get(k) for k in ("headline", "angle", "why_now", "audience_misconception")}, ensure_ascii=False)}
AUDIENCE: {var['audience']}; allowed formats: {var['formats']}; allowed modes (hard filter): {modes}; modes of the last five episodes (oldest first): {recent}.
{brain.render([brain.cards()[m] for m in ["mode-selection"] + [f"mode-{x}" for x in modes]])}
Drama only when a visible moment of consequence embodies the stakes; never dramatize a claim we cannot source. Return JSON: {{"mode": one of {modes}, "mode_reason": "one sentence with the scores that decided it"}}"""
    res = (budget or Budget()).call(llm, "choose mode", prompt, expect_out=200)
    return {"mode": res["mode"] if res.get("mode") in modes else modes[0], "mode_reason": str(res.get("mode_reason", ""))[:300]}


def _pick(val, allowed: list, prefix: str):
    """Accept a menu answer with or without its card prefix ('mode-bridge-j-cut' or 'j-cut'; 'arch-reveal' or 'reveal')."""
    if not isinstance(val, str):
        return None
    v = val.strip()
    for cand in (v, v.removeprefix(prefix), prefix + v):
        if cand in allowed:
            return cand
    return None


def choose_shape(llm, topic: dict, var: dict, budget: "Budget | None" = None) -> dict:
    """Step 2 (drama modes only, cheap call): pick archetype + lens + bridge from what the envelope allows, so the writer's
    pack carries exactly those recipe cards in full (DIRECTION-AB D5). Answers are accepted with or without the card prefix;
    invalid or failed answers fall back to None."""
    mode, aud = var.get("mode"), var["audience"]
    if mode not in brain.DRAMA_MODES:
        return {}
    cs, env = brain.cards(), brain.style_envelope(aud)
    archs, lenses = brain.archetypes_for(mode, aud), env.get("lenses") or []
    bridges = [f"mode-bridge-{b}" for b in RENDERABLE_BRIDGES if f"mode-bridge-{b}" in cs]
    prompt = f"""Pick the cold-open ARCHETYPE, LENS and BRIDGE for one short {mode} episode. Use the router rules; stay inside the menus.
TOPIC: {json.dumps({k: topic.get(k) for k in ("headline", "angle", "why_now", "audience_misconception")}, ensure_ascii=False)}
AUDIENCE: {aud}
{brain.render([cs['arch-router']], audience=aud)}
ARCHETYPES:
{brain.render([cs[i] for i in archs], full=False)}
LENSES (or null):
{brain.render([cs[i] for i in lenses], full=False) or 'none'}
BRIDGES:
{brain.render([cs[i] for i in bridges], full=False)}
Return JSON: {{"archetype": one of {archs}, "lens": one of {lenses} or null, "bridge": one of {list(RENDERABLE_BRIDGES)}, "reason": "one sentence"}}"""
    try:
        res = (budget or Budget()).call(llm, "choose shape", prompt, expect_out=200) or {}
    except BudgetExceeded:
        raise
    except Exception as e:  # the writer can still pick from the menus in its pack
        print(f"choose_shape failed ({e}); the writer picks from the menus")
        return {}
    return {"arch": _pick(res.get("archetype"), archs, "arch-"), "lens": _pick(res.get("lens"), lenses, "lens-"),
            "bridge": _pick(res.get("bridge"), list(RENDERABLE_BRIDGES), "mode-bridge-")}


def claim_key() -> str:
    """The claims[] URL key name, from the schema (it is `url`; the old prompt said `source_url`)."""
    return next((f for k, f in _url_fields() if k == "claims"), "url")


STORY_RULES_TEXT = """STORY RULES (lint and the story reviewer enforce these):
- Tell the story in ONE time direction. For a time story set chronology "forward" and `when` (YYYY, YYYY-MM or YYYY-MM-DD) on the scenes; otherwise set chronology "none". Never go March, April, March again.
- Define every term before the viewer needs it (introduce it in a scene, list it in concepts); do not use FII, SIP, put, etc. earlier than the scene that explains it.
- Explain WHY and HOW before quoting numbers; a figure only supports a point already made. At most 3 figures on screen in a scene and 8 spoken figures in the video (the voice reads figures slowly).
- Stay on the owner's questions: give each its own scene, in order, and do not add side topics (no extra derivatives, history or statistics nobody asked for).
- If the video is too long, cut figures and side points, never the explanation of what things are and why they happen."""


def brief_block(brief: list) -> str:
    if not brief:
        return ""
    qs = "\n".join(f"{i + 1}. {q}" for i, q in enumerate(brief))
    return (f"OWNER'S BRIEF: the video exists to answer these questions, in this order, each by a scene that explains it directly (not just a number):\n{qs}\n"
            "Set brief = [{question: <the question exactly as given>, answered_in: <the scene id that answers it>}, ...] covering every question.\n")


def _outline_contract_block(outline: dict, research: dict, items: list) -> str:
    """Writer CONTRACT from the outline: one scene per beat, in order, with visual_type, evidence src ids, terms, target_seconds."""
    beats = outline.get("beats") or []
    if not beats:
        return ""
    ids = source_ids(items)
    back = {u: k for k, u in ids.items()}
    # Build evidence id -> source id mapping from research evidence list
    ev_to_src: dict = {}
    for ev in (research.get("evidence") or []):
        eid = ev.get("id", "")
        url = ev.get("url", "")
        if eid and url and url in back:
            ev_to_src[eid] = back[url]
    lines = [
        "OUTLINE CONTRACT (BINDING: write exactly these scenes in this order; use the beat id as the scene id):",
        "For each beat create ONE scene. Set scene.id = beat id. Set visual.type = the beat's visual_type. The FIRST scene's beat field is 'hook' (a question or at most 12 words).",
        "loops: exactly one entry per brief question (no duplicates): raised_in = the hook scene id, paid_in = the LATER scene that answers it.",
        "Inject evidence as claims citing the source ids listed. Introduce terms_introduced BEFORE using them.",
        "Keep narration within target_seconds * audience.pace_wps words. Do NOT add or remove beats.",
        "SHOW THE INFORMATION ITSELF: no analogy world (set analogy to null), no invented characters or props (sacks, scales, bridges...), no clip scenes (the clip rule is waived for this genre), no continuity bible or cinematic shot plans, no splitting a beat into two scenes.",
        "LITERAL LANGUAGE ONLY: say 'foreign institutions' and 'Indian institutions', never giants, sacks, tug-of-war, wave or similar images. Explain the why in plain steps before piling up numbers: each number scene says what it means in one short sentence.",
        "Put the real figures and names from the sources into the scenes; every number cites a source id; define each term in plain words the first time it appears.",
    ]
    for b in beats:
        ev_ids = b.get("evidence_ids") or []
        src_ids_str = ", ".join(ev_to_src.get(e, e) for e in ev_ids) if ev_ids else "none"
        terms = b.get("terms_introduced") or []
        q_ids = b.get("question_ids") or []
        lines.append(
            f"  beat {b['id']:6s} | visual_type={b.get('visual_type','?'):12s} | {b.get('target_seconds',0):3}s"
            f" | answers={q_ids} | sources={src_ids_str}"
            + f" | MAX {int(b.get('target_seconds', 8) * 2.3)} words, at most 3 short sentences"
            + (f" | define_first={terms}" if terms else "")
            + f"\n    one_idea: {b.get('one_idea','')[:80]}"
        )
    return "\n".join(lines)


def _fill_answered_in(ep: dict, brief_json: dict, outline: dict) -> dict:
    """Fill brief[].answered_in from the outline's question_ids -> beat id -> scene id mapping.
    Overwrites empty answered_in fields only; does not touch non-empty ones the writer set."""
    beats = outline.get("beats") or []
    q_to_beat: dict = {}
    for b in beats:
        for qid in (b.get("question_ids") or []):
            if qid not in q_to_beat:
                q_to_beat[qid] = b["id"]
    scene_ids = {s.get("id") for s in (ep.get("scenes") or []) if isinstance(s, dict)}
    brief_list = ep.get("brief") or []
    brief_qs = brief_json.get("questions") or []
    # Ensure brief list is aligned with brief_json questions
    result = []
    for i, q in enumerate(brief_qs):
        qid = q["id"]
        existing = brief_list[i] if i < len(brief_list) and isinstance(brief_list[i], dict) else {}
        answered_in = existing.get("answered_in", "")
        if not answered_in or answered_in not in scene_ids:
            # Try to fill from outline beat id (if beat id is also a scene id)
            beat_id = q_to_beat.get(qid, "")
            answered_in = beat_id if beat_id in scene_ids else answered_in
        result.append({"question": q["text"], "answered_in": answered_in})
    ep["brief"] = result
    return ep


def write_episode(llm, topic: dict, items: list, var: dict, ep_id: str, eps: list, budget: "Budget | None" = None, brief: list | None = None, contract_block: str = "") -> dict:
    by_url = {i["url"]: i for i in items}
    cited = [by_url[u] for u in topic["source_urls"] if u in by_url]
    rest = [i for i in items if i["url"] not in {c["url"] for c in cited}][:15]
    ids = source_ids(items)
    ex = {k: v for k, v in registry.read(registry.resolve("ep01-interest-rates-v2")).items()
          if k not in ("posts", "publish", "carousel", "provenance_note", "reviewed_sha256", "updated_at", "status", "music")}  # script fields only
    ex_urls = []
    for key, f in _url_fields():
        for it in (ex.get(key) if isinstance(ex.get(key), list) else [ex.get(key)]):
            if isinstance(it, dict) and it.get(f):
                ex_urls.append(it[f])
    ex_urls = list(dict.fromkeys(ex_urls))
    example = json.dumps(to_ids(ex, {f"S{n + 1}": u for n, u in enumerate(ex_urls)}), ensure_ascii=False)
    ck = claim_key()
    prompt = f"""Write the full episode.json for episode id "{ep_id}" following the Director process.
TOPIC: {json.dumps({k: topic[k] for k in ("headline", "angle", "why_now", "audience_misconception")}, ensure_ascii=False)}
SOURCES (cite ONLY by SOURCE ID in claims[].{ck}, mechanism[].source, news_hook.url and sources[].url; in packaging text write {{S1}}; never type a URL, the director fills the exact URLs;
a claim with no matching source must be dropped or reworded as opinion; prefer [primary]/[reference] sources for mechanism claims):
{sources_block(cited + rest, ids)}
AUDIENCE: "{var['audience']}" (set `audience` to exactly this; obey its card). CONSTRAINTS for variety (computed from past episodes):
choose format_id from {var['formats']}; analogy domain from {var['domains']}.
LENGTH: total narration must be {word_target(var['card'])[0]}-{word_target(var['card'])[1]} words (the card's {var['card']['length_sec']}s at {var['card']['pace_wps']} words/s); count before answering.
Last scene's beat must end in "cta"; first scene's beat must be "hook". Image prompts must not ask for text, signs, labels or numbers. Every prompt is English only.
Do not repeat past titles: {json.dumps([e['title'] for e in eps])}.
Set style.illustration_style EXACTLY to the audience card's illustration_style (it differs per audience on purpose). Copy style.palette from the example (profiles override it at render). For kids keep style.character/look from the example and invent new style.cast entries; for adults describe cast as objects, devices, places or people drawn in the card's flat editorial style (no cartoon animals), and use realistic `clip` scenes for real-world footage.
Follow "Episode contract" in director_prompt.md (mechanism, concepts, loops, news_hook, original_contribution, packaging). Visual types and their exact fields: the "visual variants" in SHAPES (system prompt); never emit {', '.join(HAND_AUTHORED + (() if var.get('space') else ('orbit',)))}. Do not set `music`, `profile`, `status` (the pipeline sets them). Output ONLY the JSON object; put the Director Notes block as a string in `director_notes`.
Direction: set `direction` (mode '{var.get('mode') or 'explainer'}'), `continuity` and per-scene `shot` exactly in the SHAPES given in the system prompt{'; the REQUIRED cold-open fields are mandatory' if var.get('mode') in brain.DRAMA_MODES else ''}.
Scenes: exactly the beats of the chosen format; narration within the format's word budgets; every illustration prompt contains no text/numbers.
{brief_block(brief or [])}{STORY_RULES_TEXT}
{precheck_block(var.get("precheck") or {})}
{contract_block}
{COLD_OPEN_NARRATION_RULE if var.get('mode') in brain.DRAMA_MODES else ''}
WORKED EXAMPLE (script shape and quality bar; it predates `direction`; source ids are its own; do not copy its content): {example}"""
    system = system_prompt(var)
    ep = (budget or Budget()).call(llm, "writer", prompt, system=system, expect_out=9000)
    if brief:  # the owner's exact words win; keep the writer's answered_in only when it names a real scene
        scene_ids = {s.get("id") for s in (ep.get("scenes") or []) if isinstance(s, dict)}
        got = {i: b for i, b in enumerate(ep.get("brief") or []) if isinstance(b, dict)}
        ep["brief"] = [{"question": q, "answered_in": (got.get(i, {}).get("answered_in") if got.get(i, {}).get("answered_in") in scene_ids else "")} for i, q in enumerate(brief)]
    ep, unknown = from_ids(ep, ids)
    if unknown:
        print(f"writer cited unknown source ids {sorted(set(unknown))} (left as is; provenance will flag them)")
    return ep


# ---------------------------------------------------------------- checks


def _strings(v):
    if isinstance(v, str):
        yield v
    elif isinstance(v, dict):
        for x in v.values():
            yield from _strings(x)
    elif isinstance(v, list):
        for x in v:
            yield from _strings(x)


_PROMPT_KEYS = ("prompt", "keyframe_prompt", "motion_prompt", "last_frame_prompt")


def _prompt_text(s: dict) -> str:
    vis = s.get("visual") if isinstance(s.get("visual"), dict) else {}
    return " ".join(str(vis.get(k) or "") for k in _PROMPT_KEYS)


def cinematic_terms() -> list:
    """Cinematic-dialect vocabulary: routing.yaml `cinematic_vocabulary` (curated from craft/lenses.yaml anchors/params and the
    dialect files) plus every '<N>mm' focal length named in lenses.yaml."""
    r = brain.routing()
    terms = list(r.get("cinematic_vocabulary") or [])
    lens_txt = (brain.CRAFT / "lenses.yaml").read_text().lower()
    terms += sorted(set(re.findall(r"\b\d{2,3}\s?mm\b", lens_txt)))
    return list(dict.fromkeys(t.lower() for t in terms))


def _native_scene_ids(ep: dict) -> set:
    """Scenes that must look native: those in a declared native segment, or every scene when the audience envelope is native-only."""
    d = ep.get("direction") if isinstance(ep.get("direction"), dict) else {}
    ids = {s.get("id") for s in ep.get("scenes") or [] if isinstance(s, dict)}
    native = set()
    for seg in d.get("style_segments") or []:
        if isinstance(seg, dict) and seg.get("medium") == "native":
            native |= set(seg.get("scene_ids") or [])
    try:
        only_native = bool(ep.get("audience")) and brain.style_envelope(ep["audience"])["dialects"] == ["native"]
    except (FileNotFoundError, KeyError):
        only_native = False
    return ids if only_native else native


EXPLAINER_BODIES = ("arch-mechanism-demo", "arch-analogy-world", "arch-before-after", "arch-data-reveal")  # body structures, not per-shot archetypes (arch-router)


def _skills_honesty(ep: dict) -> list:
    """skills_used must not claim mechanical cards the draft does not satisfy (verifier-honesty, DIRECTION-AB 6.2)."""
    d = ep.get("direction") if isinstance(ep.get("direction"), dict) else {}
    used = [str(x) for x in d.get("skills_used") or []]
    scenes = [s for s in ep.get("scenes") or [] if isinstance(s, dict)]
    shots = [(s.get("id"), s.get("shot") if isinstance(s.get("shot"), dict) else {}, s) for s in scenes]
    chars = {c.get("id"): c for c in ((ep.get("continuity") or {}).get("characters") or []) if isinstance(c, dict)}
    co = d.get("cold_open") if isinstance(d.get("cold_open"), dict) else {}
    out = []

    def why_not(cid: str) -> str | None:
        if cid == "cont-identity-string":
            if not any(c.get("identity_string") for c in chars.values()):
                return "continuity.characters has no identity_string"
            miss = [sid for sid, sh, s in shots for c in sh.get("continuity_ids") or [] if (chars.get(c) or {}).get("identity_string")
                    and chars[c]["identity_string"] not in _prompt_text(s)]
            return f"the identity string is not repeated verbatim in the prompts of {sorted(set(miss))}" if miss else None
        if cid == "cont-axis-eyelines":
            people = [(sid, sh) for sid, sh, _ in shots if sh.get("continuity_ids")]
            miss = [sid for sid, sh in people if not (sh.get("axis_side") or sh.get("eyeline"))]
            if not people:
                return "no shot carries a character (shot.continuity_ids), so no axis or eyeline was set"
            return f"shots {miss} with characters set neither shot.axis_side nor shot.eyeline" if miss else None
        if cid == "real-light-source":
            miss = [sid for sid, sh, s in shots if (s.get("visual") or {}).get("type") == "clip" and not sh.get("light_source")]
            return f"clip shots {miss} have no shot.light_source" if miss else None
        if cid == "cont-style-bridge":
            segs = d.get("style_segments") or []
            return None if len(segs) >= 2 and co.get("bridge") else "it needs >= 2 style_segments joined by cold_open.bridge"
        if cid.startswith("mode-bridge-") and cid != "mode-bridge-rules":
            return None if co.get("bridge") == cid.removeprefix("mode-bridge-") else f"cold_open.bridge is '{co.get('bridge')}'"
        if cid.startswith("lens-") and cid != "lens-apply":
            return None if d.get("lens") == cid else f"direction.lens is '{d.get('lens')}'"
        if cid.startswith("arch-") and cid not in ("arch-router", "arch-conventions", "arch-ai-safe") + EXPLAINER_BODIES:
            a = cid.removeprefix("arch-")
            used_a = {str(co.get("archetype") or "").removeprefix("arch-")} | {str(sh.get("archetype") or "").removeprefix("arch-") for _, sh, _ in shots}
            return None if a in used_a else "no cold_open.archetype or shot.archetype uses it"
        return None

    for cid in used:
        reason = why_not(cid)
        if reason:
            out.append(("warn", "director_skills_honest", f"skills_used claims {cid} but {reason}; apply it or remove it from skills_used"))
    return out


def director_checks(ep: dict, items: list | None = None) -> list:
    """Director-side checks that run even on a schema-invalid draft (defensive about shapes). Lint equivalents: see LINT_EQUIVALENT."""
    out = []
    scenes = [s for s in ep.get("scenes") or [] if isinstance(s, dict)]
    d = ep.get("direction") if isinstance(ep.get("direction"), dict) else {}
    mode = d.get("mode", "explainer")
    if mode in brain.DRAMA_MODES:
        co = d.get("cold_open") if isinstance(d.get("cold_open"), dict) else {}
        miss = [k for k in COLD_OPEN_REQUIRED if co.get(k) in (None, "", [])]
        if co.get("bridge") == "question-card" and not str(co.get("question") or "").strip():
            miss.append("question")
        if miss:
            out.append(("error", "director_cold_open_required", f"mode {mode}: direction.cold_open is missing {miss} (required: archetype, duration_s, bridge, scene_ids; question for question-card)"))
        if not d.get("skills_used"):
            out.append(("warn", "director_skills_used", "direction.skills_used is empty in a drama mode (cite the cards you applied)"))
    cs = brain.cards()
    clip = video_clip_seconds()
    t = ep.get("topic") if isinstance(ep.get("topic"), dict) else {}
    space = is_space_topic(ep.get("title"), ep.get("topic_area"), t.get("headline"), ep.get("one_idea"))
    hand = bool(ep.get("x-hand_authored"))
    native_ids, vocab = _native_scene_ids(ep), None
    for s in scenes:
        sid = s.get("id", "?")
        vis = s.get("visual") if isinstance(s.get("visual"), dict) else {}
        if isinstance(s.get("narration"), str) and PLACEHOLDER.match(s["narration"]):
            out.append(("error", "director_placeholder_narration", f"{sid}: narration {s['narration']!r} is empty or punctuation only; " + COLD_OPEN_NARRATION_RULE))
        for text in _strings(vis):
            bad = sorted(set(CJK.findall(text)))
            if bad:
                out.append(("error", "director_prompt_cjk", f"{sid}: visual prompt contains CJK characters {''.join(bad)!r}; prompts must be English only (prompt-leakage-sweep)"))
                break
        vt = vis.get("type")
        if vt in HAND_AUTHORED and not (hand or vis.get("x-hand_authored")):
            out.append(("error", "director_visual_type", f"{sid}: visual.type '{vt}' is hand-authored (needs hand data); use steps, compare or number"
                        + (" or orbit" if space else "") + " (free Remotion) or a clip/illustration"))
        if vt == "orbit" and not (hand or vis.get("x-hand_authored")):
            if not space:
                out.append(("error", "director_visual_type", f"{sid}: visual.type 'orbit' is only for space/astronomy topics; use steps, compare or number"))
            else:
                out += _orbit_check(sid, vis)
        sh = s.get("shot") if isinstance(s.get("shot"), dict) else {}
        arch = str(sh.get("archetype") or "").removeprefix("arch-")
        if arch and f"arch-{arch}" not in cs:
            out.append(("warn", "director_shot_archetype", f"{sid}: shot.archetype '{arch}' has no card arch-{arch} (arch-router)"))
        if clip and vt == "clip" and isinstance(sh.get("duration_s"), (int, float)) and sh["duration_s"] > clip:
            out.append(("warn", "director_clip_duration", f"{sid}: shot.duration_s {sh['duration_s']} s exceeds the {clip} s clip the video model makes (config/providers.yaml video.init_args.duration)"))
        if sid in native_ids:
            vocab = vocab if vocab is not None else cinematic_terms()
            txt = _prompt_text(s).lower()
            hits = [w for w in vocab if re.search(r"(?<![a-z0-9])" + re.escape(w) + r"(?![a-z])", txt)]
            hits = [w for w in hits if not any(w != h and w in h for h in hits)]  # 'depth of field' inside 'shallow depth of field' counts once
            if hits:
                out.append(("warn", "director_native_cinematic_words", f"{sid}: native-dialect scene uses cinematic lens words {hits}; rewrite in the audience "
                            "illustration style (flat painted light, soft simple background, clear shapes) instead of camera optics"))
    out += _skills_honesty(ep)
    if items is not None:
        out += source_report(ep, items)
    return out


def _orbit_check(sid: str, vis: dict) -> list:
    """orbit is allowed for space topics in the shapes SCENES.md documents; physical mode (no hand keyframes) for mode orbit."""
    mode, out = vis.get("mode", "orbit"), []
    if mode not in ("orbit", "cannon", "groundtrack"):
        return [("error", "director_orbit_shape", f"{sid}: orbit mode '{mode}' unknown (orbit|cannon|groundtrack)")]
    if mode == "orbit":
        rings = {r.get("id") for r in vis.get("rings") or [] if isinstance(r, dict)}
        bodies = [b for b in vis.get("bodies") or [] if isinstance(b, dict)]
        if not rings or not bodies:
            out.append(("error", "director_orbit_shape", f"{sid}: orbit mode 'orbit' needs rings[] and bodies[] (remotion-app/SCENES.md)"))
        for b in bodies:
            if b.get("ring") not in rings:
                out.append(("error", "director_orbit_shape", f"{sid}: body '{b.get('id')}' names ring '{b.get('ring')}' which is not in rings[]"))
            if b.get("keyframes"):
                out.append(("warn", "director_orbit_shape", f"{sid}: body '{b.get('id')}' has hand keyframes; use physical mode (startAngle) so speeds follow Kepler"))
    if mode == "groundtrack" and not isinstance(vis.get("site"), dict):
        out.append(("error", "director_orbit_shape", f"{sid}: groundtrack needs site {{lon, lat, label}}"))
    return out


def _lint_safe(ep: dict) -> list:
    """lint.run on any draft, best effort: a schema-invalid draft still gets every lint rule that can run (DIRECTION-AB 7.4 #3)."""
    if not isinstance(ep.get("scenes"), list) or not all(isinstance(s, dict) and isinstance(s.get("visual"), dict) and isinstance(s.get("narration"), str)
                                                         for s in ep["scenes"]):
        return [("warn", "lint_unavailable", "lint.run skipped: scenes[] is not a list of {narration, visual} objects (fix the schema errors first)")]
    try:
        return list(lint.run(ep))
    except Exception as e:  # one rule crashing on a malformed field must not hide the schema errors or the other layers
        return [("warn", "lint_unavailable", f"lint.run raised {type(e).__name__}: {str(e)[:120]} (fix the schema errors first)")]


def check(ep: dict, catalog_urls, items: list | None = None) -> list:
    """ALL layers in one list, errors first (DIRECTION-AB 7.4 #3): schema + provenance + lint.run (best effort on invalid
    drafts) + director checks + the envelope mode check. One repair sees everything, so repairs stop oscillating between layers."""
    issues = list(lint.schema_issues(ep, limit=200))
    pre = director_checks(ep, items)
    aud = ep.get("audience")
    mode = ep["direction"].get("mode") if isinstance(ep.get("direction"), dict) else None
    try:
        allowed = brain.style_envelope(aud)["modes"] if aud and mode else None
    except (FileNotFoundError, KeyError):
        allowed = None
    if allowed and mode not in allowed:
        pre.append(("error", "director_mode_allowed", f"mode '{mode}' is not allowed for audience '{aud}' (allowed: {allowed})"))
    try:
        issues += list(lint.provenance(ep, catalog_urls))
    except Exception as e:
        issues.append(("warn", "lint_unavailable", f"lint.provenance raised {type(e).__name__}: {str(e)[:120]}"))
    issues += _lint_safe(ep)
    have = {i[1] for i in issues}  # once lint.py ships the same rule, the director copy steps aside (no double repair items)
    if "dir_mode_allowed" in have:
        pre = [p for p in pre if p[1] != "director_mode_allowed"]
    out = issues + [p for p in pre if LINT_EQUIVALENT.get(p[1]) not in have]
    seen, uniq = set(), []
    for i in out:
        if tuple(i) not in seen:
            seen.add(tuple(i))
            uniq.append(tuple(i))
    return sorted(uniq, key=lambda i: 0 if i[0] == "error" else 1)  # stable: layer order kept inside each severity

def _sentences(text: str) -> list:  # same split as lint._sentences
    return [s for s in re.split(r"(?<=[.!?])\s+", (text or "").strip()) if s]


def sentence_limit(card: dict) -> int:
    return min(int(card.get("sentence_words_max") or 99), int(lint.thr("sentence_words_max", default=18)))


def long_sentences(ep: dict, card: dict) -> list:
    """(scene id, sentence, words, limit) for every narration sentence over the binding limit."""
    lim = sentence_limit(card)
    return [(s.get("id"), t, len(t.split()), lim) for s in ep.get("scenes") or [] if isinstance(s, dict)
            for t in _sentences(s.get("narration", "")) if len(t.split()) > lim]


def repair_prompt(ep: dict, problems: list, long_now: list, fixed: dict, var: dict, items: list | None = None) -> str:
    """User message of a MECHANICAL repair call: problems, the exact offending sentences with counts and limit, the sentences
    fixed in earlier passes (keep them; do not lengthen), a mode instruction when the envelope forced a mode change, and the
    source catalog by id. The episode is sent with source ids instead of URLs."""
    lim = sentence_limit(var["card"])
    hook_max = lint.thr("hook_length_max", default=15)
    ids = source_ids(items or [])
    lines = ["Fix the problems found in this episode.json.", "PROBLEMS:"] + [f"- [{r}] {m}" for _, r, m in problems]
    if long_now:
        lines += [f"SENTENCES OVER THE LIMIT (rewrite ONLY these, each to <= {lim} words; split into two sentences or cut words; keep the meaning and the scene):"]
        lines += [f"- {sid} ({n} words, limit {lm}): \"{t}\"" for sid, t, n, lm in long_now]
    if fixed:
        lines += ["ALREADY FIXED IN AN EARLIER PASS (keep these sentences exactly; never lengthen them):"]
        lines += [f"- {sid} ({len(t.split())} words): \"{t}\"" for sid, ts in fixed.items() for t in ts]
    if long_now or fixed:
        lines.append(f"Any sentence you write or touch must be <= {lim} words; the hook scene stays <= {hook_max} words in total. Leave all other narration unchanged.")
    if var.get("mode_changed_from"):
        lines.append(f"MODE CHANGE: set direction.mode to '{var['mode']}' (the draft's '{var['mode_changed_from']}' is not allowed for audience '{var['audience']}'); "
                     + ("remove direction.cold_open and keep at most the native style segment." if var["mode"] not in brain.DRAMA_MODES else "fill the REQUIRED cold-open fields."))
    if ids:
        lines += ["SOURCES (cite by id only; never type a URL):", sources_block(items, ids)]
    lines += [REPAIR_RULES, "EPISODE:", json.dumps(to_ids(ep, ids), ensure_ascii=False)]
    return "\n".join(lines)


SEMANTIC_RULES = """HOW TO FIX THE VERIFIER'S FINDINGS (content, not wording):
- analogy_misleads / one_analogy: choose ONE analogy whose EVERY mapped pair predicts the real behaviour (for each pair ask: if the analogy is true, what happens? does the real system do that?). If no such analogy exists, drop the analogy and explain the mechanism literally, with the real parts in order. Rewrite narration, analogy.mapping, analogy.limitation, mechanism, concepts and prompts consistently, and add one SPOKEN sentence saying where the analogy stops.
- claim_unsupported: reword to exactly what the cited source says, cite a better SOURCE ID, or drop the claim and its sentence; never add details the evidence does not state.
- limitation_in_script: add the spoken limitation sentence.
- realism findings (real-*): change the shot so a real camera could record it (named light source, one camera behaviour, consistent screen direction and identity).
- Keep every other field, every scene id and every required key; keep sentences within the audience card's limits. Return the FULL corrected JSON only."""


def semantic_repair_prompt(ep: dict, findings: list, var: dict, items: list | None = None) -> str:
    """User message of a SEMANTIC repair: the verifier's exact findings verbatim (e.g. the analogy_misleads text) + SEMANTIC_RULES."""
    ids = source_ids(items or [])
    lines = ["The independent verifier rejected this episode.json. Its findings, verbatim:"] + [f"- [{r}] {m}" for _, r, m in findings]
    if ep.get("analogy"):
        lines.append("CURRENT ANALOGY (test every mapping pair against the mechanism): " + json.dumps(ep.get("analogy"), ensure_ascii=False))
    if ids:
        lines += ["SOURCES (cite by id only; never type a URL):", sources_block(items, ids)]
    lines += [SEMANTIC_RULES, "EPISODE:", json.dumps(to_ids(ep, ids), ensure_ascii=False)]
    return "\n".join(lines)


def _save_draft(ep_id: str, ep: dict, var: dict, topic: dict) -> None:
    ep = {**ep, "id": ep_id, "audience": var["audience"], "status": "scripted",
          "topic": {**{k: topic[k] for k in ("headline", "angle", "why_now")}, "source_urls": topic["source_urls"]}}
    ep.pop("music", None)  # music comes from the audience card's music_mood (generated); see run.py stage_props
    ep.pop("profile", None)  # look comes from the card unless a human sets an override
    if not isinstance(ep.get("scenes"), list) or not ep["scenes"]:  # a draft without scenes would crash lint for every episode (DIRECTION-AB L1)
        bad = DATA / "out" / ep_id
        bad.mkdir(parents=True, exist_ok=True)
        (bad / "draft_invalid.json").write_text(json.dumps(ep, indent=1, ensure_ascii=False))
        print(f"draft has no scenes: kept in out/{ep_id}/draft_invalid.json, not in episodes/")
        return
    if not ep.get("identity"):  # information decides the look: every new audience episode gets its own identity (identity.py), never the shared profile look
        try:
            import identity as _identity
            ep["identity"] = _identity.pick({**ep, "id": ep_id})
            ep.setdefault("style", {})["illustration_style"] = ep["identity"]["illustration_style"]
            print(f"identity: {ep['identity']['archetype']} palette {ep['identity']['variant']['palette']} ({ep['identity']['rationale']})")
        except (SystemExit, Exception) as e:  # noqa: BLE001 - a draft must still be saved; the owner can run `run.py identity pick`
            print(f"identity: not set ({e}); run `python run.py identity pick {ep_id}`")
    out = DATA / "episodes" / ep_id
    out.mkdir(parents=True, exist_ok=True)
    registry.write(out, ep)


def _enforce_mode(ep: dict, var: dict) -> dict:
    """A repair may never keep a mode the envelope forbids (unless the owner forced it)."""
    d = ep.get("direction")
    if isinstance(d, dict) and not var.get("mode_forced_outside_envelope"):
        if d.get("mode") not in brain.style_envelope(var["audience"])["modes"]:
            d["mode"] = var["mode"]
            if var["mode"] not in brain.DRAMA_MODES:
                d.pop("cold_open", None)
    return ep


def _visual_required(vtype) -> list:
    vis = _schema()["properties"]["scenes"]["items"]["properties"]["visual"]
    out = list(vis.get("required") or [])
    for rule in vis.get("allOf") or []:
        if (((rule.get("if") or {}).get("properties") or {}).get("type") or {}).get("const") == vtype:
            out += (rule.get("then") or {}).get("required") or []
    return out


def restore_required(prev: dict, new: dict) -> tuple:
    """Merge-check after a repair (DIRECTION-AB 6.4 #6): a required key that the previous draft had and the repair dropped is
    restored from the previous draft (top level, scenes by id incl. the visual's type-conditional keys, cold-open fields);
    new list items that lack a required key and match nothing in the previous draft are removed. Returns (episode, notes)."""
    schema, notes = _schema(), []
    props = schema["properties"]
    if not isinstance(new, dict):
        return prev, ["repair returned no object; kept the previous draft"]
    for k in schema.get("required") or []:
        if k not in new and k in prev:
            new[k] = copy.deepcopy(prev[k])
            notes.append(f"restored top-level '{k}'")
    old_sc = {s.get("id"): s for s in prev.get("scenes") or [] if isinstance(s, dict)}
    sreq = (props["scenes"].get("items") or {}).get("required") or []
    for s in new.get("scenes") or []:
        if not isinstance(s, dict) or s.get("id") not in old_sc:
            continue
        o = old_sc[s["id"]]
        for k in sreq:
            if k not in s and k in o:
                s[k] = copy.deepcopy(o[k])
                notes.append(f"{s['id']}: restored '{k}'")
        v, ov = s.get("visual"), o.get("visual")
        if isinstance(v, dict) and isinstance(ov, dict) and v.get("type") == ov.get("type"):
            for k in _visual_required(v.get("type")):
                if k not in v and k in ov:
                    v[k] = copy.deepcopy(ov[k])
                    notes.append(f"{s['id']}: restored visual.{k}")
    for key in ("claims", "sources", "mechanism", "concepts", "loops"):
        node = props.get(key) or {}
        req = (node.get("items") or {}).get("required") or []
        if not req or not isinstance(new.get(key), list):
            continue
        olds = [x for x in prev.get(key) or [] if isinstance(x, dict)]
        keep = []
        for it in new[key]:
            if not isinstance(it, dict):
                continue
            miss = [k for k in req if k not in it]
            if miss:
                match = next((o for o in olds if any(o.get(k) == it.get(k) for k in req if k in it)), None)
                if match and all(k in match for k in miss):
                    for k in miss:
                        it[k] = copy.deepcopy(match[k])
                    notes.append(f"{key}: restored {miss} on an item")
                else:
                    notes.append(f"{key}: dropped a new item missing {miss}")
                    continue
            keep.append(it)
        new[key] = keep
    pd, nd = prev.get("direction"), new.get("direction")
    if isinstance(pd, dict) and isinstance(nd, dict) and nd.get("mode") in brain.DRAMA_MODES:
        pco, nco = pd.get("cold_open") or {}, nd.get("cold_open")
        if isinstance(nco, dict):
            for k in COLD_OPEN_REQUIRED:
                if k not in nco and k in pco:
                    nco[k] = copy.deepcopy(pco[k])
                    notes.append(f"direction.cold_open: restored '{k}'")
        elif pco:
            nd["cold_open"] = copy.deepcopy(pco)
            notes.append("restored direction.cold_open")
    return new, notes


def _schema_error_paths(ep: dict) -> set:
    """Schema-invalid locations as id-based keys: ('scene', <scene id>, 'intent') for scenes/<i>/intent, else ('top', 'packaging', ...)."""
    out = set()
    sc = ep.get("scenes") if isinstance(ep.get("scenes"), list) else []
    for _, _, msg in lint.schema_issues(ep, limit=500):
        path = msg.split(": ", 1)[0]
        parts = [p for p in path.split("/") if p and p != "(root)"]
        if len(parts) >= 3 and parts[0] == "scenes" and parts[1].isdigit() and int(parts[1]) < len(sc) and isinstance(sc[int(parts[1])], dict):
            out.add(("scene", sc[int(parts[1])].get("id"), *parts[2:]))
        elif parts:
            out.add(("top", *parts))
    return out


def _get(obj, keys):
    for k in keys:
        if isinstance(obj, list) and str(k).isdigit() and int(k) < len(obj):
            obj = obj[int(k)]
        elif isinstance(obj, dict) and k in obj:
            obj = obj[k]
        else:
            return _MISSING
    return obj


def _set(obj, keys, value) -> bool:
    for k in keys[:-1]:
        obj = _get(obj, [k])
        if obj is _MISSING:
            return False
    last = keys[-1]
    if isinstance(obj, dict):
        if value is _MISSING:
            obj.pop(last, None)
        else:
            obj[last] = copy.deepcopy(value)
        return True
    if isinstance(obj, list) and str(last).isdigit() and int(last) < len(obj) and value is not _MISSING:
        obj[int(last)] = copy.deepcopy(value)
        return True
    return False


_MISSING = object()


def restore_invalid(prev: dict, new: dict) -> tuple:
    """Value-level merge-check (DIRECTION-AB 7.4 #4): re-run the schema on both drafts; a field that was VALID in the previous
    draft and is INVALID after the repair gets its previous value back (per field, per scene id; e.g. an `intent` the repair
    lengthened past 120 chars). Placeholder narration ('', '...') is never restored over: the check flags it instead."""
    before, after, notes = _schema_error_paths(prev), _schema_error_paths(new), []
    old_sc = {s.get("id"): s for s in prev.get("scenes") or [] if isinstance(s, dict)}
    new_sc = {s.get("id"): s for s in new.get("scenes") or [] if isinstance(s, dict)}
    for key in sorted(after - before, key=str):
        if key[0] == "scene":
            sid, field = key[1], list(key[2:])
            if sid not in old_sc or sid not in new_sc:
                continue
            old = _get(old_sc[sid], field)
            if old is _MISSING or (field[-1] == "narration" and PLACEHOLDER.match(str(old))):
                continue
            if _set(new_sc[sid], field, old):
                notes.append(f"{sid}: restored previous valid {'.'.join(field)}")
        else:
            field = list(key[1:])
            old = _get(prev, field)
            if old is not _MISSING and _set(new, field, old):
                notes.append(f"restored previous valid {'/'.join(field)}")
    return new, notes


# ---------------------------------------------------------------- patch-style repairs (DIRECTION-AB 7.4 #6)

GLOBAL_RULES = {"analogy_misleads", "one_analogy", "limitation_in_script", "claim_unsupported", "claim_unverifiable", "claims_urls_in_catalog",
                "claims_have_sources", "mechanism_present", "mechanism_order", "mechanism_steps", "mechanism_sourced", "mechanism_mapped",
                "audience_length", "total_duration_range", "words_per_second_max", "packaging_present", "loops_declared", "news_hook",
                "original_contribution", "director_mode_allowed", "dir_mode_allowed", "template_mix", "director_source_authority"}


def repair_scope(problems: list, ep: dict):
    """Scene ids a repair may touch, or None for a whole-episode rewrite. A problem is scene-local when its schema path is
    scenes/<i>/..., its message starts with a scene id ('s3: ...') or names cold-open scenes ('cold open ['s1', 's2']');
    direction/continuity problems are patchable too (those objects are returned whole). Analogy, claims, mechanism,
    packaging and length problems are global."""
    ids = [s.get("id") for s in ep.get("scenes") or [] if isinstance(s, dict)]
    out = []
    for _, rid, msg in problems:
        if rid in GLOBAL_RULES:
            return None
        msg = str(msg)
        m = re.match(r"scenes/(\d+)/", msg)
        if m and int(m.group(1)) < len(ids):
            out.append(ids[int(m.group(1))])
            continue
        m = re.match(r"^\s*([A-Za-z]?\w*?\d+\w*)\s*[:.]", msg)
        if m and m.group(1) in ids:
            out.append(m.group(1))
            continue
        m = re.search(r"cold open \[([^\]]*)\]", msg)
        if m:
            out += [x for x in re.findall(r"'([^']+)'", m.group(1)) if x in ids]
            continue
        if re.match(r"(direction|continuity)\b", msg) or rid.startswith(("dir_", "director_")):
            out += [x for x in re.findall(r"'(s\w*\d+\w*)'", msg) if x in ids]
            continue
        return None
    return [i for n, i in enumerate(ids) if i in out and i not in ids[:n]]


def patch_prompt(ep: dict, problems: list, scope: list, long_now: list, fixed: dict, var: dict) -> str:
    """User message of a PATCH repair: only the failing scenes go out and only they (plus direction/continuity) come back."""
    lim = sentence_limit(var["card"])
    target = [s for s in ep.get("scenes") or [] if isinstance(s, dict) and s.get("id") in scope]
    ctx = {"title": ep.get("title"), "audience": ep.get("audience"), "format_id": ep.get("format_id"),
           "scene_order": [s.get("id") for s in ep.get("scenes") or [] if isinstance(s, dict)],
           "illustration_style": (ep.get("style") or {}).get("illustration_style"), "analogy": ep.get("analogy"),
           "direction": ep.get("direction"), "continuity": ep.get("continuity")}
    lines = ["PATCH REPAIR: fix ONLY the problems below by changing ONLY the listed scenes (and direction/continuity if a problem is about them).",
             "PROBLEMS:"] + [f"- [{r}] {m}" for _, r, m in problems]
    local_long = [x for x in long_now if x[0] in scope]
    if local_long:
        lines += [f"SENTENCES OVER THE LIMIT (rewrite ONLY these, each to <= {lim} words):"] + [f"- {sid} ({n} words, limit {lm}): \"{t}\"" for sid, t, n, lm in local_long]
    if fixed:
        lines += ["ALREADY FIXED (keep exactly):"] + [f"- {sid}: \"{t}\"" for sid, ts in fixed.items() if sid in scope for t in ts]
    lines += [COLD_OPEN_NARRATION_RULE, "Keep every required key of each scene (id, beat, narration, visual and its type's required fields); keep `intent` within 10-120 chars.",
              f"Return JSON: {{\"scenes\": [complete objects for exactly these ids: {scope}], \"direction\"?: <full object, only if you changed it>, "
              "\"continuity\"?: <full object, only if you changed it>}. Do not return other scenes.",
              "CONTEXT (read only): " + json.dumps(ctx, ensure_ascii=False),
              "SCENES TO FIX: " + json.dumps(target, ensure_ascii=False)]
    return "\n".join(lines)


def merge_patch(ep: dict, patch: dict, scope: list) -> tuple:
    """Merge a patch answer: scenes replaced by id (only ids in scope; order kept), direction/continuity replaced when given."""
    ep, notes = copy.deepcopy(ep), []
    if not isinstance(patch, dict):
        return ep, ["patch answer was not an object; kept the draft"]
    by_id = {s.get("id"): s for s in patch.get("scenes") or [] if isinstance(s, dict) and s.get("id") in scope}
    ep["scenes"] = [by_id.get(s.get("id"), s) if isinstance(s, dict) else s for s in ep.get("scenes") or []]
    notes += [f"patched {sorted(by_id)}"] + ([f"patch ignored out-of-scope scenes {sorted(set(s.get('id') for s in patch.get('scenes') or [] if isinstance(s, dict)) - set(scope))}"]
                                             if any(isinstance(s, dict) and s.get("id") not in scope for s in patch.get("scenes") or []) else [])
    for k in ("direction", "continuity"):
        if isinstance(patch.get(k), dict):
            ep[k] = patch[k]
            notes.append(f"patched {k}")
    return ep, notes


def _repair_call(budget: Budget, llm_w, label: str, prompt: str, system: str, prev: dict, ep_id: str, var: dict, items: list,
                 scope: list | None = None) -> dict:
    """One repair call. Whole-episode (scope None): ids -> URLs. Patch (scope = scene ids): merge by id. Then the key-level
    (restore_required) and value-level (restore_invalid) merge-checks against the previous draft, and envelope mode enforcement."""
    if scope is None:
        new = budget.call(llm_w, label, prompt, system=system, expect_out=max(2000, token_count(json.dumps(prev, ensure_ascii=False))))
        new, unknown = from_ids(new if isinstance(new, dict) else {}, source_ids(items))
        if unknown:
            print(f"{label}: unknown source ids {sorted(set(unknown))}")
        notes = []
    else:
        out_est = token_count(json.dumps([s for s in prev.get("scenes") or [] if isinstance(s, dict) and s.get("id") in scope], ensure_ascii=False)) + 600
        patch = budget.call(llm_w, f"{label} (patch {scope})", prompt, system=system, expect_out=out_est)
        new, notes = merge_patch(prev, patch, scope)
    new, n2 = restore_required(prev, new)
    new, n3 = restore_invalid(prev, new)
    for n in notes + n2 + n3:
        print(f"{label}: {n}")
    new["id"], new["audience"] = ep_id, var["audience"]
    return _enforce_mode(new, var)


# ---------------------------------------------------------------- run state (resume with the same budget)


def state_file(ep_id: str):
    return DATA / "out" / ep_id / "director_state.json"


def save_state(ep_id: str, budget: "Budget", mech: int, sem: int, status: str, error: str | None = None, max_mech: int | None = None,
               max_sem: int | None = None) -> None:
    f = state_file(ep_id)
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps({"id": ep_id, "status": status, "error": error, "at": datetime.datetime.now().isoformat(timespec="seconds"),
                             "tokens_spent": budget.spent, "cap": budget.cap, "calls": budget.calls,
                             "mechanical_used": mech, "semantic_used": sem, "max_mechanical": max_mech, "max_semantic": max_sem}, indent=1))


def load_state(ep_id: str) -> dict:
    f = state_file(ep_id)
    try:
        return json.loads(f.read_text()) if f.exists() else {}
    except json.JSONDecodeError:
        return {}


VERIFY_TOKENS = 5 * 4000  # rough per verify.run (5 verifier calls); counted against the run cap, not metered


def _strip_unmet_skills(ep: dict, issues: list) -> dict:
    """Last resort for card-claim honesty: ids still reported unmet after the repairs are removed from skills_used."""
    unmet = {m.group(1) for _, rid, msg in issues if rid in ("director_skills_honest", "dir_skills_claimed_unmet")
             for m in [re.search(r"claims (\S+) but", str(msg))] if m}
    d = ep.get("direction")
    if unmet and isinstance(d, dict) and isinstance(d.get("skills_used"), list):
        d["skills_used"] = [x for x in d["skills_used"] if x not in unmet]
        print(f"skills_used: removed unmet card ids {sorted(unmet)} (not applied in the draft)")
    return ep


def refine(llm_w, ep: dict, ep_id: str, var: dict, topic: dict, items: list, max_repairs: int = MAX_MECH_REPAIRS,
           max_semantic: int = MAX_SEMANTIC_REPAIRS, budget: Budget | None = None, mech_used: int = 0, sem_used: int = 0) -> tuple:
    """checks (all layers) -> mechanical repairs (own budget; patch-style when scene-local) -> verify.run -> semantic repairs
    (own budget; only while schema/lint errors are zero). verify.run always runs at least once on the final draft, even when the
    mechanical budget is used up, so the gate's findings exist (DIRECTION-AB 7.4 #2). The draft and the run state
    (out/<id>/director_state.json: budgets used, tokens so far) are saved every pass; a crash saves both and exits with the
    `--repair` command, which resumes with the same token budget."""
    budget = budget or Budget()
    catalog_urls = {i["url"] for i in items}
    issues, errors = [], []
    fixed, prev_long_ids = {}, set()
    mech, sem = mech_used, sem_used
    verified = None  # fingerprint of the draft verify last ran on
    try:
        while True:
            issues = check(ep, catalog_urls, items)
            errors = [i for i in issues if i[0] == "error"]
            _save_draft(ep_id, ep, var, topic)  # a crash or rate limit below must not lose a generated draft
            save_state(ep_id, budget, mech, sem, "running", max_mech=max_repairs, max_sem=max_semantic)
            print(f"check (mechanical {mech}/{max_repairs}, semantic {sem}/{max_semantic}): {len(errors)} errors, {len(issues) - len(errors)} warnings")
            fixable = errors + [i for i in issues if i[1] in FIX_WARNINGS and i not in errors]
            if errors and mech < max_repairs:  # mechanical: schema / lint / director checks, all layers at once
                long_now = long_sentences(ep, var["card"])
                lim = sentence_limit(var["card"])
                for s in ep.get("scenes") or []:  # scenes that had a long sentence last pass and are now within the limit: lock them
                    if isinstance(s, dict) and s.get("id") in prev_long_ids:
                        ok = [t for t in _sentences(s.get("narration", "")) if len(t.split()) <= lim]
                        if ok:
                            fixed[s["id"]] = ok
                prev_long_ids = {sid for sid, *_ in long_now}
                mech += 1
                scope = repair_scope(fixable, ep)
                prompt = patch_prompt(ep, fixable, scope, long_now, fixed, var) if scope else repair_prompt(ep, fixable, long_now, fixed, var, items)
                ep = _repair_call(budget, llm_w, f"mechanical repair {mech}", prompt, repair_system_prompt(var, fixable), ep, ep_id, var, items, scope or None)
                continue
            fp = json.dumps(ep, sort_keys=True, ensure_ascii=False)
            if fp == verified:
                break
            try:  # the gate: runs on every new draft once lint is clean, and once on the final draft when mechanical repairs ran out
                budget.charge("verify (estimate)", VERIFY_TOKENS)
                rep = verify.run(ep, items, quiet=True)
                verified = fp
            except BudgetExceeded:
                raise
            except Exception as e:  # verifier model unavailable or the draft is too broken for it: keep the draft, unapprovable
                print(f"verify unavailable ({type(e).__name__}: {e}); run `python run.py verify {ep_id}` later")
                break
            vis = [tuple(i) for i in rep["issues"]]
            issues += [i for i in vis if i[0] == "warn"]
            v_err = [i for i in vis if i[0] == "error"]
            print(f"verify: {'PASS' if rep['passed'] else 'FAIL'} (comprehension {rep['comprehension']['grade'].get('score')}/5)"
                  + (f"; {len(errors)} schema/lint errors remain (mechanical budget used up)" if errors else ""))
            issues = errors + v_err + [i for i in issues if i[0] != "error"]
            if errors or not v_err or sem >= max_semantic:  # semantic repairs only on a mechanically clean draft
                break
            sem += 1
            scope = repair_scope(v_err, ep)
            prompt = patch_prompt(ep, v_err, scope, [], fixed, var) if scope else semantic_repair_prompt(ep, v_err, var, items)
            ep = _repair_call(budget, llm_w, f"semantic repair {sem}", prompt, repair_system_prompt(var, v_err), ep, ep_id, var, items, scope or None)
    except BudgetExceeded as e:
        print(f"budget: {e}")
    except Exception as e:  # network timeout after the adapter's retries, provider outage ...: save, then tell the owner how to resume
        _save_draft(ep_id, ep, var, topic)
        save_state(ep_id, budget, mech, sem, "crashed", f"{type(e).__name__}: {str(e)[:300]}", max_repairs, max_semantic)
        raise SystemExit(f"director stopped: {type(e).__name__}: {str(e)[:200]}. Draft and state saved (out/{ep_id}/director_state.json, "
                         f"~{budget.spent} tokens so far). Resume with: python run.py director --repair {ep_id}")
    ep = _strip_unmet_skills(ep, issues)
    save_state(ep_id, budget, mech, sem, "finished", max_mech=max_repairs, max_sem=max_semantic)
    print(f"LLM estimate for this run: ~{budget.spent} tokens over {len(budget.calls)} calls (cap {budget.cap})")
    _progress(activity="finished", stage="done", episode=ep_id, tokens_so_far=budget.spent)
    return ep, issues


# ---------------------------------------------------------------- analogy pre-check (DIRECTION-AB 7.4 #12)

PRECHECK_EVIDENCE_CHARS = 2500


def _best_window(text: str, topic_text: str, size: int = PRECHECK_EVIDENCE_CHARS) -> str:
    """The `size`-char window of a page with the most topic words (menus and teasers at the top of a page are skipped)."""
    if len(text) <= size:
        return text
    want = _words(topic_text)
    best, best_n = text[:size], -1
    for start in range(0, len(text) - size + 1, 400):
        n = len(want & _words(text[start:start + size]))
        if n > best_n:
            best, best_n = text[start:start + size], n
    return best


def gather_evidence(items: list, topic: dict, k: int = 3) -> list:
    """(source id, text) for up to k topic sources: --source pages first, then primary/reference, read with news_rss.read_article."""
    from adapters.news_rss import read_article
    ids = {u: s for s, u in source_ids(items).items()}
    cand = [i for i in items if i["url"] in set(topic.get("source_urls") or [])]
    cand.sort(key=lambda i: (not i.get("forced"), -authority(i)[1]))
    out = []
    for i in cand:
        if len(out) >= k:
            break
        text = read_article(i["url"], limit=20000) or ""
        if text:
            out.append((ids.get(i["url"]), _best_window(text, topic.get("headline", ""))))
    return out


def analogy_precheck(llm, topic: dict, items: list, var: dict, budget: "Budget | None" = None) -> dict:
    """ONE short call before the writer: from the evidence, state the real mechanism in order, propose two analogies from the
    allowed domains and test EVERY mapped pair ('does the analogy predict the real behaviour of this part?'). The code keeps the
    first candidate whose pairs all pass; if none passes, the writer is told to explain literally. Skippable: --no-analogy-check."""
    evidence = gather_evidence(items, topic)
    if not evidence:
        print("analogy pre-check: no readable evidence text among the topic sources; skipped")
        return {}
    ev = "\n".join(f"[{sid}] {text}" for sid, text in evidence)
    prompt = f"""You check an explainer's analogy BEFORE the script is written. Use ONLY the evidence below.
TOPIC: {topic.get('headline')}
AUDIENCE: {var['audience']}; allowed analogy domains: {var.get('domains') or var['card'].get('analogy_domains')}
EVIDENCE:
{ev}
Tasks: (1) the real mechanism as 3-5 ordered steps, each with the source id and a short verbatim quote from the evidence;
(2) two candidate analogies; for EVERY mapped pair state what the analogy predicts, what the evidence says really happens, and ok=true only if they match;
(3) one sentence where each analogy stops working.
Return JSON: {{"mechanism":[{{"step":str,"source":"S1","quote":str}}],"candidates":[{{"domain":str,"picture":str,"mapping":[{{"real":str,"analogy":str,"analogy_predicts":str,"real_behaviour":str,"ok":bool}}],"limitation":str}}]}}"""
    try:
        res = (budget or Budget()).call(llm, "analogy pre-check", prompt, expect_out=1500) or {}
    except BudgetExceeded:
        raise
    except Exception as e:
        print(f"analogy pre-check failed ({type(e).__name__}: {e}); the writer chooses the analogy unchecked")
        return {}
    cands = [c for c in res.get("candidates") or [] if isinstance(c, dict) and isinstance(c.get("mapping"), list) and c["mapping"]]
    good = [c for c in cands if len(c["mapping"]) >= 2 and all(isinstance(p, dict) and p.get("ok") is True for p in c["mapping"])]
    out = {"mechanism": [m for m in res.get("mechanism") or [] if isinstance(m, dict)], "analogy": good[0] if good else None,
           "rejected": [c for c in cands if c not in good]}
    print(f"analogy pre-check: {'passed: ' + str(out['analogy'].get('domain')) if out['analogy'] else 'no candidate passed: explain literally'}"
          f"; rejected {len(out['rejected'])}")
    return out


def precheck_block(pc: dict) -> str:
    """Writer-prompt block from the pre-check: the evidence-based mechanism, the vetted analogy (or 'explain literally'), rejects."""
    if not pc:
        return ""
    lines = ["VETTED BY THE ANALOGY PRE-CHECK (binding):"]
    if pc.get("mechanism"):
        lines.append("Real mechanism, in this order (narrate it; cite these ids): " + " | ".join(
            f"{n + 1}. {m.get('step')} [{m.get('source')}: \"{str(m.get('quote', ''))[:160]}\"]" for n, m in enumerate(pc["mechanism"])))
    a = pc.get("analogy")
    if a:
        lines.append(f"USE THIS ANALOGY ({a.get('domain')}: {a.get('picture')}); every pair was checked against the evidence; keep exactly this mapping: "
                     + "; ".join(f"{p.get('real')} = {p.get('analogy')}" for p in a["mapping"]) + f". Where it stops: {a.get('limitation')}")
    else:
        lines.append("NO analogy passed the check: explain the mechanism literally with the real parts in order (one metaphor for one beat at most).")
    for c in pc.get("rejected") or []:
        bad = [p for p in c.get("mapping") or [] if isinstance(p, dict) and p.get("ok") is not True]
        lines.append(f"REJECTED ({c.get('domain')}: {c.get('picture')}): " + "; ".join(
            f"'{p.get('analogy')}' predicts '{p.get('analogy_predicts')}' but really '{p.get('real_behaviour')}'" for p in bad) + " (do not use)")
    return "\n".join(lines)

def run_from_brief(ep_id: str) -> None:
    """--from-brief <episode-id>: load brief/research/outline, skip topic-pick and mode-choice LLM calls.
    Format/mode come from direction/format_packs.yaml for brief.genre; sources come from research.json.
    Prints per-stage wall time."""
    import time
    import brief as _brief_mod
    import research as _research_mod
    import outline as _outline_mod
    import tokens as _tokens

    t0 = time.time()

    # 1. Load the three layer outputs
    try:
        brief_json = _brief_mod.load(ep_id)
    except FileNotFoundError:
        raise SystemExit(f"brief.json missing for {ep_id}: run `python run.py brief {ep_id} --text \"...\"` first")
    try:
        research_json = _research_mod.load(ep_id)
    except FileNotFoundError:
        raise SystemExit(f"research.json missing for {ep_id}: run `python run.py research {ep_id}` first")
    try:
        outline_json = _outline_mod.load(ep_id)
    except FileNotFoundError:
        raise SystemExit(f"outline.json missing for {ep_id}: run `python run.py outline {ep_id}` first")

    print(f"[{time.strftime('%H:%M:%S')}] from-brief: loaded brief/research/outline ({time.time()-t0:.1f}s)")

    # 2. Build source catalog from research.json (deduplicated across all questions)
    seen_urls: set = set()
    items: list = []
    for ev in research_json.get("evidence") or []:
        url = ev.get("url", "")
        if not url or url in seen_urls:
            continue
        seen_urls.add(url)
        text = _research_mod._read_cached(ep_id, url) or " ".join(f.get("text", "") for f in ev.get("facts") or [])
        items.append({
            "url": url,
            "title": (ev.get("facts") or [{}])[0].get("text", "")[:90] or _domain(url),
            "source": ev.get("source") or _domain(url),
            "text": text,
            "summary": text[:300],
            "published": ev.get("published") or "",
        })
    print(f"[{time.strftime('%H:%M:%S')}] from-brief: {len(items)} sources from research.json")

    # 3. Audience + card
    aud = brief_json.get("audience", "curious_adult")
    cs = cards()
    if aud not in cs:
        raise SystemExit(f"audience '{aud}' not found; options: {', '.join(cs)}")
    card = cs[aud]

    # 4. Format/mode from format_packs for this genre
    genre = brief_json.get("genre", "explainer")
    pack = _tokens.pack(genre)
    format_ids = (pack or {}).get("format_ids") or list(formats())[:3]
    craft_mode = (pack or {}).get("craft_mode") or "explainer"
    domains = card.get("analogy_domains", [])[:2]

    var: dict = {
        "audience": aud,
        "card": card,
        "formats": format_ids[:3],
        "domains": domains,
        "mode": craft_mode,
        "mode_reason": f"from-brief ({genre} genre, format_packs.yaml)",
        "space": False,
    }

    # 5. Topic from brief (no news fetch / topic-pick LLM call)
    all_urls = list(seen_urls)[:20]
    topic: dict = {
        "headline": brief_json.get("topic", ep_id),
        "angle": "",
        "why_now": "",
        "audience_misconception": "",
        "source_urls": all_urls,
    }

    # 6. Write sources.json before long LLM call so --repair works
    ep_dir = DATA / "episodes" / ep_id
    ep_dir.mkdir(parents=True, exist_ok=True)
    write_sources(ep_dir, items)

    # 7. Build brief questions list (verbatim texts) + outline contract
    brief_questions = [q["text"] for q in brief_json.get("questions") or []]
    contract = _outline_contract_block(outline_json, research_json, items)

    eps = existing()
    budget = Budget()
    llm_w = load_provider("llm_write")

    # 8. Write episode (outline-driven; no example episode to keep prompt small)
    t_write = time.time()
    try:
        ep = write_episode(llm_w, topic, items, var, ep_id, eps, budget, brief_questions, contract)
    except BudgetExceeded as e:
        save_state(ep_id, budget, 0, 0, "crashed", str(e), MAX_MECH_REPAIRS, MAX_SEMANTIC_REPAIRS)
        raise SystemExit(f"budget: {e}")
    print(f"[{time.strftime('%H:%M:%S')}] write: {time.time()-t_write:.0f}s")

    ep["id"] = ep_id
    ep["audience"] = aud
    ep["genre"] = genre
    if "schema_version" not in ep:
        ep["schema_version"] = 1

    # 9. Assert brief integrity — fail loudly if LLM rewrote a question or dropped a date
    ep.setdefault("waivers", [])  # explainer genre (Slice 1): data-led scenes only, so the clip mandate is waived (owner decision)
    for _rule in ("min_clip_scenes",):
        if not any(w.get("rule") == _rule for w in ep["waivers"]):
            ep["waivers"].append({"rule": _rule, "reason": "explainer genre uses data scenes, no generated clips (owner decision, Slice 1)"})
    try:
        _brief_mod.assert_intact(brief_json, ep)
    except AssertionError as e:
        print(f"[{time.strftime('%H:%M:%S')}] assert_intact FAILED: {e}")
        print("Re-applying question wording from brief.json into episode.brief[]...")
        ep["brief"] = [{"question": q["text"], "answered_in": ""} for q in brief_json.get("questions") or []]
        _brief_mod.assert_intact(brief_json, ep)  # fail loudly if still broken after wording fix
    print(f"[{time.strftime('%H:%M:%S')}] assert_intact: ok")

    # 10. Fill answered_in from outline beats
    ep = _fill_answered_in(ep, brief_json, outline_json)

    # 11. Check/repair loop (existing refine: schema + lint + director + verify)
    t_refine = time.time()
    ep, issues = refine(llm_w, ep, ep_id, var, topic, items, budget=budget)
    print(f"[{time.strftime('%H:%M:%S')}] refine: {time.time()-t_refine:.0f}s")

    finish(ep, ep_id, var, topic, items, issues)
    print(f"[{time.strftime('%H:%M:%S')}] from-brief total: {time.time()-t0:.0f}s")


def finish(ep: dict, ep_id: str, var: dict, topic: dict, items: list, issues: list) -> None:
    _save_draft(ep_id, ep, var, topic)
    out = DATA / "episodes" / ep_id
    out.mkdir(parents=True, exist_ok=True)
    cited = {c["url"] for c in ep.get("claims", []) if isinstance(c, dict) and c.get("url")} | set(topic["source_urls"])
    write_sources(out, [i for i in items if i["url"] in cited or i.get("forced")])
    print(f"wrote {out}/episode.json (status scripted, audience {var['audience']})")
    for sev_, rid, msg in issues:
        print(f"  {sev_.upper():5} {rid}: {msg}"[:260])
    if not (out / "episode.json").exists():
        print("QA gate: NOT CLEAR - no valid draft saved")
        return
    ok, why = verify.is_clear(registry.read(out))
    print(f"QA gate: {'CLEAR' if ok else 'NOT CLEAR'} - {why}")
    if not ok:
        print("script is not approvable yet: fix by hand or re-run `python run.py director --repair " + ep_id + "`")
    print(f"next: review script, then `python run.py status {ep_id} approved` before any paid stage")


# ---------------------------------------------------------------- CLI

_VALUE_FLAGS = {"--topic", "--audience", "--format", "--mode", "--candidates", "--choose", "--repair", "--repairs", "--source", "--brief", "--from-brief"}
_BOOL_FLAGS = {"--pick", "--dry", "--force-mode", "--no-analogy-check"}
_REPEATABLE = {"--source", "--brief"}


def check_args(argv: list) -> None:
    """Validate flags BEFORE any network/LLM call: an unrecognised flag (e.g. --help) used to fall through and start a real, paid run."""
    if {"-h", "--help"} & set(argv):
        print(__doc__.splitlines()[2])
        raise SystemExit(0)
    i, seen = 0, set()
    while i < len(argv):
        tok = argv[i]
        if tok in _BOOL_FLAGS:
            i += 1
        elif tok in _VALUE_FLAGS:
            if i + 1 >= len(argv) or argv[i + 1] in _VALUE_FLAGS | _BOOL_FLAGS:
                raise SystemExit(f"{tok} needs a value; see --help")
            if tok in seen and tok not in _REPEATABLE:
                raise SystemExit(f"{tok} given twice; only --source and --brief may repeat")
            seen.add(tok)
            i += 2
        else:
            raise SystemExit(f"unknown argument {tok!r}; see --help")
    if "--force-mode" in argv and not ({"--mode", "--repair"} & set(argv)):
        raise SystemExit("--force-mode needs --mode M (or --repair <id>)")
    for u in [argv[j + 1] for j, t in enumerate(argv) if t == "--source"]:
        if not re.match(r"^https?://[^\s/]+\.[^\s/]+", u):
            raise SystemExit(f"--source needs an http(s) URL, got {u!r}")


def main(argv: list) -> None:
    check_args(argv)
    opt = lambda k: argv[argv.index(k) + 1] if k in argv else None  # noqa: E731
    forced_urls = [argv[j + 1] for j, t in enumerate(argv) if t == "--source"]
    brief_qs = [q.strip() for j, t in enumerate(argv) if t == "--brief" for q in argv[j + 1].split("|") if q.strip()]  # repeatable; "|" also separates
    if opt("--from-brief"):
        return run_from_brief(opt("--from-brief"))
    if opt("--repair"):
        n = int(opt("--repairs") or MAX_MECH_REPAIRS)
        return repair(opt("--repair"), n, force="--force-mode" in argv, max_semantic=int(opt("--repairs") or MAX_SEMANTIC_REPAIRS))
    eps = existing()
    rng = random.Random(opt("--topic") or datetime.date.today().isoformat())
    # audience / mode / envelope are validated BEFORE any network or LLM call (a refused run costs nothing)
    var = variety(eps, rng, opt("--format"), opt("--audience"), opt("--mode"), override="--force-mode" in argv)
    print(f"variety: audience={var['audience']} formats={var['formats']} domains={var['domains']} modes={var['modes']} -> look {var['card']['remotion_profile']}")
    budget = Budget()
    llm, news = load_provider("llm"), load_provider("news")  # llm = fast (topic pick); the writer/repairer is llm_write (stronger)
    topic_text = opt("--topic")
    forced = fetch_forced(forced_urls)
    saved = json.loads(CANDIDATES.read_text()) if CANDIDATES.exists() else None
    if opt("--choose") is not None and saved and not topic_text:  # reuse the list the owner saw (news drifts between runs)
        items, cands = saved["items"], saved["candidates"]
        topic = cands[int(opt("--choose"))]
        print(f"using saved candidate [{opt('--choose')}] from {saved['at']}: {topic['headline']}")
    else:
        items = news.fetch(topic_text)  # with --topic: also a news search ON that topic, so the script is grounded in current coverage
        print(f"news intake: {len(items)} items" + (f" (incl. search for '{topic_text}')" if topic_text else ""))
        if topic_text:
            ranked = rank_sources(items, topic_text)
            if not ranked and not forced:
                raise SystemExit(f"no fetched item shares at least {MIN_RELEVANCE} topic words with '{topic_text}', so there is nothing honest to cite. "
                                 "Rerun with --source URL (repeatable), e.g. a Wikipedia, .gov or .edu page on the topic.")
            topic = {"headline": topic_text, "angle": "", "why_now": "", "audience_misconception": "", "source_urls": [i["url"] for i in ranked]}
            print("topic sources: " + (", ".join(f"{i.get('source')} [{authority(i)[0]}]" for i in ranked) or "none from the news search"))
        else:
            res = pick_topic(llm, items, eps, int(opt("--candidates") or 5), budget)
            cands = res["candidates"]
            CANDIDATES.parent.mkdir(exist_ok=True)
            CANDIDATES.write_text(json.dumps({"at": datetime.datetime.now().isoformat(timespec="seconds"), "items": items, "candidates": cands}, ensure_ascii=False))
            for i, c in enumerate(cands):
                print(f"  {'*' if i == res['chosen'] else ' '} [{i}] {c['headline']}  (explainability {c.get('explainability')}; {len(c['source_urls'])} sources)\n        why now: {c.get('why_now')}")
            topic = cands[res["chosen"]]
            if "--pick" in argv:  # owner chooses from the news list
                if not sys.stdin.isatty():
                    print("candidates saved. Re-run with `--choose N` (or `--topic \"your own topic\"`).")
                    return
                topic = cands[int(input("choose candidate #: "))]
    furls = [i["url"] for i in forced]
    items = forced + [i for i in items if i["url"] not in furls]
    topic = {**topic, "source_urls": furls + [u for u in topic.get("source_urls", []) if u not in furls]}
    if not any(authority(i)[1] >= 2 for i in items if i["url"] in topic["source_urls"]):
        print("WARNING: no primary or reference source among the topic sources (config/source_quality.yaml); consider --source URL (e.g. a .gov or Wikipedia page)")
    var["space"] = is_space_topic(topic.get("headline"), topic.get("angle"))
    if "--dry" in argv:
        print("dry run: stopping before script generation")
        return
    llm_w = load_provider("llm_write")
    ep_id, ep_dir = reserve_id(topic["headline"])  # atomic: concurrent runs get different ids
    write_sources(ep_dir, items)  # before any long LLM call: --repair works even if this run dies
    print(f"reserved {ep_id}; wrote {ep_dir}/sources.json ({len(items)} items)")
    var.update(choose_mode(llm, topic, var, eps, budget))
    print(f"direction mode: {var['mode']} ({var['mode_reason']})")
    try:
        var.update(choose_shape(llm, topic, var, budget))
        if var.get("mode") in brain.DRAMA_MODES:
            print(f"cold-open shape: archetype={var.get('arch')} lens={var.get('lens')} bridge={var.get('bridge')}")
        if "--no-analogy-check" not in argv:  # one short call; a wrong mapping is caught before the 12-15 min writer call
            var["precheck"] = analogy_precheck(llm, topic, items, var, budget)
            if var["precheck"]:
                (DATA / "out" / ep_id).mkdir(parents=True, exist_ok=True)
                (DATA / "out" / ep_id / "analogy_precheck.json").write_text(json.dumps(var["precheck"], indent=1, ensure_ascii=False))
        ep = write_episode(llm_w, topic, items, var, ep_id, eps, budget, brief=brief_qs)
    except BudgetExceeded as e:
        save_state(ep_id, budget, 0, 0, "crashed", str(e), MAX_MECH_REPAIRS, MAX_SEMANTIC_REPAIRS)
        raise SystemExit(f"budget: {e}")
    except Exception as e:  # no draft yet: keep the reservation, sources.json and the token state
        save_state(ep_id, budget, 0, 0, "crashed", f"{type(e).__name__}: {str(e)[:300]}", MAX_MECH_REPAIRS, MAX_SEMANTIC_REPAIRS)
        raise SystemExit(f"director stopped before a draft existed: {type(e).__name__}: {str(e)[:200]}. State saved in out/{ep_id}/director_state.json; "
                         "rerun the director (the id stays reserved).")
    ep["id"], ep["audience"] = ep_id, var["audience"]
    ep, issues = refine(llm_w, ep, ep_id, var, topic, items, MAX_MECH_REPAIRS, MAX_SEMANTIC_REPAIRS, budget)
    finish(ep, ep_id, var, topic, items, issues)


def repair_var(ep: dict, force: bool = False) -> dict:
    """Reconstruct the run variables of a saved draft. A mode the audience envelope forbids is re-routed to the envelope's
    first mode (unless --force-mode), so repairs never chase an unfixable dir_mode_allowed."""
    card = cards()[ep["audience"]]
    d = ep.get("direction") or {}
    mode = d.get("mode", "explainer")
    allowed = brain.style_envelope(ep["audience"])["modes"]
    t = ep.get("topic") or {}
    var = {"audience": ep["audience"], "card": card, "formats": [ep.get("format_id")], "domains": [(ep.get("analogy") or {}).get("domain")],
           "mode": mode, "mode_reason": d.get("mode_reason", "kept from the draft"), "lens": d.get("lens"),
           "arch": (d.get("cold_open") or {}).get("archetype"), "bridge": (d.get("cold_open") or {}).get("bridge"), "mode_forced_outside_envelope": False,
           "space": is_space_topic(ep.get("title"), t.get("headline"), ep.get("topic_area"))}
    if mode not in allowed:
        if force:
            print(f"WARNING: --force-mode: keeping '{mode}' outside the '{ep['audience']}' envelope {allowed}; lint will keep reporting dir_mode_allowed")
            var["mode_forced_outside_envelope"] = True
        else:
            new = "explainer" if "explainer" in allowed else allowed[0]
            print(f"mode '{mode}' is not allowed for audience '{ep['audience']}' (allowed: {allowed}): repairing as '{new}' (use --force-mode to keep it)")
            var.update(mode=new, mode_changed_from=mode, mode_reason=f"re-routed from {mode}: outside the audience envelope")
    return var


def repair(ref: str, max_repairs: int, force: bool = False, max_semantic: int = MAX_SEMANTIC_REPAIRS) -> None:
    """Send an existing draft back through lint -> verify -> repair (after a rate limit, a hand edit, or a failed gate)."""
    ep_dir = registry.resolve(ref)
    ep = registry.read(ep_dir)
    if registry.status_of(ep) not in ("idea", "scripted"):
        raise SystemExit(f"{ep['id']} is '{registry.status_of(ep)}': only unapproved drafts are repaired")
    src = ep_dir / "sources.json"
    items = json.loads(src.read_text()) if src.exists() else []
    if not items:
        print(f"WARNING: {src} is missing or empty: every claim will fail claims_urls_in_catalog")
    t = ep.get("topic") or {}
    topic = {"headline": t.get("headline", ep["title"]), "angle": t.get("angle", ""), "why_now": t.get("why_now", ""), "audience_misconception": "", "source_urls": t.get("source_urls", [])}
    var = repair_var(ep, force)
    st = load_state(ep["id"])
    budget = Budget(cap=int(st.get("cap") or MAX_RUN_TOKENS), spent=st.get("tokens_spent", 0), calls=st.get("calls"))
    mech_used = sem_used = 0
    if st.get("status") in ("crashed", "running"):  # resume: the budgets the crashed run already used stay used
        mech_used, sem_used = int(st.get("mechanical_used") or 0), int(st.get("semantic_used") or 0)
        max_repairs, max_semantic = max(max_repairs, int(st.get("max_mechanical") or 0)), max(max_semantic, int(st.get("max_semantic") or 0))
    if st:
        print(f"resuming {ep['id']}: ~{budget.spent} tokens already spent (cap {budget.cap}); mechanical {mech_used}/{max_repairs}, semantic {sem_used}/{max_semantic}"
              f" ({st.get('status')}{': ' + str(st.get('error'))[:120] if st.get('error') else ''})")
    ep, issues = refine(load_provider("llm_write"), ep, ep["id"], var, topic, items, max_repairs, max_semantic, budget, mech_used, sem_used)
    finish(ep, ep["id"], var, topic, items, issues)


if __name__ == "__main__":
    main(sys.argv[1:])
