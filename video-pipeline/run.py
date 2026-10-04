#!/usr/bin/env python3
"""Episode pipeline CLI.
  python run.py <episode> <stage|all> [--force] [--unapproved]   stages: tts illustrations keyframes clips props render carousel
  python run.py list | sync | lint <ep> | status <ep> <status> | publish <ep> <youtube|instagram> [--confirm] [--visibility V]
  python run.py ig-me | ig-refresh | yt-auth
Assets are cached per scene by CONTENT HASH in out/<id>/: edit a line and only that scene regenerates."""
import json
import shutil
import subprocess
import sys
from pathlib import Path

import cache
import registry
from adapters.common import ROOT, load_provider, provider_cfg

PAID = {"tts", "illustrations", "keyframes", "clips"}  # stages that spend money: need an approved script

PAD = 0.45  # seconds of air after each narration line
TR = 9      # transition length in frames (scenes overlap by this much)


def load(ep_dir: Path):
    ep = json.loads((ep_dir / "episode.json").read_text())
    out = ROOT / "out" / ep["id"]
    for d in ("audio", "keyframes", "clips"):
        (out / d).mkdir(parents=True, exist_ok=True)
    return ep, out


def fill(tpl: str, style: dict) -> str:
    tpl = tpl.replace("{character}", style.get("character", "")).replace("{look}", style.get("look", ""))
    for k, v in (style.get("cast") or {}).items():
        tpl = tpl.replace("{" + k + "}", v)
    return tpl


def stage_tts(ep, out, force):
    tts = load_provider("tts")
    cfg = provider_cfg("tts")
    for sc in ep["scenes"]:
        meta = out / "audio" / f"{sc['id']}.json"
        mp3 = out / "audio" / f"{sc['id']}.mp3"
        k = cache.key("tts", sc["narration"], cfg)
        if meta.exists() and cache.fresh(mp3, k) and not force:
            continue
        r = tts.synth(sc["narration"], mp3)
        meta.write_text(json.dumps(r, indent=1))
        cache.mark(mp3, k)
        print(f"tts {sc['id']}: {r['duration']:.2f}s, {r['characters']} chars")


def stage_keyframes(ep, out, force):
    img = load_provider("image")
    for i, sc in enumerate(s for s in ep["scenes"] if s["visual"]["type"] == "clip" and s["visual"].get("keyframe_prompt")):
        p = out / "keyframes" / f"{sc['id']}.png"
        prompt = fill(sc["visual"]["keyframe_prompt"], ep["style"])
        k = cache.key("kf", prompt, provider_cfg("image"), 1234)
        if cache.fresh(p, k) and not force:
            continue
        img.generate(prompt, p, seed=1234)
        cache.mark(p, k)
        print(f"keyframe {sc['id']} -> {p.name}")


def stage_illustrations(ep, out, force):
    img = load_provider("image")
    (out / "illustrations").mkdir(exist_ok=True)
    for sc in (s for s in ep["scenes"] if s["visual"]["type"] == "illustration"):
        p = out / "illustrations" / f"{sc['id']}.png"
        prompt = fill(sc["visual"]["prompt"], ep["style"]) + ", " + ep["style"]["illustration_style"]
        k = cache.key("ill", prompt, provider_cfg("image"), 4242)
        if cache.fresh(p, k) and not force:
            continue
        img.generate(prompt, p, seed=4242)
        cache.mark(p, k)
        print(f"illustration {sc['id']} -> {p.name}")


def stage_clips(ep, out, force):
    vid = load_provider("video")
    for sc in (s for s in ep["scenes"] if s["visual"]["type"] == "clip"):
        p = out / "clips" / f"{sc['id']}.mp4"
        kf = out / "keyframes" / f"{sc['id']}.png"
        prompt = fill(sc["visual"]["motion_prompt"], ep["style"])
        k = cache.key("clip", prompt, cache.file_hash(kf), provider_cfg("video"))
        if cache.fresh(p, k) and not force:
            continue
        vid.generate(prompt, p, first_frame=kf if kf.exists() else None)
        cache.mark(p, k)
        print(f"clip {sc['id']} -> {p.name}")


PROFILE = None  # set from --profile=<name>; see config/profiles/<name>.json
SUFFIX = ""     # "" for the default look, "_<profile>" otherwise (keeps variants side by side)


