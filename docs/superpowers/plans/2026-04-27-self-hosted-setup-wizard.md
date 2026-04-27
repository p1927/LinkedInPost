# Self-Hosted Setup Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current manual SETUP.md + `setup.py` flow with a web-based setup wizard that a self-hoster can run locally, guiding them step-by-step through every account, API key, and deployment decision — with inline validation, progress tracking, and one-click deploy.

**Architecture:** `python setup.py --web` starts a small Flask server on `localhost:4242`, opens the browser automatically, and serves a multi-step wizard. Each wizard step is an HTML page that POSTs data to a Flask API endpoint, which validates the input (calls the real external API), writes to `.env` / `wrangler.jsonc`, and returns success/error. The final step triggers Cloudflare deployment and streams logs via Server-Sent Events. No React build needed — the wizard uses Jinja2 templates with Tailwind CDN (single-file HTML, no bundler).

**Tech Stack:** Python 3.11+ Flask, Jinja2, `requests`, `webbrowser` (stdlib), Tailwind CSS CDN (wizard UI only, not the main app), existing `setup/` modules reused as library functions.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `setup/wizard/__init__.py` | Create | Empty package marker |
| `setup/wizard/server.py` | Create | Flask app factory, SSE helpers, step registry |
| `setup/wizard/steps/prereqs.py` | Create | Check Python/Node/wrangler/git versions |
| `setup/wizard/steps/google.py` | Create | Validate service account JSON, OAuth client ID |
| `setup/wizard/steps/cloudflare.py` | Create | Validate API token, provision D1 + KV, write wrangler.jsonc |
| `setup/wizard/steps/apikeys.py` | Create | Collect + validate LLM keys, channel OAuth credentials, news keys |
| `setup/wizard/steps/deploy.py` | Create | Run `setup.py --deploy-worker`, stream logs via SSE |
| `setup/wizard/steps/verify.py` | Create | Hit worker health endpoint, check each integration |
| `setup/wizard/templates/base.html` | Create | Shared layout: progress bar, sidebar checklist, Tailwind CDN |
| `setup/wizard/templates/step_prereqs.html` | Create | Step 1: prerequisites checklist |
| `setup/wizard/templates/step_google.html` | Create | Step 2: Google Cloud setup |
| `setup/wizard/templates/step_cloudflare.html` | Create | Step 3: Cloudflare setup |
| `setup/wizard/templates/step_apikeys.html` | Create | Step 4: API keys |
| `setup/wizard/templates/step_deploy.html` | Create | Step 5: Deploy with live log stream |
| `setup/wizard/templates/step_verify.html` | Create | Step 6: Verification dashboard |
| `setup/wizard/templates/complete.html` | Create | Done screen with next-steps checklist |
| `setup/wizard/state.py` | Create | Read/write wizard progress to `.wizard_state.json` |
| `setup.py` | Modify | Add `--web` flag that imports and starts the wizard server |
| `requirements.txt` | Modify | Add `flask>=3.0` (already likely present or add it) |

---

## Task 1: Flask app skeleton + `--web` entrypoint

**Files:**
- Create: `setup/wizard/__init__.py`
- Create: `setup/wizard/server.py`
- Modify: `setup.py`

- [ ] **Step 1: Create the package marker**

```python
# setup/wizard/__init__.py
```

- [ ] **Step 2: Create `setup/wizard/server.py`** with the Flask app factory:

```python
# setup/wizard/server.py
from __future__ import annotations

import threading
import webbrowser
from pathlib import Path

from flask import Flask, redirect, url_for

TEMPLATES_DIR = Path(__file__).parent / 'templates'

def create_app() -> Flask:
    app = Flask(__name__, template_folder=str(TEMPLATES_DIR))
    app.secret_key = 'linkedin-setup-wizard-local'

    from .steps import prereqs, google, cloudflare, apikeys, deploy, verify
    app.register_blueprint(prereqs.bp)
    app.register_blueprint(google.bp)
    app.register_blueprint(cloudflare.bp)
    app.register_blueprint(apikeys.bp)
    app.register_blueprint(deploy.bp)
    app.register_blueprint(verify.bp)

    @app.route('/')
    def index():
        return redirect(url_for('prereqs.show'))

    return app


def run_wizard() -> None:
    app = create_app()
    port = 4242
    url = f'http://localhost:{port}'
    print(f'\n🚀  Setup wizard starting at {url}\n')
    # Open browser after 1s so Flask has time to bind
    threading.Timer(1.0, webbrowser.open, args=[url]).start()
    app.run(host='127.0.0.1', port=port, debug=False, use_reloader=False)
```

- [ ] **Step 3: Add `--web` flag to `setup.py`**

Read the existing `parse_args` function in `setup/cli.py`, then add `--web` argument:

```python
# In setup/cli.py, inside build_parser():
parser.add_argument('--web', action='store_true', help='Start the web-based setup wizard at localhost:4242')
```

Then in `setup.py` `main()`, add before the existing arg handling:

```python
if args.web:
    from setup.wizard.server import run_wizard
    run_wizard()
    return
```

- [ ] **Step 4: Add Flask to requirements**

