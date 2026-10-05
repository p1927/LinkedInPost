"""Storyboard + decision map: one generated, read-only view of an episode, scene by scene (free, local, no paid calls).
  python run.py storyboard <episode> [--json]      writes out/<id>/storyboard.md (and storyboard.json with --json)

episode.json stays the ONLY authored source. Everything here is derived from it, so there is nothing to keep in sync:
  timing        real TTS durations (out/<id>/audio/*.json) when generated, else words at 2.5 w/s (marked est)
  role          why the scene exists: its format beat (window + word budget from format_catalog.yaml), the mechanism step it shows,
                the concepts it introduces/needs, the loops it raises/pays
  elements      what appears on screen and (for diagram/orbit) when, from the visual's own `reveal[]`
  shot facts    scenes[].shot, if the director wrote any
  cost          paid generation (illustration/keyframe/clip) vs free (renderer-native)
  flags         lint issues that name the scene
Authored rationale lives in director_notes (ASSUME/RULING/DEVIATE/WORKAROUND lines) and direction.* and is shown verbatim."""
import json
import re

import yaml

import lint
import registry
from adapters.common import ROOT

WPS = 2.5  # same planning estimate lint uses when no TTS exists
PAID = {"illustration": "image", "clip": "keyframe image + video clip", "photo": "none (supplied still)"}


def _catalog_structure(format_id) -> dict:
    cat = yaml.safe_load((ROOT / "direction" / "format_catalog.yaml").read_text())["formats"]
    f = next((x for x in cat if x["id"] == format_id), None)
    return {s["beat"]: s for s in (f or {}).get("structure", [])}


def _duration(ep: dict, sc: dict) -> tuple:
    a = ROOT / "out" / ep["id"] / "audio" / f"{sc['id']}.json"
    if a.exists():
        return json.loads(a.read_text())["duration"], "tts"
    return len(sc["narration"].split()) / (WPS * (ep.get("voice_override") or {}).get("speed", 1.0)), "est"


def _elements(v: dict, start: float, dur: float) -> list:
    """What the viewer sees, in order. Timed only where the visual itself declares `reveal[].at` (fraction of the scene)."""
    t, out = v["type"], []
    if v.get("term"):
        out.append(f"term sticker: {v['term'].get('label')} ({v['term'].get('sub', '')})".rstrip(" ()"))
    if t == "steps":
        out += [f"step {i + 1}: {s}" for i, s in enumerate(v.get("steps", []))]
    elif t == "number":
        out.append(f"number: {v.get('value')} {v.get('unit', '')} - {v.get('label')}".replace("  ", " "))
    elif t == "compare":
        out.append(f"compare: {v.get('colA')} vs {v.get('colB')} ({len(v.get('rows', []))} rows, winner {v.get('winner', 'none')})")
    elif t in ("diagram", "orbit"):
        n = len(v.get("nodes") or v.get("bodies") or [])
        if n:
            out.append(f"{t}: {n} items")
        for r in v.get("reveal", []):
            what = ", ".join(filter(None, [("show " + "/".join(r["show"])) if r.get("show") else "", r.get("caption") or "", ("readout " + str(r["readout"].get("value"))) if r.get("readout") else ""]))
            out.append(f"@{start + r.get('at', 0) * dur:.1f}s: {what or 'highlight'}")
    return out


def build(ep: dict, ep_dir=None) -> dict:
    import scene_edit
    decisions = scene_edit.read_log(ep_dir) if ep_dir else []
    struct = _catalog_structure(ep.get("format_id"))
    issues = lint.run(ep)
    mech, concepts, loops = ep.get("mechanism") or [], ep.get("concepts") or [], ep.get("loops") or []
    scenes, t0 = [], 0.0
    for sc in ep["scenes"]:
        sid, v = sc["id"], sc["visual"]
        dur, src = _duration(ep, sc)
        words = len(sc["narration"].split())
        beat = struct.get(sc["beat"])
        prompt = v.get("prompt") or v.get("keyframe_prompt") or v.get("motion_prompt") or v.get("title") or v.get("label") or f"({v['type']} scene built from its own fields, no prompt)"
        scenes.append({
            "id": sid, "beat": sc["beat"], "start_s": round(t0, 1), "duration_s": round(dur, 1), "timing": src,
            "narration": sc["narration"], "words": words, "word_budget": beat["word_budget"] if beat else None,
            "beat_window_s": beat["target_sec"] if beat else None,
            "visual": {"type": v["type"], "summary": prompt[:140], "generation": PAID.get(v["type"], "none (renderer-native)")},
            "intent": sc.get("intent"),
            "shot": sc.get("shot"),
            "role": {
                "mechanism": [m["step"] for m in mech if m.get("scene") == sid],
                "introduces": [c["name"] for c in concepts if c.get("introduced_in") == sid],
                "needs": [c["name"] for c in concepts if sid in (c.get("needed_in") or [])],
                "raises": [l["question"] for l in loops if l.get("raised_in") == sid],
                "pays": [l["question"] for l in loops if l.get("paid_in") == sid],
            },
            "elements": _elements(v, t0, dur),
            "flags": [f"{r}: {m}" for _, r, m in issues if m.startswith((f"{sid}:", f"{sid}."))],
            "decisions": [{k: x[k] for k in ("ts", "actor", "path", "reason")} for x in decisions if x["scene"] == sid],
        })
        t0 += dur
    notes = [ln.strip() for ln in (ep.get("director_notes") or "").splitlines() if ln.strip()]
    return {"id": ep["id"], "title": ep["title"], "status": ep.get("status"), "audience": ep.get("audience"), "format_id": ep.get("format_id"),
            "total_s": round(t0, 1), "direction": ep.get("direction"), "director_notes": notes, "scenes": scenes,
            "waivers": ep.get("waivers") or [], "episode_flags": [f"{r}: {m}" for _, r, m in issues if not re.match(r"s\d+[:.]", m) and "[waived:" not in m]}


