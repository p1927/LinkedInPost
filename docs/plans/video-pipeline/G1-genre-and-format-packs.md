# G1 Genre and format packs (what kind of video is this?)

Parent: [00-MASTER-PLAN](00-MASTER-PLAN.md) · Design: [01-MASTER-DESIGN](01-MASTER-DESIGN.md) sections 6 and 6b · Reuse IDs: [R1](R1-reuse-register.md) (R-101) · Status: pieces exist, no single selector
Runs: chosen at L1 (shown in the UI, owner can change), read by L3, L4, L5, D1, M1, A1, L6, L8.

## Purpose
An explainer, a story and a concept video should differ in structure, pace, look, sound and checking, not only in colour. A **pack** is one data file entry that sets all of those at once. Owner picks or accepts a genre; every layer reads its slice. No new engine: a pack is a mapping over assets we already have.

## Have (verified by reading the files)
- `direction/format_catalog.yaml`: 14 short-form formats with beat structure, word budgets, hook patterns, visual mode (eli5_story, what_if, myth_busting, why_is_x, versus, history_timeline, news_explainer, case_study, place_explainer, food_science, experiment, visual_math, data_chart_story, character_series).
- `direction/craft/modes.yaml`: modes explainer, cold-open-drama (story), hybrid, montage, documentary, plus hook cards and bridge cards; `direction/craft/routing.yaml` load map per stage and mode.
- `direction/identities/archetypes.yaml`: 10 archetypes (ledger, tape, flat-cosmos, chalk-proof, paper-atlas, archive-ink, blueprint, iso-systems, clinical-clear, data-poster) with palettes and rotation.
- Audience cards (`direction/audiences/`, `audience.yaml`) for readability and pace constraints.
- Gates: explanation checks (terms before use), comprehension test, analogy attack, story editor (`verify.py`).

## Want: five packs in one file `direction/format_packs.yaml`
| Pack | Human description | Formats (existing ids) | Craft mode | Archetype pool | Scene vocabulary leans on | Motion | Sound | Narration | Gates that apply |
|---|---|---|---|---|---|---|---|---|---|
| **explainer** | How or why something works, in plain words | why_is_x, myth_busting, versus, news_explainer, food_science | explainer | clinical-clear, blueprint, iso-systems, chalk-proof, flat-cosmos | diagram, steps, compare, number, term cards | calm, smooth | light bed, ducked, SFX on key terms | direct, second person, short sentences, define before use | terms-before-use, comprehension, analogy attack, claims |
| **story** | A narrative with stakes where the idea rides on the plot | eli5_story, case_study, character_series | cold-open-drama or hybrid | paper-atlas, archive-ink, flat-cosmos | image/clip-led scenes, bridges, hold shots | slower, cinematic, silence beats | underscore, silence before the turn | scene voice, one in-scene line, payoff callback | story editor, hook checklist, continuity, claims; terms-before-use becomes "paid off by the end" |
| **concept** | One abstract idea built visually (math, physics, what-if) | visual_math, what_if, experiment | explainer | chalk-proof, blueprint, flat-cosmos | numberline, axes, morph, diagram | precise, transformation-led | sparse, tonal | question-led, one idea per scene | one-idea check, comprehension, claims |
| **data** | Numbers over time or shares, evidence first | data_chart_story, news_explainer | explainer or montage | ledger, tape, data-poster | chart, timeline, forces, numberline, proportion | snappy | tick on numbers, impact on the key figure | figure first, source named, comparison for every number | number match, two-source check, chart legibility (F1), claims |
| **documentary** | A place, event or history, observed | place_explainer, history_timeline | documentary | paper-atlas, archive-ink | photo, map, timeline, slow push | slow | ambient bed | observational, dated, sourced | realism/fidelity cards, claims, timeline order |

Each pack entry also carries: hook forms allowed, pacing floor (hold and change cadence), thumbnail style, voice settings (speed, register), and the default value of the outline-approval toggle (off).

## How a genre is chosen
1. L1 classifies the brief's information type (existing keyword scoring in `identity.py` is the model) and proposes a genre with a one-line reason.
2. The UI shows the proposal; the owner accepts or changes it (default: accept). Stored as `brief.json: genre`.
3. L3 seeds the outline from the pack's format beats (the brief's question order still wins).
4. L5/D1/M1/A1 read their slices; L6 applies the pack's gate list.

## How packs help with distinct, non-generic videos
- Structure differs by genre (beats and word budgets from the catalog), not only look.
- Identity pool is narrowed to archetypes that suit the genre, then rotated (last 5) so consecutive episodes of one genre still differ.
- Scene vocabulary and motion personality differ by genre, so a story never reuses the explainer's term-card rhythm.
- Gates differ by genre, so a story is not forced through explainer rules (a cause of earlier false failures).

## Human-understandable (applies to every pack)
- Measured: readability grade of the narration against the audience target (R-98 `textstat`), sentence-length lint (exists), terms-before-use (exists), comprehension test (exists: a learner model answers questions from the script).
- Rubric (TEXT, craft card): every number gets an anchor ("about 1 in 5", "twice last year's"); one idea per scene; say the concrete thing before the abstract one; no unexplained acronym on first use.
- Human gate: preview review includes the owner's "did I understand it?" verdict, stored with the episode.

## Flaws found
1. The writer was told "exactly the beats of the chosen format", so format order overrode the brief (ep24). Packs seed, they do not dictate.
2. Genre exists only implicitly (mode + format + audience); no single place says what a "story" or "concept" video must do differently.
3. Gate sets are not genre-aware; story-style content hit explainer rules.
4. Only 14 short-form formats; long-form 16:9 formats are in the backlog.

## Work items
- G1.1 Write `direction/format_packs.yaml` (data only): five packs mapping to existing format ids, mode, archetype pool, scene vocabulary, motion, sound, narration register, gate list (WP-G).
- G1.2 `brief.json: genre` + classifier reuse from `identity.py` + UI selector (X1.6) (WP-L1/G).
- G1.3 Each layer reads its slice: L3 beats, `identity.py` archetype pool, `lint.py`/`verify.py` gate list per pack, A1 sound, M1 scene weights (done inside those layers' kits, no new code per layer beyond reading the file).
- G1.4 Craft card for the understandability rubric (WP-C1).

## Acceptance
- Same brief run as `explainer` and as `story` produces different outlines, different archetype pools, different scene mixes and different gate lists (fixture in `selfcheck`).
- Switching genre in the UI changes the outline without touching the brief wording.

## Depends on
L1 (brief), L3 (beats), D1/M1/A1 (their slices). Feeds L6.

## Setup scope (rev 3)
This phase only delivers the layer kit (master plan 6.1): `format_packs.yaml`, `genre` in `brief.json`, each consumer reading its slice, one fixture per pack. New packs and long-form formats are backlog (B-G1-*).

## Open questions
- None blocking. Pack names above are working names; the owner can rename them in the UI labels.

## Risks and mitigations (rev 5)
- Slice 1 implements the explainer pack only; the other four stay data-only until Slice 1 is reviewed.
- Packs turning into five templates: within-genre variation from archetype pool, scene vocabulary weights and rotation.
