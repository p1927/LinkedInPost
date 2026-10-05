"""Adapters: convert our episode.json / storyboard into the shapes that the OpenMontage
risk scorers expect, then run them and return their results.

The copied OpenMontage files live in third_party/openmontage/ (AGPL; see NOTICE there).
This file is our thin glue (~20 lines each adapter) — no scorer logic is written here.

Usage:
  from tools.risk_adapters import slideshow_score, variation_score, delivery_promise_score
  results = slideshow_score(episode)
  results = variation_score(episode)
  results = delivery_promise_score(episode)
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

# Make sure third_party is importable when run from anywhere inside video-pipeline/.
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from third_party.openmontage.slideshow_risk import score_slideshow_risk
from third_party.openmontage.variation_checker import check_scene_variation
from third_party.openmontage.delivery_promise import classify_from_brief, PromiseType


# ------------------------------------------------------------------ scene adapter
def _ep_scene_to_om(scene: dict) -> dict:
    """Map one episode.json scene to the OpenMontage scene dict shape.

    The scorers look for: type, description, shot_language, shot_intent,
    information_role, narrative_role, hero_moment, texture_keywords.
    """
    vis = scene.get("visual") or {}
    vis_type = vis.get("type", "unknown")
    # Map our types to OM types (best-effort; unknown stays unknown)
    _type_map = {
        "illustration": "image",
        "clip": "video",
        "number": "stat_card",
        "compare": "kpi_grid",
        "steps": "text_card",
        "diagram": "image",
        "text": "text_card",
        "photo": "image",
    }
    om_type = _type_map.get(vis_type, vis_type)

    # Build a description from narration + prompt fields
    description_parts = []
    if scene.get("narration"):
        description_parts.append(scene["narration"][:120])
    for key in ("keyframe_prompt", "motion_prompt", "prompt", "caption"):
        if vis.get(key):
            description_parts.append(vis[key][:80])
            break

    # Shot intent from scene.intent or beat
    shot_intent = scene.get("intent") or scene.get("beat") or ""

    # Movement: clip scenes have motion_prompt; illustration/text are static
    camera_movement = "unspecified"
    if vis_type == "clip" and vis.get("motion_prompt"):
        camera_movement = "moving"

    return {
        "id": scene.get("id", ""),
        "type": om_type,
        "description": " ".join(description_parts),
        "shot_language": {
            "shot_size": vis.get("shot_size", "unspecified"),
            "camera_movement": camera_movement,
            "lighting_key": vis.get("lighting_key"),
        },
        "shot_intent": shot_intent,
        "information_role": scene.get("beat"),
        "narrative_role": scene.get("beat"),
        "hero_moment": scene.get("beat") in ("payoff", "story_payoff", "term"),
        "texture_keywords": vis.get("texture_keywords"),
    }


def _adapt_scenes(episode: dict) -> list[dict]:
    return [_ep_scene_to_om(s) for s in episode.get("scenes", [])]


# ------------------------------------------------------------------ public API
def slideshow_score(episode: dict) -> dict[str, Any]:
    """Run OpenMontage slideshow-risk scorer on an episode. Returns full result dict."""
    om_scenes = _adapt_scenes(episode)
    return score_slideshow_risk(
        scenes=om_scenes,
        renderer_family="remotion",
        render_runtime="remotion",
    )


def variation_score(episode: dict) -> dict[str, Any]:
    """Run OpenMontage variation checker on an episode. Returns full result dict."""
    om_scenes = _adapt_scenes(episode)
    return check_scene_variation(om_scenes)


def delivery_promise_score(episode: dict) -> dict[str, Any]:
    """Classify and validate the delivery promise for an episode."""
    # Determine pipeline type from format / format_id
    fmt = episode.get("format_id") or episode.get("format", {}).get("id", "")
    clip_types = {"clip", "video"}
    scenes = episode.get("scenes", [])
    has_clips = any(
        (s.get("visual") or {}).get("type") in clip_types
        for s in scenes
    )
    user_intent = {
        "motion_required": has_clips,
        "has_footage": False,
        "tone": "educational",
        "quality": "presentable",
    }
    pipeline_type = "animated-explainer"
    if has_clips:
        pipeline_type = "hybrid"

    promise = classify_from_brief(pipeline_type, user_intent)

    # Build cut list from scenes
    cuts = []
    for s in scenes:
        vis = s.get("visual") or {}
        vtype = vis.get("type", "image")
        cuts.append({"type": vtype, "source": ""})

    validation = promise.validate_cuts(cuts)
    return {
        "promise_type": promise.promise_type.value,
        "tone_mode": promise.tone_mode,
        "quality_floor": promise.quality_floor,
        "motion_required": promise.motion_required,
        "validation": validation,
    }


# ------------------------------------------------------------------ CLI helper
if __name__ == "__main__":
    import json, argparse
    parser = argparse.ArgumentParser(description="Run risk adapters on an episode.json")
    parser.add_argument("episode_json", help="Path to episode.json")
    parser.add_argument("--check", choices=["slideshow", "variation", "promise", "all"], default="all")
    args = parser.parse_args()

    ep = json.loads(Path(args.episode_json).read_text())
    if args.check in ("slideshow", "all"):
        r = slideshow_score(ep)
        print(f"\n=== Slideshow Risk [{ep.get('id', '?')}] ===")
        print(f"  average: {r['average']}  verdict: {r['verdict']}")
        for dim, d in r["dimensions"].items():
            print(f"  {dim}: {d['score']} — {d['reason']}")
    if args.check in ("variation", "all"):
        r = variation_score(ep)
        print(f"\n=== Variation Check [{ep.get('id', '?')}] ===")
        print(f"  score: {r['score']}  verdict: {r['verdict']}")
        for v in r["violations"]:
            print(f"  VIOLATION: {v}")
    if args.check in ("promise", "all"):
        r = delivery_promise_score(ep)
        print(f"\n=== Delivery Promise [{ep.get('id', '?')}] ===")
        print(f"  type: {r['promise_type']}  tone: {r['tone_mode']}  valid: {r['validation']['valid']}")
        for v in r["validation"].get("violations", []):
            print(f"  VIOLATION: {v}")
