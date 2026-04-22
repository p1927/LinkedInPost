#!/bin/bash
set -e

# LinkedIn Post Setup Launcher
# Launches the interactive onboarding UI

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 LinkedIn Post Setup Launcher"
echo "================================"

# Check for required tools
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "❌ $1 is required but not installed."
        exit 1
    fi
}

# Check npm/node for frontend
if ! command -v node &> /dev/null; then
    echo "⚠️  Node.js not found. The setup wizard needs Node.js to run."
    echo "   Please install Node.js first: https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "⚠️  npm not found. Please install npm."
    exit 1
fi

# Launch the setup wizard
echo ""
echo "📦 Launching setup wizard..."
echo ""

# Start the setup wizard server on port 3456
cd "$PROJECT_ROOT/frontend"
npm run setup-wizard &

SETUP_PID=$!
sleep 3

# Open browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3456
elif command -v open &> /dev/null; then
    open http://localhost:3456
else
    echo ""
    echo "✅ Setup wizard is running at: http://localhost:3456"
    echo "   Please open this URL in your browser."
fi

echo ""
echo "Press Ctrl+C to stop the setup wizard"
echo ""

# Wait for the setup wizard to complete or be interrupted
wait $SETUP_PID