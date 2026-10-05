# L7 Asset generation (voice, images, keyframes, clips, music)

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Status: built (paid, MiniMax only) · Gate: nothing runs until `status: approved` with a fresh passing QA

## Purpose
Produce the media each scene needs at the lowest cost, never re-paying for unchanged scenes, and show the owner the cost before spending.

## Have (verified)
- Adapters behind `config/providers.yaml`: `tts_minimax` (word timings), `image_minimax` (image-01), `video_minimax` (Hailuo/MiniMax-H3, about USD 0.08 per second at 768P, price recorded 2026-10-05), offline music synth (`tools/gen_music.py`).
- Content-hash cache (`cache.py`): unchanged scene means zero paid calls; `manifest.py` plans what a build would generate and clip cost against `max_clip_cost_usd: 6.0` (override `--force-cost`).
- Stage order in `run.py <id> all`: tts, illustrations, keyframes, clips, props, render, carousel.
- Voice speed 1.05 and loudnorm target (TP -2.0) from the ep23 build.
- Animatic (`animatic.py`): free preview with placeholder cards where paid media goes.

## Others have
- explainroo: fully local path (Kokoro TTS, Whisper alignment, stills). Rejected for us: the machine is too small for local TTS (owner, 2026-10-06).
- claude-code-video-toolkit, openshorts: provider-swappable generation (ElevenLabs, fal.ai, Gemini) with brand configs; GPU rented, so not free.
- juspay director: cheap critic on a still before the expensive clip; spend cap.
- OpenMontage: provider selector with cost tiers and fallbacks.

## Want
- Free draft voice for the animatic with no model: macOS `say` (word timing estimated from text, or from Parakeet if disk allows). Paid MiniMax voice only for the final build. No local neural TTS.
- Data scenes need no generated media (already true); prefer them over illustrations for factual beats, which also cuts cost.
- Alternate illustration path: Remotion-native vector illustration or stock/Wikimedia with licence tracking, for beats where a generated image adds little.
- Clip use limited to story beats; each clip preceded by an approved keyframe still (keyframe-first review).
- Cost report before approval and after build (`out/<id>/cost.json`), including retries.
- Retry and timeout policy per provider with partial-success resume (a failed clip does not discard finished scenes).

## Flaws found
1. All three media slots are MiniMax (paid); no free preview voice, so animatic has no audio.
2. Lint requires at least one clip scene even for data-driven explainers (waiver needed); the cost and value of that rule is not tied to the story.
3. Keyframe-before-clip review exists conceptually (doc 13) but not as an approval step.
4. No unified cost record across stages.

## Work items
- L7.1 Draft-voice adapter using macOS `say` for the animatic (no model, no download); T1 can align it. Quality improvements to drafts are in the backlog.
- L7.2 `cost.json` recorder across stages; show estimate in `manifest`.
- L7.3 Keyframe approval step before clips (reads `animatic`/stills, owner approves).
- L7.4 Resumable stages (verify each stage's partial results are reusable).
- L7.5 Decide clip mandate rule (see open questions).

## Acceptance
- Golden brief: draft audio available free before approval; manifest shows exact paid units and cost; rebuild after a one-line edit calls the paid APIs only for the changed scene.

## Depends on
L4, L5, L6. Feeds L8.

## Open questions
- Is a free voice acceptable for the animatic only, or should we evaluate it for finals?
- Keep "at least one clip" as an error for all episodes or only for story-led ones?

## Setup scope (rev 3)
This phase only delivers the layer kit (master plan 6.1): MiniMax adapters kept; macOS `say` draft voice for the animatic; `cost.json` recorder; no local neural TTS. Backlog: B-L7-*. Everything else in Want and Work items is improvement work, to be picked from the backlog after setup.

## Reuse and parallelism (rev 2, 2026-10-06)
IDs refer to [R1](R1-reuse-register.md). Items are leads until a work package opens and runs the file.
- **Take:** R-32 ViMax best-of-N image judge (MIT) so the pipeline generates N candidates and picks one (paid, so cap N); R-85 cost ledger entries per paid call (see X1).
- **Parallel:** TTS per scene concurrently; images/clips per scene concurrently; both start only after script approval. Music pick and beat grid (A1) can run earlier from the outline.

## Risks and mitigations (rev 5)
- Paid-cost surprises: estimate before approval, cost cap and ledger, `cost.json`; Slice 1 uses no clips (data and diagram scenes), with the existing waiver.
- Provider outage: stages resumable, finished scenes kept; draft voice via macOS `say` for the animatic.
- Rights: `rights.json` per asset (C1).
