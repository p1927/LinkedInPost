# v1 - Episode 1 out the door

Definition of done: `video-pipeline/out/ep01-interest-rates/final.mp4` (9:16, ~45-60 s, voiced,
captioned, explainer + story clips) plus `carousel/*.png`, produced by documented commands.

## Tracker
| # | Sub-plan | Status |
|---|---|---|
| 01 | Forks + submodules | DONE (4 forks on p1927, shallow submodules) |
| 02 | Provider adapters + providers.yaml | DONE (config/providers.yaml + adapters/: MiniMax TTS, image, video behind class_path loader) |
| 03 | Direction + episode.json schema, ep01 written | DONE (episodes/ep01-interest-rates/episode.json; beats, style bible, sources) |
| 04 | Voice: MiniMax Speech + word timings | DONE (MiniMax speech-2.8-hd, voice English_WiseScholar, whole-word timings; voice CLONE deferred) |
| 05 | Remotion app + render (native, then Docker) | DONE (remotion-app: 6 explainer templates + kinetic captions; host render 78s; Docker render verified; loudnorm -14 LUFS) |
| 06 | Story clips (MiniMax image -> Hailuo) | DONE (2 keyframes -> 2 Hailuo-2.3 clips, 768P/6s) |
| 07 | Carousel stills | DONE (7 slides, 1080x1350 via remotion still) |
| 08 | Publishing (draft only, v1.1) | DEFERRED |
| 09 | Episode 1 assembly + review | DONE - out/ep01-interest-rates/final.mp4 (1080x1920, 52.2s) + carousel + publish.md |

## Known facts (verified from docs/code)
- MiniMax TTS: POST https://api.minimax.io/v1/t2a_v2, models speech-2.8-hd/turbo etc, `subtitle_enable`, `subtitle_type: word`.
  Voice-clone endpoints are not in that doc page (voice clone deferred to v3; use a system voice in v1).
- MiniMax video: POST /v1/video_generation, models MiniMax-Hailuo-2.3 / -02, T2V-01(-Director); async task_id.
- ViMax MiniMax support is chat-only; image/video generators are Google -> we write a MiniMax adapter to its protocols.
- MoneyPrinterTurbo already ships `minimax_tts` in app/services/voice.py.
- Keys present in repo `.env`: MINIMAX_API_KEY, GEMINI_API_KEY (values never printed or copied).

## Risks
- MiniMax plan may not include video/image; fallback = Gemini image + Remotion-only motion; episode still ships.
- Clip character consistency: use reference keyframe -> image-to-video, keep clips short (<=6 s).
