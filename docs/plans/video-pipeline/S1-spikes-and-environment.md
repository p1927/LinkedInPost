# S1 Spikes and environment (prove each reused component before depending on it)

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Reuse IDs: [R1](R1-reuse-register.md) · Status: not started · Replaces "Wave 0 installs everything" with time-boxed spikes that can say no.

## Purpose
The reuse list came from skim-level surveys. Before any layer depends on a copied file or a package, run it once on a real input. Each spike has a time box, a pass test and a kill criterion, so a component that does not work is dropped early instead of becoming debt.

## Have
- Machine: Apple M4, 10 cores, 32 GB RAM, about 14 GB free disk (measured 2026-10-06). `.venv` is Python 3.14.0; ffmpeg 8.0.1 with the needed filters; uv available.
- Clones: `vendor/*`, `reference/*` (hyperframes alone is 642 MB), `direction/skills/vendor/*`.
- `third_party/` does not exist yet.

## Others have
- R1 lists the candidates; the Trade survey names exact files; OpenMontage stdlib-only files confirmed by import inspection.

## Want
A spike table where every row has: component, input used, pass test, kill criterion, time box, result, decision (adopt / wrap / idea only / drop), recorded in `third_party/INDEX.md` and in the R1 row.

| Spike | Time box | Pass test | Kill criterion |
|---|---|---|---|
| S-01 Disk: free space and what to prune | 15 min | at least 8 GB free after pruning `reference/hyperframes` (extract needed files first) and caches | cannot reach 8 GB: stop installs, ask owner what to delete |
| S-02 `parakeet-mlx` in `.venv-asr` (py3.12) | 45 min | transcribes a real episode mp3 with word times, under 2 min, model size recorded | install fails or model above 3 GB: skip T1 audio-vs-script, keep TTS word times |
| S-03 Copy OpenMontage `slideshow_risk.py`, `variation_checker.py`, `delivery_promise.py` | 30 min | each runs on a real `episode.json` converted by a small adapter and returns a score | needs more than a 30-line adapter: take the idea only |
| S-04 Copy OpenMontage `audio_mixer.py` + `base_tool` stub | 45 min | mixes a real voice + music pair with ducking, measured -14 LUFS +/- 1 | stub grows past 60 lines: use ffmpeg `sidechaincompress` directly (already planned fallback) |
| S-05 Copy Trade `browseros_client/client.py` | 45 min | opens one JS-heavy page and returns text, when BrowserOS is running | BrowserOS MCP not reachable: keep tier disabled, document |
| S-06 Remotion modules `@remotion/layout-utils`, `rough-notation` + official ESLint plugin | 45 min | typecheck passes; ESLint runs on `remotion-app/src` and prints findings | plugin cannot run in flat config: drop the linter item |
| S-07 ffmpeg frame checks: `signalstats`, `scdet`, `freezedetect`, contrast via coloraide on a still | 60 min | a 90 s render yields per-scene luma stats and one contrast number for a known text box | any filter missing: drop that sub-check |
| S-08 MiniMax M3 with reasoning off | 20 min | one small JSON call returns valid JSON faster than the same call with reasoning on; speed ratio recorded | field rejected or output quality drops: keep reasoning on for the writer only |
| S-09 `doit` vs stdlib lane runner | 60 min | runs three independent steps in parallel with caching | takes more than 40 new lines: use stdlib |
| S-10 `textstat` readability | 15 min | grade computed for a real script | install fails: use a 10-line sentence-length measure already in `lint.py` |

## Flaws found
1. No copied component has been run yet; every reuse row is unverified.
2. Disk is the tightest resource and is not yet protected by any check.
3. Python 3.14 vs MLX/librosa wheels unknown.

## Work items
- S1.1 Run the spikes in the table, in parallel where they touch disjoint files, and fill `third_party/INDEX.md` (file, source commit, licence file copied, what it needs, result, decision).
- S1.2 Pin: each copied file records the upstream commit hash; copied files are not edited (wrappers only).
- S1.3 Update R1 rows with the result; rows that fail become "idea only".
- S1.4 Disk watchdog function used before installs and renders (also X1).

## Acceptance
- Every spike has a recorded decision. Total new wrapper code from all spikes stays small (each adapter within its stated limit).
- Free disk at least 8 GB after setup.

## Depends on
Nothing. Feeds every layer kit.

## Risks and mitigations
- Copied code carries bugs we do not understand: INDEX pins the commit and records a test; unused copies are deleted at the end of Slice 1.
- Time sink: strict time boxes; a spike that overruns is dropped.

## Open questions
- None.
