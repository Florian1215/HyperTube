# Frontend / Backend Auth Contract Notes

The current frontend is not being changed. The backend therefore accepts and
returns a small compatibility surface for auth payloads.

## Registration

Backend canonical fields:

- `first_name`
- `last_name`

Current frontend fields:

- `firstname`
- `lastname`

`POST /api/v1/auth/register` accepts both shapes. Internally, the backend stores
the canonical `first_name` and `last_name` values.

Supported frontend-style payload:

```json
{
  "email": "user@example.test",
  "username": "demo_user",
  "firstname": "Demo",
  "lastname": "User",
  "password": "DemoPass123!"
}
```

Supported backend-style payload:

```json
{
  "email": "user@example.test",
  "username": "demo_user",
  "first_name": "Demo",
  "last_name": "User",
  "password": "DemoPass123!"
}
```

## Login

The project requirement says login must work with username and password. The
current frontend still sends the login value in a JSON field named `email`.

`POST /api/v1/auth/login` therefore accepts either:

- `{ "email": "user@example.test", "password": "..." }`
- `{ "email": "demo_user", "password": "..." }`
- `{ "login": "demo_user", "password": "..." }`

## Auth Response

The backend keeps canonical fields and also includes fields the current frontend
reads directly.

Canonical response fields:

- `first_name`
- `last_name`
- `created_at`

Frontend compatibility fields:

- `firstname`
- `lastname`
- `joined_at`
- `color`
- `watch_history`

The duplicated name fields should be removed once the frontend is allowed to use
the canonical backend contract.

## Verification

Run the API contract test:

```bash
BASE_URL=http://localhost:8080/api/v1 bash verification/tests/api/frontend_auth_contract_api_test.sh
```

Or run the user story:

```bash
BASE_URL=http://localhost:8080 bash verification/user_stories/scripts/demo_frontend_auth_contract_story.sh
```

## Known Frontend-Limited Parts

The backend exposes password-reset routes and OAuth redirects, but the unchanged
frontend still has two UI gaps:

- The forgot-password modal currently shows a notification only; it does not
  call `POST /api/v1/auth/password-reset`.
- The OAuth backend redirects to `FRONTEND_AUTH_CALLBACK_URL`; the frontend needs
  a callback page to persist the returned token in browser storage.

These are documented here so backend tests can cover the API contract without
pretending the unchanged UI performs those browser actions.