```bash
grep -q 'flask' requirements.txt || echo 'flask>=3.0' >> requirements.txt
```

- [ ] **Step 5: Test the entrypoint**

```bash
python setup.py --web
```

Expected: browser opens to `http://localhost:4242`, shows Flask "Not Found" (routes not yet registered). Ctrl-C to stop.

- [ ] **Step 6: Commit**

```bash
git add setup/wizard/__init__.py setup/wizard/server.py setup/cli.py setup.py requirements.txt
git commit -m "feat(wizard): add Flask wizard server skeleton and --web flag"
```

---

## Task 2: Wizard state persistence

**Files:**
- Create: `setup/wizard/state.py`

This tracks which steps are complete so the user can resume a half-finished setup.

- [ ] **Step 1: Create `setup/wizard/state.py`**

```python
# setup/wizard/state.py
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
```

- [ ] **Step 2: Commit**

```bash
git add setup/wizard/state.py
git commit -m "feat(wizard): add wizard state persistence"
```

---

## Task 3: Base HTML template (layout)

**Files:**
- Create: `setup/wizard/templates/base.html`

- [ ] **Step 1: Create `setup/wizard/templates/base.html`**

```html
<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="UTF-8">
  <title>LinkedIn Post — Setup Wizard</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="h-full bg-gray-50 font-sans">
<div class="flex h-full">
  <!-- Sidebar -->
  <aside class="w-60 shrink-0 bg-white border-r flex flex-col p-6 gap-2">
    <p class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Setup steps</p>
    {% set steps = [
      ('prereqs',    '1. Prerequisites'),
      ('google',     '2. Google Cloud'),
      ('cloudflare', '3. Cloudflare'),
      ('apikeys',    '4. API Keys'),
      ('deploy',     '5. Deploy'),
      ('verify',     '6. Verify'),
    ] %}
    {% for key, label in steps %}
      {% if wizard_state.get(key) %}
        <div class="flex items-center gap-2 text-green-700 font-medium text-sm">
          <span class="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center text-xs">✓</span>
          {{ label }}
        </div>
      {% elif current_step == key %}
        <div class="flex items-center gap-2 text-blue-700 font-semibold text-sm">
          <span class="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-xs">→</span>
          {{ label }}
        </div>
      {% else %}
        <div class="flex items-center gap-2 text-gray-400 text-sm">
          <span class="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-xs">·</span>
          {{ label }}
        </div>
      {% endif %}
    {% endfor %}
  </aside>

  <!-- Main -->
  <main class="flex-1 overflow-y-auto p-10">
    <div class="max-w-2xl mx-auto">
      {% block content %}{% endblock %}
    </div>
  </main>
</div>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add setup/wizard/templates/base.html
git commit -m "feat(wizard): add base HTML layout template"
```

---

## Task 4: Step 1 — Prerequisites check

**Files:**
- Create: `setup/wizard/steps/prereqs.py`
- Create: `setup/wizard/templates/step_prereqs.html`

- [ ] **Step 1: Create `setup/wizard/steps/prereqs.py`**

```python
# setup/wizard/steps/prereqs.py
from __future__ import annotations

import shutil
import subprocess
import sys

from flask import Blueprint, redirect, render_template, url_for

from ..state import is_complete, load, mark_complete

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
```

- [ ] **Step 2: Create `setup/wizard/templates/step_prereqs.html`**

```html
{% extends "base.html" %}
{% block content %}
<h1 class="text-2xl font-bold mb-2">Prerequisites</h1>
<p class="text-gray-500 mb-8">Make sure these tools are installed before continuing.</p>

<div class="space-y-3 mb-8">
  {% for c in checks %}
  <div class="flex items-center justify-between border rounded-lg px-4 py-3 bg-white">
    <div>
      <p class="font-medium text-sm">{{ c.name }}</p>
      <p class="text-xs text-gray-400">Found: {{ c.found }}</p>
      {% if not c.ok %}
      <p class="text-xs text-red-500 mt-0.5">Fix: {{ c.fix }}</p>
      {% endif %}
    </div>
    <span class="text-lg">{{ '✅' if c.ok else '❌' }}</span>
  </div>
  {% endfor %}
</div>

{% if all_ok %}
<form method="POST" action="/step/prereqs/complete">
  <button class="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
    Continue →
  </button>
</form>
{% else %}
<p class="text-sm text-gray-500">Fix the issues above, then <a href="/step/prereqs" class="text-blue-600 underline">refresh this page</a>.</p>
{% endif %}
{% endblock %}
```

- [ ] **Step 3: Test**

```bash
python setup.py --web
```

Navigate to `http://localhost:4242/step/prereqs` — confirm all checks appear.

- [ ] **Step 4: Commit**

```bash
git add setup/wizard/steps/prereqs.py setup/wizard/templates/step_prereqs.html
git commit -m "feat(wizard): add Step 1 prerequisites check"
```

---

## Task 5: Step 2 — Google Cloud setup

**Files:**
- Create: `setup/wizard/steps/google.py`
- Create: `setup/wizard/templates/step_google.html`