def stage_props(ep, out, force):
    fps = ep["format"]["fps"]
    pub = ROOT / "remotion-app" / "public" / ep["id"]
    pub.mkdir(parents=True, exist_ok=True)
    scenes, t = [], 0
    for sc in ep["scenes"]:
        a = json.loads((out / "audio" / f"{sc['id']}.json").read_text())
        frames = round((a["duration"] + PAD) * fps)
        shutil.copy(out / "audio" / f"{sc['id']}.mp3", pub / f"{sc['id']}.mp3")
        v = dict(sc["visual"])
        if v["type"] == "illustration":
            shutil.copy(out / "illustrations" / f"{sc['id']}.png", pub / f"{sc['id']}.png")
            v["still"] = f"{ep['id']}/{sc['id']}.png"
        clip = out / "clips" / f"{sc['id']}.mp4"
        if v["type"] == "clip" and clip.exists():
            shutil.copy(clip, pub / f"{sc['id']}.mp4")
            v["src"] = f"{ep['id']}/{sc['id']}.mp4"
            dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                                 "-of", "csv=p=0", str(clip)]).decode().strip())
            v["rate"] = round(min(1.6, max(1.0, dur / (frames / fps))), 3)  # play the whole beat inside the scene
        elif v["type"] == "clip" and (out / "keyframes" / f"{sc['id']}.png").exists():
            kf = out / "keyframes" / f"{sc['id']}.png"
            shutil.copy(kf, pub / f"{sc['id']}.png")
            v["still"] = f"{ep['id']}/{sc['id']}.png"
        scenes.append({"id": sc["id"], "beat": sc["beat"], "from": t, "frames": frames,
                       "audio": f"{ep['id']}/{sc['id']}.mp3", "words": a["words"], "visual": v})
        t += frames - TR  # next scene overlaps by the transition length
    t += TR
    music = None
    mcfg = (PROFILE or {}).get("music") or ep.get("music")
    if mcfg:
        src = ROOT / mcfg["file"]
        shutil.copy(src, pub / ("music" + SUFFIX + src.suffix))
        music = {"src": f"{ep['id']}/music{SUFFIX}{src.suffix}", "volume": mcfg.get("volume", 0.13)}
    palette = (PROFILE or {}).get("palette") or ep["style"]["palette"]
    props = {"title": ep["title"], "style": palette, "profile": {k: v for k, v in (PROFILE or {}).items() if k not in ("palette", "music") and not k.startswith("_")}, "disclosure": ep.get("disclosure"), "music": music,
             "transition": TR,
             "sponsor": ep.get("sponsor"), "scenes": scenes, "totalFrames": t, "fps": fps,
             "width": ep["format"]["width"], "height": ep["format"]["height"]}
    (out / f"props{SUFFIX}.json").write_text(json.dumps(props, indent=1))
    print(f"props: {t} frames = {t / fps:.1f}s")


def stage_render(ep, out, force):
    app = ROOT / "remotion-app"
    final = out / f"final{SUFFIX}.mp4"
    subprocess.run(["npx", "remotion", "render", "src/index.ts", "Episode", str(final),
                    f"--props={out / f'props{SUFFIX}.json'}", "--codec=h264", "--crf=20"], cwd=app, check=True)
    # Loudness-normalize to -14 LUFS (Shorts/Reels target), video stream copied untouched.
    loud = out / f"final{SUFFIX}_loudnorm.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(final), "-c:v", "copy", "-af",
                    "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", str(loud)], check=True)
    loud.replace(final)
    print("rendered", final)
    registry.advance(ROOT / "episodes" / ep["id"], "rendered")


def stage_carousel(ep, out, force):
    app = ROOT / "remotion-app"
    cdir = out / "carousel"
    cdir.mkdir(exist_ok=True)
    slides = [dict(sl) for sl in ep.get("carousel", [])]
    pub = app / "public" / ep["id"]
    pub.mkdir(parents=True, exist_ok=True)
    for sl in slides:  # slide "image" is an illustration scene id -> copy into public/
        src = out / "illustrations" / f"{sl['image']}.png"
        shutil.copy(src, pub / f"car_{sl['image']}.png")
        sl["image"] = f"{ep['id']}/car_{sl['image']}.png"
    for i, sl in enumerate(slides):
        props = cdir / f"slide{i + 1}.json"
        props.write_text(json.dumps({"slide": sl, "index": i, "total": len(slides), "style": ep["style"]["palette"]}))
        subprocess.run(["npx", "remotion", "still", "src/index.ts", "Slide", str(cdir / f"slide{i + 1}.png"),
                        f"--props={props}"], cwd=app, check=True, capture_output=True)
    print(f"carousel: {len(slides)} slides in {cdir}")


