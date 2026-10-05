"""Free animatic: review the whole episode on screen BEFORE any paid media exists (no API calls, no assets generated).
  python run.py animatic <episode> [--render]

Writes out/<id>/props.animatic.json for the SAME `Episode` composition the real build renders. Scenes that need paid media (illustration, photo,
clip) become a "placeholder" visual (id, beat, intent, what will be shown, shot facts, narration, duration); renderer-native scenes (diagram, steps,
number, compare, orbit) render for real. Durations come from storyboard.build: real TTS when generated, else a marked estimate. No audio, no music.
Review with Remotion Studio (scenes are labelled by id in its timeline):
  cd remotion-app && npx remotion studio src/index.ts --props=../out/<id>/props.animatic.json
--render also writes a small out/<id>/animatic.mp4 (35% scale) for quick viewing. The cold-open bridge is not simulated."""
import json
import subprocess

import registry
import run
import storyboard
from adapters.common import ROOT

MEDIA = ("illustration", "photo", "clip")


def build(ep_ref: str) -> tuple:
    d = registry.resolve(ep_ref)
    ep = registry.read(d)
    card = run.audience_card(ep)
    profile = json.loads((ROOT / "config" / "profiles" / f"{card['remotion_profile']}.json").read_text()) if card else None
    sb = {s["id"]: s for s in storyboard.build(ep, d)["scenes"]}
    fps = ep["format"]["fps"]
    tr = int((profile or {}).get("transitionFrames", run.TR))
    scenes, t = [], 0
    for sc in ep["scenes"]:
        s, v = sb[sc["id"]], dict(sc["visual"])
        frames = round((s["duration_s"] + run.PAD) * fps)
        audio_json = ROOT / "out" / ep["id"] / "audio" / f"{sc['id']}.json"
        if v["type"] in MEDIA:
            shot = sc.get("shot") or {}
            v = {"type": "placeholder", "of": v["type"], "narration": sc["narration"], "summary": s["visual"]["summary"] or v["type"],
                 "generation": s["visual"]["generation"], "intent": sc.get("intent"),
                 "shot": ", ".join(f"{k} {shot[k]}" for k in ("size", "move", "angle", "action") if shot.get(k)) or None,
                 "seconds": s["duration_s"], "est": s["timing"] == "est"}
            v = {k: x for k, x in v.items() if x is not None}
        scenes.append({"id": sc["id"], "beat": sc["beat"], "from": t, "frames": frames, "audio": "",
                       "words": json.loads(audio_json.read_text()).get("words", []) if audio_json.exists() else [], "visual": v})
        t += frames - tr
    t += tr
    palette = (profile or {}).get("palette") or ep["style"]["palette"]
    prof = {k: x for k, x in (profile or {}).items() if k not in ("palette", "music") and not k.startswith("_")} | {"safe": run.safe_zone(profile)}
    props = {"title": ep["title"], "style": palette, "profile": prof, "disclosure": None, "music": None, "transition": tr, "sponsor": None,
             "scenes": scenes, "totalFrames": t, "fps": fps, "width": ep["format"]["width"], "height": ep["format"]["height"]}
    out = ROOT / "out" / ep["id"]
    out.mkdir(parents=True, exist_ok=True)
    path = out / "props.animatic.json"
    path.write_text(json.dumps(props, indent=1))
    return ep, path, t / fps


def main(args: list) -> int:
    ref = next((a for a in args if not a.startswith("--")), None)
    if not ref:
        print((__doc__ or "").split("\n\n")[0])
        return 1
    ep, path, secs = build(ref)
    print(f"animatic props: {path} ({secs:.1f}s)")
    print(f"review: cd remotion-app && npx remotion studio src/index.ts --props=../out/{ep['id']}/props.animatic.json")
    if "--render" in args:
        mp4 = path.parent / "animatic.mp4"
        subprocess.run(["npx", "remotion", "render", "src/index.ts", "Episode", str(mp4), f"--props={path}", "--codec=h264", "--crf=28", "--scale=0.35"],
                       cwd=ROOT / "remotion-app", check=True)
        print(f"wrote {mp4}")
    return 0
