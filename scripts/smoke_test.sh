#!/usr/bin/env bash
# End-to-end smoke test for HuddleTag.
# Brings up docker compose, verifies key API endpoints through nginx, then
# optionally tears down.
#
# Usage:
#   ./smoke_test.sh           # build, test, leave containers running
#   ./smoke_test.sh --down    # build, test, then docker compose down
#   ./smoke_test.sh --no-build --down  # skip build (containers already up)

set -euo pipefail

BASE_URL="http://localhost:3000"
PASS=0
FAIL=0
BUILD=true
TEARDOWN=false

for arg in "$@"; do
  case "$arg" in
    --down)      TEARDOWN=true ;;
    --no-build)  BUILD=false ;;
  esac
done

# ── Colour helpers ─────────────────────────────────────────────────────────────
green() { printf '\033[0;32m%s\033[0m\n' "$*"; }
red()   { printf '\033[0;31m%s\033[0m\n' "$*"; }

check() {
  local label="$1" expected_status="$2" actual_status="$3" body="$4" grep_pat="${5:-}"
  local ok=true

  if [[ "$actual_status" != "$expected_status" ]]; then
    ok=false
  fi

  if [[ -n "$grep_pat" ]] && ! echo "$body" | grep -q "$grep_pat"; then
    ok=false
  fi

  if $ok; then
    green "  PASS  $label"
    ((PASS++)) || true
  else
    red   "  FAIL  $label  (HTTP $actual_status, expected $expected_status${grep_pat:+, pattern='$grep_pat'})"
    if [[ -n "$body" ]]; then
      echo "        body: ${body:0:200}"
    fi
    ((FAIL++)) || true
  fi
}

# ── Start stack ────────────────────────────────────────────────────────────────
cd "$(dirname "$0")"

if $BUILD; then
  echo "Building and starting containers..."
  docker compose up --build -d
else
  echo "Skipping build — ensuring containers are running..."
  docker compose up -d
fi

# Wait for the backend healthcheck to pass (docker compose already polls it,
# but we also wait for nginx to be reachable).
echo "Waiting for frontend (nginx) to be reachable..."
MAX_WAIT=90
ELAPSED=0
until curl -sf "${BASE_URL}/api/jobs" >/dev/null 2>&1; do
  if (( ELAPSED >= MAX_WAIT )); then
    red "Timed out waiting for ${BASE_URL}/api/jobs after ${MAX_WAIT}s"
    docker compose logs --tail=40
    exit 1
  fi
  sleep 3
  ELAPSED=$((ELAPSED + 3))
done
echo "Stack is up (${ELAPSED}s)."

# ── Smoke checks ───────────────────────────────────────────────────────────────
echo ""
echo "Running smoke checks against ${BASE_URL} ..."

# 1. Frontend — static index
STATUS=$(curl -so /dev/null -w "%{http_code}" "${BASE_URL}/")
check "GET /  → static index" 200 "$STATUS" ""

# 2. SPA fallback — unknown path should serve index.html (React Router)
STATUS=$(curl -so /dev/null -w "%{http_code}" "${BASE_URL}/jobs/compare-dsm-vids")
check "GET /jobs/compare-dsm-vids  → SPA fallback" 200 "$STATUS" ""

# 3. GET /api/jobs — lists both sample jobs
BODY=$(curl -sf "${BASE_URL}/api/jobs")
STATUS=$(curl -so /dev/null -w "%{http_code}" "${BASE_URL}/api/jobs")
check "GET /api/jobs  → 200" 200 "$STATUS" "$BODY" "compare-dsm-vids"

# 4. Both sample jobs present
check "GET /api/jobs  → contains multimodal" 200 "$STATUS" "$BODY" "multimodal"

# 5. GET /api/jobs/{job_id}/spec
BODY=$(curl -sf "${BASE_URL}/api/jobs/compare-dsm-vids/spec")
STATUS=$(curl -so /dev/null -w "%{http_code}" "${BASE_URL}/api/jobs/compare-dsm-vids/spec")
check "GET /api/jobs/compare-dsm-vids/spec  → 200" 200 "$STATUS" "$BODY" "feedbacks"

# 6. GET /api/jobs/{job_id}/items
BODY=$(curl -sf "${BASE_URL}/api/jobs/compare-dsm-vids/items")
STATUS=$(curl -so /dev/null -w "%{http_code}" "${BASE_URL}/api/jobs/compare-dsm-vids/items")
check "GET /api/jobs/compare-dsm-vids/items  → 200" 200 "$STATUS" "$BODY" "pair_001"

# 7. GET annotation before save → 404
STATUS=$(curl -so /dev/null -w "%{http_code}" "${BASE_URL}/api/jobs/compare-dsm-vids/annotations/pair_001")
check "GET /api/jobs/.../annotations/pair_001 (unsaved)  → 404" 404 "$STATUS" ""

# 8. POST annotation
BODY=$(curl -sf -X POST "${BASE_URL}/api/jobs/compare-dsm-vids/annotations/pair_001" \
  -H 'Content-Type: application/json' \
  -d '{"values":{"preferred_video":"Video A","reason":"smoke test"}}')
STATUS=$(curl -so /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/jobs/compare-dsm-vids/annotations/pair_001" \
  -H 'Content-Type: application/json' \
  -d '{"values":{"preferred_video":"Video A","reason":"smoke test"}}')
check "POST /api/jobs/.../annotations/pair_001  → 200" 200 "$STATUS" "$BODY" "Video A"

# 9. GET annotation after save → 200
BODY=$(curl -sf "${BASE_URL}/api/jobs/compare-dsm-vids/annotations/pair_001")
STATUS=$(curl -so /dev/null -w "%{http_code}" "${BASE_URL}/api/jobs/compare-dsm-vids/annotations/pair_001")
check "GET /api/jobs/.../annotations/pair_001 (saved)  → 200" 200 "$STATUS" "$BODY" "smoke test"

# 10. GET export → CSV download
STATUS=$(curl -so /dev/null -w "%{http_code}" "${BASE_URL}/api/jobs/compare-dsm-vids/export")
BODY=$(curl -sf "${BASE_URL}/api/jobs/compare-dsm-vids/export")
check "GET /api/jobs/compare-dsm-vids/export  → 200" 200 "$STATUS" "$BODY" "pair_001"

# 11. Unknown job → 404 proxied correctly
STATUS=$(curl -so /dev/null -w "%{http_code}" "${BASE_URL}/api/jobs/does-not-exist/items")
check "GET /api/jobs/does-not-exist/items  → 404" 404 "$STATUS" ""

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"

if $TEARDOWN; then
  echo "Tearing down containers..."
  docker compose down
fi

if (( FAIL > 0 )); then
  red "Smoke test FAILED"
  exit 1
else
  green "Smoke test PASSED"
fi
