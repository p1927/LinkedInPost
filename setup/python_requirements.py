"""Ensure the current interpreter can import Google setup dependencies (see root requirements.txt)."""

from __future__ import annotations

import sys

from .constants import ROOT
from .utils import fail, ok, run_command, warn


def _google_stack_importable() -> bool:
    try:
        from google.cloud import storage  # noqa: F401
    except ImportError:
        return False
    return True


def ensure_google_setup_python_deps() -> None:
    """If google-cloud-storage (and siblings) are missing, install from requirements.txt.

    SETUP.md documents manual `pip install -r requirements.txt` first; this matches
    that flow using ``sys.executable`` so the same interpreter that runs setup.py
    gets the packages.
    """
    if _google_stack_importable():
        ok('Python dependencies', 'Google client libraries available')
        return

    requirements = ROOT / 'requirements.txt'
    if not requirements.is_file():
        fail('Python dependencies', f'missing {requirements} — cannot auto-install')
        sys.exit(1)

    warn(
        'Python dependencies',
        'Google client libraries not found for this interpreter; running '
        f'`{sys.executable} -m pip install -r requirements.txt` …',
    )
    try:
        run_command(
            [sys.executable, '-m', 'pip', 'install', '-r', str(requirements)],
            cwd=ROOT,
            capture_output=False,
        )
    except RuntimeError as exc:
        fail(
            'Python dependencies',
            f'pip install failed. Install manually: `{sys.executable} -m pip install -r requirements.txt` '
            f'(see SETUP.md). {exc}',
        )
        sys.exit(1)

    if not _google_stack_importable():
        fail(
            'Python dependencies',
            'pip reported success but `from google.cloud import storage` still fails. '
            'Use a venv or check for a conflicting `google` install.',
        )
        sys.exit(1)

    ok('Python dependencies', 'installed from requirements.txt (Google stack verified)')