- [ ] **Step 1: Create `setup/wizard/steps/google.py`**

```python
# setup/wizard/steps/google.py
from __future__ import annotations

import json
import os

import requests
from flask import Blueprint, redirect, render_template, request, url_for
from dotenv import set_key

from ..state import load, mark_complete

ENV_FILE = '.env'
bp = Blueprint('google', __name__)


def validate_service_account(json_str: str) -> tuple[bool, str]:
    try:
        data = json.loads(json_str)
    except json.JSONDecodeError:
        return False, 'Invalid JSON'
    required = ['type', 'project_id', 'private_key', 'client_email']
    for field in required:
        if field not in data:
            return False, f'Missing field: {field}'
    if data.get('type') != 'service_account':
        return False, 'JSON must be a service_account key, not ' + data.get('type', '?')
    return True, data['client_email']


def validate_oauth_client_id(client_id: str) -> bool:
    return client_id.endswith('.apps.googleusercontent.com') and len(client_id) > 20


@bp.get('/step/google')
def show():
    existing_client_id = os.environ.get('VITE_GOOGLE_CLIENT_ID', '')
    return render_template('step_google.html',
                           existing_client_id=existing_client_id,
                           wizard_state=load(),
                           current_step='google',
                           error=None,
                           success=None)


@bp.post('/step/google')
def submit():
    sa_json = request.form.get('service_account_json', '').strip()
    client_id = request.form.get('google_client_id', '').strip()

    ok_sa, msg = validate_service_account(sa_json)
    if not ok_sa:
        return render_template('step_google.html',
                               existing_client_id=client_id,
                               wizard_state=load(),
                               current_step='google',
                               error=f'Service account error: {msg}',
                               success=None)

    if not validate_oauth_client_id(client_id):
        return render_template('step_google.html',
                               existing_client_id=client_id,
                               wizard_state=load(),
                               current_step='google',
                               error='OAuth Client ID must end with .apps.googleusercontent.com',
                               success=None)

    # Write to .env
    set_key(ENV_FILE, 'GOOGLE_SERVICE_ACCOUNT_JSON', sa_json)
    set_key(ENV_FILE, 'VITE_GOOGLE_CLIENT_ID', client_id)
    set_key(ENV_FILE, 'GOOGLE_CLIENT_ID', client_id)
    mark_complete('google')
    return redirect(url_for('cloudflare.show'))
```

- [ ] **Step 2: Create `setup/wizard/templates/step_google.html`**

```html
{% extends "base.html" %}
{% block content %}
<h1 class="text-2xl font-bold mb-2">Google Cloud Setup</h1>
<p class="text-gray-500 mb-6">You need a Google Cloud project with a service account and OAuth client.</p>

<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800 space-y-1">
  <p class="font-semibold">Before continuing, complete these steps in Google Cloud Console:</p>
  <ol class="list-decimal list-inside space-y-1">
    <li>Create a project (or select existing)</li>
    <li>Enable: Google Sheets API, Google Drive API, Google Docs API, Cloud Storage API</li>
    <li>Create a Service Account → download JSON key</li>
    <li>Create an OAuth 2.0 Web Client ID (add <code class="bg-blue-100 px-1 rounded">http://localhost:5174</code> and your GitHub Pages URL to Authorized JavaScript Origins)</li>
  </ol>
  <a href="https://console.cloud.google.com" target="_blank" class="inline-block mt-2 text-blue-600 underline">Open Google Cloud Console →</a>
</div>

{% if error %}
<div class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{{ error }}</div>
{% endif %}

<form method="POST" action="/step/google" class="space-y-6">
  <div>
    <label class="block text-sm font-medium mb-1">Service Account JSON key</label>
    <textarea name="service_account_json" rows="8" required
              placeholder='{"type": "service_account", "project_id": "...", ...}'
              class="w-full border rounded-lg px-3 py-2 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"></textarea>
    <p class="text-xs text-gray-400 mt-1">Paste the entire downloaded JSON key file content here.</p>
  </div>

  <div>
    <label class="block text-sm font-medium mb-1">OAuth Client ID</label>
    <input name="google_client_id" type="text" required
           value="{{ existing_client_id }}"
           placeholder="718831604482-xxxx.apps.googleusercontent.com"
           class="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
  </div>

  <button class="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
    Validate & Continue →
  </button>
</form>
{% endblock %}
```

- [ ] **Step 3: TypeScript check** (Python lint):

```bash
python -c "from setup.wizard.steps.google import validate_service_account; print(validate_service_account('{\"type\":\"service_account\",\"project_id\":\"x\",\"private_key\":\"y\",\"client_email\":\"z\"}'))"
```

Expected: `(True, 'z')`

- [ ] **Step 4: Commit**

```bash
git add setup/wizard/steps/google.py setup/wizard/templates/step_google.html
git commit -m "feat(wizard): add Step 2 Google Cloud setup"
```

---

## Task 6: Step 3 — Cloudflare provisioning

**Files:**
- Create: `setup/wizard/steps/cloudflare.py`
- Create: `setup/wizard/templates/step_cloudflare.html`

- [ ] **Step 1: Create `setup/wizard/steps/cloudflare.py`**

