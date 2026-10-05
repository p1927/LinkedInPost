# Github Research repos

Date: 2026-10-06
Purpose: one place listing every GitHub repo we looked at while researching the `video-pipeline/`, with its link and a very short note on tech, stack or steps.
Sources: `docs/research/github-repositories-research.md` and `docs/research/video/05` to `13`, plus `topics-2026-10-05.md` and `07-posting-options.md`.

Legend for **Use**: **Studied** = read in depth, **Vendored** = copy in `video-pipeline/vendor/` or `direction/skills/` (fork under `p1927`), **Listed** = surveyed only, **Skip** = rejected, **Avoid** = unsafe or license problem. Details of each verdict live in the source doc named in the section heading. Star counts and licenses are as of the doc date and may be stale.

---

## 1. Full YouTube / short-video automation repos
Source: `github-repositories-research.md`

| Repo | Link | Stack / steps | Use |
|---|---|---|---|
| raunakpatil/youtube-agentic-ai-studio | https://github.com/raunakpatil/youtube-agentic-ai-studio | Python. Gemini Researcher + Scriptwriter agents, edge-tts, Pexels, MoviePy, Flask approval dashboard, YouTube OAuth upload. Retention script template (open loop, timed re-hooks, callback ending), 8-model fallback chain | Studied |
| SaarD00/AI-Youtube-Shorts-Generator | https://github.com/SaarD00/AI-Youtube-Shorts-Generator | Python. Gemini script (Hook, Context, Mechanism, Twist, Outro), edge-tts, Pexels portrait clips, ffmpeg `xfade`. Two literal visual queries per sentence | Studied |
| heyncth/youtube-auto-dub | https://github.com/heyncth/youtube-auto-dub | Python CLI. yt-dlp, faster-whisper, translate, edge-tts or Qwen3-TTS voice cloning, ffmpeg mix. Persona voice design, silence-aware duration fitting | Studied |
| hassancs91/claude-youtube-editor | https://github.com/hassancs91/claude-youtube-editor | Claude Code skills + Python tools + Remotion. Claude writes JSON plans (cuts, SFX, timeline) that tools execute, with human audit gates | Studied |
| ChaitanyaEswarRajeshJakki/gemini-youtube-automation | https://github.com/ChaitanyaEswarRajeshJakki/gemini-youtube-automation | Python. GitHub Actions cron, Gemini 2.5 Flash, gTTS, Pillow slides, MoviePy, YouTube upload. State committed back to repo, long video + Short from one run | Studied |
| naqashafzal/AI-Content-Studio | https://github.com/naqashafzal/AI-Content-Studio | FastAPI + Next.js. Gemini with search grounding, Gemini/WaveSpeed TTS, NewsAPI, Whisper, Playwright publishing. Style profiles, karaoke captions, scheduler | Studied |

## 2. Vendored into our repo (`video-pipeline/vendor/`)
Source: `github-repositories-research.md` section 2, `06-openmontage.md`. Our forks; none are imported by `run.py`.

| Repo | Link | Stack / steps | Use |
|---|---|---|---|
| calesthio/OpenMontage | https://github.com/calesthio/OpenMontage (fork: https://github.com/p1927/OpenMontage) | Agent-driven pipelines as YAML manifests, 21 JSON artifact schemas, stage skills, checkpoints, human gates, tool registry. AGPL-3.0, so ideas only | Vendored, studied |
| MoneyPrinterTurbo | https://github.com/p1927/MoneyPrinterTurbo | Fork. TTS and subtitle timing, background-music mixing | Vendored |
| ViMax | https://github.com/p1927/ViMax | Fork. Storyboard and camera-planning rules | Vendored |
| youtube-automation-agent | https://github.com/p1927/youtube-automation-agent | Fork. Claims schema and provenance gate | Vendored |
| remotion (source) | https://github.com/p1927/remotion | Fork of Remotion, kept as a source reference | Vendored |

## 3. Agentic video pipeline tools and editors
Source: `video/13-agentic-video-pipeline-tools.md`

