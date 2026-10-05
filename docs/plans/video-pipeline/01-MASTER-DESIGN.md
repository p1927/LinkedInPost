# Master Design: how the video pipeline is put together

Date: 2026-10-06 · Status: DESIGN, awaiting owner approval · Companion to [00-MASTER-PLAN](00-MASTER-PLAN.md) (order and rules), [R1](R1-reuse-register.md) (components taken from other repos), [BACKLOG](BACKLOG.md) (improvements after setup)
This document answers: what are the parts, what does each part hand to the next, which existing component does each part's work, where does the owner steer, and how do we keep videos from all looking alike. It describes design, not implementation order.

## 1. Design principles
1. **Layers connected by files.** Each layer reads named files and writes named files. Any layer can be run alone, cached, inspected and replayed. Nothing is passed in memory between layers.
2. **Compose, do not rewrite.** Each layer's heavy lifting is done by a component that already exists (ffmpeg filters, Remotion packages, Parakeet, files copied from the cloned repos). Our code is the wrapper, the contract and the check.
3. **Gates at every layer, not only the end.** A layer's output is checked before the next layer spends time or money.
4. **Information decides the look.** The kind of information in the brief (a rate over time, a share of a total, a mechanism, a chronology) decides scene types, colours and motion. The audience sets constraints (legibility, pace), not style.
5. **Owner control without owner labour.** The owner approves at four points and can steer with a small set of knobs; everything else has defaults chosen from the information.
6. **Cheap machine.** M4, 32 GB, about 14 GB free disk: remote APIs for generation, local ffmpeg/numpy/Chrome for everything else, at most one small ASR model.
7. **Evidence over claims.** A layer is "done" only with a fixture that fails and one that passes, and a real input run.

## 2. System map

```
                     OWNER (4 approval points: outline, script, preview, publish)
                        |
L1 brief (+ genre pack chosen: G1) ---> L2 research ---> L3 outline ---(approve, optional)--->  fan out
                                                     |
        +--------------------+-----------------------+----------------------+
        | TEXT               | DESIGN                | SOUND                |
        | L4 script          | L5 identity           | A1 music bed + beat  |
        | + script gates     | D1 colour/element lint|                      |
        |                    | M1 scene per beat     |                      |
        |                    | storyboard + risk     |                      |
        +----------join: script gates pass AND design lint passes -> approve script
                        |
        L7 TTS + images/clips (paid, per scene in parallel)
                        |
        +---------------+----------------+
        | T1 transcript | A1 voice QA + mix (duck, SFX, loudnorm) | (images/clips)
        +---------------+----------------+
                        |
        L8 preview render ---> F1 frame QA (parallel sub-checks)
                        |
        join: gate_report.json -> owner reviews preview -> L8 full render + packaging -> L9
```

## 3. Layer contracts
`brief.json` etc. live under `out/<episode>/` (or the episode folder). "Reused" lists the components that do the work (IDs in R1).

