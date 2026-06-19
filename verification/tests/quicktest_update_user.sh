#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"
BASE_URL="${BASE_URL%/}"
CURL_TIMEOUT="${CURL_TIMEOUT:-20}"
RUN_ID="${API_TEST_RUN_ID:-$(date +%s)-$$-$RANDOM}"
MODE="${1:-full}"

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

register_payload_missing_field() {
  local field="$1"
  local safe_run_id="${RUN_ID//[^A-Za-z0-9]/_}"
  local suffix="${field//[^A-Za-z0-9]/_}"
  local email_local="missing-${suffix}-${safe_run_id}"
  local username="missing_${suffix}_${safe_run_id}"

  email_local="${email_local:0:60}"
  username="${username:0:32}"

  jq -n \
    --arg missing "$field" \
    --arg email "${email_local}@example.test" \
    --arg username "$username" \
    --arg password "$PASSWORD" \
    '{email:$email, username:$username, first_name:"Patch", last_name:"Owner", password:$password} | del(.[$missing])'
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
    '{email:$email, username:$username, first_name:$first_name, last_name:$last_name, color:"green"}'
}

usage() {
  cat <<EOF
Usage:
  $0 [full]
  $0 walkthrough
  $0 profile-picture
  $0 help

Modes:
  full             Run the complete PATCH /users regression suite (default).
  walkthrough      Step through the core user API flow with printed curl commands.
  profile-picture Step through the profile_picture protection regression from the CLI.

Useful environment variables:
  BASE_URL=http://localhost:8080/api/v1
  TOKEN=... USER_ID=...             Reuse an existing authenticated user.
  AUTH_RESULT_URL='...#access_token=...' Paste an OAuth callback URL non-interactively.
  LOGIN=... LOGIN_PASSWORD=...      Login and extract TOKEN/USER_ID before the steps.
  INTERACTIVE=0                     Do not pause before each request.
EOF
}

print_last_response() {
  printf '  HTTP status: %s\n' "${LAST_STATUS:-<none>}"
  printf '  Response body:\n'
  if [[ ! -s "$LAST_BODY_FILE" ]]; then
    printf '    <empty>\n'
  elif jq . "$LAST_BODY_FILE" >/dev/null 2>&1; then
    jq . "$LAST_BODY_FILE" | sed 's/^/    /'
  else
    sed 's/^/    /' "$LAST_BODY_FILE"
  fi
}

print_curl_command() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local token="${4:-}"

  printf '  URL: %s%s\n' "$BASE_URL" "$path"
  printf '  Command:\n'
  printf '    curl -i -X %s "%s%s" \\\n' "$method" "$BASE_URL" "$path"
  printf '      -H "Accept: application/json"'
  if [[ -n "$token" ]]; then
    printf ' \\\n      -H "Authorization: Bearer %s"' "$token"
  fi
  if [[ -n "$body" ]]; then
    printf ' \\\n      -H "Content-Type: application/json" \\\n'
    printf "      --data '%s'" "$body"
  fi
  printf '\n'
}

pause_before_request() {
  local ignored

  if [[ "${INTERACTIVE:-1}" == "0" ]]; then
    return
  fi

  printf '  Press Enter to run this request... '
  read -r ignored || true
}

run_step_request() {
  local title="$1"
  local method="$2"
  local path="$3"
  local body="${4:-}"
  local token="${5:-}"

  section "$title"
  print_curl_command "$method" "$path" "$body" "$token"
  pause_before_request
  request "$method" "$path" "$body" "$token"
  print_last_response
}

extract_url_param() {
  local text="$1"
  local key="$2"

  printf '%s\n' "$text" | sed -n "s/.*[?&#]$key=\([^&#]*\).*/\1/p" | sed -n '1p'
}

