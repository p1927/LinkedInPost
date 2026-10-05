# Director + Variety plan (GAPS P3 + P5)

Status (2026-10-05): **built and working end to end, including verifier agents (GAPS P2 v1) and the approval gate**; richer scene templates and rotating looks still planned. Read this before touching `director.py`, `config/profiles/`, `tools/gen_music.py` or the profile code in `remotion-app/src/`.
Research behind it: `docs/research/github-repositories-research.md` (six external repos + Experiment 1). Parent plans: `GAPS-AND-IMPROVEMENT-PLAN.md` (P3, P5), `v1.2-improvements.md` (W5), `v2-plan.md` section 1.

## 1. What this adds, in one paragraph
`python run.py director` turns **news → sourced topic → schema-valid, lint-passing `episodes/<id>/episode.json` (status `scripted`)**. It chooses the audience, format and analogy domain by rotating away from recent episodes, so consecutive episodes differ in structure, look, voice and music. It never starts paid stages: a human still approves the script (`run.py status <id> approved`) before TTS/image/video.

## 2. One owner per concern (do NOT duplicate; extend the owner)
| Concern | Single owner (edit here) | Notes |
|---|---|---|
| Who the video is for: pace, sentence limits, tone, analogy domains, jargon budget, **look, voice, music mood** | `direction/audiences/<id>.yaml` | `remotion_profile`, `voice`, `music_mood` live here. Director/`run.py` only read it |
| Look-and-feel rules: palettes + contrast, type, motion tokens, transition vocabulary, safe zones, sound levels, anti-slop checklist | `video-pipeline/direction/DESIGN_SYSTEM.md` | The one spec. Evidence: `docs/research/video/09-remotion-skills.md`, `10-video-design-skills.md`. Status of every rule (DONE/TODO) is in the file |
| Visual language instances: transitions, zoom, punch, sparkles, captions, term style, grade, progress bar, SFX, music ducking, `transitionFrames` | `config/profiles/<name>.json` + `remotion-app/src/{profile,types}.ts` | New look = new JSON file; new capability = new key in `types.ts` + default in `profile.ts` |
| Beat vocabulary | `remotion-app/src/profile.ts` `canonBeat()` + `lint.py` first/last-beat rules | Format catalog beat names (`hook_end_state`, `callback_cta`, ...) map by prefix/suffix. Do not add per-format profile copies |
| Episode shape | `direction/episode.schema.json` (machine) + `direction/script_template.yaml` (meaning) + "Episode contract" in `direction/director_prompt.md` (prose) | Canonical claims key is `url` (lint + shipped episodes) |
| Script/explanation/packaging rules (mechanical) | `lint.py`, `packaging.py`, `direction/qa_checklist.yaml` | Director calls `lint.run`; never re-implements rules. Claim gate = `lint.provenance` |
| Semantic QA (judgment): analogy attack, claim support, comprehension test | `verify.py` -> `out/<id>/qa_report.json` | Independent prompts on a stronger model (`providers.yaml llm_verify`). Report is fingerprinted to the script: any edit makes it stale |
| Approval gate | `registry.set_status(..., "approved")` | Audience-declared episodes need a fresh, passing `qa_report.json`; override `--skip-verify` (prints a warning). Legacy episodes exempt |
| Prompts and craft rules | `direction/*.md|yaml` | `director.py` assembles them; it contains no craft prompts of its own except the two task wrappers (topic pick, write episode) |
| Episode state, ids, anti-repeat history | `registry.py` + the episode files themselves | No separate topic-memory file: variety is computed from existing `episode.json`s (`audience`, `format_id`, `analogy.domain`) |
| LLM, news, TTS, image, video providers | `config/providers.yaml` + `adapters/` | `llm:` (Gemini, model fallback chain), `news:` (RSS feeds) added; swap via `class_path` |
| Rendered-output QA (format, loudness, true peak, contact sheet) | `verify.render_qa`, called at the end of `run.py stage_render` | Writes `out/<id>/render_qa*.json` and `contact*.png`; look at the sheet before reporting a render |
| Illustration style per audience | `direction/audiences/<id>.yaml` `illustration_style` | Director copies it into `style.illustration_style`; kids = storybook gouache, curious_adult = flat editorial vector |
| Music | `tools/gen_music.py` (offline, numpy), called from `run.py ensure_music` | Mood from the audience card, unique per episode via seed (key + tempo shift). No licensing, no API |
| Orchestration entry points | `run.py` (`director`, stages, lint, status, publish) | `run.py` is edited by several sessions: make small additive edits, re-read before writing |

