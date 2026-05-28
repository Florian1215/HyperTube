# OAuth Frontend Contract

## Purpose

The backend owns the OAuth provider callback, authorization-code exchange, local
user creation, and Hypertube JWT creation. The frontend only needs to start the
OAuth flow and consume the final backend redirect.

This document describes what the backend expects and how the frontend can
implement the matching callback without changing the backend OAuth flow.

## Backend Responsibilities

The provider redirect URLs must point to backend callback endpoints:

```env
FORTYTWO_REDIRECT_URL=http://localhost:8080/api/v1/auth/42/callback
GITHUB_REDIRECT_URL=http://localhost:8080/api/v1/auth/github/callback
```

The frontend callback URL is configured separately:

```env
FRONTEND_AUTH_CALLBACK_URL=http://localhost:4200/en/auth/callback
```

The browser flow is:

```text
Frontend login button
-> GET /api/v1/auth/{provider}/login
-> OAuth provider consent screen
-> GET /api/v1/auth/{provider}/callback
-> frontend callback URL
```

Supported provider login endpoints:

```text
GET /api/v1/auth/42/login
GET /api/v1/auth/github/login
```

Supported provider callback endpoints:

```text
GET /api/v1/auth/42/callback
GET /api/v1/auth/github/callback
```

The backend also keeps backward-compatible callback aliases:

```text
GET /oauth/callback/42
GET /oauth/callback/github
```

New provider app settings should use the `/api/v1/auth/.../callback` URLs.

## Successful OAuth Redirect

When `FRONTEND_AUTH_CALLBACK_URL` is configured and OAuth succeeds, the backend
redirects with HTTP `303 See Other` to the frontend callback URL. Authentication
data is placed in the URL fragment:

```text
http://localhost:4200/en/auth/callback#access_token=...&token_type=Bearer&expires_in=3600&user=...
```

The fragment fields are:

```text
access_token  Hypertube JWT created by the backend.
token_type    Currently "Bearer".
expires_in    Access-token lifetime in seconds.
user          URL-encoded JSON object.
```

The `user` JSON object uses backend response field names:

```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "user",
  "first_name": "Example",
  "last_name": "User",
  "profile_picture": "https://example.com/avatar.jpg",
  "created_at": "2026-05-28T12:00:00Z"
}
```

`profile_picture` can be `null` or absent when no provider image is available.

If `FRONTEND_AUTH_CALLBACK_URL` is empty, the backend returns the same auth
payload as JSON instead:

```json
{
  "data": {
    "access_token": "...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "user",
      "first_name": "Example",
      "last_name": "User",
      "profile_picture": null,
      "created_at": "2026-05-28T12:00:00Z"
    }
  }
}
```

## Failed OAuth Redirect

When `FRONTEND_AUTH_CALLBACK_URL` is configured and OAuth fails, the backend
redirects with HTTP `303 See Other` to the frontend callback URL with query
parameters:

```text
http://localhost:4200/en/auth/callback?error=INVALID_OAUTH_STATE&error_description=invalid+OAuth+state
```

The frontend should read:

```text
error              Stable backend error code.
error_description  User-facing or diagnostic message.
```

Common error codes include:

```text
OAUTH_NOT_CONFIGURED
INVALID_OAUTH_STATE
OAUTH_DENIED
OAUTH_EXCHANGE_FAILED
INTERNAL_ERROR
```

If `FRONTEND_AUTH_CALLBACK_URL` is empty, the backend returns a JSON error
instead:

```json
{
  "error": {
    "code": "INVALID_OAUTH_STATE",
    "message": "invalid OAuth state"
  }
}
```

## Frontend Implementation

The frontend should provide a localized callback route matching the configured
backend URL:

```text
/{locale}/auth/callback
```

For the local default above, that route is:

```text
/en/auth/callback
```

The callback page should:

1. Read `error` and `error_description` from the query string first.
2. If an error is present, show the existing auth error UI and do not store a
   token.
3. Otherwise parse `access_token`, `token_type`, `expires_in`, and `user` from
   `window.location.hash`.
4. Decode the `user` fragment value with `decodeURIComponent` and `JSON.parse`.
5. Normalize backend user fields to the frontend user shape if needed.
6. Store the Hypertube JWT through the existing frontend auth/session layer.
7. Remove the fragment from the visible URL or navigate to the post-login page.

The frontend should not exchange provider authorization codes. Provider secrets
stay on the backend.

## Field Normalization

The backend uses snake_case JSON names:

```text
first_name
last_name
profile_picture
created_at
```

If the frontend currently uses another shape, the callback page or auth service
should normalize the backend payload before storing it. For example:

```text
first_name -> firstname
last_name  -> lastname
created_at -> joined_at, if the frontend expects a timestamp
```

The same normalization should also be considered for normal login and register
responses, because they return the same backend auth payload shape.

## OAuth State Expectations

The backend creates an HttpOnly state cookie when `/login` is called and
validates it when the provider redirects to `/callback`.

The frontend should always start a new browser OAuth attempt from the backend
login endpoint. It should not manually rewrite callback URLs or retry stale
provider callback URLs, because that can break the state-cookie validation and
correctly results in `INVALID_OAUTH_STATE`.

## Minimal Frontend Patch

The smallest frontend implementation should add:

```text
frontend/src/app/[locale]/auth/callback/page.tsx
```

If the existing auth service cannot store the backend payload directly, also
add a small normalization helper in the frontend auth service. Keep provider
code exchange, provider tokens, and provider secrets out of the frontend.