| Repo | Link | Stack / steps | Use |
|---|---|---|---|
| juspay/director | https://github.com/juspay/director | TypeScript CLI on NeuroLink SDK. 7 phases (voiceover, avatar, b-roll, music, render, assembly, captions), critic checks keyframes before costly steps. No license, so ideas only | Studied |
| LudwigKienle/ai-video-production-editor | https://github.com/LudwigKienle/ai-video-production-editor | Electron + React. `DirectorTreatment` with per-shot `rationale`, versioned director passes. GPL-3.0 | Studied |
| video-db/Director | https://github.com/video-db/Director | Chat-based video agents framework, cloud API. Poor fit | Skip |
| digitalsamba/claude-code-video-toolkit | https://github.com/digitalsamba/claude-code-video-toolkit | Slash commands, skills, templates, Python tools. `/scene-review` gate before voiceover. MIT | Studied |
| vibe-motion/skills | https://github.com/vibe-motion/skills | 16 Remotion effect recipes, no license, unmaintained | Skip |
| iart-ai/motion-skills | https://github.com/iart-ai/motion-skills | Index of 17 skill sub-repos. Funnel to paid product | Listed |
| kangarooking/director-skills | https://github.com/kangarooking/director-skills | Shot-manifest YAML, `lint_shot_manifest.py`, usable/partial/regenerate verdict. Built for photoreal video. MIT | Studied |
| danielrosehill/AI-Video-Tools | https://github.com/danielrosehill/AI-Video-Tools | 37-entry index of tools, stale | Listed |
| mutonby/openshorts | https://github.com/mutonby/openshorts | Long video to vertical shorts clipper, needs paid keys. Worth copying: MCP + REST + CLI + skill interface | Listed |
| 0xsline/OpenChatCut | https://github.com/0xsline/OpenChatCut | Local-first chat editor, JSON timeline as source of truth, draft-approve-apply sessions. AGPL-3.0 | Pattern only |
| ahujasid/blender-mcp | https://github.com/ahujasid/blender-mcp | Agent drives Blender over a socket. Arbitrary-code tool is a risk | Listed |
| vincentsch/explainroo | https://github.com/vincentsch/explainroo | Free local 2D explainer pipeline: Kokoro TTS, Whisper timing, QA bundle (stills, contact sheet, overflow and mispronunciation checks). MIT | Best free/local reference |
| pitchpackertube56/DrawCut-PRO- | https://github.com/pitchpackertube56/DrawCut-PRO- | Password-protected `.rar`, no source. Looks like spam or malware | **Avoid, do not run** |

## 4. Remotion skills, templates and libraries
Source: `video/09-remotion-skills.md`, `video/08-agent-skills-for-video.md`

