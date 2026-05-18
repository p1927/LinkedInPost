#!/bin/bash
# smoke-test.sh — curl-based LP API health check (no Playwright)
# Usage: bash smoke-test.sh [base_url]
#   Set DEV_GOOGLE_AUTH_BYPASS_SECRET env var to enable authenticated flow checks.
BASE="${1:-${LP_BASE:-http://localhost:8787}}"
BYPASS="${DEV_GOOGLE_AUTH_BYPASS_SECRET:-}"
PASS=0; FAIL=0

pass() { echo "PASS: $1"; PASS=$(( PASS + 1 )); }
fail() { echo "FAIL: $1"; FAIL=$(( FAIL + 1 )); }

status() {
    curl -s -o /dev/null -w '%{http_code}' --max-time 8 "$@" 2>/dev/null || echo "000"
}

# 1. Worker alive
S=$(status "$BASE/")
[ "$S" = "200" ] && pass "worker-alive (GET / -> 200)" || fail "worker-alive (GET / -> $S, expected 200)"

# 2. Unauthenticated API -> 401 or 403, never 500
S=$(status "$BASE/api/feed")
if [ "$S" = "401" ] || [ "$S" = "403" ]; then
    pass "auth-gate (GET /api/feed -> $S)"
elif [ "$S" = "000" ]; then
    fail "auth-gate (worker not responding)"
else
    fail "auth-gate (GET /api/feed -> $S, expected 401/403 - security broken or worker crashed)"
fi

# 3. Authenticated flows (only if bypass secret available)
if [ -n "$BYPASS" ]; then
    H="Authorization: Bearer $BYPASS"

    S=$(status -H "$H" "$BASE/api/feed")
    [ "$S" = "200" ] && pass "authed-feed (GET /api/feed -> 200)" || fail "authed-feed (GET /api/feed -> $S)"

    S=$(status -H "$H" "$BASE/api/clips")
    [ "$S" = "200" ] && pass "authed-clips (GET /api/clips -> 200)" || fail "authed-clips (GET /api/clips -> $S)"

    # POST with empty body -> 400 means auth passed (body rejected, not auth)
    S=$(status -H "$H" -H "Content-Type: application/json" -X POST -d '{}' "$BASE/api/feed/items")
    if [ "$S" = "200" ] || [ "$S" = "400" ] || [ "$S" = "422" ]; then
        pass "authed-create-feed-item (POST /api/feed/items -> $S, auth passed)"
    else
        fail "authed-create-feed-item (POST /api/feed/items -> $S)"
    fi
else
    echo "SKIP: authenticated flow checks (set DEV_GOOGLE_AUTH_BYPASS_SECRET to enable)"
fi

echo ""
echo "Smoke: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