## 3. Pipeline (what runs)
```
RSS feeds + news search (adapters/news_rss.py)           -> source catalog (only fetched URLs may be cited)
LLM topic pick (director.pick_topic)                     -> ranked candidates, our own ranking by explainability
variety() from past episodes                             -> audience, 3 allowed formats, 2 analogy domains
LLM write_episode (director_prompt.md + audience card
   + hooks/shots/packaging/qa rules + worked example)    -> episode.json
check(): jsonschema -> lint.provenance -> lint.run       -> up to 2 repair passes (errors + selected warnings fed back)
verify.run (only when lint is clean): analogy attack,
   claim support, comprehension test (llm_verify)        -> out/<id>/qa_report.json; its errors join the same repair loop
write episodes/<id>/{episode.json,sources.json}          -> status "scripted" (draft is saved BEFORE verification, so a rate limit loses nothing)
python run.py status <id> approved                       -> refused unless qa_report is fresh + passed (or --skip-verify); then paid stages unblocked
run.py <id> all                                          -> card picks profile, voice, music mood (generated); Remotion renders
```

## 4. Reuse map (vendored repos and the six studied repos)
Licences matter: **OpenMontage is AGPL-3.0 → ideas only, we write our own text/code.** AgentTube, MoneyPrinterTurbo, ViMax are MIT → port allowed with attribution comment. `3b1b/videos` is CC BY-NC-SA → study only (ROADMAP ground rule 1).

| Capability | Source | How we used it | Where |
|---|---|---|---|
| Claim/source gate | AgentTube `utils/provenance-service.js` (MIT) | Ported semantics: claim is supported only if its URL was actually fetched | `lint.provenance` |
| "Cite only catalog URLs" topic/script rule | AgentTube `content-strategy-agent.js`, `script-writer-agent.js` (MIT) | Prompt rule + catalog filtering of model output | `director.pick_topic`, `adapters/news_rss.py` |
| JSON repair + retry | ViMax `utils/robust_json_parser.py`, `retry.py` (MIT) | Re-implemented small | `adapters/llm_gemini.parse_json`, repair loop in `director.main` |
| Model fallback chain, 429/503 backoff | youtube-agentic-ai-studio | Pattern | `adapters/llm_gemini.GeminiLLM` |
| Storyboard rules (wide→medium→close, verbatim cast descriptors) | ViMax storyboard prompts (MIT) | Already in `direction/shots.md`; Director loads it | `director.system_prompt` |
| Research depth, stage gates, artifact schemas | OpenMontage skills/schemas (AGPL) | Design reference only | `episode.schema.json` shape, `qa_checklist.yaml` ideas |
| Style bundle per format | AI-Content-Studio `STYLE_PROFILES` | Realised as audience card + profile | cards + `config/profiles` |
| Independent review passes / reviewer rubric | OpenMontage `skills/meta/reviewer.md` (AGPL, idea only); GAPS plan section 3 | Separate prompts with no access to the writer's reasoning; comprehension test = simulated viewer + grader | `verify.py` |
| Retention structure (open loop, re-hook, callback) | youtube-agentic-ai-studio scriptwriter | Rules in format catalog/hooks; lint `loops` check | `direction/`, `lint.py` |
| Ducking, function-based SFX, trigger words | claude-youtube-editor, AI-Content-Studio | Volume ducking from narration windows now; SFX per beat in profile | `Episode.tsx`, profile `sfx` |
| Stock-footage query prompt (`generate_terms`) | MoneyPrinterTurbo `llm.py` (MIT) | **Not used yet**: we generate visuals. Port when long-form needs b-roll | planned |
| Pexels/Pixabay search + attribution records | MoneyPrinterTurbo `material.py` (MIT) | **Not used yet**; same trigger as above | planned |
| TTS-boundary → subtitle timing | MoneyPrinterTurbo `voice.py` | Already covered by MiniMax word timings + `@remotion/captions` | n/a |
| Claude-Code-CLI LLM mode | MoneyPrinterTurbo `llm.py` | Option if we want the Director on a Claude subscription instead of the Gemini key | planned (`adapters/llm_claude_cli.py`) |
| Slideshow-risk / pacing QA heuristics | OpenMontage `lib/slideshow_risk.py` (AGPL) | Idea only → `lint` `template_mix`, `repeated_structure` | `lint.py` |

## 4b. Product flow (owner requirements, 2026-10-05)
1. **News-driven:** the Director shows a ranked list of current-affairs candidates (`--pick` interactive, or `--dry` then `--choose N`; the list shown is saved in `out/director_candidates.json` so `--choose` uses exactly what was displayed). The owner can instead give their own topic: `--topic "..."`, which runs a fresh news search on it and grounds the script in that coverage.
2. **Concept explained through the news:** each episode must state `news_hook {event, date, url}` (lint warns if absent) and explain a concept with the audience's analogy method. Showing the source to the viewer on screen (source chip using `news_hook`) is **TODO** (renderer work; do it as a template in `NewScenes.tsx`/Episode, not a parallel overlay system).
3. **MiniMax Hailuo in every video:** lint rule `min_clip_scenes` (error, `qa_checklist.yaml`, threshold 1) for audience-declared episodes; `director_prompt.md` tells the Director to put a clip on the hook. Clips are the paid, premium shots (MiniMax-Hailuo-2.3, ~6 s each, `video-pipeline/adapters/video_minimax.py`).

