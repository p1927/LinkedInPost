# Gaps and improvement plan (written after owner review of ep01-v2 and ep02-sky-blue, 2026-10-05)

Owner verdict: ep01-v2 is good; ep02 is not. Owner's reasons, in their words, condensed:
1. ep02 looks like the low-effort "images + text" videos YouTube's policy targets.
2. The audience is undefined (kids? young adults who lack background?) and terms were not checked against what that audience knows.
3. The explanation has gaps and never sets the background; it is coloured images with text rendered on top.
Also asked: use docs/research/github-repositories-research.md (another agent's study of six repos) to plan the fix.

I agree with all three. Section 1 shows the specific failures in the ep02 script; they passed my linter, which means the linter checks surface rules and not whether the explanation works.

## 1. Evidence: what is actually wrong with ep02 (line by line)
| # | Script line | Problem |
|---|---|---|
| s1 | "Is the sky blue because it copies the ocean? Nope! The sky has its own trick." | **Open loop never closed.** The ocean is never mentioned again; viewers are not told why the ocean is blue or why it is not the cause. Our own rule says every hook must be paid off. |
| s2 | "Sunlight looks white, but it is secretly a bag of rainbow colors." | No background: what is light? what are "colors" physically? Jumps to a metaphor with nothing for it to map onto. |
| s3-s4 | bouncy balls / bumpers; "Little blue balls hit every bumper... Big red balls roll straight through" | **Analogy mismaps the physics.** In reality blue and red light are the same kind of thing at different wavelengths; red also scatters, only less. "Big/small balls" implies size, "roll straight through" implies red never scatters. The bumpers (air molecules) are never named, so the viewer cannot map them. The analogy's limitation (s7) arrives too late to undo the wrong picture. |
| s5 | "Grown-ups call that bouncing scattering." | Term introduced, but "scattering" is explained only by the metaphor; the viewer never learns that air is made of tiny molecules or that light is hitting them. |
| missing | why not violet? why blue "from everywhere"? | The natural next question is never anticipated. |
| s6 | sunset: "light travels through more air" | Correct, but the viewer was never told the sun's light arrives straight at noon vs at a slant at sunset, so the sentence has no picture. |
| s7 | "Light is not really a ball... it is a wave, and blue waves are just shorter." | The one true fact in the video arrives as an afterthought, after the wrong picture is cemented. |
| visuals | 8 illustration stills, Ken Burns, same sticker/caption template, no clips | A slideshow. Nothing shows the mechanism moving (balls hitting pegs, light entering air). Text on screen is just the narration again. |

Root causes: (a) no audience definition, (b) no concept dependency check (what must the viewer know before each line?), (c) analogy checked for charm, not for wrong predictions, (d) no open-loop ledger, (e) visuals chosen per sentence instead of designed to show the mechanism, (f) QA tests format rules, not understanding.

## 2. Gap catalogue and fixes
Legend: SRC = where the fix comes from (our research docs 01-08, or the six-repo study in docs/research/github-repositories-research.md, "GR").

| ID | Gap | Why it matters | Fix | SRC | Acceptance test |
|---|---|---|---|---|---|
| G1 | **Audience undefined.** audience.yaml says "general adult curiosity" while the look is a kids picture book. | Vocabulary, pace, look and analogies all depend on who is watching. | Create explicit **Audience Cards** (e.g. `kids-6-9`, `adult-newcomer`). Each sets assumed knowledge, banned jargon, sentence length, analogy domain, look. GR decision: not kids-only; two audiences, same method (analogy-first, plain words), different presentation. Every episode declares exactly one. | GR section 8, doc 01 (Mayer), 02 | episode.json has `audience`; director refuses without it |
| G2 | **No background / prerequisites.** | Explanations fail when step 2 uses a concept never introduced. | Director first writes a **concept map**: the 3-6 concepts needed, each with "viewer already knows?" per the audience card. Anything unknown gets a beat before it is used. | doc 02 (segmenting, prior knowledge), 01 | lint: every term/concept in a beat is either known-to-audience or introduced in an earlier beat |
| G3 | **Explanation correctness and completeness.** | Wrong-but-cute analogies (ep02 s3-s4) teach misconceptions. | **Analogy table**: element-by-element mapping; list wrong predictions; run a separate verifier agent to attack the analogy; state the limitation BEFORE the metaphor can mislead, not after. Prefer showing the real mechanism (animation/diagram) over a metaphor when the mechanism is visualisable. | doc 02, audience.yaml analogy rules, GR B-section | verifier report with 0 unresolved wrong predictions |
| G4 | **Open loops not tracked.** | Unpaid hooks lose trust (ep02 ocean). | **Loop ledger** in episode.json: each question raised (hook, rhetorical, myth) -> beat that pays it off. | doc 02 | lint error if a raised loop has no payoff beat |
| G5 | **Term comprehension unchecked.** | "Scattering", "interest rate" etc. may not be known. | **Glossary pass**: list every non-everyday word; each needs plain definition at first use or removal; jargon budget per card (e.g. max 2 new terms for kids card). | doc 02, GR (jargonBudget in vocabulary notes) | lint: new-term count within budget; each defined within 1 beat |
| G6 | **Slideshow look (policy and quality risk).** | YouTube's July 2025 "inauthentic content" wording targets templated, mass-produced, low-effort AI/stock content; stills + TTS + captions is close to that profile (this includes ep01 too, though ep01 has story clips and original script). | **Visual variety system**: Style Profiles (Storybook, Chalkboard/diagram, News-desk), a larger scene-template library (animated diagram, counter, bar chart, comparison split, checklist, step animation), beat-aware motion, at least one **mechanism animation** per episode, real/AI video where it adds meaning. Anti-repeat rule across episodes. | GR Phase 1-2 (E1, F1, F5), doc 04, 03 | per-episode scene-template mix lint (no template > 40%); mechanism animation present |
| G7 | **Human value / originality unclear.** | Policy turns on added value, not on the tool used. | Each episode needs a stated **original contribution** (own analogy design, own data visual, own commentary, tested explanation). Record it in the episode; keep human script approval; vary formats. Be honest: YouTube has not published a numeric threshold, so this is risk reduction, not a guarantee. | doc 04 (official policy text) | `original_contribution` field required |
| G8 | **QA checks form, not understanding.** | Lint passed ep02. | Add an **Explanation QA** stage (below, section 3). | new | see section 3 |
| G9 | **Director not automated.** | Quality currently depends on one author-session reading the rules. | Build the Director (LLM stage) with schema validation, self-critique and claims gate; keep the human approval gate. | GR Phase 3 (B1, G4, G5) | topic -> validated episode.json + notes |
| G10 | **Audio variety / mix.** | One voice, one music bed, whoosh on every cut. | Multi-voice with per-beat emotion, mood-mapped music, real ducking, function-based SFX. (The parallel session already prototyped beat-aware motion, ducking and profiles in Experiment 1.) | GR Phase 1-2 | A/B listen by owner |
| G11 | **Packaging.** | Titles/thumbnail/cover are afterthoughts. | Packaging stage from the claude-youtube-editor ideas (calibrate rules on our own analytics). | GR H1-H2 | cover frame + 3 title options per episode |
| G12 | **Synthetic-content label did not register on YouTube.** | We set `containsSyntheticMedia` at upload; the API read it back as unset on the posted video. | Verify in YouTube Studio, set the "altered or synthetic content" answer manually, then re-test whether the API field is honoured (may need a different part/scope). | docs/research 04, YouTube API docs | label visible on the video |
| G13 | **Publish provenance (process failure on 2026-10-05).** | The file posted for ep01-v2 was a parallel session's re-render, not the file the owner reviewed. | Hash the reviewed render (`reviewed_sha256`); `publish` refuses if the file's hash differs; never overwrite a reviewed render (re-renders go to a separate file). **Implemented the same day, see section 4.** | new | publish refuses a changed file |
| G14 | **No audience feedback loop.** | We do not know what viewers understood. | After posting: retention graph review, comment mining, a 3-question comprehension check with a few real viewers per format before scaling. | GR H8, doc 01 | per-format learning note |

## 3. The new Explanation QA stage (runs before the script is shown for approval)
1. **Audience check**: card declared; vocabulary and sentence length vs card.
2. **Concept map check**: every concept is known-to-audience or introduced earlier.
3. **Term glossary**: new-term budget and first-use definitions.
4. **Analogy attack**: separate verifier lists wrong predictions of the analogy; must be zero or stated as limitations before they can mislead.
5. **Loop ledger**: every question opened gets a payoff.
6. **Fact check**: each claim has a source URL that was actually opened and supports the claim (verifier agent, not the author).
7. **Script-only comprehension test**: an independent agent role-plays the declared audience, reads only the narration, then answers 3 questions the episode promises to answer; fails if it cannot. (Proxy only; real viewer check is G14.)
8. **Visual plan check**: at least one scene shows the mechanism in motion; template mix limit; on-screen text is not a duplicate of narration (redundancy effect).
9. **Human gate**: owner reads/hears the script, then approves.
Separation of roles: author and reviewer are different agents (project rule: never self-approve).

## 4. Immediate fixes already made / to make now
- G13 provenance guard: reviewed render hash + refuse-on-mismatch + no overwrite of reviewed renders (implemented in run.py/registry.py with this document).
- ep02 stays unposted. It is marked `needs_rework` in notes. Do not reuse its script.
- The posted ep01-v2 differs from the owner-reviewed render in motion/SFX/music level only (same script, narration and illustrations); see the owner message for options.

## 5. Plan (phases)
| Phase | Work | Output | Exit test |
|---|---|---|---|
| P0 (now) | Provenance guard (done), ep02 marked needs_rework, set YouTube synthetic label manually (G12) | safer publishing | guard test passes |
| P1 | Audience Cards (G1), concept map + glossary + loop ledger fields in schema (G2, G4, G5), Explanation QA lint checks that are mechanical (G4, G5) | schema + lint | lint catches ep02's open loop and missing term setup |
| P2 | Verifier agents: analogy attack, fact check, script-only comprehension test (G3, G7, section 3 steps 4,6,7) | `qa_report.json` per episode | ep02 script FAILS, a rewritten ep02 passes |
| P3 | Visual variety: Style Profiles, template library, mechanism animations (G6) | 3 profiles, 6+ templates | template-mix lint passes; owner A/B approves look |
| P4 | Rewrite ep02 under the new gates (new audience card, mechanism animation of light hitting molecules, ocean loop paid off) and compare with the old one | ep02-v2 | owner approves script + video |
| P5 | Director automation + news/topic ingestion (G9) | topic -> episode | 3 topics in a row pass QA without hand edits |
| P6 | Audio system, packaging, analytics loop (G10, G11, G14) | | |

**Status update (2026-10-05):** P1 audience cards + explanation lint are in. P5 is built as a first version (`python run.py director`; see `DIRECTOR-AND-VARIETY-PLAN.md`): topic -> lint-passing draft works, but the "3 topics in a row without hand edits" exit test is NOT met (drafts show two analogies in one video, weak mechanism steps). P2 verifier agents are built as `verify.py` (analogy attack, claim support, comprehension test -> `qa_report.json`, enforced at approval); first runs correctly FAIL ep05/ep06 drafts, so the lever now is getting a draft to pass. P3 is partly done: 4 profiles exist, selected per audience card; template library not yet.

## 6. Decisions needed from the owner
1. Pick the two audience cards to start with (suggested: `kids-6-9` and `adult-newcomer`) and which one is the primary channel voice.
2. For adult-newcomer, is a second look acceptable (diagram/chalkboard/news-desk) alongside the storybook look? (GR experiment says the same illustrations only partly read as adult.)
3. Rework ep02 as the first test of the new gates (recommended), or drop the topic.
4. How much to spend on verifier agents per episode (they add LLM calls).
