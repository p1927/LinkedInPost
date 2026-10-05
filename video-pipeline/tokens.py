"""Design-system token loader and genre-pack selector.
  tokens.load()          -> dict from direction/tokens.yaml
  tokens.thr(section, key)  -> a single numeric threshold
  packs.pack(genre)      -> the format_packs.yaml entry for that genre (or None)
"""
from __future__ import annotations

from pathlib import Path
import yaml

_ROOT = Path(__file__).parent
_TOKENS_FILE = _ROOT / "direction" / "tokens.yaml"
_PACKS_FILE = _ROOT / "direction" / "format_packs.yaml"

_tokens_cache: dict | None = None
_packs_cache: dict | None = None


def load() -> dict:
    """Load (and cache) direction/tokens.yaml."""
    global _tokens_cache
    if _tokens_cache is None:
        _tokens_cache = yaml.safe_load(_TOKENS_FILE.read_text())
    return _tokens_cache


def thr(section: str, key: str, default=None):
    """Convenience: tokens.thr('typography', 'headline_min_px') -> 84."""
    return load().get(section, {}).get(key, default)


# ------------------------------------------------------------------ pack loader
def _packs() -> dict:
    global _packs_cache
    if _packs_cache is None:
        raw = yaml.safe_load(_PACKS_FILE.read_text())
        _packs_cache = {p["id"]: p for p in raw.get("packs", [])}
    return _packs_cache


def pack(genre: str | None) -> dict | None:
    """Return the format-pack entry for *genre*, or None if genre is None or unknown."""
    if not genre:
        return None
    return _packs().get(genre)


def archetype_pool(genre: str | None) -> list[str] | None:
    """Return the archetype pool for *genre*, or None (caller uses full catalog)."""
    p = pack(genre)
    if not p:
        return None
    return p.get("archetype_pool") or None
