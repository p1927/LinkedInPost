# Backlog: improvements per layer (after the layers are set up)

Date: 2026-10-06 · Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Rule: nothing here is built during the setup phase. An item moves into a child plan only when its layer passes the "layer kit" checklist (master plan 6.1) and the owner picks it.
Tags: **V** = value (H/M/L), **E** = effort (S/M/L), **Trig** = what should make us pick it up. IDs refer to [R1](R1-reuse-register.md).

## G1 Genre packs
- B-G1-1 Long-form 16:9 formats and packs (with L8-1). V H, E L.
- B-G1-2 Taste log used for selection: down-weight combinations tagged 'too similar' or 'too flat' (setup only records the tags). V H, E M.
- B-G1-3 More packs (montage/visual, character series as its own pack). V M, E S.
- B-G1-4 Per-genre reference boards (3 approved episodes each) shown next to the preview. V M, E S.

## L1 Brief
- B-L1-1 Idea mining from comments, autocomplete, competitor outliers to suggest briefs (R-81). V M, E M. Trig: owner runs out of topics.
- B-L1-2 Brief templates per information type (rate over time, share, mechanism, chronology). V M, E S.

## L2 Research
- B-L2-1 Number corroboration: key figures must appear in two independent sources. V H, E M. Trig: first wrong number found.
- B-L2-2 Extra reader fallbacks beyond the copied Trade chain (only if a site class still fails). V M, E M.
- B-L2-3 Source quality scoring per domain (`config/source_quality.yaml` extended). V M, E S.
- B-L2-4 Stock/photo search with source records (R-80) for b-roll beats. V L, E M.

## L3 Story design
- B-L3-1 Story bible per episode: premise, spine, forbidden list (higgsfield templates). V M, E S.
- B-L3-2 Worked-example library (cases that explain a concept, reused across episodes). V M, E M.
- B-L3-3 Auto A/B of two outlines, owner picks. V M, E M.

## L4 Script
- B-L4-1 Cut LLM wall time without a second model: fewer, smaller calls (targeted repair), prompt caching, parallel lanes. All calls stay on MiniMax (owner decision). V H, E S. Trig: next 100-minute run.
- B-L4-2 Hook A/B: three hook forms scored with the hook checklist (R-66, R-67). V M, E S.
- B-L4-3 Pronunciation lexicon for numbers, Indian currency units, tickers. V M, E S.

## L5 Visual direction
- B-L5-1 More identity archetypes and palettes (mine ui-ux-pro-max CSVs read-only). V M, E S.
- B-L5-2 Illustration style tied to identity so generated images match the theme. V M, E M.
- B-L5-3 Map, isometric blocks, blueprint draw, racing bars scene primitives (R-49 HyperFrames blocks as references). V M, E L each.

## D1 Design system
- B-D1-1 APCA contrast as an advisory next to WCAG (R-22). V L, E S.
- B-D1-2 Colour-blind simulation check upgraded to all three types with delta-E tuning (R-23). V M, E S.
- B-D1-3 Per-archetype brightness bands and element limits (instead of global). V M, E S.
- B-D1-4 Colour grading for photographic/AI raster mixed with flat art (R-31, OpenMontage color_grade concept). V L, E M.
- B-D1-5 Auto-generated style card per episode shown at outline approval. V M, E M.

## M1 Motion and scenes
- B-M1-1 `morph` scene (matched parts crossfade approximation of manim TransformMatchingParts; R-46). V M, E L.
- B-M1-2 `proportion`/probability box and `numberline` with value tracker (R-45, R-48). V M, E M each. (`numberline` is the pilot in setup if time allows.)
- B-M1-3 Shader/WebGL transitions and light leaks, one per episode max (R-42, R-49). V L, E M. Trig: Docker renderer passes the WebGL test.
- B-M1-4 Attention cues: indicate, flash, focus-dim (R-47). V M, E S.
- B-M1-5 Motion blur on fast pans (R-42). V L, E S.
- B-M1-6 Motion personalities beyond calm/snappy/playful. V L, E S.

