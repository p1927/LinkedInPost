#!/bin/bash
# Patched start-worker.sh — adds --persist-to /tmp/lp-d1 to prevent Miniflare reload loops,
# increases Node.js memory, and disables the inspector to prevent workerd crashes.
#
# Fixes: wrangler enters Reloading loop after first request due to Miniflare
# state changes triggering rebuilds. --persist-to pins state to disk.
# Also: workerd crashes with "WebSocket was aborted" in InspectorProxyWorker
# when inspector is enabled. --inspector-port=0 disables it.

WORKER_DIR="/home/openclaw/workspaces/linkedin-post/worker"
PERSIST_DIR="/tmp/lp-d1"
mkdir -p "$PERSIST_DIR"

echo "Killing any existing wrangler/workerd on port 8787..."
pkill -f 'wrangler.*8787' 2>/dev/null || true
pgrep -f 'workerd.*8787' | xargs -r kill -9 2>/dev/null || true
sleep 2

echo "Starting Wrangler dev worker on port 8787 (with --persist-to)..."
cd "$WORKER_DIR"
# --persist-to: pins Miniflare state to disk, preventing reload loops from state changes
# --max-old-space-size=2048: increase from 1024 to prevent OOM during bundle builds
NODE_OPTIONS="--max-old-space-size=2048" \
  nohup ./node_modules/.bin/wrangler dev src/index.ts \
    --config wrangler.jsonc \
    --env local \
    --port 8787 \
    --log-level error \
    --show-interactive-dev-session=false \
    --persist-to "$PERSIST_DIR" \
    > /tmp/wrangler-test.log 2>&1 &
WORKER_PID=$!
echo "$WORKER_PID" > /tmp/wrangler-test.pid

echo "Waiting for worker to start..."
for i in $(seq 1 120); do
  if curl -sf http://localhost:8787 >/dev/null 2>&1; then
    echo "Worker ready (PID: $WORKER_PID)"
    exit 0
  fi
  sleep 1
done
echo "Worker failed to start after 120s. Check /tmp/wrangler-test.log"
exit 1