"""tools/mix_audio.py – A1 audio mix: narration + music, sidechain ducking, loudnorm -14 LUFS.

Design: the OpenMontage AudioMixer class (third_party/openmontage/audio_mixer.py) requires
tools.base_tool from the vendor tree which pulls in many enums and helpers; a stub that
satisfies its full contract (ResourceProfile kwargs, run_command, ToolResult attributes) would
exceed 60 lines. We therefore fall back directly to one ffmpeg filter graph:

  sidechaincompress(voice sidechain → duck music) + loudnorm two-pass → -14 LUFS / -1.5 dBTP

This is the same approach AudioMixer._duck() + _full_mix() uses internally.

Usage:
    python tools/mix_audio.py <narration.mp3> [<s2.mp3> ...] \\
        --music <music.mp3> --out <mix.mp3> --qa <qa.json>
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
import gate_report as gr

TARGET_LUFS  = -14.0
TRUE_PEAK_DB = -1.5


# ── helpers ───────────────────────────────────────────────────────────────────

def _concat_narration(parts: list[str], tmp_dir: str) -> str:
    if len(parts) == 1:
        return parts[0]
    list_file = Path(tmp_dir) / "narration_list.txt"
    list_file.write_text("\n".join(f"file '{Path(p).resolve()}'" for p in parts))
    out = str(Path(tmp_dir) / "narration_concat.mp3")
    subprocess.run(
        ["ffmpeg", "-f", "concat", "-safe", "0", "-i", str(list_file),
         "-c:a", "libmp3lame", "-q:a", "2", "-y", out],
        capture_output=True, check=True, timeout=120,
    )
    return out


def _loudnorm_pass1(path: str) -> dict:
    """Run loudnorm in analysis mode; return the JSON stats block."""
    r = subprocess.run(
        ["ffmpeg", "-i", path,
         "-af", f"loudnorm=I={TARGET_LUFS}:TP={TRUE_PEAK_DB}:LRA=11:print_format=json",
         "-f", "null", "-"],
        capture_output=True, text=True, timeout=120,
    )
    text = r.stderr
    start = text.rfind("{")
    end   = text.rfind("}") + 1
    if start == -1 or end == 0:
        raise RuntimeError("loudnorm pass-1 produced no JSON stats")
    return json.loads(text[start:end])


def _mix(narration: str, music: str, out_path: str, p1: dict) -> str:
    """One ffmpeg call: sidechaincompress duck + loudnorm linear pass-2."""
    il  = p1["input_i"]
    tp  = p1["input_tp"]
    lra = p1["input_lra"]
    off = p1["input_thresh"]
    fg = (
        # split narration: one copy goes to the mix, one drives the sidechain
        "[0:a]asplit=2[nar_main][nar_sc];"
        # duck music when voice is loud (threshold ≈ -30 dBFS, ratio 8:1)
        "[1:a][nar_sc]sidechaincompress="
        "threshold=0.02:ratio=8:attack=5:release=200:makeup=1[music_ducked];"
        # blend
        "[nar_main][music_ducked]amix=inputs=2:duration=first:dropout_transition=0[premix];"
        # loudnorm linear pass-2
        f"[premix]loudnorm=I={TARGET_LUFS}:TP={TRUE_PEAK_DB}:LRA=11"
        f":measured_I={il}:measured_TP={tp}:measured_LRA={lra}:measured_thresh={off}"
        f":offset=0:linear=true:print_format=json[out]"
    )
    r = subprocess.run(
        ["ffmpeg", "-i", narration, "-i", music,
         "-filter_complex", fg,
         "-map", "[out]", "-c:a", "libmp3lame", "-q:a", "2", "-y", out_path],
        capture_output=True, text=True, timeout=300,
    )
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg mix failed:\n{r.stderr[-600:]}")
    return r.stderr


def _measure_ebur128(path: str) -> dict:
    """Return integrated LUFS and true peak from ebur128 filter."""
    r = subprocess.run(
        ["ffmpeg", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
        capture_output=True, text=True, timeout=120,
    )
    lufs: float | None = None
    tp:   float | None = None
    for line in reversed(r.stderr.splitlines()):
        ll = line.strip()
        if "I:" in ll and "LUFS" in ll:
            parts = ll.split()
            try:
                lufs = float(parts[parts.index("I:") + 1])
            except (ValueError, IndexError):
                pass
        if tp is None and ("True peak" in ll or "Peak:" in ll or "peak:" in ll):
            parts = ll.split()
            for i, tok in enumerate(parts):
                if tok.lower() in ("peak:", "true") and i + 1 < len(parts):
                    try:
                        tp = float(parts[i + 1])
                        break
                    except ValueError:
                        pass
        if lufs is not None and tp is not None:
            break
    return {"integrated_lufs": lufs, "true_peak_db": tp}


def _music_mean_db(music: str) -> float | None:
    r = subprocess.run(
        ["ffmpeg", "-i", music, "-af", "volumedetect", "-f", "null", "-"],
        capture_output=True, text=True, timeout=30,
    )
    for line in r.stderr.splitlines():
        if "mean_volume" in line:
            try:
                return float(line.split("mean_volume:")[-1].strip().split()[0])
            except ValueError:
                pass
    return None


# ── public API ────────────────────────────────────────────────────────────────

def run(narration_files: list[str], music_file: str, out_path: str, qa_path: str) -> dict:
    report_path = Path(qa_path).parent / "gate_report.json"

    with tempfile.TemporaryDirectory() as tmp:
        narration = _concat_narration(narration_files, tmp)
        p1  = _loudnorm_pass1(narration)
        _mix(narration, music_file, out_path, p1)

    loudness    = _measure_ebur128(out_path)
    music_mean  = _music_mean_db(music_file)
    lufs = loudness.get("integrated_lufs")
    tp   = loudness.get("true_peak_db")

    qa = {
        "mix": out_path,
        "narration_files": narration_files,
        "music_file": music_file,
        "integrated_lufs": lufs,
        "true_peak_db": tp,
        "music_mean_db": music_mean,
        "loudnorm_pass1": p1,
    }
    Path(qa_path).parent.mkdir(parents=True, exist_ok=True)
    Path(qa_path).write_text(json.dumps(qa, indent=2))

    # gate entries
    if lufs is not None:
        ok = abs(lufs - TARGET_LUFS) <= 2.0
        gr.add(report_path, "A1", "loudness_check" if ok else "loudness_out_of_range",
               "info" if ok else "error",
               f"integrated_LUFS={lufs:.1f}",
               "loudnorm within 2 LUFS of target" if ok else "loudnorm did not converge to target",
               f"target is {TARGET_LUFS} LUFS; re-run with adjusted offset" if not ok else "",
               advisory=True)

    if tp is not None and tp > TRUE_PEAK_DB:
        gr.add(report_path, "A1", "true_peak_clipping", "warn",
               f"true_peak={tp:.1f} dBFS",
               f"True peak exceeds {TRUE_PEAK_DB} dBFS ceiling",
               "Lower the mix level or tighten the loudnorm TP parameter", advisory=True)

    return qa


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="A1 audio mix: ducking + loudnorm -14 LUFS")
    ap.add_argument("narration", nargs="+", help="narration mp3 file(s)")
    ap.add_argument("--music",   required=True, help="background music file")
    ap.add_argument("--out",     required=True, help="output mix.mp3")
    ap.add_argument("--qa",      required=True, help="audio QA JSON output")
    a = ap.parse_args(argv)
    qa = run(a.narration, a.music, a.out, a.qa)
    print(
        f"mix_audio: LUFS={qa.get('integrated_lufs')} "
        f"TP={qa.get('true_peak_db')} -> {a.out}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
