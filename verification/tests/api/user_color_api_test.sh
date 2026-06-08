#!/usr/bin/env bash

set -uo pipefail

# API smoke/e2e contract test for persistent user profile colors.
#
# Usage:
#   verification/tests/api/user_color_api_test.sh
#
# Configuration:
#   BASE_URL=http://localhost:8080/api/v1
#   CURL_TIMEOUT=20
#   NO_COLOR=1
#   FORCE_COLOR=1

BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"
BASE_URL="${BASE_URL%/}"
CURL_TIMEOUT="${CURL_TIMEOUT:-20}"

RUN_ID="${API_TEST_RUN_ID:-$(date +%s)-$$-$RANDOM}"
RAW_USERNAME="color_${RUN_ID//[^A-Za-z0-9]/_}"
TEST_USERNAME="${API_TEST_USERNAME:-${RAW_USERNAME:0:32}}"
TEST_EMAIL="${API_TEST_EMAIL:-user-color-${RUN_ID}@example.test}"
TEST_PASSWORD="${API_TEST_PASSWORD:-ColorPass123!-$RUN_ID}"
ALLOWED_COLORS=("yellow" "pink" "green" "purple" "blue" "red")

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/hypertube-user-color-test.XXXXXX")"
LAST_BODY_FILE="$TMP_DIR/last_body"
LAST_HEADERS_FILE="$TMP_DIR/last_headers"
LAST_CURL_ERR_FILE="$TMP_DIR/last_curl_err"
LAST_REQUEST_METHOD=""
LAST_REQUEST_URL=""
LAST_REQUEST_BODY=""
LAST_REQUEST_AUTH=""
LAST_STATUS=""
LAST_CURL_EXIT=0

PASSED=0
FAILED=0
SKIPPED=0
TOKEN=""

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

section() {
  local title="$1"

  echo
  printf '%b%s%b\n' "$DIM" "================================================================" "$RESET"
  printf '%b%s%b\n' "${BOLD}${CYAN}" "$title" "$RESET"
  printf '%b%s%b\n' "$DIM" "================================================================" "$RESET"
}

result_line() {
  local status="$1"
  local color="$2"
  local message="$3"

  printf '  %b%-6s%b %s\n' "$color" "$status" "$RESET" "$message"
}

config_line() {
  local key="$1"
  local value="$2"

  printf '  %b%-22s%b %s\n' "$DIM" "$key" "$RESET" "$value"
}

dump_field() {
  local key="$1"
  local value="$2"

  printf '    %b%-14s%b %s\n' "$DIM" "$key" "$RESET" "$value"
}

pass() {
  PASSED=$((PASSED + 1))
  result_line "PASS" "$GREEN" "$1"
}

fail() {
  FAILED=$((FAILED + 1))
  result_line "FAIL" "$RED" "$1"
  dump_last_response
}

skip() {
  SKIPPED=$((SKIPPED + 1))
  result_line "SKIP" "$YELLOW" "$1 ($2)"
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

  if jq . >/dev/null 2>&1 <<<"$payload"; then
    jq 'if type == "object" and has("password") then .password = "<redacted>" else . end' <<<"$payload"
  else
    printf '%s\n' "$payload"
  fi
}

dump_last_response() {
  if [[ -n "$LAST_REQUEST_URL" ]]; then
    dump_field "Request" "$LAST_REQUEST_METHOD $LAST_REQUEST_URL"
  fi
  if [[ -n "$LAST_REQUEST_AUTH" ]]; then
    dump_field "Authorization" "$LAST_REQUEST_AUTH"
  fi
  if [[ -n "$LAST_REQUEST_BODY" ]]; then
    printf '    %b%s%b\n' "$DIM" "Payload" "$RESET"
    redact_json_payload "$LAST_REQUEST_BODY" | sed 's/^/      /'
  fi
  if [[ "$LAST_CURL_EXIT" -ne 0 && -s "$LAST_CURL_ERR_FILE" ]]; then
    printf '    %b%s%b\n' "$RED" "Curl error" "$RESET"
    sed 's/^/      /' "$LAST_CURL_ERR_FILE"
  fi

  dump_field "Status" "${LAST_STATUS:-<none>}"
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
  local token="${4:-}"
  local url="$BASE_URL$path"
  local curl_args

  : >"$LAST_BODY_FILE"
  : >"$LAST_HEADERS_FILE"
  : >"$LAST_CURL_ERR_FILE"

  LAST_REQUEST_METHOD="$method"
  LAST_REQUEST_URL="$url"
  LAST_REQUEST_BODY="$body"
  LAST_REQUEST_AUTH=""
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

  if [[ -n "$token" ]]; then
    curl_args+=(-H "Authorization: Bearer $token")
    LAST_REQUEST_AUTH="Bearer <redacted>"
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
  if [[ -s "$TMP_DIR/jq_error" ]]; then
    sed 's/^/  jq: /' "$TMP_DIR/jq_error"
  fi
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
  if [[ -s "$TMP_DIR/jq_error" ]]; then
    sed 's/^/  jq: /' "$TMP_DIR/jq_error"
  fi
  return 1
}