| Repo | Link | Stack / steps | Use |
|---|---|---|---|
| remotion-dev/skills | https://github.com/remotion-dev/skills | Official Remotion agent skills (~14): preview-first workflow, `TransitionSeries`, per-scene TTS with `calculateMetadata`, layout minimums | Studied, vendored copy |
| remotion-dev/remotion | https://github.com/remotion-dev/remotion | Core React-based video engine | Core engine |
| Vincentwei1021/video-shotcraft | https://github.com/Vincentwei1021/video-shotcraft | Skill + template + assets, Apache-2.0 | Studied |
| Vincentwei1021/anything2explainer | https://github.com/Vincentwei1021/anything2explainer | Skill + template, non-commercial license | Studied |
| Vincentwei1021/video-talkcraft | https://github.com/Vincentwei1021/video-talkcraft | 108 recipe cards, custom license | Listed |
| haidrrrry/claude-remotion-skill | https://github.com/haidrrrry/claude-remotion-skill | Best single Remotion craft skill, MIT | Studied |
| Remocn/remocn | https://github.com/Remocn/remocn | shadcn-style registry, ~240 Remotion components + skill, MIT | Studied |
| av/remotion-bits | https://github.com/av/remotion-bits | npm library `remotion-bits` + skill + MCP, MIT | Studied |
| Liamrjohnston/remotion-motion-graphics-skill | https://github.com/Liamrjohnston/remotion-motion-graphics-skill | 4 Remotion motion-graphics skills, MIT | Studied |
| charlie947/motion-graphics-skills | https://github.com/charlie947/motion-graphics-skills | 13 skills, single HTML output with `window.seek` (HyperFrames style), MIT | Studied |
| iart-ai/explainer-video-skills | https://github.com/iart-ai/explainer-video-skills | Script to storyboard to scene build to caption sync, word-budget math `words/2.3+0.4`, QA scripts, MIT | Studied |
| iart-ai/motion-design-skills, tiktok-video, kinetic-typography, data-animation | https://github.com/iart-ai (sub-repos of motion-skills) | Skill packs for motion design, TikTok, kinetic type, data animation | Studied |
| AgriciDaniel/claude-shorts | https://github.com/AgriciDaniel/claude-shorts | Shorts skill with captions, MIT | Studied (refs) |
| hassancs91/claude-faceless-shorts-creator | https://github.com/hassancs91/claude-faceless-shorts-creator | Faceless Shorts factory template, MIT | Listed |
| howseen-ai/claude-motion-design | https://github.com/howseen-ai/claude-motion-design | HTML + Playwright (not Remotion), MIT | Listed |
| DojoCodingLabs/remotion-superpowers | https://github.com/DojoCodingLabs/remotion-superpowers | Remotion plugin with MCP + hooks, MIT | Studied (risk) |
| wshuyi/remotion-video-skill | https://github.com/wshuyi/remotion-video-skill | Generic tutorial skill | Studied |
| buainoai/remotion-skills | https://github.com/buainoai/remotion-skills | Chinese translation of the old best-practices skill | Listed |
| jhartquist/claude-remotion-kickstart, runesleo/claude-video-kit | https://github.com/jhartquist/claude-remotion-kickstart , https://github.com/runesleo/claude-video-kit | Starter template / skill | Listed |
| dmtrKovalenko/fframes | https://github.com/dmtrKovalenko/fframes | Alternative render framework, MIT | Listed |
| Agents365-ai/video-podcast-maker | https://github.com/Agents365-ai/video-podcast-maker | Video podcast skill/template, MIT | Listed |
| reactvideoeditor/remotion-templates | https://github.com/reactvideoeditor/remotion-templates | Effects library | Listed |
| Bomx/super-video-maker-skill | https://github.com/Bomx/super-video-maker-skill | HeyGen / Seedance / OpenAI pipeline skill | Listed |
| op7418/guizang-product-video-skill | https://github.com/op7418/guizang-product-video-skill | GSAP/Three product-video skill, AGPL-3.0 | Listed |
| remotion-dev/template-tiktok, template-audiogram, template-prompt-to-motion-graphics-saas, template-code-hike, template-prompt-to-video | https://github.com/remotion-dev (template repos) | Official Remotion templates | Listed |

## 5. Manim (math videos)
Source: `video/05-manim-for-math-videos.md`, `video/08-agent-skills-for-video.md`

| Repo | Link | Stack / steps | Use |
|---|---|---|---|
| 3b1b/manim | https://github.com/3b1b/manim | ManimGL, OpenGL engine by Grant Sanderson (PyPI `manimgl`), MIT | Studied |
| ManimCommunity/manim | https://github.com/ManimCommunity/manim | Community Edition, Python 3.11+, MIT | Studied |
| ManimCommunity/manim-voiceover | https://github.com/ManimCommunity/manim-voiceover | CE plugin for TTS voiceover, MIT | Studied |
| 3b1b/videos | https://github.com/3b1b/videos | Source of the 3b1b videos. **CC BY-NC-SA 4.0**, do not adapt into monetised content | Reference only |
| adithya-s-k/manim_skill | https://github.com/adithya-s-k/manim_skill | 3 skills incl. `manim-composer` (idea to scene-by-scene `scenes.md`), MIT | Studied |
| Yusuke710/manim-skill | https://github.com/Yusuke710/manim-skill | Single SKILL.md: plan, code, render, plus TTS and subtitle lint scripts, MIT | Studied |
| marcelo-earth/generative-manim | https://github.com/marcelo-earth/generative-manim | Web app + API, GPT to Manim code to video | Skip |
| abhiemj/manim-mcp-server | https://github.com/abhiemj/manim-mcp-server | MCP server, stale | Skip |
| paulnegz/manim-mcp | https://github.com/paulnegz/manim-mcp | Text to Manim MCP, low adoption | Skip |

## 6. Direction, storyboard and AI-film skills
Source: `video/11-direction-skills-landscape.md`

