from __future__ import annotations

import subprocess
import sys

from .constants import FEATURES_YAML, ROOT
from .utils import warn


def load_features_map() -> dict[str, bool]:
    defaults: dict[str, bool] = {'newsResearch': True}
    if not FEATURES_YAML.is_file():
        return defaults
    try:
        import yaml
        raw = yaml.safe_load(FEATURES_YAML.read_text()) or {}
    except Exception:
        return defaults
    if not isinstance(raw, dict):
        return defaults
    # Detect duplicate keys (PyYAML silently overwrites with last value)
    keys_seen: set[str] = set()
    for key in raw:
        if key in keys_seen:
            warn('FEATURES_YAML', f'duplicate key {key!r} — last value wins, check features.yaml for duplicates')
        else:
            keys_seen.add(key)
    out = dict(defaults)
    if 'newsResearch' in raw and isinstance(raw['newsResearch'], bool):
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
