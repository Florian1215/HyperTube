#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"
BASE_URL="${BASE_URL%/}"
CURL_TIMEOUT="${CURL_TIMEOUT:-20}"
RUN_ID="${API_TEST_RUN_ID:-$(date +%s)-$$-$RANDOM}"
PASSWORD="${PASSWORD:-MovieProgress123!}"
MOVIE_ID="${MOVIE_ID:-}"
FIRST_PROGRESS="${FIRST_PROGRESS:-1804}"
SECOND_PROGRESS="${SECOND_PROGRESS:-3600}"

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/hypertube-movie-progress-test.XXXXXX")"
BODY_FILE="$TMP_DIR/body.json"
HEADERS_FILE="$TMP_DIR/headers"
CURL_ERR_FILE="$TMP_DIR/curl.err"
LAST_STATUS=""

cleanup() {
  rm -rf -- "$TMP_DIR"
}
trap cleanup EXIT

require_command() {
  local cmd
  for cmd in "$@"; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      printf 'Missing required command: %s\n' "$cmd" >&2
      exit 127
    fi
  done
}

request() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local token="${4:-}"
  local curl_args=(
    --silent
    --show-error
    --max-time "$CURL_TIMEOUT"
    -X "$method"
    "$BASE_URL$path"
    -H "Accept: application/json"
    -D "$HEADERS_FILE"
    -o "$BODY_FILE"
    -w "%{http_code}"
  )

  : >"$BODY_FILE"
  : >"$HEADERS_FILE"
  : >"$CURL_ERR_FILE"

  if [[ -n "$body" ]]; then
    curl_args+=(-H "Content-Type: application/json" --data "$body")
  fi
  if [[ -n "$token" ]]; then
    curl_args+=(-H "Authorization: Bearer $token")
  fi

  set +e
  LAST_STATUS="$(curl "${curl_args[@]}" 2>"$CURL_ERR_FILE")"
  local curl_exit=$?
  set -e

  if [[ "$curl_exit" -ne 0 ]]; then
    printf 'curl failed for %s %s%s\n' "$method" "$BASE_URL" "$path" >&2
    sed 's/^/  /' "$CURL_ERR_FILE" >&2
    exit "$curl_exit"
  fi
}

expect_status() {
  local expected="$1"
  local label="$2"

  if [[ "$LAST_STATUS" != "$expected" ]]; then
    printf 'FAIL %s: expected HTTP %s, got %s\n' "$label" "$expected" "${LAST_STATUS:-<none>}" >&2
    dump_body >&2
    exit 1
  fi

  printf 'PASS %s: HTTP %s\n' "$label" "$expected"
}

dump_body() {
  printf 'Response body:\n'
  if jq . "$BODY_FILE" >/dev/null 2>&1; then
    jq . "$BODY_FILE" | sed 's/^/  /'
  else
    sed 's/^/  /' "$BODY_FILE"
  fi
}

json_get() {
  local filter="$1"
  jq -er "$filter" "$BODY_FILE"
}

assert_json() {
  local label="$1"
  local filter="$2"

  if jq -e "$filter" "$BODY_FILE" >/dev/null; then
    printf 'PASS %s\n' "$label"
    return
  fi

  printf 'FAIL %s\n' "$label" >&2
  dump_body >&2
  exit 1
}

require_command curl jq

SAFE_RUN_ID="${RUN_ID//[^A-Za-z0-9]/_}"
USERNAME="movie_progress_${SAFE_RUN_ID}"
USERNAME="${USERNAME:0:32}"
EMAIL="movie-progress-${RUN_ID}@example.test"

printf 'Using API: %s\n' "$BASE_URL"

if [[ -z "$MOVIE_ID" ]]; then
  request GET "/movies"
  expect_status 200 "load public movies"
  MOVIE_ID="$(json_get '.data[0].imdb_id')"
fi
printf 'Using movie: %s\n' "$MOVIE_ID"

REGISTER_BODY="$(jq -n \
  --arg email "$EMAIL" \
  --arg username "$USERNAME" \
  --arg password "$PASSWORD" \
  '{email:$email, username:$username, first_name:"Movie", last_name:"Progress", password:$password}')"

request POST "/auth/register" "$REGISTER_BODY"
expect_status 201 "register test user"

TOKEN="$(json_get '.data.access_token')"
USER_ID="$(json_get '.data.user.id')"
printf 'Created user: id=%s username=%s\n' "$USER_ID" "$USERNAME"

request PATCH "/movies/$MOVIE_ID/progress" \
  "$(jq -n --argjson progress "$FIRST_PROGRESS" '{progress:$progress, complete:false}')" \
  "$TOKEN"
expect_status 200 "save initial progress"
assert_json "initial progress response" ".data.progress == $FIRST_PROGRESS and .data.complete == false"

request GET "/users/$USER_ID/film-history" "" "$TOKEN"
expect_status 200 "load film history"
assert_json "history contains initial progress" \
  ".data | any(.imdb_id == \"$MOVIE_ID\" and .progress == $FIRST_PROGRESS and .complete == false)"

request PATCH "/movies/$MOVIE_ID/progress" \
  "$(jq -n --argjson progress "$SECOND_PROGRESS" '{progress:$progress, complete:true}')" \
  "$TOKEN"
expect_status 200 "update progress"
assert_json "update progress response" ".data.progress == $SECOND_PROGRESS and .data.complete == true"

request GET "/users/$USER_ID/film-history" "" "$TOKEN"
expect_status 200 "load updated film history"
assert_json "history contains updated progress once" \
  "[.data[] | select(.imdb_id == \"$MOVIE_ID\")] | length == 1 and .[0].progress == $SECOND_PROGRESS and .[0].complete == true"

printf '\nDone. Movie progress endpoint works for user %s and movie %s.\n' "$USER_ID" "$MOVIE_ID"