Reuse the existing `setup.cloudflare` module functions:

```python
# setup/wizard/steps/cloudflare.py
from __future__ import annotations

import os
import subprocess

import requests
from dotenv import set_key
from flask import Blueprint, redirect, render_template, request, url_for

from ..state import load, mark_complete

ENV_FILE = '.env'
bp = Blueprint('cloudflare', __name__)


def validate_cf_token(token: str) -> tuple[bool, str]:
    resp = requests.get(
        'https://api.cloudflare.com/client/v4/user/tokens/verify',
        headers={'Authorization': f'Bearer {token}'},
        timeout=10,
    )
    if not resp.ok:
        return False, 'Request failed'
    data = resp.json()
    if data.get('success'):
        return True, data['result']['status']
    return False, str(data.get('errors', 'Unknown error'))


def get_cf_account_id(token: str) -> str | None:
    resp = requests.get(
        'https://api.cloudflare.com/client/v4/accounts',
        headers={'Authorization': f'Bearer {token}'},
        timeout=10,
    )
    if not resp.ok:
        return None
    accounts = resp.json().get('result', [])
    return accounts[0]['id'] if accounts else None


@bp.get('/step/cloudflare')
def show():
    return render_template('step_cloudflare.html',
                           wizard_state=load(),
                           current_step='cloudflare',
                           error=None,
                           provisioning_done=False)


@bp.post('/step/cloudflare')
def submit():
    token = request.form.get('cloudflare_api_token', '').strip()
    ok, msg = validate_cf_token(token)
    if not ok:
        return render_template('step_cloudflare.html',
                               wizard_state=load(),
                               current_step='cloudflare',
                               error=f'Token validation failed: {msg}',
                               provisioning_done=False)

    set_key(ENV_FILE, 'CLOUDFLARE_API_TOKEN', token)
    os.environ['CLOUDFLARE_API_TOKEN'] = token

    # Run Cloudflare provisioning using existing setup module
    result = subprocess.run(
        ['python', 'setup.py', '--cloudflare'],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        return render_template('step_cloudflare.html',
                               wizard_state=load(),
                               current_step='cloudflare',
                               error=result.stderr or result.stdout,
                               provisioning_done=False)

    mark_complete('cloudflare')
    return redirect(url_for('apikeys.show'))
```

- [ ] **Step 2: Create `setup/wizard/templates/step_cloudflare.html`**

```html
{% extends "base.html" %}
{% block content %}
<h1 class="text-2xl font-bold mb-2">Cloudflare Setup</h1>
<p class="text-gray-500 mb-6">We'll provision your D1 database and KV namespace automatically.</p>

<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
  <p class="font-semibold mb-2">Before continuing:</p>
  <ol class="list-decimal list-inside space-y-1">
    <li>Sign up at <a href="https://dash.cloudflare.com" target="_blank" class="underline">dash.cloudflare.com</a> (free plan is fine)</li>
    <li>Go to My Profile → API Tokens → Create Token</li>
    <li>Use the <strong>"Edit Cloudflare Workers"</strong> template, then add <strong>D1: Edit</strong> permission</li>
    <li>Copy the generated token and paste below</li>
  </ol>
</div>

{% if error %}
<div class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm whitespace-pre-wrap font-mono">{{ error }}</div>
{% endif %}

<form method="POST" action="/step/cloudflare" class="space-y-6">
  <div>
    <label class="block text-sm font-medium mb-1">Cloudflare API Token</label>
    <input name="cloudflare_api_token" type="password" required
           placeholder="Paste your API token here"
           class="w-full border rounded-lg px-3 py-2 text-sm bg-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-400">
    <p class="text-xs text-gray-400 mt-1">We validate this against the Cloudflare API before provisioning.</p>
  </div>

  <button class="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
    Validate & Provision →
  </button>
  <p class="text-xs text-gray-400">This creates your D1 database and KV namespace. Takes ~30 seconds.</p>
</form>
{% endblock %}
```

- [ ] **Step 3: Test the token validator**

```bash
python -c "from setup.wizard.steps.cloudflare import validate_cf_token; print(validate_cf_token('invalid'))"
```

Expected: `(False, ...)`

- [ ] **Step 4: Commit**

```bash
git add setup/wizard/steps/cloudflare.py setup/wizard/templates/step_cloudflare.html
git commit -m "feat(wizard): add Step 3 Cloudflare provisioning"
```

---

## Task 7: Step 4 — API Keys collection

**Files:**
- Create: `setup/wizard/steps/apikeys.py`
- Create: `setup/wizard/templates/step_apikeys.html`

- [ ] **Step 1: Create `setup/wizard/steps/apikeys.py`**