| Repo | Link | Stack / steps | Use |
|---|---|---|---|
| Nagacash/narrative-film-direction | https://github.com/Nagacash/narrative-film-direction | SKILL.md + 6 refs: lock geography, shot list, master keyframe, one action per clip | Distill |
| Nagacash/character-continuity-skill | https://github.com/Nagacash/character-continuity-skill | Canon frame, turnaround set, locked identity text block | Distill |
| Nagacash/prove-it | https://github.com/Nagacash/prove-it | Companion skill from the same author | Listed |
| HEOJUNFO/ai-film-crew | https://github.com/HEOJUNFO/ai-film-crew | 7 crew-role files, modes Plan / Fix / Review | Distill |
| KeWang0622/ai-film | https://github.com/KeWang0622/ai-film | Failure-catalogue method: describe, don't negate | Distill |
| phileiny/h3-storyboard-skill | https://github.com/phileiny/h3-storyboard-skill | Script to shot list for MiniMax H3, one beat per short shot | Distill |
| RandomNest/aivideo-production-skills | https://github.com/RandomNest/aivideo-production-skills | Gated artifacts, locks, QC grades, cost routing | Reference |
| whystrohm/shotkit | https://github.com/whystrohm/shotkit | `shots.json` schema, per-generator prompts, ACCEPT/REVISE critic | Reference |
| 62656456/ai-film-skills, ai-film-knowledge-base | https://github.com/62656456/ai-film-skills , https://github.com/62656456/ai-film-knowledge-base | 21 modules: director agent, storyboard, asset skills | Reference |
| zenstory-ai/drama-skills | https://github.com/zenstory-ai/drama-skills | AI short-drama suite: character bible, outline, storyboard split | Reference |
| eternityspring/shuohao-skills | https://github.com/eternityspring/shuohao-skills | AI short-drama suite | Reference |
| TimTsung/cinematic-composition-skill | https://github.com/TimTsung/cinematic-composition-skill | 64 composition techniques + model adapters | Reference |
| YanKaFei/art-aesthetic-vault | https://github.com/YanKaFei/art-aesthetic-vault | Director styles, camera-move recipes, art movements | Reference |
| Square-Zero-Labs/video-prompting-skill | https://github.com/Square-Zero-Labs/video-prompting-skill | Per-model prompt guides (H3, Seedance, LTX, Veo, Wan) | Reference |
| SkyNotSilent/awesome-minimax-h3-cases | https://github.com/SkyNotSilent/awesome-minimax-h3-cases | 2,115 MiniMax H3 cases, 664 full prompts | Reference |
| MiniMax-AI/MiniMax-MCP | https://github.com/MiniMax-AI/MiniMax-MCP | Official MiniMax MCP (speech, image, video) | Skip (we call MiniMax directly) |
| LearnPrompt/awesome-seedance | https://github.com/LearnPrompt/awesome-seedance | Seedance prompt library with retests | Reference |
| songguoxs/seedance-prompt-skill | https://github.com/songguoxs/seedance-prompt-skill | Seedance prompt skill, no license | Avoid (unlicensed) |
| geekjourneyx/awesome-ai-video-prompts | https://github.com/geekjourneyx/awesome-ai-video-prompts | Curated official prompt guides | Skip |
| vyralcontent/content-skills | https://github.com/vyralcontent/content-skills | 7 markdown skills: viral hooks (visual, verbal, text), Shorts retention | Distill |
| nopefallacy/vertical-video-editing-skills | https://github.com/nopefallacy/vertical-video-editing-skills | 9:16 editing standard, hook engineering, render-verification gate | Reference |
| chang416/cutcraft | https://github.com/chang416/cutcraft | ffmpeg + Whisper talking-head editing | Skip |
| dramaclaw/dramaclaw | https://github.com/dramaclaw/dramaclaw | Full script-to-film engine, license unclear | Skip |
| F-R-L/forge-film | https://github.com/F-R-L/forge-film | DAG / critical-path scheduler for parallel scene generation | Reference |
| Greatbenny/StoryMind | https://github.com/Greatbenny/StoryMind | LLM storyboard + cross-shot consistency, AGPL | Avoid (copyleft) |
| ismael-joffroy-chandoutis/open-source-cinema | https://github.com/ismael-joffroy-chandoutis/open-source-cinema | Note arguing agents should organise and sync, not cut | Reference |
| AcademySoftwareFoundation/OpenTimelineIO | https://github.com/AcademySoftwareFoundation/OpenTimelineIO | Timeline interchange format for NLE hand-off | Listed |
| HITsz-TMG/FilmAgent | https://github.com/HITsz-TMG/FilmAgent | Multi-agent film crew research code (arXiv 2501.12909) | Listed |

