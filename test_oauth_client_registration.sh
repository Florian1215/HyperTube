#!/usr/bin/env bash
set -Eeuo pipefail

# Curl smoke test for user-managed OAuth applications.
#
# Requirements:
# - API is running, default: http://localhost:8080
# - Database schema includes oauth_applications
# - curl and jq are installed
#
# Optional overrides:
#   API_BASE=http://localhost:8080 ./test_oauth_client_registration.sh

API_BASE="${API_BASE:-http://localhost:8080}"
API_V1="${API_BASE}/api/v1"
CURL_BIN="${CURL_BIN:-curl}"
JQ_BIN="${JQ_BIN:-jq}"

RUN_SUFFIX="$(date +%s)${RANDOM}"
EMAIL="${EMAIL:-oauth-curl-${RUN_SUFFIX}@example.com}"
USERNAME="${USERNAME:-oauth_curl_${RUN_SUFFIX}}"
PASSWORD="${PASSWORD:-Correct-Horse-Battery-42}"
PRIMARY_APP_NAME="${PRIMARY_APP_NAME:-Curl Test App ${RUN_SUFFIX}}"
SECONDARY_APP_NAME="${SECONDARY_APP_NAME:-Curl Root Alias App ${RUN_SUFFIX}}"
PRIMARY_SCOPE="${PRIMARY_SCOPE:-read:movies write:comments}"
PRIMARY_REDIRECT_URI="${PRIMARY_REDIRECT_URI:-http://localhost:4200/auth/callback}"
SECONDARY_REDIRECT_URI="${SECONDARY_REDIRECT_URI:-http://localhost:4200/auth/root-callback}"
PATCHED_REDIRECT_URI="${PATCHED_REDIRECT_URI:-https://example.com/oauth/callback}"

HTTP_STATUS=""
HTTP_BODY=""

require_binary() {
	local binary="$1"
	if ! command -v "$binary" >/dev/null 2>&1; then
		printf 'Missing required command: %s\n' "$binary" >&2
		exit 1
	fi
}

split_curl_response() {
	local response="$1"
	HTTP_BODY="${response%$'\n'*}"
	HTTP_STATUS="${response##*$'\n'}"
}

curl_json() {
	local method="$1"
	local url="$2"
	local body="${3:-}"
	local token="${4:-}"
	local args=(-sS -w $'\n%{http_code}' -X "$method" -H "Accept: application/json")

	if [[ -n "$token" ]]; then
		args+=(-H "Authorization: Bearer ${token}")
	fi
	if [[ -n "$body" ]]; then
		args+=(-H "Content-Type: application/json" --data "$body")
	fi

	local response
	response="$("$CURL_BIN" "${args[@]}" "$url")"
	split_curl_response "$response"
}

