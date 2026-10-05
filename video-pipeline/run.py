#!/usr/bin/env python3
"""Episode pipeline CLI.
  python run.py <episode> <stage|all> [--force] [--unapproved] [--force-cost]   stages: tts illustrations keyframes clips props render carousel
    (--force-cost: let the clips stage exceed providers.yaml video.max_clip_cost_usd; the estimate is always printed first)
  python run.py list | sync | lint <ep> | schema-check [<ep>|all] | selfcheck | storyboard <ep> [--json] | status <ep> <status> | publish <ep> <youtube|instagram> [--confirm] [--visibility V]
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

import yaml

PAID = {"tts", "illustrations", "keyframes", "clips"}  # stages that spend money: need an approved script

PAD = 0.45  # seconds of air after each narration line
TR = 9      # transition length in frames (scenes overlap by this much)


def safe_zone(profile) -> dict:
    """Resolve the profile's safe-zone preset (config/safe_zones.yaml) into renderer insets: {top, height, left, right, progressTop[, captionBottom, captionInset]}."""
    cfg = yaml.safe_load((ROOT / "config" / "safe_zones.yaml").read_text())
    name = (profile or {}).get("safeZone") or cfg["default"]
    if name not in cfg["presets"]:
        raise SystemExit(f"unknown safeZone '{name}' (presets: {', '.join(cfg['presets'])})")
    z = cfg["presets"][name]
    out = {"top": z["y_min"], "height": z["y_max"] - z["y_min"], "left": z["x_min"], "right": z["canvas"][0] - z["x_max"], "progressTop": z["progress_top"]}
    if "caption_bottom" in z:  # optional caption band (minimum CSS bottom + side inset)
        out |= {"captionBottom": z["caption_bottom"], "captionInset": z.get("caption_inset", 70)}
    if "right_rail" in z:  # optional right action-rail notch (no text / key subject at x > railX below railFromY)
        out |= {"railX": z["right_rail"]["x_min"], "railFromY": z["right_rail"]["y_from"]}
    return out


def episode_palette(ep: dict) -> dict:
    """The look's colours: the episode's identity (information decides the look) beats the audience profile, which beats the episode style."""
    idn = ep.get("identity")
    if idn:
        return {k: idn["palette"][k] for k in ("bg", "ink", "sunny", "coral", "sky", "mint", "grape", "white")}
    return (PROFILE or {}).get("palette") or ep["style"]["palette"]


def load(ep_dir: Path):
    ep = json.loads((ep_dir / "episode.json").read_text())
    out = ROOT / "out" / ep["id"]
    for d in ("audio", "keyframes", "clips"):
        (out / d).mkdir(parents=True, exist_ok=True)
    return ep, out


def ensure_music(mood: str, ep_id: str) -> str:
    """Audience cards own `music_mood`; the bed is generated offline (tools/gen_music.py) and unique per episode (seed from id)."""
    import zlib
    seed = zlib.crc32(ep_id.encode()) % 97
    rel = f"assets/music/gen_{mood}_{seed}.wav"
    if not (ROOT / rel).exists():
        sys.path.insert(0, str(ROOT / "tools"))
        import gen_music
        gen_music.write_wav(str(ROOT / rel), gen_music.render(mood, 90, seed))
    return rel


def audience_card(ep: dict):
    """Episode field `audience` (kids | curious_adult | older_adult | techie) selects voice, pace, look and lint limits."""
    a = ep.get("audience")
    if not a:
        return None
    f = ROOT / "direction" / "audiences" / f"{a}.yaml"
    if not f.exists():
        raise SystemExit(f"unknown audience '{a}' (expected one of: {', '.join(x.stem for x in (ROOT / 'direction' / 'audiences').glob('*.yaml'))})")
    return yaml.safe_load(f.read_text())


def fill(tpl: str, style: dict) -> str:
    tpl = tpl.replace("{character}", style.get("character", "")).replace("{look}", style.get("look", ""))
    for k, v in (style.get("cast") or {}).items():
        tpl = tpl.replace("{" + k + "}", v)
    return tpl


def stage_tts(ep, out, force):
    tts = load_provider("tts")
    cfg = provider_cfg("tts")
    card = ep.get("_card")
    if card:  # audience card overrides the default voice/pace
        tts.voice_id, tts.speed = card["voice"]["voice_id"], card["voice"].get("speed", tts.speed)
        tts.emotion = card["voice"].get("emotion")
        ov = ep.get("voice_override") or {}
        if "speed" in ov:
            tts.speed = ov["speed"]
        cfg = {**cfg, "voice_override": {**card["voice"], **ov}}
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


COST_KEYS = ("price_per_second", "max_clip_cost_usd")  # providers.yaml video block: cost gate only, never in a cache key
FORCE_COST = False  # --force-cost (read from sys.argv in clip_cost_gate) lets one clip run exceed max_clip_cost_usd


def _key_cfg(kind: str) -> dict:
    """Provider config as used in cache keys: cost-gate fields dropped, so changing a price never re-keys (re-pays) assets."""
    return {k: v for k, v in provider_cfg(kind).items() if k not in COST_KEYS}


def _ep_dir(ep) -> Path:
    if ep.get("_dir"):
        return Path(ep["_dir"])
    for d, o in registry.episodes():  # skips unreadable drafts
        if o.get("id") == ep["id"]:
            return d
    return registry.resolve(ep["id"])


