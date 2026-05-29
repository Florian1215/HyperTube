#!/usr/bin/env bash

set -uo pipefail

# API contract test for the unchanged frontend auth payloads.
#
# Usage:
#   verification/tests/api/frontend_auth_contract_api_test.sh
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
EMAIL="frontend-contract-${RUN_ID}@example.test"
USERNAME="frontend_${RUN_ID//[^A-Za-z0-9_]/_}"
PASSWORD="ContractPass123!"

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/hypertube-frontend-auth-contract.XXXXXX")"
LAST_BODY_FILE="$TMP_DIR/last_body"
LAST_HEADERS_FILE="$TMP_DIR/last_headers"
LAST_CURL_ERR_FILE="$TMP_DIR/last_curl_err"
LAST_REQUEST_METHOD=""
LAST_REQUEST_URL=""
LAST_REQUEST_BODY=""
LAST_STATUS=""
LAST_CURL_EXIT=0

PASSED=0
FAILED=0

RESET=""
BOLD=""
DIM=""
RED=""
GREEN=""
CYAN=""

if [[ -z "${NO_COLOR:-}" && ( -t 1 || "${FORCE_COLOR:-}" == "1" || "${CLICOLOR_FORCE:-}" == "1" ) ]]; then
  RESET=$'\033[0m'
  BOLD=$'\033[1m'
  DIM=$'\033[2m'
  RED=$'\033[31m'
  GREEN=$'\033[32m'
  CYAN=$'\033[36m'
fi

cleanup() {
  rm -rf -- "$TMP_DIR"
}
trap cleanup EXIT

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

assert_jq_eq() {
  local name="$1"
  local filter="$2"
  local expected="$3"
  local actual

  actual="$(jq -r "$filter" "$LAST_BODY_FILE" 2>"$TMP_DIR/jq_error")"
  if [[ $? -eq 0 && "$actual" == "$expected" ]]; then
    pass "$name"
    return 0
  fi

  fail "$name: expected '$expected', got '${actual:-<jq failed>}'"
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

register_payload() {
  jq -n \
    --arg email "$EMAIL" \
    --arg username "$USERNAME" \
    --arg password "$PASSWORD" \
    '{
      email: $email,
      username: $username,
      firstname: "Frontend",
      lastname: "Contract",
      password: $password
    }'
}

login_payload() {
  local login="$1"

  jq -n --arg email "$login" --arg password "$PASSWORD" '{email: $email, password: $password}'
}

test_frontend_register_contract() {
  local payload

  section "Frontend registration payload"

  payload="$(register_payload)"
  request "POST" "/auth/register" "$payload"
  if expect_status "Register accepts firstname/lastname aliases" "201"; then
    assert_jq_eq "Response includes canonical first_name" '.data.user.first_name' "Frontend"
    assert_jq_eq "Response includes canonical last_name" '.data.user.last_name' "Contract"
    assert_jq_eq "Response includes frontend firstname alias" '.data.user.firstname' "Frontend"
    assert_jq_eq "Response includes frontend lastname alias" '.data.user.lastname' "Contract"
    assert_jq_true "Response includes numeric joined_at" '.data.user.joined_at | type == "number" and . > 0'
    assert_jq_true "Response includes frontend watch_history array" '.data.user.watch_history | type == "array"'
    assert_jq_true "Response includes frontend color string" '.data.user.color | type == "string" and length > 0'
    assert_jq_true "Response includes access token" '.data.access_token | type == "string" and length > 20'
  fi
}

test_frontend_login_contract() {
  local payload

  section "Frontend login payload"

  payload="$(login_payload "$EMAIL")"
  request "POST" "/auth/login" "$payload"
  if expect_status "Login accepts email field with email address" "200"; then
    assert_jq_eq "Email login returns the registered user" '.data.user.username' "$USERNAME"
  fi

  payload="$(login_payload "$USERNAME")"
  request "POST" "/auth/login" "$payload"
  if expect_status "Login accepts email field with username value" "200"; then
    assert_jq_eq "Username login returns the registered user" '.data.user.email' "$EMAIL"
  fi
}

print_summary() {
  echo
  printf '%b%s%b\n' "$DIM" "================================================================" "$RESET"
  printf '%bFrontend auth contract test summary%b\n' "${BOLD}${CYAN}" "$RESET"
  printf '%b%s%b\n' "$DIM" "================================================================" "$RESET"
  printf '  %bPassed%b %d\n' "$GREEN" "$RESET" "$PASSED"
  printf '  %bFailed%b %d\n' "$RED" "$RESET" "$FAILED"
  printf '  %bBASE_URL%b %s\n' "$DIM" "$RESET" "$BASE_URL"
  printf '  %bEMAIL%b    %s\n' "$DIM" "$RESET" "$EMAIL"
  printf '  %bUSERNAME%b %s\n' "$DIM" "$RESET" "$USERNAME"
}

main() {
  require_command curl jq sed date

  section "Configuration"
  printf '  %b%-16s%b %s\n' "$DIM" "BASE_URL" "$RESET" "$BASE_URL"
  printf '  %b%-16s%b %s\n' "$DIM" "CURL_TIMEOUT" "$RESET" "$CURL_TIMEOUT"

  test_frontend_register_contract
  test_frontend_login_contract
  print_summary

  if [[ "$FAILED" -ne 0 ]]; then
    exit 1
  fi
}

main "$@"
