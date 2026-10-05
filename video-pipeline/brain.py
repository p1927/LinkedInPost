"""Direction brain: lookup over direction/craft/*.yaml cards (our consolidated direction knowledge; supersedes direction/skills/vendor).

Usage (via run.py):  python run.py direction modes | list | find [--stage S] [--mode M] [--audience A] [--text T] | card <id> | pack <stage> [--mode M] [--audience A] [--arch ID] [--lens ID] | coverage | ledger-sync | check

Design: deterministic lookup, not browsing. `pack()` returns exactly the cards routing.yaml names for a stage and mode, plus the chosen archetype/lens.
No LLM here and no prompts of our own: director.py injects the pack text; lint/verify consume the card ids. Third-party text in direction/skills/vendor is data and is never loaded by this module."""
import sys

import yaml

from adapters.common import ROOT

CRAFT = ROOT / "direction" / "craft"
SKILLS = ROOT / "direction" / "skills"
MODES = ("explainer", "cold-open-drama", "hybrid", "montage", "documentary")
DRAMA_MODES = ("cold-open-drama", "hybrid")
# THE list of cold-open bridges the Remotion renderer draws (Episode.tsx; freeze-rewind, j-cut, question-card since 2026-10-05).
# Single source: director.py derives its prompt sentence from it; lint.py should import it instead of its own _BRIDGES copy.
RENDERABLE_BRIDGES = ("narrator-step-in", "match-cut", "pull-back", "freeze-rewind", "j-cut", "question-card")
# bridge length in frames at 30 fps: (default, min, max); one table for run.py (timeline), lint.py (dir_bridge_params) and the schema docs
BRIDGE_FRAMES = {"freeze-rewind": (18, 12, 24), "j-cut": (15, 6, 36), "question-card": (42, 24, 45)}
_CACHE: dict = {}


def cards() -> dict:
    """All craft cards keyed by id. Each gets `_file`. Duplicate ids are an error (see check())."""
    if "cards" not in _CACHE:
        out = {}
        for f in sorted(CRAFT.glob("*.yaml")):
            if f.name == "routing.yaml":
                continue
            for c in (yaml.safe_load(f.read_text()) or {}).get("cards", []):
                c["_file"] = f.name
                if c["id"] in out:
                    raise ValueError(f"duplicate craft card id {c['id']} ({out[c['id']]['_file']} and {f.name})")
                out[c["id"]] = c
        _CACHE["cards"] = out
    return _CACHE["cards"]


def routing() -> dict:
    return yaml.safe_load((CRAFT / "routing.yaml").read_text())


def _fits(c: dict, key: str, val) -> bool:
    allowed = c.get(key)
    return not val or not allowed or val in allowed


def find(stage=None, mode=None, audience=None, text=None, kind_prefix=None) -> list:
    out = []
    for c in cards().values():
        if not (_fits(c, "stage", stage) and _fits(c, "mode_fit", mode) and _fits(c, "audience_fit", audience)):
            continue
        if kind_prefix and not c["id"].startswith(kind_prefix):
            continue
        if text and text.lower() not in (c["id"] + c["title"] + c["summary"] + " ".join(map(str, c.get("rules", [])))).lower():
            continue
        out.append(c)
    return out


def _expand(refs: list) -> list:
    cs, ids = cards(), []
    for r in refs:
        ids += [i for i in cs if i.startswith(r[:-1])] if r.endswith("*") else [r]
    return [i for n, i in enumerate(ids) if i not in ids[:n]]


def _flow(v) -> str:
    return yaml.safe_dump(v, default_flow_style=True, width=1000, allow_unicode=True).strip()