def scene_refs(ep, sc) -> list:
    """Reference stills for a scene (lint.scene_reference_images: visual.reference_images[] or the canon_frame/sheet of
    characters in shot.continuity_ids), resolved against episodes/<dir>/ then the pipeline root. Only character stills we
    made are allowed: files inside episodes/<dir>/refs/ or out/<id>/refs/ (never photos of real people).
    Missing or misplaced file -> SystemExit before any paid call."""
    import lint
    raw = lint.scene_reference_images(ep, sc)
    if not raw:
        return []
    ep_dir = _ep_dir(ep)
    allowed = [(ep_dir / "refs").resolve(), (ROOT / "out" / ep["id"] / "refs").resolve()]
    res = []
    for r in raw:
        p = Path(r)
        cands = [p] if p.is_absolute() else [ep_dir / p, ROOT / p]
        hit = next((c.resolve() for c in cands if c.is_file()), None)
        if hit is None:
            raise SystemExit(f"{sc['id']}: reference image not found: {r} (looked at {', '.join(str(c) for c in cands)})")
        if not any(hit.is_relative_to(a) for a in allowed):
            raise SystemExit(f"{sc['id']}: reference image {r} must be inside episodes/{ep_dir.name}/refs/ or out/{ep['id']}/refs/ "
                             "(our own character stills only; never photos of real people)")
        res.append(hit)
    return res


def clip_cost_gate(n_clips: int, cfg: dict | None = None):
    """Print the estimated spend of the clips about to be generated and refuse (SystemExit) above
    providers.yaml video.max_clip_cost_usd unless --force-cost. Returns the estimate in USD (None if no price)."""
    cfg = cfg if cfg is not None else provider_cfg("video")
    if not n_clips:
        return 0.0
    dur = (cfg.get("init_args") or {}).get("duration", 6)
    model = (cfg.get("init_args") or {}).get("model", "?")
    pps, cap = cfg.get("price_per_second"), cfg.get("max_clip_cost_usd")
    forced = FORCE_COST or "--force-cost" in sys.argv
    if pps is None:
        print(f"cost: {n_clips} clip(s) x {dur}s on {model}, price unknown (no video.price_per_second in providers.yaml)")
        if cap is not None and not forced:
            raise SystemExit("refusing paid clips: max_clip_cost_usd is set but price_per_second is missing; "
                             "add it to providers.yaml or pass --force-cost")
        return None
    est = n_clips * dur * pps
    print(f"cost estimate: {n_clips} clip(s) x {dur}s x ${pps}/s ({model}) = ${est:.2f}"
          + (f" (cap ${cap:.2f})" if cap is not None else " (no cap)"))
    if cap is not None and est > cap + 1e-9:
        if not forced:
            raise SystemExit(f"refusing paid clips: estimate ${est:.2f} exceeds max_clip_cost_usd ${cap:.2f} "
                             "(raise the cap in config/providers.yaml or pass --force-cost)")
        print("--force-cost: proceeding above the cap")
    return est


def stage_keyframes(ep, out, force):
    img = load_provider("image")
    cfg = provider_cfg("image")
    can_sub = bool(getattr(img, "supports_subject_reference", False))
    can_last = None  # asked of the video adapter only when a scene wants a last frame
    for sc in (s for s in ep["scenes"] if s["visual"]["type"] == "clip"
               and (s["visual"].get("keyframe_prompt") or s["visual"].get("last_frame_prompt"))):
        v = sc["visual"]
        refs = scene_refs(ep, sc)
        last_prompt = (v.get("last_frame_prompt") or "").strip()
        if last_prompt and refs:
            raise SystemExit(f"{sc['id']}: last_frame_prompt cannot be combined with reference images on H3 "
                             "(lint rule last_frame_exclusive); drop one")
        if v.get("keyframe_prompt"):
            p = out / "keyframes" / f"{sc['id']}.png"
            prompt = fill(v["keyframe_prompt"], ep["style"])
            if refs and not can_sub:
                print(f"WARNING {sc['id']}: image model {(cfg.get('init_args') or {}).get('model')} takes no subject_reference; "
                      f"keyframe made WITHOUT {refs[0].name}")
            sub = refs[0] if refs and can_sub else None
            extra = [{"subject_reference": cache.file_hash(sub)}] if sub else []  # no ref -> same key as before
            k = cache.key("kf", prompt, cfg, 1234, *extra)
            if not (cache.fresh(p, k) and not force):
                img.generate(prompt, p, seed=1234, **({"subject_reference": sub} if sub else {}))
                cache.mark(p, k)
                print(f"keyframe {sc['id']} -> {p.name}" + (f" (subject_reference {sub.name})" if sub else ""))
        if last_prompt:
            if can_last is None:
                can_last = bool(getattr(load_provider("video"), "supports_last_frame", False))
            if not can_last:
                print(f"WARNING {sc['id']}: video model {(provider_cfg('video').get('init_args') or {}).get('model')} has no "
                      "last_frame input; last_frame_prompt skipped (no end keyframe generated)")
                continue
            lp = out / "keyframes" / f"{sc['id']}_last.png"
            lprompt = fill(last_prompt, ep["style"])
            lk = cache.key("kf_last", lprompt, cfg, 1234)
            if cache.fresh(lp, lk) and not force:
                continue
            img.generate(lprompt, lp, seed=1234)
            cache.mark(lp, lk)
            print(f"last frame {sc['id']} -> {lp.name}")


