#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(realpath "$SCRIPT_DIR/../..")"

echo "Cleaning Playwright test artifacts..."
rm -rf "$FRONTEND_DIR/test-results"
rm -rf "$FRONTEND_DIR/playwright-report"
rm -rf /tmp/playwright* 2>/dev/null || true
rm -rf /tmp/pw-* 2>/dev/null || true

echo "Stopping dangling Chromium processes..."
pkill -f "chromium" 2>/dev/null || true
pkill -f ".cache/ms-playwright" 2>/dev/null || true

echo "Stopping Wrangler worker (if from tests)..."
pkill -f "wrangler dev" 2>/dev/null || true
rm -f /tmp/wrangler-test.pid 2>/dev/null || true

echo "Cleanup complete."