```python
# setup/wizard/steps/apikeys.py
from __future__ import annotations

import requests
from dotenv import set_key
from flask import Blueprint, redirect, render_template, request, url_for

from ..state import load, mark_complete

ENV_FILE = '.env'
bp = Blueprint('apikeys', __name__)


def validate_gemini_key(key: str) -> bool:
    if not key:
        return False
    resp = requests.post(
        f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}',
        json={'contents': [{'parts': [{'text': 'hi'}]}]},
        timeout=10,
    )
    return resp.status_code != 400 and resp.status_code != 401


@bp.get('/step/apikeys')
def show():
    return render_template('step_apikeys.html',
                           wizard_state=load(),
                           current_step='apikeys',
                           error=None)


@bp.post('/step/apikeys')
def submit():
    gemini_key = request.form.get('gemini_api_key', '').strip()
    linkedin_client_id = request.form.get('linkedin_client_id', '').strip()
    linkedin_client_secret = request.form.get('linkedin_client_secret', '').strip()
    instagram_app_id = request.form.get('instagram_app_id', '').strip()
    instagram_app_secret = request.form.get('instagram_app_secret', '').strip()
    telegram_token = request.form.get('telegram_bot_token', '').strip()
    serp_key = request.form.get('serpapi_key', '').strip()
    xai_key = request.form.get('xai_api_key', '').strip()

    if not gemini_key:
        return render_template('step_apikeys.html', wizard_state=load(), current_step='apikeys',
                               error='Gemini API key is required (it powers all AI generation).')

    if not validate_gemini_key(gemini_key):
        return render_template('step_apikeys.html', wizard_state=load(), current_step='apikeys',
                               error='Gemini API key validation failed. Check the key and try again.')

    # Write all keys to .env
    keys = {
        'GEMINI_API_KEY': gemini_key,
        'LINKEDIN_CLIENT_ID': linkedin_client_id,
        'LINKEDIN_CLIENT_SECRET': linkedin_client_secret,
        'INSTAGRAM_APP_ID': instagram_app_id,
        'INSTAGRAM_APP_SECRET': instagram_app_secret,
        'TELEGRAM_BOT_TOKEN': telegram_token,
        'SERPAPI_KEY': serp_key,
        'XAI_API_KEY': xai_key,
    }
    for k, v in keys.items():
        if v:
            set_key(ENV_FILE, k, v)

    mark_complete('apikeys')
    return redirect(url_for('deploy.show'))
```

- [ ] **Step 2: Create `setup/wizard/templates/step_apikeys.html`**

```html
{% extends "base.html" %}
{% block content %}
<h1 class="text-2xl font-bold mb-2">API Keys</h1>
<p class="text-gray-500 mb-6">Enter your API keys below. Only Gemini is required — everything else is optional.</p>

{% if error %}
<div class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{{ error }}</div>
{% endif %}

<form method="POST" action="/step/apikeys" class="space-y-8">

  <section class="space-y-4">
    <h2 class="font-semibold text-gray-700 border-b pb-2">LLM — Required</h2>
    <div>
      <label class="block text-sm font-medium mb-1">Gemini API Key <span class="text-red-500">*</span></label>
      <input name="gemini_api_key" type="password" required
             placeholder="AIza..."
             class="w-full border rounded-lg px-3 py-2 text-sm bg-white font-mono focus:ring-2 focus:ring-blue-400 focus:outline-none">
      <p class="text-xs text-gray-400 mt-1">Get from <a href="https://aistudio.google.com/app/apikey" target="_blank" class="underline text-blue-500">aistudio.google.com</a></p>
    </div>
  </section>

  <section class="space-y-4">
    <h2 class="font-semibold text-gray-700 border-b pb-2">LinkedIn OAuth App — optional (needed to publish to LinkedIn)</h2>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm font-medium mb-1">Client ID</label>
        <input name="linkedin_client_id" type="text" placeholder="86ht5x..." class="w-full border rounded-lg px-3 py-2 text-sm bg-white font-mono focus:ring-2 focus:ring-blue-400 focus:outline-none">
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Client Secret</label>
        <input name="linkedin_client_secret" type="password" placeholder="..." class="w-full border rounded-lg px-3 py-2 text-sm bg-white font-mono focus:ring-2 focus:ring-blue-400 focus:outline-none">
      </div>
    </div>
    <p class="text-xs text-gray-400">Create a LinkedIn Developer App at <a href="https://www.linkedin.com/developers/apps" target="_blank" class="underline text-blue-500">linkedin.com/developers/apps</a>. Required products: Sign In with LinkedIn, Share on LinkedIn.</p>
  </section>

  <section class="space-y-4">
    <h2 class="font-semibold text-gray-700 border-b pb-2">Instagram / Meta — optional</h2>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm font-medium mb-1">App ID</label>
        <input name="instagram_app_id" type="text" placeholder="2367592..." class="w-full border rounded-lg px-3 py-2 text-sm bg-white font-mono focus:ring-2 focus:ring-blue-400 focus:outline-none">
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">App Secret</label>
        <input name="instagram_app_secret" type="password" class="w-full border rounded-lg px-3 py-2 text-sm bg-white font-mono focus:ring-2 focus:ring-blue-400 focus:outline-none">
      </div>
    </div>
  </section>

  <section class="space-y-4">
    <h2 class="font-semibold text-gray-700 border-b pb-2">Other — optional</h2>
    <div>
      <label class="block text-sm font-medium mb-1">Telegram Bot Token</label>
      <input name="telegram_bot_token" type="password" placeholder="123456:ABC-..." class="w-full border rounded-lg px-3 py-2 text-sm bg-white font-mono focus:ring-2 focus:ring-blue-400 focus:outline-none">
      <p class="text-xs text-gray-400 mt-1">Create via <a href="https://t.me/BotFather" target="_blank" class="underline text-blue-500">@BotFather</a> on Telegram.</p>
    </div>
    <div>
      <label class="block text-sm font-medium mb-1">SerpApi Key (for web research)</label>
      <input name="serpapi_key" type="password" placeholder="..." class="w-full border rounded-lg px-3 py-2 text-sm bg-white font-mono focus:ring-2 focus:ring-blue-400 focus:outline-none">
    </div>
    <div>
      <label class="block text-sm font-medium mb-1">xAI / Grok API Key (alternative LLM)</label>
      <input name="xai_api_key" type="password" placeholder="xai-..." class="w-full border rounded-lg px-3 py-2 text-sm bg-white font-mono focus:ring-2 focus:ring-blue-400 focus:outline-none">
    </div>
  </section>

  <button class="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
    Save & Continue →
  </button>
</form>
{% endblock %}
```

