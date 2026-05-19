#!/bin/bash
echo "Stopping Wrangler worker..."
if [ -f /tmp/wrangler-test.pid ]; then
  PID=$(cat /tmp/wrangler-test.pid)
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    # Give process time to exit gracefully
    for i in $(seq 1 10); do
      if ! kill -0 "$PID" 2>/dev/null; then
        echo "Gracefully stopped PID $PID"
        break
      fi
      sleep 0.5
    done
    # Force kill if still alive
    if kill -0 "$PID" 2>/dev/null; then
      kill -9 "$PID" 2>/dev/null && echo "Force-killed PID $PID" || true
    fi
  else
    echo "Process $PID already gone"
  fi
  rm -f /tmp/wrangler-test.pid
fi
pkill -f "wrangler dev" 2>/dev/null || true
echo "Worker stopped."
