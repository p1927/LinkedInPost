#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════════════════════
# LinkedIn Post - Unified Setup Launcher
# Single entry point for local development and production
# ═══════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MODE="${1:-local}"  # local (default) or production/production

# ─────────────────────────────────────────────────────────────────────
# Color codes
# ─────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────
# Logging helpers
# ─────────────────────────────────────────────────────────────────────
log() { echo -e "${CYAN}[start.sh]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
error() { echo -e "${RED}[error]${NC} $*" >&2; }
success() { echo -e "${GREEN}✓${NC} $*"; }

# ─────────────────────────────────────────────────────────────────────
# Parse arguments
# ─────────────────────────────────────────────────────────────────────
SKIP_DEPS=false
SKIP_CLOUDFLARE=false
SKIP_WIZARD=false
SKIP_APP=false
RESET_DB=false
CLEAR_CACHE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-deps) SKIP_DEPS=true; shift ;;
        --skip-cloudflare) SKIP_CLOUDFLARE=true; shift ;;
        --skip-wizard) SKIP_WIZARD=true; shift ;;
        --skip-app) SKIP_APP=true; shift ;;
        --reset-db) RESET_DB=true; shift ;;
        --clear-cache) CLEAR_CACHE=true; shift ;;
        local|production) MODE="$1"; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# ─────────────────────────────────────────────────────────────────────
# Check requirements
# ─────────────────────────────────────────────────────────────────────
check_command() {
    if ! command -v "$1" &> /dev/null; then
        error "$1 is required but not installed."
        MISSING=true
    else
        success "$1 found"
    fi
}

log "Checking requirements..."
MISSING=false
check_command "node"
check_command "npm"
check_command "python3"

if [ "$MISSING" = true ]; then
    error "Please install the missing requirements before continuing."
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────
# Load .env if exists
# ─────────────────────────────────────────────────────────────────────
if [ -f "$PROJECT_ROOT/.env" ]; then
    log "Loading environment from .env..."
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi

# ─────────────────────────────────────────────────────────────────────
# Database operations (can run standalone)
# ─────────────────────────────────────────────────────────────────────
do_db_reset() {
    log "Resetting D1 database..."
    if [ ! -d "$PROJECT_ROOT/worker" ]; then
        warn "Worker directory not found, skipping DB reset"
        return
    fi

    cd "$PROJECT_ROOT/worker"

    # Check if wrangler is available
    if ! command -v npx &> /dev/null; then
        warn "npx not found, skipping DB reset"
        return
    fi

    # Get D1 database name from wrangler config
    local db_name=$(npx wrangler d1 list 2>/dev/null | grep -oP 'github_automation\K[^ ]*' | head -1 || echo "")

    if [ -n "$db_name" ]; then
        log "Found D1 database: github_automation"
        npx wrangler d1 execute github_automation --command="DELETE FROM drafts" --local 2>/dev/null || true
        npx wrangler d1 execute github_automation --command="DELETE FROM posts" --local 2>/dev/null || true
        success "D1 database cleared"
    else
        warn "D1 database not found, skipping"
    fi
}

do_clear_cache() {
    log "Clearing cache..."
    rm -rf "$PROJECT_ROOT/.cache" 2>/dev/null || true
    rm -rf "$PROJECT_ROOT/frontend/.vite" 2>/dev/null || true
    rm -rf "$PROJECT_ROOT/frontend/node_modules/.cache" 2>/dev/null || true
    success "Cache cleared"
}

# Handle standalone database operations
if [ "$RESET_DB" = true ]; then
    do_db_reset
    exit 0
fi

if [ "$CLEAR_CACHE" = true ]; then
    do_clear_cache
    exit 0
fi

# ─────────────────────────────────────────────────────────────────────
# Install dependencies
# ─────────────────────────────────────────────────────────────────────
do_install_deps() {
    if [ "$SKIP_DEPS" = true ]; then
        warn "Skipping dependency installation (--skip-deps)"
        return
    fi

    log "Installing dependencies..."

    # Frontend
    if [ -d "$PROJECT_ROOT/frontend" ]; then
        log "Installing frontend dependencies..."
        cd "$PROJECT_ROOT/frontend"
        npm install 2>&1
        success "Frontend dependencies installed"
    fi

    # Worker
    if [ -d "$PROJECT_ROOT/worker" ]; then
        log "Installing worker dependencies..."
        cd "$PROJECT_ROOT/worker"
        npm install 2>&1
        success "Worker dependencies installed"
    fi

    # Generation worker
    if [ -d "$PROJECT_ROOT/generation-worker" ]; then
        log "Installing generation-worker dependencies..."
        cd "$PROJECT_ROOT/generation-worker"
        npm install 2>&1
        success "Generation worker dependencies installed"
    fi

    cd "$PROJECT_ROOT"
}

