# YouTube / Shorts Automation - MASTER PLAN

> Entry point moved: see [../video-pipeline/00-MASTER-PLAN.md](../video-pipeline/00-MASTER-PLAN.md) (layer index with child plans). This file is v1 history.

Owner goal: a running pipeline that turns a topic (and optional sponsor) into a polished 9:16 Short
+ carousel, using third-party components and APIs, at minimal cost. Videos first; code minimal.

Niche: explain places / physics / food / science / economics in simple terms, tied to current events,
sponsors worked in as examples inside the story. Format: story hook -> explainer -> story payoff (+sponsor).

## Principles
1. Reuse over write. Vendor the four forks as submodules; copy/adapt functions, don't rebuild.
2. Every external capability sits behind an adapter selected in `video-pipeline/config/providers.yaml`.
3. Heavy compute is hosted (MiniMax etc.). Local = Remotion render + FFmpeg (Docker-capable).
4. Human gates: approve storyboard before paid clips; approve final before publish.
5. Cache per scene; reruns never re-pay.
6. Project rules: no git commits by the agent, no worktrees, work on `main`.

## Architecture (v1)
```
topic -> [Director: Claude] -> episode.json (scenes, beats, narration, visuals)
      -> TTS adapter (MiniMax Speech, word timings) -> narration.mp3 + words.json
      -> Image adapter (MiniMax image-01)  -> keyframes for story beats
      -> Video adapter (MiniMax Hailuo)    -> story clips (image-to-video)
      -> Remotion app: explainer scenes + captions + sponsor card + clips + audio -> final.mp4 (9:16)
      -> Remotion stills -> carousel PNGs
      -> Publisher adapter (Postiz / YouTube API / LinkedInPost channels) [v1.1]
```

## Vendored forks (submodules under `video-pipeline/vendor/`, all MIT except Remotion's own license)
| Fork | Used for |
|---|---|
| p1927/MoneyPrinterTurbo | MiniMax TTS call + subtitle/word-timing logic, bgm mixing reference |
| p1927/ViMax | `ImageGenerator`/`VideoGenerator` protocols, storyboard + camera-planning prompts, keyframe selection idea |
| p1927/youtube-automation-agent (AgentTube) | fact-check/source gate wording, analytics loop (later), shorts repurposing ideas |
| p1927/remotion | reference/source; runtime is the npm `remotion` package (free for individuals / teams <= 3) |

## Versions
| Version | Scope | Status |
|---|---|---|
| v1 | One finished economics Short + carousel, end to end, locally; adapters in place | DONE (ep01 rendered; review pending) |
| v1.2 | Music, clean frames, ELI5 direction, Remotion packages instead of custom code (see `v1.2-improvements.md`) | DONE - ep01-interest-rates-v2 rendered; owner review pending |
| v2 | Topic->video director system, formats, math (ManimCE), tracking, posting, sponsors - see `v2-plan.md`; step-by-step in `ROADMAP.md` (S1-S12) | PLAN WRITTEN, awaiting owner go |
| v1.1 | Publish drafts to YouTube Shorts / IG Reels via LinkedInPost channels or Postiz | planned |
| v2 (Director + variety slice) | `python run.py director`: news -> sourced topic -> lint-passing episode.json; audience cards pick look/voice/music; profiles + generated music. See `DIRECTOR-AND-VARIETY-PLAN.md` | BUILT 2026-10-05 (incl. verifier agents + approval gate); templates + rotating looks pending |
| (old v2, folded into the new v2) | Director skill for repeatable episodes, series/style bible library, sponsor field, news trigger | planned |
| v3 | Analytics loop, A/B titles/thumbnails, scheduling, voice clone of owner | planned |

## Sub-plans (v1) - see `v1/`
- 00 research baseline (original plan)
- 01 forks + vendor setup
- 02 provider adapters
- 03 direction + episode schema
- 04 voice (MiniMax Speech)
- 05 Remotion render app
- 06 story clips (image -> video)
- 07 carousel
- 08 publishing
- 09 Episode 1: economics (interest rates and inflation)

Progress is tracked in `v1/README.md`.

## Newer plans
- `v2-plan.md` / `ROADMAP.md` (S1-S12): director system, tracking, posting
- `GAPS-AND-IMPROVEMENT-PLAN.md`: explanation-quality gaps and phases P0-P6
- `DIRECTOR-AND-VARIETY-PLAN.md`: the built Director, ownership map (who owns what), vendored-repo reuse map. **Read before editing director/profiles/music code.**

## Compliance rules (non-negotiable)
- YouTube inauthentic-content policy: human-directed variation, original framing, own/clear voice.
- Label synthetic media; sponsor disclosure (paid-promotion flag + on-screen/spoken line); disclose AI voice if endorsing.
- Fact claims in "latest events" must carry a source in episode.json.