- [ ] **Step 3: Commit**

```bash
git add setup/wizard/steps/apikeys.py setup/wizard/templates/step_apikeys.html
git commit -m "feat(wizard): add Step 4 API keys collection with Gemini validation"
```

---

## Task 8: Step 5 — Deploy with live log streaming

**Files:**
- Create: `setup/wizard/steps/deploy.py`
- Create: `setup/wizard/templates/step_deploy.html`

- [ ] **Step 1: Create `setup/wizard/steps/deploy.py`**

```python
# setup/wizard/steps/deploy.py
from __future__ import annotations

import subprocess
import threading
import queue

from flask import Blueprint, Response, render_template, stream_with_context

from ..state import load, mark_complete

bp = Blueprint('deploy', __name__)
_log_queue: queue.Queue = queue.Queue()
_deploy_done = threading.Event()
_deploy_success = threading.Event()


def _run_deploy():
    _deploy_done.clear()
    _deploy_success.clear()
    proc = subprocess.Popen(
        ['python', 'setup.py', '--deploy-worker'],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
    )
    for line in proc.stdout:
        _log_queue.put(line)
    proc.wait()
    if proc.returncode == 0:
        _deploy_success.set()
    _log_queue.put(None)  # sentinel
    _deploy_done.set()


@bp.get('/step/deploy')
def show():
    return render_template('step_deploy.html', wizard_state=load(), current_step='deploy')


@bp.post('/step/deploy/start')
def start():
    threading.Thread(target=_run_deploy, daemon=True).start()
    return ('', 204)


@bp.get('/step/deploy/stream')
def stream():
    def generate():
        while True:
            line = _log_queue.get()
            if line is None:
                if _deploy_success.is_set():
                    mark_complete('deploy')
                    yield 'data: __DONE__\n\n'
                else:
                    yield 'data: __FAILED__\n\n'
                break
            yield f'data: {line.rstrip()}\n\n'
    return Response(stream_with_context(generate()), mimetype='text/event-stream',
                    headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})
```

- [ ] **Step 2: Create `setup/wizard/templates/step_deploy.html`**

```html
{% extends "base.html" %}
{% block content %}
<h1 class="text-2xl font-bold mb-2">Deploy to Cloudflare</h1>
<p class="text-gray-500 mb-6">This deploys the Worker and generation worker to your Cloudflare account. Takes 1-2 minutes.</p>

<div id="start-panel">
  <button id="start-btn" onclick="startDeploy()"
          class="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
    Deploy Now →
  </button>
</div>

<div id="log-panel" class="hidden mt-6">
  <div class="bg-gray-900 text-green-400 font-mono text-xs rounded-xl p-4 h-80 overflow-y-auto" id="log-box"></div>
  <p id="status-msg" class="mt-3 text-sm text-gray-500"></p>
  <a id="next-btn" href="/step/verify" class="hidden mt-3 inline-block px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium">
    Continue →
  </a>
</div>

<script>
async function startDeploy() {
  document.getElementById('start-panel').classList.add('hidden');
  document.getElementById('log-panel').classList.remove('hidden');
  await fetch('/step/deploy/start', { method: 'POST' });
  const logBox = document.getElementById('log-box');
  const es = new EventSource('/step/deploy/stream');
  es.onmessage = function(e) {
    if (e.data === '__DONE__') {
      es.close();
      document.getElementById('status-msg').textContent = '✅ Deploy complete!';
      document.getElementById('next-btn').classList.remove('hidden');
    } else if (e.data === '__FAILED__') {
      es.close();
      document.getElementById('status-msg').textContent = '❌ Deploy failed. See logs above.';
    } else {
      const line = document.createElement('div');
      line.textContent = e.data;
      logBox.appendChild(line);
      logBox.scrollTop = logBox.scrollHeight;
    }
  };
}
</script>
{% endblock %}
```

- [ ] **Step 3: Commit**

