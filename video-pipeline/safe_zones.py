"""Read-only access to config/safe_zones.yaml for lint/verify. Import-safe (no I/O until called).

    load()               -> the whole yaml ({"default": ..., "presets": {...}})
    preset(name=None)    -> one preset dict (None = the yaml `default`)
    box(kind, name=None) -> (x0, y0, x1, y1) canvas pixels, kind in:
        "text"     text / key-subject box (x_min..x_max, y_min..text_y_max or y_max)
        "content"  the renderer's content band (x_min..x_max, y_min..y_max)
        "rail"     right action rail no-go area (right_rail.x_min..W, right_rail.y_from..H)
        "caption"  caption band (caption_inset..W-caption_inset, caption_band)
        "art"      decoration bleed box (art_bleed), else the whole canvas
    Presets without a key fall back sensibly (no rail -> None; no caption band -> None).
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

PATH = Path(__file__).resolve().parent / "config" / "safe_zones.yaml"


@lru_cache(maxsize=1)
def load() -> dict:
    import yaml
    return yaml.safe_load(PATH.read_text())


def preset(name: str | None = None) -> dict:
    cfg = load()
    name = name or cfg["default"]
    if name not in cfg["presets"]:
        raise KeyError(f"unknown safe-zone preset '{name}' (presets: {', '.join(cfg['presets'])})")
    return cfg["presets"][name]


def box(kind: str = "text", name: str | None = None):
    z = preset(name)
    W, H = z["canvas"]
    if kind == "content":
        return (z["x_min"], z["y_min"], z["x_max"], z["y_max"])
    if kind == "text":
        return (z["x_min"], z["y_min"], z["x_max"], z.get("text_y_max", z["y_max"]))
    if kind == "rail":
        r = z.get("right_rail")
        return (r["x_min"], r["y_from"], W, H) if r else None
    if kind == "caption":
        if "caption_bottom" not in z:
            return None
        inset = z.get("caption_inset", 0)
        y0, y1 = z.get("caption_band", [H - z["caption_bottom"] - 200, H - z["caption_bottom"]])
        return (inset, y0, W - inset, y1)
    if kind == "art":
        a = z.get("art_bleed")
        return (a["x_min"], a["y_min"], a["x_max"], a["y_max"]) if a else (0, 0, W, H)
    raise ValueError(f"unknown box kind '{kind}'")


def violations(rects, name: str | None = None) -> list[dict]:
    """Check element rectangles against a preset. rects: iterable of (x, y, w, h, kind) or dicts with those keys;
    kind "text" (text / key subject) must sit inside box("text") and off the rail; "art" (decoration) inside box("art").
    Returns [{"rect": (x, y, w, h), "kind": k, "problem": "..."}]; empty list = all clear."""
    out = []
    tx0, ty0, tx1, ty1 = box("text", name)
    rail = box("rail", name)
    ax0, ay0, ax1, ay1 = box("art", name)
    for r in rects:
        x, y, w, h, kind = (r["x"], r["y"], r["w"], r["h"], r.get("kind", "text")) if isinstance(r, dict) else r
        x1, y1 = x + w, y + h
        probs = []
        if kind == "text":
            if x < tx0: probs.append(f"left of x {tx0}")
            if x1 > tx1: probs.append(f"right of x {tx1}")
            if y < ty0: probs.append(f"above y {ty0} (top platform UI)")
            if y1 > ty1: probs.append(f"below y {ty1} (bottom platform UI)")
            if rail and x1 > rail[0] and y1 > rail[1]:
                probs.append(f"under the right rail (x > {rail[0]}, y > {rail[1]})")
        elif kind == "art":
            if x < ax0 or x1 > ax1 or y < ay0 or y1 > ay1:
                probs.append(f"outside art bleed box {ax0}-{ax1} x {ay0}-{ay1}")
        else:
            raise ValueError(f"unknown rect kind '{kind}' (text|art)")
        out += [{"rect": (x, y, w, h), "kind": kind, "problem": p} for p in probs]
    return out