curl_form() {
	local url="$1"
	shift
	local args=(-sS -w $'\n%{http_code}' -X POST -H "Accept: application/json" -H "Content-Type: application/x-www-form-urlencoded")

	while (($#)); do
		args+=(--data-urlencode "$1")
		shift
	done

	local response
	response="$("$CURL_BIN" "${args[@]}" "$url")"
	split_curl_response "$response"
}

print_body() {
	if "$JQ_BIN" . >/dev/null 2>&1 <<<"$HTTP_BODY"; then
		"$JQ_BIN" . <<<"$HTTP_BODY"
	else
		printf '%s\n' "$HTTP_BODY"
	fi
}

step() {
	printf '\n== %s ==\n' "$*"
}

expect_status() {
	local expected="$1"
	if [[ "$HTTP_STATUS" != "$expected" ]]; then
		printf 'Expected HTTP %s, got %s\n' "$expected" "$HTTP_STATUS" >&2
		print_body >&2
		exit 1
	fi
	printf 'OK HTTP %s\n' "$HTTP_STATUS"
}

expect_jq() {
	local filter="$1"
	local message="$2"
	shift 2
	if ! "$JQ_BIN" -e "$@" "$filter" >/dev/null <<<"$HTTP_BODY"; then
		printf 'Assertion failed: %s\n' "$message" >&2
		print_body >&2
		exit 1
	fi
	printf 'OK %s\n' "$message"
}

json_payload() {
	"$JQ_BIN" -cn "$@"
}

require_binary "$CURL_BIN"
require_binary "$JQ_BIN"

step "Health check"
curl_json GET "${API_V1}/health"
expect_status 200

step "Register test user"
REGISTER_BODY="$(json_payload \
	--arg email "$EMAIL" \
	--arg username "$USERNAME" \
	--arg password "$PASSWORD" \
	'{email:$email,username:$username,first_name:"Curl",last_name:"Tester",password:$password}')"
curl_json POST "${API_V1}/auth/register" "$REGISTER_BODY"
expect_status 201
ACCESS_TOKEN="$("$JQ_BIN" -er '.data.access_token' <<<"$HTTP_BODY")"
USER_ID="$("$JQ_BIN" -er '.data.user.id' <<<"$HTTP_BODY")"
printf 'Created user id=%s email=%s username=%s\n' "$USER_ID" "$EMAIL" "$USERNAME"

step "Create OAuth application via versioned route"
CREATE_PRIMARY_BODY="$(json_payload \
	--arg name "$PRIMARY_APP_NAME" \
	--arg scope "  ${PRIMARY_SCOPE}   " \
	--arg redirect_uri "$PRIMARY_REDIRECT_URI" \
	'{name:$name,scope:$scope,redirect_uri:$redirect_uri}')"
curl_json POST "${API_V1}/oauth/applications" "$CREATE_PRIMARY_BODY" "$ACCESS_TOKEN"
expect_status 201
PRIMARY_APP_ID="$("$JQ_BIN" -er '.data.id' <<<"$HTTP_BODY")"
CLIENT_ID="$("$JQ_BIN" -er '.data.client_id' <<<"$HTTP_BODY")"
CLIENT_SECRET="$("$JQ_BIN" -er '.data.client_secret' <<<"$HTTP_BODY")"
expect_jq '.data.scope == "read:movies write:comments"' "create normalizes scope"
expect_jq '.data.redirect_uri == $redirect_uri' "create exposes redirect_uri" --arg redirect_uri "$PRIMARY_REDIRECT_URI"
expect_jq '[.. | objects | select(has("client_secret_hash") or has("owner_id"))] | length == 0' "create response hides owner_id and secret hash"
printf 'Created primary app id=%s client_id=%s\n' "$PRIMARY_APP_ID" "$CLIENT_ID"

step "Create OAuth application via root alias"
CREATE_SECONDARY_BODY="$(json_payload \
	--arg name "$SECONDARY_APP_NAME" \
	--arg redirect_uri "$SECONDARY_REDIRECT_URI" \
	'{name:$name,scope:"",redirect_uri:$redirect_uri}')"
curl_json POST "${API_BASE}/oauth/applications" "$CREATE_SECONDARY_BODY" "$ACCESS_TOKEN"
expect_status 201
SECONDARY_APP_ID="$("$JQ_BIN" -er '.data.id' <<<"$HTTP_BODY")"
printf 'Created secondary app id=%s\n' "$SECONDARY_APP_ID"

step "List applications via versioned route"
curl_json GET "${API_V1}/oauth/applications" "" "$ACCESS_TOKEN"
expect_status 200
expect_jq ".data | map(.id) | index(${PRIMARY_APP_ID}) != null" "versioned list includes primary app"
expect_jq ".data | map(.id) | index(${SECONDARY_APP_ID}) != null" "versioned list includes secondary app"
expect_jq '.data | any(.id == ($id | tonumber) and .redirect_uri == $redirect_uri)' "versioned list includes primary redirect_uri" --arg id "$PRIMARY_APP_ID" --arg redirect_uri "$PRIMARY_REDIRECT_URI"
expect_jq '[.. | objects | select(has("client_secret") or has("client_secret_hash") or has("owner_id"))] | length == 0' "list hides secrets and owner_id"
expect_jq '.meta.page == 0' "versioned list exposes page metadata"
expect_jq '.meta.per_page == 12' "versioned list exposes oauth application page size"
expect_jq '.meta.total >= 2' "versioned list exposes total application count"

step "List applications via root alias"
curl_json GET "${API_BASE}/oauth/applications" "" "$ACCESS_TOKEN"
expect_status 200
expect_jq ".data | map(.id) | index(${PRIMARY_APP_ID}) != null" "root list includes primary app"
expect_jq '.data | any(.id == ($id | tonumber) and .redirect_uri == $redirect_uri)' "root list includes secondary redirect_uri" --arg id "$SECONDARY_APP_ID" --arg redirect_uri "$SECONDARY_REDIRECT_URI"
expect_jq '.meta.page == 0' "root list exposes page metadata"
expect_jq '.meta.per_page == 12' "root list exposes oauth application page size"
expect_jq '.meta.total >= 2' "root list exposes total application count"

step "Patch primary application via versioned route"
PATCH_PRIMARY_BODY="$(json_payload \
	--arg redirect_uri "$PATCHED_REDIRECT_URI" \
	'{name:"Curl Test App Patched",scope:"read:movies",redirect_uri:$redirect_uri}')"
curl_json PATCH "${API_V1}/oauth/applications/${PRIMARY_APP_ID}" "$PATCH_PRIMARY_BODY" "$ACCESS_TOKEN"
expect_status 200
expect_jq '.data.name == "Curl Test App Patched"' "patch updates app name"
expect_jq '.data.scope == "read:movies"' "patch updates app scope"
expect_jq '.data.redirect_uri == $redirect_uri' "patch updates redirect_uri" --arg redirect_uri "$PATCHED_REDIRECT_URI"
expect_jq '[.. | objects | select(has("client_secret") or has("client_secret_hash") or has("owner_id"))] | length == 0' "patch response hides secrets and owner_id"

step "Patch secondary application via root alias"
PATCH_SECONDARY_BODY="$(json_payload '{name:"Curl Root Alias App Patched"}')"
curl_json PATCH "${API_BASE}/oauth/applications/${SECONDARY_APP_ID}" "$PATCH_SECONDARY_BODY" "$ACCESS_TOKEN"
expect_status 200
expect_jq '.data.name == "Curl Root Alias App Patched"' "root patch updates app name"

step "Request client_credentials token as JSON with grant_type"
TOKEN_BODY="$(json_payload \
	--arg client_id "$CLIENT_ID" \
	--arg client_secret "$CLIENT_SECRET" \
	'{grant_type:"client_credentials",client_id:$client_id,client_secret:$client_secret}')"
curl_json POST "${API_V1}/oauth/token" "$TOKEN_BODY"
expect_status 200
APP_ACCESS_TOKEN="$("$JQ_BIN" -er '.access_token' <<<"$HTTP_BODY")"
expect_jq '.token_type == "Bearer"' "token response is Bearer"
expect_jq '.expires_in == 900' "token expires_in is 900"
expect_jq '.scope == "read:movies"' "token echoes application scope when request scope is empty"

step "Use app access token on protected route"
curl_json GET "${API_V1}/oauth/applications" "" "$APP_ACCESS_TOKEN"
expect_status 200

step "Request client_credentials token as JSON without grant_type on root token alias"
TOKEN_NO_GRANT_BODY="$(json_payload \
	--arg client_id "$CLIENT_ID" \
	--arg client_secret "$CLIENT_SECRET" \
	'{client_id:$client_id,client_secret:$client_secret,scope:"read:movies"}')"
curl_json POST "${API_BASE}/oauth/token" "$TOKEN_NO_GRANT_BODY"
expect_status 200
expect_jq '.scope == "read:movies"' "token without grant_type accepts requested subset scope"

step "Request client_credentials token as form"
curl_form "${API_V1}/oauth/token" \
	"grant_type=client_credentials" \
	"client_id=${CLIENT_ID}" \
	"client_secret=${CLIENT_SECRET}" \
	"scope=read:movies"
expect_status 200
expect_jq '.access_token | length > 0' "form token returns access token"

step "Reject scope outside application scope"
INVALID_SCOPE_BODY="$(json_payload \
	--arg client_id "$CLIENT_ID" \
	--arg client_secret "$CLIENT_SECRET" \
	'{grant_type:"client_credentials",client_id:$client_id,client_secret:$client_secret,scope:"admin"}')"
curl_json POST "${API_V1}/oauth/token" "$INVALID_SCOPE_BODY"
expect_status 400
expect_jq '.error == "invalid_scope"' "invalid scope returns OAuth invalid_scope"

step "Reject wrong client secret"
WRONG_SECRET_BODY="$(json_payload \
	--arg client_id "$CLIENT_ID" \
	'{grant_type:"client_credentials",client_id:$client_id,client_secret:"wrong-secret"}')"
curl_json POST "${API_V1}/oauth/token" "$WRONG_SECRET_BODY"
expect_status 401
expect_jq '.error == "invalid_client"' "wrong secret returns invalid_client"

step "Delete secondary application via versioned route"
curl_json DELETE "${API_V1}/oauth/applications/${SECONDARY_APP_ID}" "" "$ACCESS_TOKEN"
expect_status 200
expect_jq '.data == null' "delete returns data null"

step "Delete primary application via root alias"
curl_json DELETE "${API_BASE}/oauth/applications/${PRIMARY_APP_ID}" "" "$ACCESS_TOKEN"
expect_status 200
expect_jq '.data == null' "root delete returns data null"

step "Deleted application no longer issues tokens"
curl_json POST "${API_V1}/oauth/token" "$TOKEN_BODY"
expect_status 401
expect_jq '.error == "invalid_client"' "deleted client returns invalid_client"

printf '\nAll OAuth client registration curl checks passed.\n'
