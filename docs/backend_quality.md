# Backend Quality Notes

This document summarizes the current backend quality and security posture. It is
intended as a short defense/reference document, not as a feature backlog.

## Scope

The Go API in `services/api` is the main HTTP gateway for authentication, movie
metadata, comments, and stream coordination. It is mounted under `/api/v1` and
uses PostgreSQL for persistent state.

The torrent and transcoding work is delegated to the separate torrent service.
The API currently exposes stream routes publicly for development, as documented
in `services/api/main.go` and `README.md`.

## Protection Model

- Authentication is based on JWT bearer tokens.
- Protected routes use `auth.RequireAuth(tokenManager)`.
- The middleware validates the token, rejects expired or malformed tokens, and
  stores the authenticated `user_id` in request context.
- User-owned write actions must use the authenticated context user, not a
  client-provided user id.
- Public routes are intentionally limited to health, auth start/callback flows,
  OAuth2 token exchange, public movie listing, and temporary dev stream routes.

## Auth And Password Safety

- Passwords are stored with bcrypt, never as plaintext.
- JWTs are signed with `HS256`.
- `JWT_SECRET` is required and must be at least 32 bytes.
- Tokens contain `user_id`, issuer, subject, issued-at, not-before, and expiry
  claims.
- Access tokens currently expire after 15 minutes.
- JSON auth requests reject malformed JSON, unknown fields, multiple JSON
  documents, and bodies larger than 1 MiB.

## OAuth Safety

- 42 and GitHub OAuth browser flows are handled by the backend.
- Provider callback URLs point to backend callback routes.
- The backend creates a random OAuth state value before redirecting to the
  provider.
- The state is stored in an HttpOnly cookie and validated on callback.
- Provider authorization codes and provider secrets stay on the backend.
- On success, the backend creates a local Hypertube JWT and redirects to the
  configured frontend callback URL.
- On failure, stable error codes are returned either through the frontend
  callback query string or as JSON when no frontend callback is configured.

## Password Reset Safety

- Password reset is enabled only when Brevo mail configuration is present.
- Unknown email addresses receive the same accepted response as known accounts,
  which avoids account enumeration.
- Reset tokens are single-use and time-limited.
- Reset-token request and consumption paths are covered by API scripts and Go
  tests.
- Email sender configuration is validated when Brevo is enabled.

## Response Conventions

Most API responses use common JSON envelopes from `internal/respond`:

```json
{
  "data": {}
}
```

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "human readable message"
  }
}
```

Validation errors use field-level messages:

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

`POST /oauth/token` intentionally follows OAuth2 token response conventions
instead of the common envelope.

## Data And Dependency Boundaries

- SQL access is concentrated in store packages.
- HTTP handlers parse requests, enforce route-level behavior, and return
  response envelopes.
- Authentication helpers, JWT handling, validation, OAuth, password reset, and
  email sending are split into focused packages.
- External dependencies are configured through environment variables.
- Optional integrations fail closed or become unavailable when not configured:
  OAuth providers return configuration errors, and password reset mail sending
  is disabled without Brevo configuration.

## Verification Strategy

Fast backend checks:

```bash
cd services/api
go test ./...
```

Full API smoke and acceptance checks:

```bash
verification/tests/start_me --run all
```

Demo and defense walkthroughs:

```bash
verification/user_stories/start_me
```

Current coverage focuses on auth, JWT middleware, OAuth token behavior, OAuth
route safety, password reset, movie APIs, and comment ownership flows.

## Known Development Exceptions

- Stream routes are temporarily public for development and should be moved back
  behind authentication before final hardening.
- `/api/v1/health` only confirms that the process can answer HTTP requests. DB
  connectivity is validated during startup, but there is no separate readiness
  endpoint yet.
- Startup runs a small compatibility migration for user profile/OAuth account
  behavior in addition to the SQL files in `db/`.

## Defense Checklist

- Show that protected routes reject missing, invalid, and expired bearer tokens.
- Show that comment update/delete behavior uses authenticated ownership.
- Show that password reset responses do not reveal whether an email exists.
- Show that OAuth callback state mismatches are rejected.
- Show that common errors use stable codes and appropriate HTTP statuses.
- Show `go test ./...` and `verification/tests/start_me --run all` as the two
  backend verification levels.
