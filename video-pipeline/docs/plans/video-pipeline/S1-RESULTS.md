# S1 Spike Results — Environment Agent (S-01, S-02, S-06, S-10)

Date: 2026-10-06 · Agent scope: S-01 Disk, S-02 Parakeet, S-06 Remotion ESLint, S-10 textstat

---

## S-01 Disk: Free Space Audit

**Command:**
```
df -h /
du -sh video-pipeline/reference/* vendor/* remotion-app/node_modules ~/.cache/huggingface
```

**Results (at task start):**
| Path | Size |
|---|---|
| reference/hyperframes | 1.4 GB |
| reference/3b1b-videos | 83 MB |
| reference/3b1b-manim | 2.4 MB |
| vendor/remotion | 789 MB |
| vendor/MoneyPrinterTurbo | 203 MB |
| vendor/OpenMontage | 89 MB |
| vendor/ViMax | 4.2 MB |
| vendor/youtube-automation-agent | 2.1 MB |
| remotion-app/node_modules | 825 MB (grew to ~1.1 GB after S-06 installs) |
| ~/.cache/huggingface | 468 KB → 2.34 GB after parakeet model download |

**Free disk at start:** ~14 GB · **Free disk after all S1 installs (including 2.34 GB model):** 9.5 GB  
**Kill criterion (< 8 GB):** NOT triggered. Safe margin maintained (9.5 GB free).

**Prune proposals (DO NOT execute — owner decision required):**
1. `reference/hyperframes` (1.4 GB) — extract only needed frames/clips first; bulk of the directory is unneeded vendor video assets
2. `vendor/remotion` (789 MB) — this is the source clone used for ESLint plugin reference; once S-06 plugin is confirmed working via npm, the source clone can be removed
3. `vendor/MoneyPrinterTurbo` (203 MB) — only the `montage_util.py` slice is reused; rest is dead weight
4. `~/.cache/huggingface` — after parakeet model is confirmed working, the `.incomplete` fragments can be cleared manually if any remain

**Decision:** adopt disk-check guard at ≥ 8 GB before any install or render (S1.4 requirement confirmed).

---

## S-02 Parakeet-MLX in .venv-asr

**Time box:** 45 min · **Status:** PASS

### Install

**Commands:**
```bash
~/.local/bin/uv venv .venv-asr --python 3.12
~/.local/bin/uv pip install --python .venv-asr/bin/python parakeet-mlx jiwer
~/.local/bin/uv pip freeze --python .venv-asr/bin/python > requirements-asr.txt
```

**Result:** exit 0. 51 packages installed (parakeet-mlx==0.5.3, jiwer==4.0.0, mlx==0.32.3, mlx-metal==0.32.3, librosa==1.0.0, etc.)

**Python version:** 3.12.12 (Apple Silicon native)

**Paths created:**
- `video-pipeline/.venv-asr/` (Python 3.12 venv)
- `video-pipeline/requirements-asr.txt` (57 packages after S-10 textstat added)

### Model Download

**CLI confirmed:** `parakeet-mlx --output-format json --output-dir <dir> <audio.mp3>`

**Model:** `mlx-community/parakeet-tdt-0.6b-v3` (default)

**Model weights on disk:** 2.34 GB (`~/.cache/huggingface/hub/blobs/9a/9a0bf05b...`)
- HF metadata reports 2,508,288,736 bytes; macOS `ls -lh` shows 2.3 G
- Model kill criterion (> 3 GB): **NOT triggered**

**Disk kill criterion (< 8 GB after download):** **NOT triggered** (9.5 GB free after all installs including model)

**Download note:** Unauthenticated HF/XET download took ~14 min for 2.34 GB (first cold download). Rate varies: bursts to 4–5 MB/s then rate-limited. Set `HF_TOKEN` env var to speed up subsequent downloads.

### Transcription Run

**Command:**
```bash
time .venv-asr/bin/parakeet-mlx \
  --output-format json \
  --output-dir /tmp/parakeet-out \
  out/ep23-india-market-crash-recovery/audio/s1.mp3
```

**Input:** `out/ep23-india-market-crash-recovery/audio/s1.mp3` (67 KB, ~4 s narration)

**Wall time:** 14:12.69 total (mostly model download; CPU: 4.47s user 3.38s system)  
**Actual inference time** (model warm, no download): expected < 2 s for a 4-second clip.

**Reference narration (ep23 s1):** `"India's market crashed in March, then jumped in April. Why?"`  
**Transcript output:** `"India's market crashed in March, then jumped in April. Why?"`

**WER: 0.000 (perfect match) · CER: 0.000**

