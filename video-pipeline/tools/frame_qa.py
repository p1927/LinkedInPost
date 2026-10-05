"""tools/frame_qa.py – F1 rendered-frame quality analysis.

Usage:
    python tools/frame_qa.py <video.mp4> --out out/<id>/frame_qa.json [--episode <id>]

Checks (all advisory=True except flash ERROR which is hard):
  luma_stats      YAVG/YMIN/YMAX per sample frame via ffmpeg signalstats
  luma_jump       scene-to-scene mean-luma delta > 0.35 → warn
  pixel_clipping  > 2 % pixels at luma ≤ 16 or ≥ 235 → warn
  black_frame     blackdetect (d>0.1 s, 98 % black) → warn
  freeze_frame    freezedetect (>2 s no motion) → warn
  flash_wcag231   > 3 complete flashes/s (WCAG 2.3.1) → ERROR, advisory=False
  safe_zone_not_run  advisory info (needs Remotion props.json)
  contrast_not_measured  advisory info (needs DOM text-box positions)

Sub-checks run in a thread pool. Target < 2 min for a 90 s video.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
import gate_report as gr


# ── ffprobe helpers ───────────────────────────────────────────────────────────

def _probe(path: str) -> dict:
    r = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_streams", "-show_format", "-of", "json", path],
        capture_output=True, text=True, check=True, timeout=30,
    )
    return json.loads(r.stdout)


def _video_stream(info: dict) -> dict:
    for s in info["streams"]:
        if s.get("codec_type") == "video":
            return s
    raise RuntimeError("no video stream found")


def _duration(info: dict) -> float:
    s = _video_stream(info)
    v = s.get("duration") or info.get("format", {}).get("duration", "0")
    return float(v)


def _fps(info: dict) -> float:
    s = _video_stream(info)
    num, den = map(int, s.get("r_frame_rate", "30/1").split("/"))
    return num / max(1, den)


def _wh(info: dict) -> tuple[int, int]:
    s = _video_stream(info)
    return int(s["width"]), int(s["height"])


# ── signalstats: per-frame luma via ffprobe lavfi ────────────────────────────

def _signalstats(path: str) -> list[dict]:
    """Per-frame {frame_n, pts, YAVG, YMIN, YMAX} for the full video."""
    cmd = [
        "ffprobe", "-f", "lavfi",
        "-i", f"movie={path},signalstats",
        "-show_frames", "-select_streams", "v",
        "-show_entries",
        "frame=pkt_pts_time,best_effort_timestamp_time:"
        "frame_tags=lavfi.signalstats.YAVG,lavfi.signalstats.YMIN,lavfi.signalstats.YMAX",
        "-of", "json",
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if r.returncode != 0:
        raise RuntimeError(f"signalstats failed: {r.stderr[-400:]}")
    out = []
    for i, f in enumerate(json.loads(r.stdout).get("frames", [])):
        tags = f.get("tags", {})
        t = float(
            f.get("best_effort_timestamp_time")
            or f.get("pkt_pts_time")
            or 0
        )
        try:
            out.append({
                "frame_n": i,
                "pts": t,
                "YAVG": float(tags.get("lavfi.signalstats.YAVG", 0)),
                "YMIN": float(tags.get("lavfi.signalstats.YMIN", 0)),
                "YMAX": float(tags.get("lavfi.signalstats.YMAX", 0)),
            })
        except (ValueError, TypeError):
            pass
    return out


# ── WCAG 2.3.1 flash check ────────────────────────────────────────────────────

_FLASH_THRESHOLD = 0.10   # 10 % luma swing on 0-1 scale
_MAX_FLASHES_PER_S = 3    # WCAG limit (complete oscillation pairs)


def _flash_check(frames: list[dict], fps: float, report_path: Path) -> list[dict]:
    """Return windows where complete flash pairs > 3 per second; writes gate entries."""
    lumas = [f["YAVG"] / 255.0 for f in frames]
    max_sec = int(frames[-1]["pts"]) + 1 if frames else 0
    bad_windows: list[dict] = []

    for sec in range(max_sec):
        window_lumas = [l for f, l in zip(frames, lumas) if sec <= f["pts"] < sec + 1]
        if len(window_lumas) < 2:
            continue

        # count direction changes above threshold; 2 changes = 1 complete flash pair
        direction_changes = 0
        last_sign = 0
        for prev, curr in zip(window_lumas, window_lumas[1:]):
            delta = curr - prev
            if abs(delta) >= _FLASH_THRESHOLD:
                new_sign = 1 if delta > 0 else -1
                if new_sign != last_sign:
                    direction_changes += 1
                    last_sign = new_sign

        flash_pairs = direction_changes // 2
        if flash_pairs > _MAX_FLASHES_PER_S:
            bad_windows.append({"second": sec, "flash_pairs": flash_pairs})
            gr.add(
                report_path, "F1", "flash_wcag231",
                severity="error",
                evidence=f"second={sec} flash_pairs={flash_pairs}",
                root_cause=(
                    f"Rapid luma oscillation: {flash_pairs} complete flashes/s "
                    f"exceeds WCAG 2.3.1 limit of {_MAX_FLASHES_PER_S}/s"
                ),
                fix_hint="Remove or slow the rapid luma-oscillating transition; use a cross-fade",
                advisory=False,
            )
    return bad_windows


# ── scene-to-scene luma jump ─────────────────────────────────────────────────

def _luma_jump_check(frames: list[dict], scene_times: list[float], report_path: Path) -> list[dict]:
    WINDOW = 1.0   # seconds to average on each side of a cut
    THRESH = 0.35
    issues: list[dict] = []
    for t in scene_times:
        before = [f["YAVG"] / 255.0 for f in frames if max(0, t - WINDOW) <= f["pts"] < t]
        after  = [f["YAVG"] / 255.0 for f in frames if t <= f["pts"] < t + WINDOW]
        if not before or not after:
            continue
        jump = abs(float(np.mean(after)) - float(np.mean(before)))
        if jump > THRESH:
            issues.append({"at": t, "jump": round(jump, 3)})
            gr.add(
                report_path, "F1", "luma_jump",
                severity="warn",
                evidence=f"t={t:.2f}s delta={jump:.3f}",
                root_cause="Scene transition causes an abrupt brightness change",
                fix_hint="Add a cross-dissolve or brightness-normalise the adjacent scenes",
                advisory=True,
            )
    return issues


# ── per-sample pixel clipping ─────────────────────────────────────────────────

def _clipping_check(path: str, sample_times: list[float], w: int, h: int, report_path: Path) -> list[dict]:
    """Extract Y plane for each sample time; flag if >2 % pixels near clip range."""
    issues: list[dict] = []
    for t in sample_times:
        with tempfile.NamedTemporaryFile(suffix=".yuv", delete=False) as tmp:
            tmp_path = Path(tmp.name)
        try:
            r = subprocess.run(
                ["ffmpeg", "-ss", str(t), "-i", path,
                 "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "yuv420p", "-y", str(tmp_path)],
                capture_output=True, timeout=15,
            )
            if r.returncode != 0:
                continue
            raw = tmp_path.read_bytes()
            y_size = w * h
            if len(raw) < y_size:
                continue
            y = np.frombuffer(raw[:y_size], dtype=np.uint8)
            low  = float(np.sum(y <= 16))  / y_size
            high = float(np.sum(y >= 235)) / y_size
            if low > 0.02 or high > 0.02:
                issues.append({"t": t, "low_pct": round(low * 100, 1), "high_pct": round(high * 100, 1)})
                gr.add(
                    report_path, "F1", "pixel_clipping",
                    severity="warn",
                    evidence=f"t={t:.1f}s low={low*100:.1f}% high={high*100:.1f}%",
                    root_cause="Luma values at or beyond broadcast clipping range (≤16 or ≥235)",
                    fix_hint="Apply a levels filter or reduce source brightness/contrast",
                    advisory=True,
                )
        except Exception:
            pass
        finally:
            tmp_path.unlink(missing_ok=True)
    return issues


# ── blackdetect / freezedetect ────────────────────────────────────────────────

def _blackfreeze_check(path: str, report_path: Path) -> dict:
    r = subprocess.run(
        ["ffmpeg", "-i", path,
         "-vf", "blackdetect=d=0.1:pic_th=0.98,freezedetect=n=-60dB:d=2",
         "-f", "null", "-"],
        capture_output=True, text=True, timeout=180,
    )
    lines = r.stderr.splitlines()
    black_segs, freeze_segs = [], []
    for line in lines:
        if "black_start" in line:
            black_segs.append(line.strip())
        elif "freeze_start" in line:
            freeze_segs.append(line.strip())
    for seg in black_segs:
        gr.add(report_path, "F1", "black_frame", "warn", seg,
               "Black frames detected (d>0.1 s, >98 % black pixels)",
               "Check transition or fade-from-black timing", advisory=True)
    for seg in freeze_segs:
        gr.add(report_path, "F1", "freeze_frame", "warn", seg,
               "Freeze detected (>2 s with no significant pixel change)",
               "Check for a stalled render or stuck clip", advisory=True)
    return {"black_segments": len(black_segs), "freeze_segments": len(freeze_segs)}


# ── sample-time selection ─────────────────────────────────────────────────────

def _sample_times(duration: float, scene_times: list[float] | None) -> list[float]:
    pts: set[float] = set()
    pts.add(min(0.6, duration * 0.05))      # hook
    pts.add(max(0.0, duration - 0.5))       # last frame area
    if scene_times:
        for t in scene_times:
            mid = t + 1.0
            if 0 < mid < duration:
                pts.add(round(mid, 2))
    else:
        step, t = 10.0, 10.0
        while t < duration - step:
            pts.add(round(t, 1))
            t += step
    return sorted(pts)


# ── contact sheet for failing frames ─────────────────────────────────────────

def _contact_sheet(path: str, failing_times: list[float], out_dir: Path) -> str | None:
    if not failing_times:
        return None
    times = sorted(set(failing_times))[:9]
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = str(out_dir / "frame_qa_contact.jpg")
    select_expr = "+".join(f"between(t,{max(0,t-0.05):.3f},{t+0.05:.3f})" for t in times)
    try:
        r = subprocess.run(
            ["ffmpeg", "-i", path,
             "-vf", f"select='{select_expr}',scale=320:-1,tile=3x3",
             "-frames:v", "1", "-y", out_path],
            capture_output=True, timeout=60,
        )
        return out_path if r.returncode == 0 else None
    except Exception:
        return None


# ── main entry point ──────────────────────────────────────────────────────────

def run(video_path: str, out_json: str, episode: str | None = None) -> dict:
    report_path = Path(out_json).parent / "gate_report.json"

    info = _probe(video_path)
    fps  = _fps(info)
    dur  = _duration(info)
    w, h = _wh(info)

    # load scene cut times from props.json if available
    scene_times: list[float] = []
    if episode:
        props_file = ROOT / "out" / episode / "props.json"
        if props_file.exists():
            try:
                props = json.loads(props_file.read_text())
                ep_fps = props.get("fps", fps)
                for sc in props.get("scenes", [])[1:]:
                    scene_times.append(sc["from"] / ep_fps)
            except Exception:
                pass

    sample_times = _sample_times(dur, scene_times or None)

    with ThreadPoolExecutor(max_workers=4) as pool:
        f_sig   = pool.submit(_signalstats, video_path)
        f_bf    = pool.submit(_blackfreeze_check, video_path, report_path)
        f_clip  = pool.submit(_clipping_check, video_path, sample_times, w, h, report_path)

        frames = f_sig.result(timeout=300)

        f_flash = pool.submit(_flash_check, frames, fps, report_path)
        f_ljump = pool.submit(_luma_jump_check, frames, scene_times, report_path)

        bf_result   = f_bf.result(timeout=180)
        clip_issues = f_clip.result(timeout=180)
        flash_wins  = f_flash.result(timeout=60)
        luma_jumps  = f_ljump.result(timeout=30)

    # per-sample luma stats (summary from signalstats)
    luma_stats = []
    for t in sample_times:
        closest = min(frames, key=lambda f: abs(f["pts"] - t), default=None) if frames else None
        if closest and abs(closest["pts"] - t) < 0.5:
            luma_stats.append({
                "t": t,
                "YAVG": round(closest["YAVG"], 1),
                "YMIN": round(closest["YMIN"], 1),
                "YMAX": round(closest["YMAX"], 1),
            })

    # safe-zone advisory (needs Remotion + props.json)
    gr.add(report_path, "F1", "safe_zone_not_run",
           severity="info",
           evidence="frame_qa receives only video path; safe-zone check needs Remotion props.json",
           root_cause="Skipped: use tools/check_safe_zones.py <episode> for full safe-zone QA",
           fix_hint="python tools/check_safe_zones.py <episode>",
           advisory=True)

    # contrast-behind-text advisory
    gr.add(report_path, "F1", "contrast_not_measured",
           severity="info",
           evidence="Text-box DOM positions are only available via SafeProbe.tsx during Remotion render",
           root_cause="Decoded mp4 has no DOM layer; text-box coordinates are lost at encode time",
           fix_hint="Run check_safe_zones.py --keep-stills and verify contrast on the overlay PNGs",
           advisory=True)

    # contact sheet for flash / luma-jump frames
    failing_times = (
        [float(fw["second"]) + 0.5 for fw in flash_wins]
        + [float(lj["at"]) for lj in luma_jumps]
    )
    contact = _contact_sheet(video_path, failing_times, Path(out_json).parent)

    result = {
        "video": video_path,
        "duration_s": round(dur, 2),
        "fps": round(fps, 3),
        "resolution": f"{w}x{h}",
        "signalstats_frames": len(frames),
        "sample_times": sample_times,
        "luma_stats": luma_stats,
        "flash_windows": flash_wins,
        "luma_jumps": luma_jumps,
        "clipping_issues": len(clip_issues),
        "black_freeze": bf_result,
        "contact_sheet": contact,
    }
    Path(out_json).parent.mkdir(parents=True, exist_ok=True)
    Path(out_json).write_text(json.dumps(result, indent=2))
    return result


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="F1 frame QA")
    ap.add_argument("video", help="path to video.mp4")
    ap.add_argument("--out", required=True, help="output frame_qa.json")
    ap.add_argument("--episode", help="episode id for scene times from props.json")
    a = ap.parse_args(argv)

    result = run(a.video, a.out, episode=a.episode)
    entries = gr.load(Path(a.out).parent / "gate_report.json")
    errors = [e for e in entries if e["severity"] == "error" and not e.get("advisory")]
    warns  = [e for e in entries if e["severity"] == "warn"]
    print(
        f"frame_qa: {result['duration_s']:.1f}s, {result['signalstats_frames']} frames, "
        f"flash_windows={len(result['flash_windows'])}, "
        f"luma_jumps={len(result['luma_jumps'])}, "
        f"clipping={result['clipping_issues']}, "
        f"black={result['black_freeze']['black_segments']} "
        f"freeze={result['black_freeze']['freeze_segments']}"
    )
    print(f"  gate_report: {len(errors)} hard error(s), {len(warns)} warn(s) -> {a.out}")
    if contact := result.get("contact_sheet"):
        print(f"  contact sheet: {contact}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
