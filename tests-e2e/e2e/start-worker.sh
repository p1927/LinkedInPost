#!/bin/bash
WORKER_DIR="/home/openclaw/workspaces/linkedin-post/worker"
LP_ROOT="/home/openclaw/workspaces/linkedin-post"
BUNDLE_OUT="/tmp/worker-bundle.js"

echo "Building worker bundle..."
cd "$WORKER_DIR"
"$LP_ROOT/node_modules/.bin/esbuild" src/index.ts --bundle --platform=browser --target=es2022 --format=esm --define:global=globalThis --outfile="$BUNDLE_OUT" 2>&1 | tail -2

echo "Killing any existing wrangler on port 8787..."
pkill -f 'wrangler.*8787' 2>/dev/null || true
pkill -f workerd 2>/dev/null || true
sleep 2

echo "Starting Wrangler dev worker on port 8787 (no-bundle mode)..."
cd "$WORKER_DIR"
NODE_OPTIONS="--max-old-space-size=1024" nohup ./node_modules/.bin/wrangler dev "$BUNDLE_OUT" --config wrangler.jsonc --env local --port 8787 --no-bundle --show-interactive-dev-session=false > /tmp/wrangler-test.log 2>&1 &
WORKER_PID=$!
echo "$WORKER_PID" > /tmp/wrangler-test.pid

echo "Waiting for worker to start..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:8787 >/dev/null 2>&1; then
    echo "Worker ready (PID: $WORKER_PID)"
    exit 0
  fi
  sleep 1
done
echo "Worker failed to start after 60s. Check /tmp/wrangler-test.log"
exit 1
