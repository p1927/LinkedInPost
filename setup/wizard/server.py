from __future__ import annotations

import threading
import webbrowser
from pathlib import Path

from flask import Flask, redirect, render_template, url_for

TEMPLATES_DIR = Path(__file__).parent / 'templates'


def create_app() -> Flask:
    app = Flask(__name__, template_folder=str(TEMPLATES_DIR))
    app.secret_key = 'linkedin-setup-wizard-local'

    from .steps import mode, prereqs, google, cloudflare, apikeys, deploy, verify
    app.register_blueprint(mode.bp)
    app.register_blueprint(prereqs.bp)
    app.register_blueprint(google.bp)
    app.register_blueprint(cloudflare.bp)
    app.register_blueprint(apikeys.bp)
    app.register_blueprint(deploy.bp)
    app.register_blueprint(verify.bp)

    @app.route('/')
    def index():
        return redirect(url_for('mode.show'))

    @app.route('/complete')
    def complete():
        from .state import load
        return render_template('complete.html', wizard_state=load(), current_step='done')

    return app


def run_wizard() -> None:
    app = create_app()
    port = 4242
    url = f'http://localhost:{port}'
    print(f'\nSetup wizard starting at {url}\n')
    # Open browser after 1s so Flask has time to bind
    threading.Timer(1.0, webbrowser.open, args=[url]).start()
    app.run(host='127.0.0.1', port=port, debug=False, use_reloader=False)
