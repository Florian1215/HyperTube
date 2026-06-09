#!/usr/bin/env bash
#
# CLI demo walkthrough for the current frontend auth/backend contract.
#
# User story:
#   As an auth API consumer, I can send firstname/lastname during registration,
#   log in through the canonical login field with either email or username, and
#   still receive the user fields the UI currently reads.
#
# Usage:
#   ./verification/user_stories/scripts/demo_frontend_auth_contract_story.sh
#
# Optional environment variables:
#   BASE_URL       API origin. Default: http://localhost:8080

set -o pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
BASE_URL="${BASE_URL%/}"
API_BASE_URL="$BASE_URL/api/v1"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../../.." && pwd)"

RESET=""
BOLD=""
DIM=""
CYAN=""

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
  BOLD="$(tput bold)"
  DIM="$(tput dim)"
  CYAN="$(tput setaf 6)"
  RESET="$(tput sgr0)"
fi

require_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$name" >&2
    exit 127
  fi
}

heading() {
  printf '\n%s%s%s\n' "$BOLD$CYAN" "$1" "$RESET"
}

explain() {
  printf '%sWhat happens:%s\n' "$BOLD" "$RESET"
  printf '  %s\n' "$1"
}

require_command bash
require_command curl
require_command jq
require_command sed
require_command date

heading "Frontend Auth Contract Journey"
explain "This story keeps the frontend untouched and proves the API accepts the current backend auth contract."

printf '\n%sConfiguration:%s\n' "$BOLD" "$RESET"
printf '  BASE_URL: %s\n' "$BASE_URL"
printf '  API test: %s\n' "verification/tests/api/frontend_auth_contract_api_test.sh"

heading "Run the contract checks"
explain "The test registers with firstname/lastname, logs in with email, then logs in with username through the login field."

(
  cd "$REPO_ROOT" || exit 1
  BASE_URL="$API_BASE_URL" bash verification/tests/api/frontend_auth_contract_api_test.sh
)
status=$?

heading "Story result"
if [[ "$status" -eq 0 ]]; then
  printf 'The backend auth contract is supported.\n'
else
  printf 'The frontend auth contract failed. See the test output above for the exact request/response mismatch.\n'
fi

exit "$status"
