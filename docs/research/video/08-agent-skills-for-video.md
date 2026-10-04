# 08 - Ready-made agent skills, plugins and MCP servers for video

Researched 2026-10-05. Stars / push dates / licences come from `gh api` on the repos. I read the file trees and sampled SKILL.md / rule files for Remotion, the Manim skills, and the YouTube and video-prompt skills. I did NOT read every file in every repo, so do a full read before installing anything.

General risk rule: a SKILL.md is instructions the agent obeys. Treat third-party skills as untrusted code. Read the files, check for bundled scripts (`.py`, `.sh`), pin a commit, and install project-local (`.claude/skills/`) rather than globally.

## 1. Remotion (official) - INSTALL

| Field | Value |
|---|---|
| Repo | https://github.com/remotion-dev/skills (also mirrored in `remotion-dev/remotion` at `packages/skills`) |
| Docs | https://www.remotion.dev/docs/ai/skills |
| Stars / updated | ~4.8k / pushed 2026-10-01 (Remotion itself 61.8k stars, pushed 2026-10-04) |
| Licence | Skills repo shows no SPDX licence via the API. Remotion core is the Remotion License: free for individuals and small companies (including commercial); larger for-profit companies need a company licence. Check the current terms for your entity. |
| Install | `npx skills add remotion-dev/skills` (or pick the option in `bun create video`) |
| Risk | Low. Official, version-stamped (4.0.532). It points at remotion.dev for example code, so it does fetch from the network. Read before install anyway. |

Skills in the repo: `remotion-best-practices` (umbrella), `-create`, `-markup`, `-captions`, `-multimedia`, `-render`, `-studio`, `-docs`, `-interactivity`, `-maps`, `-saas`, `-upgrade`.

Rules encoded (from `remotion-markup` and its rule files):
- **Animation:** drive everything with `useCurrentFrame()` + `interpolate()`. CSS `transition`/`animation` and Tailwind animation classes will NOT render, so refactor them. Always clamp extrapolation. Use `Easing.bezier()` / `Easing.spring()`. Prefer `scale`/`translate`/`rotate` CSS properties over `transform` strings.
- **Timing:** express durations as seconds times `fps`. Put timing directly on components. Set `premountFor={fps}` on media, Sequences, Series and TransitionSeries items. Files: `timing.md`, `sequencing.md`, `timing-props.md`, `transitions.md` (TransitionSeries with transitions and overlays, e.g. light leaks), `motion-blur.md`, `light-leaks.md`.
- **Captions:** transcribe to the `Caption` format, import SRT, and display with the Basic Captions element from `@remotion/captions`. Keep the captions array inline in the JSX prop so Studio's caption editor can write back.
- **Audio / voiceover:** `voiceover.md` uses ElevenLabs per scene, then `calculateMetadata` to size the composition to the audio. `sfx.md` lists hosted SFX (whoosh, whip, ding, ...). Also `silence-detection.md`, `audio-visualization.md`, `get-audio-duration.md`.
- **3D:** `@remotion/three` with `<ThreeCanvas>` and explicit width/height plus lighting.
- **Text and charts:** `text-highlights.md` (`@remotion/rough-notation` circles, underlines, highlights). I found no dedicated chart rule. Charts are just frame-driven SVG, so pair with the `dataviz` skill (section 4).
- **Fonts, measuring, media:** `google-fonts.md`, `local-fonts.md`, `measuring-text.md`, `measuring-dom-nodes.md`, `embedding-videos.md`, `ffmpeg.md`, `lottie.md`, `gifs.md`.

Recommendation: install. It targets the exact failure modes of LLM-written Remotion code (CSS animation, unclamped interpolation, missing premount). Two caveats:
- The newest skills push Studio-editable patterns (`Interactive.*`, `withSchema`, inline keyframes). That is useful for human tweaking but adds ceremony for a headless pipeline. In our headless flow, keep the frame-driven and timing rules and ignore the Studio-editor ones.
- Check our pinned Remotion version against the skills' version (4.0.532) before trusting API names such as `@remotion/media` `<Audio>`.

## 2. Manim

