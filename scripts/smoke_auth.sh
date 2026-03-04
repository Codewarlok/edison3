#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5173}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

TMP_DIR="$(mktemp -d)"
LOG_FILE="$TMP_DIR/dev.log"
ADMIN_COOKIE="$TMP_DIR/admin.cookie"
ANALYST_COOKIE="$TMP_DIR/analyst.cookie"

cleanup() {
  if [[ -n "${DEV_PID:-}" ]] && kill -0 "$DEV_PID" 2>/dev/null; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "[1/7] users seed"
deno task users:seed

echo "[2/7] start dev server"
nohup deno task dev >"$LOG_FILE" 2>&1 &
DEV_PID=$!

READY=0
for _ in {1..60}; do
  if curl -fsS "$BASE_URL" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done

if [[ "$READY" -ne 1 ]]; then
  echo "FAIL: dev server not reachable at $BASE_URL"
  sed -n '1,200p' "$LOG_FILE" || true
  exit 1
fi

request() {
  local output
  output="$(curl -sS -i "$@")"
  local status
  status="$(printf '%s\n' "$output" | awk 'NR==1{print $2}')"
  printf '%s' "$status"
}

echo "[3/7] login admin OK"
admin_login_status="$(request -c "$ADMIN_COOKIE" -H 'content-type: application/json' -d '{"email":"admin@edison.local","password":"admin123"}' "$BASE_URL/api/auth/login")"

echo "[4/7] login analyst OK"
analyst_login_status="$(request -c "$ANALYST_COOKIE" -H 'content-type: application/json' -d '{"email":"analyst@edison.local","password":"analyst123"}' "$BASE_URL/api/auth/login")"

echo "[5/7] login inválido FAIL esperado (401)"
invalid_login_status="$(request -H 'content-type: application/json' -d '{"email":"admin@edison.local","password":"badpass"}' "$BASE_URL/api/auth/login")"

echo "[6/7] /api/auth/me + logout revoca sesión"
admin_me_before_status="$(request -b "$ADMIN_COOKIE" "$BASE_URL/api/auth/me")"
admin_logout_status="$(request -b "$ADMIN_COOKIE" -c "$ADMIN_COOKIE" -X POST "$BASE_URL/api/auth/logout")"
admin_me_after_status="$(request -b "$ADMIN_COOKIE" "$BASE_URL/api/auth/me")"

echo "[7/7] analyst access /admin/users denied"
analyst_admin_status="$(request -b "$ANALYST_COOKIE" "$BASE_URL/admin/users")"

PASS=1
[[ "$admin_login_status" == "200" ]] || PASS=0
[[ "$analyst_login_status" == "200" ]] || PASS=0
[[ "$invalid_login_status" == "401" ]] || PASS=0
[[ "$admin_me_before_status" == "200" ]] || PASS=0
[[ "$admin_logout_status" == "200" ]] || PASS=0
[[ "$admin_me_after_status" == "401" ]] || PASS=0
[[ "$analyst_admin_status" == "302" ]] || PASS=0

echo "---"
echo "RESULTS"
echo "admin_login=$admin_login_status"
echo "analyst_login=$analyst_login_status"
echo "invalid_login=$invalid_login_status"
echo "admin_me_before=$admin_me_before_status"
echo "admin_logout=$admin_logout_status"
echo "admin_me_after=$admin_me_after_status"
echo "analyst_admin_users=$analyst_admin_status"

blocker_hint="$(grep -m1 -E "Identifier 'AuditService' has already been declared|AUTH_UNAVAILABLE|SyntaxError" "$LOG_FILE" || true)"
if [[ -n "$blocker_hint" ]]; then
  echo "blocker_hint=$blocker_hint"
fi

if [[ "$PASS" -eq 1 ]]; then
  echo "VERDICT=PASS"
  exit 0
fi

echo "VERDICT=FAIL"
exit 1
