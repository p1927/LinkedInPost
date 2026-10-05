# 10 - Video design skills, prompt packs and a concrete design system

Researched 2026-10-05. Stars, push dates and licences come from `gh api repos/OWNER/REPO` on that date unless marked otherwise. Skills.sh install counts come from a WebFetch of https://skills.sh on 2026-10-05 (a summarising fetch, so treat as approximate). Eight repos were shallow-cloned read-only into `/private/tmp/claude-501/-Users-pratyushmishra-Documents-GitHub-LinkedInPost/43ce9c99-cf36-4d0b-bc14-75dffd3988e1/scratchpad/skills-b/`. No install, setup or postinstall script was run; no MCP server added.

Companion to `08-agent-skills-for-video.md` (which covers the Remotion/Manim/YouTube skills; this doc does not repeat that review).

## 0. Honest limits of this research

- GitHub search hit the API rate limit partway, so the candidate list is not exhaustive (design-taste/animation/sound/colour-grading queries were not completed). skills.sh and Smithery pages were reached only via summarising fetches; claudemarketplaces and Reddit/X/HN were not searched.
- "Read every file" was achieved only for the small skills (remotion-dev/skills Remotion rule files that matter here, Barty-Bart/motion-graphics SKILL + engine API, emilkowalski/skill's two key skills, design-motion-principles SKILL + cookbook). For OpenMontage (2,143 files), hyperframes, charlie947 (13 skills), ui-ux-pro-max (681 files) and anthropics/skills I read the relevant subset only (listed per candidate) and grep-scanned the rest for risky commands.
- No skill I found contains a Kurzgesagt/Vox/3Blue1Brown/Ali Abdaal *pacing* analysis. Pacing numbers below are mostly my judgment plus one playbook's hold times. Easing.net and Material 3 values: easings.net page gave no numbers via fetch (the numbers below match what OpenMontage's typography skill cites from easings.net, and Remotion's own `timing.md`); Material 3 values come from a secondary search result, not m3.material.io directly.
- `docs/research/video/` already held docs 01-08 and I did not read 01-07, so some overlap with those is possible.

## 1. Candidate table (sorted by stars, seen 2026-10-05)

| # | Name | URL | Stars | Last push | Licence | Installs (skills.sh) | Direct Remotion use? |
|---|---|---|---|---|---|---|---|
| 1 | anthropics/skills (frontend-design, canvas-design, theme-factory, algorithmic-art, slack-gif-creator, ...) | https://github.com/anthropics/skills | 179,649 | 2026-10-03 | Apache-2.0 per files (GitHub API says none) | frontend-design 953.8K | Indirect: design thinking, not video |
| 2 | nextlevelbuilder/ui-ux-pro-max-skill | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | 133,034 | 2026-10-03 | MIT | n/a | Indirect: CSV data (colours, font pairs, motion) is usable as lookup |
| 3 | leonxlnx/taste-skill (design-taste-frontend, high-end-visual-design) | https://github.com/leonxlnx/taste-skill | 92,592 | 2026-09-26 | MIT | 562.3K / 409.6K | Not reviewed; web UI taste, not video |
| 4 | pbakaus/impeccable | https://github.com/pbakaus/impeccable | 76,248 | 2026-10-04 | Apache-2.0 | n/a | Not reviewed; UI design commands |
| 5 | calesthio/OpenMontage | https://github.com/calesthio/OpenMontage | 63,176 | 2026-10-03 | AGPL-3.0 | n/a | YES for reference: colour-grading, sound-design, typography, explainer-director skills, style playbooks |
| 6 | remotion-dev/remotion (+ skills inside) | https://github.com/remotion-dev/remotion | 61,857 | 2026-10-04 | Remotion License (NOASSERTION) | n/a | Core engine |
| 7 | heygen-com/hyperframes | https://github.com/heygen-com/hyperframes | 56,743 | 2026-10-04 | Apache-2.0 | hyperframes 763.0K, -animation 646.8K, -creative 617.7K, -cli 795.8K, motion-graphics 346.7K | Concepts yes (motion doctrine, caption rules, audio mix); code no (HTML/GSAP framework, not Remotion) |
| 8 | emilkowalski/skill | https://github.com/emilkowalski/skill | 43,324 | 2026-10-02 | MIT | n/a | Principles transfer; code is CSS/Framer |
| 9 | remotion-dev/skills | https://github.com/remotion-dev/skills | 4,841 | 2026-10-01 | none declared | remotion-best-practices 572.5K | YES, official |
| 10 | kylezantos/design-motion-principles | https://github.com/kylezantos/design-motion-principles | 1,211 | 2026-05-30 | see LICENSE in repo (not checked) | n/a | Principles + anti-slop checklist; says it applies to video loosely |
| 11 | raphaelsalaja/userinterface-wiki | https://github.com/raphaelsalaja/userinterface-wiki | 902 | 2026-07-29 | MIT | n/a | Not reviewed |
| 12 | kapishdima/soundcn | https://github.com/kapishdima/soundcn | 847 | 2026-06-09 | MIT | n/a | SFX asset source named by Remotion's sfx rule; not reviewed |
| 13 | Barty-Bart/motion-graphics (motion-broll) | https://github.com/Barty-Bart/motion-graphics | 414 | 2026-09-25 | MIT per README (API: NOASSERTION) | n/a | Concepts yes (spring maths, palette); code no (Playwright+ffmpeg) |
| 14 | haidrrrry/claude-remotion-skill | https://github.com/haidrrrry/claude-remotion-skill | 259 | 2026-08-12 | MIT | n/a | Remotion; not reviewed |
| 15 | buainoai/remotion-skills | https://github.com/buainoai/remotion-skills | 116 | 2026-01-30 | not checked | n/a | Chinese-language mirror-ish; not reviewed |
| 16 | Liamrjohnston/remotion-motion-graphics-skill | https://github.com/Liamrjohnston/remotion-motion-graphics-skill | 80 | 2026-07-24 | MIT | n/a | Remotion; not reviewed |
| 17 | charlie947/motion-graphics-skills | https://github.com/charlie947/motion-graphics-skills | 72 | 2026-09-30 | MIT | n/a | Single-HTML-file output, not Remotion; rules transfer |
| 18 | BusyBee3333/animated-explainer-skills | https://github.com/BusyBee3333/animated-explainer-skills | 6 | 2026-07-13 | MIT | n/a | "Kurzgesagt-quality" claim; GSAP/HTML; too small to trust; not reviewed |

Also seen on the skills.sh leaderboard but not reviewed: `ai-video-generation` (101-skills, 660.7K), `video-edit` (prime-skills, 429.1K), `design-mobile-apps` (designed-by-ai, 614.0K).

Reference-only (not skills): easings.net (repo ai/easings.net, 8,698 stars, GPL-3.0); Remotion docs on `interpolate`/`Easing`/`@remotion/transitions`.

Cloned: remotion-skills, anthropic-skills, ui-ux-pro-max-skill, skill (emil), design-motion-principles, motion-graphics (Barty), motion-graphics-skills (charlie947), OpenMontage, hyperframes.

## 2. Per-candidate review

### 2.1 remotion-dev/skills (adopt as the base layer)
Contents: 12 skills; the video-design-relevant files are `remotion-markup/{timing,transitions,light-leaks,text-highlights,motion-blur,sfx,audio,google-fonts,multi-scene-video}.md`, `remotion-create/video-layout.md`, `remotion-captions/*`. Findings I used:
- `timing.md`: use `interpolate` with `Easing.bezier(0.16, 1, 0.3, 1)` (easeOutExpo) as the demonstrated "nice" curve; `Easing.spring({damping: 200})` for "a nice push movement with no bounce"; add `output: 'perceptual-scale'` when animating scale; `posterize: 3` for deliberate low-frame-rate look (useful for a hand-drawn storybook feel).
- `transitions.md`: `TransitionSeries` with `fade`, `slide`, `wipe`, `flip`, `clockWipe`; `springTiming({config:{damping:200}, durationInFrames:25})`; overlays (light leak) do not shorten the timeline; transitions do (60+60-15 = 105).
- `video-layout.md`: "You are designing a video, not a webpage"; keep text >=80px from sides and >=100px from top/bottom at 1080 wide; headline >=84px, supporting >=44px.
- `sfx.md`: hosted whoosh/whip/page-turn/switch/mouse-click/ding at remotion.media; many meme sounds (bruh, vine-boom, windows-xp-error) which we should NOT use for either audience.
- Risk: `scripts/*.ts` are repo-maintenance sync scripts (not read in depth, not run). The skills tell the agent to open Studio and fetch element source from remotion.dev (network fetch at use time). No licence declared on the skills repo.
- Verdict: highest value, lowest risk. Doc 08 already recommends installing it.

### 2.2 OpenMontage skills (mine for numbers, do not adopt the framework)
AGPL-3.0, so do not copy files into our repo; extracting facts and re-expressing them is fine. Read: `skills/creative/sound-design.md`, `creative/typography.md` (first 130 lines), `core/color-grading.md` (first 70 lines), `styles/clean-professional.yaml`, and grep-scanned `pipelines/explainer/*`. Setup is `setup.py`/`Makefile` (`npm install`) - never run.
- Sound: dialogue -16 to -14 LUFS integrated; music bed 18-20 dB under dialogue (cites W3C 20 dB, BBC +4 dB); duck 6-12 dB, up to 22 dB for complex educational topics; whoosh 400-500 ms, start 10-20 ms before the visual; true peak -1.5 dBTP; 48 kHz; cut 2-4 kHz on music for voice clarity; HPF 80 Hz on TTS. Sources it cites: W3C, BBC, platform specs - but I did not open them.
- Typography: 1-2 families, titles 60-90 px at 1080p, subtitles 42+ px, max 32-42 chars/line, 2 lines, reading ~13 cps dwell, easeOutCubic `(0.33,1,0.68,1)` default for entrances, easeInCubic `(0.32,0,0.67,0)` for exits, never linear on text. Vertical safe zone: 900x1400 centered works everywhere; YouTube Shorts 984x1500, top 120, bottom 300.
- Colour: science/educational = `neutral` grade at 1.0; storytelling = `cinematic_warm` 0.85. Applies to footage grading via FFmpeg - mostly irrelevant for our flat vector scenes.
- `clean-professional.yaml`: min scene hold 2.5 s, text card hold 3.5 s, stat card 3.0 s, transition 0.4 s, music volume 0.08, entrance "fade-up with slight scale 0.95->1.0".
- Risk: 2 GB-class repo, AGPL, huge surface of tools that call paid APIs. Reference only.

### 2.3 heygen-com/hyperframes skills (concepts only)
Apache-2.0, 56.7k stars, but it is an HTML/GSAP renderer, not Remotion. Read: `motion-doctrine/SKILL.md`, `hyperframes-audio/SKILL.md` (head), `faceless-explainer/SKILL.md` (head), `embedded-captions/references/{caption-grouping,layout-heuristics}.md`. The skills repeatedly say "run `npx hyperframes skills update` / `auth status`" and call out to HeyGen services - treat as risky to install; fine to read.
Transferable rules:
- Seam law: "How Scene A exits determines how Scene B enters: same axis, same direction, matched speed, cut mid-motion on both sides." Pick one dominant direction for the whole film (house default LEFT = "next beat"); upward = reveal/conclusion; zoom forward = deeper into same thought; reverse zoom = arrival. Never ping-pong consecutive seams. Highly applicable to our TransitionSeries choices.
- Caption grouping: new group at pause >=500 ms, sentence end, comma+pause 250 ms, or max 6 words / 2.5 s; min 2 words and 0.5 s on screen; enter 80 ms before first word.
- Mixing: "a mix is a set of relationships"; carve music under voice rather than only turning it down.

### 2.4 emilkowalski/skill (principles; 43k stars)
MIT. 12 skills; read `emil-design-eng` (key sections) and `animation-vocabulary`. Both begin by forcing a canned first reply ("I'm ready to ...") - harmless but odd prompt-injection-style preamble; not a safety issue. Key content: ease-out custom curves `cubic-bezier(0.23, 1, 0.32, 1)`, ease-in-out `cubic-bezier(0.77, 0, 0.175, 1)`; never ease-in for entrances; UI under 300 ms; button press 100-160 ms; "slow where the user is deciding, fast where the response is" ; origin-aware scaling; never `scale(0)` (start at 0.95 + opacity). UI-centred (frequency gate irrelevant to non-interactive video). Useful as a vocabulary and a "reject linear/ease-in" rule.

### 2.5 kylezantos/design-motion-principles (adopt as audit checklist)
1.2k stars; read SKILL.md, `motion-cookbook.md`, anti-checklist exists (not fully read). Maps project type to designer lens: "Kids app / Educational -> Jakub + Jhey (polish + delight)". Cookbook: enter = opacity 0->1 + translateY ~8px + blur 4->0; exits subtler than enters (-12px fixed); spring `bounce: 0` for professional, `bounce 0.1` for refined, more for kids; bouncy easing not for professional/serious content. Its anti-AI-slop audit idea is the reusable part (run it on a rendered episode's motion spec). Explicitly says video is a looser fit.

### 2.6 anthropics/skills
179k stars. Read `frontend-design/SKILL.md` (first part), listed `theme-factory` (10 preset themes as markdown with hex + font pairs), `canvas-design`, `algorithmic-art`, `slack-gif-creator` (not read in depth). Useful guidance: one or two type families, "clearly distinct" if two; avoid recognisable AI palettes (cream #F4F1EA + serif + terracotta #D97757 is flagged as the Claude-default tell - relevant because our kids palette K1 uses cream; I deliberately shifted hues); motion only to draw attention. Safe (docs only). `theme-factory` themes could seed palettes but are web-oriented.

### 2.7 nextlevelbuilder/ui-ux-pro-max-skill (data mine; already installed locally as a skill)
MIT. `src/ui-ux-pro-max/data/`: `typography.csv` (74 pairings, e.g. #6 Fredoka+Nunito "Children's apps, educational"; #45 Baloo 2+Comic Neue; #41 Crimson Pro+Atkinson Hyperlegible), `colors.csv` (192 palettes with on-colour fields; "Kids Learning" `#2563EB/#F59E0B/#EC4899` on `#EFF6FF`), `motion.csv` (17 GSAP rows with duration/easing tiers, web-only). Risks: bundled Python scripts and a CLI that downloads updates (`cli/src/commands/update.ts`); a `brand` skill with `sync-brand-to-tokens.cjs`. Do not run CLI. Use CSVs as read-only lookup.

### 2.8 Barty-Bart/motion-graphics (concepts: closed-form springs)
414 stars. Read SKILL.md, `reference/engine-api.md`, `scripts/setup.sh` (installs Playwright + Chromium via npm, `pip install numpy --break-system-packages` fallback - flag as an install script; not run). Useful: spring presets as `[omega, zeta]`: MORPH `[15, 0.84]`, FAST `[27, 0.86]`, SLOW `[12.5, 0.9]`, SOFT `[10, 0.95]`, CAM `[7.5, 1]`; leading and trailing edges ride different springs so indicators "stretch"; "banned: bouncy easing, particles, glows, gradients on UI chrome, dead time"; pace one change per spoken beat, 0.4-1.2 s apart; never invent numbers (matches our fact-sourcing rule). Palette default canvas #E9E7E2, ink #0B0B0B, accent #FF5A1F. Renders with a 180-degree shutter by sub-frame blending - same idea as Remotion's `HtmlInCanvasMotionBlur` (`shutterAngle` 180 default).

### 2.9 charlie947/motion-graphics-skills
13 skills (vox-explainer, animated-chart, motion-effects, launch-video, ...). I read only `vox-explainer/SKILL.md`. Useful review rules: "Sound is not optional", cards/images not single lines, symmetrical grids, "first surprise within 5 seconds", "every spoken fact gets a source", last shot is a takeaway of five words or fewer, 8-14 shots for 30-60 s. Its Vox look (stepped motion "on twos", halftone, torn paper) is a stylised option, not our default. Output is single-file HTML, not Remotion. `validate-skills.sh` not run.

### 2.10 Not reviewed (listed so nobody assumes they were)
taste-skill, impeccable, userinterface-wiki, soundcn, haidrrrry/claude-remotion-skill, Liamrjohnston/remotion-motion-graphics-skill, buainoai/remotion-skills, BusyBee3333/animated-explainer-skills, Lottie/Rive guidance, Apple HIG motion, Kurzgesagt breakdowns (a search only returned generic summaries: "rounded shapes and vibrant colors", "high-contrast and vibrant", vector-based, infinite-zoom transitions - low-quality sources, so I did not build rules on them).

## 3. Design system recommendation

Canvas 1920x1080 (16:9) and 1080x1920 (9:16), 30 fps. All contrast ratios are WCAG 2.x relative-luminance ratios I computed (script in scratchpad, formula standard). Thresholds: 4.5:1 normal text, 3:1 large text/graphics.

### 3.1 Palettes

Kids storybook (audience A):

| Name | Role | Hex | Contrast vs its background |
|---|---|---|---|
| K1 "Sunny Meadow" | bg | #FFF6E5 | - |
| | text ink | #2B2D42 | 12.57 |
| | primary (coral, shapes + big titles) | #E5484D | 3.65 (large only) |
| | secondary (teal, shapes) | #0E8A7D | 3.95 (large only) |
| | text accent (burnt orange) | #B45309 | 4.68 |
| | fills only: #FF6B6B (2.59), #4ECDC4 (1.80), #FFD166 (1.34) | | never text on cream; put #2B2D42 on them (9.36 on #FFD166) |
| K2 "Twilight Story" (night/space/sleep topics) | bg | #1F2A55 | - |
| | text | #FFF8E7 | 13.04 |
| | star yellow | #FFC857 | 8.98 |
| | sky cyan | #7BDFF2 | 9.00 |
| | rose | #F7A8C4 | 7.47 |
| K3 "Paper & Crayon" (hand-drawn look) | bg | #F7EFE2 | - |
| | text | #3D2C2E | 11.51 |
| | orange-red | #C2410C | 4.54 |
| | blue | #1D6F94 | 4.90 |
| | green | #4D7C0F | 4.38 (fails 4.5; large/shape only) |
| | crayon yellow fill | #F3A712 | 1.78 (fill only) |

Curious-adult clean explainer (audience B):

| Name | Role | Hex | Contrast |
|---|---|---|---|
| A1 "Ink & Signal" (default, dark) | bg | #0F1B2D | - |
| | text | #F4F7FB | 16.09 |
| | cyan highlight | #4CC9F0 | 8.99 |
| | amber (numbers/emphasis) | #FFB703 | 9.90 |
| | orange alert | #FF7A45 | 6.68 |
| | muted label | #8A99AD | 5.96 |
| A2 "Paper Clean" (light) | bg | #FAFAF7 | - |
| | text | #14213D | 15.28 |
| | blue | #2563EB | 4.94 |
| | amber text | #B45309 | 4.80 |
| | teal | #0F766E | 5.23 |
| | muted | #5B6577 | 5.62 |
| A3 "Deep Space" (science/space) | bg | #1A1033 | - |
| | text | #FFFFFF | 18.01 |
| | coral | #FF6B6B | 6.49 |
| | yellow | #FFD93D | 13.08 |
| | green | #6BCB77 | 8.95 |
| | lavender muted | #B9A8E0 | 8.35 |

Text on filled chips: ink #2B2D42 on #FFD166 = 9.36; #FFFFFF on #E5484D = 3.91 (large bold only); #1F2A55 on #FFC857 = 8.98; #0F1B2D on #4CC9F0 = 8.99; #FFFFFF on #2563EB = 5.17.

Grounding: the structure (bg + ink + 1 primary + 1-2 accents + muted, each with an "on-colour") follows the ui-ux-pro-max `colors.csv` schema; K-palette hues are inspired by its "Kids Learning" and "Educational App" rows but retuned for contrast; Barty-Bart default (warm canvas, ink, ONE orange accent) supports "one accent per scene"; the anthropic frontend-design warning about cream+terracotta is why K1 uses coral/teal/yellow instead. The specific hex values and "one accent per scene, never accent-coloured body text" rule are my judgment. Rule: never put coloured text under 4.5:1; use fills for the low-contrast brights.

Colour grading: our scenes are flat vector, so no LUT. If any photographic or AI-generated raster is mixed in, apply a single `neutral` 1.0 grade (OpenMontage `color-grading.md`, science/educational row) and tint towards the palette's bg by 10-15% so it does not look pasted-in (judgment).

### 3.2 Type pairings (all confirmed present in this repo's `node_modules/@remotion/google-fonts` v4.0.532)

| Look | Display | Body/captions | Mono/numbers | Source/justification |
|---|---|---|---|---|
| Kids default | Fredoka (600-700) | Nunito (600-800) | Nunito tabular | ui-ux-pro-max typography.csv #6 "Playful Creative", for children's/educational |
| Kids alt (hand-drawn, with K3) | Patrick Hand | Nunito | - | csv #73 uses Kalam + Patrick Hand for picture-book apps; Nunito for caption legibility is my judgment (handwriting for captions hurts legibility) |
| Kids alt (soft) | Baloo 2 | Quicksand or Nunito | - | csv #45 uses Baloo 2 + Comic Neue; I substitute Nunito (Comic Neue is not in my verified list) |
| Adult default | Space Grotesk (700) or Manrope (800) | Inter (500-600) | JetBrains Mono | OpenMontage typography: Inter body, bold sans headlines; one family acceptable |
| Adult editorial (history/economics) | Fraunces (700) | Inter | JetBrains Mono | OpenMontage: serif only for editorial title cards; frontend-design: two families must be "clearly distinct" |
| Accessibility option | Lexend / Atkinson Hyperlegible | same | - | csv #41 pairs Crimson Pro + Atkinson; both fonts present |

Sizes (1080p, scale by width/1920 for other canvases): hero title 96-120 px; scene headline >=84 px (Remotion video-layout); supporting >=44 px; captions 52-60 px bold; labels in diagrams >=36 px. 9:16: headline >=84 px, captions 56-64 px. Max 2 caption lines, 32-42 characters per line (OpenMontage / Netflix-style). Load via `@remotion/google-fonts/<Font>` with explicit weights and `subsets`; `waitUntilDone()` before render (per Remotion google-fonts rule, not re-read here).

### 3.3 Layout and safe zones
- 16:9 (1920x1080): margin >=96 px sides (action-safe 90%) and keep titles in the 80% title-safe box (192 px H / 108 px V) if the video may play on TV (OpenMontage typography). Remotion's own rule is the looser 80 px sides / 100 px top-bottom; use 96 x 108 as the single compromise (judgment).
- 9:16 (1080x1920): universal safe box 900x1400 centred (OpenMontage); Shorts specifically 984x1500 with top buffer 120, bottom 300 (360 if description expanded), right ~48-96 (search result clipspeed.ai / postplanify, third-party blogs - not YouTube official). Captions baseline at least 360 px above bottom edge. Subscribe/like column on the right: keep text left of x=984.
- One focal element per scene (Remotion video-layout: "decide what the viewer should notice first"); 12-column grid with equal gutters; symmetrical card grids (charlie947 review rule).

### 3.4 Motion spec (30 fps)
Named curves (use `Easing.bezier` in `interpolate`):

| Name | Definition | Use | Source |
|---|---|---|---|
| `outExpo` | bezier(0.16, 1, 0.3, 1) | default entrance, camera pushes, bar growth | Remotion `timing.md` |
| `outCubic` | bezier(0.33, 1, 0.68, 1) | text entrances | OpenMontage typography (cites easings.net) |
| `outQuart` | bezier(0.25, 1, 0.5, 1) | snappy kinetic text | same |
| `inOutCubic` | bezier(0.65, 0, 0.35, 1) | position changes while visible, camera moves | same |
| `inCubic` | bezier(0.32, 0, 0.67, 0) | exits only | same |
| `emphasized` | bezier(0.2, 0, 0, 1) | hero moves 15-18 frames | Material 3 (secondary source) |
| `linear` | - | progress bars, loops, audio ramps only | Material/Jhey table in design-motion-principles |

Spring configs (Remotion `spring({fps, config})`):

| Name | Config | Feel | Use |
|---|---|---|---|
| `smooth` | `{damping: 200}` | no bounce | adult default for all UI/diagram motion (Remotion docs and `transitions.md` use it) |
| `snappy` | `{damping: 20, stiffness: 200}` | tiny overshoot | labels, chips, numbers (my judgment; matches Barty "tiny overshoot at most", FAST zeta 0.86) |
| `soft-pop` | `{damping: 12, stiffness: 120}` (mass 1) | visible overshoot | kids mascots, stickers, "correct!" moments only (judgment; Jhey: bouncy for children, not enterprise) |
| `heavy` | `{damping: 30, mass: 2}` | slow settle | large panels, camera (judgment) |

Durations at 30 fps: micro (checkmark, chip) 6-9 f; text/word entrance 12-15 f; element enter 15-20 f; panel/camera move 24-36 f; scene transition 12-18 f (adult), 15-24 f (kids); hold after text settles >= 1 s per 13 characters (OpenMontage). Exits 20-30% shorter than entrances and move less (design-motion-principles "exit subtler": use a 12 px lift plus fade).
Stagger: 3 frames per item for >6 items, 4-5 f for 3-6 items, 6-8 f for kids lists and word-by-word reveals; cap total stagger at ~24 f so the last item is never late (judgment; ui-ux-pro-max `motion.csv` row 5 uses 0.08 s = 2.4 f, consistent order of magnitude).
Entrance recipe: opacity 0->1 + translateY 16 px -> 0 + scale 0.95->1 (Emil: never from scale 0; OpenMontage playbook: "fade-up with slight scale 0.95 -> 1.0"). Optional blur 4px->0 for a "focus" feel (Jakub), skip on mobile-resolution renders if cost matters.
Anticipation and follow-through (kids only): 4-6 frame pull-back (scale 0.96 or 6 px opposite offset) before big moves; follow-through via `soft-pop` overshoot. Adult: none; use `smooth`.
Motion blur: `HtmlInCanvasMotionBlur` shutterAngle 180, samples 8 on fast pans only (Remotion `motion-blur.md`; requires Remotion >= 4.0.529 - we are on 4.0.532 - and Chrome HTML-in-canvas support: verify in render, I did not).
Always `extrapolateLeft/Right: 'clamp'`; add `output: 'perceptual-scale'` to scale tweens (Remotion).
Rhythm: change something on screen every 2-4 s (scene-internal beat), a new scene every 6-12 s, align each change to a narration word (Barty: one change per spoken beat, 0.4-1.2 s apart). Min hold 2.5 s, text card 3.5 s, stat card 3.0 s (OpenMontage clean-professional playbook). First surprise/visual hook within 5 s (charlie947 vox rule). These are the only pacing "numbers" I found; Kurzgesagt/Ali Abdaal cut rates are NOT sourced - measure from reference videos before treating as law.

### 3.5 Transition vocabulary
Installed presentations in `remotion-app/node_modules/@remotion/transitions/dist/presentations`: blur-slide, book-flip, clock-wipe, cross-zoom, crosswarp, dissolve, dreamy-zoom, fade, film-burn, flip, iris, linear-blur, none, push-cut, ripple, slide, swap, wipe, zoom-blur, zoom-in-out (files seen; I did not test each renders correctly).

Rules: one dominant direction per episode (default slide from-right = "next beat"; hyperframes motion-doctrine "The Current"); exit and entry on the same axis; no ping-pong; max 3 distinct presentations per episode.

| Beat | Adult presentation + timing | Kids presentation + timing | Why |
|---|---|---|---|
| Next point, same topic | `slide({direction:'from-right'})` + `springTiming({config:{damping:200}, durationInFrames:15})` | `slide` same direction, 20 f `snappy` | neutral forward progress (hyperframes) |
| Hard cut / quick fact | `none` or `fade` 6-8 f | `fade` 10 f | no transition is also a choice; fast cuts keep pace |
| Zoom into detail / mechanism | `zoom-in-out` or `cross-zoom` 18 f | `iris` on the subject 20 f | pushing deeper into the same thought |
| Reveal/answer, conclusion | `wipe` from-bottom 18 f ("upward = reveal") or `dreamy-zoom` | `clock-wipe` or `iris` 24 f | upward vector = conclusion (hyperframes) |
| Chapter / topic change | `push-cut` or `blur-slide` 18 f | `book-flip` 24 f (storybook page turn) + page-turn SFX | marks a bigger boundary; book-flip fits storybook look (judgment) |
| Time jump / flashback | `film-burn` or `lightLeak` overlay 20-30 f (`TransitionSeries.Overlay`, does not shorten timeline) | same, hueShift warm | overlay semantics from Remotion `light-leaks.md` (needs WebGL2: `Config.setChromiumOpenGlRenderer("angle")`) |
| Wonder / "whoa" beat | `zoom-blur` once per episode | `ripple` once | rarity keeps it special (judgment) |
Avoid in adult clean look: `flip`, `swap`, `crosswarp`, `ripple`, `film-burn` (decorative, template-looking). Avoid `lightLeak` and `film-burn` overusing; max 1 per episode.
Accounting: transitions shorten the timeline (sum of scenes minus sum of transition frames); compute with `getDurationInFrames` so narration sync is not off (Remotion `transitions.md`).

### 3.6 Kinetic text, captions, data-viz
- Kinetic text: word-by-word or char stagger with `outCubic`, 12-15 f per word group, hold, exit with `inCubic` 9 f. Use `@remotion/rough-notation` (`Highlight`, `Circle`, `Underline`, with `progress` driven by `interpolate`) for emphasis instead of colour-flipping a single word (frontend-design warns about the single accented word tell; mix with the annotation approach - judgment).
- Captions: `@remotion/captions` Basic Captions element (Remotion's recommendation) positioned inside the safe box. Grouping: break at pause >=500 ms, sentence end, or max 6 words / 2.5 s; min 2 words, min 0.5 s on screen; enter 80 ms (~2 f) before the first word (hyperframes caption-grouping). Style: bold sans (Nunito 800 kids, Inter 700 adult), 52-60 px, white (#FFFFFF) or palette text with a 6 px bg-colour stroke or a 70%-opaque bg-colour pill (guarantees >=7:1 over any scene); active word highlighted with palette accent (cyan #4CC9F0 on A1; #FFC857 on K2); no all-caps; 2 lines max. Captions in 16:9 sit at y ~ 880-980; in 9:16 at y ~ 1300-1500 (above the 360 px bottom dead zone).
- Data-viz/diagrams: bars/lines draw on with `outExpo` 24-36 f; stagger series 4 f; labels fade 8 f after the mark lands; at most 4 colours per chart; never invent numbers (every on-screen figure needs a source - Barty, charlie947 rules, and our existing pipeline guard). Colour-blind safety: do not rely on red/green alone; pair with shape or label (OpenMontage colour-grading cites Wong palette - not verified).
- Thumbnail/title: not covered by any skill I found; keep to existing `packaging.py` rules. Judgment: <=4 words at >=120 px, one subject, palette accent as the only saturated colour, test at 120-160 px wide (OpenMontage typography says thumbnail text must read at that width).

### 3.7 SFX and music rules
Sources: OpenMontage `sound-design.md` (W3C/BBC/platform specs cited, not verified directly) unless noted.
- Narration: -16 to -14 LUFS integrated, true peak <= -1.5 dBTP; YouTube normalises toward -14 LUFS and only turns loud tracks down (confirmed by multiple secondary web results; the official support page was not reached). Master the whole mix to -14 LUFS (-16 acceptable for speech-only).
- TTS chain: HPF 80 Hz, cut ~500 Hz, +2-3 dB at 2-5 kHz, gentle cut 6-8 kHz, 3:1 compression, limiter -1.5 dBTP.
- Music: instrumental, even dynamics, 60-80 BPM calm (adult science/economics), 90-110 BPM standard, 100-120 BPM only for kids (judgment on the last); bed 18-20 dB under narration (W3C 20 dB), duck 6-12 dB when narration is active with 150-300 ms attack-ish ramps (do it with a volume envelope in Remotion `<Audio volume={(f)=>...}>`: ramp down 6-9 frames before the first word, up 15-20 frames after the last - judgment), cut 2-4 kHz on the bed. In Remotion terms the playbook's "music_volume 0.08" is a rough starting gain only.
- SFX: whoosh for transitions 400-500 ms at -18 to -12 dB, starting 10-20 ms (<1 frame; use 0-1 frame early) before the visual; pop/pluck for text appearing <200 ms; click for UI < 100 ms; impact for key stat <300 ms at -12 to -6 dB; subtle whoosh for slides 200-400 ms. Max one SFX per transition, none on every text line (judgment: avoids the "meme-edit" feel). Kids: add soft-pop "boing/pop" and page-turn; adult: soft whoosh + click only.
- Do NOT use the remotion.media meme sounds (bruh, vine-boom, windows-xp-error, wilhelm-scream, etc.) listed in `sfx.md`; use whoosh/whip/page-turn/switch/mouse-click/ding. Licence of those hosted files was not checked; for anything we ship, prefer files with a known licence (e.g. kapishdima/soundcn, MIT repo - assets' individual licences not checked).
- Silence is a tool: leave ~0.3-0.5 s of music-only before the final takeaway line (judgment).

## 4. What to adopt, with priority

| Pri | Action | Effort | Why |
|---|---|---|---|
| P0 | Keep `remotion-dev/skills` (doc 08 already says install). Pin a commit; read `timing.md`, `transitions.md`, `video-layout.md`, `light-leaks.md` into our episode skill | S | Official, version-matched to 4.0.532 |
| P0 | Add this doc's section 3 as `video-pipeline/direction/DESIGN_SYSTEM.md` (palettes, fonts, motion tokens as a TS module: curves, springs, durations, stagger) so scenes import tokens instead of hard-coding | M | Consistency across episodes; biggest quality jump |
| P0 | Add lint rules to `lint.py`/`verify.py`: text contrast >= 4.5:1, font sizes >= 44/84 px, nothing inside safe-zone margins, loudness -14 LUFS +/- 1 on the final mix (ffmpeg `loudnorm`/`ebur128` measurement) | M | Turns advice into enforcement |
| P1 | Per-audience palette/font/spring "theme" objects; selection via `episode.json` audience field | S | Kids vs adult separation |
| P1 | Music ducking envelope + SFX map (transition -> whoosh, key number -> impact) generated by `director.py` | M | Sound is the most-cited "unfinished" tell (charlie947) |
| P1 | Run the design-motion-principles anti-checklist as a review pass on a rendered episode's motion spec | S | Catches AI-slop motion |
| P2 | Caption grouping function (pause 500 ms / 6 words / 2.5 s rule) | S | Retention + legibility |
| P2 | Read-only mining of ui-ux-pro-max CSVs for further palettes/fonts | S | Already installed as skill |
| P3 | Evaluate hyperframes concepts (vector ledger for transitions) - concept only, no install | S | Interesting, but different runtime |
| Skip | OpenMontage (AGPL, huge), Barty-Bart/charlie947 code (HTML/Playwright pipelines), hyperframes install, meme SFX | - | Wrong runtime, licence, or tone |

## 5. Risks

- Prompt-injection and supply chain: every SKILL.md is instructions an agent obeys. Flagged files: Barty `scripts/setup.sh` (npm install playwright, pip install numpy with `--break-system-packages`), ui-ux-pro-max `cli/` (update downloader) and `brand/scripts/sync-brand-to-tokens.cjs`, hyperframes skills that tell the agent to run `npx hyperframes skills update` and check HeyGen auth, OpenMontage `setup.py`/`Makefile`, Remotion skills' `scripts/*.ts`. None executed. Emil's skills force a canned first reply (harmless but shows skills can shape agent output).
- Licensing: OpenMontage is AGPL-3.0 (do not copy text/code in); Remotion skills repo has no declared licence; Remotion itself needs a company licence for larger for-profit companies (see doc 08). Hosted SFX licences unchecked.
- Source quality: Material 3 values, YouTube loudness, platform safe zones and Kurzgesagt style notes come from secondary/blog search results; OpenMontage's cited standards (W3C/BBC) were not opened. Pacing targets are largely my judgment; validate against watch-time analytics of our own episodes.
- Taste drift: AI-looking outputs cluster (cream + terracotta, dark + neon accent, fade-slide-up on everything per anthropic frontend-design); the palettes here avoid the two named clusters but only a rendered review will confirm.
- Technical unknowns: whether every installed transition renders cleanly at 1080x1920; WebGL2 requirement for `lightLeak` on our Docker renderer; HTML-in-canvas motion blur support in the headless Chromium we ship.
- Star counts are as of 2026-10-05 and move quickly; skills.sh installs are from a summarised page.
