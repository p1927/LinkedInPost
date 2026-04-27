# setup/wizard/steps/mode.py
from __future__ import annotations

import re
import subprocess
from pathlib import Path

import yaml
from flask import Blueprint, redirect, render_template, request, url_for

from ..state import load, mark_complete

bp = Blueprint('mode', __name__)
FEATURES_FILE = Path('features.yaml')


def set_deployment_mode(mode: str) -> None:
    text = FEATURES_FILE.read_text()
    new_text = re.sub(r"^deploymentMode:.*$", f"deploymentMode: {mode}", text, flags=re.MULTILINE)
    FEATURES_FILE.write_text(new_text)
    # Regenerate features.ts
    subprocess.run(['python3', 'scripts/generate_features.py'], check=True)


@bp.get('/step/mode')
def show():
    current = 'saas'
    if FEATURES_FILE.exists():
        try:
            data = yaml.safe_load(FEATURES_FILE.read_text())
            current = data.get('deploymentMode', 'saas')
        except Exception:
            pass
    return render_template('step_mode.html', current=current, wizard_state=load(), current_step='mode')


@bp.post('/step/mode')
def submit():
    mode = request.form.get('mode', 'saas')
    if mode not in ('saas', 'selfHosted'):
        mode = 'saas'
    set_deployment_mode(mode)
    mark_complete('mode')
    return redirect(url_for('prereqs.show'))
