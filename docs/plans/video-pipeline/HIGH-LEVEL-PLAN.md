# Video Pipeline: High-Level Plan (start here)

Date: 2026-10-06 · Status: PLAN, nothing built · This page summarises everything; the detail lives in the linked documents.
[00-MASTER-PLAN](00-MASTER-PLAN.md) rules and waves · [01-MASTER-DESIGN](01-MASTER-DESIGN.md) architecture · [R1](R1-reuse-register.md) components taken from other repos · [BACKLOG](BACKLOG.md) later improvements

## 1. Goal in one paragraph
Turn a brief into a finished video that answers the owner's questions in order, explains things in plain language, looks and sounds different from the last videos, and is not generic "AI slop". Get there by building the pipeline as a chain of small layers connected by files, doing each layer's work with existing components copied from the repos we cloned, and checking every layer's output, including the pixels and sound of the rendered video.

## 2. Principles
1. **Layers connected by files**, each runnable, cached and replayable alone.
2. **Copy before module before wrapper before write.** Our own code is tech debt; the only code we own is thin glue (01-MASTER-DESIGN 8b).
3. **Genre decides structure; information decides the look.** Explainer, story, concept, data and documentary videos differ in beats, scenes, motion, sound and gates (G1).
4. **Check at every layer**, not only at the end. New checks start advisory, then become blocking one by one.
5. **Owner steers with a few switches**: genre, look, scene mix, motion, pace, sound, hook, bans. Approvals: outline (off by default, UI toggle), script, preview, publish.
6. **Small machine**: M4, 32 GB, about 14 GB free disk. Remote APIs (MiniMax only) for text, voice, images, clips; local work is ffmpeg, numpy, Chrome and at most one small ASR model. No local TTS or generation.
7. **Setup first, improvements in the backlog.**

## 3. The pipeline at a glance
```
brief + genre (L1, G1) -> research per question (L2) -> outline (L3) -> [optional approval]
   |-- TEXT   : script (L4) + script gates (L6)
   |-- DESIGN : identity (L5) + colour/brightness/element rules (D1) + scene choice (M1) + storyboard + slideshow-risk
   |-- SOUND  : music pick + beat grid (A1)
   join -> [script approval] -> TTS + images/clips (L7, paid, per scene in parallel)
   -> transcript + audio-vs-script check (T1) | mix: ducking, SFX, loudness (A1)
   -> preview render (L8) -> frame QA: contrast, brightness, flashes, overflow, seams (F1)
   -> one gate report (L6) -> [preview review + taste tags] -> full render + packaging -> publish private (L9)
```
Parallel where independent: research per question; the three lanes after the outline; audio per scene; transcript, mix and image/clip generation after TTS; the F1 sub-checks; render chunks.

## 4. The layers (23 plans, all exist)
| Group | Plans | One line |
|---|---|---|
| Front | L1 brief, G1 genre packs, L2 research, L3 outline | Know exactly what is asked, what kind of video, and what is true |
| Make | L4 script, L5 identity, D1 design rules, M1 scenes and motion, A1 audio, L7 assets, L8 render | Produce the video from the outline |
| Check | T1 transcript, F1 frame QA, L6 gates | Verify script, sound and pixels, one report |
| Ship | L9 publish and analytics | Private upload first |
| Cross-cutting | X1 operations, X2 testing, S1 spikes, E1 evaluation, C1 compliance and rights, V1 versioning | Timing, cost, parallel runner, golden briefs |
| Reference | R1 reuse register, BACKLOG | Where components come from; what comes later |

## 5. What we reuse (summary of R1, about 100 items)
| Need | Taken from | How |
|---|---|---|
| Web search and page reading | our ported MiniMax search and Steel reader; Trade BrowserOS client and record-only prompt | copy; two-source number check rewritten (about 40 lines) |
| Quality scoring and review | OpenMontage slideshow-risk, variation checker, delivery-promise lock, composition validator, pacing check, visual QA, cost tracker | copy files (stdlib-only ones as is) |
| Review rubrics and story rules | OpenMontage reviewer rules, ai-film-crew director and supervisor roles, content-skills hook checklist, HyperFrames beat-direction, story-spine, narration, video-composition, shotkit rubrics | text into craft cards |
| Transcript | `parakeet-mlx` CLI JSON | module; about 20-line reshape |
| Audio mix | OpenMontage `audio_mixer.py`, ffmpeg `sidechaincompress` and `loudnorm`, HyperFrames beat grid | copy + ffmpeg |
| Frame QA | ffmpeg `signalstats`, `scdet`, `blackdetect`, `freezedetect`; coloraide contrast; HyperFrames contrast technique | ffmpeg and module; port the technique |
| Motion and scenes | `@remotion/layout-utils`, `rough-notation`, effects, Remotion rule files, official ESLint plugin; manim ideas for new scenes | modules and text; new scenes one at a time |
| Parallel runner | `doit` or stdlib + our `cache.py` | one-hour spike, no hand-built engine |
| Genre and format data | our own `format_catalog.yaml`, `craft/modes.yaml`, `routing.yaml`, 10 archetypes | mapping file only |

