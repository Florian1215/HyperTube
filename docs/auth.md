# Auth Documentation

This document summarizes the current authentication implementation in this
repository. Endpoint-level request and response examples live in
`services/api/README.md`.

## Current State

- Backend: Go API with Chi router under `/api/v1`.
- Active auth methods: email/password, 42 OAuth, GitHub OAuth, and OAuth2
  password grant.
- Password reset: active when Brevo email configuration is present.
- Token format: JWT signed with `HS256`, containing `user_id`, `iss`, `sub`,
  `iat`, `nbf`, and `exp`.
- Token lifetime: 15 minutes (`expires_in: 900`).
- Protected request transport: `Authorization: Bearer <access_token>`.
- Backend protection: `auth.RequireAuth(tokenManager)` in
  `services/api/main.go`.
- User-owned backend actions must use the `user_id` from the validated token,
  not a `user_id` sent by the client.
- Frontend auth integration is still local/mock-based. `AuthContext` stores a
  token and user in `localStorage`, but the signin/register/forgot-password
  modals do not yet call the backend auth endpoints.

## Relevant Files

| Area | File | Purpose |
|------|------|---------|
| Router and protection boundary | `services/api/main.go` | Registers public routes, protected routes, OAuth aliases, and auth configuration. |
| Auth handler | `services/api/internal/auth/handler.go` | Register, login, JSON decoding, auth response envelope. |
| Password reset | `services/api/internal/auth/password_reset.go` | Reset-token creation, email dispatch, token consumption. |
| OAuth providers | `services/api/internal/auth/oauth.go` | 42 and GitHub authorization URLs, callback handling, state cookies, profile exchange. |
| OAuth token endpoint | `services/api/internal/auth/oauth2.go` | OAuth2 password grant at `/oauth/token`. |
| JWT | `services/api/internal/auth/jwt.go` | Creates and validates access tokens. |
| Middleware | `services/api/internal/auth/middleware.go` | Validates bearer tokens and writes `user_id` into request context. |
| Passwords | `services/api/internal/auth/password.go` | bcrypt hashing and password comparison. |
| Validation | `services/api/internal/auth/validation.go` | Email, username, name, and password rules. |
| User store | `services/api/internal/auth/store.go` | Password users, OAuth users, reset tokens. |
| Response helpers | `services/api/internal/respond/respond.go` | Common `data` and `error` JSON envelopes. |
| Email | `services/api/internal/email/brevo.go` | Brevo password-reset mailer. |
| DB schema | `db/001_schema.sql`, `db/003_auth.sql`, `db/004_password_reset.sql` | Users, OAuth accounts, watch history, password reset storage. |
| Frontend state | `frontend/src/context/AuthContext.tsx` | Local `localStorage` auth state. |
| Frontend modals | `frontend/src/components/modal/Signin.tsx`, `Register.tsx`, `ForgotPassword.tsx` | Current mock auth UI. |

## Configuration

| Variable | Meaning |
|----------|---------|
| `DATABASE_URL` | Postgres connection string. |
| `PORT` | API port. Defaults to `8080`. |
| `JWT_SECRET` | Required. Must be at least 32 bytes or the API will not start. |
| `JWT_ISSUER` | Optional. Defaults to `hypertube-api`; validated on incoming tokens. |
| `FORTYTWO_CLIENT_ID` | 42 OAuth application client ID. |
| `FORTYTWO_CLIENT_SECRET` | 42 OAuth application secret. |
| `FORTYTWO_REDIRECT_URL` | 42 callback URL. Defaults to `http://localhost:8080/api/v1/auth/42/callback`. |
| `GITHUB_CLIENT_ID` | GitHub OAuth application client ID. |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth application secret. |
| `GITHUB_REDIRECT_URL` | GitHub callback URL. Defaults to `http://localhost:8080/api/v1/auth/github/callback`. |
| `FRONTEND_AUTH_CALLBACK_URL` | Frontend URL that receives OAuth success data in the URL fragment or OAuth errors in the query string. Defaults to `http://localhost:4200/en/auth/callback`. |
| `BREVO_API_KEY` | Enables password-reset email sending when present. |
| `MAIL_FROM_EMAIL` | Sender email for password-reset emails. Required and validated when Brevo is enabled. |
| `MAIL_FROM_NAME` | Sender display name for password-reset emails. Optional, defaults to `Hypertube`. |
| `PASSWORD_RESET_URL` | Frontend reset URL template. Defaults to `http://localhost:4200/{locale}/reset-password`. |
| `PASSWORD_RESET_TTL` | Reset-token lifetime. Defaults to `30m`. |

Example JWT secret:

```bash
openssl rand -base64 32
```

## Response Shapes

Most auth endpoints use the common API envelope.

Success:

```json
{
  "data": {}
}
```

Error:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "human readable message"
  }
}
```

Validation errors use field-based messages:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "fields": {
      "email": {
        "message": "valid email is required"
      }
    }
  }
}
```

Register, login, and non-redirect OAuth callbacks return this auth payload:

