# 09 - Remotion skills, templates and libraries: what is actually good

Research date: 2026-10-05. Scope: agent skills (SKILL.md), templates and libraries for premium-looking Remotion explainers (1920x1080) and Shorts (1080x1920). Our stack: Remotion 4.0.532, `@remotion/transitions, captions, shapes, paths, noise, sfx, google-fonts, media-utils`; profiles in `video-pipeline/config/profiles/*.json`; scenes in `video-pipeline/remotion-app/src/*.tsx`.

Method and safety: read-only. Repos were `git clone --depth 1` into `/private/tmp/claude-501/-Users-pratyushmishra-Documents-GitHub-LinkedInPost/43ce9c99-cf36-4d0b-bc14-75dffd3988e1/scratchpad/skills-a/<name>`. Nothing was installed or executed (no npm/npx/pip, no postinstall, no scripts, no MCP servers added). I ran static `git grep` for risky patterns (curl-pipe-sh, eval, base64 decode, child_process, postinstall, secret env reads) and read the SKILL.md / rule files of every skill listed as "Read". Large repos (remocn 2,351 files, video-shotcraft 989, toolkit 622) were read by their skill files, craft docs and a sample of source, not file by file.

Honesty notes (things I could not verify):
- Star counts come from `gh api repos/OWNER/REPO --jq .stargazers_count` on 2026-10-05 (all entries below). Third-party lists quote slightly different numbers (e.g. charlie947 61 vs 72).
- skills.sh could not be read (the page returned only navigation chrome via WebFetch), so install counts are unknown. claudemarketplaces and Reddit/X/HN did not surface any usable thread beyond blog and YouTube write-ups (tella.com, mindstudio.ai, mejba.me); I cite no forum sentiment.
- The `awesome-claude-video-skills` list (zhuyansen, 409 stars) assigns "SAFE/CAUTION" grades; I did not verify those grades.
- Not reviewed in depth: OpenMontage (already covered in `06-openmontage.md`), fframes, OpenChatCut, video-podcast-maker, reactvideoeditor/remotion-templates, Bomx/super-video-maker-skill (read file list and README line only), video-talkcraft (cloned, read frontmatter only), guizang-product-video-skill (cloned, frontmatter only; AGPL + BUSL assets).
- I did not render anything from these repos, so "quality" below is judged from their written rules, code and (where present) described reference videos, not from watching output.

---

## 1. Candidate table (sorted by stars)

Type: S = agent skill (SKILL.md), T = template/project, L = library/registry, H = hub/index.

