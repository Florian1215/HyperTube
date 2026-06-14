#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"
BASE_URL="${BASE_URL%/}"
CURL_TIMEOUT="${CURL_TIMEOUT:-20}"
RUN_ID="${API_TEST_RUN_ID:-$(date +%s)-$$-$RANDOM}"

USER_A_EMAIL="patch-a-${RUN_ID}@example.test"
USER_A_USERNAME="patch_a_${RUN_ID//[^A-Za-z0-9]/_}"
USER_A_USERNAME="${USER_A_USERNAME:0:32}"
USER_B_EMAIL="patch-b-${RUN_ID}@example.test"
USER_B_USERNAME="patch_b_${RUN_ID//[^A-Za-z0-9]/_}"
USER_B_USERNAME="${USER_B_USERNAME:0:32}"
UPDATED_EMAIL="updated-${USER_A_EMAIL}"
UPDATED_USERNAME="updated_${USER_A_USERNAME:0:20}"
PASSWORD="PatchPass123!"
NEW_PASSWORD="NewPatchPass123!"

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/hypertube-user-patch-test.XXXXXX")"
LAST_BODY_FILE="$TMP_DIR/last_body"
LAST_HEADERS_FILE="$TMP_DIR/last_headers"
LAST_CURL_ERR_FILE="$TMP_DIR/last_curl_err"
LAST_METHOD=""
LAST_PATH=""
LAST_BODY=""
LAST_STATUS=""
LAST_CURL_EXIT=0

PASSED=0
FAILED=0
USER_A_TOKEN=""
USER_B_TOKEN=""
USER_A_ID=""
USER_B_ID=""
USER_B_INITIAL_COLOR=""

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
  printf '\n== %s ==\n' "$1"
}

pass() {
  PASSED=$((PASSED + 1))
  printf '  PASS  %s\n' "$1"
}

fail() {
  FAILED=$((FAILED + 1))
  printf '  FAIL  %s\n' "$1" >&2
  dump_last_response >&2
}

finish() {
  printf '\nSummary: %d passed, %d failed\n' "$PASSED" "$FAILED"
  if [[ "$FAILED" -ne 0 ]]; then
    exit 1
  fi
}

