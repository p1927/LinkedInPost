# third_party/INDEX.md
<!-- Each agent appends rows only. Never overwrite rows added by others. -->

| Component | Source / Version | Licence | Needs | Spike | Decision | Risk |
|---|---|---|---|---|---|---|
| `parakeet-mlx` | PyPI `parakeet-mlx==0.5.3`; model `mlx-community/parakeet-tdt-0.6b-v3` rev `ed2b7e8c` | Apache-2.0 | `.venv-asr` (py3.12), MLX, 2.34 GB HF weights | S-02 | ADOPT — WER=0.000 on ep23/s1; sub-word token timestamps; wall time 14 min cold (model download); warm inference < 2 s | Model = 2.34 GB (under 3 GB limit); cold HF/XET download ~14 min unauthenticated; set HF_TOKEN for speed |
| `jiwer` | PyPI `jiwer==4.0.0` | Apache-2.0 | `.venv-asr` (py3.12) | S-02 | ADOPT — WER/CER computation for transcript QA | None |
| `textstat` | PyPI `textstat==0.7.13` | MIT | `.venv-asr` (py3.12), nltk | S-10 | ADOPT — Flesch-Kincaid grade 4.2 on ep23 narration; confirms plain-language target | nltk data download needed on first run (handled by textstat) |
| `@remotion/layout-utils` | npm `4.0.532` | MIT | Node.js, remotion-app | S-06 | ADOPT — pinned 4.0.532, installed into remotion-app | None |
| `@remotion/rough-notation` | npm `4.0.532` | MIT | Node.js, remotion-app | S-06 | ADOPT — pinned 4.0.532, installed into remotion-app | None |
| `@remotion/eslint-plugin` | npm `4.0.532` | MIT | eslint 8.57.1, @typescript-eslint/parser 8.71.1 | S-06 | ADOPT — flat config works (ESLINT_USE_FLAT_CONFIG=true); 5 findings on src/ (3 errors, 2 warnings); tsc clean | Requires @typescript-eslint/parser for TSX; ESLint 8 needs env var for flat config |
| `OpenMontage audio_mixer.py` | github.com/OpenMontage/OpenMontage @ main | AGPL-3.0 | ffmpeg, optional pydub | S-04 | COPY — file copied verbatim to `third_party/openmontage/audio_mixer.py`; our `tools/mix_audio.py` uses a direct ffmpeg filter graph (sidechaincompress + loudnorm) instead of instantiating AudioMixer, because the base_tool stub would exceed 60 lines | AGPL requires source disclosure for any distribution; personal-use project, no distribution planned |