def stage_illustrations(ep, out, force):
    img = load_provider("image")
    (out / "illustrations").mkdir(exist_ok=True)
    for sc in (s for s in ep["scenes"] if s["visual"]["type"] in ("illustration", "photo")):
        p = out / "illustrations" / f"{sc['id']}.png"
        suffix = ep["style"].get("photo_style", "") if sc["visual"]["type"] == "photo" else ep["style"].get("illustration_style", "")
        prompt = fill(sc["visual"]["prompt"], ep["style"]) + (", " + suffix if suffix else "")
        k = cache.key("ill", prompt, provider_cfg("image"), 4242)
        if cache.fresh(p, k) and not force:
            continue
        img.generate(prompt, p, seed=4242)
        cache.mark(p, k)
        print(f"illustration {sc['id']} -> {p.name}")


def stage_clips(ep, out, force):
    vid = load_provider("video")
    kcfg = _key_cfg("video")
    can_last = bool(getattr(vid, "supports_last_frame", False))
    jobs = []  # plan first so the cost gate sees exactly the clips that will be paid for
    for sc in (s for s in ep["scenes"] if s["visual"]["type"] == "clip"):
        p = out / "clips" / f"{sc['id']}.mp4"
        kf = out / "keyframes" / f"{sc['id']}.png"
        prompt = fill(sc["visual"]["motion_prompt"], ep["style"])
        lf = None
        if (sc["visual"].get("last_frame_prompt") or "").strip():
            import lint
            if lint.scene_reference_images(ep, sc):
                raise SystemExit(f"{sc['id']}: last_frame_prompt cannot be combined with reference images on H3 "
                                 "(lint rule last_frame_exclusive); drop one")
            if not can_last:
                print(f"WARNING {sc['id']}: video model {(kcfg.get('init_args') or {}).get('model')} has no last_frame "
                      "input; clip generated from the first frame only (last_frame_prompt ignored)")
            else:
                lf = out / "keyframes" / f"{sc['id']}_last.png"
                if not lf.exists():
                    raise SystemExit(f"{sc['id']}: last frame {lf.name} missing; run the keyframes stage first")
        extra = [{"last_frame": cache.file_hash(lf)}] if lf else []  # no last frame -> same key as before
        k = cache.key("clip", prompt, cache.file_hash(kf), kcfg, *extra)
        if cache.fresh(p, k) and not force:
            continue
        jobs.append((sc, p, kf, lf, prompt, k))
    clip_cost_gate(len(jobs))
    for sc, p, kf, lf, prompt, k in jobs:
        vid.generate(prompt, p, first_frame=kf if kf.exists() else None, **({"last_frame": lf} if lf else {}))
        cache.mark(p, k)
        print(f"clip {sc['id']} -> {p.name}" + (f" (last_frame {lf.name})" if lf else ""))


PROFILE = None  # set from --profile=<name>; see config/profiles/<name>.json
SUFFIX = ""     # "" for the default look, "_<profile>" otherwise (keeps variants side by side)

# Cold-open bridges the renderer draws (Episode.tsx + Bridges.tsx): default frames and the clamp the renderer honours.
# freeze-rewind: hold + scrub-back segment (12-24 f); j-cut: narration lead under the cold-open tail (6-36 f); question-card: card hold 0.8-1.5 s.
from brain import BRIDGE_FRAMES  # (default, min, max) per bridge; single source in brain.py


def bridge_plan(cold_open, scenes, t, tr, fps):
    """Resolve direction.cold_open into props.coldOpen and the timeline: segment bridges (freeze-rewind, question-card) insert their
    frames at the seam with hard cuts (later scenes shift by frames + tr); a j-cut leads the first explainer narration and only
    lengthens the last cold-open scene if its own voice would overlap the lead. Mutates scenes' from/frames; returns (coldOpen|None, t)."""
    co = cold_open or {}
    ids = [s["id"] for s in scenes]
    sids = [i for i in co.get("scene_ids") or [] if i in ids]
    if not co.get("bridge") or not sids:
        return None, t
    seam = ids.index(sids[-1])
    plan = {"bridge": co["bridge"], "sceneIds": sids, "seam": seam, "frames": 0, "lead": 0}
    if co.get("question"):
        plan["question"] = co["question"]
    if co["bridge"] not in BRIDGE_FRAMES or seam >= len(scenes) - 1:
        return plan, t  # scene-built bridges (match-cut, pull-back, narrator-step-in) or no explainer after the cold open: nothing to insert
    dflt, lo, hi = BRIDGE_FRAMES[co["bridge"]]
    n = max(lo, min(hi, int(co.get("bridge_frames") or dflt)))

    def shift(k, by):
        for s in scenes[k:]:
            s["from"] += by
        return t + by

    if co["bridge"] == "j-cut":
        cur, nxt = scenes[seam], scenes[seam + 1]
        voice_end = cur["from"] + (round(cur["words"][-1]["e"] * fps) + 4 if cur["words"] else 0)
        ext = max(0, voice_end + 4 - (nxt["from"] - n))  # keep the cold open's own line clear of the lead
        if ext:
            cur["frames"] += ext
            t = shift(seam + 1, ext)
        plan["lead"] = max(0, min(n, nxt["from"]))
    else:
        plan["frames"] = n
        t = shift(seam + 1, n + tr)  # hard cut in and out of the segment instead of one tr-frame overlap
        if co["bridge"] == "freeze-rewind":
            plan["hold"] = round(n * 0.4)
            plan["lead"] = n - plan["hold"]  # VO enters on the scrub-back
        elif co["bridge"] == "question-card" and not co.get("question"):
            plan["question"] = ""  # lint dir_bridge_params errors on this; render an empty card rather than crash
    return plan, t


