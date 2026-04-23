#!/bin/bash
echo "Stopping Wrangler worker..."
if [ -f /tmp/wrangler-test.pid ]; then
  PID=$(cat /tmp/wrangler-test.pid)
  kill "$PID" 2>/dev/null && echo "Killed PID $PID" || echo "Process already gone"
  rm -f /tmp/wrangler-test.pid
fi
pkill -f "wrangler dev" 2>/dev/null || true
echo "Worker stopped."