dump_last_response() {
  if [[ -n "$LAST_METHOD" ]]; then
    printf '    Request: %s %s%s\n' "$LAST_METHOD" "$BASE_URL" "$LAST_PATH"
  fi
  if [[ -n "$LAST_BODY" ]]; then
    printf '    Payload:\n'
    if jq . >/dev/null 2>&1 <<<"$LAST_BODY"; then
      jq 'if type == "object" and has("password") then .password = "<redacted>" else . end' <<<"$LAST_BODY" | sed 's/^/      /'
    else
      printf '%s\n' "$LAST_BODY" | sed 's/^/      /'
    fi
  fi
  if [[ "$LAST_CURL_EXIT" -ne 0 && -s "$LAST_CURL_ERR_FILE" ]]; then
    printf '    Curl error:\n'
    sed 's/^/      /' "$LAST_CURL_ERR_FILE"
  fi
  printf '    Status: %s\n' "${LAST_STATUS:-<none>}"
  printf '    Body:\n'
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
  local curl_args

  : >"$LAST_BODY_FILE"
  : >"$LAST_HEADERS_FILE"
  : >"$LAST_CURL_ERR_FILE"

  LAST_METHOD="$method"
  LAST_PATH="$path"
  LAST_BODY="$body"
  LAST_STATUS=""
  LAST_CURL_EXIT=0

  curl_args=(
    --silent
    --show-error
    --max-time "$CURL_TIMEOUT"
    -X "$method"
    "$BASE_URL$path"
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
  fi

  set +e
  LAST_STATUS="$(curl "${curl_args[@]}" 2>"$LAST_CURL_ERR_FILE")"
  LAST_CURL_EXIT=$?
  set -e
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
  local jq_exit

  set +e
  actual="$(jq -r "$filter" "$LAST_BODY_FILE" 2>"$TMP_DIR/jq_error")"
  jq_exit=$?
  set -e

  if [[ "$jq_exit" -eq 0 && "$actual" == "$expected" ]]; then
    pass "$name"
    return 0
  fi

  fail "$name: expected '$expected', got '${actual:-<jq failed>}'"
  if [[ -s "$TMP_DIR/jq_error" ]]; then
    sed 's/^/    jq: /' "$TMP_DIR/jq_error" >&2
  fi
  return 0
}

assert_jq_true() {
  local name="$1"
  local filter="$2"
  local jq_exit

  set +e
  jq -e "$filter" "$LAST_BODY_FILE" >/dev/null 2>"$TMP_DIR/jq_error"
  jq_exit=$?
  set -e

  if [[ "$jq_exit" -eq 0 ]]; then
    pass "$name"
    return 0
  fi

  fail "$name: jq assertion failed: $filter"
  if [[ -s "$TMP_DIR/jq_error" ]]; then
    sed 's/^/    jq: /' "$TMP_DIR/jq_error" >&2
  fi
  return 0
}

assert_body_not_contains() {
  local name="$1"
  local needle="$2"

  if grep -Fq "$needle" "$LAST_BODY_FILE"; then
    fail "$name: response contains forbidden text '$needle'"
    return 0
  fi

  pass "$name"
}

register_payload() {
  jq -n \
    --arg email "$1" \
    --arg username "$2" \
    --arg first_name "$3" \
    --arg last_name "$4" \
    --arg password "$PASSWORD" \
    '{email:$email, username:$username, first_name:$first_name, last_name:$last_name, password:$password}'
}

login_payload() {
  jq -n --arg login "$1" --arg password "$2" '{login:$login, password:$password}'
}

patch_profile_payload() {
  jq -n \
    --arg email "$UPDATED_EMAIL" \
    --arg username "$UPDATED_USERNAME" \
    --arg first_name "Ada" \
    --arg last_name "Lovelace" \
    --arg profile_picture "https://example.test/avatar.png" \
    '{email:$email, username:$username, first_name:$first_name, last_name:$last_name, profile_picture:$profile_picture, color:"green"}'
}

require_command curl jq sed date mktemp grep

section "Configuration"
printf '  BASE_URL=%s\n' "$BASE_URL"
printf '  USER_A_EMAIL=%s\n' "$USER_A_EMAIL"
printf '  USER_A_USERNAME=%s\n' "$USER_A_USERNAME"
printf '  USER_B_EMAIL=%s\n' "$USER_B_EMAIL"
printf '  USER_B_USERNAME=%s\n' "$USER_B_USERNAME"

section "Setup"
request POST /auth/register "$(register_payload "$USER_A_EMAIL" "$USER_A_USERNAME" "Patch" "Owner")"
if expect_status "Register user A" "201"; then
  assert_jq_true "Register A returns a bearer token" '.data.access_token | type == "string" and length > 20'
  assert_jq_true "Register A returns a numeric id" '.data.user.id | type == "number"'
  assert_jq_eq "Register A returns requested email" '.data.user.email' "$USER_A_EMAIL"
  USER_A_TOKEN="$(jq -r '.data.access_token' "$LAST_BODY_FILE")"
  USER_A_ID="$(jq -r '.data.user.id' "$LAST_BODY_FILE")"
fi

request POST /auth/register "$(register_payload "$USER_B_EMAIL" "$USER_B_USERNAME" "Patch" "Other")"
if expect_status "Register user B" "201"; then
  assert_jq_true "Register B returns a bearer token" '.data.access_token | type == "string" and length > 20'
  assert_jq_true "Register B returns a numeric id" '.data.user.id | type == "number"'
  USER_B_TOKEN="$(jq -r '.data.access_token' "$LAST_BODY_FILE")"
  USER_B_ID="$(jq -r '.data.user.id' "$LAST_BODY_FILE")"
  USER_B_INITIAL_COLOR="$(jq -r '.data.user.color' "$LAST_BODY_FILE")"
fi

if [[ -z "$USER_A_TOKEN" || -z "$USER_A_ID" || -z "$USER_B_TOKEN" || -z "$USER_B_ID" ]]; then
  printf 'Setup failed, cannot continue.\n' >&2
  finish
fi

section "Authentication and ownership"
request PATCH "/users/$USER_A_ID" '{"color":"yellow"}'
if expect_status "PATCH rejects missing bearer token" "401"; then
  assert_jq_eq "Missing token uses UNAUTHORIZED" '.error.code' "UNAUTHORIZED"
fi

request PATCH "/users/$USER_A_ID" '{"color":"yellow"}' "not-a-jwt"
if expect_status "PATCH rejects invalid bearer token" "401"; then
  assert_jq_eq "Invalid token uses UNAUTHORIZED" '.error.code' "UNAUTHORIZED"
fi

request PATCH "/users/$USER_B_ID" '{"color":"blue"}' "$USER_A_TOKEN"
if expect_status "PATCH rejects another user's id" "403"; then
  assert_jq_eq "Cross-user update uses FORBIDDEN" '.error.code' "FORBIDDEN"
fi

request GET "/users/$USER_B_ID" "" "$USER_B_TOKEN"
if expect_status "Forbidden update did not break user B lookup" "200"; then
  assert_jq_eq "User B color stayed unchanged after forbidden update" '.data.color' "$USER_B_INITIAL_COLOR"
fi

section "Validation"
request PATCH "/users/abc" '{"color":"green"}' "$USER_A_TOKEN"
if expect_status "PATCH rejects invalid path id" "404"; then
  assert_jq_eq "Invalid id uses NOT_FOUND" '.error.code' "NOT_FOUND"
fi

request PATCH "/users/$USER_A_ID" '{"color":' "$USER_A_TOKEN"
if expect_status "PATCH rejects malformed JSON" "400"; then
  assert_jq_eq "Malformed JSON uses BAD_REQUEST" '.error.code' "BAD_REQUEST"
fi

request PATCH "/users/$USER_A_ID" '{"color":"green"} {}' "$USER_A_TOKEN"
if expect_status "PATCH rejects multiple JSON documents" "400"; then
  assert_jq_eq "Multiple JSON docs use BAD_REQUEST" '.error.code' "BAD_REQUEST"
fi

request PATCH "/users/$USER_A_ID" '{"role":"admin"}' "$USER_A_TOKEN"
if expect_status "PATCH rejects unknown fields" "400"; then
  assert_jq_eq "Unknown field uses BAD_REQUEST" '.error.code' "BAD_REQUEST"
fi

request PATCH "/users/$USER_A_ID" '{}' "$USER_A_TOKEN"
if expect_status "PATCH rejects empty object" "400"; then
  assert_jq_eq "Empty object uses VALIDATION_ERROR" '.error.code' "VALIDATION_ERROR"
  assert_jq_true "Empty object reports body field" '.error.fields.body.message | type == "string" and length > 0'
fi

request PATCH "/users/$USER_A_ID" '{"color":"orange"}' "$USER_A_TOKEN"
if expect_status "PATCH rejects invalid color" "400"; then
  assert_jq_eq "Invalid color uses VALIDATION_ERROR" '.error.code' "VALIDATION_ERROR"
  assert_jq_true "Invalid color reports color field" '.error.fields.color.message | type == "string" and length > 0'
fi

request PATCH "/users/$USER_A_ID" '{"email":"not-an-email"}' "$USER_A_TOKEN"
if expect_status "PATCH rejects invalid email" "400"; then
  assert_jq_true "Invalid email reports email field" '.error.fields.email.message | type == "string" and length > 0'
fi

request PATCH "/users/$USER_A_ID" '{"password":"short"}' "$USER_A_TOKEN"
if expect_status "PATCH rejects short password" "400"; then
  assert_jq_true "Short password reports password field" '.error.fields.password.message | type == "string" and length > 0'
fi

request PATCH "/users/$USER_A_ID" "$(jq -n --arg email "$USER_B_EMAIL" '{email:$email}')" "$USER_A_TOKEN"
if expect_status "PATCH rejects duplicate email" "409"; then
  assert_jq_eq "Duplicate email uses ALREADY_EXIST_ERROR" '.error.code' "ALREADY_EXIST_ERROR"
  assert_jq_true "Duplicate email reports email field" '.error.fields.email.message | type == "string" and length > 0'
fi

request PATCH "/users/$USER_A_ID" "$(jq -n --arg username "$USER_B_USERNAME" '{username:$username}')" "$USER_A_TOKEN"
if expect_status "PATCH rejects duplicate username" "409"; then
  assert_jq_eq "Duplicate username uses ALREADY_EXIST_ERROR" '.error.code' "ALREADY_EXIST_ERROR"
  assert_jq_true "Duplicate username reports username field" '.error.fields.username.message | type == "string" and length > 0'
fi

section "Successful profile updates"
request PATCH "/users/$USER_A_ID" "$(patch_profile_payload)" "$USER_A_TOKEN"
if expect_status "PATCH updates own full profile" "200"; then
  assert_jq_eq "Updated response id" '.data.id | tostring' "$USER_A_ID"
  assert_jq_eq "Updated response email" '.data.email' "$UPDATED_EMAIL"
  assert_jq_eq "Updated response username" '.data.username' "$UPDATED_USERNAME"
  assert_jq_eq "Updated response first_name" '.data.first_name' "Ada"
  assert_jq_eq "Updated response last_name" '.data.last_name' "Lovelace"
  assert_jq_eq "Updated response profile_picture" '.data.profile_picture' "https://example.test/avatar.png"
  assert_jq_eq "Updated response color" '.data.color' "green"
  assert_body_not_contains "Profile update response does not leak password_hash key" "password_hash"
fi

request POST /auth/login "$(login_payload "$UPDATED_EMAIL" "$PASSWORD")"
if expect_status "Login works with updated email and old password" "200"; then
  assert_jq_eq "Login returns updated email" '.data.user.email' "$UPDATED_EMAIL"
  USER_A_TOKEN="$(jq -r '.data.access_token' "$LAST_BODY_FILE")"
fi

request PATCH "/users/$USER_A_ID" '{"color":"red"}' "$USER_A_TOKEN"
if expect_status "PATCH updates color only" "200"; then
  assert_jq_eq "Color-only response is red" '.data.color' "red"
fi

request GET "/users/$USER_A_ID" "" "$USER_A_TOKEN"
if expect_status "GET user after color update" "200"; then
  assert_jq_eq "Public profile exposes persisted color" '.data.color' "red"
  assert_body_not_contains "Public profile does not leak email" "$UPDATED_EMAIL"
fi

request PATCH "/users/$USER_A_ID" '{"profile_picture":null}' "$USER_A_TOKEN"
if expect_status "PATCH removes profile picture with null" "200"; then
  assert_jq_true "Removed profile picture is omitted or empty" '(.data.profile_picture // "") == ""'
fi

request PATCH "/users/$USER_A_ID" '{"password":"NewPatchPass123!"}' "$USER_A_TOKEN"
if expect_status "PATCH updates password" "200"; then
  assert_body_not_contains "Password update response does not leak plaintext password" "$NEW_PASSWORD"
  assert_body_not_contains "Password update response does not leak password_hash key" "password_hash"
fi

request POST /auth/login "$(login_payload "$UPDATED_EMAIL" "$NEW_PASSWORD")"
if expect_status "Login works with new password" "200"; then
  assert_jq_eq "Login after password change returns same user id" '.data.user.id | tostring' "$USER_A_ID"
fi

request POST /auth/login "$(login_payload "$UPDATED_EMAIL" "$PASSWORD")"
if expect_status "Old password no longer works" "401"; then
  assert_jq_eq "Old password failure uses INVALID_CREDENTIALS" '.error.code' "INVALID_CREDENTIALS"
fi

finish