def stage_props(ep, out, force):
    fps = ep["format"]["fps"]
    pub = ROOT / "remotion-app" / "public" / ep["id"]
    pub.mkdir(parents=True, exist_ok=True)
    tr = int((PROFILE or {}).get("transitionFrames", TR))  # profile owns the cut feel (storybook snappier, clean calmer)
    scenes, t = [], 0
    for sc in ep["scenes"]:
        a = json.loads((out / "audio" / f"{sc['id']}.json").read_text())
        frames = round((a["duration"] + PAD) * fps)
        shutil.copy(out / "audio" / f"{sc['id']}.mp3", pub / f"{sc['id']}.mp3")
        v = dict(sc["visual"])
        if v["type"] in ("illustration", "photo"):
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
        t += frames - tr  # next scene overlaps by the transition length
    t += tr
    cold_open, t = bridge_plan((ep.get("direction") or {}).get("cold_open"), scenes, t, tr, fps)
    if cold_open and cold_open["bridge"] == "freeze-rewind":  # optional rewind sound: only if an asset exists, else silent
        rw = next((p for p in sorted((ROOT / "assets" / "sfx").glob("rewind.*")) if p.suffix in (".wav", ".mp3")), None) if (ROOT / "assets" / "sfx").exists() else None
        if rw:
            shutil.copy(rw, pub / rw.name)
            cold_open["sfx"] = f"{ep['id']}/{rw.name}"
    music = None
    mcfg = (PROFILE or {}).get("music") or ep.get("music")
    if (ep.get("_card") or {}).get("music_mood"):  # card decides the mood; profile/ep only supply volume
        mcfg = {"volume": 0.14, **(mcfg or {}), "file": ensure_music(ep["_card"]["music_mood"], ep["id"])}
    if mcfg:
        src = ROOT / mcfg["file"]
        shutil.copy(src, pub / ("music" + SUFFIX + src.suffix))
        music = {"src": f"{ep['id']}/music{SUFFIX}{src.suffix}", "volume": mcfg.get("volume", 0.13)}
    palette = episode_palette(ep)
    props = {"title": ep["title"], "style": palette, "profile": {k: v for k, v in (PROFILE or {}).items() if k not in ("palette", "music") and not k.startswith("_")} | {"safe": safe_zone(PROFILE)}, "disclosure": ep.get("disclosure"), "music": music, **({"identity": ep["identity"]} if ep.get("identity") else {}),
             "transition": tr,
             "sponsor": ep.get("sponsor"), "scenes": scenes, "totalFrames": t, "fps": fps,
             "width": ep["format"]["width"], "height": ep["format"]["height"]}
    if cold_open:
        props["coldOpen"] = cold_open
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
                    "loudnorm=I=-14:TP=-2.0:LRA=11", "-c:a", "aac", "-b:a", "192k", str(loud)], check=True)
    loud.replace(final)
    try:  # contact sheet + loudness/format report (DESIGN_SYSTEM.md sections 7-8); never blocks a render
        import verify
        rq = verify.render_qa(ep, final, SUFFIX)
        print(f"render QA: {rq['duration_s']}s {rq['size']} {rq['lufs']} LUFS peak {rq['peak_dbfs']} dBFS; contact sheet {rq['contact_sheet']}")
        for sev, rid, msg in rq["issues"]:
            print(f"  [{sev.upper()}] {rid}: {msg}")
    except Exception as e:
        print(f"render QA skipped: {e}")
    print("rendered", final)
    registry.advance(ROOT / "episodes" / ep["id"], "rendered")


