#!/bin/bash
WORKER_DIR="/home/openclaw/workspaces/linkedin-post/worker"

echo "Starting Wrangler dev worker on port 8787..."
cd "$WORKER_DIR"
npm run dev > /tmp/wrangler-test.log 2>&1 &
WORKER_PID=$!
echo $WORKER_PID > /tmp/wrangler-test.pid

echo "Waiting for worker to start..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8787 >/dev/null 2>&1; then
    echo "Worker ready (PID: $WORKER_PID)"
    exit 0
  fi
  sleep 1
done
echo "Worker failed to start after 30s. Check /tmp/wrangler-test.log"
exit 1
