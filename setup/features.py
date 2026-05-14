from __future__ import annotations

import subprocess
import sys

from .constants import FEATURES_YAML, ROOT
from .utils import warn

__version__ = "0.1.0"


def _detect_duplicate_keys(raw_text: str) -> list[str]:
    """Detect duplicate top-level YAML keys by scanning raw text before parsing."""
    keys_seen: set[str] = set()
    duplicates: list[str] = []
    for line in raw_text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            continue
        if ':' in stripped:
            key = stripped.split(':')[0].strip()
            if key in keys_seen:
                duplicates.append(key)
            else:
                keys_seen.add(key)
    return duplicates


def load_features_map() -> dict[str, bool]:
    defaults: dict[str, bool] = {'newsResearch': True}
    if not FEATURES_YAML.is_file():
        return defaults
    try:
        import yaml
        raw_text = FEATURES_YAML.read_text()
        for key in _detect_duplicate_keys(raw_text):
            warn('FEATURES_YAML', f'duplicate key {key!r} — last value wins, check features.yaml for duplicates')
        raw = yaml.safe_load(raw_text) or {}
    except Exception:
        return defaults
    if not isinstance(raw, dict):
        return defaults
    out = dict(defaults)
    # Prefer snake_case variant if present — it signals a user mistake
    if 'news_research' in raw and isinstance(raw['news_research'], bool):
        warn('FEATURES_YAML', "found 'news_research' (snake_case) in features.yaml — use 'newsResearch' (camelCase) instead; flag value applied")
        out['newsResearch'] = raw['news_research']
    elif 'newsResearch' in raw and isinstance(raw['newsResearch'], bool):
        out['newsResearch'] = raw['newsResearch']
    return out


def run_generate_features_script() -> None:
    script = ROOT / 'scripts' / 'generate_features.py'
    if not script.is_file():
        return
    try:
        subprocess.run(
            [sys.executable, str(script)], cwd=str(ROOT), check=True, timeout=30
        )
    except subprocess.TimeoutExpired:
        warn('generate_features.py', 'timed out after 30s — feature flag refresh skipped')
    except (subprocess.CalledProcessError, OSError) as exc:
        warn('generate_features.py', f'could not refresh feature flags: {exc}')