def stage_thumbs(ep, out, force):
    """YouTube thumbnail (1280x720) + Reels/Shorts cover (1080x1920) from a frame of the finished video + packaging.thumbnail."""
    pk = (ep.get("packaging") or {})
    th = pk.get("thumbnail")
    if not th:
        print("no packaging.thumbnail; skipping")
        return
    props = json.loads((out / "props.json").read_text())
    sc = next((x for x in props["scenes"] if x["id"] == th.get("scene")), props["scenes"][len(props["scenes"]) // 2])
    frame = sc["from"] + int(sc["frames"] * th.get("at", 0.7))
    pub = ROOT / "remotion-app" / "public" / ep["id"]
    pub.mkdir(parents=True, exist_ok=True)
    hero = pub / "thumb_hero.png"
    hp = json.loads(json.dumps(props))  # clean hero: same scene frame, but no captions / progress bar
    hp.setdefault("profile", {})["progress"] = False
    for x in hp["scenes"]:
        x["visual"]["captions"] = False
        if x["id"] == sc["id"]:  # hero scene: no headline / readout text, just the diagram
            for st in x["visual"].get("reveal", []):
                st.pop("caption", None)
                st.pop("readout", None)
            x["visual"].pop("note", None)
    hpj = out / "thumb_hero_props.json"
    hpj.write_text(json.dumps(hp))
    subprocess.run(["npx", "remotion", "still", "src/index.ts", "Episode", str(hero), f"--props={hpj}", f"--frame={frame}"],
                   cwd=ROOT / "remotion-app", check=True, capture_output=True)
    palette = episode_palette(ep)
    tp = {"title": th["text"], "kicker": th.get("kicker", ""), "image": f"{ep['id']}/thumb_hero.png", "palette": palette,
          "accent": palette.get("coral", "#E85B45"), "badge": th.get("badge", "HOW IT WORKS"),
          "focusY": th.get("focusY", 0.42), "zoom": th.get("zoom", 1.0)}
    pj = out / "thumb_props.json"
    pj.write_text(json.dumps(tp))
    for comp, name in (("ThumbYT", "thumb_youtube.png"), ("ThumbCover", "thumb_cover.png")):
        subprocess.run(["npx", "remotion", "still", "src/index.ts", comp, str(out / name), f"--props={pj}"],
                       cwd=ROOT / "remotion-app", check=True, capture_output=True)
        print(f"thumb {name}")


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
        props.write_text(json.dumps({"slide": sl, "index": i, "total": len(slides), "style": episode_palette(ep)}))
        subprocess.run(["npx", "remotion", "still", "src/index.ts", "Slide", str(cdir / f"slide{i + 1}.png"),
                        f"--props={props}"], cwd=app, check=True, capture_output=True)
    print(f"carousel: {len(slides)} slides in {cdir}")


STAGES = {"tts": stage_tts, "illustrations": stage_illustrations, "keyframes": stage_keyframes, "clips": stage_clips,
          "props": stage_props, "render": stage_render, "carousel": stage_carousel, "thumbs": stage_thumbs}

def stage_publish_dry(ep, platform, visibility):
    pk = ep.get("packaging")
    if pk:  # new-style episodes: copy comes from the linted packaging block
        if platform == "youtube":
            return {"title": pk["title"], "description": pk["description"], "tags": pk.get("tags", [])}
        return {"caption": pk["instagram_caption"]}
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
    sha = registry.sha256(video)
    if ep.get("reviewed_sha256") and ep["reviewed_sha256"] != sha and "--allow-changed" not in sys.argv:
        raise SystemExit("REFUSED: final.mp4 differs from the render the owner reviewed "
                         f"(reviewed {ep['reviewed_sha256'][:12]}, now {sha[:12]}). Review the new file and run: run.py status {ep['id']} reviewed")
    print(f"file sha256: {sha[:16]}...")
    print(f"PUBLISH {platform} | {ep['id']} | visibility={visibility}")
    print(json.dumps(pub, indent=2, ensure_ascii=False))
    if not confirm:
        print("DRY RUN - nothing sent. Re-run with --confirm to actually publish.")
        return
    if platform == "youtube":
        from publishers import youtube_shorts
        r = youtube_shorts.upload(video, pub["title"], pub["description"], pub.get("tags", []), visibility, synthetic=True)
        print("uploaded:", r)
        thumb = ROOT / "out" / ep["id"] / "thumb_youtube.png"
        if thumb.exists():
            print("  ", youtube_shorts.set_thumbnail(r["id"], thumb))
        registry.add_post(ep_dir, "youtube", r["url"], r["privacy"], sha)
    elif platform == "instagram":
        from publishers import instagram_reels, tunnel_host
        instagram_reels.me()  # fail fast on a bad/expired token before uploading anything
        cover = ROOT / "out" / ep["id"] / "thumb_cover.png"
        extra = {"cover.png": cover} if cover.exists() else None
        url, handle = tunnel_host.host(video, f"{ep['id']}.mp4", extra=extra)
        try:
            cover_url = url.rsplit("/", 1)[0] + "/cover.png" if extra else None
            r = instagram_reels.publish_reel(url, pub["caption"], cover_url=cover_url)
        finally:
            tunnel_host.delete(handle)
        print("published:", r)
        registry.add_post(ep_dir, "instagram", r["url"], "public", sha)
    else:
        raise SystemExit("platform must be youtube or instagram")


def cmd_ready(ref):
    """Pre-flight for posting: prints READY/BLOCKED per platform with the exact next step."""
    import lint
    ep_dir = registry.resolve(ref)
    ep = registry.read(ep_dir)
    video = ROOT / "out" / ep["id"] / "final.mp4"
    common, ig, yt = [], [], []
    if video.exists():
        probe = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                         "stream=width,height:format=duration,size", "-of", "json", str(video)])
        j = json.loads(probe)
        w, h, dur = j["streams"][0]["width"], j["streams"][0]["height"], float(j["format"]["duration"])
        if (w, h) != (1080, 1920):
            common.append(f"video is {w}x{h}, expected 1080x1920")
        if not (5 <= dur <= 90):
            common.append(f"duration {dur:.0f}s outside 5-90s")
        print(f"video: {w}x{h}, {dur:.1f}s, {int(j['format']['size']) / 1e6:.1f} MB")
    else:
        common.append("no rendered video (run: run.py %s all)" % ep["id"])
    if any(i[0] == "error" for i in lint.run(ep)):
        common.append("lint errors (run: run.py lint %s)" % ep["id"])
    if registry.status_of(ep) not in ("reviewed", "scheduled", "posted"):
        common.append(f"status is '{registry.status_of(ep)}': watch it, then run: run.py status {ep['id']} reviewed")
    pk = ep.get("packaging") or {}
    pub = ep.get("publish") or {}
    if pk:
        if not pk.get("instagram_caption"):
            ig.append("no packaging.instagram_caption")
        if not (pk.get("title") and pk.get("description")):
            yt.append("no packaging.title / description")
        import packaging as _pk
        bad = [i for i in _pk.run(ep) if i[0] == "error"]
        if bad:
            common.append("packaging errors: " + "; ".join(f"{b[1]}" for b in bad))
        if not (ROOT / "out" / ep["id"] / "thumb_youtube.png").exists():
            yt.append("no thumbnail yet (run: run.py %s thumbs)" % ep["id"])
        if not (ROOT / "out" / ep["id"] / "thumb_cover.png").exists():
            ig.append("no Reels cover yet (run: run.py %s thumbs)" % ep["id"])
    else:
        if not pub.get("instagram"):
            ig.append("no publish.instagram caption")
        if not pub.get("youtube"):
            yt.append("no publish.youtube title/description")
    # Instagram: token + tunnel binary
    try:
        from publishers import instagram_reels, tunnel_host
        m = instagram_reels.me()
        print(f"instagram: token OK for @{m.get('username')} ({m.get('account_type')})")
    except Exception as e:
        ig.append(f"instagram token: {str(e)[:140]}")
    if not (ROOT / ".bin" / "cloudflared").exists():
        ig.append("cloudflared binary missing in .bin/ (needed for the temporary public video link)")
    # YouTube: oauth client + cached token
    sec = ROOT / ".secrets"
    if not (sec / "youtube_client.json").exists():
        yt.append("missing .secrets/youtube_client.json (Google OAuth 'Desktop app' client)")
    elif not (sec / "youtube_token.json").exists():
        yt.append("not signed in yet: run: run.py yt-auth")
    for name, issues in (("Instagram Reels", ig), ("YouTube Shorts", yt)):
        blockers = common + issues
        print(f"{name}: {'READY' if not blockers else 'BLOCKED'}")
        for b in blockers:
            print("   -", b)


