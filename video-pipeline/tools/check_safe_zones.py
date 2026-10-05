"""Render-time safe-zone check (free, local): DOM text boxes from real Remotion stills vs config/safe_zones.yaml.

    python3 tools/check_safe_zones.py <episode> [--props P] [--profile NAME] [--preset NAME] [--keep-stills]

How: remotion-app/scripts/safe-probe.mjs bundles once and renders stills of the `SafeProbe` composition (= Episode + a probe,
src/SafeProbe.tsx) at key frames. In the browser the probe measures every visible text box (HTML text via Range rects, SVG
<text> boxes; transforms included) plus elements tagged data-safe-kind="art", and logs them. This script runs them through
safe_zones.violations() and writes out/<id>/safe_zone_report.json (+ overlay PNGs of frames with problems in out/<id>/safe_zone/).
Severity: text above the top band or past the sides = error; below the bottom line, under the right rail, or art outside the
bleed box = warn. Frames: 0.6 s (hook), each scene's middle and its last settled frame (all reveals in, no transition), the
render_qa contact-sheet times (20/40/60/80 %) snapped out of transitions, and the last settled frame.
Tolerance: boxes are shrunk by TOL (8 px) per side before the test (line box vs ink, transient entrance motion).
Limits: text baked into images/clips (illustration stills, video) is invisible to the DOM and is not checked; glyph boxes are
line boxes (a little taller than ink); only the sampled frames are checked, not every frame.
--profile NAME: props.json predates the current profile/preset (stale): check a patched copy (out/<id>/safe_zone/props_patched.json)
with that profile's settings and its preset resolved by run.safe_zone(); the real props.json is not touched."""
from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import safe_zones  # noqa: E402

APP = ROOT / "remotion-app"
ERROR_PROBLEMS = ("left of x", "right of x", "above y")
TOL = 8  # px each side: DOM line boxes are taller than the ink, and entrance motion (caption pop 14 px) is transient


def patch_props(props: dict, profile_name: str) -> dict:
    """Copy of props with profile settings + resolved safe zone from config/profiles/<name>.json (what run.py props would write now)."""
    import run
    prof = json.loads((ROOT / "config" / "profiles" / f"{profile_name}.json").read_text())
    p = dict(props)
    p["profile"] = {k: v for k, v in prof.items() if k not in ("palette", "music") and not k.startswith("_")} | {"safe": run.safe_zone(prof)}
    return p


def preset_of(props: dict) -> str:
    """Preset the props were laid out with: profile.safeZone, else the yaml default if a safe zone is present, else the
    pre-preset layout (`shorts_9x16` = DEFAULT_SAFE in profile.ts)."""
    prof = props.get("profile") or {}
    if prof.get("safeZone"):
        return prof["safeZone"]
    return safe_zones.load()["default"] if prof.get("safe") else "shorts_9x16"