def render_md(sb: dict) -> str:
    L = [f"# Storyboard: {sb['title']}", "",
         f"`{sb['id']}` · status **{sb['status']}** · audience {sb['audience'] or '-'} · format {sb['format_id'] or '-'} · ~{sb['total_s']}s",
         "", "_Generated from episode.json (read-only). Edit episode.json, not this file._", ""]
    d = sb["direction"]
    if d:
        L += ["## Direction", f"- mode **{d.get('mode')}**" + (f": {d['mode_reason']}" if d.get("mode_reason") else ""), f"- lens: {d.get('lens', '-')}",
              f"- cards used: {', '.join(d.get('skills_used') or []) or '-'}", ""]
    if sb["director_notes"]:
        L += ["## Decisions recorded by the director (director_notes)"] + [f"- {n}" for n in sb["director_notes"]] + [""]
    if sb["waivers"]:
        L += ["## Waivers"] + [f"- {w['rule']}: {w['reason']}" for w in sb["waivers"]] + [""]
    if sb["episode_flags"]:
        L += ["## Episode-level flags"] + [f"- {f}" for f in sb["episode_flags"]] + [""]
    L += ["## Scenes", "", "| # | t (s) | beat | words | visual | generation | role | flags |", "|---|---|---|---|---|---|---|---|"]
    for s in sb["scenes"]:
        r = s["role"]
        cut = lambda x: x if len(x) <= 48 else x[:45] + "..."  # noqa: E731
        role = "; ".join(filter(None, [("shows: " + cut(" / ".join(r["mechanism"]))) if r["mechanism"] else "", ("introduces: " + ", ".join(r["introduces"])) if r["introduces"] else "",
                                       ("asks: " + cut(r["raises"][0])) if r["raises"] else "", ("answers: " + cut(r["pays"][0])) if r["pays"] else ""])) or "-"
        bud = f"/{s['word_budget']}" if s["word_budget"] else ""
        L.append(f"| {s['id']} | {s['start_s']}-{round(s['start_s'] + s['duration_s'], 1)}{'*' if s['timing'] == 'est' else ''} | {s['beat']} | {s['words']}{bud} | {s['visual']['type']} | {s['visual']['generation']} | {role} | {len(s['flags']) or '-'} |")
    L += ["", "`*` = estimated duration (no TTS generated yet).", ""]
    for s in sb["scenes"]:
        L += [f"### {s['id']} · {s['beat']} · {s['start_s']}s +{s['duration_s']}s", f"> {s['narration']}", ""]
        if s["intent"]:
            L.append(f"- intent: {s['intent']}")
        L.append(f"- visual **{s['visual']['type']}**: {s['visual']['summary'] or '(no prompt)'}")
        if s["beat_window_s"]:
            L.append(f"- format beat window {s['beat_window_s'][0]}-{s['beat_window_s'][1]}s, budget {s['word_budget']} words (actual {s['words']})")
        if s["shot"]:
            L.append("- shot: " + ", ".join(f"{k}={v}" for k, v in s["shot"].items() if v not in (None, "", [])))
        for k, label in (("mechanism", "shows mechanism step"), ("introduces", "introduces concept"), ("needs", "relies on concept"), ("raises", "raises question"), ("pays", "answers question")):
            for x in s["role"][k]:
                L.append(f"- {label}: {x}")
        L += [f"- on screen: {e}" for e in s["elements"]]
        L += [f"- FLAG {f}" for f in s["flags"]]
        L += [f"- decision {x['ts']} [{x['actor']}] {x['path']}: {x['reason']}" for x in s["decisions"]]
        L.append("")
    return "\n".join(L)


def main(args: list) -> int:
    ref = next((a for a in args if not a.startswith("--")), None)
    if not ref:
        print((__doc__ or "").split("\n\n")[0])
        return 1
    d = registry.resolve(ref)
    ep = registry.read(d)
    if lint.schema_issues(ep):
        print("episode does not validate; run `run.py schema-check` first")
        return 1
    sb = build(ep, d)
    out = ROOT / "out" / ep["id"]
    out.mkdir(parents=True, exist_ok=True)
    (out / "storyboard.md").write_text(render_md(sb))
    if "--json" in args:
        (out / "storyboard.json").write_text(json.dumps(sb, ensure_ascii=False, indent=2))
    print(f"wrote {out / 'storyboard.md'}" + (" and storyboard.json" if "--json" in args else ""))
    return 0
