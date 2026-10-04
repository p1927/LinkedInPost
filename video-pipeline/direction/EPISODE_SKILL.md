---
name: episode
description: Create, revise, render, track and publish short explainer video episodes in video-pipeline/. Use for "new episode about X", "list episodes", "revise ep02 hook", "rerender", "approve", "package", "publish", "what's posted".
---

# /episode - video pipeline operator

Work from `/Users/pratyushmishra/Documents/GitHub/LinkedInPost/video-pipeline` and use `.venv/bin/python run.py ...`.
Never print, log or copy secrets from `.env` or `.secrets/`. Do not use git worktrees. Work on main.

## Verbs
- **list / "what's posted"**: `run.py list` (prints table, writes EPISODES.md). `run.py sync` pushes the table to the Google Sheet tab "Episodes" (the /videos page reads it).
- **new <topic> [format] [sponsor]**: act as the director. Follow `direction/director_prompt.md` exactly (research with source URLs, pick format from `direction/format_catalog.yaml`, analogy rules from `direction/audience.yaml`, shots per `direction/shots.md`). Write `episodes/<id>/episode.json` with `status: "scripted"`, then `run.py lint <id>`; fix all errors. Show the user the script + shot list and the Director Notes. STOP: paid generation is blocked until `status` is approved (run.py enforces it).
- **approve <id>**: only after the user clearly approves the script in chat -> `run.py status <id> approved`.
- **build <id>**: `run.py <id> all` (tts, illustrations, keyframes, clips, props, render, carousel). Content-hash cache means only changed scenes regenerate. After render, make a contact sheet with ffmpeg and look at it before reporting; run lint; report honestly what you could and could not verify (you cannot hear audio).
- **revise <id> "<change>"**: edit `episode.json` (narration, prompts, terms), re-run lint, then `run.py <id> all` (only changed scenes cost anything). Keep status unless the change is large (then set back to `scripted` and ask for re-approval).
- **review ok**: when the user says the video is good -> `run.py status <id> reviewed`.
- **package <id>**: ensure `publish.youtube` (title, description incl. sources + "not financial advice" when relevant, tags) and `publish.instagram.caption` exist in episode.json; carousel exists; sponsor disclosure present if sponsor.
- **publish <id> <youtube|instagram>**: ALWAYS run the dry run first (`run.py publish <id> <platform>`), show the user exactly what would be sent, and only run with `--confirm` after the user explicitly says yes to that specific post. YouTube defaults to `--visibility private` (unverified API projects are forced private until Google's audit); never use `--visibility public` unless the user says so. Platform AI/synthetic-content labels are set at upload (YouTube `containsSyntheticMedia` is set by the uploader); no AI text is burned into frames (owner preference).
- **mark-posted <id> <platform> <url>**: add to `posts[]` in episode.json via registry, then `run.py sync`.

## Rules
- Honest reporting: say what is verified (rendered, lint result, frames viewed) vs unverified (audio quality, music taste, upload behaviour).
- Sponsors: follow `direction/sponsor_playbook.md`; spoken/visual disclosure + platform paid-promotion tool; AI-voice endorsement needs its own disclosure.
- Facts: every claim needs a source URL in `claims[]`/`sources`; mark unverifiable claims and keep them out of narration.
- Costs: image/voice are cheap; clips (Hailuo) are the main spend; clip price is not verified. Prefer illustration scenes; use clips for story beats only.
- Vendor repos in `video-pipeline/vendor/` and `reference/` are read-only study material. `reference/3b1b-videos` is CC BY-NC-SA: never copy its code into the pipeline. OpenMontage is AGPL: do not copy its files.
