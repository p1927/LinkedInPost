"""Per-episode visual identity: INFORMATION decides the look (audience only sets constraints). Free, local, deterministic.
  python run.py identity list                         the archetype catalog + what the last 5 episodes used
  python run.py identity pick <ep> [--info T] [--archetype A] [--palette A|B] [--seed N] [--dry]
  python run.py identity show <ep>
Catalog: direction/identities/archetypes.yaml (10 archetypes; palettes, fonts, shape, motion, rotation options). Plan: docs/plans/youtube-automation/STYLE-IDENTITY-PLAN.md.
pick(): classify the information type (owner override > keyword score > topic_area), take the archetype's default or alternate, then ROTATE against the last
5 episodes: never the same (archetype, palette) twice in that window, accent hue at least 60 degrees from the previous same-archetype episode, headline font,
caption, layout and transition rotate by seed. Palettes are built with coloraide (OKLCH) and every colour is pushed to a WCAG contrast floor against its background.
The result is written to episode.json `identity` (and `style.illustration_style`, so generated images match the look); the renderer reads props.identity."""
import hashlib
import re

import yaml
from coloraide import Color

import registry
from adapters.common import ROOT

CATALOG = ROOT / "direction" / "identities" / "archetypes.yaml"
KEYS = ("bg", "ink", "sunny", "coral", "sky", "mint", "grape", "white")
WINDOW = 5            # an (archetype, palette) pair may not repeat within this many recent episodes
MIN_ROTATION = 60.0   # degrees of accent hue between consecutive same-archetype episodes
FLOOR_TEXT, FLOOR_ACCENT, FLOOR_INK = 4.5, 4.5, 7.0
TOPIC_AREA = {"economics": "money", "markets": "money", "finance": "money", "technology": "software", "science": "science-scale", "physics": "science-scale",
              "math": "math", "history": "history", "geography": "geography", "politics": "geography", "health": "health", "engineering": "engineering"}


def catalog() -> dict:
    return yaml.safe_load(CATALOG.read_text())


# ------------------------------------------------------------------ colour helpers (coloraide)
def _hue(hex_: str) -> float:
    c = Color(hex_).convert("oklch")
    return 0.0 if c.is_nan("hue") else float(c["hue"])


def _gap(a: float, b: float) -> float:
    d = abs(a - b) % 360
    return min(d, 360 - d)


def _hex(c: Color) -> str:
    return c.convert("srgb").fit("srgb").to_string(hex=True).upper()


def ensure_contrast(color: str, bg: str, ratio: float) -> str:
    """Move `color` along OKLCH lightness (away from the background) until it reaches `ratio` against `bg`."""
    c, b = Color(color).convert("oklch"), Color(bg)
    dark_bg = b.convert("oklch")["lightness"] < 0.5
    for _ in range(120):
        if Color(_hex(c)).contrast(b) >= ratio:
            break
        c = c.clone().set("lightness", min(1.0, max(0.0, c["lightness"] + (0.01 if dark_bg else -0.01))))
    return _hex(c)


def contrast(a: str, b: str) -> float:
    return round(Color(a).contrast(Color(b)), 2)


def build_palette(base: dict, rotate: float = 0.0) -> dict:
    """Catalog palette roles -> the renderer's 8 colour keys plus muted/surface/rule, contrast-checked. Only accent/accent2/tert rotate in hue."""
    bg = _hex(Color(base["bg"]))
    dark = Color(bg).convert("oklch")["lightness"] < 0.5

    def rot(h):
        c = Color(h).convert("oklch")
        return _hex(c.clone().set("hue", ((0.0 if c.is_nan("hue") else c["hue"]) + rotate) % 360)) if rotate else _hex(Color(h))

    ink = ensure_contrast(base["ink"], bg, FLOOR_INK)
    pal = {"bg": bg, "ink": ink,
           "sunny": ensure_contrast(rot(base["accent"]), bg, FLOOR_ACCENT), "sky": ensure_contrast(rot(base["accent2"]), bg, FLOOR_ACCENT),
           "coral": ensure_contrast(base["warn"], bg, FLOOR_ACCENT), "mint": ensure_contrast(base["good"], bg, FLOOR_ACCENT),
           "grape": ensure_contrast(rot(base["tert"]), bg, FLOOR_ACCENT)}
    pal["white"] = _hex(Color(bg).mix(Color("#FFFFFF"), 0.10 if dark else 0.65, space="oklab"))  # card surface
    pal["muted"] = ensure_contrast(_hex(Color(ink).mix(Color(bg), 0.40, space="oklab")), bg, FLOOR_TEXT)
    pal["rule"] = _hex(Color(ink).mix(Color(bg), 0.86, space="oklab"))
    return pal