## 6. How every video stays distinct, understandable and not slop
- **Distinct:** genre pack x look (rotated over the last 5) x scene vocabulary x motion personality x sound mood, plus an episode-fingerprint comparison with recent episodes and a slideshow-risk score.
- **Understandable:** define-before-use lint, readability grade, anchor-every-number rule, comprehension test, one idea per scene, and the owner's "did I understand it?" verdict at preview.
- **Not slop:** generic-phrase list, banned AI-default looks, something concrete (number, name, date, source) in every scene, pixel checks on the rendered frames, and the owner's taste tags.
- **Taste log (decided):** at preview review the owner tags each episode (keep, too similar, too flat, confusing, off-brand) into `review.json`. Setup only records the tags; using them to steer later choices is in the backlog.

## 7. Order of work: setup in parallel waves
| Wave | What | Gate |
|---|---|---|
| 0 Environment and intake | disk check; `.venv-asr` with Parakeet; npm modules; copy the chosen files from other repos into `third_party/` and record whether each runs; craft cards from the rubrics; tokens file; genre packs file; golden briefs; retire old drafts | each copied tool runs on one real input or is marked "does not run, reason" |
| 1 Layer kits, part 1 | T1, F1, A1, L1 (with genre), L2 | each kit passes its good and bad fixture and writes to the gate report |
| 2 Layer kits, part 2 | L3 outline, D1 rules, M1 (ESLint plugin + one pilot scene), L5/L8 identity coverage | outline validates; bad palette fails; pilot scene renders |
| 3 End to end, thin | one gate report; writer takes outline; lane runner; replay a golden brief through every layer | golden brief runs brief to preview with each layer writing its contract and gate entries |
Then improvements come from the backlog. A "layer kit" means: contract file, runnable command, cache key, a reused component actually running, gate hook, good and bad fixtures, owner file, doc updated.

## 7b. Slice 1: implement the explainer first
All layers are planned, but only the explainer path is built first: one video end to end, reviewed by the owner and kept as the reference episode (E1). Story, concept, data and documentary packs, new scene types, publishing and analytics wait for the result. Spikes (S1) prove each reused component first and can drop it. LLM speed: MiniMax M3 with reasoning off (X1, verified by spike S-08).

## 7c. Biggest weaknesses and how the plans answer them
| Weakness | Answer |
|---|---|
| Nothing proven yet | S1 spikes with kill criteria |
| No good reference to calibrate against | E1 reference episode and degraded copy |
| Writer and checker share blind spots | deterministic checks first, different chain for verifier, evidence ids, human gates (L4, L6) |
| Gates are proxies | outcome measures and owner verdict (E1) |
| Finance and rights risk | C1 rules, claim ledger, `rights.json` |
| Old episodes break | V1 versions and shims |
| Slow LLM calls | reasoning off for M3, smaller prompts, parallel lanes, timing data (X1) |
| Alert fatigue, noisy checks | tiers, caps, precision-based promote/demote (E1, L6) |
| Too big before first video | Slice 1 |
| Disk and load on a small machine | watchdog, concurrency caps (S1, X1) |

## 8. Decisions already made (owner)
Licences not a concern (personal use). Plans first. Current languages only. No local TTS. All LLM calls through MiniMax. Outline approval off by default with a UI toggle. Research tiers are simply copied and used when available. New checks advisory first. Protected files may be edited (in-progress work committed and pushed as `e4f26d2`). Old drafts retired reversibly. Taste log records only at first.

## 9. Main risks
Disk (about 14 GB free; check before every install and prune clones). Copied files drag in coupling (then take the idea only). Judgment thresholds untested (advisory first, tune on ep20-ep24). Research quality on JavaScript-heavy pages. The surveys read headers and file lists, so every reuse row is a lead until a work package runs it.

## 10. Next step
On the owner's go: Wave 0. Nothing is built until then.
