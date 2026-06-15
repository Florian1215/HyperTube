#!/usr/bin/env bash

set -uo pipefail

# Curl/jq regression checks for issue #191: GET /users?page= pagination.
#
# Usage:
#   verification/tests/api/issue_191_users_pagination_test.sh
#   verification/tests/start_me --run issue-191
#
# Configuration:
#   BASE_URL=http://localhost:8080/api/v1
#   CREATED_USERS=14
#   CURL_TIMEOUT=45

BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"
BASE_URL="${BASE_URL%/}"
CREATED_USERS="${CREATED_USERS:-14}"
CURL_TIMEOUT="${CURL_TIMEOUT:-45}"
RUN_ID="$(date +%Y%m%d%H%M%S)-$$"
SHORT_ID="$(date +%H%M%S)$(( $$ % 10000 ))"
EMAIL_PREFIX="issue191-${RUN_ID}"
USERNAME_PREFIX="i191_${SHORT_ID}"
PASSWORD="Issue191Pass123!"

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/hypertube-issue191.XXXXXX")"
LAST_BODY_FILE="$TMP_DIR/last_body"
LAST_HEADERS_FILE="$TMP_DIR/last_headers"
LAST_CURL_ERR_FILE="$TMP_DIR/last_curl_err"
PAGE_DEFAULT_FILE="$TMP_DIR/users_default.json"
PAGE_ONE_FILE="$TMP_DIR/users_page_1.json"
PAGE_TWO_FILE="$TMP_DIR/users_page_2.json"
LAST_REQUEST_METHOD=""
LAST_REQUEST_URL=""
LAST_REQUEST_BODY=""
LAST_REQUEST_AUTH=""
LAST_STATUS=""
LAST_CURL_EXIT=0
TOKEN=""

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

dump_last_response() {
  if [[ -n "$LAST_REQUEST_URL" ]]; then
    printf '    %b%-14s%b %s %s\n' "$DIM" "Request" "$RESET" "$LAST_REQUEST_METHOD" "$LAST_REQUEST_URL"
  fi
  if [[ -n "$LAST_REQUEST_AUTH" ]]; then
    printf '    %b%-14s%b %s\n' "$DIM" "Authorization" "$RESET" "$LAST_REQUEST_AUTH"
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

print_curl_command() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local authenticated="${4:-false}"

  printf '  %bcurl%b -sS --max-time %q -X %q %q' "$DIM" "$RESET" "$CURL_TIMEOUT" "$method" "$url"
  printf ' -H %q' "Accept: application/json"
  if [[ -n "$body" ]]; then
    printf ' -H %q --data %q' "Content-Type: application/json" "$body"
  fi
  if [[ "$authenticated" == "true" ]]; then
    printf ' -H %q' "Authorization: Bearer <token>"
  fi
  printf '\n'
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
  LAST_REQUEST_AUTH=""
  LAST_STATUS=""
  LAST_CURL_EXIT=0

  print_curl_command "$method" "$url" "$body" "$authenticated"

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

assert_jq_true() {
	local name="$1"
	local file="$2"
	local filter="$3"
	local previous_body_file="$LAST_BODY_FILE"
	shift 3

	if jq -e "$@" "$filter" "$file" >/dev/null 2>"$TMP_DIR/jq_error"; then
    pass "$name"
    return 0
	fi

	LAST_BODY_FILE="$file"
	fail "$name: jq assertion failed: $filter"
	LAST_BODY_FILE="$previous_body_file"
	return 1
}

assert_same_ids() {
  local name="$1"
	local file="$2"
	local expected_ids="$3"
	local got_ids
	local previous_body_file="$LAST_BODY_FILE"

  got_ids="$(jq -c '[.data[].id]' "$file" 2>/dev/null || true)"
  if [[ "$got_ids" == "$expected_ids" ]]; then
    pass "$name"
    return 0
  fi

	LAST_BODY_FILE="$file"
	fail "$name: expected IDs $expected_ids, got ${got_ids:-<invalid json>}"
	LAST_BODY_FILE="$previous_body_file"
	return 1
}

assert_no_overlap() {
	local name="$1"
	local left_file="$2"
	local right_file="$3"
	local previous_body_file="$LAST_BODY_FILE"

  if jq -e --slurp '
    (.[0].data | map(.id)) as $left
    | (.[1].data | map(.id)) as $right
    | (($left - ($left - $right)) | length) == 0
  ' "$left_file" "$right_file" >/dev/null 2>"$TMP_DIR/jq_error"; then
    pass "$name"
    return 0
  fi

	LAST_BODY_FILE="$right_file"
	fail "$name: page IDs overlap"
	LAST_BODY_FILE="$previous_body_file"
	return 1
}

print_users_summary() {
  local title="$1"
  local file="$2"

  printf '\n  %b%s%b\n' "$BOLD" "$title" "$RESET"
  jq '{
    meta: .meta,
    data_count: (.data | length),
    ids: (.data | map(.id)),
    usernames: (.data | map(.username))
  }' "$file"
}

