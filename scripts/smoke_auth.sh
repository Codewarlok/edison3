#!/usr/bin/env bash
set -euo pipefail

APP_URL="${APP_URL:-http://127.0.0.1:8000}"
WORKDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_ID="$(date +%s)"
ADMIN_EMAIL="${ADMIN_EMAIL:-qa-admin-${RUN_ID}@edison.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-qa-admin-123}"
ANALYST_EMAIL="qa-analyst-${RUN_ID}@edison.local"
ANALYST_PASSWORD="qa-analyst-123"
TMP_DIR="$(mktemp -d)"
SERVER_LOG="$TMP_DIR/server.log"
ADMIN_COOKIES="$TMP_DIR/admin.cookies"
ANALYST_COOKIES="$TMP_DIR/analyst.cookies"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; exit 1; }

assert_eq() {
  local got="$1"
  local expected="$2"
  local msg="$3"
  [[ "$got" == "$expected" ]] && pass "$msg" || fail "$msg (expected=$expected got=$got)"
}

assert_contains() {
  local text="$1"
  local needle="$2"
  local msg="$3"
  grep -Fq "$needle" <<<"$text" && pass "$msg" || fail "$msg (missing '$needle')"
}

wait_for_app() {
  for _ in {1..120}; do
    if curl -sS -o /dev/null "$APP_URL/api/auth/me"; then
      return 0
    fi
    sleep 0.5
  done
  echo "--- server log ---"
  cat "$SERVER_LOG" || true
  fail "App did not become ready at $APP_URL"
}

echo "==> Preparing auth smoke data (bootstrap admin via env)"

if [[ "${SKIP_SERVER_START:-0}" != "1" ]]; then
  echo "==> Starting app"
  (cd "$WORKDIR" && deno task build >"$SERVER_LOG" 2>&1 && EDISON_ADMIN_EMAIL="$ADMIN_EMAIL" EDISON_ADMIN_PASSWORD="$ADMIN_PASSWORD" EDISON_ADMIN_NAME="QA Admin" deno task start >>"$SERVER_LOG" 2>&1) &
  SERVER_PID=$!
  wait_for_app
else
  echo "==> SKIP_SERVER_START=1, expecting app already running at $APP_URL"
fi

# 1) Login exitoso admin
admin_body=$(curl -sS -w "\n%{http_code}" -c "$ADMIN_COOKIES" -H 'content-type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" "$APP_URL/api/auth/login")
admin_code=$(tail -n1 <<<"$admin_body")
admin_json=$(sed '$d' <<<"$admin_body")
assert_eq "$admin_code" "200" "Login admin responde 200"
assert_contains "$admin_json" "\"email\":\"$ADMIN_EMAIL\"" "Login admin retorna usuario admin"

# Crear analyst para pruebas RBAC (único por ejecución)
create_analyst_body=$(curl -sS -w "\n%{http_code}" -b "$ADMIN_COOKIES" -H 'content-type: application/json' \
  -d "{\"email\":\"$ANALYST_EMAIL\",\"displayName\":\"QA Analyst\",\"password\":\"$ANALYST_PASSWORD\",\"roles\":[\"analyst\"]}" "$APP_URL/api/admin/users")
create_analyst_code=$(tail -n1 <<<"$create_analyst_body")
create_analyst_json=$(sed '$d' <<<"$create_analyst_body")
assert_eq "$create_analyst_code" "201" "Creación de analyst por admin responde 201"
assert_contains "$create_analyst_json" "\"email\":\"$ANALYST_EMAIL\"" "Creación de analyst retorna email"

# 2) Login exitoso analyst
analyst_body=$(curl -sS -w "\n%{http_code}" -c "$ANALYST_COOKIES" -H 'content-type: application/json' \
  -d "{\"email\":\"$ANALYST_EMAIL\",\"password\":\"$ANALYST_PASSWORD\"}" "$APP_URL/api/auth/login")
analyst_code=$(tail -n1 <<<"$analyst_body")
analyst_json=$(sed '$d' <<<"$analyst_body")
assert_eq "$analyst_code" "200" "Login analyst responde 200"
assert_contains "$analyst_json" "\"email\":\"$ANALYST_EMAIL\"" "Login analyst retorna usuario analyst"

# 3) Login fallido
failed_body=$(curl -sS -w "\n%{http_code}" -H 'content-type: application/json' \
  -d "{\"email\":\"$ANALYST_EMAIL\",\"password\":\"bad-pass\"}" "$APP_URL/api/auth/login")
failed_code=$(tail -n1 <<<"$failed_body")
failed_json=$(sed '$d' <<<"$failed_body")
assert_eq "$failed_code" "401" "Login inválido responde 401"
assert_contains "$failed_json" '"error":"INVALID_CREDENTIALS"' "Login inválido retorna INVALID_CREDENTIALS"

# 4) Acceso dashboard por rol
admin_dashboard_headers=$(curl -sS -D - -o /dev/null -b "$ADMIN_COOKIES" "$APP_URL/dashboard")
assert_contains "$admin_dashboard_headers" "HTTP/1.1 302" "Dashboard admin responde redirect"
assert_contains "$admin_dashboard_headers" "location: /dashboard/admin" "Dashboard admin redirige a /dashboard/admin"

analyst_dashboard_headers=$(curl -sS -D - -o /dev/null -b "$ANALYST_COOKIES" "$APP_URL/dashboard")
assert_contains "$analyst_dashboard_headers" "HTTP/1.1 302" "Dashboard analyst responde redirect"
assert_contains "$analyst_dashboard_headers" "location: /dashboard/analyst" "Dashboard analyst redirige a /dashboard/analyst"

# 5) Acceso denegado a /admin/users para analyst
analyst_admin_users_code=$(curl -sS -o /dev/null -w "%{http_code}" -b "$ANALYST_COOKIES" "$APP_URL/admin/users")
assert_eq "$analyst_admin_users_code" "403" "Analyst recibe 403 en /admin/users"

# 6) Logout y revocación de sesión
logout_code=$(curl -sS -o /dev/null -w "%{http_code}" -b "$ADMIN_COOKIES" -c "$ADMIN_COOKIES" -X POST "$APP_URL/api/auth/logout")
assert_eq "$logout_code" "200" "Logout admin responde 200"

post_logout_me_code=$(curl -sS -o /dev/null -w "%{http_code}" -b "$ADMIN_COOKIES" "$APP_URL/api/auth/me")
assert_eq "$post_logout_me_code" "401" "Sesión revocada tras logout"

echo "\nSmoke auth RBAC: PASS"
