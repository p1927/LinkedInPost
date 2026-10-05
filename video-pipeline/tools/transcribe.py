"""tools/transcribe.py – T1 transcription wrapper around parakeet-mlx.

Usage:
    python tools/transcribe.py <audio.mp3> --out <words.json> [--script <narration.txt>]

Output JSON: {"words": [{w, s, e}, ...], "wer": float, "wer_level": "ok|warn|error", ...}
Shapes: words match adapters/tts_minimax.py  →  {"w": str, "s": float, "e": float}

If .venv-asr/bin/parakeet-mlx is absent, writes a stub result with a warn gate entry.
WER thresholds: warn >= 8 %, error >= 20 % (advisory).
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

VENV_ASR    = ROOT / ".venv-asr"
PARAKEET    = VENV_ASR / "bin" / "parakeet-mlx"

_WER_WARN  = 0.08
_WER_ERROR = 0.20


# ── transcription ─────────────────────────────────────────────────────────────

def _transcribe(audio_path: str) -> list[dict]:
    """Call parakeet-mlx --output-format json; return [{w, s, e}, ...]."""
    with tempfile.TemporaryDirectory() as tmp:
        r = subprocess.run(
            [str(PARAKEET), "--output-format", "json", "--output-dir", tmp, audio_path],
            capture_output=True, text=True, timeout=300,
        )
        if r.returncode != 0:
            raise RuntimeError(f"parakeet-mlx failed: {r.stderr[-400:]}")
        stem = Path(audio_path).stem
        out_file = Path(tmp) / f"{stem}.json"
        if not out_file.exists():
            # try any .json in the tmp dir
            jsons = list(Path(tmp).glob("*.json"))
            if not jsons:
                raise RuntimeError("parakeet-mlx produced no JSON output")
            out_file = jsons[0]
        raw = json.loads(out_file.read_text())

    return _normalise_words(raw)


def _normalise_words(raw) -> list[dict]:
    """Convert parakeet JSON to [{w, s, e}]. The real shape is {"text", "sentences": [{"tokens": [{"text", "start", "end"}]}]} with
    sub-word tokens: a token whose text starts with a space begins a new word, anything else continues the previous word."""
    words: list[dict] = []
    if isinstance(raw, dict):
        segments = raw.get("sentences") or raw.get("segments") or []
    elif isinstance(raw, list):
        segments = raw
    else:
        return words
    for seg in segments:
        for tok in seg.get("tokens") or seg.get("words") or []:
            t = tok.get("word") or tok.get("text") or ""
            if not t.strip():
                continue
            s_, e_ = float(tok.get("start", seg.get("start", 0))), float(tok.get("end", seg.get("end", 0)))
            if t[0].isspace() or not words or (t[0].isdigit() and words[-1]["w"][-1:].isalpha()):
                words.append({"w": t.strip(), "s": s_, "e": e_})
            else:
                words[-1]["w"] += t
                words[-1]["e"] = e_
    if not words:  # segment-level text only, no token offsets
        for seg in segments:
            for w in (seg.get("text") or "").split():
                words.append({"w": w, "s": float(seg.get("start", 0)), "e": float(seg.get("end", 0))})
    return words


# ── WER ───────────────────────────────────────────────────────────────────────


_U = {w: i for i, w in enumerate("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split())}
_T = {w: 10 * i for i, w in enumerate("_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()) if w != "_"}


def _norm(text: str) -> str:
    """Lower-case words with spoken numbers turned into digits ('nine thousand four hundred eighty four' -> 9484), 'percent' dropped, so
    'nine thousand ... crore' read aloud and '9484 crore' written by the recogniser compare equal."""
    import re
    toks = re.sub(r"(?<=\d),(?=\d)", "", text.lower().replace("-", " ")).replace("%", " percent ")
    toks = re.sub(r"[^a-z0-9. ]", " ", toks).split()
    out, i = [], 0
    while i < len(toks):
        w = toks[i]
        if w in _U or w in _T:
            tot = cur = 0
            while i < len(toks) and (toks[i] in _U or toks[i] in _T or toks[i] in ("hundred", "thousand")):
                x = toks[i]
                if x in _U: cur += _U[x]
                elif x in _T: cur += _T[x]
                elif x == "hundred": cur = max(cur, 1) * 100
                else: tot, cur = tot + max(cur, 1) * 1000, 0
                i += 1
            out.append(str(tot + cur))
            continue
        if w not in ("percent", "."):
            out.append(w.strip("."))
        i += 1
    return " ".join(out)


def _wer_pure(ref: str, hyp: str) -> float:
    """Levenshtein word-error rate (pure Python fallback)."""
    r, h = ref.lower().split(), hyp.lower().split()
    if not r:
        return 0.0
    m, n = len(r), len(h)
    d = list(range(n + 1))
    for i in range(1, m + 1):
        prev, d[0] = d[0], i
        for j in range(1, n + 1):
            tmp = d[j]
            d[j] = prev if r[i-1] == h[j-1] else min(prev, d[j], d[j-1]) + 1
            prev = tmp
    return d[n] / m


def _compute_wer(words: list[dict], narration: str) -> float:
    hyp = _norm(" ".join(w["w"] for w in words))
    narration = _norm(narration)
    # try jiwer from .venv-asr first
    for site_pkgs in VENV_ASR.glob("lib/python*/site-packages"):
        sys.path.insert(0, str(site_pkgs))
        break
    try:
        import jiwer  # type: ignore
        return float(jiwer.wer(narration, hyp))
    except ImportError:
        return _wer_pure(narration, hyp)


def audio_matches_script(
    words: list[dict],
    narration: str,
    report_path: Path | None = None,
) -> dict:
    """Return {wer, level}; optionally write a gate entry when WER is above threshold."""
    wer   = _compute_wer(words, narration)
    level = "ok" if wer < _WER_WARN else ("warn" if wer < _WER_ERROR else "error")
    if report_path and level != "ok":
        gr.add(
            report_path, "T1", "wer_mismatch", level,
            f"WER={wer:.2%}",
            "Transcription does not closely match the narration script",
            "Re-record the narration or correct the script",
            advisory=True,
        )
    return {"wer": round(wer, 4), "level": level}


# ── public entry point ────────────────────────────────────────────────────────

def run(audio_path: str, out_path: str, narration: str | None = None) -> dict:
    report_path = Path(out_path).parent / "gate_report.json"

    stub_used = not PARAKEET.exists()
    words: list[dict] = []

    if stub_used:
        gr.add(
            report_path, "T1", "parakeet_missing",
            severity="warn",
            evidence=f"parakeet-mlx not found at {PARAKEET}",
            root_cause=".venv-asr not yet created by the S1 spike agent",
            fix_hint=(
                "python -m venv .venv-asr && "
                ".venv-asr/bin/pip install parakeet-mlx jiwer"
            ),
            advisory=True,
        )
    else:
        words = _transcribe(audio_path)

    result: dict = {"words": words, "stub_used": stub_used}
    if narration and words:
        result.update(audio_matches_script(words, narration, report_path))

    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    Path(out_path).write_text(json.dumps(result, indent=2))
    return result


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="T1 transcription (parakeet-mlx)")
    ap.add_argument("audio",     help="audio file to transcribe")
    ap.add_argument("--out",     required=True, help="output words JSON")
    ap.add_argument("--script",  help="narration text for WER check")
    a = ap.parse_args(argv)

    narration: str | None = None
    if a.script:
        p = Path(a.script)
        narration = p.read_text().strip() if p.exists() else a.script

    result = run(a.audio, a.out, narration=narration)

    wer_str = (
        f", WER={result['wer']:.2%} [{result['level']}]"
        if "wer" in result else ""
    )
    stub_str = " (stub: parakeet-mlx missing)" if result.get("stub_used") else ""
    print(f"transcribe: {len(result['words'])} words{wer_str}{stub_str}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
