from __future__ import annotations

import sys

import requests
from dotenv import set_key
from flask import Blueprint, redirect, render_template, request, url_for

from ..state import load, mark_complete

ROOT_ENV = '.env'
WORKER_DEV_VARS = 'worker/.dev.vars'
GEN_WORKER_DEV_VARS = 'generation-worker/.dev.vars'

bp = Blueprint('apikeys', __name__)

# Keys written to root .env only
_ROOT_ONLY_KEYS = {
    'GOOGLE_CREDENTIALS_JSON',
    'GITHUB_REPO',
    'GITHUB_PAGES_ORIGIN',
    'CLOUDFLARE_API_TOKEN',
}

# Keys written to generation-worker/.dev.vars (in addition to root .env)
_GEN_WORKER_KEYS = {
    'GEMINI_API_KEY', 'XAI_API_KEY', 'OPENROUTER_API_KEY', 'FAL_API_KEY',
    'STABILITY_API_KEY', 'RUNWAY_API_KEY', 'OPENAI_API_KEY', 'PIXAZO_API_KEY',
    'SERPAPI_API_KEY',
}

# Keys written to worker/.dev.vars (in addition to root .env)
_WORKER_KEYS = {
    'GEMINI_API_KEY', 'XAI_API_KEY', 'OPENROUTER_API_KEY', 'MINIMAX_API_KEY',
    'SERPAPI_API_KEY', 'NEWSAPI_KEY', 'GNEWS_API_KEY', 'NEWSDATA_API_KEY',
    'LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET',
    'INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET',
    'META_APP_ID', 'META_APP_SECRET',
    'GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET',
    'TELEGRAM_BOT_TOKEN',
    'WORKER_SCHEDULER_SECRET', 'SECRET_ENCRYPTION_KEY',
    'GENERATION_WORKER_SECRET',
}


def validate_gemini_key(key: str) -> bool:
    if not key:
        return False
    resp = requests.post(
        f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}',
        json={'contents': [{'parts': [{'text': 'hi'}]}]},
        timeout=10,
    )
    return resp.status_code != 400 and resp.status_code != 401


def _write_key(env_file: str, key: str, value: str) -> None:
    if value:
        set_key(env_file, key, value)


@bp.get('/step/apikeys')
def show():
    return render_template('step_apikeys.html',
                           wizard_state=load(),
                           current_step='apikeys',
                           error=None)


@bp.post('/step/apikeys')
def submit():
    f = request.form

    # Collect all submitted keys
    keys: dict[str, str] = {
        # LLMs
        'GEMINI_API_KEY': f.get('gemini_api_key', '').strip(),
        'XAI_API_KEY': f.get('xai_api_key', '').strip(),
        'OPENROUTER_API_KEY': f.get('openrouter_api_key', '').strip(),
        'MINIMAX_API_KEY': f.get('minimax_api_key', '').strip(),
        # Image generation
        'FAL_API_KEY': f.get('fal_api_key', '').strip(),
        'PIXAZO_API_KEY': f.get('pixazo_api_key', '').strip(),
        'OPENAI_API_KEY': f.get('openai_api_key', '').strip(),
        'STABILITY_API_KEY': f.get('stability_api_key', '').strip(),
        'RUNWAY_API_KEY': f.get('runway_api_key', '').strip(),
        # Social OAuth
        'LINKEDIN_CLIENT_ID': f.get('linkedin_client_id', '').strip(),
        'LINKEDIN_CLIENT_SECRET': f.get('linkedin_client_secret', '').strip(),
        'INSTAGRAM_APP_ID': f.get('instagram_app_id', '').strip(),
        'INSTAGRAM_APP_SECRET': f.get('instagram_app_secret', '').strip(),
        'META_APP_ID': f.get('meta_app_id', '').strip(),
        'META_APP_SECRET': f.get('meta_app_secret', '').strip(),
        'GMAIL_CLIENT_ID': f.get('gmail_client_id', '').strip(),
        'GMAIL_CLIENT_SECRET': f.get('gmail_client_secret', '').strip(),
        'TELEGRAM_BOT_TOKEN': f.get('telegram_bot_token', '').strip(),
        # News / research
        'SERPAPI_API_KEY': f.get('serpapi_api_key', '').strip(),
        'NEWSAPI_KEY': f.get('newsapi_key', '').strip(),
        'GNEWS_API_KEY': f.get('gnews_api_key', '').strip(),
        'NEWSDATA_API_KEY': f.get('newsdata_api_key', '').strip(),
        # Security / infra
        'WORKER_SCHEDULER_SECRET': f.get('worker_scheduler_secret', '').strip(),
        'SECRET_ENCRYPTION_KEY': f.get('secret_encryption_key', '').strip(),
        'GENERATION_WORKER_SECRET': f.get('generation_worker_secret', '').strip(),
    }

    if not keys['GEMINI_API_KEY']:
        return render_template('step_apikeys.html', wizard_state=load(), current_step='apikeys',
                               error='Gemini API key is required (it powers all AI generation).')

    if not validate_gemini_key(keys['GEMINI_API_KEY']):
        return render_template('step_apikeys.html', wizard_state=load(), current_step='apikeys',
                               error='Gemini API key validation failed. Check the key and try again.')

    for k, v in keys.items():
        if not v:
            continue
        _write_key(ROOT_ENV, k, v)
        if k in _WORKER_KEYS:
            _write_key(WORKER_DEV_VARS, k, v)
        if k in _GEN_WORKER_KEYS:
            _write_key(GEN_WORKER_DEV_VARS, k, v)
        # Mirror GENERATION_WORKER_SECRET as WORKER_SHARED_SECRET in generation worker
        if k == 'GENERATION_WORKER_SECRET':
            _write_key(GEN_WORKER_DEV_VARS, 'WORKER_SHARED_SECRET', v)

    mark_complete('apikeys')
    return redirect(url_for('deploy.show'))