## 7. Agent skills for YouTube packaging and AI-video prompts
Source: `video/08-agent-skills-for-video.md`

| Repo | Link | Stack / steps | Use |
|---|---|---|---|
| Jakeschincariol/youtube-agent-skill | https://github.com/Jakeschincariol/youtube-agent-skill | 11 skills (script, package, retention, chapters, viral), MIT | Studied |
| AgriciDaniel/claude-youtube | https://github.com/AgriciDaniel/claude-youtube | Channel audits, SEO, retention scripts, thumbnails, analytics, MIT | Listed |
| sergebulaev/youtube-skills | https://github.com/sergebulaev/youtube-skills | Titles, descriptions, hooks, thumbnail briefs, publishes via Publora | Listed |
| aabrole/claude-video-thumbnail-skill | https://github.com/aabrole/claude-video-thumbnail-skill | 4 thumbnail concepts via a Gemini image model | Listed |
| jnMetaCode/ai-shortfilm-prompts | https://github.com/jnMetaCode/ai-shortfilm-prompts | Idea to model-ready video prompt, 5 stages, 21 genre templates, MIT | Studied |
| Rylaispirit/cinematic-video-prompt-skill | https://github.com/Rylaispirit/cinematic-video-prompt-skill | Cinematography vocabulary + prompt formula, MIT | Studied |
| Seemerry/video-generation-skill | https://github.com/Seemerry/video-generation-skill | MiniMax video calls with polling and cost accounting, 0 stars | Skip |
| 0xadvait/ai-video-skill | https://github.com/0xadvait/ai-video-skill | Seedance/Kling generation scripts | Skip |
| kdowswell/veo-tools | https://github.com/kdowswell/veo-tools | Veo generation scripts | Skip |

## 8. Design, UI and motion skills
Source: `video/10-video-design-skills.md`

| Repo | Link | Stack / steps | Use |
|---|---|---|---|
| anthropics/skills | https://github.com/anthropics/skills | Official Anthropic skills (frontend-design, canvas-design, theme-factory, algorithmic-art) | Listed |
| nextlevelbuilder/ui-ux-pro-max-skill | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | CSV lookup data for colours, font pairs, motion, MIT | Usable as lookup |
| leonxlnx/taste-skill | https://github.com/leonxlnx/taste-skill | Web UI taste skills, not video | Not reviewed |
| pbakaus/impeccable | https://github.com/pbakaus/impeccable | UI design commands | Not reviewed |
| heygen-com/hyperframes | https://github.com/heygen-com/hyperframes | HTML-based video framework with animation and creative skills, Apache-2.0 | Concepts only |
| emilkowalski/skill | https://github.com/emilkowalski/skill | UI animation principles (CSS/Framer), MIT | Principles transfer |
| kylezantos/design-motion-principles | https://github.com/kylezantos/design-motion-principles | Motion principles + anti-slop checklist | Reference |
| raphaelsalaja/userinterface-wiki | https://github.com/raphaelsalaja/userinterface-wiki | UI wiki | Not reviewed |
| kapishdima/soundcn | https://github.com/kapishdima/soundcn | SFX asset source named by Remotion's sfx rule, MIT | Not reviewed |
| Barty-Bart/motion-graphics | https://github.com/Barty-Bart/motion-graphics | `motion-broll`: spring maths, palette; Playwright + ffmpeg | Concepts only |
| BusyBee3333/animated-explainer-skills | https://github.com/BusyBee3333/animated-explainer-skills | GSAP/HTML explainers, 6 stars | Skip |

## 9. Posting and publishing
Source: `video/07-posting-options.md`

| Repo | Link | Stack / steps | Use |
|---|---|---|---|
| gitroomhq/postiz-app | https://github.com/gitroomhq/postiz-app | Social scheduler. Next.js, NestJS, Prisma/Postgres, Temporal, Redis. AGPL-3.0. Self-host needs your own Google/Meta apps | Studied |