# ─────────────────────────────────────────────────────────────────────
# Generate features
# ─────────────────────────────────────────────────────────────────────
do_generate_features() {
    if [ -f "$PROJECT_ROOT/scripts/generate_features.py" ]; then
        log "Generating feature flags..."
        python3 "$PROJECT_ROOT/scripts/generate_features.py" 2>&1 || true
        success "Feature flags generated"
    fi
}

# ─────────────────────────────────────────────────────────────────────
# Python setup (Cloudflare, etc.)
# ─────────────────────────────────────────────────────────────────────
do_python_setup() {
    if [ ! -f "$PROJECT_ROOT/setup/setup.py" ]; then
        return
    fi

    if [ "$MODE" = "production" ]; then
        log "Running Python setup..."
        cd "$PROJECT_ROOT"

        PYTHON_ARGS="--install-worker-deps"

        if [ "$SKIP_CLOUDFLARE" = false ]; then
            PYTHON_ARGS="$PYTHON_ARGS --cloudflare --deploy-worker"
        fi

        python3 setup/setup.py $PYTHON_ARGS 2>&1 || warn "Python setup had warnings"
        success "Python setup complete"
    fi
}

# ─────────────────────────────────────────────────────────────────────
# Launch wizard UI
# ─────────────────────────────────────────────────────────────────────
do_launch_wizard() {
    if [ "$SKIP_WIZARD" = true ]; then
        warn "Skipping wizard (--skip-wizard)"
        return
    fi

    log "Launching setup wizard at http://localhost:3456 ..."

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
    echo "  Setup wizard running at: http://localhost:3456"
    echo "  Press Ctrl+C to stop"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    wait $SETUP_PID
}

# ─────────────────────────────────────────────────────────────────────
# Launch main application
# ─────────────────────────────────────────────────────────────────────
do_launch_app() {
    if [ "$SKIP_APP" = true ]; then
        warn "Skipping app launch (--skip-app)"
        return
    fi

    log "Launching main application..."

    cd "$PROJECT_ROOT/frontend"
    npm run dev &
    APP_PID=$!

    sleep 3

    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:5173 2>/dev/null || true
    elif command -v open &> /dev/null; then
        open http://localhost:5173 2>/dev/null || true
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Application running at: http://localhost:5173"
    echo "  Press Ctrl+C to stop"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    wait $APP_PID
}

# ─────────────────────────────────────────────────────────────────────
# Main flow
# ─────────────────────────────────────────────────────────────────────
main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║          LinkedIn Post - Setup Launcher ($MODE)              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""

    # Always install deps first
    do_install_deps

    # Always generate features
    do_generate_features

    # Production mode: run full Python setup
    if [ "$MODE" = "production" ]; then
        do_python_setup
    fi

    # Detect existing setup state
    log "Detecting setup state..."
    ENV_FILE="$PROJECT_ROOT/frontend/.env"
    WORKER_VARS="$PROJECT_ROOT/worker/.dev.vars"

    SETUP_COMPLETE=false
    if [ -f "$ENV_FILE" ] && grep -q "VITE_GOOGLE_CLIENT_ID" "$ENV_FILE" && \
       grep -q "VITE_WORKER_URL" "$ENV_FILE" 2>/dev/null; then
        SETUP_COMPLETE=true
    fi

    if [ "$SETUP_COMPLETE" = true ]; then
        echo ""
        success "Setup detected as complete!"
        echo "  - Environment variables configured"
        echo "  - Ready to launch application"
        echo ""

        if [ "$SKIP_WIZARD" = false ]; then
            read -p "  Open setup wizard to review settings? [y/N]: " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                do_launch_wizard
            fi
        fi

        do_launch_app
    else
        echo ""
        warn "Setup incomplete - launching wizard for configuration..."
        echo ""
        do_launch_wizard
        do_launch_app
    fi
}

main "$@"
