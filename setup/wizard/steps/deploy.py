from __future__ import annotations

import queue
import subprocess
import sys
import threading

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
        [sys.executable, 'setup.py', '--deploy-worker'],
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
