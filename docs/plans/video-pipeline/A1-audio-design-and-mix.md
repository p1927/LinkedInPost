# A1 Audio design and mix

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Reuse IDs: [R1](R1-reuse-register.md) · Status: loudness done, everything else missing
Runs: music bed selection in parallel with scripting/design (needs only the outline's mood/length); mix after L7 TTS and T1 timing.

## Purpose
Sound is half of perceived quality. Build the mix from existing ffmpeg filters and numbers, not custom DSP.

## Have
- `run.py` loudnorm to -14 LUFS, `verify.render_qa` ebur128 and true-peak check; `tools/gen_music.py` (ACE-Step); `@remotion/sfx` installed.
- Word timings from MiniMax TTS (`words[{w,s,e}]`) give exact voice onset and offset, which is the input ducking needs.
- Music files in `assets/music`.

## Others have (R1)
- R-08 ffmpeg `ebur128`/`loudnorm`; R-09 `sidechaincompress` for ducking (present in ffmpeg 8.0.1) and HyperFrames audio-duck parameters as a starting point.
- R-10 numbers: dialogue -16..-14 LUFS, music 18-20 dB under speech, duck 6-12 dB (about 22 for complex topics), true peak -1.5 dBTP, whoosh 10-20 ms before the visual, BPM by type.
- R-11 beat grid via `librosa` and HyperFrames `analyze-beatgrid.py`; R-12 bgm volume logic.
- R-14 ai-film post-production gotchas: concat filter not demuxer, probed durations, picture-only fades, two-pass loudness.
- R-43 Remotion `voiceover.md`, `silence-detection.md`, `sfx.md`.

## Want
- Voice QA before mixing: leading/trailing silence, clipping, loudness of the narration alone.
- Mix chain in one ffmpeg graph: voice (HPF 80 Hz, light compression) + music bed with sidechain ducking from the voice + optional SFX at transition frames; two-pass loudnorm to -14 LUFS, TP <= -1.5.
- SFX map from the storyboard: transition type to whoosh, key number to impact, text pop; max one SFX per transition; never meme sounds.
- Music choice by mood/BPM from the outline; optional beat grid so scene cuts snap to beats.
- Silence as a tool: 0.3-0.5 s of music-only before the closing line.
- Report in the gate report: integrated LUFS, true peak, duck depth, pass/fail per rule.

## Flaws found
1. No ducking: music competes with narration whenever loudness differs.
2. No SFX plan; no check that assembled audio duration matches video (R-14).
3. Hosted `remotion.media` SFX: use whoosh/click/ding style only, no meme sounds (taste rule).
4. librosa on Python 3.14 (numba) unverified.

## Work items
- A1.1 Mix: **copy OpenMontage `audio_mixer.py` (R-96)** with a small `base_tool` stub, call it with the `tokens.yaml` audio numbers; if the stub costs more than lifting its ffmpeg graph, lift the graph. No mixer written from scratch (WP-A2).
- A1.2 Audio QA step in `verify.render_qa`: loudness, peak, duck depth measured, voice silence (WP-A2).
- A1.3 SFX map generation in the storyboard + local SFX folder (WP-A3).
- A1.4 Beat grid in `.venv-asr` (py3.12), `audiomap.json` next to the music (WP-A4).
- A1.5 Audit L8 assemble code against R-14 gotchas.

## Acceptance
- Golden brief mix: -14 LUFS +/- 1, TP <= -1.5, music at least 6 dB lower while voice is active, no clipping; visible duck in the waveform; measured and written to the gate report.

## Depends on
L7 (TTS audio), T1 (word timing), L5 storyboard (SFX points). Feeds L8, F1 (audio checks).

## Open questions
- Which free SFX source to use (soundcn or Remotion's hosted set, whoosh/click/ding only)?
- `tools/gen_music.py` uses ACE-Step, a local generator: confirm it fits the machine budget (disk, time) or switch to a curated local music folder.

## Setup scope (rev 3)
This phase only delivers the layer kit (master plan 6.1): `mix_audio.py` with ducking and two-pass loudnorm from token numbers, audio QA entries, SFX map stub, beat grid only if librosa installs cleanly. Backlog: B-A1-*. Everything else in Want and Work items is improvement work, to be picked from the backlog after setup.

## Risks and mitigations (rev 5)
- Mixer copy needs a stub: S-04 time box, fallback to ffmpeg `sidechaincompress`.
- TTS pronunciation of figures is a MiniMax limit: T1 detects, a pronunciation lexicon is backlog; numbers written in words in narration where needed.
- Music rights: `rights.json` records source (C1).