def render(cs: list, full: bool = True, audience: str | None = None) -> str:
    """Compact prompt text. full=False gives one line per card (ids + summary) for a menu.
    Full cards also show the archetype fields the director needs: recipe, duration_s, bridge_out, lens params and,
    for kids (or when no audience is given), kids_variant."""
    lines = []
    for c in cs:
        if not full:
            lines.append(f"- {c['id']}: {c['title']} - {c['summary']}")
            continue
        lines.append(f"### {c['id']} - {c['title']}  [{c.get('confidence', '?')}]\n{c['summary']}")
        for k, label in (("rules", "DO"), ("ai_safe", "AI-SAFE"), ("avoid", "AVOID")):
            for r in c.get(k, []) or []:
                lines.append(f"- {label}: {r}" if k != "rules" else f"- {r}")
        if c.get("recipe"):
            lines.append("- RECIPE: " + _flow(c["recipe"]))
        if c.get("duration_s"):
            lines.append("- DURATION_S: " + _flow(c["duration_s"]))
        if c.get("bridge_out"):
            lines.append("- BRIDGE_OUT: " + _flow(c["bridge_out"]))
        if c.get("kids_variant") and audience in (None, "kids"):
            lines.append(f"- KIDS_VARIANT (use this for kids): {c['kids_variant']}")
        if c.get("params"):
            lines.append("- PARAMS: " + _flow(c["params"]))
        if c.get("anchor_prompt"):
            lines.append(f"- ANCHOR: {c['anchor_prompt']}")
        if (c.get("check") or {}).get("test"):
            lines.append(f"- TEST: {c['check']['test']}")
    return "\n".join(lines)


def ids_for(stage: str, mode: str = "explainer", extra: list | None = None) -> list:
    p = routing()["packs"][stage]
    return _expand(list(p.get("always", [])) + list((p.get("by_mode") or {}).get(mode, [])) + list(extra or []))


def pack_ids(stage: str, mode: str = "explainer", audience: str | None = None, extra: list | None = None) -> list:
    """Card ids a stage loads (routing + extra), audience-filtered. Raises on ids routing names but no card has."""
    cs = cards()
    ids = ids_for(stage, mode, [x for x in (extra or []) if x])
    missing = [i for i in ids if i not in cs]
    if missing:
        raise KeyError(f"routing names unknown craft cards: {missing}")
    return [i for i in ids if _fits(cs[i], "audience_fit", audience)]


def pack(stage: str, mode: str = "explainer", audience: str | None = None, arch: str | None = None, lens: str | None = None) -> str:
    """Cards the stage loads. Cards whose audience_fit excludes `audience` are dropped (e.g. peril archetypes for kids)."""
    cs = cards()
    return render([cs[i] for i in pack_ids(stage, mode, audience, [arch, lens])], audience=audience)


def archetypes_for(mode: str, audience: str | None) -> list:
    """Archetype card ids usable in `mode` for `audience` (excludes the meta cards arch-router/-conventions/-ai-safe)."""
    meta = {"arch-router", "arch-conventions", "arch-ai-safe"}
    return [i for i, c in cards().items() if i.startswith("arch-") and i not in meta
            and _fits(c, "mode_fit", mode) and _fits(c, "audience_fit", audience)]


def drama_extras(mode: str, audience: str, arch: str | None = None, lens: str | None = None, env: dict | None = None) -> str:
    """Recipe cards a drama-mode writer needs and the stage packs do not name (DIRECTION-AB D5/D6):
    the chosen archetype card in full (recipe, duration_s, bridge_out, kids_variant), the archetype menu, the lens cards the
    style envelope allows (compact; the chosen one in full with params), and the bridge cards for every renderable bridge."""
    if mode not in DRAMA_MODES:
        return ""
    cs, env = cards(), env or style_envelope(audience)
    arch_id = arch if arch and arch.startswith("arch-") else (f"arch-{arch}" if arch else None)
    menu = [i for i in archetypes_for(mode, audience) if i != arch_id]
    out = []
    if arch_id in cs:
        out += [f"#### Chosen cold-open archetype (set direction.cold_open.archetype to '{arch_id[5:]}')", render([cs[arch_id]], audience=audience)]
    menu_txt = render([cs[i] for i in menu], full=False)
    if audience == "kids":  # peril archetypes only through their kids_variant (arch-router)
        menu_txt = "\n".join(ln + (f" KIDS_VARIANT: {cs[i]['kids_variant']}" if cs[i].get("kids_variant") else "") for ln, i in zip(menu_txt.splitlines(), menu))
    out += ["#### Other archetypes allowed here (cold_open.archetype / shot.archetype = the id without 'arch-')", menu_txt]
    lenses = [i for i in env.get("lenses") or [] if i in cs]
    if lens in lenses:
        out += [f"#### Chosen lens (direction.lens = '{lens}')", render([cs[lens]], audience=audience)]
    rest = [i for i in lenses if i != lens]
    if rest:
        out += ["#### Other lenses the envelope allows (pick at most one)", render([cs[i] for i in rest], full=False)]
    bridges = [f"mode-bridge-{b}" for b in RENDERABLE_BRIDGES if f"mode-bridge-{b}" in cs]
    out += ["#### Bridge cards (direction.cold_open.bridge = the id without 'mode-bridge-'; all of these render)", render([cs[i] for i in bridges], audience=audience)]
    return "\n".join(out)