## 10. Vendored direction skills (`video-pipeline/direction/skills/`)
Source: `13-agentic-video-pipeline-tools.md`, `LEDGER.yaml`. All `status: raw`, none wired into `director.py`.

| Repo | Link | Stack / steps | Use |
|---|---|---|---|
| wuwangzhang1216/DirectorSKILL | https://github.com/wuwangzhang1216/DirectorSKILL | Director skill | Vendored |
| kianaliang-dev/drama-director-skill | https://github.com/kianaliang-dev/drama-director-skill | Drama director skill | Vendored |
| smixs/visual-skills | https://github.com/smixs/visual-skills | Visual skills, referenced most often across the direction docs | Vendored |
| smixs/creative-director-skill | https://github.com/smixs/creative-director-skill | Creative director skill | Vendored |
| rediumvex/ai-video-generator-claude | https://github.com/rediumvex/ai-video-generator-claude | AI video generation skill | Vendored |

## 11. Repos only cited inside vendored skills
Source: reference files of the vendored skills in `video-pipeline/direction/skills/vendor/` (character-continuity-skill, DirectorSKILL, visual-skills, video-prompting-skill, higgsfield-ai-prompt-skill). We did not research these ourselves. Notes are the repo's general purpose, not a review.

| Repo | Link | Note | Use |
|---|---|---|---|
| tencent-ailab/IP-Adapter | https://github.com/tencent-ailab/IP-Adapter | Image-prompt adapter, cited as a weak identity lock in the tool matrix | Cited only |
| instantX-research/InstantID | https://github.com/instantX-research/InstantID | Face-identity preservation, cited in character continuity refs | Cited only |
| sczhou/CodeFormer | https://github.com/sczhou/CodeFormer | Face restoration, not in our stack | Cited only |
| TencentARC/GFPGAN | https://github.com/TencentARC/GFPGAN | Face restoration, not in our stack | Cited only |
| kohya-ss/sd-scripts | https://github.com/kohya-ss/sd-scripts | LoRA training scripts | Cited only |
| ostris/ai-toolkit | https://github.com/ostris/ai-toolkit | LoRA / diffusion training toolkit | Cited only |
| Wan-Video/Wan-Animate-2 | https://github.com/Wan-Video/Wan-Animate-2 | Wan Animate model, prompting guide in the vendored video-prompting skill | Cited only |
| Lightricks/LTX-2 | https://github.com/Lightricks/LTX-2 | Open video model (LTX) | Cited only |
| Lightricks/ComfyUI-LTXVideo | https://github.com/Lightricks/ComfyUI-LTXVideo | ComfyUI nodes for LTX | Cited only |
| snubroot/Veo-3-Prompting-Guide | https://github.com/snubroot/Veo-3-Prompting-Guide | Veo 3 prompting guide | Cited only |
| Eric-Lautanen/seamless-ai-video-prompt-template | https://github.com/Eric-Lautanen/seamless-ai-video-prompt-template | Video prompt template | Cited only |
| higgsfield-ai/skills | https://github.com/higgsfield-ai/skills | Higgsfield skills | Cited only |
| OSideMedia/higgsfield-ai-prompt-skill | https://github.com/OSideMedia/higgsfield-ai-prompt-skill | Higgsfield prompt skill, vendored (has `DISCIPLINE.md`) | Vendored |
| agentara/skills | https://github.com/agentara/skills | MIT skills collection, copyright notice appears in a vendored skill | Cited only |
| Nagacash/prove-it | https://github.com/Nagacash/prove-it | Skill by the same author as narrative-film-direction; purpose not checked | Cited only |

---

## Caveats

- Rows in sections 8 and 11 are lighter than the rest. Section 8 comes from one-line table descriptions; section 11 repos are only cited inside vendored skills and were not researched by us.
- Repo owners for the six repos in section 1 and for sections 3 to 7 come straight from the docs. A few links not printed as full URLs in the docs (for example `iart-ai` sub-repos, the Remotion templates, `HITsz-TMG/FilmAgent`) were rebuilt from `owner/name` and not re-opened.
- Nothing here was cloned or run for this document. Licenses matter: AGPL, GPL, CC BY-NC-SA and unlicensed repos are ideas-only (see the license tables in docs 11 and 13).
- Project rule: do the research and port what is useful, never import Trade code or secrets.
