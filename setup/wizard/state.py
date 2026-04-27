from __future__ import annotations

import json
from pathlib import Path

STATE_FILE = Path('.wizard_state.json')

STEPS = ['prereqs', 'google', 'cloudflare', 'apikeys', 'deploy', 'verify']


def load() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except Exception:
            pass
    return {step: False for step in STEPS}


def mark_complete(step: str) -> None:
    state = load()
    state[step] = True
    STATE_FILE.write_text(json.dumps(state, indent=2))


def is_complete(step: str) -> bool:
    return load().get(step, False)


def reset() -> None:
    STATE_FILE.unlink(missing_ok=True)
