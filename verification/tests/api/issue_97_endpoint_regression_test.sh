#!/usr/bin/env bash

set -uo pipefail

# Regression checks for GitHub issue #97.
#
# Usage:
#   verification/tests/api/issue_97_endpoint_regression_test.sh
#   verification/tests/start_me --run issue-97
#
# Configuration:
#   BASE_URL=http://localhost:8080/api/v1
#   MOVIE_ID=tt0468569
#   CURL_TIMEOUT=45

BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"
BASE_URL="${BASE_URL%/}"
CURL_TIMEOUT="${CURL_TIMEOUT:-45}"
RUN_ID="$(date +%Y%m%d%H%M%S)-$$"
EMAIL="issue97-${RUN_ID}@example.test"
USERNAME="issue97_${RUN_ID//[^A-Za-z0-9_]/_}"
PASSWORD="Issue97Pass123!"
MOVIE_ID="${MOVIE_ID:-}"
INVALID_MOVIE_ID="issue97-missing-${RUN_ID}"
MISSING_COMMENT_ID="2147483647"

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/hypertube-issue97.XXXXXX")"
LAST_BODY_FILE="$TMP_DIR/last_body"
LAST_HEADERS_FILE="$TMP_DIR/last_headers"
LAST_CURL_ERR_FILE="$TMP_DIR/last_curl_err"
LAST_REQUEST_METHOD=""
LAST_REQUEST_URL=""
LAST_REQUEST_BODY=""
LAST_STATUS=""
LAST_CURL_EXIT=0
TOKEN=""
CREATED_COMMENT_ID=""

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
  if [[ -n "$CREATED_COMMENT_ID" && -n "$TOKEN" ]]; then
    curl --silent --show-error --max-time "$CURL_TIMEOUT" \
      -X DELETE \
      "$BASE_URL/comments/$CREATED_COMMENT_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Accept: application/json" \
      >/dev/null 2>&1 || true
  fi
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
  printf '  %b%-6s%b %s\n' "$YELLOW" "SKIP" "$RESET" "$1"
}

dump_last_response() {
  if [[ -n "$LAST_REQUEST_URL" ]]; then
    printf '    %b%-14s%b %s %s\n' "$DIM" "Request" "$RESET" "$LAST_REQUEST_METHOD" "$LAST_REQUEST_URL"
  fi
  if [[ -n "$LAST_REQUEST_BODY" ]]; then
    printf '    %b%s%b\n' "$DIM" "Payload" "$RESET"
    printf '%s' "$LAST_REQUEST_BODY" | jq . 2>/dev/null | sed 's/^/      /' || printf '%s\n' "$LAST_REQUEST_BODY" | sed 's/^/      /'
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
  local authenticated="${4:-false}"
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
  if [[ "$authenticated" == "true" ]]; then
    curl_args+=(-H "Authorization: Bearer $TOKEN")
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

assert_error_code() {
  local name="$1"
  local code="$2"
  assert_jq_true "$name" ".error.code == \"$code\""
}

assert_field_error() {
  local name="$1"
  local field="$2"
  assert_jq_true "$name" ".error.fields | has(\"$field\")"
}

register_and_login() {
  local payload

  payload="$(
    jq -n \
      --arg email "$EMAIL" \
      --arg username "$USERNAME" \
      --arg password "$PASSWORD" \
      '{
        email: $email,
        username: $username,
        first_name: "Issue",
        last_name: "Regression",
        password: $password
      }'
  )"

  request "POST" "/auth/register" "$payload"
  if [[ "$LAST_STATUS" != "201" && "$LAST_STATUS" != "409" ]]; then
    fail "register test user: expected HTTP 201 or 409, got $LAST_STATUS"
    return 1
  fi
  pass "register test user"

  payload="$(
    jq -n \
      --arg login "$EMAIL" \
      --arg password "$PASSWORD" \
      '{login: $login, password: $password}'
  )"

  request "POST" "/auth/login" "$payload"
  if ! expect_status "login test user" "200"; then
    return 1
  fi

  TOKEN="$(jq -r '.data.access_token // empty' "$LAST_BODY_FILE")"
  if [[ -z "$TOKEN" ]]; then
    fail "login response contains access token"
    return 1
  fi
  pass "login response contains access token"
}