| Layer | Reads | Writes | Core fields | Work is done by (reused) | Checks it feeds |
|---|---|---|---|---|---|
| G1 Genre pack | brief | `brief.json: genre`, `direction/format_packs.yaml` slice | genre (explainer, story, concept, data, documentary), beats, archetype pool, scene lean, motion, sound, narration register, gate list | existing `format_catalog.yaml`, `craft/modes.yaml`, `routing.yaml` (R-101); `identity.py` classifier | per-pack gate list |
| L1 Brief | owner request | `brief.json` | questions (verbatim), dates, audience, genre, promise type, constraints | existing `--brief`; R-72 promise lock | brief integrity, date-in-evidence |
| L2 Research | `brief.json` | `research.json` | per question: sources, extracted facts, data series, evidence rating, `unsupported` flag | Trade research stack (port); R-80 stock search optional | research report gate, number match |
| L3 Outline | brief + research | `outline.json` | beats in question order, terms-before-use, visual type per beat, evidence ids, target duration | R-60 director contract; R-61..R-65 beat/story rules; R-66 hook checklist | outline validators |
| L4 Script | outline + research | `episode.json` (scenes) | narration per scene, claims with evidence ids | existing writer; R-62 narration; R-67 hook upgrade; R-73 robust JSON/retry | lint, verify, story editor |
| L5 Identity | outline | `identity.json` | archetype, palette, fonts, caption/term style, motion personality, transition set | existing `identity.py`; tokens (D1) | identity contrast, rotation |
| D1 Design rules | identity, storyboard | rule results | brightness band, accent count, colour-blind, element limits | `tokens.yaml`; coloraide; R-31 video rules; R-68 slideshow risk | lint block of gate report |
| M1 Scenes | outline | `storyboard.json` | scene type + parameters per beat, emphasis, transition per cut | existing scenes; layout-utils, rough-notation, rule files (R-40, R-41, R-43) | motion lint, safe zones |
| L7 Assets | episode, identity | `audio/*.mp3`, `images/*`, `clips/*`, `cost.json` | files + provider + cost | MiniMax adapters; R-32 image judge; R-85 cost ledger | cost cap, asset exists |
| T1 Transcript | audio | `transcript.json` | words with start/end, per-scene WER vs script | R-01 parakeet-mlx (or R-02 wrapper); R-06 jiwer | `audio_matches_script` |
| A1 Audio | audio, transcript, music, storyboard | `mix.wav`, `audiomap.json`, audio QA | LUFS, true peak, duck depth, SFX list, beats | ffmpeg loudnorm + sidechaincompress (R-08, R-09); R-10 numbers; R-11 beat grid | audio gate |
| L8 Render | episode, identity, storyboard, mix | `preview.mp4`, `final.mp4`, thumbnail, carousel, packaging | durations, captions | Remotion; R-14 post-production rules; R-07 caption grouping | composition validator (R-28), pacing (R-29) |
| F1 Frame QA | render | `frame_qa.json`, overlay sheet | per frame: contrast behind text, brightness, flashes, overflow, safe zone, seams | ffmpeg signalstats/scdet/freezedetect (R-24); DOM text boxes (R-20 technique); R-25, R-27, R-30 | frame gate |
| L6 Gates | all of the above | `gate_report.json` | layer, rule, severity, root cause, fix hint | existing lint/verify; R-70 CHAI rules; R-71 supervisor; R-69 variation | approval (S5, S9) |
| L9 Publish | final, packaging | upload record, analytics | private upload, metrics | existing publishers; R-82 validator; R-83 retention | owner decision |
| X1 Ops | all runs | `runlog`, `cost.json`, timings | per stage time, spend | R-73, R-85; live runs UI | budget gate |
| X2 Tests | golden briefs | replay results | pass/fail per layer | existing `selfcheck.py`; R-87 hashing | regression |

## 4. Gate report (the one place results go)
`gate_report.json`: list of `{layer, rule, severity (error|warn|info), evidence (file/frame/field), root_cause, fix_hint, advisory (bool), waived (bool)}`. Rules:
- Every layer writes entries; the UI and the owner see one list.
- New checks (D1, F1, A1, T1) ship **advisory**: shown, not blocking. After they have been tuned on real episodes, each is promoted to blocking individually.
- An inconclusive LLM or model check is `info`, never blocking.
- Reviewer-style findings follow the CHAI rules (R-70): accurate (cites a field or frame), complete (scans for the same class), constructive (concrete fix, else labelled as investigation).

## 5. Control model (what the owner steers)
Approval points: **outline** (optional, off by default, toggled in the UI: does the story answer my questions in order, with these visuals?), **script**, **preview**, **publish**. All LLM calls go through MiniMax.

Knobs, all optional, stored in `brief.json` or a `direction` block, with defaults chosen from the information:
| Knob | Controls | Default comes from |
|---|---|---|
| `look` | identity archetype/palette override | information type of the brief (identity.py) |
| `scene_mix` | preferred or forbidden scene types (e.g. no clips, more charts) | outline's information shapes |
| `motion` | personality set from tokens: calm, snappy, playful | audience constraints + archetype |
| `pace` | hold floors and scene length range | audience card |
| `sound` | music mood/BPM, SFX density, ducking depth | archetype + topic |
| `hook` | hook form (question, number, contrast, scene) | hook checklist options |
| `bans` | extra banned phrases or looks for this episode | global banned-defaults list |
| `rerun` | rerun a single layer from cached inputs | `run.py <layer>` |
| `approvals.outline` | outline approval on/off; **default off**; UI toggle per run and as a global default | owner toggle |
Every override is written to the decision log (existing `scene_edit.py`/`manifest.py` mechanism) so a later episode or review can see why.

