# API Internationalization With Accept-Language

## Purpose

The API now treats user-facing messages as part of the backend contract. Clients
can ask for English, French, or German responses by sending:

```http
Accept-Language: en
Accept-Language: fr
Accept-Language: de
```

The backend normalizes the incoming language and uses it for validation errors,
authentication messages, OAuth errors, movie API messages, and comment API
messages. If no supported language is provided, the API falls back to English.

## Why This Was Done

Before this change, the backend had many hardcoded English messages spread
across handlers. That meant the frontend could switch its UI language while API
errors still came back in the default language.

This created three problems:

- The frontend had to either show backend messages in the wrong language or
  duplicate backend error logic.
- Validation errors were inconsistent across endpoints.
- OAuth errors were especially difficult because they happen through redirects,
  not normal `fetch` calls.

The new approach keeps stable error codes and localizes only the user-facing
text. For example, `VALIDATION_ERROR` remains stable, while field messages are
translated according to `Accept-Language`.

## Backend Design

The localization logic lives in `services/api/internal/i18n`.

That package owns:

- supported locales: `en`, `fr`, `de`
- `Accept-Language` parsing and fallback behavior
- message keys used by handlers
- translations for user-facing API messages

Handlers no longer need to know translation details. They choose a stable
message key, and the response layer renders that key in the request language.

Example response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "fields": {
      "email": {
        "message": "adresse email invalide"
      }
    }
  }
}
```

## OAuth Behavior

OAuth is different from normal API calls because the browser navigates through:

```text
frontend -> backend -> provider -> backend callback -> frontend callback
```

The frontend cannot reliably attach custom headers to that redirect flow.
Because of that, the backend now stores the detected locale in a short-lived
HttpOnly OAuth locale cookie when the OAuth flow starts. The callback can then
reuse the same locale for `error_description` if the provider flow fails.

This means OAuth errors can be localized even though the final error is produced
during a callback request.

## What The Frontend Can Do

The backend is ready to localize responses, but it can only use the language
information it receives. For best results, the frontend should send the active
app locale with every API request.

For normal API calls, always include `Accept-Language`, even when the user is
not authenticated yet:

```ts
headers: {
  "Content-Type": "application/json",
  "Accept-Language": locale,
  ...(token && { Authorization: `Bearer ${token}` })
}
```

This is especially important for:

- login
- registration
- password reset
- validation errors before a user has a token

For OAuth start URLs, pass the selected locale as a query parameter:

```text
/api/v1/auth/42/login?locale=fr
/api/v1/auth/github/login?locale=de
/api/v1/auth/gitlab/login?locale=en
```

The backend already understands this parameter and stores it for the callback.
If the parameter is missing, the backend falls back to `Accept-Language`, and
then to English.

The frontend should keep using backend `error.code` values for logic and display
the backend-provided `message`, field `message`, or OAuth `error_description`
as user-facing text.

## Why This Is Better

This is better because the backend is now the single source of truth for API
messages. The frontend no longer needs to reproduce validation rules just to
translate their errors correctly.

It also makes the response shape more predictable:

- error codes stay stable for programmatic handling
- messages are localized for users
- validation errors remain field-based
- OAuth redirect errors use the same language strategy
- unsupported or missing languages fall back safely to English

The result is a cleaner contract between frontend and backend: the frontend
selects the language, the backend owns the API meaning, and users see messages
in the language they chose.

## Verification

Backend tests cover:

- `Accept-Language` parsing
- English/French/German message selection
- localized register validation errors
- localized login credential errors
- localized OAuth token errors
- OAuth callback locale persistence
- movie detail language forwarding to TMDB

Run:

```bash
cd services/api
go test ./...
```

If Go is not installed locally, the same check can run through Docker:

```bash
docker run --rm -v "$PWD/services/api:/app" -w /app golang:1.26-alpine go test ./...
```
