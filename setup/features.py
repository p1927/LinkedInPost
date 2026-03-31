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
    out = dict(defaults)
    if 'newsResearch' in raw and isinstance(raw['newsResearch'], bool):
        out['newsResearch'] = raw['newsResearch']
    return out


def run_generate_features_script() -> None:
    script = ROOT / 'scripts' / 'generate_features.py'
    if not script.is_file():
        return
    try:
        subprocess.run([sys.executable, str(script)], cwd=str(ROOT), check=True)
    except (subprocess.CalledProcessError, OSError) as exc:
        warn('generate_features.py', f'could not refresh feature flags: {exc}')