## 5. How to run
```bash
python run.py director --dry                       # news intake + ranked topic candidates only (1 LLM call)
python run.py director                             # full: writes episodes/<id>/ (status scripted), prints lint result
python run.py director --pick                      # choose from the news list (interactive); non-interactive: prints list, then `--choose N`
python run.py director --topic "why X happens" --audience kids --format news_explainer
python run.py lint <id>                            # mechanical checks (script, explanation, packaging)
python run.py verify <id>                          # verifier agents -> out/<id>/qa_report.json (4 calls on llm_verify); exit 1 on FAIL
python run.py status <id> approved                 # human gate, then: python run.py <id> all
```
Requires `GEMINI_API_KEY` in `.env`. Cost: about 2-4 writer calls plus 4 verifier calls per pass, no media spend. On a free-tier key the stronger verifier model hits HTTP 429 quickly: the Director then keeps the draft, says "verify unavailable" and the episode stays unapprovable until `run.py verify <id>` succeeds (retry later or use a paid key).

## 6. Results so far (2026-10-05)
- Drafts generated from live news: `ep04` (kids), `ep05` and `ep06` (curious_adult), `ep07` (kids, verifier was rate-limited). Lint 0 errors on ep04/05/06.
- **The verifier catches things lint cannot.** `ep05`: analogy maps bond yields to "soup portion size" (predicts the wrong thing), the script never says where the analogy stops, five factual statements have no claim -> FAIL. `ep06`: the "engineer inspects a building" analogy mispredicts what a stress test does -> FAIL. Both match what a human reviewer would flag.
- Honest limits: claim evidence is often only a headline (Google News redirects, paywalls), so many claims come back `unverifiable` (warn, human spot-check). LLM judges can be wrong or over-strict; the comprehension test is a simulation, not a real viewer. `provenance` proves a URL was fetched, not that it backs the sentence. No episode has yet passed the full gate, so the exit test "3 topics in a row pass QA without hand edits" is NOT met.
- Nothing from these drafts has been rendered (paid TTS/image/clip stages are behind approval).

## 6b. Skills research (2026-10-05) and what was applied
Read-only review of ~25 skill repos (cloned to scratch, nothing installed or executed). Ranking and risks: `docs/research/video/09-remotion-skills.md` and `10-video-design-skills.md`. Short version: keep the official `remotion-dev/skills` (4.8k stars, our vendored copy matches 4.0.532) as API truth; take **taste rules** from `haidrrrry/claude-remotion-skill` (MIT), **code** (e.g. whip-pan transition) from `Remocn/remocn` (MIT), **numbers** from OpenMontage (AGPL: numbers/ideas only), **pacing/safe areas** from `iart-ai` packs, **rulebook** ideas from `video-shotcraft`. Do NOT install `remotion-superpowers` (registers MCP servers), anything2explainer / video-talkcraft (non-commercial), or any skill with a `curl|bash` installer.
Applied so far: eased scene transitions (`springTiming`, profile `transitionFrames`), safe-zone fixes (progress bar, caption offsets), per-audience illustration style, render QA, `DESIGN_SYSTEM.md`. Not yet: shared entrance helper + `motion` block in profiles, whip-pan/zoom-in-out/push-cut presentations, grain/Ken-Burns layer stack, rough-notation emphasis, 16:9 profile, palette refresh with computed contrast, source chip.
Honest limit: this research judged written rules and code, not rendered output; stills show layout/colour but not motion quality, so motion changes need a human watch.

## 7. Known gaps / next steps (in order)
1. **Get a draft to PASS**: tune the repair prompt with verifier feedback (analogy fixes usually need a different analogy, not a patch); try `llm_verify` on a paid key to avoid 429s; consider limiting claim verdicts to episodes with readable primary sources.
2. **Prefer primary sources**: add more Fed/BLS/Treasury/EIA feeds to `news:`; fetch article text where readable so claims can reach `supported`.
3. **More looks per audience**: cards name one `remotion_profile`. Allow `remotion_profiles: [...]` and let `variety()` rotate (other sessions added `explainer-bold`, `explainer-large`; rotation not built).
4. **Scene templates** (GAPS P3): diagram/steps/orbit etc. are being added by another session; when they render, relax the Director prompt (currently `illustration`/`clip` only) and have `verify`/lint check that the mechanism is SHOWN.
5. **Voices**: card `voice` exists; add per-beat `emotion`; multi-voice only with a second TTS.
6. **Long-form**: long beat template (re-hook at 90s/3min) and chapters; all catalog formats are short.
7. Port MoneyPrinterTurbo stock search + `generate_terms` for long-form b-roll; optional Claude-CLI LLM adapter.
8. Cleanup: drafts ep04-ep07 are experiment output; delete or rework them before they clutter `EPISODES.md`.

## 8. Rules for any agent working here
- Extend the owner in section 2; do not create a parallel schema, profile system, topic store or music generator.
- Never commit (project rule). Never start paid stages from the Director.
- Re-read `run.py`, `lint.py`, `Episode.tsx` immediately before editing; they change under you.
- Keep `direction/EPISODE_SKILL.md` and `.claude/skills/episode/SKILL.md` identical.
