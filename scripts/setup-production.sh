#!/bin/bash
set -e

# LinkedIn Post Setup Launcher - Production
# This script sets up the project for production use

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║            LinkedIn Post - Production Setup                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Parse arguments
SKIP_INTERACTIVE=false
SKIP_DEPS=false
SKIP_CLOUDFLARE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-interactive)
            SKIP_INTERACTIVE=true
            shift
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --skip-cloudflare)
            SKIP_CLOUDFLARE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

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
    exit 1
fi

echo ""

# Run Python setup if available
if [ -f "$PROJECT_ROOT/setup.py" ]; then
    echo -e "${CYAN}Running Python setup...${NC}"
    cd "$PROJECT_ROOT"

    PYTHON_ARGS="--install-worker-deps"
    if [ "$SKIP_CLOUDFLARE" = false ]; then
        PYTHON_ARGS="$PYTHON_ARGS --cloudflare --deploy-worker"
    fi

    python3 setup.py $PYTHON_ARGS 2>&1 || true
    echo ""
fi

# Install frontend dependencies
if [ "$SKIP_DEPS" = false ]; then
    echo -e "${CYAN}Installing frontend dependencies...${NC}"
    cd "$PROJECT_ROOT/frontend"
    npm install 2>&1
    echo ""
fi

# Generate features
if [ -f "$PROJECT_ROOT/scripts/generate_features.py" ]; then
    echo -e "${CYAN}Generating features...${NC}"
    python3 "$PROJECT_ROOT/scripts/generate_features.py" 2>&1 || true
    echo ""
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete!                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Configure environment variables:"
echo "     - Copy frontend/.env.example to frontend/.env"
echo "     - Copy worker/.dev.vars.example to worker/.dev.vars (if exists)"
echo ""
echo "  2. Start development server:"
echo "     cd frontend && npm run dev"
echo ""
echo "  3. Or run the setup wizard for interactive configuration:"
echo "     ./scripts/setup-local.sh"
echo ""