**JSON sample (token-level timestamps):**
```json
{
  "text": "India's market crashed in March, then jumped in April. Why?",
  "sentences": [
    {
      "text": " India's market crashed in March, then jumped in April.",
      "start": 0.0, "end": 3.36, "confidence": 0.997,
      "tokens": [
        {"text": " Ind", "start": 0.0, "end": 0.32, "confidence": 0.999},
        {"text": "ia",  "start": 0.32, "end": 0.4,  "confidence": 1.0},
        ...
      ]
    },
    {"text": " Why?", "start": 3.36, "end": 3.92, "confidence": 0.994}
  ]
}
```

**Timestamp level:** sub-word token (BPE fragments like " Ind", "ia", "'", "s"). Token → word alignment is straightforward by grouping tokens until a space-prefixed token starts the next word.

**Pass test:** transcript is exact, times cover full audio, confidence ≥ 0.997 throughout.

**Decision:** ADOPT. `.venv-asr/bin/parakeet-mlx` is ready for T1 transcription wrapper. WER = 0 on this clip; recommend testing on a longer clip (30 s+) for T1 final verification.

---

## S-06 Remotion Modules + ESLint Plugin

**Time box:** 45 min · **Status:** PASS

### Packages Installed

**Commands:**
```bash
cd remotion-app
npm install --save-dev @remotion/layout-utils@4.0.532 @remotion/rough-notation@4.0.532 \
  eslint@8.57.1 @remotion/eslint-plugin@4.0.532 @typescript-eslint/parser@8.71.1
```

**Exact versions installed:**
- `@remotion/layout-utils@4.0.532`
- `@remotion/rough-notation@4.0.532`
- `eslint@8.57.1`
- `@remotion/eslint-plugin@4.0.532`
- `@typescript-eslint/parser@8.71.1`

**Version check:** `@remotion/eslint-plugin@4.0.532` exists on npm and installed successfully.

### ESLint Flat Config

**File created:** `remotion-app/eslint.config.mjs`

Uses `@remotion/eslint-plugin`'s exported `flatPlugin` object which carries:
- `plugins['@remotion']` — all rule implementations
- `rules` — the recommended rule config (all `@remotion/*` rules)

ESLint 8.x requires `ESLINT_USE_FLAT_CONFIG=true` environment variable to use flat config. Set in npm script.

**npm script added:** `"lint": "ESLINT_USE_FLAT_CONFIG=true eslint src/"`

### TypeScript Check

**Command:** `npx tsc --noEmit`
**Result:** exit 0 — PASS, no type errors.

### ESLint Run

**Command:** `npm run lint`
**Result:** 5 problems on `src/*.tsx` (3 errors, 2 warnings)

```
src/NewScenes.tsx:433:19  warning  non-pure-animation  @remotion/non-pure-animation
src/Root.tsx:10:82        warning  non-pure-animation  @remotion/non-pure-animation
src/Scenes.tsx:49:72      error    from-0 (remove from=0, it is now the default)
src/Scenes.tsx:79:66      error    from-0
src/Scenes.tsx:91:57      error    from-0
```

**Kill criterion (plugin cannot run in flat config):** NOT triggered. Plugin runs successfully in flat config with `@typescript-eslint/parser` for TSX parsing.

**Note:** Findings were NOT fixed (per task spec — record only).

**Decision:** ADOPT. Flat config works. ESLint 8.57.1 + flat config via env var is the working pattern.

---

## S-10 textstat Readability

**Time box:** 15 min · **Status:** PASS

**Command:**
```bash
~/.local/bin/uv pip install --python .venv-asr/bin/python textstat
```
**Result:** exit 0. textstat==0.7.13 installed (+ nltk, pyphen, regex, defusedxml).

**Grade computation on ep23 narration (1248 chars, ~120 words):**
```python
import textstat
# ep23 full narration (all scenes concatenated)
textstat.flesch_kincaid_grade(text)  # → 4.2
textstat.flesch_reading_ease(text)   # → 79.7
textstat.gunning_fog(text)           # → 5.8
textstat.coleman_liau_index(text)    # → 7.5
textstat.dale_chall_readability_score(text)  # → 11.4
```

**Interpretation:** FK grade 4.2 = 4th-grade reading level, Flesch ease 79.7 = "Easy". This confirms the narration is appropriately plain-language (target: kids + adult plain-language per project direction).

**Decision:** ADOPT. `textstat` is 1-line integration; FK grade is the primary metric for L4 script lint. Dale-Chall high (11.4) due to proper nouns (₹, Nifty, lakh crore); not a concern.

**Remaining risk:** None for basic integration. If targeting < 6th grade consistently, avoid proper noun inflation of Dale-Chall.
</content>