| # | Stars | Repo | Type | Last push | Licence | Reviewed |
|---|------:|------|------|-----------|---------|----------|
| 1 | 63,176 | calesthio/OpenMontage | T (multi-provider video system, 700+ skill files) | 2026-10-03 | AGPL-3.0 | No (see doc 06) |
| 2 | 10,288 | Vincentwei1021/video-shotcraft | S + T + assets | 2026-10-02 | Apache-2.0 (GitHub API) | Yes |
| 3 | 4,841 | remotion-dev/skills (official) | S (12 skills) | 2026-10-01 | none in repo; parent Remotion License applies | Yes (full) |
| 4 | 2,233 | Vincentwei1021/anything2explainer | S + T | 2026-09-18 | custom: noncommercial free, commercial needs permission | Yes |
| 5 | 2,164 | digitalsamba/claude-code-video-toolkit | S + T + L (transitions, components) | 2026-10-02 | MIT | Yes |
| 6 | 2,110 | 0xsline/OpenChatCut | editor app | 2026-10-04 | not checked | No |
| 7 | 2,069 | dmtrKovalenko/fframes | L (render framework) | 2026-10-04 | MIT | No |
| 8 | 1,650 | Agents365-ai/video-podcast-maker | S/T | 2026-10-01 | MIT | No |
| 9 | 1,563 | Remocn/remocn | L (shadcn registry, ~240 components) + S | 2026-09-30 | MIT | Yes |
| 10 | 1,348 | Vincentwei1021/video-talkcraft | S + T (108 recipe cards) | 2026-10-01 | custom (same author as #4) | Frontmatter only |
| 11 | 695 | iart-ai/motion-skills | H (index of 17 packs) | 2026-09-30 | MIT | Yes |
| 12 | 681 | op7418/guizang-product-video-skill | S (GSAP/Three, not Remotion-first) | 2026-10-01 | AGPL-3.0 + BUSL assets | Frontmatter only |
| 13 | 484 | av/remotion-bits | L (npm `remotion-bits` 0.2.1) + S + MCP | 2026-09-15 | MIT (package.json) | Yes |
| 14 | 386 | wshuyi/remotion-video-skill | S (generic tutorial) | 2026-01-25 | none stated | Yes |
| 15 | 301 | Bomx/super-video-maker-skill | S (HeyGen/Seedance/OpenAI pipeline) | 2026-08-09 | none stated | No |
| 16 | 283 / 272 / 261 / 220 / 147 | remotion-dev/template-tiktok / -audiogram / -prompt-to-motion-graphics-saas / -code-hike / -prompt-to-video | T (official templates) | 2026-09-29 | Remotion License | No (names only) |
| 17 | 271 | hassancs91/claude-faceless-shorts-creator | T (Shorts factory) | 2026-08-18 | MIT | No |
| 18 | 260 | howseen-ai/claude-motion-design | S (HTML + Playwright, NOT Remotion) | 2026-10-04 | MIT | Partly |
| 19 | 259 | haidrrrry/claude-remotion-skill | S | 2026-08-12 | MIT | Yes |
| 20 | 255 | reactvideoeditor/remotion-templates | L (effects) | 2026-04-21 | none stated | No |
| 21 | 217 | AgriciDaniel/claude-shorts | S + T (Shorts with captions) | 2026-07-11 | MIT | Yes (refs) |
| 22 | 128 | DojoCodingLabs/remotion-superpowers | plugin (MCP + hooks) | 2026-10-03 | MIT | Yes (risk) |
| 23 | 120 | jhartquist/claude-remotion-kickstart; runesleo/claude-video-kit | T / S | 2025-12 / 2026-09 | MIT | No |
| 24 | 80 | Liamrjohnston/remotion-motion-graphics-skill | S x4 | 2026-07-24 | MIT | Yes |
| 25 | 72 | charlie947/motion-graphics-skills | S x13 (HTML + `window.seek`, HyperFrames) | 2026-09-30 | MIT | Yes |
| 26 | 46 / 29 | iart-ai/motion-design-skills / explainer-video-skills | S packs | 2026-06-22 | MIT | explainer pack Yes |
| 27 | 13 / 12 / 6 / 4 | iart-ai tiktok-video / kinetic-typography / data-animation / youtube-video packs | S packs | 2026-06-22 | MIT | tiktok, kinetic, data Yes |
| 28 | 116 | buainoai/remotion-skills | S (Chinese translation of the old best-practices skill; 37 KB) | 2026-01-30 | none stated | No |

Where it matters, the repo says "last commit" = `git log -1` of the clone: skills 2026-10-01, toolkit 2026-10-02, remocn 2026-09-30, motion-graphics-skills 2026-09-30, claude-remotion-skill 2026-08-12, remotion-motion-graphics-skill 2026-07-23, claude-shorts 2026-04-10 (GitHub pushed_at 2026-07-11 differs, probably a non-commit push), remotion-bits 2026-09-15, wshuyi 2026-01-25.

---

## 2. Per-candidate review

### 2.1 remotion-dev/skills (official) and our vendored copy

Location: our copy `video-pipeline/vendor/remotion/packages/skills/skills/` (version 4.0.532, same as our stack); upstream clone `skills-a/skills`. Type: skill pack (12 skills). No LICENSE file in the standalone repo; the monorepo Remotion License applies (free for individuals/small companies, company licence for larger for-profits - check this before the channel becomes a business).

Files read: `remotion-best-practices/SKILL.md` (router), `remotion-create/{SKILL,video-layout,tailwind}.md`, `remotion-markup/SKILL.md` plus `timing, timing-props, transitions, effects, light-leaks, motion-blur, text-highlights, sfx, audio, audio-visualization, multi-scene-video, measuring-text, sequencing, voiceover, silence-detection, calculate-metadata`, `remotion-captions/{SKILL,display-captions,transcribe-captions}.md`, `remotion-render/SKILL.md`, `remotion-interactivity/SKILL.md` (first part). Skimmed by listing only (low relevance to us): maps (4 techniques), saas, studio, upgrade, docs, multimedia, 3d, lottie, gifs, fonts, embedding-videos, cropping, html-in-canvas, ffmpeg, compositions, connected-compositions, images, parameters, measuring-dom-nodes, video-editing.

What it is: a correctness and API-currency skill. It keeps the agent from writing invalid Remotion (CSS transitions, un-clamped interpolate, missing premount, wrong media components). Genuinely current: it documents APIs newer than most community skills (`Easing.spring`, `output: 'perceptual-scale'`, `posterize`, `Interactive.withSchema`, `@remotion/effects` with ~55 WebGL effects, `lightLeak`, `HtmlInCanvasMotionBlur` from 4.0.529, `@remotion/rough-notation`, `@remotion/whisper-webgpu`).

Quality for our needs: high for mechanics, thin for aesthetics. The only design guidance is `video-layout.md` (about five bullets: design a video not a webpage; one focal thing per scene; at 1080 wide keep key text 80px from the sides and 100px from top/bottom; headline >= 84px, support text >= 44px). No palette, typography, motion-principle, caption-style or SFX-mixing guidance beyond a list of stock sounds at `remotion.media/*.wav`. Roughly half of the pack (Studio interactivity, `Interactive.withSchema`, connected compositions, "preserve user changes", "open the preview before building") is about Studio write-back editing, which does not fit our JSON-driven render pipeline. Judgement: use as the API ground truth, do not expect it to make videos look premium.

Rules and patterns worth adopting (paraphrased):
- Drive every animation from `useCurrentFrame()` + `interpolate()`; clamp both ends; never CSS `transition`/`animation`/Tailwind animate classes.
- Pick easing explicitly: `Easing.bezier(0.16, 1, 0.3, 1)` is their default entrance; `Easing.spring({damping: 200})` for a no-bounce push; arrays of easings (n-1) for multi-keyframe curves.
- For scale animations add `output: 'perceptual-scale'` so growth does not look like it decelerates as it gets bigger.
- Use `translate`/`scale`/`rotate` CSS properties rather than `transform` strings (only fall back to `transform` for skew/perspective).
- `posterize: 3` in `interpolate` gives a deliberate stepped (every 3rd frame) look, useful for a hand-made/paper style.
- `premountFor={fps}` on every timed item (`Sequence`, `TransitionSeries.Sequence`, `Audio`, `Video`, overlays).
- `TransitionSeries.Overlay` plays an effect over the cut without shortening the timeline (transitions shorten it by their duration; an overlay cannot be adjacent to a transition). `lightLeak({progress, seed, hueShift})` on a `<Solid>` is the ready-made overlay; needs `@remotion/effects` and `Config.setChromiumOpenGlRenderer('angle')`.
- Motion blur: `<HtmlInCanvasMotionBlur samples={8} shutterAngle={180}>`; preview needs Chrome 149+ flag; renders need no config.
- `@remotion/rough-notation` (`Highlight, Circle, Underline, StrikeThrough, CrossedOff, Box, Bracket`) with `progress` driven by `interpolate` - ideal for explainer emphasis.
- Captions: `Caption` type, whitespace-sensitive (leading space in each token), `pageBreakAfter`; we already follow this via `createTikTokStyleCaptions`.
- `measureText/fitText/fillTextBox` from `@remotion/layout-utils` (load fonts first, same font props for measuring and rendering) to stop text overflow.
- Audio: keyframed `volume` via `interpolate`, callback volume receives the media-relative frame, `toneFrequency` pitch shift works only in render, not in preview.
- Silence detection: `loudnorm` JSON pass then `silencedetect=noise=<input_thresh>dB:d=0.5`.
- Reuse: this is the repo we already vendor; text can be quoted internally under the Remotion License; code is documentation-grade snippets.

### 2.2 haidrrrry/claude-remotion-skill - best single craft skill

259 stars, MIT, last commit 2026-08-12. Contents: `remotion-motion-graphics/SKILL.md`, `references/design-rules.md` (84 lines), `references/motion-patterns.md` (246 lines, 17 patterns), `assets/theme.ts` (32 lines), examples (focus-cat promo etc.), SFX/track synth scripts, a pre-built `.skill` archive and demo mp4s (not opened; binary).

Quality: the most useful of the community skills for "premium look" because it encodes taste as testable rules and ships a pre-delivery checklist. It is written for product reels but transfers well. Weakness: dark-tech and warm palettes only; glow guidance conflicts with the "restraint" school (remocn).

Rules to adopt:
- No linear easing anywhere; every entrance prefers spring or bezier; clamp always.
- Entrances animate 2-3 properties together (opacity + translateY ~40px + scale 0.94 to 1); a lone fade is not allowed.
- Stagger everything: 3 frames for words, 4-5 for cards/list items, 6 for big blocks.
- Exits exist and are faster than entrances (about 10 frames versus 20).
- Five-layer scene stack bottom to top: background mesh, assets, graphics/type, colour grade, grain + vignette. Never a flat solid background.
- Every still gets a Ken Burns (1 to 1.08-1.1 scale plus small pan; alternate zoom in/out between shots).
- Idle elements "breathe": about 1.5% sin-wave scale or 3px float when on screen longer than 2s.
- Holds are a design tool: at least three moments of full stillness per film; scene rhythm is hit, hold 15-20 still frames, build, hit; something moves in the first 15 frames; never more than 90 frames without a new visual element.
- Colour: 60/30/10 (base/surfaces/hero); the hero colour on at most one element per frame; one theme object holds colours, easings and spring presets (`snappy {damping 14, stiffness 160, mass 0.6}`, `smooth {20, 90, 1}`, `bouncy {11, 170, 0.7}`).
- Typography: display face weight 600-800, letter-spacing about -0.03em, line-height 1.05; highlight one word per headline; counters use `tabular-nums`.
- Pixel gaps, not `em`, between large text blocks in flex rows (em resolves against the parent font size).
- Sound design is half of perceived quality: SFX start 2-3 frames before the visual lands; riser into a cut, bass hit on it; music bed about 0.2-0.3 volume and lower under VO; cut on beats (`framesPerBeat = fps*60/BPM`); a synthesised 10-file SFX kit (whooshes, clicks, riser, bass hit, shimmer, tick, pop) is acceptable when assets are missing.
- Verification loop: `remotion still` at several frames, look at each, fix, re-render with `--overwrite`; checklist includes zero linear easing, safe zone, no emoji as icons (they ignore the palette), masters at `--crf 16-17`.
- Reuse: MIT, so patterns and snippets (Entrance, WordReveal, Grain, Grade, Vignette, KenBurns) can be copied; the data-URI SVG grain and mesh-blur background are small and self-contained.

### 2.3 Remocn/remocn (shadcn registry + skill)

1,563 stars, MIT, last push 2026-09-30. About 240 components (registry/remocn: typography reveals, 30-odd transitions, shaders, motion-graphics, UI-block simulators, social cards), plus `skills/remocn/SKILL.md` with `references/anatomy.md` and 9 archetype recipes; craft docs in `content/docs/craft/` (design-defaults, motion-principles, anti-patterns) and guides (music-and-sound, words-on-screen, one-video-three-formats, directing-your-agent, how-a-video-is-built).

Quality: highest-quality library of the lot, with real TransitionPresentation code (`whip-pan`, `push-through`, `focus-pull`, `glitch-cut`, `page-turn`, and shader-based dissolves). Its taste is explicitly anti-slop. Caveats: product-demo oriented (1280x720 canvas assumption), and the skill fetches the live component catalogue from remocn.dev (WebFetch at use time, so network content enters the agent's context - treat as untrusted data). Installation is via `shadcn add`, which we should not run; copy the files by hand.

Rules and patterns to adopt:
- Eight motion principles reduced to rules: anticipation 1-3 frames and at most 110% scale; one focal action per beat; follow-through via stagger 3-6 frames; ease-out for entrances (`Easing.out(Easing.cubic)`) and almost never linear except constant drift; arcs for cursor/gesture paths; subtle secondary motion; vary durations for rhythm; exaggeration capped at 110%.
- Design defaults for text you add: no decorative letter-spacing, no ALL-CAPS by default, no gradient text fills, no coloured glow or shadow blur above about 24px, use a 1px border or small neutral elevation.
- One accent colour per video, used only on the emphasised word, the active number and the CTA.
- Product-demo anatomy (hook, positioning, reveal, features, proof, CTA) and a one-line test: "X has problem Y; here is the solution, proof, how to get it" - if it reads as a feature list it is slop.
- Words-on-screen: six words or fewer per line, one idea per beat, a text beat lives about two seconds, verbs over adjectives, concrete numbers.
- Anti-patterns: under-budgeting a Sequence (clips the motion), animating `top/left/width/height` instead of transform, `Math.random()` (use `@remotion/random` seeded), fonts loaded mid-render, everything entering on one frame, text trembling under a slow zoom (promote one `will-change: transform` layer per text container, never per character).
- Code worth porting (MIT): `whip-pan` presentation - translate 110% on an `Easing.bezier(0.7,0,0.2,1)` curve, horizontal stretch of `1 + 0.12*sin(pi*t)`, blur of `sin(pi*t) * 24px`; takes `TransitionPresentationComponentProps`, so it drops straight into our `presentationByName` switch in `profile.ts`.
- Reuse: MIT, code can be copied with the licence notice.

### 2.4 digitalsamba/claude-code-video-toolkit

2,164 stars, MIT, last commit 2026-10-02. 622 files: 12 skills (acestep, elevenlabs, ffmpeg, frontend-design, ideogram4, ltx2, moviepy, playwright-recording, qwen-edit, remotion, remotion-official, runpod), `lib/transitions/presentations/` (glitch, rgb-split, zoom-blur, light-leak, clock-wipe, pixelate, checkerboard; 123-288 lines each), `lib/components/` (AnimatedBackground, FilmGrain, Vignette, SplitScreen, LogoWatermark, ...), project templates (product-demo, sprint-review) and a Python/moviepy `concept-explainer-short` template plus a `sky-blue-short` example.

Quality: good transition library, mediocre aesthetics (generic floating-shapes backgrounds), and the vertical-explainer template is not Remotion at all (moviepy, narration-driven, uses cloud GPU TTS/video models). The bundled `remotion-official` is a stale snapshot of the official skills (we have a newer vendored copy).

Useful, concrete ideas:
- Transition duration guide: quick cut 15-20 frames, standard 30-45, dramatic 50-60, glitch 20-30 (should feel sudden), light leak 45-60 (needs time to sweep).
- Pacing math for the short template: narration seconds is roughly words / 2.4; hook setup under 3 seconds; alternate text-bearing cards and atmospheric motion so a pattern interrupt lands about every 15 seconds; force-align the *script* words onto whisper timing so burned captions are word-perfect (never burn whisper's own text) - same principle as our own word timing.
- `FilmGrain` via SVG `feTurbulence` with per-frame seed and `mixBlendMode: overlay`, opacity about 0.05.
- Reuse: MIT, copy-able. Skip the runpod/modal/ElevenLabs tooling (needs API keys, cloud spend).

### 2.5 video-shotcraft (Vincentwei1021)

10,288 stars, Apache-2.0 per GitHub API (README states commercial use is free; note the audio assets carry their own licences), last commit 2026-09-29. SKILL.md (about 20 KB, Chinese), 157 shot recipe cards with demo TSX (camera, typography, transition, data, rhythm, opening, outro, ui-entrance, effects), a finished promo template, `assets/lib` components (PageCam 2.5D camera, DigitRoll, FlashCut, Caption, VerticalTicker, helpers), 149 categorised SFX + 5 BGM, 6-phase pipeline, and judgement-case rules (`references/aesthetic-rules.md`, `sound-design.md`, `music-beat-sync.md`, `final-review.md`).

Quality: the strongest process and taste documentation I found, built from real revision rounds ("case law"): every rule has a precedent and a self-check question. It is aimed at web-product promos, Chinese-first, and heavy (agent-orchestrated multi-hour pipeline). Treat it as a rule source, not a pipeline to adopt.

Rules to adopt:
- R1 let key information breathe: hold at least 1s after a key element settles, brand wordmark 1s. R3 default to slower: opening hero action at least 3s; every revision round of feedback in their history asked for slower, never faster; budget hold frames up front.
- R2 speed comes from acceleration, not constant speed; batch entrances should accelerate then rest 0.5s.
- R4 beat-sync is about timing, not amplitude: whole-frame beat hits (scale pump, shake, flash) no more than 3 per film, otherwise motion looks jittery under music.
- Q3 no handheld shake on clean UI/diagram films. Q4 sparkle/glint effects sparingly, once per hero element, clipped to border-radius. Q5 opening = one hero with a full arc. Q6 tilt cameras only on narrative shots; keep text-heavy shots square-on.
- Q11 minimum readable text: subtitles at least 56px (about 5% of frame height) on a 1080p frame, secondary text at least 32px, measured in final pixels after ancestor scale; test by shrinking a frame to 480px wide.
- Sound: BGM in with 1s fade and out with about 1.7s fade, level around 0.34 for a beat-driven bed; SFX are a declarative table `{from, src, volume}[]` with a comment per hit; typical SFX volume 0.2-0.6, loudest for the key hit, descending steps for repeated hits (0.40 to 0.25); the `volume` prop is a multiplier, not a target, quiet samples need gain or pre-normalisation (`loudnorm=I=-16:TP=-1.5`), preview clamps volume to 1.0 while render honours values above 1, so always check the rendered peak with `volumedetect`; compensate for sample latency (their heaviest hit was 0.27s late and read as out of sync); SFX vocabulary for product films: whoosh (camera), impact (landing), riser (build), sparkle (light), transition - avoid game-like UI blips.
- Deliver two renders when music is used (with and without BGM, SFX kept) from one timeline via an input prop.
- Final review is done by a clean-context sub-agent, never the maker (our OMC rule says the same).
- Deterministic randomness only (seeded mulberry32), no `Date.now()`.
- Risks (see section 4): the skill makes the agent promote the author's social accounts and a showcase page at the end of each run, auto-starts a dev-server "workbench", and its audio ATTRIBUTION file admits several files have untraceable origins (check licence before commercial use). Reuse: Apache-2.0 for code; audio only after checking each licence.

### 2.6 Vincentwei1021/anything2explainer

2,233 stars, licence: custom noncommercial (commercial use needs author permission), last push 2026-09-18. A topic-to-narrated-explainer skill with a Remotion 4 template (`src/common`: fog, starfield, dot-field, glitch, subtitle, progress bar, text fit, timeline), 11 reference documents, 44-shot sample (RAG), QC reports and Python checkers (`frame_metrics.py`, `motion_check.py`, `selfcheck.py`).

Quality: closest in intent to what we do (narrated technical explainer), with unusually rigorous quantified QC. But the look is a fixed black-background "MG" style (author credits a Douyin creator for the visual language), and the licence forbids commercial use without permission. By default its end card says "built by Anything2Explainer skill". Use for ideas only.

Ideas to take (no code):
- Four hard checkpoints where the agent must stop and ask the user: length and language, narration text, TTS voice, first-30-second preview. Cheap insurance against rework.
- Narration/pacing: Chinese about 5.5 characters/s and English about 2.9 words/s with real density about 2.1 words/s, so plan about 125 words per minute with 5-8% extra for holds; a table of words, shots and chapters per runtime.
- One recurring worked example across the whole film; facts on screen must trace to a research document with a source URL; example data labelled "illustrative".
- Motion vocabulary with frame budgets: default text entrance 8 frames (ease-out, 10px rise); glitch-in at most once per shot and only for the key term; slide-up entrance 22 frames with offset no more than 120px; scale-in about 21 frames; stagger 2 frames; zero-out exits of 6-12 frames before a hard cut; camera push 30-45 frames easeInOut with at least 30 frames of stillness afterwards; at least 3 camera moves per chapter; a 3-layer parallax at different speeds for "many" or "big world".
- Subtitle band and progress bar get a reserved safe band; entrance paths must not cross it.
- Shot granularity: split by visual unit, not by sentence; a shot is at least 120 frames; carry elements across shots instead of clearing the stage.
- Frame metrics: measure the largest object height per shot (hero at least 170px), longest static stretch (over 3 s is a defect), and settle time.

### 2.7 iart-ai packs (explainer-video, data-animation, tiktok-video, kinetic-typography)

`iart-ai/motion-skills` (695 stars, MIT) is only an index (README + showcase + verify scripts); the actual skills live in 17 separate pack repos (3-46 stars each, MIT, all last pushed 2026-06-22). I read: explainer-video SKILL, chart-animation SKILL, caption-animation SKILL, short-form-video SKILL + `retention-pacing.md`, kinetic-typography SKILL. Each ships small `scripts/` (`contact-sheet.sh`, `probe-mp4.sh`, `seek-shot.sh`) for a render-stills-inspect loop; I did not run them.

Quality: tidy, pedagogical, accurate on Remotion basics, less opinionated about look. Some code is GSAP/CSS rather than Remotion-native. Best on process and numbers.

Rules and numbers to adopt:
- Explainer arc and budget: problem 20%, solution 15%, how it works 45%, payoff 20%; narration 2.3 words/s, scene seconds = words / 2.3 + 0.4 breathing; a scene without VO still needs at least 1.0s; "how it works" is the slowest section, hold each step long enough to read; one core idea sentence, one analogy for the whole film; script first, visuals illustrate the spoken line, never lead it.
- Shorts: open a loop in the first 3 seconds and close it last; hook text on screen on frame 1 and no fade-up from black; visual change every 2-4 s with uneven intervals (a metronome reads as boredom); loop by matching the last frame to the first; punch-in as a cheap pattern interrupt (spring damping about 12-13, stiffness 200-220, scale to 1.10-1.12).
- 9:16 safe areas on 1080x1920: central 900x1400, keep about 120px clear at top and right, about 320px at the bottom. (Our `Progress` bar sits at `top: 70` and captions default to `bottom: 200-480`: the progress bar is inside the top 120px band that platform UI covers.)
- Captions: word-level timing (never evenly split a line); 1-4 words per page; `combineTokensWithinMilliseconds` 200-500 for true word-by-word, 800-1500 for short phrases; bold sans with a 2-6px outline plus soft shadow; size 56-80px on 1080 wide, minimum 45px; highlight one accent colour or a box behind the active word, never colour every word; per-word spring `damping 12, mass 0.6`.
- Chart animation: every value from the frame; ease the value itself (ease-out cubic for count-ups, spring for rank swaps); round before formatting and use `tabular-nums` and `Intl.NumberFormat`; keep d3 only for `scaleLinear/scaleBand`; hold the first frame 1-1.5s so axes can be read, 0.3-0.6s per data row, +0.5-1s slow-down on the highlighted moment, hold final state 2-3s; reveal one series at a time; always show a value label, a time indicator and units once.
- Kinetic type: static typography first (display line-height 1.1-1.2, tracking -1% to -3%); mask/clip reveal (overflow hidden, text rises from 110%) is the most robust premium reveal; stagger lines 60-100ms, words 40-70ms, characters 20-40ms; total reveal about 800ms; split by line for calm/premium, by word for energy, by character only for short strings; keep an accessible label on split text.
- Reuse: MIT; mostly ideas plus short Remotion snippets.

### 2.8 Liamrjohnston/remotion-motion-graphics-skill

80 stars, MIT, last commit 2026-07-23. Four skills (motion-graphics, cinematic-camera, article-highlights, terminal-inserts), logo library, approved reference MP4s with contact sheets, and a Node "gate" script (`promptible-gate.mjs`, dense minified-style JS) that blocks writing code until research, reference selection and an independent critic pass are recorded.

Quality: unusual and valuable process: reference-driven (compare against approved renders), independent visual critic that must return JSON, and a rejected-patterns list. Extremely restrictive aesthetics (warm light surfaces, zero glow, no gradients, no fake dashboards) and tied to Instagram inserts. Heavy: 4:3 or 9:16 only.

Ideas to take:
- Camera rig: one world larger than the viewport, one shared keyframed timeline for focal x, focal y and zoom with `Easing.inOut(Easing.cubic)`, open tight on the action, hold while it completes, reveal context, travel to the payoff, settle.
- Motion must reveal causality, scale, replacement, navigation or state change; a slow zoom as the only camera idea is rejected; avoid disconnected cards floating in a void.
- Never recreate a real logo from memory; use supplied SVG/PNG; no invented metrics.
- Independent critic stage with a JSON verdict and a hard stop if independent review cannot run.
- Risks: README promotes `curl ... | bash` for installation; `install.sh` itself runs `npx create-video@latest` and `npx -y skills add` (pulls third-party code). I did not run either. The gate script performs file and hash checks and validates https URLs and SVG safety by my grep (imports are only `fs, path, crypto, url`), but it is one-line dense code I did not fully audit.

### 2.9 av/remotion-bits (library, npm `remotion-bits`)

484 stars, MIT, v0.2.1 (pre-1.0), last commit 2026-09-15. Components: `AnimatedText` (split by word/char/line, stagger, blur, colour interpolation), `AnimatedCounter`, `TypeWriter`, `CodeBlock`, `MatrixRain`, `StaggeredMotion`, `GradientTransition`, `ParticleSystem` (spawner/behaviours), `Scene3D` with steps; a CLI and MCP server for discovery (`npx remotion-bits mcp`). Quality: decent building blocks, API changing, documented via a gallery. Adoption path: copy individual patterns (particle simulator, gradient transition) rather than add the dependency or run its MCP via `npx`. Not affiliated with Remotion.

### 2.10 Remaining reviewed items (shorter)

- wshuyi/remotion-video-skill (386): a generic Chinese-language Remotion tutorial skill (core concepts, project layout, basic interpolate/spring) with MiniMax/Edge TTS scripts. Little beyond what the official skill covers; no stated licence. Not recommended.
- AgriciDaniel/claude-shorts (217, MIT): Shorts pipeline with three caption presets, hook overlay, progress bar, bundle-once-render-many (`bundle()` once, `openBrowser()` shared, `selectComposition()` before every `renderMedia()`), CSS reframing of `OffthreadVideo` instead of FFmpeg re-encode. Caption specs: Bold style Montserrat 800, 72px, uppercase, 2-3 words/page, yellow active word, spring `{mass 1, damping 12, stiffness 200}`; Bounce style Bangers 84px with rotating colours and spring `{8, 180}` overshoot about 1.2. Useful spring-damping guide: under 10 visible bounce, 10-15 slight professional overshoot, over 20 none, stiffness over 150 snappy. Its install.sh was not read in full (grep showed no curl-pipe pattern).
- DojoCodingLabs/remotion-superpowers (128, MIT): plugin whose `.mcp.json` registers five MCP servers launched with `npx -y` / `uvx` (remotion-media-mcp, elevenlabs-mcp, twelvelabs-mcp, pexels-mcp-server, mcp-remote to replicate.com) using API keys, plus hooks. Do not install (supply-chain and key exposure). Its rule files (animation-presets, captions-workflow, audio-integration, data-visualization) were listed but not read.
- howseen-ai/claude-motion-design (260, MIT): HTML + Playwright + ffmpeg, not Remotion; includes a client for the 21st.dev MCP that reads an API key from env or `~/.config/21st.key`. Not relevant to our renderer.
- charlie947/motion-graphics-skills (72, MIT): 13 skills that output a single looping HTML file driven by `window.seek(seconds)` and export through HeyGen HyperFrames; not Remotion. Good prompts about brand tokens and checks (frame 0 equals frame 8 for loops, load fonts before the first frame, label made-up numbers "illustrative", a vox-style explainer recipe with stepped "motion on twos" and per-fact sourcing), but not applicable code.
- Official Remotion templates (names only): `template-tiktok` (Whisper.cpp TikTok captions), `template-audiogram`, `template-prompt-to-motion-graphics-saas`, `template-code-hike` (code snippet animation), `template-prompt-to-video`. Worth reading `template-tiktok` for caption layout and `template-audiogram` for audio-reactive layout; I did not review them.

---

## 3. What to adopt - prioritised

Priority = visual impact on our 1080x1920 and 1920x1080 explainers per hour of work. "Idea" = rule only; "Code" = licensed for copy (MIT/Apache with notice) or standard Remotion API.

### P0 - do first (high impact, low effort)

1. **Replace `linearTiming` for scene transitions with eased timing** (`Episode.tsx` currently uses `linearTiming({durationInFrames: tr})` for every cut). Use `springTiming({config:{damping:200}, durationInFrames: 18-24})` or a bezier-based timing; durations by type: standard 20-30, hard/glitch 15-20, light leak 45-60. Source: official transitions.md, toolkit duration table, haidrrrry. Code: official API.
2. **Add 3-4 custom presentations** to `presentationByName` in `profile.ts`: `whip-pan` (remocn, MIT - the cleanest code found), `zoom-blur` and `light-leak` (toolkit, MIT; or the official `lightLeak` in a `TransitionSeries.Overlay`, which needs `@remotion/effects` plus the ANGLE GL flag). Map them to profile beats in the `transitions` object (e.g. hook gets whip, term cards get push). Code: MIT, keep notices.
3. **Entrance/exit grammar helper** (one shared `Entrance`/`useEnter` used by all scenes in `NewScenes.tsx`, `OrbitScene.tsx`, `Scenes.tsx`): opacity + 40px rise + 0.94 scale, spring or `Easing.bezier(0.16,1,0.3,1)`, `output:'perceptual-scale'`, stagger 3-6 frames, exits about half as long. Currently only 9 `spring(` calls across all scene files. Idea plus official API.
4. **Move spring/easing/colour presets into the profile JSON** (a `motion` block: `ease.out/inOut/in`, `spring.snappy/smooth/bouncy`) so each profile reads as one coherent system. Pattern from haidrrrry `theme.ts`, official bezier values.
5. **Safe-area audit**: official minimums (80px sides, 100px top/bottom, headline at least 84px, support at least 44px at 1080 wide) plus iart platform bands (top about 120, right about 120, bottom about 320 in 9:16). Concrete finding: `Progress` is at `top: 70` (inside the platform-UI band). Add a dev-only safe-zone overlay and a frame check to `verify.py`. Idea.
6. **Stills-based self-review loop** (render frames at hook, mid-scene holds and final frame, contact sheet, `ffprobe` check) and an **independent critic pass** with a JSON verdict (Liam's `visual-critic` + shotcraft `final-review`, haidrrrry checklist). Fits our `verifier` rule; extend `verify.py` rather than adopt any external script. Idea.

### P1 - next (clear gains, moderate work)

7. **Audio mix discipline** (shotcraft + haidrrrry): SFX table `{from, src, volume}[]` with per-hit comments; SFX leading the visual by 2-3 frames (ours currently starts `sc.from - 2`, good); descending volumes for repeated hits; BGM fade in about 1s and out about 1.7s; music bed 0.2-0.3 and ducked under VO (we have `musicDuck`); measure the rendered peak and loudness (`volumedetect`, `loudnorm`) rather than trusting the multiplier; produce a no-BGM render variant. Idea; `@remotion/sfx` already installed.
8. **Text emphasis with `@remotion/rough-notation`** (Highlight/Circle/Underline/Box) for key terms in explainer scenes, driven by `interpolate`. Official API; requires adding the package (matches Remotion version).
9. **Caption tuning**: expose `combineTokensWithinMilliseconds` (200-500 word-by-word for Shorts, 800-1500 for explainers) and spring damping 10-15 in the profile `captions` block; enforce minimum sizes (56px+ on 1080p captions, shotcraft Q11) and one accent for the active word. We already use `createTikTokStyleCaptions` and the sticker/clean variants.
10. **Chart/number scenes**: ease the value, round before format, `tabular-nums`, scale via d3-scale or a small helper, hold first frame 1-1.5s and last 2-3s, 0.3-0.6s per data row, slow down 0.5-1s on the key moment (iart chart-animation, haidrrrry counter spring `damping 30, stiffness 60`). Applies to `NumberScene`/`CompareScene`.
11. **Camera/scene motion budget**: one shared keyframed camera per scene (Liam rig), at least 3 camera moves per chapter, 30-45 frames easeInOut, at least 30 still frames after a push, no handheld shake, whole-frame beat hits at most 3 per film. Idea; we already have `zoom` and `punch` per beat in profiles - add the caps.
12. **Explainer planning rules for the `episode` skill**: 20/15/45/20 runtime split, words/2.3 + 0.4s scene length, one analogy, VO-first, line length at most 6 words on screen, text beat about 2s, hook text on frame 1, loop-friendly endings, checkpoints before expensive generation (anything2explainer). Idea.

### P2 - polish and later

13. **Layer stack**: grade + grain + vignette on top of every scene (we have `grade` and vignette; add animated SVG grain at 0.04-0.05 opacity, optionally `@remotion/effects` `noise/vignette`), Ken Burns on every still alternating direction, idle breathing 1.5% on anything on screen over 2s, 2-3 layer parallax.
14. **Motion blur** on fast whips and zooms: `HtmlInCanvasMotionBlur` (needs Chrome with HTML-in-canvas for preview, renders without config per official note) or `Trail` from `@remotion/motion-blur`. Test render time and Chromium compatibility on our machine first (unverified).
15. **`premountFor={fps}`** on `TransitionSeries.Sequence`, `Audio` and timed overlays (official rule). Low effort, preview-only benefit, may also reduce first-frame media hiccups.
16. **Variety within a profile** (remocn "vibe" idea): pick one visual dialect per episode (smooth, paper/stepped using `posterize: 3`, tech) and avoid mixing; one accent per film for editorial profiles (conflicts with our `explainer-bold` palette of lime + blue - decide per profile).
17. **Bundle-once-render-many** and `selectComposition()` before `renderMedia()` for batch episodes (claude-shorts). Only if we render several episodes per run.
18. **Text-fit safety**: `@remotion/layout-utils` `fitText/fillTextBox` for term cards in `NewScenes.tsx` to eliminate overflow before render.

### Style conflicts to decide consciously
- remocn/Liam say: sentence case, no glow, no gradient text, restrained shadows, one accent. haidrrrry and anything2explainer allow a single hero glow, and claude-shorts uses uppercase + heavy outline captions. Our `explainer-bold` (neon lime + blue, sticker captions) and `explainer-clean` profiles map naturally to the two schools; apply the restraint rules to the clean/adult-audience profiles and the hero-glow rule to bold.

---

## 4. Risks and not recommended

Not recommended to install or run as-is:
- **DojoCodingLabs/remotion-superpowers**: auto-registers five MCP servers via `npx -y`/`uvx`/`mcp-remote`, needs several third-party API keys, plus hooks. Violates our "no new MCP servers" posture. Ideas only.
- **calesthio/OpenMontage** (AGPL-3.0): very large multi-provider system; AGPL is incompatible with copying code into our pipeline without licence implications. See `06-openmontage.md`.
- **anything2explainer** and **video-talkcraft** (custom licence, noncommercial or permission-based): ideas only; the former embeds a default "built by Anything2Explainer skill" end-card credit and copies the style of a named Douyin creator. If we monetise the channel, treat as unusable for code.
- **guizang-product-video-skill**: AGPL-3.0 + BUSL assets; GSAP/Three based. Skip.
- **video-shotcraft as a pipeline**: the SKILL instructs the agent to promote the author's social accounts and a showcase page after delivery, auto-starts a dev-server workbench, offers a Jianying export requiring `pip install`, and is Chinese-first and heavy. Audio assets: its own ATTRIBUTION notes some files have unknown origin, so check licences before commercial publishing. Use only as a rulebook.
- **Liam's `install.sh`/README one-liner**: `curl ... | bash` and `npx -y skills add` pull remote code. Do not run; copy rules by hand. The minified `promptible-gate.mjs` was not fully audited.
- **remotion-bits**: pre-1.0 API and an `npx` MCP server; borrow ideas not the dependency.
- **charlie947 / howseen-ai / iart GSAP snippets**: not Remotion; frame-exact via `window.seek`/Playwright; adapting costs more than it gives. howseen's `mcp21_client.py` reads an API key from a local file.
- **wshuyi/remotion-video-skill**: nothing the official skill does not cover better; no licence stated.

General cautions:
- Remotion itself is under the Remotion License (free for individuals and small companies; larger for-profits need a company licence). The official skills repo has no standalone licence file.
- Community skills often make claims ("production-quality", "premium") that I could not verify by watching output; several ship demo MP4s that I did not open.
- Some skills fetch content at use time (remocn pulls its catalogue from remocn.dev; others ask the agent to browse). Treat fetched text as untrusted data and keep fetches to the vendor's own docs.
- Static grep is not an audit. For any code we copy (transition presentations, grain, entrance helper), read it line by line and run it only in our own composition.
- Rules from video-shotcraft come from a specific product-promo context; its "always slower" bias may overshoot for fast Shorts. Calibrate by watching renders.

---

## 5. Suggested next steps for the pipeline owner

1. Implement P0 items 1-4 as one change in `Episode.tsx`, `profile.ts`, `NewScenes.tsx` and the profile JSON schema (add the `motion` block), then render ep02 and ep03 stills before and after for comparison.
2. Port `whip-pan` and `zoom-blur`, plus the official `lightLeak` overlay, behind new names in `presentationByName`.
3. Extend `verify.py` with: safe-zone check (progress bar position), minimum text size (captions and term cards), contact-sheet output, and a `volumedetect` peak report.
4. Evaluate adding `@remotion/effects`, `@remotion/rough-notation`, `@remotion/motion-blur`, `@remotion/layout-utils` (all exist in the vendored monorepo at 4.0.532 but are not in `remotion-app/package.json`); test render time with ANGLE GL before committing.
5. Keep the official vendored skill as API ground truth; add a short "taste rules" file under `video-pipeline/direction/` distilled from section 3 (paraphrased, no copied text).