## 6. Variety model: avoiding the same-template look
Variety is designed in, from the information, and checked.

**Dimensions that vary per episode** (each chosen from a catalogue, not at random):
0. Genre pack (G1): explainer, story, concept, data, documentary. It sets structure, gates and the pools the other dimensions draw from.
1. Identity: archetype x palette x font pair x backdrop x caption and term style (exists; 10 archetypes, rotation over the last 5).
2. Scene vocabulary: which of chart, timeline, forces, compare, steps, diagram, number, plus new (numberline, proportion, morph, emphasis layer) carries each beat, chosen from the beat's information shape (L3).
3. Motion personality: easing/spring set and entrance recipe from tokens; one dominant transition direction; at most 3 presentations per episode; at most one decorative effect.
4. Sound: music mood/BPM, SFX density, ducking depth, silence before the takeaway.
5. Hook and structure: hook form and beat framework (from the story rules), analogy or worked example.
6. Pacing profile: hold floors and change cadence from the audience.

**How sameness is detected** (all advisory at first):
- **Episode fingerprint**: archetype, palette hue, scene-type histogram, transition set, motion personality, music mood. Compared with the last 5 episodes; too-close fingerprints produce a warning with the nearest episode named.
- **Slideshow-risk score** (R-68) on the storyboard: repetition, decorative visuals, weak motion, no shot intent, typography over-reliance.
- **Variation checker** (R-69): repeated scene patterns and generic phrases ("stunning", "in today's world").
- **Banned defaults** (D1): cream + terracotta adult look, full-screen linear gradients on dark, lone fades as the only entrance, neon on dark.
- **F1 pixel checks** so a pleasing palette cannot hide unreadable text or a harsh brightness jump.

## 6b. Making every video distinct, human-understandable and not "AI slop"
Slop is what you get when nothing specific constrains the output: generic phrases, the same layout and entrance everywhere, stock-looking visuals, unexplained jargon. The countermeasures are structural, not a final polish step.

| Slop symptom | Countermeasure (and where) |
|---|---|
| Every episode looks the same | Genre pack x archetype pool x scene vocabulary x motion personality x sound mood; rotation over the last 5 plus an episode-fingerprint distance check (G1, L5, L6) |
| Generic wording ("stunning", "in today's world", "a person") | Generic-phrase list from the copied variation checker (R-69) and the hook/narration rubrics (L4, L6) |
| Layout and entrance repeated on every scene | Slideshow-risk score (copied R-68) on the storyboard; scene types chosen from the beat's information shape (L3, M1) |
| Nothing specific on screen | Each scene must carry something concrete from the research: a number, name, date or source; the outline records the evidence id per beat (L2, L3) |
| Unreadable or flat-looking frames | F1 pixel checks: contrast behind text, brightness jumps, clipping, overflow (F1) |
| Jargon the viewer cannot follow | Terms-before-use lint, readability grade (R-98), comprehension test (learner model), anchor-every-number rubric (G1, L6) |
| AI-default looks (cream + terracotta, neon on dark, glossy gradients, emoji icons, fake text in images) | Banned-defaults list in tokens, checked by D1 and F1; no AI-drawn text rule in L7 prompts |
| Owner cannot tell why it looks the way it does | Outline and style card show the genre, archetype and reasons before spending; every override is logged |
| Same mistakes repeat | **Taste log**: at preview review the owner tags each episode (keep, too similar, too flat, confusing, off-brand) in `review.json`; rotation and the fingerprint check read the last tags so a combination tagged "too similar" is not chosen again soon. Setup records the tags; using them for smarter selection is backlog |

Reference boards: for each genre, keep three approved episodes as the reference set; the preview contact sheet is shown next to them at review.

