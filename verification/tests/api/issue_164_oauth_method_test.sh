#!/usr/bin/env bash

set -uo pipefail

# Curl/jq regression checks for issue #164: auth user responses expose
# oauth_method.
#
# Usage:
#   verification/tests/api/issue_164_oauth_method_test.sh
#   verification/tests/start_me --run issue-164
#
# Configuration:
#   BASE_URL=http://localhost:8080/api/v1
#   CURL_TIMEOUT=45
#   NO_COLOR=1
#   FORCE_COLOR=1

BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"
BASE_URL="${BASE_URL%/}"
CURL_TIMEOUT="${CURL_TIMEOUT:-45}"
RUN_ID="$(date +%Y%m%d%H%M%S)-$$"
SHORT_ID="$(date +%H%M%S)$(( $$ % 10000 ))"
EMAIL="issue164-${RUN_ID}@example.test"
USERNAME="i164_${SHORT_ID}"
PASSWORD="Issue164Pass123!"

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/hypertube-issue164.XXXXXX")"
LAST_BODY_FILE="$TMP_DIR/last_body"
LAST_HEADERS_FILE="$TMP_DIR/last_headers"
LAST_CURL_ERR_FILE="$TMP_DIR/last_curl_err"
LAST_REQUEST_METHOD=""
LAST_REQUEST_URL=""
LAST_REQUEST_BODY=""
LAST_STATUS=""
LAST_CURL_EXIT=0
REGISTERED_USER_ID=""

PASSED=0
FAILED=0
SKIPPED=0

RESET=""
BOLD=""
DIM=""
RED=""
GREEN=""
YELLOW=""
CYAN=""

if [[ -z "${NO_COLOR:-}" && ( -t 1 || "${FORCE_COLOR:-}" == "1" || "${CLICOLOR_FORCE:-}" == "1" ) ]]; then
  RESET=$'\033[0m'
  BOLD=$'\033[1m'
  DIM=$'\033[2m'
  RED=$'\033[31m'
  GREEN=$'\033[32m'
  YELLOW=$'\033[33m'
  CYAN=$'\033[36m'
fi

cleanup() {
  rm -rf -- "$TMP_DIR"
}
trap cleanup EXIT

require_command() {
  local missing=0
  local cmd

  for cmd in "$@"; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      printf 'Missing required command: %s\n' "$cmd" >&2
      missing=1
    fi
  done

  if [[ "$missing" -ne 0 ]]; then
    exit 127
  fi
}

section() {
  echo
  printf '%b%s%b\n' "$DIM" "================================================================" "$RESET"
  printf '%b%s%b\n' "${BOLD}${CYAN}" "$1" "$RESET"
  printf '%b%s%b\n' "$DIM" "================================================================" "$RESET"
}

pass() {
  PASSED=$((PASSED + 1))
  printf '  %b%-6s%b %s\n' "$GREEN" "PASS" "$RESET" "$1"
}

fail() {
  FAILED=$((FAILED + 1))
  printf '  %b%-6s%b %s\n' "$RED" "FAIL" "$RESET" "$1"
  dump_last_response
}

skip() {
  SKIPPED=$((SKIPPED + 1))
  printf '  %b%-6s%b %s (%s)\n' "$YELLOW" "SKIP" "$RESET" "$1" "$2"
}

redact_json_payload() {
  local payload="$1"

  if printf '%s' "$payload" | jq . >/dev/null 2>&1; then
    printf '%s' "$payload" | jq 'if type == "object" and has("password") then .password = "<redacted>" else . end'
  else
    printf '%s\n' "$payload"
  fi
}

dump_last_response() {
  if [[ -n "$LAST_REQUEST_URL" ]]; then
    printf '    %b%-14s%b %s %s\n' "$DIM" "Request" "$RESET" "$LAST_REQUEST_METHOD" "$LAST_REQUEST_URL"
  fi
  if [[ -n "$LAST_REQUEST_BODY" ]]; then
    printf '    %b%s%b\n' "$DIM" "Payload" "$RESET"
    redact_json_payload "$LAST_REQUEST_BODY" | sed 's/^/      /'
  fi
  if [[ "$LAST_CURL_EXIT" -ne 0 && -s "$LAST_CURL_ERR_FILE" ]]; then
    printf '    %b%s%b\n' "$RED" "Curl error" "$RESET"
    sed 's/^/      /' "$LAST_CURL_ERR_FILE"
  fi

  printf '    %b%-14s%b %s\n' "$DIM" "Status" "$RESET" "${LAST_STATUS:-<none>}"
  printf '    %b%s%b\n' "$DIM" "Response body" "$RESET"
  if [[ ! -s "$LAST_BODY_FILE" ]]; then
    printf '      <empty>\n'
  elif jq . "$LAST_BODY_FILE" >/dev/null 2>&1; then
    jq . "$LAST_BODY_FILE" | sed 's/^/      /'
  else
    sed 's/^/      /' "$LAST_BODY_FILE"
  fi
}

print_curl_command() {
  local method="$1"
  local url="$2"
  local body="${3:-}"

  printf '  %bcurl%b -sS --max-time %q -X %q %q' "$DIM" "$RESET" "$CURL_TIMEOUT" "$method" "$url"
  printf ' -H %q' "Accept: application/json"
  if [[ -n "$body" ]]; then
    printf ' -H %q --data %q' "Content-Type: application/json" "$body"
  fi
  printf '\n'
}

request() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local url="$BASE_URL$path"
  local curl_args

  : >"$LAST_BODY_FILE"
  : >"$LAST_HEADERS_FILE"
  : >"$LAST_CURL_ERR_FILE"

  LAST_REQUEST_METHOD="$method"
  LAST_REQUEST_URL="$url"
  LAST_REQUEST_BODY="$body"
  LAST_STATUS=""
  LAST_CURL_EXIT=0

  print_curl_command "$method" "$url" "$body"

  curl_args=(
    --silent
    --show-error
    --max-time "$CURL_TIMEOUT"
    -X "$method"
    "$url"
    -H "Accept: application/json"
    -D "$LAST_HEADERS_FILE"
    -o "$LAST_BODY_FILE"
    -w "%{http_code}"
  )

  if [[ -n "$body" ]]; then
    curl_args+=(-H "Content-Type: application/json" --data "$body")
  fi

  LAST_STATUS="$(curl "${curl_args[@]}" 2>"$LAST_CURL_ERR_FILE")"
  LAST_CURL_EXIT=$?
}

expect_status() {
  local name="$1"
  local expected="$2"

  if [[ "$LAST_CURL_EXIT" -ne 0 ]]; then
    fail "$name: curl failed"
    return 1
  fi
  if [[ "$LAST_STATUS" == "$expected" ]]; then
    pass "$name: HTTP $expected"
    return 0
  fi

  fail "$name: expected HTTP $expected, got ${LAST_STATUS:-<none>}"
  return 1
}

assert_jq_true() {
  local name="$1"
  local filter="$2"

  if jq -e "$filter" "$LAST_BODY_FILE" >/dev/null 2>"$TMP_DIR/jq_error"; then
    pass "$name"
    return 0
  fi

  fail "$name: jq assertion failed: $filter"
  return 1
}

assert_oauth_method_null() {
  local label="$1"

  assert_jq_true "$label includes oauth_method field" '.data.user | has("oauth_method")'
  assert_jq_true "$label oauth_method is JSON null" '.data.user.oauth_method == null'
  assert_jq_true "$label oauth_method is not an empty string" '(.data.user.oauth_method | type) == "null"'
}

register_payload() {
  jq -n \
    --arg email "$EMAIL" \
    --arg username "$USERNAME" \
    --arg password "$PASSWORD" \
    '{
      email: $email,
      username: $username,
      first_name: "Issue",
      last_name: "OAuthMethod",
      password: $password
    }'
}

login_payload() {
  local login="$1"

  jq -n --arg login "$login" --arg password "$PASSWORD" '{login: $login, password: $password}'
}

health_check() {
  section "Health check"

  request "GET" "/health"
  expect_status "API is reachable" "200" || {
    printf '\nAPI is not reachable at %s. Start it and rerun this test.\n' "$BASE_URL" >&2
    exit 1
  }
}

test_register_oauth_method() {
  local payload

  section "Register response oauth_method contract"

  payload="$(register_payload)"
  request "POST" "/auth/register" "$payload"
  if expect_status "register password user" "201"; then
    assert_oauth_method_null "Register response"
    assert_jq_true "Register response includes access token" '.data.access_token | type == "string" and length > 20'
    assert_jq_true "Register response returns created username" ".data.user.username == \"$USERNAME\""
    REGISTERED_USER_ID="$(jq -r '.data.user.id // empty' "$LAST_BODY_FILE" 2>/dev/null)"
  fi

  if [[ -z "$REGISTERED_USER_ID" ]]; then
    fail "register response exposes created user id"
    return 1
  fi
}

test_login_oauth_method() {
  local payload

  section "Login response oauth_method contract"

  payload="$(login_payload "$EMAIL")"
  request "POST" "/auth/login" "$payload"
  if expect_status "login password user by email" "200"; then
    assert_oauth_method_null "Email login response"
    assert_jq_true "Email login returns same user id" ".data.user.id == $REGISTERED_USER_ID"
  fi

  payload="$(login_payload "$USERNAME")"
  request "POST" "/auth/login" "$payload"
  if expect_status "login password user by username" "200"; then
    assert_oauth_method_null "Username login response"
    assert_jq_true "Username login returns same user id" ".data.user.id == $REGISTERED_USER_ID"
  fi
}

print_summary() {
  section "Summary"
  printf '  %bPassed%b  %d\n' "$GREEN" "$RESET" "$PASSED"
  printf '  %bFailed%b  %d\n' "$RED" "$RESET" "$FAILED"
  printf '  %bSkipped%b %d\n' "$YELLOW" "$RESET" "$SKIPPED"
  printf '  %bBASE_URL%b %s\n' "$DIM" "$RESET" "$BASE_URL"
  printf '  %bEMAIL%b    %s\n' "$DIM" "$RESET" "$EMAIL"
  printf '  %bUSERNAME%b %s\n' "$DIM" "$RESET" "$USERNAME"
}

main() {
  require_command curl jq sed date mktemp

  section "Issue #164 oauth_method curl checks"
  printf '  %b%-14s%b %s\n' "$DIM" "BASE_URL" "$RESET" "$BASE_URL"
  printf '  %b%-14s%b %s\n' "$DIM" "CURL_TIMEOUT" "$RESET" "$CURL_TIMEOUT"

  health_check
  test_register_oauth_method
  test_login_oauth_method

  section "Social OAuth callback note"
  skip "OAuth provider value via callback" "requires a real provider authorization code; backend unit tests cover provider values"

  print_summary

  if [[ "$FAILED" -ne 0 ]]; then
    exit 1
  fi
}

main "$@"
