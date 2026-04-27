from __future__ import annotations

import shutil
import subprocess
import sys

from flask import Blueprint, redirect, render_template, url_for

from ..state import load, mark_complete

bp = Blueprint('prereqs', __name__)


def check_prereqs() -> list[dict]:
    checks = []

    # Python >= 3.11
    major, minor = sys.version_info[:2]
    py_ok = (major, minor) >= (3, 11)
    checks.append({'name': 'Python 3.11+', 'ok': py_ok, 'found': f'{major}.{minor}', 'fix': 'Install Python 3.11+ from python.org'})

    # Node >= 18
    node = shutil.which('node')
    if node:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        version = result.stdout.strip().lstrip('v')
        major_node = int(version.split('.')[0]) if version else 0
        checks.append({'name': 'Node.js 18+', 'ok': major_node >= 18, 'found': version or 'not found', 'fix': 'Install Node.js 18+ from nodejs.org'})
    else:
        checks.append({'name': 'Node.js 18+', 'ok': False, 'found': 'not found', 'fix': 'Install Node.js 18+ from nodejs.org'})

    # wrangler
    wrangler = shutil.which('wrangler') or shutil.which('npx')
    checks.append({'name': 'Wrangler CLI', 'ok': bool(wrangler), 'found': wrangler or 'not found', 'fix': 'Run: npm install -g wrangler'})

    # git
    git = shutil.which('git')
    checks.append({'name': 'Git', 'ok': bool(git), 'found': git or 'not found', 'fix': 'Install Git from git-scm.com'})

    return checks


@bp.get('/step/prereqs')
def show():
    checks = check_prereqs()
    all_ok = all(c['ok'] for c in checks)
    return render_template('step_prereqs.html',
                           checks=checks,
                           all_ok=all_ok,
                           wizard_state=load(),
                           current_step='prereqs')


@bp.post('/step/prereqs/complete')
def complete():
    checks = check_prereqs()
    if all(c['ok'] for c in checks):
        mark_complete('prereqs')
    return redirect(url_for('google.show'))