| Candidate | URL | Stars / pushed | Licence | What it does | Recommendation |
|---|---|---|---|---|---|
| adithya-s-k/manim_skill | https://github.com/adithya-s-k/manim_skill | 1.1k / 2026-01 | MIT | Three skills: `manim-composer` (turns a vague idea into a scene-by-scene `scenes.md` with narrative hook, audience questions, 3b1b-style patterns), `manimce-best-practices` (rules for animations, axes, camera, colors, LaTeX, 3D, graphing, updaters, CLI, plus runnable examples), and a ManimGL variant. | **Install** (project-local). Best quality and coverage. Ignore the ManimGL part (3b1b version is incompatible with ManimCE). |
| Yusuke710/manim-skill | https://github.com/Yusuke710/manim-skill | 161 / 2026-10-04 | MIT | Single SKILL.md where the agent plans scenes, writes code, and renders. Ships `tts-generate.py`, `lint-subtitles.py`, `video_viewer.py` (self-review of rendered frames). Also a `.claude-plugin`. | **Adapt**. The lint-subtitles and video-review loop is worth stealing. Read the three Python tools first, since TTS script means network calls and API keys. |
| marcelo-earth/generative-manim | https://github.com/marcelo-earth/generative-manim | 925 / 2026-09 | Apache-2.0 | Web app and API (GPT to Manim code to video), plus datasets and a benchmark repo. | **Skip** as a dependency. It is a product, not a skill. Look only at its prompt and dataset for few-shot ideas. |
| abhiemj/manim-mcp-server | https://github.com/abhiemj/manim-mcp-server | 645 / 2025-05 | MIT | MCP server: Manim code in, video out. | **Skip**. Stale (2025-05), and an MCP server adds nothing over running `manim` via Bash. |
| paulnegz/manim-mcp | https://github.com/paulnegz/manim-mcp | 20 / 2026-02 | MIT | Text to code to video, CLI, agent mode, MCP. | **Skip**. Low adoption. |

Install: `npx skills add adithya-s-k/manim_skill`. Quality note: the rules are API-reference style, with examples that are real files rather than snippets. Verify against the ManimCE version we pin, and run a smoke render before relying on them.

## 3. Script, hook, shorts, thumbnail, captions, AI-video prompts

| Candidate | URL | Stars / pushed | Licence | What it does | Risk | Recommendation |
|---|---|---|---|---|---|---|
| Jakeschincariol/youtube-agent-skill | https://github.com/Jakeschincariol/youtube-agent-skill | 486 / 2026-09-16 | MIT | 11 skills (`yt-script`, `yt-package`, `yt-retention`, `yt-edit`, `yt-chapters`, `yt-viral`, ...). Scripts from 21 hook formulas with a scoring script (`hookscore.py`), title and thumbnail linted as one pairing, edit decision list from a transcript, Shorts finder. No API keys. Never publishes. | 6 small local `.py` helpers. Read them. | **Adapt**. Take `yt-script`, `yt-package`, and the hook formulas; the retention and edit skills only matter once we have analytics. Install via `cp -r skills/yt-script skills/yt-package .claude/skills/`. |
| AgriciDaniel/claude-youtube | https://github.com/AgriciDaniel/claude-youtube | 419 / 2026-04-10 | MIT | Channel audits, SEO, retention scripts, hooks, thumbnails, Shorts, analytics. | Has `install.sh` and scripts that use YouTube OAuth and API (`youtube_auth.py`). Higher risk: network and credentials. | **Skip** the installer; read it for reference only. Overlaps the one above. |
| sergebulaev/youtube-skills | https://github.com/sergebulaev/youtube-skills | 48 / 2026-10-03 | MIT | Titles, descriptions, hooks for long-form and Shorts, thumbnail briefs; publishes via Publora. | Bundles clients for third-party publishing services (`publora_client.py`, `pixfaro_client.py`). | **Skip**. Publishing integrations we do not want. Use only its hook prompts if useful. |
| aabrole/claude-video-thumbnail-skill | https://github.com/aabrole/claude-video-thumbnail-skill | 1 / 2026-04 | MIT | 4 thumbnail concepts, asks long vs short first, composition rules, via Gemini image model. | Needs a Gemini key. Tiny and unproven. | **Skip**. Borrow the long-vs-Shorts composition rules only. |
| jnMetaCode/ai-shortfilm-prompts | https://github.com/jnMetaCode/ai-shortfilm-prompts | 454 / 2026-09-28 | MIT | Skill that turns an idea into a cinematic, model-ready video prompt: 5-stage structure, 21 genre templates, evals. Model-agnostic with a one-line per-model tip (Sora, Kling, Veo, Seedance). Written with Chinese-language triggers. | Mostly markdown. Scripts are only for building docs and evals. | **Adapt**. Good for the shot-prompt generator; add a Hailuo/MiniMax tip. |
| Rylaispirit/cinematic-video-prompt-skill | https://github.com/Rylaispirit/cinematic-video-prompt-skill | 139 / 2026-09-27 | MIT | Cinematography vocabulary (camera angle, movement, lighting, grading) plus a prompt formula. Names Hailuo explicitly alongside Veo 3, Kling, Sora, Runway. 13 files, no scripts. | Lowest risk. Markdown only. Mixed Vietnamese text. | **Install**. Cheapest way to improve Hailuo/Veo prompt quality. |
| Seemerry/video-generation-skill | https://github.com/Seemerry/video-generation-skill | 0 / 2026-09-25 | MIT | Calls a MiniMax video model with polling, download, cost accounting. | Zero stars; handles API keys. | **Skip**. We already have a MiniMax provider in the worker. Compare its polling logic only. |
| 0xadvait/ai-video-skill, kdowswell/veo-tools | https://github.com/0xadvait/ai-video-skill , https://github.com/kdowswell/veo-tools | 6 / (not checked) | MIT (first one) | End-to-end generation scripts for Seedance, Kling, Veo with QC loop; Veo 3.1 helpers. | Run code and handle keys. | **Skip** (we have our own pipeline). |