jwt_user_id() {
  local token="$1"
  local segment
  local mod
  local decoded

  if ! command -v base64 >/dev/null 2>&1; then
    return 1
  fi

  segment="${token#*.}"
  segment="${segment%%.*}"
  if [[ -z "$segment" || "$segment" == "$token" ]]; then
    return 1
  fi

  segment="$(printf '%s' "$segment" | tr '_-' '/+')"
  mod=$((${#segment} % 4))
  if [[ "$mod" -eq 2 ]]; then
    segment="${segment}=="
  elif [[ "$mod" -eq 3 ]]; then
    segment="${segment}="
  elif [[ "$mod" -eq 1 ]]; then
    return 1
  fi

  decoded="$(printf '%s' "$segment" | base64 -d 2>/dev/null || true)"
  if [[ -z "$decoded" ]]; then
    return 1
  fi

  jq -r '.user_id // .sub // empty' <<<"$decoded" 2>/dev/null
}

extract_auth_from_response() {
  USER_A_TOKEN="$(jq -r '.data.access_token // empty' "$LAST_BODY_FILE")"
  USER_A_ID="$(jq -r '.data.user.id // empty' "$LAST_BODY_FILE")"
}

load_profile_picture_identity() {
  local pasted_url="${AUTH_RESULT_URL:-}"
  local pasted_token=""
  local decoded_user_id=""

  if [[ -n "${TOKEN:-}" && -n "${USER_ID:-}" ]]; then
    USER_A_TOKEN="$TOKEN"
    USER_A_ID="$USER_ID"
    printf '  Using TOKEN and USER_ID from the environment.\n'
    return
  fi

  if [[ -z "$pasted_url" && "${INTERACTIVE:-1}" != "0" ]]; then
    section "Optional existing auth"
    printf '  Paste a callback URL containing #access_token=... and press Enter,\n'
    printf '  or just press Enter to create a fresh password test user.\n'
    printf '  Callback URL: '
    read -r pasted_url || true
  fi

  if [[ -n "$pasted_url" ]]; then
    pasted_token="$(extract_url_param "$pasted_url" "access_token")"
    if [[ -n "$pasted_token" ]]; then
      USER_A_TOKEN="$pasted_token"
      decoded_user_id="$(jwt_user_id "$USER_A_TOKEN" || true)"
      if [[ -n "$decoded_user_id" ]]; then
        USER_A_ID="$decoded_user_id"
      elif [[ -n "${USER_ID:-}" ]]; then
        USER_A_ID="$USER_ID"
      elif [[ "${INTERACTIVE:-1}" != "0" ]]; then
        printf '  User ID for this token: '
        read -r USER_A_ID || true
      fi
      if [[ -n "$USER_A_ID" ]]; then
        printf '  Extracted access token from callback URL.\n'
        return
      fi
    fi
    printf '  Could not extract access_token and USER_ID from the pasted value.\n'
  fi

  if [[ -n "${LOGIN:-}" && -n "${LOGIN_PASSWORD:-}" ]]; then
    run_step_request "Login existing user" POST /auth/login "$(login_payload "$LOGIN" "$LOGIN_PASSWORD")"
    if expect_status "Login existing user" "200"; then
      extract_auth_from_response
    fi
    return
  fi

  run_step_request "Register fresh test user" POST /auth/register "$(register_payload "$USER_A_EMAIL" "$USER_A_USERNAME" "Patch" "Owner")"
  if expect_status "Register fresh test user" "201"; then
    extract_auth_from_response
  fi
}

run_profile_picture_steps() {
  require_command curl jq sed date mktemp grep

  section "Configuration"
  printf '  BASE_URL=%s\n' "$BASE_URL"
  printf '  Mode=profile-picture\n'

  load_profile_picture_identity

  if [[ -z "$USER_A_TOKEN" || -z "$USER_A_ID" ]]; then
    fail "Could not get TOKEN and USER_ID for profile_picture steps"
    finish
  fi

  section "Captured auth"
  printf '  USER_ID=%s\n' "$USER_A_ID"
  printf '  TOKEN=%s\n' "$USER_A_TOKEN"

  run_step_request \
    "Reject profile_picture URL" \
    PATCH \
    "/users/$USER_A_ID" \
    '{"profile_picture":"https://example.test/avatar.png"}' \
    "$USER_A_TOKEN"
  if expect_status "PATCH rejects profile_picture URL" "400"; then
    assert_jq_eq "Profile picture URL uses validation error" '.error.code' "VALIDATION_ERROR"
    assert_jq_true "Profile picture URL reports profile_picture field" '.error.fields.profile_picture.message | type == "string" and length > 0'
  fi

  run_step_request \
    "Clear profile_picture with null" \
    PATCH \
    "/users/$USER_A_ID" \
    '{"profile_picture":null}' \
    "$USER_A_TOKEN"
  if expect_status "PATCH clears profile_picture" "200"; then
    assert_jq_true "Clear response includes profile_picture as null" '(.data | has("profile_picture")) and .data.profile_picture == null'
  fi

  finish
}

walkthrough_note() {
  printf '  Expected: %s\n' "$1"
}

run_walkthrough() {
  require_command curl jq sed date mktemp grep

  section "Configuration"
  printf '  BASE_URL=%s\n' "$BASE_URL"
  printf '  Mode=walkthrough\n'
  printf '  This mode creates two fresh users and walks through the core profile API.\n'
  printf '  Set INTERACTIVE=0 to run without pressing Enter between requests.\n'

  run_step_request \
    "1. Register user A" \
    POST \
    /auth/register \
    "$(register_payload "$USER_A_EMAIL" "$USER_A_USERNAME" "Patch" "Owner")"
  walkthrough_note "201 with access_token and user id"
  if expect_status "Register user A" "201"; then
    USER_A_TOKEN="$(jq -r '.data.access_token // empty' "$LAST_BODY_FILE")"
    USER_A_ID="$(jq -r '.data.user.id // empty' "$LAST_BODY_FILE")"
    assert_jq_true "User A token exists" '.data.access_token | type == "string" and length > 20'
    assert_jq_true "User A id exists" '.data.user.id | type == "number"'
  fi

  run_step_request \
    "2. Register user B" \
    POST \
    /auth/register \
    "$(register_payload "$USER_B_EMAIL" "$USER_B_USERNAME" "Patch" "Other")"
  walkthrough_note "201 with access_token and user id"
  if expect_status "Register user B" "201"; then
    USER_B_TOKEN="$(jq -r '.data.access_token // empty' "$LAST_BODY_FILE")"
    USER_B_ID="$(jq -r '.data.user.id // empty' "$LAST_BODY_FILE")"
    assert_jq_true "User B token exists" '.data.access_token | type == "string" and length > 20'
    assert_jq_true "User B id exists" '.data.user.id | type == "number"'
  fi

  if [[ -z "$USER_A_TOKEN" || -z "$USER_A_ID" || -z "$USER_B_TOKEN" || -z "$USER_B_ID" ]]; then
    fail "Could not create both walkthrough users"
    finish
  fi

  run_step_request \
    "3. User A reads user B public profile" \
    GET \
    "/users/$USER_B_ID" \
    "" \
    "$USER_A_TOKEN"
  walkthrough_note "200, public profile only; no private email or password fields"
  if expect_status "Authenticated user can read another profile" "200"; then
    assert_jq_eq "Public profile id is user B" '.data.id | tostring' "$USER_B_ID"
    assert_body_not_contains "Public profile does not expose user B email" "$USER_B_EMAIL"
    assert_body_not_contains "Public profile does not expose password_hash" "password_hash"
  fi

  run_step_request \
    "4. User A tries to update user B" \
    PATCH \
    "/users/$USER_B_ID" \
    '{"color":"blue"}' \
    "$USER_A_TOKEN"
  walkthrough_note "403 because users may only update their own profile"
  if expect_status "Cross-user profile update is forbidden" "403"; then
    assert_jq_eq "Forbidden response code" '.error.code' "FORBIDDEN"
  fi

  run_step_request \
    "5. User A updates their own profile" \
    PATCH \
    "/users/$USER_A_ID" \
    "$(patch_profile_payload)" \
    "$USER_A_TOKEN"
  walkthrough_note "200 with the updated profile fields"
  if expect_status "Own profile update succeeds" "200"; then
    assert_jq_eq "Updated response id" '.data.id | tostring' "$USER_A_ID"
    assert_jq_eq "Updated email" '.data.email' "$UPDATED_EMAIL"
    assert_jq_eq "Updated username" '.data.username' "$UPDATED_USERNAME"
    assert_jq_eq "Updated color" '.data.color' "green"
    assert_body_not_contains "Profile update response does not expose password_hash" "password_hash"
  fi

  run_step_request \
    "6. User B reads user A public profile after the update" \
    GET \
    "/users/$USER_A_ID" \
    "" \
    "$USER_B_TOKEN"
  walkthrough_note "200, updated public fields visible, private email hidden"
  if expect_status "Updated public profile is readable" "200"; then
    assert_jq_eq "Public username is updated" '.data.username' "$UPDATED_USERNAME"
    assert_body_not_contains "Public profile does not expose updated email" "$UPDATED_EMAIL"
  fi

  run_step_request \
    "7. User A sends one invalid update" \
    PATCH \
    "/users/$USER_A_ID" \
    '{"email":"not-an-email"}' \
    "$USER_A_TOKEN"
  walkthrough_note "400 with a validation error"
  if expect_status "Invalid email update is rejected" "400"; then
    assert_jq_eq "Invalid email uses validation error" '.error.code' "VALIDATION_ERROR"
    assert_jq_true "Invalid email reports email field" '.error.fields.email.message | type == "string" and length > 0'
  fi

  run_step_request \
    "8. User A clears their profile picture" \
    PATCH \
    "/users/$USER_A_ID" \
    '{"profile_picture":null}' \
    "$USER_A_TOKEN"
  walkthrough_note "200 and profile_picture is returned as null"
  if expect_status "Profile picture can be cleared" "200"; then
    assert_jq_true "Profile picture is null" '(.data | has("profile_picture")) and .data.profile_picture == null'
  fi

  run_step_request \
    "9. User A changes password" \
    PATCH \
    "/users/$USER_A_ID" \
    "$(jq -n --arg password "$NEW_PASSWORD" '{password:$password}')" \
    "$USER_A_TOKEN"
  walkthrough_note "200 without plaintext password or password_hash in the response"
  if expect_status "Password update succeeds" "200"; then
    assert_body_not_contains "Password update response does not expose plaintext password" "$NEW_PASSWORD"
    assert_body_not_contains "Password update response does not expose password_hash" "password_hash"
  fi

  run_step_request \
    "10. Login with new password" \
    POST \
    /auth/login \
    "$(login_payload "$UPDATED_EMAIL" "$NEW_PASSWORD")"
  walkthrough_note "200 for the new password"
  if expect_status "Login works with new password" "200"; then
    assert_jq_eq "Login returns user A id" '.data.user.id | tostring' "$USER_A_ID"
  fi

  run_step_request \
    "11. Login with old password" \
    POST \
    /auth/login \
    "$(login_payload "$UPDATED_EMAIL" "$PASSWORD")"
  walkthrough_note "401 for the old password"
  if expect_status "Old password no longer works" "401"; then
    assert_jq_eq "Old password failure code" '.error.code' "INVALID_CREDENTIALS"
  fi

  finish
}

run_full_suite() {
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
for missing_field in email username first_name last_name password; do
  request POST /auth/register "$(register_payload_missing_field "$missing_field")"
  if expect_status "Register rejects missing $missing_field" "400"; then
    assert_jq_eq "Missing $missing_field uses VALIDATION_ERROR" '.error.code' "VALIDATION_ERROR"
    assert_jq_true "Missing $missing_field reports field error" ".error.fields[\"$missing_field\"].message | type == \"string\" and length > 0"
    assert_jq_true "Missing $missing_field has no top-level invalid JSON message" '(.error.message // "") == ""'
  fi
done

request POST /auth/register '{}'
if expect_status "Register rejects empty object" "400"; then
  assert_jq_eq "Empty register object uses VALIDATION_ERROR" '.error.code' "VALIDATION_ERROR"
  for required_field in email username first_name last_name password; do
    assert_jq_true "Empty register object reports $required_field" ".error.fields[\"$required_field\"].message | type == \"string\" and length > 0"
  done
  assert_jq_true "Empty register object has no top-level invalid JSON message" '(.error.message // "") == ""'
fi

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
  assert_jq_eq "Updated response color" '.data.color' "green"
  assert_body_not_contains "Profile update response does not leak password_hash key" "password_hash"
fi

request PATCH "/users/$USER_A_ID" '{"profile_picture":"https://example.test/avatar.png"}' "$USER_A_TOKEN"
if expect_status "PATCH rejects profile picture URL" "400"; then
  assert_jq_eq "Profile picture URL uses VALIDATION_ERROR" '.error.code' "VALIDATION_ERROR"
  assert_jq_true "Profile picture URL reports profile_picture field" '.error.fields.profile_picture.message | type == "string" and length > 0'
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
  assert_jq_true "Removed profile picture is present and null" '(.data | has("profile_picture")) and .data.profile_picture == null'
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
}

case "$MODE" in
  full)
    run_full_suite
    ;;
  walkthrough|walk-through|steps)
    run_walkthrough
    ;;
  profile-picture|profile_picture|avatar)
    run_profile_picture_steps
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    printf 'Unknown mode: %s\n\n' "$MODE" >&2
    usage >&2
    exit 2
    ;;
esac