select_movie() {
  if [[ -n "$MOVIE_ID" ]]; then
    pass "using MOVIE_ID=$MOVIE_ID"
    return 0
  fi

  request "GET" "/movies"
  if [[ "$LAST_STATUS" != "200" ]]; then
    skip "valid-movie checks: GET /movies did not return 200 and MOVIE_ID was not provided"
    return 1
  fi

  MOVIE_ID="$(jq -r '.data[0].imdb_id // empty' "$LAST_BODY_FILE" 2>/dev/null)"
  if [[ -z "$MOVIE_ID" ]]; then
    skip "valid-movie checks: movie list is empty; set MOVIE_ID=tt... to run them"
    return 1
  fi

  pass "selected MOVIE_ID=$MOVIE_ID"
}

run_auth_validation_checks() {
  section "Auth validation regressions"

  request "POST" "/auth/register" '{"email":"bad!prefix@example.com","username":"issue97_bad_email","first_name":"Issue","last_name":"Regression","password":"Issue97Pass123!"}'
  expect_status "register invalid email prefix" "400"
  assert_error_code "register invalid email prefix code" "VALIDATION_ERROR"
  assert_field_error "register invalid email prefix field" "email"

  request "POST" "/auth/register" '{"email":"issue97@example.c0m","username":"issue97_bad_tld","first_name":"Issue","last_name":"Regression","password":"Issue97Pass123!"}'
  expect_status "register invalid email TLD" "400"
  assert_error_code "register invalid email TLD code" "VALIDATION_ERROR"
  assert_field_error "register invalid email TLD field" "email"

  request "POST" "/auth/register" '{"email":"issue97-name@example.test","username":"issue97_bad_name","first_name":"Issue🙂","last_name":"Regression","password":"Issue97Pass123!"}'
  expect_status "register invalid first_name characters" "400"
  assert_error_code "register invalid first_name code" "VALIDATION_ERROR"
  assert_field_error "register invalid first_name field" "first_name"

  request "POST" "/auth/register" '{"email":6,"username":["test",5,false],"first_name":"Issue","last_name":false,"password":"Issue97Pass123!"}'
  expect_status "register invalid field types" "400"
  assert_error_code "register invalid field types code" "VALIDATION_ERROR"
  assert_field_error "register invalid email type field" "email"
  assert_field_error "register invalid username type field" "username"
  assert_field_error "register invalid last_name type field" "last_name"

  request "POST" "/auth/login" '{"login":454,"password":"Issue97Pass123!"}'
  expect_status "login invalid login type" "400"
  assert_error_code "login invalid login type code" "VALIDATION_ERROR"
  assert_field_error "login invalid login type field" "login"
  assert_jq_true "login does not return email field" '(.error.fields | has("email")) | not'

  request "POST" "/auth/login" '{"login":"issue97@example.test","password":false}'
  expect_status "login invalid password type" "400"
  assert_error_code "login invalid password type code" "VALIDATION_ERROR"
  assert_field_error "login invalid password type field" "password"
}

run_route_and_comment_error_checks() {
  section "Comment route and error-order regressions"

  request "POST" "/comments" '{"content":"should be method not allowed"}'
  expect_status "POST /comments is method not allowed before auth" "405"

  request "GET" "/comments/not-a-comment-id" "" "true"
  expect_status "GET /comments/{invalid_id}" "404"
  assert_error_code "GET /comments/{invalid_id} code" "NOT_FOUND"

  request "PATCH" "/comments/$MISSING_COMMENT_ID" '{"content":436}' "true"
  expect_status "PATCH missing comment wins over invalid body" "404"
  assert_error_code "PATCH missing comment code" "NOT_FOUND"

  request "GET" "/movies/$INVALID_MOVIE_ID/comments" "" "true"
  expect_status "GET /movies/{invalid_id}/comments" "404"
  assert_error_code "GET invalid movie comments code" "NOT_FOUND"

  request "POST" "/movies/$INVALID_MOVIE_ID/comments" '{"content":436}' "true"
  expect_status "POST /movies/{invalid_id}/comments wins over invalid body" "404"
  assert_error_code "POST invalid movie comments code" "NOT_FOUND"
}

