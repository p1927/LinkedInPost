#!/bin/bash
set -e

# LinkedIn Post Setup Launcher - Local Development
# This script launches the interactive onboarding UI for local development

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           LinkedIn Post - Local Development Setup            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check for required tools
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}✗${NC} $1 is required but not installed."
        MISSING=true
    else
        echo -e "${GREEN}✓${NC} $1 found"
    fi
}

MISSING=false
echo "Checking requirements..."
check_command "node"
check_command "npm"
check_command "python3"

if [ "$MISSING" = true ]; then
    echo ""
    echo -e "${YELLOW}Please install the missing requirements before continuing.${NC}"
    echo "Node.js: https://nodejs.org/"
    echo "Python: https://www.python.org/"
    exit 1
fi

echo ""
echo -e "${GREEN}✓${NC} All requirements met"
echo ""

# Launch the setup wizard
echo "Launching setup wizard..."
echo ""

# Start the setup wizard server on port 3456
cd "$PROJECT_ROOT/frontend"
npm run setup-wizard &

SETUP_PID=$!
sleep 3

# Open browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3456 2>/dev/null || true
elif command -v open &> /dev/null; then
    open http://localhost:3456 2>/dev/null || true
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Setup wizard is running at: http://localhost:3456"
echo ""
echo "  Press Ctrl+C to stop the wizard"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Wait for the setup wizard to complete or be interrupted
wait $SETUP_PID