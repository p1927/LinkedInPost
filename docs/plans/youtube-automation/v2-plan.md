# v2 plan - "give me a topic, get a reviewed video" + tracking + math + posting

Status: PARTLY BUILT (formats, lint, cache, registry, skill, publish, audience cards, Director v1 exist - see ROADMAP.md PROGRESS and DIRECTOR-AND-VARIETY-PLAN.md; the original text below is the plan as written). Built on six research/audit reports (docs/research/video/01-05 + posting audit below).
Evidence caveat: the research docs are first-pass. Several inputs are secondary sources (retention numbers are vendor claims; safe-zone numbers conflict between third-party guides; sponsor pay ranges come from vendor blogs and disagree). Treat them as starting rules to test on our own analytics, not facts.

## 0. Where we are (v1.2)
Working: topic text -> voice (MiniMax) -> picture-book illustrations (MiniMax image) + 2 reused clips -> Remotion (captions, transitions, term stickers, music) -> final.mp4 + carousel. Script/direction is still hand-written by me per episode; cache is "file exists"; posting is manual; there is no list of episodes.

## 1. Topic -> video: the full pipeline (target state)
Human gates are marked [G].
1. INTAKE: idea backlog (topic, area, goal, optional sponsor, optional deadline for news).
2. RESEARCH: collect facts + source URLs (web search; for news, fresh sources); store in episode `claims[]`.
3. FORMAT PICK: choose from the 14-format catalog by topic area + goal (decision table in research doc 04).
4. SCRIPT: director writes beats using the script template and the hook/analogy/ear rules (doc 02); automated lint runs; [G] you approve the script (cheap gate, before any paid generation).
5. STORYBOARD/SHOT LIST: per scene shot size, camera move, composition, visual metaphor, palette/motifs (doc 03); lint (safe zones, text-in-image, one idea per scene).
6. ASSETS (cached by content hash): voice, illustrations, AI clips (only for story beats), manim clips (math), music, sfx.
7. RENDER: Remotion composes everything; loudness normalize.
8. AUTO-QA: duration, words/sec, sentence length, captions within safe zone, loudness, claims all sourced, sponsor disclosure present when sponsor set, no on-frame AI text (per owner choice), contact sheet.
9. [G] REVIEW: you watch it; say what to change; only changed scenes regenerate.
10. PACKAGE: title/description/tags/caption, cover frame, carousel, disclosure checklist.
11. POST (manual first, then automated), 12. TRACK (status + URLs + later metrics).

## 2. What kinds of videos (from research doc 04; ratings are judgment, not data)
Catalog (14): ELI5 story-wrapped, what-if, myth-busting, why-is-X, versus, 60-second history/timeline, news explainer, case study/mini-doc, place/travel, food science, experiment/demo, visual math proof, data/chart story, character series. Carousels fit versus, timeline, data, myth lists.

Readiness with our stack:
| Readiness | Formats | What's needed |
|---|---|---|
| Ready now | ELI5 story-wrapped, why-is-X, myth-busting, food science, character series | already built (illustration + Remotion) |
| Small new Remotion templates | versus (split screen), data/chart story, timeline | 3 templates + a chart helper |
| Needs manim | visual math proof | ManimCE pipeline (section 4) |
| Needs real/simulated footage | experiment/demo, what-if with numbers | simulations or stock; higher QA |
| Handle with care | news explainer (speed + accuracy, sensitive-topic limits), place/travel (AI looks can misrepresent real places) | stricter source gate, labels |

Topic -> primary formats: places (travel explainer, why-is-X, case study); concepts (ELI5, why-is-X, myth); physics (what-if, demo, ELI5); food (food science, myth, versus); science (why-is-X, myth, demo); economics (data story, case study, ELI5); math (visual proof, ELI5); current events (news explainer, data story).
Series idea: one recurring cast + format per topic area (e.g. Cookie Town = economics; a new cast for science) = strongest sponsor fit but highest "template sameness" risk for YouTube's inauthentic-content rules, so vary scripts, visuals and voice treatment per episode.