# ------------------------------------------------------------------ information type
def classify(ep: dict) -> tuple:
    """(info_type, scores). Keyword score over title, topic, one_idea, narration and claims; topic_area is the fallback."""
    cat = catalog()["info_types"]
    text = " ".join([ep.get("title", ""), ep.get("one_idea", ""), (ep.get("topic") or {}).get("headline", ""), (ep.get("topic") or {}).get("angle", "")]
                    + [s.get("narration", "") for s in ep.get("scenes", [])] + [c.get("claim", "") for c in ep.get("claims", [])]).lower()
    scores = {t: sum(len(re.findall(r"\b" + re.escape(k) + r"\b", text)) for k in d["keywords"]) for t, d in cat.items()}
    best = max(scores, key=lambda t: scores[t])
    if scores[best] == 0:
        return TOPIC_AREA.get((ep.get("topic_area") or "").lower()), scores
    return best, scores


# ------------------------------------------------------------------ history and rotation
def history(ep_id: str, n: int = WINDOW) -> list:
    """The n most recent OTHER episodes that carry an identity, newest first (by episode number in the id)."""
    rows = []
    for d in registry.episode_dirs():
        e = registry.read(d)
        idn = e.get("identity")
        if e["id"] == ep_id or not idn:
            continue
        m = re.match(r"ep(\d+)", e["id"])
        rows.append((int(m.group(1)) if m else 0, {"id": e["id"], "archetype": idn.get("archetype") or idn.get("id"), "palette": (idn.get("variant") or {}).get("palette"),
                                                   "accent_hue": _hue(idn["palette"]["sunny"]) if idn.get("palette") else None}))
    return [r for _, r in sorted(rows, key=lambda x: -x[0])[:n]]


def _seed(ep_id: str) -> int:
    return int(hashlib.sha1(ep_id.encode()).hexdigest()[:8], 16) % 100000