STAGES = {"tts": stage_tts, "illustrations": stage_illustrations, "keyframes": stage_keyframes, "clips": stage_clips,
          "props": stage_props, "render": stage_render, "carousel": stage_carousel}

def stage_publish_dry(ep, platform, visibility):
    pub = (ep.get("publish") or {}).get(platform)
    if not pub:
        raise SystemExit(f"episode has no publish.{platform} block (title/description/tags or caption)")
    return pub


def cmd_publish(ref, platform, confirm, visibility):
    ep_dir = registry.resolve(ref)
    ep = registry.read(ep_dir)
    video = ROOT / "out" / ep["id"] / "final.mp4"
    if not video.exists():
        raise SystemExit(f"no rendered video at {video}")
    pub = stage_publish_dry(ep, platform, visibility)
    print(f"PUBLISH {platform} | {ep['id']} | visibility={visibility}")
    print(json.dumps(pub, indent=2, ensure_ascii=False))
    if not confirm:
        print("DRY RUN - nothing sent. Re-run with --confirm to actually publish.")
        return
    if platform == "youtube":
        from publishers import youtube_shorts
        r = youtube_shorts.upload(video, pub["title"], pub["description"], pub.get("tags", []), visibility, synthetic=True)
        print("uploaded:", r)
        registry.add_post(ep_dir, "youtube", r["url"], r["privacy"])
    elif platform == "instagram":
        from publishers import instagram_reels, tunnel_host
        instagram_reels.me()  # fail fast on a bad/expired token before uploading anything
        url, handle = tunnel_host.host(video, f"{ep['id']}.mp4")
        try:
            r = instagram_reels.publish_reel(url, pub["caption"])
        finally:
            tunnel_host.delete(handle)
        print("published:", r)
        registry.add_post(ep_dir, "instagram", r["url"], "public")
    else:
        raise SystemExit("platform must be youtube or instagram")


def main(argv):
    flags = {a for a in argv if a.startswith("--")}
    args = [a for a in argv if not a.startswith("--")]
    vis = "private"
    if "--visibility" in argv:
        vis = argv[argv.index("--visibility") + 1]
        args = [a for a in args if a != vis]
    if not args:
        print(__doc__)
        return
    cmd = args[0]
    if cmd == "list":
        print(registry.table())
        registry.write_markdown()
    elif cmd == "sync":
        print(registry.sync())
    elif cmd == "lint":
        import lint
        sys.exit(lint.report(registry.read(registry.resolve(args[1]))))
    elif cmd == "status":
        registry.set_status(registry.resolve(args[1]), args[2])
        print("ok")
    elif cmd == "publish":
        cmd_publish(args[1], args[2], "--confirm" in flags, vis)
    elif cmd == "ig-me":
        from publishers import instagram_reels
        m = instagram_reels.me()
        print({"username": m.get("username"), "account_type": m.get("account_type")})
    elif cmd == "ig-refresh":
        from publishers import instagram_reels
        print(instagram_reels.refresh())
    elif cmd == "yt-auth":
        from publishers import youtube_shorts
        youtube_shorts.credentials()
        print("YouTube authorised; token cached in .secrets/")
    else:  # <episode> <stage|all>
        ep_dir, which = registry.resolve(args[0]), args[1]
        ep, out = load(ep_dir)
        names = list(STAGES) if which == "all" else [which]
        if PAID & set(names) and registry.status_of(ep) in ("idea", "scripted") and "--unapproved" not in flags:
            raise SystemExit(f"{ep['id']} is '{registry.status_of(ep)}': approve the script first "
                             f"(python run.py status {ep['id']} approved) before paid generation.")
        for name in names:
            print(f"== {name}")
            STAGES[name](ep, out, "--force" in flags)


if __name__ == "__main__":
    main(sys.argv[1:])