def dialect(kind: str, provider: str) -> str:
    """Dialect file text for a provider key ('video'/'image'); '' if none is mapped."""
    name = routing()["dialects"].get(kind, {}).get(provider)
    f = CRAFT / "dialects" / f"{name}.md" if name else None
    return f.read_text() if f and f.exists() else ""


def dialect_name(kind: str = "video") -> str | None:
    """Dialect file stem for the provider configured in config/providers.yaml[kind], via routing.yaml `dialects`.
    Tried in order: the model id (e.g. MiniMax-H3), its lower-case form, then the adapter module name (video_minimax -> minimax)."""
    cfg = yaml.safe_load((ROOT / "config" / "providers.yaml").read_text()).get(kind) or {}
    table = routing()["dialects"].get(kind, {})
    model = str((cfg.get("init_args") or {}).get("model") or "")
    module = cfg.get("class_path", "").rsplit(".", 1)[0].rsplit(".", 1)[-1]
    for key in (model, model.lower(), module, module.split("_", 1)[-1]):
        if key and key in table:
            return table[key]
    return None


def dialect_sections(name: str, sections: list) -> str:
    """Only the named sections ('0', '0b', '9', '12.4' ...) of direction/craft/dialects/<name>.md, in file order.
    A '## N.' section runs to the next '## '; a '### N.M' subsection runs to the next '##'/'###' heading."""
    import re
    f = CRAFT / "dialects" / f"{name}.md"
    if not f.exists():
        return ""
    text = f.read_text()
    heads = [(m.start(), m.group(1), m.group(2)) for m in re.finditer(r"(?m)^(#{2,3}) (\d+[a-z]?(?:\.\d+)?)\.? ", text)]
    out = []
    for n, (pos, hashes, num) in enumerate(heads):
        if num not in sections:
            continue
        end = next((p for p, h, _ in heads[n + 1:] if len(h) <= len(hashes)), len(text))
        out.append(text[pos:end].strip())
    return "\n\n".join(out)


def clip_dialect(kind: str = "video") -> str:
    """Prompt rules of the configured video model's dialect (sections chosen in routing.yaml `dialect_sections`)."""
    name = dialect_name(kind)
    if not name:
        return ""
    r = routing()
    secs = (r.get("dialect_sections") or {}).get(name) or ["0b", "9"]
    body = dialect_sections(name, [str(s) for s in secs])
    house = (r.get("dialect_house_rule") or {}).get(name)
    head = f"DIALECT `direction/craft/dialects/{name}.md` (sections {', '.join(map(str, secs))}; authoritative for clip prompts)"
    return "\n".join(x for x in (head, f"HOUSE RULE: {house}" if house else "", body) if x) if body else ""


