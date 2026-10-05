"""tests/test_frame_audio_transcript.py – offline tests for F1 / A1 / T1 layers.

All tests are fast (< 30 s each) and require only ffmpeg + numpy (no network).

Fixtures:
  flash_video   - lavfi colour alternating at 5 Hz → > 3 complete flash pairs/s
  normal_video  - steady mid-grey → no flash
  WER checks    - in-memory word lists, no audio decode needed
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import gate_report as gr
from tools.frame_qa import run as frame_qa_run, _flash_check, _signalstats
from tools.transcribe import audio_matches_script, _wer_pure


# ── video fixture helpers ─────────────────────────────────────────────────────

def _make_flash_video(path: str, fps: int = 25, duration: float = 3.0) -> None:
    """Colour oscillates between Y≈18 and Y≈238 at 5 Hz → ~10 flash-pairs/s.

    Uses uppercase T (presentation time in seconds) as required by ffmpeg geq.
    """
    subprocess.run(
        [
            "ffmpeg", "-f", "lavfi",
            "-i", f"nullsrc=size=128x72:rate={fps}:duration={duration}",
            "-vf", "geq=lum=128+110*sin(2*3.14159265*T*5):cb=128:cr=128",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-y", path,
        ],
        capture_output=True, check=True, timeout=30,
    )


def _make_normal_video(path: str, fps: int = 25, duration: float = 3.0) -> None:
    """Steady mid-grey: YAVG ≈ 128, zero luma oscillation."""
    subprocess.run(
        [
            "ffmpeg", "-f", "lavfi",
            "-i", f"color=c=gray:size=128x72:rate={fps}:duration={duration}",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-y", path,
        ],
        capture_output=True, check=True, timeout=30,
    )


# ── F1: flash tests ───────────────────────────────────────────────────────────

def test_flash_video_triggers_wcag_error(tmp_path):
    """A rapidly alternating clip must produce at least one flash_wcag231 ERROR entry."""
    vid = str(tmp_path / "flash.mp4")
    _make_flash_video(vid)
    out_json = str(tmp_path / "frame_qa.json")

    results = frame_qa_run(vid, out_json)

    assert results["flash_windows"], "flash video should report flash windows"
    entries = gr.load(tmp_path / "gate_report.json")
    flash_errors = [
        e for e in entries
        if e["rule"] == "flash_wcag231" and e["severity"] == "error"
    ]
    assert flash_errors, "flash video should produce a flash_wcag231 error in gate_report"
    # hard (non-advisory) error
    assert not flash_errors[0]["advisory"], "flash error must be advisory=False"


def test_normal_video_passes_flash_check(tmp_path):
    """A steady grey clip must not trigger the flash check."""
    vid = str(tmp_path / "normal.mp4")
    _make_normal_video(vid)
    out_json = str(tmp_path / "frame_qa.json")

    results = frame_qa_run(vid, out_json)

    assert results["flash_windows"] == [], "steady video should produce no flash windows"
    entries = gr.load(tmp_path / "gate_report.json")
    flash_errors = [e for e in entries if e["rule"] == "flash_wcag231"]
    assert not flash_errors, "steady video should produce no flash gate entries"


def test_frame_qa_produces_luma_stats(tmp_path):
    """frame_qa.json must include luma_stats entries for the sample frames."""
    vid = str(tmp_path / "normal.mp4")
    _make_normal_video(vid)
    out_json = str(tmp_path / "frame_qa.json")

    results = frame_qa_run(vid, out_json)

    assert results["luma_stats"], "luma_stats must be non-empty"
    for stat in results["luma_stats"]:
        assert "YAVG" in stat
        assert "YMIN" in stat
        assert "YMAX" in stat


def test_frame_qa_advisory_entries_present(tmp_path):
    """Advisory entries for safe_zone_not_run and contrast_not_measured must be written."""
    vid = str(tmp_path / "normal.mp4")
    _make_normal_video(vid)
    out_json = str(tmp_path / "frame_qa.json")

    frame_qa_run(vid, out_json)
    entries = gr.load(tmp_path / "gate_report.json")

    rules = {e["rule"] for e in entries}
    assert "safe_zone_not_run"      in rules, "advisory safe_zone_not_run must be present"
    assert "contrast_not_measured"  in rules, "advisory contrast_not_measured must be present"
    for e in entries:
        if e["rule"] in ("safe_zone_not_run", "contrast_not_measured"):
            assert e["advisory"] is True


# ── T1: WER tests ─────────────────────────────────────────────────────────────

def test_wer_perfect_transcript():
    script = "the quick brown fox jumps over the lazy dog"
    words  = [{"w": w, "s": 0.0, "e": 0.5} for w in script.split()]
    result = audio_matches_script(words, script)
    assert result["wer"] == pytest.approx(0.0)
    assert result["level"] == "ok"


def test_wer_one_wrong_word_is_warn(tmp_path):
    """WER ≈ 1/9 ≈ 11 % → warn threshold."""
    script = "the quick brown fox jumps over the lazy dog"
    # substitute 'fox' → 'cat'
    wrong  = "the quick brown cat jumps over the lazy dog"
    words  = [{"w": w, "s": 0.0, "e": 0.5} for w in wrong.split()]
    rp     = tmp_path / "gate_report.json"

    result = audio_matches_script(words, script, report_path=rp)

    assert result["wer"] > 0.0
    assert result["level"] == "warn", f"expected warn, got {result['level']} (wer={result['wer']:.2%})"
    entries = gr.load(rp)
    wer_entries = [e for e in entries if e["rule"] == "wer_mismatch"]
    assert wer_entries, "a wer_mismatch gate entry must be written"
    assert wer_entries[0]["severity"] == "warn"


def test_wer_completely_wrong_is_error(tmp_path):
    """All words wrong → WER = 1.0 → error threshold."""
    script = "one two three four five"
    wrong  = "alpha beta gamma delta epsilon"
    words  = [{"w": w, "s": 0.0, "e": 0.5} for w in wrong.split()]
    rp     = tmp_path / "gate_report.json"

    result = audio_matches_script(words, script, report_path=rp)

    assert result["wer"] >= 0.20
    assert result["level"] == "error"
    entries = gr.load(rp)
    wer_errors = [e for e in entries if e["rule"] == "wer_mismatch" and e["severity"] == "error"]
    assert wer_errors


def test_wer_pure_python_fallback():
    """_wer_pure must match word-error rate by hand for small cases."""
    assert _wer_pure("a b c d", "a b c d") == pytest.approx(0.0)
    assert _wer_pure("a b c d", "a x c d") == pytest.approx(0.25)   # 1 sub out of 4
    assert _wer_pure("a b c", "")          == pytest.approx(1.0)    # all deleted


# ── gate_report: idempotency ──────────────────────────────────────────────────

def test_gate_report_idempotent_add(tmp_path):
    rp = tmp_path / "gate_report.json"
    gr.add(rp, "F1", "test_rule", "warn", "ev-A", "root", "fix")
    gr.add(rp, "F1", "test_rule", "warn", "ev-A", "root", "fix")   # duplicate
    assert len(gr.load(rp)) == 1, "duplicate (layer, rule, evidence) must not be added twice"


def test_gate_report_distinct_evidence_added(tmp_path):
    rp = tmp_path / "gate_report.json"
    gr.add(rp, "F1", "test_rule", "warn", "ev-A", "root", "fix")
    gr.add(rp, "F1", "test_rule", "warn", "ev-B", "root", "fix")   # different evidence
    assert len(gr.load(rp)) == 2


def test_gate_report_schema_version(tmp_path):
    rp = tmp_path / "gate_report.json"
    gr.add(rp, "F1", "x", "info", "e", "r", "f")
    raw = json.loads(rp.read_text())
    assert raw.get("schema_version") == 1
    assert isinstance(raw.get("entries"), list)


def test_gate_report_merge(tmp_path):
    rp = tmp_path / "gate_report.json"
    gr.add(rp, "F1", "rule_a", "warn", "ev1", "r", "f")
    new = [
        {"layer": "F1", "rule": "rule_a", "severity": "warn",
         "evidence": "ev1", "root_cause": "r", "fix_hint": "f",
         "advisory": True, "waived": False},
        {"layer": "A1", "rule": "rule_b", "severity": "info",
         "evidence": "ev2", "root_cause": "r", "fix_hint": "f",
         "advisory": True, "waived": False},
    ]
    merged = gr.merge(rp, new)
    assert len(merged) == 2, "merge must de-duplicate by (layer, rule, evidence)"