run_valid_movie_comment_checks() {
  section "Valid movie comment regressions"

  if ! select_movie; then
    return 0
  fi

  request "GET" "/comments?page=0" "" "true"
  expect_status "GET /comments?page=0" "200"
  assert_jq_true "GET /comments?page=0 meta" '.meta.page == 0 and .meta.per_page == 12 and (.meta.total | type) == "number"'

  request "GET" "/movies/$MOVIE_ID/comments?page=0" "" "true"
  expect_status "GET /movies/{movie_id}/comments?page=0" "200"
  assert_jq_true "GET movie comments page meta" '.meta.page == 0 and .meta.per_page == 12 and (.meta.total | type) == "number"'

  request "POST" "/movies/$MOVIE_ID/comments" '{}' "true"
  expect_status "POST movie comment missing content" "400"
  assert_error_code "missing content code" "VALIDATION_ERROR"
  assert_field_error "missing content field" "content"

  request "POST" "/movies/$MOVIE_ID/comments" '{"content":"   "}' "true"
  expect_status "POST movie comment whitespace content" "400"
  assert_error_code "whitespace content code" "VALIDATION_ERROR"
  assert_field_error "whitespace content field" "content"

  request "POST" "/movies/$MOVIE_ID/comments" '{"content":436}' "true"
  expect_status "POST movie comment invalid content type" "400"
  assert_error_code "invalid content type code" "VALIDATION_ERROR"
  assert_field_error "invalid content type field" "content"
  assert_jq_true "invalid content type does not use body field" '(.error.fields | has("body")) | not'

  request "POST" "/movies/$MOVIE_ID/comments" '{"content":"  issue 97 trimmed content  "}' "true"
  expect_status "POST movie comment trims saved content" "201"
  assert_jq_true "created comment content is trimmed" '.data.content == "issue 97 trimmed content"'
  CREATED_COMMENT_ID="$(jq -r '.data.id // empty' "$LAST_BODY_FILE")"

  if [[ -z "$CREATED_COMMENT_ID" ]]; then
    fail "created comment response includes id"
    return 1
  fi
  pass "created comment response includes id $CREATED_COMMENT_ID"

  request "PATCH" "/comments/$CREATED_COMMENT_ID" '{"content":436}' "true"
  expect_status "PATCH existing comment invalid content type" "400"
  assert_error_code "PATCH invalid content type code" "VALIDATION_ERROR"
  assert_field_error "PATCH invalid content type field" "content"
  assert_jq_true "PATCH invalid content type does not use body field" '(.error.fields | has("body")) | not'

  request "PATCH" "/comments/$CREATED_COMMENT_ID" '{"content":"  issue 97 updated content  "}' "true"
  expect_status "PATCH existing comment trims content" "200"
  assert_jq_true "updated comment content is trimmed" '.data.content == "issue 97 updated content"'
}

main() {
  require_command curl jq sed date

  section "Issue #97 endpoint regression checks"
  printf '  BASE_URL: %s\n' "$BASE_URL"
  printf '  MOVIE_ID: %s\n' "${MOVIE_ID:-<auto>}"

  request "GET" "/health"
  expect_status "health check" "200" || {
    printf '\nAPI is not reachable at %s. Start it and rerun this test.\n' "$BASE_URL" >&2
    exit 1
  }

  run_auth_validation_checks

  section "Authenticated setup"
  if ! register_and_login; then
    printf '\nCannot continue authenticated issue #97 checks without a token.\n' >&2
    exit 1
  fi

  run_route_and_comment_error_checks
  run_valid_movie_comment_checks

  section "Summary"
  printf '  %bPassed%b  %d\n' "$GREEN" "$RESET" "$PASSED"
  printf '  %bFailed%b  %d\n' "$RED" "$RESET" "$FAILED"
  printf '  %bSkipped%b %d\n' "$YELLOW" "$RESET" "$SKIPPED"

  if [[ "$FAILED" -ne 0 ]]; then
    exit 1
  fi
}

main "$@"