def main(argv):
    global PROFILE, SUFFIX
    for a in argv:  # --profile=<name> loads config/profiles/<name>.json and writes props_<name>.json / final_<name>.mp4
        if a.startswith("--profile="):
            name = a.split("=", 1)[1]
            PROFILE = json.loads((ROOT / "config" / "profiles" / f"{name}.json").read_text())
            SUFFIX = "_" + name
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
    elif cmd == "identity":  # per-episode visual identity: run.py identity list | pick <ep> [--info T] [--archetype A] [--palette A|B] [--seed N] [--dry] | show <ep>
        import identity
        sys.exit(identity.main(argv[argv.index("identity") + 1:]))
    elif cmd == "animatic":  # free placeholder preview of the whole episode before paid media: run.py animatic <ep> [--render]
        import animatic
        sys.exit(animatic.main(args[1:] + (["--render"] if "--render" in flags else [])))
    elif cmd == "live":  # read-only local server for the web UI's Live runs view: run.py live [--port 8765]
        import live_server
        sys.exit(live_server.main(argv[argv.index("live") + 1:]))
    elif cmd == "director-status":  # live view of the running/last Director run (state, stage, time, per-call durations)
        import director
        sys.exit(director.status())
    elif cmd == "manifest":  # free plan of what a build would generate and cost: run.py manifest <ep> [--json]
        import manifest
        sys.exit(manifest.main(args[1:] + (["--json"] if "--json" in flags else [])))
    elif cmd == "storyboard":  # generated scene-by-scene storyboard + decision map (read-only, free): out/<id>/storyboard.md
        import storyboard
        sys.exit(storyboard.main(args[1:]))
    elif cmd == "scene":  # validated, reasoned, logged scene edit: run.py scene <ep> <sid> set|unset <path> [<value>] --reason "..."
        import scene_edit
        sys.exit(scene_edit.main(argv[argv.index("scene") + 1:]))
    elif cmd == "decisions":  # the append-only decision log of one episode (optionally one scene)
        import scene_edit
        sys.exit(scene_edit.show(args[1], args[2] if len(args) > 2 else None))
    elif cmd == "selfcheck":  # free consistency guard: schema + lint gate + checklist-vs-code + doc refs
        import selfcheck
        sys.exit(selfcheck.main())
    elif cmd == "schema-check":  # shape check of every (or one) episode.json against direction/episode.schema.json
        import lint
        dirs = [registry.resolve(a) for a in args[1:] if a != "all"] or registry.episode_dirs()
        bad = 0
        for d in dirs:
            ep_, err = registry.read_safe(d)
            iss = lint.schema_issues(ep_, limit=20) if ep_ is not None else [("error", "schema", err)]
            bad += bool(iss)
            print(f"{'FAIL' if iss else 'ok  '} {d.name}")
            for _, _, m in iss:
                print(f"       {m}")
        sys.exit(1 if bad else 0)
    elif cmd == "status":
        registry.set_status(registry.resolve(args[1]), args[2], skip_verify="--skip-verify" in flags)
        print("ok")
    elif cmd == "publish":
        cmd_publish(args[1], args[2], "--confirm" in flags, vis)
    elif cmd == "ready":
        for r in args[1:] or [d.name for d in registry.episode_dirs()]:
            print(f"== {r}")
            cmd_ready(r)
    elif cmd == "ig-me":
        from publishers import instagram_reels
        m = instagram_reels.me()
        print({"username": m.get("username"), "account_type": m.get("account_type")})
    elif cmd == "ig-refresh":
        from publishers import instagram_reels
        print(instagram_reels.refresh())
    elif cmd == "verify":
        import verify
        sys.exit(verify.main(args[1]))
    elif cmd == "direction":
        import brain
        sys.exit(brain.main(argv[argv.index("direction") + 1:]))
    elif cmd == "brief":
        import brief as _brief
        sys.exit(_brief.main(argv[argv.index("brief") + 1:]))
    elif cmd == "research":
        import research as _research
        sys.exit(_research.main(argv[argv.index("research") + 1:]))
    elif cmd == "outline":
        import outline as _outline
        sys.exit(_outline.main(argv[argv.index("outline") + 1:]))
    elif cmd == "director":
        import director
        director.main(argv[argv.index("director") + 1:])
    elif cmd == "gates":
        # run.py gates <ep> — merge gate_report + lint + verify findings into one view
        import verify as _verify
        import registry as _reg
        ep_id = args[1]
        ep_dir = _reg.resolve(ep_id)
        ep_ = _reg.read(ep_dir)
        approved, report = _verify.gates_view(ep_id, ep_)
        print(report)
        sys.exit(0 if approved else 1)
    elif cmd == "framecheck":
        # run.py framecheck <ep> — frame QA on the latest render
        ep_id = args[1]
        video = ROOT / "out" / ep_id / "final.mp4"
        if not video.exists():
            raise SystemExit(f"no render yet at {video}; run `run.py {ep_id} render` first")
        qa_out = ROOT / "out" / ep_id / "frame_qa.json"
        sys.path.insert(0, str(ROOT / "tools"))
        import frame_qa
        sys.exit(frame_qa.main([str(video), "--out", str(qa_out), "--episode", ep_id]))
    elif cmd == "mix":
        # run.py mix <ep> — mix narration + music → out/<ep>/mix.mp3 + audio_qa.json
        ep_id = args[1]
        out_ep = ROOT / "out" / ep_id
        out_ep.mkdir(parents=True, exist_ok=True)
        audio_dir = out_ep / "audio"
        narration_files = sorted(audio_dir.glob("*.mp3")) if audio_dir.exists() else []
        if not narration_files:
            raise SystemExit(f"no narration mp3 files in {audio_dir}; run tts first")
        ep_dir_ = registry.resolve(ep_id)
        ep_ = registry.read(ep_dir_)
        card_ = audience_card(ep_)
        mood = (card_ or {}).get("music_mood", "calm")
        music_path = ROOT / ensure_music(mood, ep_id)
        mix_out = out_ep / "mix.mp3"
        qa_out = out_ep / "audio_qa.json"
        sys.path.insert(0, str(ROOT / "tools"))
        import mix_audio
        mix_argv = [str(f) for f in narration_files] + ["--music", str(music_path), "--out", str(mix_out), "--qa", str(qa_out)]
        sys.exit(mix_audio.main(mix_argv))
    elif cmd == "transcribe":
        # run.py transcribe <ep> — transcribe mix.mp3 (advisory; warns if parakeet not ready)
        ep_id = args[1]
        out_ep = ROOT / "out" / ep_id
        audio_in = out_ep / "mix.mp3"
        if not audio_in.exists():
            # fall back to first narration file
            audio_dir = out_ep / "audio"
            mp3s = sorted(audio_dir.glob("*.mp3")) if audio_dir.exists() else []
            if not mp3s:
                raise SystemExit(f"no audio to transcribe in {out_ep}; run mix or tts first")
            audio_in = mp3s[0]
        words_out = out_ep / "words.json"
        sys.path.insert(0, str(ROOT / "tools"))
        import transcribe as _transcribe
        targs = [str(audio_in), "--out", str(words_out)]
        # optional script for WER check
        script_file = ROOT / "episodes" / ep_id / "narration.txt"
        if script_file.exists():
            targs += ["--script", str(script_file)]
        rc = _transcribe.main(targs)
        if rc != 0:
            print("transcribe: advisory warning — continuing (parakeet model may not be cached yet)")
        sys.exit(0)  # always advisory
    elif cmd == "review":
        # run.py review <ep> --tags keep,... --understood yes|no [--note TEXT]
        ep_id = args[1]
        import review as _review
        rc = _review._cli([ep_id] + argv[argv.index("review") + 2:])
        sys.exit(rc)
    elif cmd == "slice":
        # run.py slice <id> --text "<owner request>" [--question "..."]... [--force]
        # Runs brief -> research -> outline -> director --from-brief -> lint -> gates
        # Resumable: skips layers whose output already exists unless --force.
        # Prints per-layer wall time into out/<id>/metrics.json.
        import time as _time
        import json as _json
        import brief as _brief_mod
        import research as _research_mod
        import outline as _outline_mod
        import director as _director_mod
        import lint as _lint_mod
        import verify as _verify_mod

        ep_id = args[1]
        force = "--force" in flags
        ep_dir_s = ROOT / "episodes" / ep_id
        out_dir_s = ROOT / "out" / ep_id
        out_dir_s.mkdir(parents=True, exist_ok=True)

        metrics: list = []
        def _run_layer(name: str, fn):
            t = _time.time()
            rc = fn()
            secs = round(_time.time() - t, 2)
            metrics.append({"stage": name, "seconds": secs})
            (out_dir_s / "metrics.json").write_text(_json.dumps(metrics, indent=2))
            print(f"[{name}] {secs:.1f}s")
            if rc not in (None, 0):
                raise SystemExit(f"slice stopped at {name} (exit {rc}); fix it, then rerun the same command (finished layers are skipped)")
            return rc

        # Parse --text and --question flags from argv after 'slice <id>'
        slice_rest = argv[argv.index("slice") + 2:]
        slice_text, slice_questions = "", []
        si = 0
        while si < len(slice_rest):
            tok = slice_rest[si]
            if tok in ("--text",) and si + 1 < len(slice_rest):
                slice_text = slice_rest[si + 1]; si += 2
            elif tok.startswith("--text="):
                slice_text = tok[7:]; si += 1
            elif tok in ("--question",) and si + 1 < len(slice_rest):
                slice_questions.append(slice_rest[si + 1]); si += 2
            elif tok.startswith("--question="):
                slice_questions.append(tok[11:]); si += 1
            else:
                si += 1

        if not slice_text and not (ep_dir_s / "brief.json").exists():
            raise SystemExit("slice: --text is required to create the brief (or run `run.py brief` first)")

        # L1 brief
        brief_path = ep_dir_s / "brief.json"
        if force or not brief_path.exists():
            brief_argv = [ep_id, "--text", slice_text] + [x for q in slice_questions for x in ("--question", q)]
            _run_layer("brief", lambda: _brief_mod.main(brief_argv))
        else:
            print(f"[brief] skip (exists)")

        # L2 research
        research_path = ep_dir_s / "research.json"
        if force or not research_path.exists():
            _run_layer("research", lambda: _research_mod.main([ep_id] + (["--allow-unsupported"] if "--allow-unsupported" in sys.argv else [])))
        else:
            print(f"[research] skip (exists)")

        # L3 outline
        outline_path = ep_dir_s / "outline.json"
        if force or not outline_path.exists():
            _run_layer("outline", lambda: _outline_mod.main([ep_id]))
        else:
            print(f"[outline] skip (exists)")

        # L4 director --from-brief
        episode_path = ep_dir_s / "episode.json"
        if force or not episode_path.exists():
            _run_layer("director", lambda: _director_mod.run_from_brief(ep_id))
        else:
            print(f"[director] skip (exists)")

        # L5 lint
        if episode_path.exists():
            ep_ = _json.loads(episode_path.read_text())
            lint_issues = list(_lint_mod.run(ep_))
            n_err = sum(1 for i in lint_issues if i[0] == "error")
            n_warn = sum(1 for i in lint_issues if i[0] == "warn")
            print(f"[lint] {n_err} errors, {n_warn} warnings")

        # L6 gates (lint + gate_report; verify is a paid/slow pass — not run in slice)
        if episode_path.exists():
            ep_ = _json.loads(episode_path.read_text())
            approved, report = _verify_mod.gates_view(ep_id, ep_)
            print(report)
            if not approved:
                print(f"\nStopped: gate errors found. Fix, then run: python run.py gates {ep_id}")
                print(f"When gates clear and script is approved: python run.py {ep_id} all")
                sys.exit(1)

        print(f"\nSlice complete. Status: gates clear.")
        print(f"Next: review the script, approve it (`run.py status {ep_id} approved`), then `run.py {ep_id} all`")
        sys.exit(0)
    elif cmd == "yt-auth":
        from publishers import youtube_shorts
        youtube_shorts.credentials()
        print("YouTube authorised; token cached in .secrets/")
    else:  # <episode> <stage|all>
        ep_dir, which = registry.resolve(args[0]), args[1]
        ep, out = load(ep_dir)
        ep["_card"] = audience_card(ep)
        if ep["_card"] and PROFILE is None:  # audience picks the visual profile (no filename suffix)
            PROFILE = json.loads((ROOT / "config" / "profiles" / f"{ep['_card']['remotion_profile']}.json").read_text())
        names = list(STAGES) if which == "all" else [which]
        if PAID & set(names) and registry.status_of(ep) in ("idea", "scripted") and "--unapproved" not in flags:
            raise SystemExit(f"{ep['id']} is '{registry.status_of(ep)}': approve the script first "
                             f"(python run.py status {ep['id']} approved) before paid generation.")
        for name in names:
            print(f"== {name}")
            import runlog
            runlog.update(step=name)
            STAGES[name](ep, out, "--force" in flags)


_RECORDED = {"director", "verify", "manifest", "animatic", "publish"}


def _recorded_label(argv: list):
    """Commands worth a live run record (long, or they spend money): the few above and `<episode> <stage|all>`."""
    if not argv or argv[0].startswith("-"):
        return None
    if argv[0] in _RECORDED:
        return argv[0]
    if len(argv) >= 2 and (argv[1] in STAGES or argv[1] == "all") and (ROOT / "episodes" / argv[0] / "episode.json").exists():
        return f"{argv[0]} {argv[1]}"
    return None


if __name__ == "__main__":
    import runlog
    _label = _recorded_label(sys.argv[1:])
    if _label:
        runlog.start(_label, sys.argv[1:])
    try:
        main(sys.argv[1:])
    except SystemExit as _e:
        runlog.finish(code=_e.code if isinstance(_e.code, int) else (0 if _e.code is None else 1), error=_e.code if isinstance(_e.code, str) else None)
        raise
    except BaseException as _e:
        runlog.finish(code=1, error=f"{type(_e).__name__}: {_e}")
        raise
    else:
        runlog.finish(code=0)