register_test_users() {
  local i
  local email
  local username
  local payload

  for ((i = 1; i <= CREATED_USERS; i++)); do
    email="${EMAIL_PREFIX}-${i}@example.test"
    username="${USERNAME_PREFIX}_${i}"
    payload="$(
      jq -n \
        --arg email "$email" \
        --arg username "$username" \
        --arg password "$PASSWORD" \
        '{
          email: $email,
          username: $username,
          first_name: "Issue",
          last_name: "Pagination",
          password: $password
        }'
    )"

    request "POST" "/auth/register" "$payload"
    if ! expect_status "register pagination user $i" "201"; then
      return 1
    fi

    if [[ -z "$TOKEN" ]]; then
      TOKEN="$(jq -r '.data.access_token // empty' "$LAST_BODY_FILE" 2>/dev/null)"
    fi
  done

  if [[ -z "$TOKEN" ]]; then
    fail "first register response contains access token"
    return 1
  fi
  pass "captured bearer token for protected /users requests"
}

check_users_page() {
  local path="$1"
  local output_file="$2"
  local expected_page="$3"

  request "GET" "$path" "" "true"
  if ! expect_status "GET $path" "200"; then
    return 1
  fi

  cp "$LAST_BODY_FILE" "$output_file"
  print_users_summary "Response summary for GET $path" "$output_file"

  assert_jq_true "GET $path returns list data" "$output_file" '.data | type == "array"'
  assert_jq_true "GET $path has numeric meta.total" "$output_file" '.meta.total | type == "number"'
  assert_jq_true "GET $path meta.page == $expected_page" "$output_file" ".meta.page == $expected_page"
  assert_jq_true "GET $path meta.per_page == 12" "$output_file" '.meta.per_page == 12'
  assert_jq_true "GET $path returns at most 12 users" "$output_file" '(.data | length) <= 12'
  assert_jq_true "GET $path does not leak emails" "$output_file" 'all(.data[]?; has("email") | not)'
  assert_jq_true "GET $path does not leak password_hash" "$output_file" 'all(.data[]?; has("password_hash") | not)'
}

main() {
  local page_one_ids
  local page_one_total

  require_command curl jq sed date mktemp cp

  section "Issue #191 users pagination curl checks"
  printf '  BASE_URL:      %s\n' "$BASE_URL"
  printf '  CREATED_USERS: %s\n' "$CREATED_USERS"

  request "GET" "/health"
  expect_status "health check" "200" || {
    printf '\nAPI is not reachable at %s. Start it and rerun this test.\n' "$BASE_URL" >&2
    exit 1
  }

  section "Create enough users for page=2"
  if ! register_test_users; then
    printf '\nCannot continue without authenticated test users.\n' >&2
    exit 1
  fi

  section "Users pagination"
  check_users_page "/users" "$PAGE_DEFAULT_FILE" 1
  check_users_page "/users?page=1" "$PAGE_ONE_FILE" 1
  check_users_page "/users?page=2" "$PAGE_TWO_FILE" 2

  page_one_ids="$(jq -c '[.data[].id]' "$PAGE_ONE_FILE")"
  page_one_total="$(jq -r '.meta.total' "$PAGE_ONE_FILE")"

  assert_same_ids "GET /users without page matches page=1 IDs" "$PAGE_DEFAULT_FILE" "$page_one_ids"
  assert_jq_true "page=2 keeps the same meta.total" "$PAGE_TWO_FILE" '.meta.total == $total' --argjson total "$page_one_total"
  assert_jq_true "page=2 has data when total is greater than 12" "$PAGE_TWO_FILE" 'if .meta.total > 12 then (.data | length) > 0 else true end'
  assert_no_overlap "page=1 and page=2 return different ID sets" "$PAGE_ONE_FILE" "$PAGE_TWO_FILE"

  section "Invalid page fallback"
  check_users_page "/users?page=" "$TMP_DIR/users_page_empty.json" 1
  assert_same_ids "empty page falls back to page=1 IDs" "$TMP_DIR/users_page_empty.json" "$page_one_ids"

  check_users_page "/users?page=abc" "$TMP_DIR/users_page_abc.json" 1
  assert_same_ids "text page falls back to page=1 IDs" "$TMP_DIR/users_page_abc.json" "$page_one_ids"

  check_users_page "/users?page=0" "$TMP_DIR/users_page_0.json" 1
  assert_same_ids "page=0 falls back to page=1 IDs" "$TMP_DIR/users_page_0.json" "$page_one_ids"

  check_users_page "/users?page=-1" "$TMP_DIR/users_page_negative.json" 1
  assert_same_ids "negative page falls back to page=1 IDs" "$TMP_DIR/users_page_negative.json" "$page_one_ids"

  section "High page remains a valid empty-or-short page"
  check_users_page "/users?page=999" "$TMP_DIR/users_page_999.json" 999
  assert_jq_true "page=999 keeps the same meta.total" "$TMP_DIR/users_page_999.json" '.meta.total == $total' --argjson total "$page_one_total"

  section "Summary"
  printf '  %bPassed%b %d\n' "$GREEN" "$RESET" "$PASSED"
  printf '  %bFailed%b %d\n' "$RED" "$RESET" "$FAILED"

  if [[ "$FAILED" -ne 0 ]]; then
    exit 1
  fi
}

main "$@"
