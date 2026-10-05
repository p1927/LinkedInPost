"""Audio mixer tool wrapping FFmpeg and pydub.

Mixes speech, music, and SFX tracks with support for ducking, fades,
and volume normalization. Falls back to FFmpeg-only mode if pydub is
not installed.
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

from tools.base_tool import (
    BaseTool,
    Determinism,
    ExecutionMode,
    ResourceProfile,
    ToolResult,
    ToolStability,
    ToolStatus,
    ToolTier,
)


class AudioMixer(BaseTool):
    name = "audio_mixer"
    version = "0.1.0"
    tier = ToolTier.CORE
    capability = "audio_processing"
    provider = "ffmpeg"
    stability = ToolStability.EXPERIMENTAL
    execution_mode = ExecutionMode.SYNC
    determinism = Determinism.DETERMINISTIC

    dependencies = ["cmd:ffmpeg"]
    install_instructions = (
        "FFmpeg is required. pydub is optional for advanced mixing:\n"
        "pip install pydub"
    )
    agent_skills = ["ffmpeg", "video-toolkit"]

    capabilities = ["mix", "duck", "fade", "normalize", "extract_audio", "segmented_music"]

    input_schema = {
        "type": "object",
        "required": ["operation"],
        "properties": {
            "operation": {
                "type": "string",
                "enum": ["mix", "duck", "extract", "full_mix", "segmented_music"],
                "description": (
                    "mix: layer multiple tracks with volume/delay/fades. "
                    "duck: lower music volume when speech is present. "
                    "extract: extract audio from video file. "
                    "full_mix: combine narration tracks + music with ducking + normalize "
                    "in a single call (preferred for compose-director). "
                    "segmented_music: mix music into a video only during specified "
                    "time segments (e.g. music during talking head, silence during "
                    "showcase clips)."
                ),
            },
            "tracks": {
                "type": "array",
                "description": (
                    "Audio tracks for mix/duck operations (advanced format). "
                    "For duck, each track needs a 'role' of 'speech' or 'music'. "
                    "For the simple duck API, use primary_audio/secondary_audio instead."
                ),
                "items": {
                    "type": "object",
                    "required": ["path", "role"],
                    "properties": {
                        "path": {"type": "string"},
                        "role": {
                            "type": "string",
                            "enum": ["speech", "music", "sfx", "primary", "secondary"],
                        },
                        "volume": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 1.0,
                            "default": 1.0,
                        },
                        "start_seconds": {"type": "number", "minimum": 0},
                        "fade_in_seconds": {"type": "number", "minimum": 0},
                        "fade_out_seconds": {"type": "number", "minimum": 0},
                    },
                },
            },
            "primary_audio": {
                "type": "string",
                "description": (
                    "Path to primary/speech audio track (duck operation, simple format). "
                    "This is the track that stays at full volume (e.g. narration/dialogue). "
                    "Use with secondary_audio as an alternative to the tracks array."
                ),
            },
            "secondary_audio": {
                "type": "string",
                "description": (
                    "Path to secondary/music audio track (duck operation, simple format). "
                    "This track gets ducked (volume lowered) when primary audio is present. "
                    "Use with primary_audio as an alternative to the tracks array."
                ),
            },
            "duck_level": {
                "type": "number",
                "description": (
                    "Ducking attenuation in dB for the secondary track (duck operation, "
                    "simple format). Negative values reduce volume, e.g. -12 means duck "
                    "by 12dB. Converted to a linear ratio internally. Default: -12."
                ),
                "default": -12,
            },
            "input_path": {"type": "string", "description": "Input for extract operation"},
            "output_path": {"type": "string"},
            "ducking": {
                "type": "object",
                "description": (
                    "Advanced ducking parameters. Works with both the simple "
                    "(primary_audio/secondary_audio) and advanced (tracks) formats."
                ),
                "properties": {
                    "enabled": {"type": "boolean", "default": True},
                    "music_volume_during_speech": {
                        "type": "number", "minimum": 0, "maximum": 1.0, "default": 0.15,
                    },
                    "attack_ms": {"type": "number", "default": 200},
                    "release_ms": {"type": "number", "default": 500},
                },
            },
            "normalize": {"type": "boolean", "default": True},
            "loudnorm_target": {
                "type": "number",
                "default": -16,
                "minimum": -40,
                "maximum": 0,
                "description": (
                    "Integrated loudness target (LUFS) for the loudnorm filter when "
                    "normalize=true. Default -16 (Apple Podcasts). Pass -14 for "
                    "YouTube/TikTok/IG per sound-design.md. Matches the "
                    "edit_decisions.metadata.loudnorm_target convention — directors "
                    "should forward that field here so the executed loudness matches "
                    "the platform the asset targets."
                ),
            },
            "video_path": {
                "type": "string",
                "description": (
                    "Path to the assembled video (segmented_music operation). "
                    "Music is mixed into this video's audio at specified segments."
                ),
            },
            "music_path": {
                "type": "string",
                "description": "Path to background music file (segmented_music operation).",
            },
            "music_volume": {
                "type": "number",
                "minimum": 0,
                "maximum": 1.0,
                "default": 0.20,
                "description": "Volume level for music during active segments.",
            },
            "segments": {
                "type": "array",
                "description": (
                    "Time segments where music should play (segmented_music operation). "
                    "Each segment: {start: seconds, end: seconds}. Music fades in/out "
                    "at segment boundaries. Outside these segments, music is silent."
                ),
                "items": {
                    "type": "object",
                    "required": ["start", "end"],
                    "properties": {
                        "start": {"type": "number", "minimum": 0},
                        "end": {"type": "number", "minimum": 0},
                    },
                },
            },
            "fade_duration": {
                "type": "number",
                "default": 0.5,
                "description": "Duration of fade in/out at segment boundaries (seconds).",
            },
            "target_duration": {
                "type": "number",
                "exclusiveMinimum": 0,
                "description": (
                    "full_mix only. Exact output length in seconds. Pads a short "
                    "mix and trims a long mix so audio matches the composition."
                ),
            },
        },
    }

    resource_profile = ResourceProfile(cpu_cores=2, ram_mb=1024, vram_mb=0, disk_mb=500)
    idempotency_key_fields = ["operation", "tracks", "ducking"]
    side_effects = ["writes mixed audio file to output_path"]
    user_visible_verification = [
        "Listen to mixed output and verify speech clarity and music ducking",
    ]

    @staticmethod
    def _loudnorm_filter(inputs: dict[str, Any], in_label: str, out_label: str) -> str:
        """Build a loudnorm filter graph edge honoring the per-call LUFS target.

        The integrated loudness target (``I=``) was historically hard-coded to
        -16 (podcast/Apple). sound-design.md targets -14 for YouTube/TikTok/IG,
        and edit_decisions.metadata.loudnorm_target is the declarative form.
        Forward that value (or pass loudnorm_target directly) so the executed
        loudness matches the target platform instead of silently defaulting.
        """
        target = inputs.get("loudnorm_target", -16)
        try:
            target = float(target)
        except (TypeError, ValueError):
            target = -16.0
        # Clamp to a sane loudness range to avoid malformed ffmpeg args.
        target = max(-40.0, min(0.0, target))
        return f"[{in_label}]loudnorm=I={target}:LRA=11:TP=-1.5[{out_label}]"

    def _track_filters(self, track: dict[str, Any]) -> list[str]:
        """Build per-track filters on the source timeline before scheduling it.

        ``afade=t=out`` defaults to ``st=0``. Applying it after ``adelay``
        therefore fades the delay silence instead of the source audio, leaving
        a delayed track silent by the time it starts. Fade source samples first
        and add the timeline delay last so both fades follow the track itself.
        """
        filters = []
        volume = track.get("volume", 1.0)
        delay_ms = int(track.get("start_seconds", 0) * 1000)
        fade_in = track.get("fade_in_seconds", 0)
        fade_out = track.get("fade_out_seconds", 0)

        if volume != 1.0:
            filters.append(f"volume={volume}")
        if fade_in > 0:
            filters.append(f"afade=t=in:d={fade_in}")
        if fade_out > 0:
            duration_cmd = [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "csv=p=0",
                track["path"],
            ]
            duration = float(self.run_command(duration_cmd).stdout.strip().split("\n")[0])
            fade_start = max(0.0, duration - float(fade_out))
            filters.append(f"afade=t=out:st={fade_start}:d={fade_out}")
        if delay_ms > 0:
            filters.append(f"adelay={delay_ms}|{delay_ms}")

        return filters

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        operation = inputs["operation"]
        start = time.time()

        try:
            if operation == "mix":
                result = self._mix(inputs)
            elif operation == "duck":
                result = self._duck(inputs)
            elif operation == "extract":
                result = self._extract(inputs)
            elif operation == "full_mix":
                result = self._full_mix(inputs)
            elif operation == "segmented_music":
                result = self._segmented_music(inputs)
            else:
                return ToolResult(success=False, error=f"Unknown operation: {operation}")
        except Exception as e:
            return ToolResult(success=False, error=str(e))

        result.duration_seconds = round(time.time() - start, 2)
        return result