```bash
git add setup/wizard/steps/deploy.py setup/wizard/templates/step_deploy.html
git commit -m "feat(wizard): add Step 5 deploy with live SSE log streaming"
```

---

## Task 9: Step 6 — Verification dashboard

**Files:**
- Create: `setup/wizard/steps/verify.py`
- Create: `setup/wizard/templates/step_verify.html`
- Create: `setup/wizard/templates/complete.html`

- [ ] **Step 1: Create `setup/wizard/steps/verify.py`**

```python
# setup/wizard/steps/verify.py
from __future__ import annotations

import json
import os
from pathlib import Path

import requests
from flask import Blueprint, render_template

from ..state import load, mark_complete

bp = Blueprint('verify', __name__)


def get_worker_url() -> str | None:
    wrangler_path = Path('worker/wrangler.jsonc')
    if not wrangler_path.exists():
        return None
    try:
        import re
        text = wrangler_path.read_text()
        # Strip JSONC comments
        text = re.sub(r'//.*', '', text)
        data = json.loads(text)
        name = data.get('name', '')
        # Derive workers.dev URL from worker name
        cf_subdomain = os.environ.get('CLOUDFLARE_SUBDOMAIN', '')
        if cf_subdomain:
            return f'https://{name}.{cf_subdomain}.workers.dev'
        return None
    except Exception:
        return None


def check_worker_health(worker_url: str) -> tuple[bool, str]:
    try:
        resp = requests.get(f'{worker_url}/health', timeout=10)
        return resp.ok, str(resp.status_code)
    except Exception as e:
        return False, str(e)


def check_env_key(key: str) -> bool:
    return bool(os.environ.get(key, '').strip())


@bp.get('/step/verify')
def show():
    worker_url = get_worker_url()
    worker_ok, worker_msg = check_worker_health(worker_url) if worker_url else (False, 'Worker URL unknown')
    checks = [
        {'name': 'Worker responds', 'ok': worker_ok, 'detail': worker_msg},
        {'name': 'Gemini API key set', 'ok': check_env_key('GEMINI_API_KEY'), 'detail': ''},
        {'name': 'Google service account set', 'ok': check_env_key('GOOGLE_SERVICE_ACCOUNT_JSON'), 'detail': ''},
        {'name': 'Cloudflare token set', 'ok': check_env_key('CLOUDFLARE_API_TOKEN'), 'detail': ''},
        {'name': 'LinkedIn configured (optional)', 'ok': check_env_key('LINKEDIN_CLIENT_ID'), 'detail': 'optional'},
        {'name': 'Telegram configured (optional)', 'ok': check_env_key('TELEGRAM_BOT_TOKEN'), 'detail': 'optional'},
    ]
    all_ok = all(c['ok'] for c in checks if 'optional' not in c['detail'])
    if all_ok:
        mark_complete('verify')
    return render_template('step_verify.html',
                           checks=checks,
                           all_ok=all_ok,
                           worker_url=worker_url,
                           wizard_state=load(),
                           current_step='verify')
```

- [ ] **Step 2: Create `setup/wizard/templates/step_verify.html`**

```html
{% extends "base.html" %}
{% block content %}
<h1 class="text-2xl font-bold mb-2">Verification</h1>
<p class="text-gray-500 mb-6">Checking that everything is wired up correctly.</p>

<div class="space-y-3 mb-8">
  {% for c in checks %}
  <div class="flex items-center justify-between border rounded-lg px-4 py-3 bg-white">
    <div>
      <p class="font-medium text-sm">{{ c.name }}</p>
      {% if c.detail %}<p class="text-xs text-gray-400">{{ c.detail }}</p>{% endif %}
    </div>
    <span class="text-lg">{{ '✅' if c.ok else ('⚪' if 'optional' in c.detail else '❌') }}</span>
  </div>
  {% endfor %}
</div>

{% if all_ok %}
  <a href="/complete" class="px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium inline-block">
    Setup complete →
  </a>
{% else %}
  <p class="text-sm text-gray-500 mb-3">Fix the red items above, then <a href="/step/verify" class="text-blue-600 underline">re-run verification</a>.</p>
{% endif %}
{% endblock %}
```

- [ ] **Step 3: Create `setup/wizard/templates/complete.html`**

