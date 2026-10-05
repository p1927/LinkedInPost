# T1 Transcription and timing

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Reuse IDs: [R1](R1-reuse-register.md) · Status: missing (timing comes from the TTS provider only)
Runs: right after L7 TTS audio exists, in parallel with image/clip generation.

## Purpose
Know what the audio actually says and when. Gives (a) a check that the audio matches the script, (b) word timing when a provider does not return it, (c) transcripts of reference videos.

## Have
- `adapters/tts_minimax.py` returns whole-word timings (`words[{w,s,e}]`); `Captions.tsx` consumes them via `@remotion/captions`.
- No transcription anywhere in our code. `vendor/OpenMontage/tools/analysis/transcriber.py` exists but is AGPL, so concept only.

## Others have (R1)
- R-01 `parakeet-mlx` (Apache-2.0, active, Apple Silicon native, token-level times; v3 covers 25 European languages, which includes English, our current language).
- R-02 HyperFrames `transcribe.mjs` + lib: Parakeet with whisper.cpp fallback, `{text, words[]}` output; copy only if the pip package is awkward.
- R-03 `mlx-whisper` and R-04 `ctc-forced-aligner` for other languages and forced alignment: moved to the [BACKLOG](BACKLOG.md).
- R-05 MoneyPrinterTurbo `subtitle.py` correction logic (script similarity); R-06 `jiwer` for WER.
- R-07 HyperFrames caption-grouping rules for phrase groups.

## Want
- `tools/transcribe.py`: call parakeet-mlx in `.venv-asr`, return the same `words[{w,s,e}]` shape as the TTS adapter (assemble words from tokens).
- `audio_matches_script` gate in `verify.py`: per scene, normalise transcript and narration, WER via jiwer; warn above 8%, error above 20% (judgment, tune). Catches mispronounced numbers, dropped words, glitchy TTS, which matters for figures like FII/DII crore values.
- Timing fallback so captions work for non-MiniMax audio.
- Caption grouping from the grouping rules (pause >= 500 ms, sentence end, max 6 words / 2.5 s, min 2 words / 0.5 s on screen).
- Optional: reference-video transcript ingest for the direction brain (later).

## Flaws found
1. Nothing verifies the audio against the script; numbers are the highest-risk TTS content.
2. `.venv` is Python 3.14; MLX/parakeet wheels for 3.14 unverified.
3. Parakeet model download size unverified; first run needs network (Hugging Face).
4. ASR is not forced alignment; transcript text can differ slightly from the script.

## Work items
- T1.1 Create `.venv-asr` (uv, Python 3.12) with `parakeet-mlx`, `jiwer`, `librosa` and verify each imports and runs on one real mp3 (WP-S1).
- T1.2 Run the `parakeet-mlx` CLI with JSON output (R-100); `tools/transcribe.py` only reshapes tokens into `words[{w,s,e}]` (about 20 lines); test on a known mp3 plus a deliberately wrong word (WP-T2).
- T1.3 `audio_matches_script` check, warn-only first (WP-T3).
- T1.4 Caption grouping from rules, compared with `createTikTokStyleCaptions` output (WP-T4).

## Acceptance
- ep24 audio: WER printed per scene; an injected wrong word is caught; run time stays under 1 minute per episode on this Mac.
- `.venv` and `requirements.txt` unchanged.

## Depends on
L7 audio. Feeds L8 captions, F1/L6 gates, A1 (word spans for ducking).

## Open questions
- Disk: Parakeet weights size is unverified and only about 14 GB is free; if too large, T1 degrades to TTS word times only (the gate becomes optional).

## Setup scope (rev 3)
This phase only delivers the layer kit (master plan 6.1): `transcribe.py` wrapper on Parakeet (English), `transcript.json`, `audio_matches_script` advisory, fixture with a wrong word; skipped cleanly if disk is too tight. Backlog: B-T1-*. Everything else in Want and Work items is improvement work, to be picked from the backlog after setup.

## Risks and mitigations (rev 5)
- Model size or disk: S-02 kill criterion (above 3 GB: skip the audio-vs-script check, keep TTS word times).
- ASR errors flagged as TTS errors: check is advisory, compared by WER bands, owner can listen to the flagged scene.