Gaps: I found no maintained, well-starred skill specifically for caption design, storyboards, or faceless-channel scripts. The YouTube skills cover hooks and scripts; caption styling is best taken from Remotion's captions rules and encoded in our own style guide. A small in-repo `video-director` skill (storyboard and shot-list format, our hook rules, our caption style) is likely better than any import.

## 4. Skills already in the user's environment

- `frontend-design` - useful. Remotion is React and CSS, so its typography, palette and anti-template guidance applies to title cards, lower thirds and caption styling. Overlap risk: it assumes web UI, so tell the agent that CSS transitions are banned in Remotion.
- `dataviz` - useful for chart scenes (palette, form heuristics, accessibility, light and dark). Render with frame-driven SVG per Remotion rules; ignore its interaction rules (tooltips, hover) for video.
- `artifact-design` - not useful. It governs claude.ai Artifact pages. Skip for video; it is only relevant to publishing review pages.
- `mattpocock-skills:grilling` - useful pre-production: grill a video idea for audience, thesis and the hook before writing a script.
- `mattpocock-skills:writing-for-agents` - very useful when we write our own director and builder SKILL.md files and the CLAUDE.md for the video pipeline (short, concrete, rules the agent can check).
- `mattpocock-skills:research`, `domain-modeling` - optional. `research` for fact-checking explainer topics with sources; `domain-modeling` to fix vocabulary (scene, shot, beat).
- `mattpocock-skills:tdd`, `prototype` - `prototype` is good for trying one scene before committing; `tdd` has little role in video.

## 5. Recommended install set

1. `npx skills add remotion-dev/skills` (read first; project-local).
2. `npx skills add adithya-s-k/manim_skill` (only if we really render ManimCE scenes).
3. Copy `Rylaispirit/cinematic-video-prompt-skill` for Hailuo and Veo prompt vocabulary.
4. Copy only `yt-script` and `yt-package` from `Jakeschincariol/youtube-agent-skill` after reading `hookscore.py` and `title.py`.
5. Write our own thin `video-director` skill, using `writing-for-agents`, that wires the above together: brief, hook, beat sheet, shot list, caption style, per-scene tool choice (Remotion, Manim or AI video), QC checklist.

Do not install MCP servers for Manim or Remotion. A rendered CLI called through Bash is simpler and has no extra attack surface.

Sources: github.com/remotion-dev/skills, remotion.dev/docs/ai/skills, github.com/adithya-s-k/manim_skill, github.com/Yusuke710/manim-skill, github.com/Jakeschincariol/youtube-agent-skill, github.com/jnMetaCode/ai-shortfilm-prompts, github.com/Rylaispirit/cinematic-video-prompt-skill and the others linked above.