## T1 Transcription
- B-T1-1 Other languages (mlx-whisper, R-03) and forced alignment of known script (R-04). V L now, E M. Trig: first non-English episode.
- B-T1-2 Reference-video transcript ingest for the direction brain. V M, E M.
- B-T1-3 Caption grouping tuned from the grouping rules (R-07) and A/B on retention. V M, E S.

## A1 Audio
- B-A1-1 Beat-synced cuts using the beat grid (R-11). V M, E M.
- B-A1-2 Per-episode music generation or curated music library; decide on ACE-Step vs local folder given disk. V M, E M.
- B-A1-3 SFX library with a curated whoosh/click/ding set, density knob. V M, E S.
- B-A1-4 Voice EQ and compression chain tuned on real MiniMax output (R-10). V M, E S.
- B-A1-5 Local neural TTS: REJECTED for this machine (owner 2026-10-06). Revisit only on better hardware.

## L6 Gates
- B-L6-1 Optional vision critic on one still per scene with capped retries (R-32, R-33). V M, E M.
- B-L6-2 Two-model judge disagreement flag on story editor. V L, E M.
- B-L6-3 Promote repeated warnings to blocking after N episodes. V M, E S.
- B-L6-4 Episode fingerprint distance threshold tuned on real history (master design 6). V M, E S.

## F1 Frame QA
- B-F1-1 Banding detection tuned on a known-good render. V M, E M.
- B-F1-2 Seam gate for transitions (R-27). V L, E M.
- B-F1-3 OCR cross-check of text boxes with macOS Vision (R-26). V L, E M.
- B-F1-4 Caption occlusion check against key subjects (R-30). V L, E M.
- B-F1-5 Thresholds tuned on real renders, then promoted from advisory to blocking. V H, E S. Trig: ep20-ep24 reviewed.

## L7 Assets
- B-L7-1 Keyframe-first approval before clips. V H, E M.
- B-L7-2 Best-of-N image judge with a cap on N (R-32). V M, E M.
- B-L7-3 Resumable stages with partial-success reuse. V H, E M.
- B-L7-4 Alternate illustration path: Remotion-native vector or stock. V M, E M.
- B-L7-5 Cost ledger with estimate/reserve/reconcile (R-85). V H, E M.

## L8 Render and packaging
- B-L8-1 16:9 long-form preset and layouts (the profile exists for 9:16 only). V H, E L. Trig: first long-form episode.
- B-L8-2 Parallel chunked full render and render-time budget with backdrop fallback. V M, E M.
- B-L8-3 Thumbnail variants and A/B. V M, E M.
- B-L8-4 NLE hand-off export (OpenTimelineIO). V L, E M.

## L9 Publish and analytics
- B-L9-1 YouTube metadata validator (R-82). V M, E S.
- B-L9-2 Retention-curve to per-scene learning, refusing simulated data (R-83). V H, E L. Trig: first published episodes have data.
- B-L9-3 Metrics honesty and Shorts-to-long-form funnel (R-84). V M, E S.

## X1 Operations
- B-X1-1 Provider scoring when a second provider appears (R-86). V L, E M.
- B-X1-2 Per-stage timing dashboard in the live runs UI. V M, E S.
- B-X1-3 Disk watchdog: warn before installs/renders when free disk is under a threshold. V H, E S.

## X2 Testing
- B-X2-1 More golden briefs across information types (rate, share, mechanism, chronology). V H, E M.
- B-X2-2 Nightly replay with cached inputs; diff of gate reports between runs. V M, E M.
- B-X2-3 Content hashing of reviewed frames (R-87). V M, E S.

## Housekeeping
- B-H-1 Prune large reference clones after extraction (`reference/hyperframes` is 642 MB; disk is tight). V H, E S.
