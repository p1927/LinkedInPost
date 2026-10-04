# GitHub Repositories Research: Improving the Video Pipeline

Date: 2026-10-05
Scope: six open-source YouTube / short-video automation repos, compared against our `video-pipeline/`.
Focus areas (from the brief): **direction** (script and storyboard), **topic and news collection**, **organising thoughts so content is engaging**, **music and audio**, **animations**, and **unique features worth borrowing**.

> **Method and confidence.** Findings come from reading each repo's source (raw files or a shallow clone) plus its README. The GitHub API tree endpoint returned 403 for every repo, so some file trees were guessed or partial. Each repo's section lists what was and was not verified. Quoted prompt wording is paraphrased. Nothing was run, so output quality is not assessed.

---

## Index

1. [Executive summary](#1-executive-summary)
2. [Where our pipeline is today](#2-where-our-pipeline-is-today)
3. [Repo-by-repo findings](#3-repo-by-repo-findings)
   - [3.1 youtube-agentic-ai-studio](#31-raunakpatilyoutube-agentic-ai-studio)
   - [3.2 AI-Youtube-Shorts-Generator](#32-saard00ai-youtube-shorts-generator)
   - [3.3 youtube-auto-dub](#33-heynctyoutube-auto-dub)
   - [3.4 claude-youtube-editor](#34-hassancs91claude-youtube-editor)
   - [3.5 gemini-youtube-automation](#35-chaitanyaeswarrajeshjakkigemini-youtube-automation)
   - [3.6 AI-Content-Studio](#36-naqashafzalai-content-studio)
4. [Cross-repo comparison matrix](#4-cross-repo-comparison-matrix)
5. [Feature catalogue by theme](#5-feature-catalogue-by-theme)
   - [A. Topic and news collection](#a-topic-and-news-collection)
   - [B. Direction: script, storyboard, shot planning](#b-direction-script-storyboard-shot-planning)
   - [C. Organising thoughts for engagement](#c-organising-thoughts-for-engagement)
   - [D. Music, voice, SFX, mixing](#d-music-voice-sfx-mixing)
   - [E. Animations, scene templates, transitions, captions](#e-animations-scene-templates-transitions-captions)
   - [F. Variety engines](#f-variety-engines)
   - [G. Quality gates and QA](#g-quality-gates-and-qa)
   - [H. Packaging, publishing, automation](#h-packaging-publishing-automation)
   - [I. Robustness and engineering](#i-robustness-and-engineering)
6. [Prioritised recommendations](#6-prioritised-recommendations)
7. [Things NOT to copy](#7-things-not-to-copy)
8. [Decisions and open questions](#8-decisions-and-open-questions)
9. [Experiment 1: one episode, two Style Profiles](#9-experiment-1-one-episode-two-style-profiles)

---

## 1. Executive summary

**Our biggest gap is upstream of rendering.** `video-pipeline/run.py` is a clean renderer, but every episode is a hand-written `episode.json`. There is no topic or news ingestion, no LLM director, no claims gate, one voice, one music track, two scene templates and a fixed transition cycle. That is why episodes look alike.

**What the six repos teach, in one line each:**

| Repo | Most valuable lesson for us |
|---|---|
| youtube-agentic-ai-studio | A **retention-engineered script template**: open loop, then re-hooks at timed points, analogy-first explanation, callback ending. Plus an 8-model fallback chain. |
| AI-Youtube-Shorts-Generator | **Two literal visual queries per sentence** with a mid-sentence visual switch. Audio length drives the timeline. |
| youtube-auto-dub | **Voice design**: describe a persona in text, generate a reference, clone it. Gives a consistent but selectable narrator. Silence-aware duration fitting. |
| claude-youtube-editor | **Claude writes declarative JSON plans** (cuts, SFX, timeline) that deterministic tools execute, with human review gates. Disciplined SFX and music rules. A strong packaging skill. |
| gemini-youtube-automation | **Automation plumbing**: GitHub Actions cron, state committed back to the repo, headless YouTube OAuth, long plus Short from one generation. |
| AI-Content-Studio | **Style profiles** (one bundle of script, voice, image, video and research directives per format). Word-level karaoke captions. Trigger-word SFX. A campaign scheduler. |

**Top five moves (detail in [section 6](#6-prioritised-recommendations)):**

1. Build the missing **Director stage**: topic, research JSON, script, storyboard `episode.json`, validated against a schema.
2. Add **Style Profiles** so each episode picks a bundle of palette, voice, music mood, scene-template mix and transition set.
3. Expand **scene templates and beat-aware motion** so hook, payoff and CTA look different from explanation scenes.
4. Add an **audio system**: multiple voices, mood-mapped music library, sidechain ducking and a function-based SFX plan.
5. Add **topic ingestion with dedup memory** and a **claims gate** tied to `sources[]`.

---

## 2. Where our pipeline is today

Source: exploration of `video-pipeline/` (paths relative to the repo root).

**Layout.** `video-pipeline/run.py` is the only orchestrator: `python run.py <episode-dir> <stage|all> [--force]`. Stages are `tts, illustrations, keyframes, clips, props, render, carousel`, each cached per scene. Adapters live in `video-pipeline/adapters/` (`tts_minimax.py`, `image_minimax.py`, `video_minimax.py`). The provider swap point is `config/providers.yaml`. The renderer is `remotion-app/src/` (`Episode.tsx`, `Scenes.tsx`, `Captions.tsx`, `Carousel.tsx`, `theme.ts`).

| Area | Current state |
|---|---|
| Topics and news | **Not implemented.** No scraper, RSS, search or trending code. A human or Claude hand-writes `episode.json`. `MASTER-PLAN.md` lists a "v2 news trigger" as planned. |
| Director / script | **Not implemented.** No LLM call anywhere in `video-pipeline/`. `direction/*`, `episode.schema.json` and `director.py` are planned in `v1.2-improvements.md` but absent. |
| Claims / sources | `sources[{claim,url}]` exists in the JSON, but `run.py` never reads it. The claims gate is planned, not built. |
| Episode shape | About 10 scenes, roughly 50s. Beats: `story_hook`, `analogy` x4, `term` x2, `worry`, `story_payoff`, `cta`. The `beat` field is carried into props but **the renderer ignores it**. |
| Voice | MiniMax `speech-2.8-hd`, voice `English_WiseScholar`, speed 0.95. One voice for everything. `emotion` supported but unset. |
| Music | One static file (`assets/music/acestep_kids_01.wav`), looped at volume 0.09. No mood selection, no ducking, no music adapter. |
| SFX | `whoosh` at every scene boundary, `ding` on `TermSticker`. That is all. |
| Loudness | Final ffmpeg `loudnorm I=-14:TP=-1.5:LRA=11`. |
| Scene templates | Two: `IllustrationScene` (Ken Burns still plus Sparkles plus optional `TermSticker`) and `ClipScene` (video with a slow zoom). |
| Transitions | Round-robin of four presentations (`index % 4`), fixed 9-frame linear timing. |
| Captions | TikTok-style pages (`createTikTokStyleCaptions`), Fredoka 88px, active word yellow and tilted. Good. |
| Style | One "children's picture book" look, one font, one palette per episode. Seeds hard-coded (1234 / 4242). |
| Cross-episode logic | None. Two episodes on one topic. No series bible, topic dedup or style rotation. |
| Unrendered props | `sponsor` and `disclosure` are passed but never rendered. |

**Vendored references** (`video-pipeline/vendor/`, none imported by `run.py`): `MoneyPrinterTurbo` (TTS and subtitle timing, BGM mixing), `ViMax` (storyboard and camera-planning rules), `youtube-automation-agent` (claims schema, provenance gate), `remotion` (source reference).

---

## 3. Repo-by-repo findings

### 3.1 raunakpatil/youtube-agentic-ai-studio

**What it is.** Python app that produces 6-8 minute explainer videos and Shorts from an LLM-picked topic. Two LLM agents (Researcher, Scriptwriter), edge-tts narration, Pexels stock photos, MoviePy rendering, Flask approval dashboard, YouTube OAuth upload.

**Verified:** README plus `agents/researcher.py`, `scriptwriter.py`, `gemini_client.py`, `pipeline.py`, `video/creator.py`, `narrator.py`, `stock.py`, `config.py`. **Not verified:** upload module (guessed path 404), full file tree, music mixing location.

**Topic collection.**
- No external feeds. Gemini gets one of 12 predefined "focus angles" (random or GUI-chosen), proposes 3-4 ideas and picks the "BEST" one (mind-blowing, timely, explainable in 6-8 min).
- A second mode forces a user-supplied topic.
- Research JSON: `topic, why_now, video_title (<=70 chars), description, hook_question, 5 key_points, target_audience, 8 tags, thumbnail_concept, estimated_virality`.
- Dedup: built-in banned list plus user-editable `banned_topics.txt`. No memory of past topics.

**Direction (`agents/scriptwriter.py`).** Fixed 9-section arc for 6-8 min:

| # | Section | Approx. time | Device |
|---|---|---|---|
| 1 | Hook | 25s | attention grab |
| 2 | Intro | 40s | **open-loop question** |
| 3 | Content | 70s | analogy-led explanation |
| 4 | Re-hook | 70s | **pattern break near 90s** ("But here's where it gets REALLY weird...") |
| 5 | Content | 70s | answers the loop |
| 6 | Re-hook | 65s | around 3 min, human stakes |
| 7 | Content | 60s | |
| 8 | Conclusion | 50s | 3 takeaways plus **callback to the hook** |
| 9 | CTA | 18s | |

Also asks for varied sentence length (short 4-word sentences mixed with long ones) and "But wait" resets. Each section's JSON: `section_type, title, narration, 3 image queries (wide, close-up, abstract), bullet_points, caption_text, duration_seconds`. Shorts variant: 50-60s, 3 sections, 120-160 words, hook must grab in the first 3 words, 4 image queries per section.

**Organising thoughts.** Open loop, timed re-hooks aimed at retention drop-off, analogy-first, on-screen bullets, takeaway plus callback ending. All enforced only by the prompt, with no checker.

**Audio.** edge-tts (`en-US-AndrewNeural`, rate -5%, pitch -3Hz). SRT built by a three-step fallback (SubMaker, WordBoundary events, character-proportional) with a **sync-coverage metric** that warns below 85%. Background music: a local folder, volume 0.12. Mixing code not found. No ducking, mood matching or SFX.

**Visuals.** Pexels photos only, with topic hint prepended to each query, fallback queries, resolution sort plus shuffle. MoviePy renders frames itself: Ken Burns with alternating pans, a new image every 10s with a 1.2s smoothstep crossfade, animated gradient background, animated title cards and lower thirds, bullets that fade in sequentially, **top progress bar with section dots**, vignette on Shorts. Sentence-level caption pill (not word-highlighted).

**Unique features.**
- Retention template (open loop plus timed re-hooks).
- Research stage emits `thumbnail_concept`, `why_now`, `hook_question`.
- **Model fallback chain**: 8 models, 3 tries each, 15s/30s backoff on 429/503, auth errors fail immediately.
- Human approval dashboard (Flask :5050): edit `script.json`, re-run only the video step.
- Long video and Shorts cut from the same pipeline.

**Weaknesses.** No real trend data, no topic memory, no fact-check or critique pass, stock-photo slideshow look, sentence-level captions, no music logic, "ultrafast" encode preset.

---

### 3.2 SaarD00/AI-Youtube-Shorts-Generator

**What it is.** "AutoShorts AI". **Not a clip highlighter**, despite the name. It makes a ~40-50s short from an LLM-chosen topic: Gemini writes a script, edge-tts reads it, Pexels portrait stock footage is stitched underneath with ffmpeg.

**Verified:** `main.py`, `modules/brain.py`, `audio.py`, `asset_manager.py`, `composer.py`, `requirements.txt` in full. **Not verified:** file tree, stars, history, license. Default branch is `master`.

**Topic collection.** `brain.get_trending_topic()` is one Gemini call asking for a "Did you know" fact or "Fun/intriguing News". The docstring admits Google Trends / Twitter scraping is not built. No ranking, dedup or freshness check.

**Direction.**
- Script prompt: lead scriptwriter for a high-retention edutainment channel; strictly third person, fast, no fluff; **8-9 scenes in order Hook, Context, Mechanism, Twist, Outro**.
- Each scene has `visual_1` (matches the sentence start) and `visual_2` (end or reaction), plus `mood` (unused downstream).
- **"Strictly literal" visual rule**: "economy crashed" should search "stock market red chart", not "sad man".
- A commented-out earlier prompt is better hook material: cinematic Vox/NatGeo mystery tone, paradox hook, mystery in scenes 2-3, "Wait, what?" climax in 4-7, haunting mic-drop ending.
- No JSON validation or retry.

**Audio.** edge-tts `en-US-AvaNeural` +10%, 3 retries, 1s gap between scenes, mutagen for duration, 0.5s `acrossfade`. **No music, SFX, ducking or normalisation.** README claims silence removal; not found in code.

**Visuals.** Pexels portrait search (top 5, prefer >=4s, random pick), query fallback to last word, A/B self-healing (if one clip is missing, use the other twice). Each scene = clip A for half the audio, clip B for the rest. 1080x1920 at 30fps. Two random middle scenes replaced by a looped mascot video (never first or last). `xfade` with random pick of fade / diagbr / diagtl, 0.5s. Export `libx264 yuv420p +faststart`. No captions, no zoom, no colour grading.

**Unique features worth taking.** Two literal queries per sentence with mid-sentence visual switch; strict-literal query rule and fallback ladder; audio duration drives timeline; mascot interstitial in random middle scenes; hook-to-mic-drop beat map.

**Weaknesses.** Ungrounded facts (hallucination risk), random clip choice with no relevance scoring, no captions (major gap for Shorts), no music, sequential pipeline, no tests.

---

### 3.3 heyncth/youtube-auto-dub

**What it is.** CLI that downloads a YouTube video and produces a dubbed and/or subtitled version. Relevant to us for **voice, audio mixing and duration fitting**, not for content generation.

**Verified (close to verbatim):** `audio.py`, `cli.py`, `build_hint`, constants in `models.py`. **Paraphrase only:** `core.py`, `voice.py`, `googlev4.py`. The README's "subtitle resplitting" was not seen in code.

**Pipeline.** yt-dlp download, ffmpeg mono WAV, faster-whisper (base, beam 5, VAD, word timestamps, temperature fallback), `group_segments` (merge until gap >0.8s or span >10s), Google Translate (unofficial endpoints) batched with a `|||` delimiter, TTS, align, mix, mux.

**Voice system (the interesting part).**
- Engines: edge-tts and Qwen3-TTS with voice cloning (`voice_sample` plus `ref_text`).
- **Six text-described personas** (narrator / young / deep x male / female). `resolve_persona` uses `design_voice` with a per-language theme prompt to generate a reference sample, caches it, then clones from it.
- `auto_clone_voice` picks the **most word-dense 20-60s window** (>=15 words) as the reference.
- Voice table `language_map.json`: 91 languages, many voices per gender.

**Duration fitting (reactive, after TTS).** Budget per segment = next start - start - 50ms. Ratio >1.05: atempo speed-up capped at 1.5x. Ratio <0.95: slow-down to `max(ratio/0.92, 0.82)`. Over-long last clip trimmed at a -40dB silence point. Clips can overlap once the cap is hit.

**Mixing.** Numpy timeline with cosine fades (15ms in, 50ms out), peak normalisation, `loudnorm` matched to the original. Ambient bed via librosa HPSS (crude, not real stem separation) at fixed 0.15 gain. No ducking.

**Unique features worth taking.** Persona voice design with cached references; auto-selected clone reference window; silence-aware trimming plus speed cap plus mild slow-down band; independent subtitle-language and dub-language choice; video metadata as an ASR/LLM context hint; per-stage JSON cache.

**Weaknesses.** Fragile unofficial translate endpoints (and ToS risk), brittle delimiter batching, one voice and no diarisation, speed-ups up to 1.5x hurt quality, sequential stages. Improvement over it: length-targeted translation *before* TTS, Demucs stems, sidechain ducking.

---

### 3.4 hassancs91/claude-youtube-editor

**What it is.** "Record the talking head; Claude Code does the rest." A Claude Code project with 9 skills (`clean-cut, make-tsx, fake-screencast, vidtsx-2d-generator, clean-audio, suggest-sfx, packaging, thumbnail, brand-setup`), ~25 Python tools and a Remotion project with 37 example shots. Input is raw talking-head footage, not generated content. Relevant to us for **how Claude directs**, **audio discipline** and **packaging**.

**Verified:** shallow clone; skills, `CLAUDE.md`, `brand.md` and docs read directly; most Python tools read by header and grep only. Nothing run. `brand.md` references `lib/effects.tsx` and `lib/step-title.tsx`, which do not exist in the clone.

**Topic handling.** No discovery. Before transcribing, Claude drafts per-video **ASR keyterms** so product names are not garbled. Packaging intake asks for the idea, one concrete takeaway, audience and conversion target. `docs/shorts-factory-plan.md` derives Shorts as hook, one evidence carrier, named payoff, CTA. `notion_sync.py` pushes each video to a tracker (dry run by default).

**Direction pattern (the core idea).** Claude authors **declarative JSON** (`cuts.json`, `sfx-plan.json`, `timeline.json`) after reading a formatted transcript; deterministic tools (`bake.py`, `mix_sfx.py`, `mix_music.py`) execute it; **hard user-audit gates** sit in between; a browser editor shares the same JSON with Claude.
- Cut policy: "content-aggressive, pause-natural". Keeps are never deleted (auto-applied fluff only hides them).
- Spoken editing instructions ("other take") are grepped first and outrank Claude's judgment.
- When a phrase is doubled, cut the first (derived from 17 audit notes).
- Two cut styles (tight / natural) from numeric knobs.
- `make-tsx` principles: sync every reveal to the word; never pre-empt a concept mentioned later; show real service facts as a TSX clone of the real page; concept beats are full-screen cutaways while overlays are small badges in top or bottom bands.
- `brand.md` is a single style contract read by every skill, mirrored in `brand.ts` and `fonts.ts`. First ~10s run "hotter" with one readable event at a time.

**QA chain.** `analyze_cut.py` (dead air, clipped tails, ghost speech), `verify_cut.py` (**second ASR pass on the rendered cut, diffed against intended words, mandatory**), A/V duration gate, and a "render frames at every cue and look at them" rule.

**Audio and SFX discipline** (measured, with "born in testing" notes):
- `clean-audio` picks the method by noise type (ElevenLabs isolator for dynamic noise, RNNoise for stationary).
- SFX chosen **by function**: whoosh = motion, riser = tension, impact/pop = emphasis, click = snap. Library normalised to about -20 LUFS with a `catalog.json`; misses generated via ElevenLabs SFX.
- Cue times derive from the shot's animation frame (`at_s = master_in + frame/fps`) and transcript word times.
- Rules: story cues at least +4 dB over voice-only (0.3s windows for transients); transient clips need 3-5 dB more gain; Shorts need 4-8 dB more than long-form; cues fully under continuous speech never measure, so cut them; aim 8-12 cues/minute; max 1-2 meme gags per video.
- Music: ElevenLabs Music (instrumental ambient) plus `mix_music.py` with **sidechain compression (~9 dB duck)** and fades.

**Motion rules.** Remotion frame-based only (no `useState`, `useEffect` or CSS animation). Brand motion: fade-and-rise over 14 frames, no overshoot, 3-4 frame staggers, max scale pop 1.03. `fake-screencast` simulates a screen recording (bezier cursor with click ripple, URL bar, 5-frame crossfade for in-page changes, Ken Burns onto the payoff). Footage must be transcoded to 1080x1920@30 8-bit H.264 or `OffthreadVideo` stutters.

**Packaging skill.** One locked title plus **3 thumbnail bets** (YouTube Test & Compare is thumbnail-only); topic-ceiling and promise checkpoint before generating; title and thumbnail checklists; cold-start vs channel-calibrated modes; thumbnails via Nano Banana Pro with face reference and read-back verify loop; description with value hook and chapters; `yt_upload.py` (private draft) and `yt_stats.py`.

**Weaknesses.** Windows/NVENC-centric, text-only cutting judgment (no visual analysis), tuned to one creator's footage, many manual gates, Shorts factory is a pilot, packaging rules are the author's uncalibrated priors, scratch files committed.

---

### 3.5 ChaitanyaEswarRajeshJakki/gemini-youtube-automation

**What it is.** About 750 lines of Python. A GitHub Actions cron (daily 07:00 UTC) has Gemini 2.5 Flash write a lesson as JSON, gTTS narrates each slide, Pillow draws slides over a blurred Pexels photo, MoviePy stitches with background music, then uploads a long 16:9 video **and** a 9:16 Short and commits state back to the repo. Niche: "AI for Developers".

**Verified:** `main.py`, `src/generator.py`, `src/uploader.py`, `.github/workflows/main.yml` (first ~120 lines), `requirements.txt`, head of `content_plan.json`. **Not verified:** file tree, `assets/` contents, tests.

**Topic collection.** None. `generate_curriculum()` asks Gemini for 20 lessons (`chapter, part, title, status, youtube_id`); `main.py` takes the first pending one per run; when all are done it regenerates the curriculum, passing old titles to continue the series. Completion matched by lowercased title.

**Direction.** Plain `generate_content`, JSON requested only in the prompt (fence-stripping, `json.loads`, no schema or retry). Output: `long_form_slides` (7-8 slides), `short_form_highlight` (1-2 punchy sentences), `hashtags`. Structure is hard-coded: intro slide, Gemini slides, outro. No hook, arc or shot list. Slide text is also the narration (walls of text).

**Audio.** gTTS (robotic), 2s throttle, 5 retries with jittered backoff, **reject outputs <1KB** (throttled CI returns 200 with no audio). Slide duration = audio length + 0.5s. One music file at 5% volume. No ducking or SFX.

**Visuals.** 1920x1080 / 1080x1920, blurred Pexels background (query "abstract <title>"), solid navy fallback. Only animation is a 0.5s fade. No Ken Burns or captions.

**Unique features worth taking (plumbing).**
- GitHub Actions cron plus `workflow_dispatch` with a concurrency group.
- State in-repo (`content_plan.json`), committed back with a 3-attempt fetch / reset / replay / push loop.
- Headless YouTube OAuth from base64 secrets (scope `youtube.upload`; note refreshed token is not persisted back).
- One generation yields long video plus Short; the Short links to the long video in its description (30s gap between uploads).
- Resumable chunked upload, thumbnail set, non-zero exit on failure, state saved in `finally`, debug artifacts uploaded.

**Weaknesses.** No trend input, no schema validation, no hook, robotic voice, static slides, generic imagery, public-on-upload with no review step, title-based completion matching, no quota handling, Pexels attribution ignored.

---

### 3.6 naqashafzal/AI-Content-Studio

**What it is.** The broadest toolkit: FastAPI backend, Next.js frontend, four modes (Podcast, Explainer / movie recap, Magic Clipper for Shorts, Director Studio editing an existing video). Uses Gemini (with Google Search grounding), Gemini TTS, Gemini/Vertex images, WaveSpeed (SDXL, hunyuan-video, ElevenLabs TTS), Pixabay, NewsAPI, local Whisper, pysubs2, OpenCV, Playwright publishing.

**Verified:** shallow clone; read `agents.py`, `api_clients.py`, `pipeline.py`, `pipeline_shorts.py`, `server/core/{director_engine,explainer_engine,scheduler}.py`. **Not read:** Next.js frontend, `license_manager.py`. No assets shipped, so `swoosh.wav` and `background_music.mp3` are referenced but absent. Not run.

**Topic and trend collection.**
- `TrendAgent`: NewsAPI top headlines (technology, else general); the top 15 go to Gemini for "exactly 3 highly engaging, viral debate topics... punchy and controversial"; numbered list parsed by regex, hard-coded fallbacks.
- `deep_research`: one Gemini call with the `google_search` tool plus NewsAPI headlines, asking for background, why it's trending, key facts, controversies, outlook. Each style has its own research angle.
- `scheduler.py` `CampaignManager`: `{niche, preset, frequency_hours, next_run, last_topic}`; a background thread runs TrendAgent, the generation pipeline, then auto-publish. The only autonomous loop of all six repos.
- No Reddit, YouTube or Google Trends input.

**Direction.**
- **`STYLE_PROFILES`** (`api_clients.py`): 8 styles (Podcast, ASMR, Documentary, Story, Kids, Horror, Viral, Product Ad), each with five keys: `script, tts, video, image, research`. One style string feeds script tone, vocal direction, image prompts and video prompts. This is its consistency mechanism.
- Script prompt: hard word-count bands per length (Micro <130 words ... Long 1400-1500); structure Cold Open/Hook, Intro, Main, Conclusion, Outro; short 2-3 sentence turns with reactions; varied acting notes "(Laughs)"; N subscribe-CTAs; style frameworks (Viral = pattern-interrupt hook in 3s, Product Ad = AIDA, Story = Hero's Journey). Optional story-arc selector and a **fact-check then revise** pass.
- Storyboard: script split by blank lines, one paragraph per scene; one batched Gemini JSON call returns an image prompt (<60 words, "avoid stiff poses") per scene; video prompts <100 words; a separate 1-3 word stock query.
- Explainer mode maps each voiceover line to a Whisper-timestamped source segment.
- Clipper (`pipeline_shorts.py`): picks 30-60s clips by **Hook / Value / Cliffhanger**; output JSON has `start, end, title, score, hook_score, retention_score, reason, SEO fields, broll[1-3 x {start_offset,end_offset,subject}]`; human picks which to render.
- Gaps: no character bible, reference images, shot types or per-scene duration planning.

**Engagement.** Hook per style, chapter titles (5-10, first must be "Intro"), SEO package, thumbnail prompts (split-screen: emotional photoreal face left, title graphic right).

**Audio.** Gemini TTS with native multi-speaker configs, 4500-char chunks, "realistic voice actor, breathing" wrapper, per-style vocal direction; ElevenLabs via WaveSpeed as alternative; multilingual. Music looped at -15 dB (clipper: 0.08), static, **not real ducking**. **Trigger-word SFX** (`director_engine.py`): Whisper word timestamps matched against words like money / secret / viral / crazy / hack / truth, adding a swoosh via `adelay` plus a 1.5s 15% punch-in zoom. **Silence removal** (pydub, <-40 dB for >=800 ms, re-cut).

**Visuals and captions.** Per-scene fallback chain: Pixabay stock, then WaveSpeed text-to-video, then a 5s ffmpeg still loop; 5-thread pool. Slideshow mode: linear 10% Ken Burns plus 0.5s crossfade. **Captions:** Whisper word timing to ASS karaoke (active word coloured), UPPERCASE, 4-word chunks, **keyword emoji injection** (MONEY, SECRET, CRAZY), themes (default, viral_yellow, neon_cyber, black_white) plus Brand Kit fonts/colours. Shorts reframing: Haar-cascade face tracking at 2 Hz, 9:16 crop, hard cut when the face centre moves >15% of frame width. B-roll as hard full-frame overlays at LLM-chosen offsets.

**Resumability.** Deterministic workspace keyed by URL hash; existing artifacts skipped.

**Weaknesses.** No consistent characters or real shot planning, user-supplied music with no mood matching, naive stock keyword search, fence-stripping JSON with no validation, transcript truncation (15k/50k chars), Gemini safety set to BLOCK_NONE, API keys in URL query strings, Windows-centric, no tests, heavy re-encoding, 2.5s sleep per scene.

---

## 4. Cross-repo comparison matrix

Legend: ● strong / present, ◐ partial, ○ absent, — not applicable.

| Capability | Ours | Agentic Studio | Shorts Gen | Auto-Dub | YT Editor | Gemini Auto | Content Studio |
|---|---|---|---|---|---|---|---|
| Topic discovery from news | ○ | ◐ (LLM only) | ◐ (LLM only) | — | ○ | ○ (curriculum) | ● (NewsAPI + search grounding) |
| Topic dedup / memory | ○ | ◐ (banned list) | ○ | — | ○ | ◐ (title match) | ◐ (`last_topic`) |
| LLM script generation | ○ | ● | ● | — | — (Claude edits) | ◐ | ● |
| Retention structure (open loop, re-hooks) | ○ | ● | ◐ | — | ◐ | ○ | ◐ |
| Schema-validated LLM JSON | ○ | ○ | ○ | — | ◐ (declarative plans) | ○ | ○ |
| Fact-check / claims gate | ○ (planned) | ○ | ○ | — | ○ | ○ | ◐ (optional revise pass) |
| Storyboard / shot planning | ◐ (hand-written) | ◐ (3 queries) | ◐ (2 queries/scene) | — | ● (timeline.json) | ○ | ◐ |
| Character consistency | ● (seeds, cast) | ○ | ○ | — | — | ○ | ○ |
| Multiple voices / personas | ○ | ○ | ○ | ● | — | ○ | ● (multi-speaker) |
| Voice design / cloning | ○ | ○ | ○ | ● | ◐ | ○ | ◐ |
| Mood-mapped music | ○ | ○ | ○ | ○ | ◐ (generated) | ○ | ○ |
| Sidechain ducking | ○ | ○ | ○ | ○ | ● | ○ | ○ (static) |
| Function-based SFX plan | ○ | ○ | ○ | ○ | ● | ○ | ◐ (trigger words) |
| Word-level highlighted captions | ● | ○ | ○ | ○ | ○ (by design) | ○ | ● (+ emoji) |
| Scene template variety | ○ (2) | ◐ | ○ | — | ● (37 shots) | ○ | ○ |
| Beat-aware motion | ○ | ◐ (progress bar) | ○ | — | ● (brand rules) | ○ | ○ |
| Style / format profiles | ◐ (per-episode) | ○ | ○ | ○ | ● (`brand.md`) | ○ | ● (8 profiles) |
| AI video clips | ● | ○ | ○ | — | ◐ (fal/Kling) | ○ | ◐ (hunyuan) |
| Rendered-output verification | ○ | ○ | ○ | ○ | ● (re-ASR, frames) | ○ | ○ |
| Human review gate | ○ | ● (dashboard) | ○ | ○ | ● | ○ | ◐ (clip picker) |
| Thumbnail / title / SEO | ○ | ◐ (concept) | ○ | ○ | ● | ◐ | ● |
| Scheduling / cron | ○ | ○ | ○ | ○ | ○ | ● | ● |
| Upload | ○ | ● | ○ | ○ | ● | ● | ● (Playwright) |
| Long + Short from one run | ○ (carousel only) | ● | ○ | ○ | ◐ | ● | ◐ |
| LLM model fallback chain | ○ | ● | ○ | — | — | ○ | ○ |
| Resumable / cached stages | ● | ◐ | ◐ | ● | ◐ | ◐ | ● |

---

## 5. Feature catalogue by theme

Each entry has an ID for cross-reference in [section 6](#6-prioritised-recommendations). **Effort:** S (<1 day), M (1-3 days), L (>3 days). **Impact on variety / engagement:** H / M / L.

### A. Topic and news collection

| ID | Feature | Source | What to do for us | Effort | Impact |
|---|---|---|---|---|---|
| A1 | **NewsAPI headlines → LLM shortlist of N topics → pick** | Content Studio (`TrendAgent`) | Pull headlines in our niche (rates, inflation, markets), have the LLM propose 3-5 candidates scored for "explainable to a 5-year-old" and "timely". | M | H |
| A2 | **Search-grounded research** (Gemini `google_search` tool) returning background, why-trending, key facts, controversies, outlook | Content Studio | Produce a `research.json` whose facts feed `sources[]` directly, so claims are grounded rather than invented. | M | H |
| A3 | **Research JSON schema** with `why_now, hook_question, key_points, thumbnail_concept, estimated_virality` | Agentic Studio | Adopt as the Director's first output; later stages consume it. | S | H |
| A4 | **Focus-angle rotation** (12 predefined angles, random or chosen) | Agentic Studio | Maintain a list of angles (myth-busting, "what if", history, everyday cost, comparison...) and rotate to force topical variety. | S | M |
| A5 | **Topic memory / dedup** (banned list plus `last_topic`) | Agentic Studio, Content Studio | Persist published topics and angles in a repo JSON; inject "do not repeat" into prompts; cooldown per angle. Both repos stop at a static list, so do better by storing embeddings or normalised titles. | S | H |
| A6 | **Curriculum / series planning** (20 lessons, status, continue the series) | Gemini Automation | For explainer series, pre-plan a syllabus (concept ladder: inflation → interest rates → bonds ...). Pair with A5. | M | M |
| A7 | **Campaign scheduler** `{niche, preset, frequency_hours, next_run, last_topic}` | Content Studio | Config file of campaigns, each tied to a Style Profile (F1). | M | M |
| A8 | **"Latest events must carry a source" rule** | Our `MASTER-PLAN.md` | Already policy; enforce in code with [G1](#g-quality-gates-and-qa). | S | H |
| A9 | Banned-topics file, editable | Agentic Studio | Cheap guardrail alongside A5. | S | L |

Gap shared by all six repos: **none uses real trend signals** (Google Trends, Reddit, YouTube trending). If we want a genuine edge here we must add one ourselves, for example RSS from central-bank and statistics sites plus a trends API, then let the LLM rank.

### B. Direction: script, storyboard, shot planning

| ID | Feature | Source | What to do for us | Effort | Impact |
|---|---|---|---|---|---|
| B1 | **LLM Director stage** producing a schema-valid `episode.json` | Planned in our `v1.2-improvements.md`; patterns from all repos | Build `director.py` plus `episode.schema.json` plus `direction/*.md`. Validate output, retry on failure with the validation error fed back. | L | H |
| B2 | **Retention template**: hook, open loop, content, re-hook at ~90s / ~3 min, content, conclusion with callback, CTA | Agentic Studio | Adapt to our ~50s shorts: hook (0-3s), open loop, 2 content beats, **one mid re-hook** ("But here's the weird part"), payoff with callback to the hook, CTA. Make the re-hook timing a parameter by episode length. | M | H |
| B3 | **Beat map** Hook → Context → Mechanism → Twist → Outro, and the commented-out cinematic variant (paradox hook, mystery, "Wait, what?" climax, mic-drop) | Shorts Gen | Offer multiple beat maps (see F2) so episodes do not all follow hook, analogy, term, worry, payoff, CTA. | S | H |
| B4 | **Two visual cues per sentence** (`visual_1` at start, `visual_2` at end or reaction) and switch mid-sentence | Shorts Gen | Add optional `visual_b` per scene; renderer cross-cuts at the word-timing midpoint. | M | H |
| B5 | **"Strictly literal" visual prompt rule** plus fallback ladder (simplified query, A/B reuse) | Shorts Gen | Add to storyboard rules; useful for stock/clip fallbacks. | S | M |
| B6 | **Style Profile drives every prompt** (script tone, vocal direction, image style, video style, research angle share one string) | Content Studio | See [F1](#f-variety-engines). | M | H |
| B7 | **Hard word-count bands per target duration** | Content Studio | Compute words = duration × speaking rate (our voice at 0.95 speed), so scene length is predictable before TTS. | S | M |
| B8 | **Short sentences, varied length, "But wait" resets, reactions** | Agentic Studio, Content Studio | Put in `direction/eli5.md` as style rules. | S | M |
| B9 | **Declarative plan files executed by deterministic tools** (`cuts.json`, `sfx-plan.json`, `timeline.json`) | YT Editor | The Director emits `episode.json`; add a second plan, `audio-plan.json` (music, SFX, ducking) and a `motion-plan` (template and transition per beat). Tools stay deterministic and cacheable. | M | H |
| B10 | **Per-video keyterms/glossary** to protect terms | YT Editor | Pass our `term` list (INFLATION, INTEREST RATE...) into TTS pronunciation hints and caption casing. | S | L |
| B11 | **Fact-check then revise pass** | Content Studio (optional) | Second LLM call that checks each claim against `research.json` sources and revises. Feeds [G1](#g-quality-gates-and-qa). | M | H |
| B12 | **Batched storyboard call**: one JSON call returns all scene prompts | Content Studio | One call keeps style consistent across scenes and costs less. Pair with our `cast` placeholders. | S | M |
| B13 | **ViMax camera-planning rules** (already vendored: widest shot first, wide → medium → close, repeat cast descriptors verbatim) | Our `vendor/ViMax` | Encode into `storyboard_rules.md` and into the Director's prompt, since today they live only in episode prompts. | S | M |

### C. Organising thoughts for engagement

| ID | Feature | Source | Notes |
|---|---|---|---|
| C1 | **Open loop** early, closed later, plus **callback ending** to the hook | Agentic Studio | Make "loop id" an explicit schema field so a validator can check the loop opens and closes. |
| C2 | **Analogy-first explanation** | Agentic Studio, our existing style | We already do this; keep, but vary the analogy world per episode (see F3). |
| C3 | **Pattern-interrupt in the first 3 seconds** | Content Studio (Viral), Agentic Studio (Shorts) | Rule: first 3 words must carry the hook; validator checks length of first sentence. |
| C4 | **Hook / Value / Cliffhanger scoring** with `hook_score`, `retention_score`, `reason` | Content Studio clipper | Reuse as a self-critique step: the Director scores its own draft per beat and rewrites the weakest. |
| C5 | **Progress bar with section dots** | Agentic Studio | Cheap on-screen structure cue for longer episodes. |
| C6 | **On-screen bullets that appear in sync with narration** | Agentic Studio, YT Editor (sync reveals to the word) | We have `TermSticker`; generalise to a "KeyPoint" template whose reveal frame is derived from word timestamps. |
| C7 | **Never pre-empt a concept that is mentioned later** | YT Editor | Add to validator: a visual may not show a term before its narration word timestamp. |
| C8 | **Concept beats are full-screen; overlays are small badges** | YT Editor | Hierarchy rule for our templates so overlays never compete with the main idea. |
| C9 | **Chapters** (5-10, first is "Intro") | Content Studio, YT Editor | Only useful if we produce longer videos; derive from `beat` boundaries. |
| C10 | **Run first ~10s "hotter"** with one readable event at a time | YT Editor `brand.md` | Make hook scenes faster-cut, with stronger SFX and tighter captions than the rest. |

### D. Music, voice, SFX, mixing

| ID | Feature | Source | What to do for us | Effort | Impact |
|---|---|---|---|---|---|
| D1 | **Mood-mapped music library** (tag tracks by mood / tempo / energy; Director picks per beat or per episode) | Gap in all six; closest is YT Editor's generated beds | Build `assets/music/catalog.json` (`mood, bpm, energy, license`). Generate a library with ACE-Step (already used once) or ElevenLabs Music; select by Style Profile plus beat energy. | M | H |
| D2 | **Sidechain ducking** (~9 dB under voice, with fades) | YT Editor `mix_music.py`; Auto-Dub lacks it | Apply as an ffmpeg `sidechaincompress` stage before loudnorm (Remotion-side volume curves are the alternative). Our current static 0.09 is the weakest part of our mix. | S | H |
| D3 | **Function-based SFX plan**: whoosh = motion, riser = tension, impact/pop = emphasis, click = snap; 8-12 cues/minute | YT Editor | Replace "whoosh at every boundary" with an `sfx-plan.json` the Director writes, mapping cues to beats and word timestamps. | M | H |
| D4 | **SFX library with catalog**, normalised to ~-20 LUFS, grown per video, misses generated | YT Editor | Same pattern as D1. | M | M |
| D5 | **Numerically verify SFX audibility** (+4 dB over voice-only in 0.3s windows; cut cues that cannot be measured) | YT Editor | A small QA script after mixing. Prevents inaudible or buried cues. | M | M |
| D6 | **Trigger-word SFX plus punch-in zoom** | Content Studio | Keyword list per Style Profile (money, secret, ...) feeding D3; punch-in is cheap in Remotion. | S | M |
| D7 | **Multiple narrators**: persona table (narrator / young / deep × gender), per-episode or per-character voices | Auto-Dub, Content Studio (multi-speaker) | Add `voice` per cast member in `episode.json`; MiniMax supports many voices and `emotion`. Use `emotion` per beat (excited hook, calm explanation). | S | H |
| D8 | **Voice design / cloning with cached reference** | Auto-Dub | If MiniMax voice cloning is available, design per-series narrators from a text description, cache the reference. | M | M |
| D9 | **Per-beat TTS direction** (vocal direction string per style, acting notes) | Content Studio | Feed `emotion` and speed per scene from the Director. | S | M |
| D10 | **Pause/breath control** (1s gap between scenes, "breathing" wrapper) | Shorts Gen, Content Studio | Our `PAD` is a fixed 0.45s; make it beat-dependent (longer before payoff). | S | L |
| D11 | **Silence-aware duration fitting** (atempo cap 1.5x, slow-down band, trim at silence) | Auto-Dub | Useful when ClipScene video must fit narration; replace the plain 1.0-1.6 playbackRate clamp with trim-at-silence plus mild speed. | M | L |
| D12 | **Caption timing coverage metric** (warn <85%) | Agentic Studio | Add to TTS stage; fail fast on bad word timestamps. | S | L |
| D13 | **Loudness**: we already `loudnorm` to -14 LUFS | Ours | Keep. Add per-stem loudness targets before the mix. | S | L |
| D14 | **Audio denoise by noise type** | YT Editor | Only relevant if we ingest recorded voice; skip for TTS. | — | — |

### E. Animations, scene templates, transitions, captions

| ID | Feature | Source | What to do for us | Effort | Impact |
|---|---|---|---|---|---|
| E1 | **Scene template library**: add kinetic-text, number counter, chart (bar/line), map, before/after, comparison split, checklist, timeline, quote card, "what-if" split-screen, screen-recording simulation | YT Editor (37 shots), Agentic Studio (title cards, lower thirds, bullets) | Our largest visible gap. Each template is a Remotion component with a typed props schema; the Director picks one per scene. | L | H |
| E2 | **Beat-aware motion**: hook = fast cuts and bigger zoom; explain = calm; payoff = punch-in plus sting; CTA = clear end card | Ours (renderer ignores `beat`), YT Editor `brand.md` | Make `Episode.tsx` read `beat` and choose transition set, zoom range, SFX and sparkle density. | M | H |
| E3 | **Transition sets chosen by Style Profile** (and by beat) instead of `index % 4` | Shorts Gen (random pick), ours | Define 3-4 sets (soft, punchy, glitch, paper-cut) using `@remotion/transitions`; vary durations per beat. | S | H |
| E4 | **Mid-sentence visual switch** | Shorts Gen | See [B4](#b-direction-script-storyboard-shot-planning). | M | H |
| E5 | **Mascot / branded interstitial** in random middle scenes | Shorts Gen | A short recurring character beat (never first/last); fits a kids/explainer brand. | S | M |
| E6 | **Word-level karaoke captions with emoji injection** and caption themes | Content Studio (themes), ours (already word-level) | We already have good captions. Add: theme selection via Style Profile, keyword emoji, UPPERCASE option, and chunk size parameter. | S | M |
| E7 | **Motion rules**: frame-based only, fade-and-rise 14 frames, no overshoot (for professional looks) | YT Editor | Use as the "serious" Style Profile; our current playful profile keeps springs. Shows how a profile changes motion language. | S | M |
| E8 | **Fake screencast** (bezier cursor, click ripple, URL bar) | YT Editor | Useful for "how to check X on the Fed site" or app walk-throughs; niche. | M | L |
| E9 | **Face-tracked 9:16 reframing, hard cut on large movement** | Content Studio | Only needed if we ingest landscape footage. Skip for now. | — | — |
| E10 | **Progress bar / section dots, animated gradient background, vignette** | Agentic Studio | Optional chrome per profile. | S | L |
| E11 | **Randomised, seeded sparkle positions** (ours are fixed coordinates) | Ours | Seed from scene id so each scene differs but renders are deterministic. | S | M |
| E12 | **Per-episode image/keyframe seeds** (ours hard-coded 1234 / 4242) | Ours | Derive from episode id; keep per-character seeds stable within an episode. | S | M |
| E13 | **Render frames at each cue and look at them** | YT Editor | Automated contact sheet in the QA stage ([G3](#g-quality-gates-and-qa)). | S | M |
| E14 | **Transcode footage to 1080x1920@30 8-bit H.264 before Remotion** | YT Editor | Avoids `OffthreadVideo` stutter; apply to Hailuo clips if we see judder. | S | L |

### F. Variety engines

These are the answer to "how do we create more variety".

| ID | Feature | Description |
|---|---|---|
| F1 | **Style Profiles** (from Content Studio `STYLE_PROFILES` and YT Editor `brand.md`) | A single file per format bundling: palette, font, illustration style, motion language, transition set, caption theme, voice and emotion defaults, music mood pool, SFX palette, scene-template weights, beat map, script tone and research angle. The Director and renderer read it. Example profiles: *Storybook* (current), *Chalkboard explainer*, *News-desk*, *Neon-night*, *Paper-cut*, *Retro-comic*, *Documentary-calm*. |
| F2 | **Beat-map library** | 4-6 structures: Problem-Solution, Myth-Bust, "What if", Story-Twist (Shorts Gen), Question-Ladder, Comparison, Cold-Open Mystery. Director chooses one that does not match the last N episodes. |
| F3 | **Analogy-world rotation** | Cookie town, lemonade stand, playground, kitchen, football team, ... listed in the series bible; rotated per episode. |
| F4 | **Cast rotation** | More than one recurring character (we only use Maya); give each a voice (D7), a look and a seed. |
| F5 | **Anti-repeat constraints** | Store last N episodes' (profile, beat map, analogy world, opening hook type, music track, template mix). Director prompt includes "avoid these" and a validator rejects near-duplicates. |
| F6 | **Format variants from one topic** | Short, carousel (have), long-form, Short that teases the long video (Gemini Automation). |
| F7 | **Multi-language output** | Independent subtitle and dub languages (Auto-Dub), with length-targeted translation. Opens new audiences with little extra generation cost. |
| F8 | **Series bible** | `series.json`: recurring cast, catchphrases, running gags, syllabus (A6), and the profile pool. |

### G. Quality gates and QA

| ID | Feature | Source | Notes | Effort | Impact |
|---|---|---|---|---|---|
| G1 | **Claims gate**: block render if a claim has no `sources[]` URL | Our plan; AgentTube concept | `run.py` currently never reads `sources`. Add a pre-render check plus the fact-check pass ([B11](#b-direction-script-storyboard-shot-planning)). | S | H |
| G2 | **Schema validation with retry-on-error** for every LLM JSON | Missing in all six repos (all strip fences and `json.loads`) | Use JSON Schema or zod, feed errors back, cap retries. A clear advantage over the references. | S | H |
| G3 | **Rendered-output verification**: second ASR over the final mix, diff against intended narration; contact sheet of frames at cues | YT Editor | Catches TTS mispronunciation, desynced captions and blank frames. | M | M |
| G4 | **Human approval gate** with edit-and-resume (dashboard or file diff) | Agentic Studio, YT Editor, Content Studio | Pause after Director output and after audio plan; edit JSON; resume only later stages. Our per-scene cache already supports this. | M | M |
| G5 | **Self-critique scoring** (hook_score / retention_score / reason) then rewrite weakest beat | Content Studio | Cheap quality lift. | S | M |
| G6 | **Pre-publish checklists** for title and thumbnail | YT Editor | Part of packaging. | S | L |
| G7 | **A/V duration gate** | YT Editor | Fail if audio and video lengths differ >100 ms. | S | L |
| G8 | **Sync-coverage check on word timings** | Agentic Studio | See [D12](#d-music-voice-sfx-mixing). | S | L |

### H. Packaging, publishing, automation

| ID | Feature | Source | Notes | Effort | Impact |
|---|---|---|---|---|---|
| H1 | **Packaging step**: one locked title, 3 thumbnail variants, description with hook and chapters, tags | YT Editor, Content Studio, Agentic Studio | We have `publish.md` per episode by hand; generate it. YouTube Test & Compare supports thumbnails only, so test thumbnails, not titles. | M | M |
| H2 | **Thumbnail generation** with face/character reference and read-back verification | YT Editor | Use our existing image adapter with the character cast for consistency. | M | M |
| H3 | **GitHub Actions cron** plus `workflow_dispatch` plus concurrency group | Gemini Automation | Fits the repo; needs secrets. | M | M |
| H4 | **State committed back to the repo** with fetch / reset / replay / push retry | Gemini Automation | For topic memory (A5) and series progress. | S | M |
| H5 | **Headless YouTube OAuth** from base64 secrets; resumable chunked upload; private-draft first | Gemini Automation, YT Editor | Upload as **private draft** by default so a human reviews (the Gemini repo publishes publicly, which we should not copy). Persist refreshed tokens. | M | M |
| H6 | **Long plus Short from one run**, Short links to long | Gemini Automation, Agentic Studio | See F6. | M | M |
| H7 | **Tracker sync** (Notion rows, dry-run default) | YT Editor | Optional; useful once volume grows. | S | L |
| H8 | **Analytics feedback loop** (`yt_stats.py`) feeding topic/profile selection | YT Editor (stats tool), AgentTube (vendored idea) | No repo closes this loop. A natural v3 item: weight profiles and beat maps by retention. | L | H (long term) |

### I. Robustness and engineering

| ID | Feature | Source | Notes |
|---|---|---|---|
| I1 | **Model fallback chain**: ordered models, 3 tries each, 15s/30s backoff on 429/503, fail fast on auth errors | Agentic Studio | Wrap all LLM and provider calls. |
| I2 | **Reject suspiciously small TTS output** (<1KB) and retry with jitter | Gemini Automation | Cheap guard for our MiniMax adapter. |
| I3 | **Fallback ladder per asset**: clip → illustration → still-loop | Content Studio | If a Hailuo clip fails, fall back to an illustration scene rather than aborting the episode. |
| I4 | **Deterministic workspace keyed by input hash**, skip existing artifacts | Content Studio, Auto-Dub | We already cache per scene; add content-hash invalidation (prompt change should invalidate its scene). |
| I5 | **Env-configurable constants** (`PAD`, `TR`, gains) | Auto-Dub | Move our hard-coded constants into `providers.yaml` or the Style Profile. |
| I6 | **Export flags** `yuv420p`, `+faststart` | Shorts Gen | Verify our encode uses them. |
| I7 | **Keep API keys out of URLs; keep safety settings on** | Counter-example in Content Studio | See [section 7](#7-things-not-to-copy). |

---

## 6. Prioritised recommendations

### Phase 1: Quick wins (a few days)
Immediate variety with little architecture change.

1. **E2 + E3**: make `Episode.tsx` beat-aware; transition set and zoom/sparkle intensity by beat.
2. **D7 + D9**: multiple voices with per-beat `emotion` and speed.
3. **D2**: sidechain ducking in the mix stage.
4. **E11 + E12**: seeded sparkle positions and per-episode seeds.
5. **G1 + G2**: claims gate plus schema validation, even before the Director exists, so hand-written episodes are checked.
6. **I1 + I2 + I3**: provider fallback, small-output guard, asset fallback ladder.

### Phase 2: Variety core (1-2 weeks)
7. **F1 Style Profiles** (start with 3: Storybook, Chalkboard, News-desk).
8. **E1 Template library** (start with kinetic text, counter, bar chart, comparison split, checklist).
9. **D1 + D3 + D4** music library with mood tags and a function-based SFX plan.
10. **F2 + B3** beat-map library, with an anti-repeat rule (F5).

### Phase 3: The Director (2-4 weeks)
11. **B1** LLM Director with `episode.schema.json`, `direction/` rules (B2, B8, B13), batched storyboard (B12), self-critique (C4/G5), claims check (B11).
12. **A1 + A2 + A3 + A5** news → research JSON → topic memory.
13. **B9** emit `audio-plan.json` and a motion plan alongside `episode.json`.
14. **G4** human approval gate between stages.

### Phase 4: Distribution and learning
15. **H1 + H2** packaging and thumbnail generation.
16. **H3 + H4 + H5** scheduled runs, state commit, private-draft upload.
17. **F6 + F7** long/short variants and multi-language.
18. **H8** analytics feedback to weight profiles and beat maps.

### Suggested first experiment
Take `ep01-interest-rates-v2` and re-render it under two different Style Profiles (say Storybook vs News-desk) with different voice, music mood, transition set and a different beat map. If the same content already feels like two different shows, the variety architecture is sound before any LLM work is spent.

---

## 7. Things NOT to copy

- **Public-by-default upload** (Gemini Automation): upload as private draft with human review.
- **Gemini safety `BLOCK_NONE` and API keys in URL query strings** (Content Studio).
- **Unofficial Google Translate endpoints** (Auto-Dub): fragile and potentially against terms.
- **Ungrounded "trending" topics** (Shorts Gen, Gemini Automation): LLM-invented facts. Always ground and cite.
- **Prompt-only structure without a validator** (Agentic Studio): the script template is good, but nothing checks adherence.
- **Static low-volume music called "ducking"** (Content Studio): use real sidechain.
- **Cues "for show" in SFX**: the YT Editor author cut the whole optional tier on first listen; skip deniable cues.
- **Rules from one channel's CTR data** (YT Editor packaging) are the author's own uncalibrated priors; calibrate on our data.
- **Windows/NVENC-specific tooling** (YT Editor, Content Studio): we are on macOS.
- **Hard-coded personal branding and title-based matching** (Gemini Automation).
- **Walls of slide text read as narration** (Gemini Automation).
- **Pexels-only generic imagery** (several): our generated illustrations and clips are a strength; do not regress.

---

## 8. Decisions and open questions

### Decided (2026-10-05)

| Question | Decision | Consequence |
|---|---|---|
| Format scope | **Both** Shorts and long-form | The retention template (B2) applies in full: re-hook timing, chapters (C9) and the progress bar (C5) become parameters of episode length. Beat maps need a short and a long variant. |
| Brand range | Not kids-only. Two audiences: **kids**, and **adults who don't know the jargon**. In both cases the method is the same: explain with analogies, in simple words. "ELI5" means *analogy-driven plain language*, not childish tone. | Style Profiles differ in *presentation* (look, motion, captions, music), not in *explanation method*. `video-pipeline/direction/audience.yaml` already encodes the analogy rules (concrete picture first, true term second, one analogy per video, state its limitation). |
| Music | **Generate or use free** | Offline generator added (`video-pipeline/tools/gen_music.py`, numpy only, no API, no licence issue). Free/open sources (ACE-Step, a CC0 library) stay available through the same mood catalog (D1). |
| Experiment | **Run it** | See section 9. |

### Still open

1. **Voice provider.** Does MiniMax cover enough distinct voices and emotions, or do we add a second TTS (edge-tts is free)?
2. **News sources.** Which feeds and official sources count as acceptable grounding?
3. **Human gates.** How much review before publish (script only, or script plus audio plan plus final render)?
4. **Budget.** Per-episode cost ceiling; Phase 3's fact-check and self-critique add LLM calls.
5. **Long-form structure.** Target length (3-5 min? 8+?) and whether chapters are generated.

---

## 9. Experiment 1: one episode, two Style Profiles

Goal: test whether the variety architecture (profile + beat-aware renderer + audio system) makes the same content feel like different shows, before spending anything on LLM work.

- Content: `ep01-interest-rates-v2` unchanged. Same script, same cached illustrations, clips and narration. **Zero paid API calls.**
- Baseline: existing `out/ep01-interest-rates-v2/final.mp4`.
- Variants (`video-pipeline/config/profiles/`):
  - `storybook-v2`: kids look, but beat-aware (hook and payoff punch in, worry beat goes quiet, term beat flips in); playful generated music; per-scene sparkle jitter.
  - `explainer-calm`: adult plain-language look: Poppins, clean highlight captions, term "card" instead of sticker, progress bar, graded footage with vignette, cool palette, calm generated music ducked hard under narration, minimal SFX.
- Implemented: profile schema (`remotion-app/src/types.ts`, `profile.ts`), beat-aware `Episode.tsx` (transition per entered beat, zoom/punch/sparkles per beat, per-beat SFX, music ducking from narration windows), caption variants, term card, `run.py --profile=<name>`.
- Run: `python3 run.py episodes/ep01-interest-rates-v2 props --profile=explainer-calm` then `... render --profile=explainer-calm`. Outputs land beside the baseline as `final_<profile>.mp4`.
- Not tested here: new voices, new illustrations, new scene templates (E1), and the Director. Those need API spend or larger builds.

Results are recorded below once reviewed.

---

### Appendix: evidence limits

- GitHub API tree listings were unavailable (403), so repo structures are partial. Per-repo sections state what was read.
- WebFetch returns model summaries, not raw files, so exact prompt wording is paraphrased and "not present" claims are likely rather than certain.
- Nothing from the external repos was executed; claims about output quality are not made.
- The per-repo working notes are in the session scratchpad, not in this repository.
