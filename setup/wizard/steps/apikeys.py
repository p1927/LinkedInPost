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
