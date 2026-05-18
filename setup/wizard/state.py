from __future__ import annotations

import json
from pathlib import Path

STATE_FILE = Path('.wizard_state.json')  # resolved relative to cwd

_state: dict | None = None  # module-level cache set by mark_complete()

STEPS = ['mode', 'prereqs', 'google', 'cloudflare', 'apikeys', 'deploy', 'verify']

def load() -> dict:
    """Load the wizard state from the JSON file.

    Always reads the file defined by ``STATE_FILE`` (which may be patched in tests).
    Ensures all known steps are present with default ``False``.
    """
    if STATE_FILE.exists():
        try:
            data = json.loads(STATE_FILE.read_text())
        except Exception:
            data = {}
    else:
        data = {}
    for step in STEPS:
        data.setdefault(step, False)
    return data


def mark_complete(step: str) -> None:
    """Mark a step as completed, preserving other steps.

    Loads the existing state (or defaults), sets the given ``step`` to ``True``
    and writes the updated JSON back to ``STATE_FILE``.
    """
    state = load()
    state[step] = True
    STATE_FILE.write_text(json.dumps(state, indent=2))
    global _state
    _state = state


def is_complete(step: str) -> bool:
    """Return completion status for a given step.

    Uses cached ``_state`` if available (set by ``mark_complete()``), otherwise reads
    from the persisted state file via ``load()``.
    """
    if _state is not None:
        return _state.get(step, False)
    return load().get(step, False)


def reset() -> None:
    global _state
    _state = None
    STATE_FILE.unlink(missing_ok=True)