register_payload() {
  jq -n \
    --arg email "$TEST_EMAIL" \
    --arg username "$TEST_USERNAME" \
    --arg password "$TEST_PASSWORD" \
    '{email:$email, username:$username, first_name:"Color", last_name:"Tester", password:$password}'
}

login_payload() {
  jq -n --arg email "$TEST_EMAIL" --arg password "$TEST_PASSWORD" '{email:$email, password:$password}'
}

color_payload() {
  jq -n --arg color "$1" '{color:$color}'
}

require_command curl jq sed date mktemp

section "Configuration"
config_line "BASE_URL" "$BASE_URL"
config_line "TEST_EMAIL" "$TEST_EMAIL"
config_line "TEST_USERNAME" "$TEST_USERNAME"
config_line "CURL_TIMEOUT" "$CURL_TIMEOUT"
config_line "ALLOWED_COLORS" "${ALLOWED_COLORS[*]}"

section "Setup: register a password user"
request "POST" "/auth/register" "$(register_payload)"
if expect_status "Register user for color checks" "201"; then
  assert_jq_eq "New users receive purple as the default color" '.data.user.color' "purple"
  assert_jq_true "Register returns an access token" '.data.access_token | type == "string" and length > 20'
  TOKEN="$(jq -r '.data.access_token // empty' "$LAST_BODY_FILE")"
fi

section "The color route requires a real bearer token"
request "PATCH" "/users/me/color" "$(color_payload "green")"
if expect_status "Color update rejects a missing bearer token" "401"; then
  assert_jq_eq "Missing-token response uses UNAUTHORIZED" '.error.code' "UNAUTHORIZED"
fi

request "PATCH" "/users/me/color" "$(color_payload "green")" "not-a-jwt"
if expect_status "Color update rejects an invalid bearer token" "401"; then
  assert_jq_eq "Invalid-token response uses UNAUTHORIZED" '.error.code' "UNAUTHORIZED"
fi

section "Invalid color requests are rejected"
if [[ -n "$TOKEN" ]]; then
  request "PATCH" "/users/me/color" '{"color":' "$TOKEN"
  if expect_status "Malformed JSON is rejected" "400"; then
    assert_jq_eq "Malformed JSON reports the body field" '.error.fields.body.message' "Invalid JSON body"
  fi

  request "PATCH" "/users/me/color" '{"color":"green","user_id":999}' "$TOKEN"
  if expect_status "Unknown JSON fields are rejected" "400"; then
    assert_jq_eq "Unknown fields report the body field" '.error.fields.body.message' "Invalid JSON body"
  fi

  request "PATCH" "/users/me/color" "$(color_payload "")" "$TOKEN"
  if expect_status "An empty color is rejected" "400"; then
    assert_jq_eq "Empty color reports the color field" '.error.fields.color.message' "Invalid user color"
  fi

  request "PATCH" "/users/me/color" "$(color_payload "orange")" "$TOKEN"
  if expect_status "A color outside the allowlist is rejected" "400"; then
    assert_jq_eq "Unsupported color reports the color field" '.error.fields.color.message' "Invalid user color"
  fi

  request "POST" "/auth/login" "$(login_payload)"
  if expect_status "Rejected requests do not change the stored default" "200"; then
    assert_jq_eq "Default remains purple after rejected updates" '.data.user.color' "purple"
  fi
else
  skip "Authenticated validation checks" "registration token was not available"
fi

section "Every supported profile color can be stored"
if [[ -n "$TOKEN" ]]; then
  for color in "${ALLOWED_COLORS[@]}"; do
    request "PATCH" "/users/me/color" "$(color_payload "$color")" "$TOKEN"
    if expect_status "Update profile color to $color" "200"; then
      assert_jq_eq "Response returns stored color $color" '.data.color' "$color"
    fi
  done
else
  skip "Allowed color updates" "registration token was not available"
fi

section "The selected color survives a new login"
request "POST" "/auth/login" "$(login_payload)"
if expect_status "Login reloads the color from storage" "200"; then
  assert_jq_eq "Login returns the last selected color" '.data.user.color' "red"
  assert_jq_true "Login still returns an access token" '.data.access_token | type == "string" and length > 20'
fi

section "Summary"
config_line "Passed" "$PASSED"
config_line "Failed" "$FAILED"
config_line "Skipped" "$SKIPPED"
config_line "Final color" "red"

if [[ "$FAILED" -ne 0 ]]; then
  printf '\n%bUser color API test failed.%b\n' "$RED" "$RESET" >&2
  exit 1
fi

printf '\n%bUser color API test passed.%b\n' "$GREEN" "$RESET"