```json
{
  "data": {
    "access_token": "<jwt>",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": {
      "id": 1,
      "email": "ada@example.com",
      "username": "ada_lovelace",
      "first_name": "Ada",
      "last_name": "Lovelace"
    }
  }
}
```

`POST /oauth/token` intentionally follows OAuth2 token response conventions and
does not use the common `data` or `error` envelope.

## Auth Endpoints

All paths in this table are mounted under `/api/v1`.

| Route | Status | Body | Success |
|-------|--------|------|---------|
| `POST /auth/register` | Active | JSON with `email`, `username`, `first_name`, `last_name`, `password` | `201` auth payload |
| `POST /auth/login` | Active | JSON with `email`, `password` | `200` auth payload |
| `POST /auth/password-reset` | Active when email is configured | JSON with `email`, optional `locale` | `202` generic accepted message |
| `POST /auth/reset-password` | Active | JSON with `token`, `password` | `200` reset success message |
| `GET /auth/42/login` | Active when 42 OAuth is configured | none | `302` redirect to 42, state cookie set |
| `GET /auth/42/callback` | Active when 42 OAuth is configured | none; query and state cookie required | `303` redirect to frontend, or auth payload without frontend callback URL |
| `GET /auth/github/login` | Active when GitHub OAuth is configured | none | `302` redirect to GitHub, state cookie set |
| `GET /auth/github/callback` | Active when GitHub OAuth is configured | none; query and state cookie required | `303` redirect to frontend, or auth payload without frontend callback URL |
| `POST /oauth/token` | Active | Form or JSON OAuth2 password grant | `200` OAuth2 token response |

Backward-compatible aliases also exist:

| Route | Handler |
|-------|---------|
| `GET /oauth/callback/42` | 42 OAuth callback |
| `GET /oauth/callback/github` | GitHub OAuth callback |
| `POST /oauth/token` | OAuth2 password grant |

## Validation Rules

| Field | Rule |
|-------|------|
| `email` | Trimmed, lowercased, and validated with `net/mail`. |
| `username` | 3-32 characters; letters, digits, and `_` only. |
| `first_name` | Required, trimmed, maximum 100 characters. |
| `last_name` | Required, trimmed, maximum 100 characters. |
| `password` | 8-72 bytes. |
| reset `token` | 32-256 characters after trimming. |

JSON auth endpoints reject malformed JSON, unknown fields, multiple JSON
documents, and bodies larger than 1 MiB.

## OAuth Flows

The 42 and GitHub browser flows use the same local structure:

1. The frontend sends the browser to `/api/v1/auth/<provider>/login`.
2. The API generates a random state value.
3. The API stores that state in an HttpOnly cookie:
   `hypertube_oauth_42_state` or `hypertube_oauth_github_state`.
4. The API redirects to the provider authorization URL.
5. The provider redirects back to `/api/v1/auth/<provider>/callback`.
6. The callback validates query `state` against the cookie.
7. The API exchanges the authorization code with the provider.
8. The API finds or creates a local user and OAuth account.
9. The API creates a JWT.
10. The API redirects to `FRONTEND_AUTH_CALLBACK_URL` with auth data in the URL
    fragment.

OAuth callback success fragment fields:

| Field | Meaning |
|-------|---------|
| `access_token` | JWT access token for API requests. |
| `token_type` | Always `Bearer`. |
| `expires_in` | Seconds until token expiry, currently `900`. |
| `user` | URL-encoded JSON user object. |

OAuth callback errors redirect to the frontend query string when
`FRONTEND_AUTH_CALLBACK_URL` is configured:

```http
http://localhost:4200/en/auth/callback?error=INVALID_OAUTH_STATE&error_description=invalid+OAuth+state
```

Without a frontend callback URL, the same errors are returned as standard JSON
error envelopes.

## OAuth2 Token Endpoint

`POST /api/v1/oauth/token` and the root alias `POST /oauth/token` implement the
OAuth2 password grant. This endpoint is for exchanging an existing local
username/email plus password for an API JWT. It is not an authorization-code
exchange endpoint.

Supported request body formats:

- `application/x-www-form-urlencoded`
- `application/json`
- empty `Content-Type`, parsed as form data

Required fields:

| Field | Meaning |
|-------|---------|
| `grant_type` | Must be `password`. |
| `username` | Username or email address. |
| `password` | Existing password. |

Optional field:

| Field | Meaning |
|-------|---------|
| `scope` | Whitespace-normalized and echoed in the response when present. |

Success:

```json
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 900,
  "scope": "profile"
}
```

Errors:

```json
{
  "error": "invalid_grant",
  "error_description": "invalid username or password"
}
```

## JWT Details

- Algorithm: `HS256`.
- Secret: `JWT_SECRET`, at least 32 bytes.
- Issuer: `JWT_ISSUER`, default `hypertube-api`.
- TTL: 15 minutes.
- Claims:
  - `user_id`: numeric user ID.
  - `iss`: issuer.
  - `sub`: user ID as string.
  - `iat`: issued-at time.
  - `nbf`: not-before time.
  - `exp`: expiration time.

Validation:

1. The token is parsed with `jwt.ParseWithClaims`.
2. The signing method must be `HS256`.
3. The issuer must match.
4. `exp` is required and must not be expired.
5. `user_id` must be greater than `0`.