def pick(ep: dict, info: str | None = None, archetype: str | None = None, palette: str | None = None, seed: int | None = None, hist: list | None = None) -> dict:
    cat = catalog()
    seed = _seed(ep["id"]) if seed is None else seed
    hist = history(ep["id"]) if hist is None else hist
    why = []
    if archetype:
        cands, info = [archetype], info or "(owner override)"
        why.append(f"archetype {archetype} chosen by owner")
    else:
        info = info or classify(ep)[0]
        if info not in cat["info_types"]:
            raise SystemExit(f"cannot infer an information type for {ep['id']}; pass --info {'|'.join(cat['info_types'])} or --archetype")
        it = cat["info_types"][info]
        cands = [it["default"], it["alternate"], it.get("extra")]
        cands = [c for c in cands if c]
        aud = ep.get("audience")
        fit = [c for c in cands if not aud or aud in cat["archetypes"][c]["audience_fit"]]
        cands = fit or cands
        why.append(f"information type '{info}' -> {it['default']} (default) / {it['alternate']} (alternate)")
    used = {(h["archetype"], h["palette"]) for h in hist}
    used_triples = {(h["archetype"], h["palette"], int(h["accent_hue"] // 60)) for h in hist if h["accent_hue"] is not None}
    choice = None
    for a in cands:
        pals = [palette] if palette else sorted(cat["archetypes"][a]["palettes"])
        pals = pals[seed % len(pals):] + pals[:seed % len(pals)]
        for p in pals:
            if (a, p) not in used:
                choice = (a, p)
                break
        if choice:
            break
    if not choice:  # every candidate pair was used recently: keep the default archetype, take the palette used least recently, rotate hard
        a = cands[0]
        last = [h["palette"] for h in hist if h["archetype"] == a]
        choice = (a, palette or next((p for p in sorted(cat["archetypes"][a]["palettes"]) if p not in last[:1]), "A"))
        why.append("all candidate (archetype, palette) pairs used in the last %d episodes; reusing with a forced accent rotation" % WINDOW)
    a, p = choice
    arch = cat["archetypes"][a]
    base = arch["palettes"][p]
    # accent rotation: >= 60 degrees away from the most recent same-archetype accent, and out of the 'terracotta' band for warm paper + serif looks
    last_hue = next((h["accent_hue"] for h in hist if h["archetype"] == a and h["accent_hue"] is not None), None)
    base_hue = _hue(base["accent"])
    offsets = [(o + 60 * (seed % 6)) % 360 for o in range(0, 360, 60)]
    serif = any(f in ("Source Serif 4", "Newsreader", "Libre Caslon Text", "Playfair Display", "Cormorant Garamond", "Fraunces", "DM Serif Display") for f in arch["fonts"]["display"])
    light_warm = Color(base["bg"]).convert("oklch")["lightness"] > 0.85
    base_light = Color(base["bg"]).convert("oklch")["lightness"] > 0.6

    def ok(o):
        h = (base_hue + o) % 360
        if last_hue is not None and _gap(h, last_hue) < MIN_ROTATION:
            return False
        if (a, p, int(h // 60)) in used_triples:  # the full (archetype, palette, accent) look may not repeat inside the window
            return False
        if base_light and 85 <= h <= 135:  # yellow-olive at a text-safe lightness is muddy on a light background
            return False
        return not (serif and light_warm and 20 <= h <= 60)
    offset = next((o for o in offsets if ok(o)), offsets[0])
    if last_hue is not None:
        why.append(f"accent rotated {offset:.0f} degrees (previous same-archetype accent hue {last_hue:.0f})")
    n_same = sum(1 for h in hist if h["archetype"] == a)

    def rotate(lst, k=0):
        return lst[(seed + n_same + k) % len(lst)]
    fonts = dict(arch["fonts"])
    fonts = {"display": rotate(fonts["display"]), "body": rotate(fonts["body"], 1), "mono": rotate(fonts["mono"], 2), "displayWeight": fonts["displayWeight"],
             "bodyWeight": fonts["bodyWeight"], "caps": fonts["caps"]}
    motion = dict(arch["motion"])
    motion["transition"] = rotate(motion["transition"])
    return {"id": a, "archetype": a, "info_type": info, "variant": {"palette": p, "layout": rotate(arch["layout"]), "accent_rotation": offset},
            "palette": build_palette(base, offset), "fonts": fonts, "shape": dict(arch["shape"]), "backdrop": rotate(arch["backdrop"]), "motion": motion,
            "caption": rotate(arch["caption"]), "term": rotate(arch["term"]), "layout": rotate(arch["layout"]),
            "illustration_style": arch["illustration_style"], "seed": seed, "rationale": "; ".join(why)}


# ------------------------------------------------------------------ checks
def validate(idn: dict) -> list:
    """[(severity, rule, message)] for an episode's identity: contrast floors, known fonts/enums, banned AI-default looks."""
    out, cat = [], catalog()
    pal = idn.get("palette") or {}
    if any(k not in pal for k in KEYS):
        return [("error", "identity_contrast", f"palette is missing keys: {[k for k in KEYS if k not in pal]}")]
    for k, floor in (("ink", FLOOR_TEXT), ("sunny", FLOOR_ACCENT), ("sky", FLOOR_ACCENT), ("coral", FLOOR_ACCENT), ("mint", FLOOR_ACCENT), ("grape", FLOOR_ACCENT)):
        r = contrast(pal[k], pal["bg"])
        if r < floor:
            out.append(("error", "identity_contrast", f"{k} {pal[k]} on bg {pal['bg']} is {r}:1 (needs {floor}:1)"))
    if contrast(pal["ink"], pal["white"]) < FLOOR_TEXT:
        out.append(("error", "identity_contrast", f"ink on card surface is {contrast(pal['ink'], pal['white'])}:1"))
    arch = cat["archetypes"].get(idn.get("archetype") or idn.get("id"))
    if not arch:
        out.append(("error", "identity_contrast", f"unknown archetype {idn.get('archetype') or idn.get('id')!r}"))
    else:
        for role in ("display", "body", "mono"):
            allowed = set(arch["fonts"][role]) | set(sum((a["fonts"][role] for a in cat["archetypes"].values()), []))
            if idn.get("fonts", {}).get(role) not in allowed:
                out.append(("error", "identity_contrast", f"font {idn.get('fonts', {}).get(role)!r} is not a catalog font"))
    bg, acc = Color(pal["bg"]).convert("oklch"), Color(pal["sunny"]).convert("oklch")
    h = 0.0 if acc.is_nan("hue") else acc["hue"]
    serif = idn.get("fonts", {}).get("display") in ("Source Serif 4", "Newsreader", "Libre Caslon Text", "Playfair Display", "Cormorant Garamond", "Fraunces", "DM Serif Display")
    if bg["lightness"] > 0.85 and serif and 20 <= h <= 60:
        out.append(("warn", "identity_banned_default", "cream background + serif + terracotta accent is a known AI-default look; rotate the accent hue or pick the other palette"))
    if bg["lightness"] < 0.2 and 120 <= h <= 150 and acc["chroma"] > 0.18:
        out.append(("warn", "identity_banned_default", "near-black background + acid green accent is a known AI-default look"))
    return out


def variety_issues(ep: dict) -> list:
    idn = ep.get("identity")
    if not idn:
        return []
    a, p = idn.get("archetype") or idn.get("id"), (idn.get("variant") or {}).get("palette")
    hit = [h for h in history(ep["id"]) if h["archetype"] == a and h["palette"] == p]
    return [("warn", "identity_variety", f"{a} palette {p} was already used by {hit[0]['id']} within the last {WINDOW} episodes; pick another archetype/palette or run `run.py identity pick {ep['id']}` again")] if hit else []


# ------------------------------------------------------------------ CLI
def _summary(idn: dict) -> str:
    p = idn["palette"]
    return (f"{idn['archetype']} ({idn['info_type']}) palette {idn['variant']['palette']} accent+{idn['variant']['accent_rotation']:.0f}deg | bg {p['bg']} ink {p['ink']} "
            f"accent {p['sunny']}/{p['sky']} | fonts {idn['fonts']['display']} / {idn['fonts']['body']} / {idn['fonts']['mono']} | backdrop {idn['backdrop']} | caption {idn['caption']} "
            f"term {idn['term']} layout {idn['layout']} | transition {idn['motion']['transition']}, entrance {idn['motion']['entrance']}\n  why: {idn['rationale']}")


def main(args: list) -> int:
    sub = args[0] if args else "list"
    opt = lambda k: args[args.index(k) + 1] if k in args and args.index(k) + 1 < len(args) else None  # noqa: E731
    if sub == "list":
        cat = catalog()
        print("archetype        suits                       recent use")
        recent = history("", 10)
        for a, d in cat["archetypes"].items():
            used = [h["id"] for h in recent if h["archetype"] == a]
            print(f"{a:16} {', '.join(d['suits']):27} {', '.join(used) or '-'}")
        return 0
    ref = next((x for x in args[1:] if not x.startswith("--")), None)
    if sub not in ("pick", "show") or not ref:
        print((__doc__ or "").split("\n\n")[0])
        return 1
    d = registry.resolve(ref)
    ep = registry.read(d)
    if sub == "show":
        print(_summary(ep["identity"]) if ep.get("identity") else "no identity yet")
        return 0
    seed_arg = opt("--seed")
    idn = pick(ep, info=opt("--info"), archetype=opt("--archetype"), palette=opt("--palette"), seed=int(seed_arg) if seed_arg else None)
    print(_summary(idn))
    for sev, rule, msg in validate(idn) + variety_issues({**ep, "identity": idn}):
        print(f"  [{sev.upper()}] {rule}: {msg}")
    if "--dry" in args:
        print("(dry run, nothing written)")
        return 0
    ep["identity"] = idn
    ep.setdefault("style", {})["illustration_style"] = idn["illustration_style"]
    registry.write(d, ep)
    print(f"written to {d.name}/episode.json (style.illustration_style updated; generated images keyed on it will regenerate on the next build)")
    return 0
