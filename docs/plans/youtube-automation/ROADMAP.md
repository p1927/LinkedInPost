# ROADMAP - the one-by-one build plan (supersedes the roadmap table in v2-plan.md)

## PROGRESS (updated 2026-10-05, after implementation pass 1)
| Step | State | Notes |
|---|---|---|
| S1 direction KB | DONE | video-pipeline/direction/ (10 files); evidence tags inside; unverified items flagged |
| S2 lint + hash cache | DONE, tested | cache: unchanged = 0 paid calls, edit = only that scene; lint reads direction/qa_checklist.yaml |
| S3 /episode skill + registry | DONE | skill at .claude/skills/episode (that dir is gitignored; copy in direction/EPISODE_SKILL.md); run.py list/sync/status/lint/publish |
| S4 posting | CODE DONE, NOT LIVE | no paid scheduler. Instagram Reels (Graph API) + YouTube (Data API, private by default) are dry-run tested only. Blocked: IG token expired 2026-06-21 (needs new token); YouTube needs a Google OAuth Desktop client file; IG needs a public URL for the MP4 and the Docker quick tunnel fails TLS on this network (GCS bucket's project has billing disabled) |
| S5 /videos page | DONE, NOT DEPLOYED | worker listEpisodes + /videos route, 269/269 worker tests, frontend typechecks; reads Sheet tab "Episodes" (created and synced). Needs a worker/frontend deploy by the owner |
| S6 episode 2 | SCRIPT READY, AWAITING APPROVAL | ep02-sky-blue (myth-busting), lint clean, paid generation blocked until approved |
| S7-S12 | NOT STARTED | formats, manim, sponsors, analytics, direct uploader, backlog |

Status: PLAN. Nothing below is built yet. Decisions taken by the owner (2026-10-05):
- Build the `/videos` tracking page directly (no Sheet-first detour).
- Posting: pick whatever is simplest to see the full flow immediately.
- Fork OpenMontage, 3b1b/videos, 3b1b/manim -> DONE (p1927 forks, submodules; OpenMontage under video-pipeline/vendor/, 3b1b under video-pipeline/reference/).
Evidence sources: docs/research/video/01-08 and v2-plan.md. Several inputs are secondary/unverified; each step lists what to verify.

## Ground rules decided from the research
1. 3b1b/videos is CC BY-NC-SA 4.0 -> copying its code into a monetized pipeline is not allowed (NonCommercial) and would force ShareAlike on what we copied. We study it and write our own scenes (techniques/ideas are free; copied expression is not). The fork stays as read-only reference. 3b1b/manim is MIT; engine = Manim Community Edition via pip.
2. OpenMontage is AGPL-3.0 and instruction-driven (pipeline YAML + per-stage director markdown skills + Python tools). Do NOT copy its files into this repo (LinkedInPost has a hosted multi-user mode). Use it as a read-only study source; re-express the useful ideas in our own words in `video-pipeline/direction/` and write our own small lint. (Not legal advice.)
3. Install only vetted skills: read every file first. Candidates: Remotion official skills (`npx skills add remotion-dev/skills`), adithya-s-k/manim_skill (MIT, only when we do manim), Rylaispirit cinematic-video-prompt-skill (MIT, markdown). Adapt (read helpers first): Jakeschincariol youtube-agent-skill `yt-script`/`yt-package`, jnMetaCode shot-prompt structure, Yusuke710 manim subtitle-lint. Skip MCP servers and install-script skills.
4. Humans gates stay: approve script before paid generation; review video before posting.
5. No on-frame AI text (owner preference); platform AI-content labels chosen at upload; sponsor disclosure is mandatory when a sponsor exists.

## Steps (do in order; each ends with an acceptance test and a short review with the owner)
| # | Step | Reuse | Deliverable | Acceptance | Owner action |
|---|---|---|---|---|---|
| S1 | Direction knowledge base | our research 01-04 + OpenMontage ideas (re-written) | `video-pipeline/direction/`: audience.yaml, format_catalog.yaml (14 formats w/ beat sheets), hooks.md, script_template.yaml, shots.md, hailuo_cookbook.md, psychology_rules.md, sponsor_playbook.md, director_prompt.md | Files exist, reviewed by owner | Skim + react |
| S2 | Lint + content-hash cache | OpenMontage linter ideas (slideshow-risk, variation, composition) re-implemented | `lint.py` (words/sec, sentence length, hook in scene 1, claims sourced, sponsor disclosure, one idea/scene, text-in-image flag, repeated-structure check); hash-keyed asset cache in run.py | Edit one line in ep01-v2 -> only that scene regenerates; lint passes ep01-v2 and fails a bad fixture | none |
| S3 | `/episode` skill + registry | OpenMontage 'checkpoint/decision log' pattern | skill with verbs new/list/show/revise/rerender/approve/package/mark-posted; episode.json gains status, format, topic_area, series, sponsor, posts[]; `python run.py list` + EPISODES.md | `/episode list` shows ep01-v2; `/episode revise` changes a hook line and re-renders only that scene | none |
| S4 | Posting, first full flow | hosted scheduler behind a tiny `Publisher` adapter (providers.yaml) | Recommended first pick: Upload-Post (free tier for 10 uploads/mo to test the flow; paid tier for daily) - alternative Zernio / Postiz Cloud. They already hold approved Google/Meta apps, so YouTube uploads are not locked private. `publish` stage uploads final.mp4 + publish.md copy, saves post URLs back into episode.json | ep01-v2 posted (use unlisted/private or a test account first) and URL recorded | YOU: create the scheduler account and connect YouTube/Instagram (I will not enter credentials). Confirm prices on its page |
| S5 | `/videos` page in LinkedInPost | LinkedInPost patterns (WORKSPACE_PATHS, sidebar, statusStyles, features.yaml flag) | D1 table `video_episodes`, actions listEpisodes/upsertEpisode, `videoEpisodes` flag, `/videos` list (status badges, links to video/carousel/post URLs), ingest from the local pipeline (`run.py sync`) | Page shows ep01-v2 with status + post URL; sync updates it | none; first task is to decide how the local CLI authenticates to the Worker (the audit found session-based auth only) |
| S6 | Episode 2 from a topic alone | S1-S3 | science episode (e.g. why is the sky blue) in a different format than ep01 (myth-busting or why-is-X), made by `/episode new` | Script approved by owner -> video without hand-written scenes; lint passes | pick/approve topic + script |
| S7 | More formats | Remotion + remotion skills | templates: versus (split), data chart, timeline | one video per format | none |
| S8 | Math with ManimCE | manim_skill (if vetted), own scenes studied from 3b1b/videos | Docker image (arm64 test), 9:16 render, narration-timed scene, composed in Remotion | one visual-proof video | none |
| S9 | Sponsor workflow | sponsor_playbook.md, FTC/platform rules (research 04) | sponsor field, disclosure checks in lint, sponsor beat templates, media-kit generator from real analytics | mock sponsored episode passes disclosure lint | provide a real/mock sponsor brief |
| S10 | Analytics loop | YouTube stats API / Instagram insights via scheduler or direct | metrics in `/videos`; weekly "what worked" note feeding hooks/formats | metrics visible for posted episodes | none |
| S11 | Direct uploader (long term) | extend LinkedInPost publisher (Instagram Reels container + polling; YouTube resumable upload) | `kind: video` publish branch; signed large-file upload | one episode posted without the hosted scheduler | YOU: submit the YouTube API compliance audit early (approval takes time) |
| S12 | Quality backlog | | voice clone, more music moods, character reference images / best-of-N keyframes, cover-frame generator, A/B hooks | per item | per item |

## How you will interact (after S3)
"/episode new 'why is the sky blue' format=myth" -> script for approval; "/episode revise ep02 'make the hook a question'"; "/episode list"; "/episode package ep02"; "/episode mark-posted ep02 youtube <url>". The `/videos` page (S5) shows the same table.

## Verify-before-trusting list
Safe-zone pixel numbers (sources conflict -> keep as config); retention rules (vendor claims -> test on own analytics); scheduler prices and free-tier limits (vendor pages); YouTube upload quota (sources disagree); Remotion licence if the company grows past 3 people; whether ACE-Step output and licence suit monetized use (confirm on model page); Upload-Post/Zernio post-URL fields.

## Known constraints
- MiniMax music API is closed to new accounts (tested). Music = ACE-Step (free hosted demo, no key) or royalty-free files.
- Unattended Claude Code runs can hit subscription limits; keep human-triggered.
- Cost per episode today: MiniMax image/voice (cheap) + clips only for story beats; clip price unverified.