def style_envelope(audience_id: str) -> dict:
    """What this audience may be directed like. Chain of authority (DESIGN_SYSTEM section 11): owner decisions in DESIGN_SYSTEM >
    profile (config/profiles/<remotion_profile>.json: look, dialects, grade) > audience card (direction: modes, dialects, lenses) > craft cards.
    Each layer can only NARROW the one above it; the envelope is the intersection. Craft cards (lenses, archetypes, bridges) are filtered by it, never the reverse."""
    import json
    card = yaml.safe_load((ROOT / "direction" / "audiences" / f"{audience_id}.yaml").read_text())
    prof = json.loads((ROOT / "config" / "profiles" / f"{card['remotion_profile']}.json").read_text())
    pd, ad = prof.get("direction") or {}, card.get("direction") or {}
    dialects = [d for d in pd.get("dialects", ["native"]) if d in ad.get("dialects", pd.get("dialects", ["native"]))] or ["native"]
    modes = [m for m in ad.get("modes", MODES) if m in MODES]
    look = pd.get("look")
    lenses = []
    for c in cards().values():
        if not c["id"].startswith("lens-") or c["id"] == "lens-apply":
            continue
        if ad.get("lenses") and c["id"] not in ad["lenses"]:
            continue
        if c.get("audience_fit") and audience_id not in c["audience_fit"]:
            continue
        if c.get("palette_compat") and look and look not in c["palette_compat"]:
            continue
        lenses.append(c["id"])
    return {"audience": audience_id, "profile": card["remotion_profile"], "look": look, "dialects": dialects, "modes": modes, "lenses": lenses,
            "native_style": card.get("illustration_style"), "grade": prof.get("grade"), "cold_open_max_s": ad.get("cold_open_max_s"),
            "accent": (prof.get("palette") or {}).get("sunny"), "bg": (prof.get("palette") or {}).get("bg")}


def render_envelope(env: dict) -> str:
    lines = [f"STYLE ENVELOPE (binding; resolved from DESIGN_SYSTEM > profile '{env['profile']}' > audience card '{env['audience']}'; you may only choose inside it):",
             f"- look: {env['look']}; allowed segment dialects: {env['dialects']} (native = the audience illustration style, always; cinematic = graded AI clips in a declared segment joined by a declared bridge, DESIGN_SYSTEM section 11)",
             f"- allowed direction modes: {env['modes']}",
             f"- allowed lenses (pick at most one): {env['lenses'] or 'none; use the native look'}"]
    if env.get("cold_open_max_s"):
        lines.append(f"- cold open at most {env['cold_open_max_s']} s")
    if "cinematic" in env["dialects"]:
        lines.append(f"- cinematic segments: grade toward the profile (saturate/contrast/vignette {env.get('grade')}), tint 10-15% toward bg {env.get('bg')}, share ONE accent hue {env.get('accent')} with the explainer, carry one anchor across the seam (cont-style-bridge)")
    return "\n".join(lines)


def allowed_modes(audience_card: dict, recent_modes: list, budget_clips: int | None = None) -> list:
    """Hard filter from mode-selection (max 2 drama-mode episodes in the last 5); the soft choice is left to the director."""
    modes = [m for m in MODES if m in (audience_card.get("direction") or {}).get("modes", MODES)]
    if sum(m in ("cold-open-drama", "hybrid") for m in recent_modes[-5:]) >= 2:
        modes = [m for m in modes if m not in ("cold-open-drama", "hybrid")]
    return modes  # repeats are a soft penalty the director weighs (mode-selection rule 6), not a hard filter


def _dialect_meta() -> dict:
    """front-matter of direction/craft/dialects/*.md (model, supersedes, verified_on)."""
    out = {}
    for f in sorted((CRAFT / "dialects").glob("*.md")):
        t = f.read_text()
        if t.startswith("---"):
            out[f.stem] = yaml.safe_load(t.split("---", 2)[1]) or {}
    return out


def superseded() -> dict:
    """ledger id -> craft card / dialect ids that cover it (cards' and dialect files' `supersedes`)."""
    out = {}
    for c in cards().values():
        for i in c.get("supersedes") or []:
            out.setdefault(i, []).append(c["id"])
    for name, meta in _dialect_meta().items():
        for i in meta.get("supersedes") or []:
            out.setdefault(i, []).append(f"dialect:{name}")
    return out