```html
{% extends "base.html" %}
{% block content %}
<div class="text-center space-y-6 py-12">
  <div class="text-6xl">🎉</div>
  <h1 class="text-3xl font-bold">You're all set!</h1>
  <p class="text-gray-500 max-w-md mx-auto">Your LinkedIn Post Studio is deployed and ready to use. Here's what to do next:</p>

  <div class="text-left border rounded-xl divide-y max-w-md mx-auto">
    <div class="px-4 py-3 flex gap-3 items-start">
      <span class="text-green-500 text-lg mt-0.5">1.</span>
      <div>
        <p class="font-medium text-sm">Open the dashboard</p>
        <p class="text-xs text-gray-400">Run <code class="bg-gray-100 px-1 rounded">npm run dev</code> in the <code>frontend/</code> folder, then open <a href="http://localhost:5174" class="text-blue-500 underline">localhost:5174</a></p>
      </div>
    </div>
    <div class="px-4 py-3 flex gap-3 items-start">
      <span class="text-green-500 text-lg mt-0.5">2.</span>
      <div>
        <p class="font-medium text-sm">Connect your LinkedIn account</p>
        <p class="text-xs text-gray-400">Go to Settings → Connected Accounts → LinkedIn and click Connect.</p>
      </div>
    </div>
    <div class="px-4 py-3 flex gap-3 items-start">
      <span class="text-green-500 text-lg mt-0.5">3.</span>
      <div>
        <p class="font-medium text-sm">Create your first post</p>
        <p class="text-xs text-gray-400">Click New Post, enter a topic, and let the AI generate variants for you.</p>
      </div>
    </div>
    <div class="px-4 py-3 flex gap-3 items-start">
      <span class="text-green-500 text-lg mt-0.5">4.</span>
      <div>
        <p class="font-medium text-sm">Deploy the frontend publicly (optional)</p>
        <p class="text-xs text-gray-400">Run <code class="bg-gray-100 px-1 rounded">npm run build</code> and push <code>dist/</code> to your GitHub Pages branch.</p>
      </div>
    </div>
  </div>

  <p class="text-xs text-gray-400">Configuration saved to <code>.env</code> and <code>worker/wrangler.jsonc</code>.</p>
</div>
{% endblock %}
```

- [ ] **Step 4: Add complete route** to `setup/wizard/server.py`:

```python
@app.route('/complete')
def complete():
    from .state import load
    return render_template('complete.html', wizard_state=load(), current_step='done')
```

- [ ] **Step 5: Commit**

```bash
git add setup/wizard/steps/verify.py setup/wizard/templates/step_verify.html setup/wizard/templates/complete.html setup/wizard/server.py
git commit -m "feat(wizard): add Step 6 verification and completion screen"
```

---

## Task 10: Register all step modules in server.py

**Files:**
- Modify: `setup/wizard/server.py`

- [ ] **Step 1: Ensure all blueprints are imported** in `create_app()`:

```python
from .steps import prereqs, google, cloudflare, apikeys, deploy, verify
app.register_blueprint(prereqs.bp)
app.register_blueprint(google.bp)
app.register_blueprint(cloudflare.bp)
app.register_blueprint(apikeys.bp)
app.register_blueprint(deploy.bp)
app.register_blueprint(verify.bp)
```

- [ ] **Step 2: Create the `steps/__init__.py`** package marker:

```bash
touch setup/wizard/steps/__init__.py
```

- [ ] **Step 3: Full end-to-end test**

```bash
python setup.py --web
```

Walk through all 6 steps with valid inputs. Confirm:
- State persists in `.wizard_state.json` 
- Cloudflare step calls existing `setup.py --cloudflare` (use `--dry-run` if available, or test with real credentials)
- Deploy step streams logs live in the browser
- Verify step shows green for all configured services
- Complete screen shows

- [ ] **Step 4: Commit**

```bash
git add setup/wizard/steps/__init__.py setup/wizard/server.py
git commit -m "feat(wizard): wire all steps into Flask app"
```

---

## Task 11: Update README / SETUP.md

**Files:**
- Modify: `SETUP.md`
- Modify: `README.md`

- [ ] **Step 1: Replace the "Prerequisites" section of `SETUP.md`** with:

```markdown
## Quick Start (Web Wizard)

The fastest way to self-host is the built-in setup wizard:

```bash
pip install -r requirements.txt
python setup.py --web
```

Your browser will open to `http://localhost:4242`. Follow the 6-step wizard:

1. **Prerequisites** — confirms Python, Node, Wrangler, and Git are installed
2. **Google Cloud** — paste your service account key and OAuth Client ID
3. **Cloudflare** — paste your API token; D1 and KV are provisioned automatically
4. **API Keys** — enter Gemini (required) + optional channel credentials
5. **Deploy** — one-click deploy to Cloudflare Workers with live log streaming
6. **Verify** — confirms every integration is live

---

## Manual setup (alternative)
```

Then keep the existing manual steps below that heading unchanged.

- [ ] **Step 2: Add a one-liner to `README.md`** under the "Getting Started" or "Setup" section:

```markdown
### Self-hosting

```bash
pip install -r requirements.txt && python setup.py --web
```
```

- [ ] **Step 3: Commit**

```bash
git add SETUP.md README.md
git commit -m "docs: add web wizard quick start to SETUP.md and README"
```

---

## Verification

- [ ] **End-to-end dry run**: Start `python setup.py --web`, complete all 6 steps with test credentials. Confirm `.wizard_state.json` marks all steps complete.
- [ ] **Resume test**: Kill the server mid-way through step 3. Restart. Confirm already-completed steps show green checkmarks and the wizard resumes at the right step.
- [ ] **Invalid input test**: Enter a bad Gemini key in step 4 — confirm the error message appears inline and the user is not advanced.
- [ ] **Deploy stream test**: In step 5, confirm log lines appear in real time in the browser (not after the deploy completes).
- [ ] **Python import check**: `python -c "from setup.wizard.server import create_app; app = create_app(); print('OK')"` — no import errors.
