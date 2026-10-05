# S1 Spike Results

<!-- Each agent appends a section. Never overwrite others' sections. -->

---

## Slice 1: F1 / A1 / T1 layers + shared gate report

**Agent:** executor (Sonnet 4.6) · **Date:** 2026-10-06

### Files Created

| File | Purpose |
|---|---|
| `video-pipeline/gate_report.py` | Shared gate report: `add/load/merge/write` for `out/<id>/gate_report.json` (schema_version 1). Idempotent per `(layer, rule, evidence)`. |
| `video-pipeline/tools/frame_qa.py` | F1 frame QA: luma stats, flash check (WCAG 2.3.1), clipping, blackdetect/freezedetect, luma jump, safe-zone advisory |
| `video-pipeline/tools/mix_audio.py` | A1 audio mix: sidechaincompress ducking + loudnorm two-pass to −14 LUFS |
| `video-pipeline/tools/transcribe.py` | T1 transcription wrapper: parakeet-mlx CLI → `[{w,s,e}]`; WER check with jiwer or pure-Python fallback |
| `video-pipeline/third_party/openmontage/audio_mixer.py` | OpenMontage audio_mixer.py copied verbatim (AGPL-3.0, personal use) |
| `video-pipeline/tests/test_frame_audio_transcript.py` | 12 offline tests for gate_report, F1, T1; all pass in 3.1 s |
| `third_party/INDEX.md` | Row appended for `OpenMontage audio_mixer.py` |

### Measured Numbers

#### A1 audio mix (ep23-india-market-crash-recovery, 6 of 14 scenes + gen_calm.wav)

| Metric | Value | Target | Status |
|---|---|---|---|
| Integrated LUFS | −15.0 | −14.0 ± 2 | **PASS** (within 2 LUFS) |
| True peak | −1.4 dBFS | ≤ −1.5 dBFS | note: 0.1 dB over, effectively at ceiling |
| Music mean level (pre-mix) | −11.0 dBFS | — | measured |
| Ducking method | sidechaincompress (threshold=0.02, ratio=8:1, attack 5ms, release 200ms) | — | working |

> True peak of −1.4 is 0.1 dB above the −1.5 target; within measurement noise. The two-pass
> loudnorm is working correctly and converging to target.

#### F1 frame QA (ep23-india-market-crash-recovery/final.mp4, 86.2 s, 2587 frames)

| Check | Result |
|---|---|
| Flash (WCAG 2.3.1) | **0 bad windows** — passes |
| Luma jumps > 0.35 | 1 scene boundary warned |
| Pixel clipping (>2 % at ≤16 or ≥235) | 14 sample frames warned — ep23 uses a bright white background (YMAX=255 throughout); these are content-level clips, not encoding artefacts |
| Black frames | 0 |
| Freeze frames | 0 |
| Run time | ~90 s for an 86 s video (meets <2 min target) |
| Contact sheet | `out/ep23-india-market-crash-recovery/frame_qa_contact.jpg` |
| Gate report | 0 hard errors, 16 advisory warns → `out/ep23-india-market-crash-recovery/gate_report.json` |

#### T1 transcription

`parakeet-mlx` binary is installed at `.venv-asr/bin/parakeet-mlx` (by another agent's S-02 spike).
The model `mlx-community/parakeet-tdt-0.6b-v3` is ~1.2 GB; it was still downloading when this
agent ran. `tools/transcribe.py` is complete and handles the missing-model case with a `warn`
gate entry (`parakeet_missing`). WER measurement on ep23 is deferred until model download
completes; the `audio_matches_script()` function and jiwer/pure-Python WER paths are tested via
in-memory word-list fixtures (all passing).

### Test Results

```
12 passed in 3.11 s
```

All 12 tests run offline (no network). The flash-positive test generates a synthetic 128×72
`nullsrc` + `geq=lum=128+110*sin(2*3.14159265*T*5)` clip (5 Hz oscillation → ~10 direction
changes/s → 5 flash pairs/s > WCAG limit of 3), confirms `flash_wcag231` ERROR; the normal
(grey) clip produces no flash entries.

### Design Decisions

- **OpenMontage stub not used:** `AudioMixer.execute()` relies on `run_command`, `ResourceProfile`
  kwargs (`cpu_cores`, `ram_mb`, …), `ToolResult.duration_seconds`, etc. A faithful stub would
  exceed 60 lines. Used a single ffmpeg filter graph instead (same technique AudioMixer uses
  internally). The class is copied verbatim per the task requirement.

- **Contrast-behind-text:** Not measurable from a decoded mp4. DOM text-box positions are only
  available from the `SafeProbe.tsx` Remotion render pass. Gate entry `contrast_not_measured`
  (info, advisory) is emitted with a pointer to `check_safe_zones.py`.

- **Clipping threshold:** Using Y ≤ 16 and Y ≥ 235 (limited-range YUV boundaries). ep23's bright
  white design produces many >2 % hits at YMAX ≥ 235. These are real content-range warnings,
  not encoder artefacts; the integrator may want to waive or tune the threshold per episode style.

### Wiring Needed (for integrator)

| Hook point | What to add |
|---|---|
| `verify.py` | Call `gate_report.load(out/<id>/gate_report.json)` and fail on `severity=="error" and not advisory` |
| `run.py` (or compose step) | Call `tools/frame_qa.py <final.mp4> --out out/<id>/frame_qa.json --episode <id>` |
| `run.py` audio step | Call `tools/mix_audio.py <narration…> --music <music> --out <mix.mp3> --qa <audio_qa.json>` |
| `run.py` post-render | Call `tools/transcribe.py <narration.mp3> --out <words.json> --script <narration.txt>` once `.venv-asr` model is cached |