def key_frames(props: dict) -> dict:
    """{frame: label}. Settled frames only (outside scene transitions)."""
    tr = int(props.get("transition") or 0)
    total = int(props["totalFrames"])
    scenes = props["scenes"]
    holds = []  # (lo, hi, scene id) where only that scene is on screen
    for i, sc in enumerate(scenes):
        lo = sc["from"] + (tr if i else 0)
        hi = sc["from"] + sc["frames"] - (tr if i < len(scenes) - 1 else 0) - 1
        holds.append((lo, max(lo, hi), sc["id"]))

    def snap(f: int) -> tuple:
        for lo, hi, sid in holds:
            if lo <= f <= hi:
                return f, sid
        lo, hi, sid = min(holds, key=lambda h: min(abs(f - h[0]), abs(f - h[1])))
        return (lo if abs(f - lo) < abs(f - hi) else hi), sid

    out = {}
    fps = props.get("fps", 30)
    for f, why in [(round(0.6 * fps), "hook")] + [(round(total * q), f"render_qa {int(q * 100)}%") for q in (0.2, 0.4, 0.6, 0.8)] + [(total - round(0.8 * fps), "last")]:
        g, sid = snap(f)
        out.setdefault(g, f"{sid} {why}")
    for lo, hi, sid in holds:
        out.setdefault((lo + hi) // 2, f"{sid} mid")
        out.setdefault(max(lo, hi - 2), f"{sid} settled")
    return dict(sorted(out.items()))


def _draw_overlay(png: Path, preset: str, bad: list, dst: Path) -> None:
    from PIL import Image, ImageDraw
    im = Image.open(png).convert("RGB")
    d = ImageDraw.Draw(im, "RGBA")
    d.rectangle(safe_zones.box("text", preset), outline=(0, 170, 0, 255), width=4)
    rail = safe_zones.box("rail", preset)
    if rail:
        d.rectangle(rail, fill=(255, 140, 0, 50), outline=(255, 140, 0, 255), width=3)
    cap = safe_zones.box("caption", preset)
    if cap:
        d.rectangle(cap, outline=(0, 120, 255, 255), width=3)
    for v in bad:
        x, y, w, h = v["rect"]
        col = (230, 0, 0, 255) if v["severity"] == "error" else (255, 0, 200, 255)
        d.rectangle((x, y, x + w, y + h), outline=col, width=5)
    im.save(dst)


def check(props_path: Path, out_dir: Path, preset: str | None = None, keep_stills: bool = False, timeout: int = 180) -> dict:
    t0 = time.time()
    props = json.loads(Path(props_path).read_text())
    preset = preset or preset_of(props)
    frames = key_frames(props)
    work = out_dir / "safe_zone"
    work.mkdir(parents=True, exist_ok=True)
    for old in work.glob("*.png"):
        old.unlink()
    r = subprocess.run(["node", "scripts/safe-probe.mjs", "--props", str(Path(props_path).resolve()), "--frames", ",".join(map(str, frames)),
                        "--out", str(work)], cwd=APP, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"safe-probe failed: {(r.stderr or r.stdout)[-800:]}")
    probe = json.loads((work / "probe.json").read_text())
    issues, per_frame, seen, missing = [], [], {}, []
    for f, label in frames.items():
        rects = probe["frames"].get(str(f))
        if rects is None:
            missing.append(f)
            continue
        bad = []
        shrink = lambda rc: {**rc, "x": rc["x"] + TOL, "y": rc["y"] + TOL, "w": max(0, rc["w"] - 2 * TOL), "h": max(0, rc["h"] - 2 * TOL)}
        for v, rect in ((v, rc) for rc in rects for v in safe_zones.violations([shrink(rc)], preset)):
            v = {**v, "rect": (rect["x"], rect["y"], rect["w"], rect["h"])}
            sev = "error" if v["kind"] == "text" and v["problem"].startswith(ERROR_PROBLEMS) else "warn"
            bad.append({**v, "severity": sev, "text": rect.get("text", "")})
            k = (label.split()[0], v["kind"], rect.get("text", ""), v["problem"])
            if k not in seen:
                seen[k] = len(issues)
                issues.append([sev, "safe_zone", f"{label.split()[0]} f{f}: {v['kind']} '{rect.get('text', '')[:40]}' at x {rect['x']}-{rect['x'] + rect['w']}, "
                                                   f"y {rect['y']}-{rect['y'] + rect['h']}: {v['problem']}"])
        still = Path(probe["stills"].get(str(f), ""))
        overlay = None
        if bad and still.exists():
            overlay = work / f"overlay_f{f:05d}.png"
            _draw_overlay(still, preset, bad, overlay)
        if still.exists() and not keep_stills:
            still.unlink()
        per_frame.append({"frame": f, "label": label, "rects": len(rects), "problems": [{k: v for k, v in b.items()} for b in bad], "overlay": str(overlay) if overlay else None})
    if missing:
        issues.append(["warn", "safe_zone", f"probe returned no measurement for frame(s) {missing}"])
    rep = {"props": str(props_path), "preset": preset, "text_box": safe_zones.box("text", preset), "rail": safe_zones.box("rail", preset),
           "frames_checked": len(per_frame), "rects_checked": sum(p["rects"] for p in per_frame), "seconds": round(time.time() - t0, 1),
           "passed": not any(i[0] == "error" for i in issues), "issues": issues, "frames": per_frame}
    (out_dir / "safe_zone_report.json").write_text(json.dumps(rep, indent=1))
    return rep


def main(argv: list) -> int:
    import argparse
    import registry
    ap = argparse.ArgumentParser(description="render-time safe-zone check (see module docstring)")
    ap.add_argument("episode", nargs="?", help="episode id/ref (report goes to out/<id>/)")
    ap.add_argument("--props", help="props file to check (default out/<id>/props.json)")
    ap.add_argument("--profile", help="check a copy of the props patched with config/profiles/<NAME>.json (stale props)")
    ap.add_argument("--preset", help="preset to check against (default: the one the props were laid out with)")
    ap.add_argument("--keep-stills", action="store_true")
    a = ap.parse_args(argv)
    if not a.episode and not a.props:
        ap.error("give an episode or --props")
    out = ROOT / "out" / registry.read(registry.resolve(a.episode))["id"] if a.episode else Path(a.props).resolve().parent
    props_path = Path(a.props) if a.props else out / "props.json"
    if a.profile:
        (out / "safe_zone").mkdir(parents=True, exist_ok=True)
        patched = out / "safe_zone" / "props_patched.json"
        patched.write_text(json.dumps(patch_props(json.loads(props_path.read_text()), a.profile)))
        props_path = patched
    rep = check(props_path, out, preset=a.preset, keep_stills=a.keep_stills)
    for sev, rid, msg in rep["issues"]:
        print(f"[{sev.upper():5}] {rid}: {msg}")
    errs = sum(1 for i in rep["issues"] if i[0] == "error")
    print(f"safe zones ({rep['preset']}): {'PASS' if rep['passed'] else 'FAIL'}: {rep['frames_checked']} frames, {rep['rects_checked']} boxes, "
          f"{errs} error(s), {len(rep['issues']) - errs} warning(s), {rep['seconds']} s -> {out / 'safe_zone_report.json'}")
    return 0 if rep["passed"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