The middleware does not perform a database lookup. If a user were deleted or
disabled, an already issued token would remain valid until it expires, as long
as its signature and claims are valid.

There are currently no refresh tokens, no server-side sessions, no token
blacklist, and no logout endpoint. Logout is frontend-only: the token and user
are removed from `localStorage`.

## Protected Requests

Every protected backend request needs this header:

```http
Authorization: Bearer <access_token>
```

Missing or invalid tokens return:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "missing bearer token"
  }
}
```

Expired tokens return:

```json
{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "token expired"
  }
}
```

Handlers can read the current user like this:

```go
userID, ok := auth.UserIDFromContext(r.Context())
if !ok {
    respond.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing user context")
    return
}
```

## Backend Routes

API routes are mounted under `/api/v1`, except for the backward-compatible root
OAuth aliases listed above.

| Route | Status | Protection |
|-------|--------|------------|
| `GET /health` | Active | Public |
| `POST /auth/register` | Active | Public |
| `POST /auth/login` | Active | Public |
| `POST /auth/password-reset` | Active | Public |
| `POST /auth/reset-password` | Active | Public |
| `GET /auth/42/login` | Active when configured | Public |
| `GET /auth/42/callback` | Active when configured | Public |
| `GET /auth/github/login` | Active when configured | Public |
| `GET /auth/github/callback` | Active when configured | Public |
| `POST /oauth/token` | Active | Public |
| `GET /movies` | Active | Public |
| `GET /stream/{id}` | Active for development | Public |
| `GET /stream/{id}/index` | Active for development | Public |
| `GET /stream/{id}/{segment}` | Active for development | Public |
| `GET /movies/watched` | Active | Protected |
| `GET /movies/directstream` | Active | Protected |
| `GET /movies/search?title=...` | Active | Protected |
| `GET /movies/{id}` | Active | Protected |
| `GET /movies/{id}/torrents` | Active | Protected |
| `GET /movies/{id}/comments` | Active | Protected |
| `POST /movies/{id}/comments` | Active | Protected |
| `GET /comments` | Active | Protected |
| `GET /comments/{id}` | Active | Protected |
| `PATCH /comments/{id}` | Active | Protected |
| `DELETE /comments/{id}` | Active | Protected |
| `GET /users` | Not registered | Not active |
| `GET /users/{id}` | Not registered | Not active |
| `PATCH /users/{id}` | Not registered | Not active |
| `POST /comments` | Not registered | Not active |

## Frontend State

`AuthProvider` in `frontend/src/context/AuthContext.tsx` is mounted globally in
`frontend/src/app/[locale]/layout.tsx`. It manages:

- `user: tUser | null`
- `loading: boolean`
- `login(user, token)`
- `logout()`
- `updateUser(patch)`

Persistence is local:

- `localStorage["token"]`
- `localStorage["user"]`

Current frontend gaps:

- `Signin.tsx` still logs in against mock users from `frontend/src/types/user.ts`.
- `Register.tsx` builds a local user object and stores a mock token.
- `ForgotPassword.tsx` only shows a notification; it does not call
  `POST /auth/password-reset`.
- `frontend/src/services/api.ts`, `frontend/src/services/auth.ts`, and
  `frontend/src/services/movies.ts` are empty.
- Backend auth works, but the frontend is not wired to it yet.

The backend and frontend user shapes still need an adapter or type alignment:

| Backend field | Current frontend field |
|---------------|------------------------|
| `first_name` | `firstname` |
| `last_name` | `lastname` |

## Security Notes

- Passwords are hashed with bcrypt before storage.
- Password reset stores only a SHA-256 hash of the raw reset token.
- Password reset responses do not reveal whether an email exists.
- OAuth state is stored in HttpOnly SameSite=Lax cookies and validated on
  callback.
- `localStorage` token storage is convenient but exposes the token to XSS. If
  the frontend is hardened later, token storage should be revisited.
- If the frontend and API run on different origins, the API still needs CORS
  configuration or the frontend must use a same-origin proxy.

## Tests

Auth behavior is covered by backend tests:

- `services/api/internal/auth/password_test.go`
- `services/api/internal/auth/jwt_test.go`
- `services/api/internal/auth/handler_test.go`
- `services/api/internal/auth/middleware_test.go`
- `services/api/internal/auth/oauth_test.go`
- `services/api/internal/auth/password_reset_test.go`
- `services/api/internal/auth/store_test.go`
- `services/api/internal/auth/validation_test.go`
- `services/api/main_test.go`

Acceptance-style API scripts also exist:

- `tests/api/forty_two_auth_api_test.sh`
- `tests/api/github_auth_api_test.sh`
- `tests/api/oauth_token_api_test.sh`
- `tests/api/github_oauth_acceptance_test.sh`

When changing protected routes, cover at least these cases:

1. Request without `Authorization` header returns `401`.
2. Request with the wrong scheme, for example `Basic ...`, returns `401`.
3. Request with an invalid bearer token returns `401`.
4. Request with an expired token returns `401 TOKEN_EXPIRED`.
5. Request with a valid token reaches the handler.