## 3. Turning the research into machine-usable direction assets (the "script design" work you asked for)
New folder `video-pipeline/direction/` (data, not code, so it's easy to edit and reuse):
- `audience.yaml` (ELI5 profile: word list level, max words/sentence, analogy rules, "say where the analogy breaks").
- `format_catalog.yaml` (14 formats: structure, beats with seconds/word counts at ~2.5 words/s, best topics, cost).
- `hooks.md` (12 hook patterns + anti-clickbait rules), `endings_cta.md`.
- `script_template.yaml` + `qa_checklist.yaml` (the 14-point script QA from doc 02 as lint rules where checkable).
- `shots.md` (shot vocabulary, camera moves and what they do, 9:16 composition, safe-zone constants as config because sources conflict, pacing rules) + `hailuo_cookbook.md` (camera commands, prompt formula, what fails: text, hands, crowds).
- `psychology_rules.md` (Mayer principles applied: signaling, coherence, segmenting, no seductive details; curiosity gap needs prior knowledge; say where analogies break).
- `sponsor_playbook.md` (6 integration formats, honest-integration rules, disclosure checklist).
- `director_prompt.md` stitches the above into the system prompt the director uses (Claude Code skill `/episode`).
- `lint.py`: automated checks (words/sec, sentence length, hook in scene 1, claims sourced, sponsor disclosure present, one idea/scene, text-in-image flag, caption length vs safe zone).
Acceptance: given only a topic, the director produces an episode.json that passes lint; you approve the script before assets are generated.

## 4. Math videos with manim
Findings (doc 05): 3b1b/manim = ManimGL (OpenGL, no headless flag found); Manim Community Edition (ManimCE) is the headless/Docker-friendly one. Licences: 3b1b/manim and ManimCE are MIT; 3b1b/videos is CC BY-NC-SA 4.0 (NonCommercial).
Decision to confirm: do NOT fork or submodule 3b1b/videos (non-commercial licence; copying its code into a monetized product is not allowed); read it as a reference outside our repo. Use ManimCE via pip/Docker as the engine. (This differs from your suggestion to bring both repos in; the licence is the reason.)
Design: director writes a ManimCE Scene for a math topic -> render in Docker at 1080x1920 (transparent or on our cream palette) -> clip joins the Remotion timeline like any other scene; narration timings drive manim wait()/run_time (voiceover-sync approach in doc 05). LaTeX needs a TeX distribution in the image.
Unverified, to test first: render speed on Apple Silicon, whether the official image has an arm64 build, whether transparent video keeps alpha in Remotion.
Pilot: one visual proof (e.g. sum of odd numbers = n^2) rendered end to end before committing.

## 5. Posting, tracking, and "ask Claude to modify"
What LinkedInPost already has (audit): topics in D1 `pipeline_state` + Google Sheet with statuses Pending -> Drafted -> Approved -> Published; dispatcher with ~100 actions; scheduler Durable Object; channel auth for LinkedIn, Instagram (image/carousel only), Gmail, Telegram, WhatsApp, YouTube (OAuth only); trending search incl. YouTube; React dashboard with /topics etc.
Gaps: no video/Reels publish, no YouTube uploader, no video storage (only a GCS image bucket; Workers can't buffer big MP4s), no episode/metrics tables.

Phased approach (least new code first):
- Phase A (do first): file-based registry. Each episode.json gets `status` (idea, scripted, approved, rendered, reviewed, scheduled, posted), `posts[]` (platform, url, date), `topic_area`, `format`, `series`, `sponsor`. `python run.py list` prints the table and writes `EPISODES.md`. Ask me in chat: "list episodes", "what topics exist for physics", "what's posted".
- Phase B: an "Episodes" tab in the existing Google Sheet (or a `/videos` page backed by a new D1 table `video_episodes`, gated by a new `videoEpisodes` flag in features.yaml). Sheet first (S), page later (M).
- "Ask me to modify": a Claude Code skill `/episode` with verbs: new <topic> [format] [sponsor], list, show <id>, revise <id> "<change>" (edits episode.json; only changed scenes regenerate), rerender <id>, approve <id>, package <id>, mark-posted <id> <platform> <url>. Requires content-hash caching (today the cache is "file exists", so edits to a scene would not regenerate; fix in v2.0).
- Posting: step 1 manual upload using the package (fastest to real results). Step 2 automate. Options: (a) extend LinkedInPost: add `kind: video` publish branch, YouTube resumable uploader, Instagram Reels container + status polling, signed upload of large MP4 from the render machine (effort M-L; YouTube API project must pass compliance audit or uploads stay private; check upload quotas, sources disagree); (b) a hosted/self-hosted scheduler such as Postiz (less code, one more service). Decision needed.
- Analytics loop (later): YouTube `videos.list` stats and Instagram insights into a table; feed retention learnings back into hooks/formats.

## 6. Sponsors and compliance (carry-over rules)
- Sponsor field in episode.json (brand, product, claims, required disclosure, usage rights). Integration formats: native example, product as prop, sponsored explainer, affiliate, bumper, series sponsorship.
- Disclose in the content itself (spoken/visual) AND use the platform paid-promotion tool; AI-generated endorser needs its own clear disclosure. Platform AI-content labels are chosen at upload (not burned into the frame, per your preference).
- YouTube: avoid mass-produced sameness; keep human direction and variation. Sensitive topics (health, finance claims) get a stricter source gate.
- Sponsor pay: no reliable data found; start with affiliate/product-for-content and pitch using your own retention data.

## 7. Roadmap
| Version | Scope | Acceptance |
|---|---|---|
| v2.0 Director system | `direction/` assets, `/episode new`, lint, content-hash caching, registry + `list` | Topic "why is the sky blue" (different format than ep01) goes topic -> approved script -> video with no hand-written scene code; edit one line and only that scene regenerates |
| v2.1 Formats | 3 Remotion templates (versus, chart, timeline) + format-specific beat sheets | One video in each new format |
| v2.2 Math | ManimCE Docker + pilot | One visual-proof video end to end |
| v2.3 Tracking UI | Sheet tab or `/videos` page + status sync | You can see all episodes/topics/posted status without asking me |
| v2.4 Posting | YouTube Shorts + Reels automation (or Postiz) + analytics poll | One episode posted to both via the tool |
| v2.5 Sponsors | sponsor field, disclosure checks, media kit from real analytics | One sponsored mock episode passes disclosure checklist |
Further improvements (backlog): voice clone of the owner, multiple music moods, character reference images / best-of-N keyframe pick, A/B hooks, cover-frame generator, multi-language.

## 8. Decisions needed from the owner
1. Manim: OK to use ManimCE via pip/Docker and keep 3b1b/videos as an outside reference (licence), instead of forking both?
2. Tracking: Google Sheet tab first, or build the `/videos` page directly?
3. Posting: manual first then LinkedInPost extension, or Postiz?
4. Next sample topics: ep02 (science, e.g. why the sky is blue?) and a math pilot.
