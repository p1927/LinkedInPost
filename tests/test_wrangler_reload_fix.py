"""Regression test: wrangler reload loop fix.

Root cause: D1 SQLite WAL writes triggered Miniflare file watcher causing
endless Reloading after first request.
Fix: start-worker-patched.sh uses --persist-to /tmp/lp-d1 to pin state
outside wrangler's watch directory.

This test verifies the fix by starting the worker and checking no
"Reloading" lines appear after handling requests.
"""

import subprocess
import time
import os
import pytest


def test_wrangler_no_reload_loop():
    """Verify worker handles requests without entering reload loop."""
    # Kill any existing workers
    subprocess.run(["pkill", "-f", "workerd.*8787"], capture_output=True)
    subprocess.run(["pkill", "-f", "wrangler.*8787"], capture_output=True)
    time.sleep(2)

    log_path = "/tmp/wrangler-regression-test.log"
    persist_dir = "/tmp/lp-d1-regression"
    os.makedirs(persist_dir, exist_ok=True)

    # Start worker
    env = os.environ.copy()
    env["NODE_OPTIONS"] = "--max-old-space-size=2048"
    worker_dir = "/home/openclaw/workspaces/linkedin-post/worker"

    proc = subprocess.Popen(
        ["./node_modules/.bin/wrangler", "dev", "src/index.ts",
         "--config", "wrangler.jsonc", "--env", "local",
         "--port", "8787", "--log-level", "error",
         "--show-interactive-dev-session=false",
         "--persist-to", persist_dir],
        cwd=worker_dir,
        stdout=open(log_path, "w"),
        stderr=subprocess.STDOUT,
        env=env,
    )

    try:
        # Wait for worker to be ready
        for _ in range(120):
            if subprocess.run(["curl", "-sf", "http://localhost:8787"],
                              capture_output=True).returncode == 0:
                break
            time.sleep(1)
        else:
            pytest.fail("Worker failed to start within 120s")

        # Fire 5 requests
        for i in range(5):
            subprocess.run(["curl", "-sf", "http://localhost:8787"],
                           capture_output=True)
            time.sleep(0.5)

        # Give log time to flush
        time.sleep(2)

        # Check for Reloading lines
        with open(log_path) as f:
            content = f.read()

        reload_count = content.count("Reloading")
        assert reload_count == 0, f"Found {reload_count} 'Reloading' lines in log — reload loop not fixed!"
    finally:
        proc.terminate()
        proc.wait(timeout=10)
        subprocess.run(["pkill", "-f", "workerd.*8787"], capture_output=True)
        subprocess.run(["pkill", "-f", "wrangler.*8787"], capture_output=True)