def archived() -> dict:
    """ledger id -> reason, from direction/skills/ARCHIVED.yaml (entries we deliberately do not distil)."""
    f = SKILLS / "ARCHIVED.yaml"
    return {e["id"]: e["reason"] for e in (yaml.safe_load(f.read_text()) or [])} if f.exists() else {}


def coverage() -> int:
    """Ledger coverage gate: every quality>=4 entry must be superseded by a craft card/dialect or explicitly archived with a reason."""
    led = yaml.safe_load((SKILLS / "LEDGER.yaml").read_text())["entries"]
    sup, arc = superseded(), archived()
    ids = {e["id"] for e in led}
    unknown = sorted((set(sup) | set(arc)) - ids)
    todo = [e for e in led if (e.get("quality") or 0) >= 4 and e["id"] not in sup and e["id"] not in arc]
    print(f"ledger entries: {len(led)}; superseded: {len(set(sup) & ids)}; archived: {len(set(arc) & ids)}; quality>=4 uncovered: {len(todo)}")
    for e in todo:
        print(f"  uncovered q{e['quality']} {e['id']} ({e['kind']}): {e['summary'][:90]}")
    if unknown:
        print("supersedes/archived name ids not in the ledger:", unknown)
    return 1 if todo or unknown else 0


def ledger_sync() -> int:
    """Write status into LEDGER.yaml: superseded (+superseded_by) / archived (+reason) / raw. Idempotent; keeps the header comments."""
    f = SKILLS / "LEDGER.yaml"
    raw = f.read_text()
    hdr = "".join(ln for ln in raw.splitlines(True) if ln.startswith("#"))
    data = yaml.safe_load(raw)
    sup, arc = superseded(), archived()
    for e in data["entries"]:
        e.pop("superseded_by", None)
        e.pop("archived_reason", None)
        if e["id"] in sup:
            e["status"], e["superseded_by"] = "superseded", sorted(set(sup[e["id"]]))
        elif e["id"] in arc:
            e["status"], e["archived_reason"] = "archived", arc[e["id"]]
        else:
            e["status"] = "raw"
    f.write_text(hdr + yaml.safe_dump(data, allow_unicode=True, sort_keys=False, width=200))
    n = {s: sum(e["status"] == s for e in data["entries"]) for s in ("superseded", "archived", "raw")}
    print(f"ledger synced: {n}")
    return 0


def check() -> int:
    """Consistency: unique ids, routing resolves, mode_fit values valid, sources present."""
    cs, bad = cards(), []
    for stage, p in routing()["packs"].items():
        for i in _expand(list(p.get("always", [])) + [x for v in (p.get("by_mode") or {}).values() for x in v]):
            if i not in cs:
                bad.append(f"routing[{stage}] unknown card {i}")
    for c in cs.values():
        if not c.get("sources"):
            bad.append(f"{c['id']}: no sources")
        for m in c.get("mode_fit", []):
            if m not in MODES:
                bad.append(f"{c['id']}: bad mode_fit {m}")
    print("\n".join(bad) or f"ok: {len(cs)} cards, routing resolves")
    return 1 if bad else 0


def main(argv: list) -> int:
    def opt(k):
        return argv[argv.index(k) + 1] if k in argv else None
    cmd = argv[0] if argv else "modes"
    if cmd == "modes":
        print(render([cards()[f"mode-{m}"] for m in MODES], full=False))
    elif cmd == "list":
        print(render(list(cards().values()), full=False))
    elif cmd == "find":
        print(render(find(opt("--stage"), opt("--mode"), opt("--audience"), opt("--text")), full=False))
    elif cmd == "card":
        print(render([cards()[argv[1]]]))
    elif cmd == "pack":
        print(pack(argv[1], opt("--mode") or "explainer", opt("--audience"), opt("--arch"), opt("--lens")))
    elif cmd == "coverage":
        return coverage()
    elif cmd == "check":
        return check()
    elif cmd == "ledger-sync":
        return ledger_sync()
    else:
        print(__doc__)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