## 8b. What we write ourselves (the glue register)
Our own code is tech debt, so the list is short and each item names what it wraps. Anything else must be copied or installed (R1 code policy).
| Our file | Size target | Why it cannot be copied | Wraps |
|---|---|---|---|
| `brief.py` | small | owner request format and our contract | existing `--brief` |
| `outline.py` | small | our outline contract and validators | `lint.py` helpers |
| `research.py` | medium | per-question planner over our brief | copied Trade BrowserOS client, existing `adapters/*` |
| `tools/transcribe.py` | about 20 lines | reshape tokens to words | `parakeet-mlx` CLI JSON |
| `tools/frame_qa.py` | thin | sampling and report format | copied `visual_qa.py`, ffmpeg filters, coloraide |
| mixer call site | thin | token numbers in, our file out | copied `audio_mixer.py` |
| ESLint rule file | at most 30 lines | linear easing and un-clamped interpolate | `@remotion/eslint-plugin` |
| gate-report writer, token loader, `format_packs.yaml` | tiny / data | our contracts | none |
| adapters for slideshow-risk, variation, delivery-promise, composition validator | about 20 lines each | feed our files to copied code | copied OpenMontage files |

## 9b. Review: what the first draft of this design was missing (now added)
1. **Genre concept** (G1): explainer, story, concept, data and documentary videos need different structure and gates; before this they differed only by look.
2. **Understandability as something measured**, not assumed (readability grade, anchor-every-number, comprehension test).
3. **Code policy and glue register**: copy before module before wrapper before write, with a recorded reason for any rewrite.
4. **Orchestration reuse**: spike `doit` vs stdlib before building a runner.
5. **Taste log** so owner feedback influences later episodes.
6. **Reference boards per genre.**
7. Still deliberately out of scope: analytics-driven learning, long-form 16:9, other languages (backlog).

## 7. Quality model: three kinds of checks
| Kind | When | Examples | Cost |
|---|---|---|---|
| Static | before any render or paid call | schema, lint, element limits, palette rules, motion lint of scene source, composition validator | free, seconds |
| Measured | after render/audio | F1 contrast/brightness/flash/overflow, A1 loudness/ducking, T1 audio vs script | free, about a minute |
| Judged | script and storyboard | claim support, analogy attack, comprehension, story editor with CHAI rules, optional vision critic | LLM calls |
Principle (memory `feedback_gates_not_quality`): passing checks does not mean good. The outline and the owner's preview review decide quality; checks stop known failures early and explain them.

## 8. Reuse intake procedure (how a component from another repo becomes part of the pipeline)
1. Entry exists in R1 with source path and mode.
2. Copy unmodified into `video-pipeline/third_party/<repo>/…` with the repo's LICENSE; record in `third_party/INDEX.md` what it needs to run and whether it ran.
3. Call it only through a thin wrapper in `tools/` or `adapters/` that speaks our contract (reads/writes our files). The copied file is not edited, so it can be refreshed from upstream.
4. If it cannot run without heavy coupling (framework, network, telemetry) or its disk/compute cost breaks the machine budget, take the idea only and record "idea only" in R1.
5. Add a good and a bad fixture; add the check to `selfcheck`; mark the R1 row "verified" with the evidence.

## 9. Machine and cost design
- Local compute: ffmpeg, numpy, headless Chrome (Remotion), one Parakeet run per episode if disk allows.
- Remote: LLM text (MiniMax), TTS, images, clips (MiniMax). Paid steps start only after script approval and respect a cost cap with a ledger (R-85).
- Disk: about 14 GB free; each install and download is checked first; large reference clones are pruned once the needed files are extracted.
- Render: preview at low resolution; full render in a few parallel chunks; concatenation with the ffmpeg concat filter (R-14).

## 10. Extension points (where future improvements plug in)
| To add | Touch only |
|---|---|
| A scene type | one new scene file, a `SCENES.md` entry, a schema enum value, a demo render, F1 passes |
| A check | one function in the layer's check module, one `gate_report` rule id, a good/bad fixture |
| A palette or archetype | `archetypes.yaml` / `tokens.yaml`; lint verifies contrast and brightness automatically |
| A provider (TTS, image, LLM) | one adapter file + `config/providers.yaml`; cost ledger entry |
| A component from another repo | follow section 8 |

## 11. Out of scope for the setup phase
Improvements beyond "layer set up and wired" (smarter writer, new languages, local generation models, long-form 16:9, analytics learning loop, shader transitions, vision critic, and others) live in the [BACKLOG](BACKLOG.md).
