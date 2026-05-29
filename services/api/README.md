# api

Main HTTP gateway. Handles authentication, movie search, comments, and stream coordination.
Delegates HLS transcoding to the `torrent-stream` service.

**Base path:** `/api/v1`
**Default port:** `8080` (override with `PORT`)

---

## Public endpoints

### GET /health

Health check.

**Response:** `200 OK` — no body.

---

## Auth endpoints

All authentication endpoints are public. The paths below are relative to the
base path `/api/v1`.

The API uses the same success and error envelopes for most auth endpoints:

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

Validation errors use field-based messages instead of a top-level `message`:

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

Successful register, login, and OAuth callback responses use this auth payload:

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

`access_token` is a JWT signed with `HS256`. It contains a `user_id` claim and
expires after 15 minutes. Protected routes expect:

```http
Authorization: Bearer <access_token>
```

### POST /auth/register

Registers a new password user and returns a bearer token.

#### Request body

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | yes | Valid email address. Trimmed and lowercased before storage. |
| `username` | string | yes | 3-32 characters. Letters, digits, and underscores only. |
| `first_name` | string | yes | 1-100 characters after trimming. |
| `last_name` | string | yes | 1-100 characters after trimming. |
| `password` | string | yes | 8-72 bytes. Stored as a bcrypt hash. |

Unknown JSON fields, malformed JSON, multiple JSON documents, and request bodies
larger than 1 MiB are rejected.

#### Example request

```http
POST /api/v1/auth/register
Content-Type: application/json
```

```json
{
  "email": "Ada@example.com",
  "username": "ada_lovelace",
  "first_name": "Ada",
  "last_name": "Lovelace",
  "password": "correct-horse-battery"
}
```

#### Response

`201 Created`

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

#### Error responses

| Status | Code | Message |
|--------|------|---------|
| 400 | `BAD_REQUEST` | `invalid JSON body` |
| 400 | `VALIDATION_ERROR` | `valid email is required` |
| 400 | `VALIDATION_ERROR` | `username must be 3-32 characters and contain only letters, numbers, or underscores` |
| 400 | `VALIDATION_ERROR` | `first_name is required and must be at most 100 characters` |
| 400 | `VALIDATION_ERROR` | `last_name is required and must be at most 100 characters` |
| 400 | `VALIDATION_ERROR` | `password must be between 8 and 72 bytes` |
| 409 | `USER_EXISTS` | `email or username already exists` |
| 500 | `INTERNAL_ERROR` | `failed to create user` or `failed to create token` |

Example:

```json
{
  "error": {
    "code": "USER_EXISTS",
    "message": "email or username already exists"
  }
}
```

### POST /auth/login

Logs in an existing password user by email and returns a bearer token.

#### Request body

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | yes | Valid email address. Trimmed and lowercased before lookup. |
| `password` | string | yes | Existing password. Must be present and no longer than 72 bytes. |

Unknown JSON fields, malformed JSON, multiple JSON documents, and request bodies
larger than 1 MiB are rejected.

#### Example request

```http
POST /api/v1/auth/login
Content-Type: application/json
```

```json
{
  "email": "ada@example.com",
  "password": "correct-horse-battery"
}
```

#### Response

`200 OK`

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

#### Error responses

| Status | Code | Message |
|--------|------|---------|
| 400 | `BAD_REQUEST` | `invalid JSON body` |
| 400 | `VALIDATION_ERROR` | `valid email is required` |
| 400 | `VALIDATION_ERROR` | `password is required` |
| 401 | `INVALID_CREDENTIALS` | `invalid email or password` |
| 500 | `INTERNAL_ERROR` | `failed to load user` or `failed to create token` |

Example:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "invalid email or password"
  }
}
```

### POST /auth/password-reset

Creates a single-use password-reset token and sends a reset email when email is
configured. Unknown emails intentionally receive the same accepted response as
known emails.

Password reset email sending is active only when `BREVO_API_KEY` is present and
`MAIL_FROM_EMAIL` is a valid sender address. `MAIL_FROM_NAME` is optional and
defaults to `Hypertube`.

#### Request body

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | yes | Valid email address. Trimmed and lowercased before lookup. |
| `locale` | string | no | Locale segment used when building `PASSWORD_RESET_URL`. Defaults to `en`. |

Unknown JSON fields, malformed JSON, multiple JSON documents, and request bodies
larger than 1 MiB are rejected.

#### Example request

```http
POST /api/v1/auth/password-reset
Content-Type: application/json
```

```json
{
  "email": "ada@example.com",
  "locale": "de"
}
```

#### Response

`202 Accepted`

```json
{
  "data": {
    "message": "if the email exists, a password reset link has been sent"
  }
}
```

#### Error responses

| Status | Code | Message |
|--------|------|---------|
| 400 | `BAD_REQUEST` | `invalid JSON body` |
| 400 | `VALIDATION_ERROR` | `valid email is required` |
| 503 | `EMAIL_NOT_CONFIGURED` | `password reset email is not configured` |
| 500 | `INTERNAL_ERROR` | `authentication service is unavailable` |
| 500 | `INTERNAL_ERROR` | `failed to load user` |
| 500 | `INTERNAL_ERROR` | `failed to create password reset token` |
| 500 | `INTERNAL_ERROR` | `failed to store password reset token` |
| 500 | `INTERNAL_ERROR` | `password reset URL is not configured` |
| 500 | `INTERNAL_ERROR` | `failed to send password reset email` |

Example:

```json
{
  "error": {
    "code": "EMAIL_NOT_CONFIGURED",
    "message": "password reset email is not configured"
  }
}
```

### POST /auth/reset-password

Consumes a password-reset token and replaces the user's password.

#### Request body

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | yes | Token from the reset email. Must be 32-256 characters after trimming. |
| `password` | string | yes | New password. Must be 8-72 bytes. |

Unknown JSON fields, malformed JSON, multiple JSON documents, and request bodies
larger than 1 MiB are rejected.

#### Example request

```http
POST /api/v1/auth/reset-password
Content-Type: application/json
```

```json
{
  "token": "valid-reset-token-from-email-1234567890",
  "password": "new-correct-horse"
}
```

#### Response

`200 OK`

```json
{
  "data": {
    "message": "password has been reset"
  }
}
```

#### Error responses

| Status | Code | Message |
|--------|------|---------|
| 400 | `BAD_REQUEST` | `invalid JSON body` |
| 400 | `INVALID_RESET_TOKEN` | `password reset link is invalid or expired` |
| 400 | `VALIDATION_ERROR` | `password must be between 8 and 72 bytes` |
| 400 | `VALIDATION_ERROR` | `password is invalid` |
| 500 | `INTERNAL_ERROR` | `authentication service is unavailable` |
| 500 | `INTERNAL_ERROR` | `failed to reset password` |

Example:

```json
{
  "error": {
    "code": "INVALID_RESET_TOKEN",
    "message": "password reset link is invalid or expired"
  }
}
```

### GET /auth/42/login → GET /auth/42/callback

Starts and completes the 42 OAuth authorization-code flow.

#### GET /auth/42/login

No request body is used.

The endpoint generates a random state value, stores it in an HttpOnly cookie
named `hypertube_oauth_42_state`, and redirects the browser to 42.

##### Example request

```http
GET /api/v1/auth/42/login
```

##### Response

`302 Found`

```http
Location: https://api.intra.42.fr/oauth/authorize?client_id=<client_id>&redirect_uri=<redirect_uri>&response_type=code&scope=public&state=<state>
Set-Cookie: hypertube_oauth_42_state=<state>; Path=/; Max-Age=600; HttpOnly; SameSite=Lax
```

##### Error responses

| Status | Code | Message |
|--------|------|---------|
| 503 | `OAUTH_NOT_CONFIGURED` | `42 OAuth is not configured` |
| 500 | `INTERNAL_ERROR` | `failed to create OAuth state` |
| 500 | `INTERNAL_ERROR` | `failed to start 42 OAuth` |

Example:

```json
{
  "error": {
    "code": "OAUTH_NOT_CONFIGURED",
    "message": "42 OAuth is not configured"
  }
}
```

#### GET /auth/42/callback

No request body is used.

Required callback inputs:

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `code` | query | yes, unless provider returned `error` | Authorization code from 42. |
| `state` | query | yes | Must match the `hypertube_oauth_42_state` cookie. |
| `hypertube_oauth_42_state` | cookie | yes | State cookie set by `/auth/42/login`. |
| `error` | query | no | Provider denial or provider-side error. |

##### Example request

```http
GET /api/v1/auth/42/callback?code=provider-code&state=<state>
Cookie: hypertube_oauth_42_state=<state>
```

##### Response

When `FRONTEND_AUTH_CALLBACK_URL` is configured, which defaults to
`http://localhost:4200/auth/callback`, the API redirects to the frontend with
auth data in the URL fragment:

`303 See Other`

```http
Location: http://localhost:4200/auth/callback#access_token=<jwt>&token_type=Bearer&expires_in=900&user=%7B...%7D
Set-Cookie: hypertube_oauth_42_state=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax
```

The `user` fragment value is URL-encoded JSON:

```json
{
  "id": 1,
  "email": "ft.user@example.com",
  "username": "ft_user",
  "first_name": "Forty",
  "last_name": "Two"
}
```

If the handler is configured without a frontend callback URL, the success
response is `200 OK` with the standard auth payload.

##### Error responses

With `FRONTEND_AUTH_CALLBACK_URL`, callback errors redirect to the frontend:

```http
HTTP/1.1 303 See Other
Location: http://localhost:4200/auth/callback?error=INVALID_OAUTH_STATE&error_description=invalid+OAuth+state
```

Without a frontend callback URL, errors use the standard JSON error envelope.

| Status | Code | Message |
|--------|------|---------|
| 400 | `INVALID_OAUTH_STATE` | `invalid OAuth state` |
| 401 | `OAUTH_DENIED` | Provider error value, for example `access_denied`. |
| 502 | `OAUTH_EXCHANGE_FAILED` | `failed to exchange 42 authorization code` |
| 503 | `OAUTH_NOT_CONFIGURED` | `42 OAuth is not configured` |
| 500 | `INTERNAL_ERROR` | `failed to create OAuth user`, `failed to create token`, or invalid frontend callback configuration |

### GET /auth/github/login → GET /auth/github/callback

Starts and completes the GitHub OAuth authorization-code flow.

#### GET /auth/github/login

No request body is used.

The endpoint generates a random state value, stores it in an HttpOnly cookie
named `hypertube_oauth_github_state`, and redirects the browser to GitHub.

##### Example request

```http
GET /api/v1/auth/github/login
```

##### Response

`302 Found`

```http
Location: https://github.com/login/oauth/authorize?client_id=<client_id>&redirect_uri=<redirect_uri>&response_type=code&scope=read%3Auser+user%3Aemail&state=<state>
Set-Cookie: hypertube_oauth_github_state=<state>; Path=/; Max-Age=600; HttpOnly; SameSite=Lax
```

##### Error responses

| Status | Code | Message |
|--------|------|---------|
| 503 | `OAUTH_NOT_CONFIGURED` | `GitHub OAuth is not configured` |
| 500 | `INTERNAL_ERROR` | `failed to create OAuth state` |
| 500 | `INTERNAL_ERROR` | `failed to start GitHub OAuth` |

Example:

```json
{
  "error": {
    "code": "OAUTH_NOT_CONFIGURED",
    "message": "GitHub OAuth is not configured"
  }
}
```

#### GET /auth/github/callback

No request body is used.

Required callback inputs:

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `code` | query | yes, unless provider returned `error` | Authorization code from GitHub. |
| `state` | query | yes | Must match the `hypertube_oauth_github_state` cookie. |
| `hypertube_oauth_github_state` | cookie | yes | State cookie set by `/auth/github/login`. |
| `error` | query | no | Provider denial or provider-side error. |

##### Example request

```http
GET /api/v1/auth/github/callback?code=provider-code&state=<state>
Cookie: hypertube_oauth_github_state=<state>
```

##### Response

When `FRONTEND_AUTH_CALLBACK_URL` is configured, which defaults to
`http://localhost:4200/auth/callback`, the API redirects to the frontend with
auth data in the URL fragment:

`303 See Other`

```http
Location: http://localhost:4200/auth/callback#access_token=<jwt>&token_type=Bearer&expires_in=900&user=%7B...%7D
Set-Cookie: hypertube_oauth_github_state=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax
```

The `user` fragment value is URL-encoded JSON:

```json
{
  "id": 1,
  "email": "gh.user@example.com",
  "username": "gh_user",
  "first_name": "Git",
  "last_name": "Hub"
}
```

If the handler is configured without a frontend callback URL, the success
response is `200 OK` with the standard auth payload.

##### Error responses

With `FRONTEND_AUTH_CALLBACK_URL`, callback errors redirect to the frontend:

```http
HTTP/1.1 303 See Other
Location: http://localhost:4200/auth/callback?error=OAUTH_EXCHANGE_FAILED&error_description=failed+to+exchange+GitHub+authorization+code
```

Without a frontend callback URL, errors use the standard JSON error envelope.

| Status | Code | Message |
|--------|------|---------|
| 400 | `INVALID_OAUTH_STATE` | `invalid OAuth state` |
| 401 | `OAUTH_DENIED` | Provider error value, for example `access_denied`. |
| 502 | `OAUTH_EXCHANGE_FAILED` | `failed to exchange GitHub authorization code` |
| 503 | `OAUTH_NOT_CONFIGURED` | `GitHub OAuth is not configured` |
| 500 | `INTERNAL_ERROR` | `failed to create OAuth user`, `failed to create token`, or invalid frontend callback configuration |

### GET /auth/gitlab/login -> GET /auth/gitlab/callback

Starts and completes the GitLab OAuth authorization-code flow.

#### GET /auth/gitlab/login

No request body is used.

The endpoint generates a random state value, stores it in an HttpOnly cookie
named `hypertube_oauth_gitlab_state`, and redirects the browser to GitLab.

##### Example request

```http
GET /api/v1/auth/gitlab/login
```

##### Response

`302 Found`

```http
Location: https://gitlab.com/oauth/authorize?client_id=<client_id>&redirect_uri=<redirect_uri>&response_type=code&scope=read_user&state=<state>
Set-Cookie: hypertube_oauth_gitlab_state=<state>; Path=/; Max-Age=600; HttpOnly; SameSite=Lax
```

##### Error responses

| Status | Code | Message |
|--------|------|---------|
| 503 | `OAUTH_NOT_CONFIGURED` | `GitLab OAuth is not configured` |
| 500 | `INTERNAL_ERROR` | `failed to create OAuth state` |
| 500 | `INTERNAL_ERROR` | `failed to start GitLab OAuth` |

#### GET /auth/gitlab/callback

No request body is used.

Required callback inputs:

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `code` | query | yes, unless provider returned `error` | Authorization code from GitLab. |
| `state` | query | yes | Must match the `hypertube_oauth_gitlab_state` cookie. |
| `hypertube_oauth_gitlab_state` | cookie | yes | State cookie set by `/auth/gitlab/login`. |
| `error` | query | no | Provider denial or provider-side error. |

##### Example request

```http
GET /api/v1/auth/gitlab/callback?code=provider-code&state=<state>
Cookie: hypertube_oauth_gitlab_state=<state>
```

##### Response

When `FRONTEND_AUTH_CALLBACK_URL` is configured, the API redirects to the
frontend with auth data in the URL fragment, matching the 42 and GitHub
callback shape. Without a frontend callback URL, the success response is
`200 OK` with the standard auth payload.

##### Error responses

| Status | Code | Message |
|--------|------|---------|
| 400 | `INVALID_OAUTH_STATE` | `invalid OAuth state` |
| 401 | `OAUTH_DENIED` | Provider error value, for example `access_denied`. |
| 502 | `OAUTH_EXCHANGE_FAILED` | `failed to exchange GitLab authorization code` |
| 503 | `OAUTH_NOT_CONFIGURED` | `GitLab OAuth is not configured` |
| 500 | `INTERNAL_ERROR` | `failed to create OAuth user`, `failed to create token`, or invalid frontend callback configuration |

### POST /oauth/token

OAuth2-compatible token endpoint for the password grant. It returns a JWT bearer
access token for API routes. This endpoint is also available at the legacy root
path `POST /oauth/token`.

Unlike the other auth endpoints, this endpoint uses OAuth2 token response shapes
directly. Success responses are not wrapped in `data`, and errors are not
wrapped in `error`.

#### Request body

Supported content types:

- `application/x-www-form-urlencoded`
- `application/json`
- empty `Content-Type`, parsed as form data

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `grant_type` | string | yes | Must be `password`. |
| `username` | string | yes | Username or email address. Email login is normalized. |
| `password` | string | yes | Existing password. Must be present and no longer than 72 bytes. |
| `scope` | string | no | Optional OAuth scope string. Whitespace is normalized in the response. |

#### Example request

```http
POST /api/v1/oauth/token
Content-Type: application/x-www-form-urlencoded
```

```text
grant_type=password&username=ada_lovelace&password=correct-horse-battery&scope=profile
```

JSON is also accepted:

```json
{
  "grant_type": "password",
  "username": "ada@example.com",
  "password": "correct-horse-battery",
  "scope": "profile"
}
```

#### Response

`200 OK`

```json
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 900,
  "scope": "profile"
}
```

Response headers include:

```http
Cache-Control: no-store
Pragma: no-cache
```

#### Error responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `invalid_request` | Invalid `Content-Type`, invalid body, missing `grant_type`, missing `username` or `password`, or password too long. |
| 400 | `unsupported_grant_type` | `grant_type` is not `password`. |
| 400 | `invalid_grant` | Username/email or password is incorrect. |
| 415 | `invalid_request` | Body must be form encoded or JSON. |
| 500 | `server_error` | Auth service unavailable, user load failed, or token creation failed. |

Example:

```json
{
  "error": "invalid_grant",
  "error_description": "invalid username or password"
}
```

---

## Stream endpoints *(temporarily public — will move behind auth)*

### GET /stream/{id}

Initialise the HLS stream for a movie. Calls `POST /transcode/{id}` on the `torrent-stream` service.
If `/data/videos/{id}/` already exists the call returns immediately without re-transcoding.

| Parameter | Description          |
|-----------|----------------------|
| `id`      | IMDb ID of the movie |

| Code | Meaning                               |
|------|---------------------------------------|
| 200  | Stream is ready or has been started   |
| 500  | Transcode service unreachable/failed  |

### GET /stream/{id}/index

Returns the HLS playlist (`stream.m3u8`).

**Response:** `200 OK` — `Content-Type: application/vnd.apple.mpegurl`

### GET /stream/{id}/{segment}

Serves a single `.ts` segment (e.g. `stream0.ts`). The player fetches these automatically from the playlist.

**Response:** `200 OK` — `Content-Type: video/mp2t`

---

## Movie and comment endpoints

`GET /movies` is public. The remaining movie and comment endpoints in this
section require `Authorization: Bearer <jwt>`.

### GET /movies

Returns the curated list of featured movies.

### Response

```json
{
  "data": [
    {
      "imdb_id": "string",
      "title": "string",
      "year": "string",
      "poster_url": "string",
      "backdrop_url": "string",
      "note": 8.1,
      "genres": [878, 12, 18]
    }
  ],
  "meta": { "total": 12, "page": 0, "per_page": 12 }
}
```

> Only the card fields are returned. Full details are available via `GET /movies/{id}`.

### Error responses

```json
{ "error": { "code": "INTERNAL_ERROR", "message": "failed to load movies" } }
```

---

## GET /movies/directstream

Returns movies available for direct streaming.

### Response

```json
{
  "data": [
    {
      "imdb_id": "string",
      "title": "string",
      "year": "string",
      "poster_url": "string",
      "backdrop_url": "string",
      "note": 8.1,
      "genres": [878, 12, 18]
    }
  ],
  "meta": { "total": 2, "page": 0, "per_page": 2 }
}
```

### Error responses

```json
{ "error": { "code": "INTERNAL_ERROR", "message": "failed to load movies" } }
```

---

## GET /movies/search?title=&page=

Searches for movies by title. On first request, fetches from tracker sources, resolves metadata via TMDB, and persists results to the database. Subsequent requests for the same title are served directly from the database. Results are paginated at 12 per page.

### Query parameters

| Parameter | Type    | Required | Default | Description                  |
|-----------|---------|----------|---------|------------------------------|
| `title`   | string  | yes      |         | Title to search for          |
| `page`    | integer | no       | `0`     | Page index (0 is first page) |

### Response

```json
{
  "data": [
    {
      "imdb_id": "string",
      "title": "string",
      "year": "string",
      "poster_url": "string",
      "backdrop_url": "string",
      "note": 8.1,
      "genres": [878, 12, 18]
    }
  ],
  "meta": { "total": 87, "page": 0, "per_page": 12 }
}
```

### Error responses

```json
{ "error": { "code": "VALIDATION_ERROR", "fields": { "title": { "message": "title query parameter is required" } } } }
```
```json
{ "error": { "code": "INTERNAL_ERROR", "message": "failed to search movies" } }
```

---

## GET /movies/watched

Returns the watch history for the authenticated user, ordered by most recently
watched. Requires `Authorization: Bearer <access_token>`.

No request body is used. The user is taken from the JWT.

### Response

```json
{
  "data": [
    {
      "imdb_id": "string",
      "title": "string",
      "year": "string",
      "poster_url": "string",
      "backdrop_url": "string",
      "note": 8.1,
      "genres": [878, 12, 18]
    }
  ],
  "meta": { "total": 3, "page": 0, "per_page": 3 }
}
```

### Error responses

```json
{ "error": { "code": "VALIDATION_ERROR", "fields": { "body": { "message": "invalid request body" } } } }
```
```json
{ "error": { "code": "INTERNAL_ERROR", "message": "failed to load movies" } }
```

---

## GET /movies/{id}

Returns full metadata for a single movie. Summary, director, and cast are fetched live from TMDB.

### Path parameters

| Parameter | Type   | Description          |
|-----------|--------|----------------------|
| `id`      | string | IMDb ID of the movie |

### Query parameters

| Parameter | Type   | Required | Default  | Description                        |
|-----------|--------|----------|----------|------------------------------------|
| `lang`    | string | no       | `en-US`  | TMDB language code for the details |

### Response

```json
{
  "data": {
    "imdb_id": "string",
    "tmdb_id": "string",
    "title": "string",
    "year": "string",
    "poster_url": "string",
    "backdrop_url": "string",
    "note": 8.1,
    "genres": [878, 12, 18],
    "summary": "string",
    "director": "string",
    "cast": ["string"],
    "extra_backdrops": ["string"],
    "watched": false,
    "progression": 0.0
  }
}
```

### Error responses

```json
{ "error": { "code": "NOT_FOUND", "message": "movie not found" } }
```
```json
{ "error": { "code": "INTERNAL_ERROR", "message": "failed to load movie" } }
```
```json
{ "error": { "code": "INTERNAL_ERROR", "message": "failed to fetch movie details" } }
```

---

## GET /movies/{id}/torrents

Returns available torrent sources for a movie.

### Path parameters

| Parameter | Type   | Description          |
|-----------|--------|----------------------|
| `id`      | string | IMDb ID of the movie |

### Response

```json
{
  "data": [
    {
      "id": 1,
      "imdb_id": "string",
      "title": "string",
      "year": 2024,
      "source": "string",
      "url": "string",
      "quality": "string",
      "size": 2.4,
      "language": "string",
      "seeds": "string"
    }
  ],
  "meta": { "total": 4, "page": 0, "per_page": 4 }
}
```

### Error responses

```json
{ "error": { "code": "NOT_FOUND", "message": "no tracker source found for this movie" } }
```
```json
{ "error": { "code": "INTERNAL_ERROR", "message": "failed to load tracker source" } }
```

---

## GET /movies/{id}/comments

Returns comments posted on a movie, ordered by most recent first.

### Path parameters

| Parameter | Type   | Description          |
|-----------|--------|----------------------|
| `id`      | string | IMDb ID of the movie |

### Response

```json
{
  "data": [
    {
      "id": 1,
      "user_id": 2,
      "movie_id": "string",
      "content": "string",
      "updated_at": "2026-05-06T12:00:00Z"
    }
  ],
  "meta": { "total": 8, "page": 0, "per_page": 8 }
}
```

### Error responses

```json
{ "error": { "code": "NOT_FOUND", "message": "no comments" } }
```
```json
{ "error": { "code": "INTERNAL_ERROR", "message": "failed to acess comments" } }
```

---

## POST /movies/{id}/comments

Posts a new comment on a movie as the authenticated user. Requires
`Authorization: Bearer <access_token>`.

### Path parameters

| Parameter | Type   | Description          |
|-----------|--------|----------------------|
| `id`      | string | IMDb ID of the movie |

### Request body

```json
{
  "content": "string"
}
```

### Response

`201 Created`

```json
{
  "data": {
    "id": 1,
    "user_id": 1,
    "movie_id": "string",
    "content": "string",
    "updated_at": "2026-05-06T12:00:00Z"
  }
}
```

### Error responses

```json
{ "error": { "code": "VALIDATION_ERROR", "fields": { "body": { "message": "invalid request body" } } } }
```
```json
{ "error": { "code": "INTERNAL_ERROR", "message": "failed to create comment" } }
```

---

## GET /comments

Returns all comments across all movies.

### Response

```json
{
  "data": [
    {
      "id": 1,
      "user_id": 2,
      "movie_id": "string",
      "content": "string",
      "updated_at": "2026-05-06T12:00:00Z"
    }
  ],
  "meta": { "total": 8, "page": 0, "per_page": 8 }
}
```

### Error responses

```json
{ "error": { "code": "NOT_FOUND", "message": "comments not found" } }
```
```json
{ "error": { "code": "INTERNAL_ERROR", "message": "failed to load comments" } }
```

---

## GET /comments/{id}

Returns a single comment by its ID.

### Path parameters

| Parameter | Type   | Description       |
|-----------|--------|-------------------|
| `id`      | string | ID of the comment |

### Response

```json
{
  "data": {
    "id": 1,
    "user_id": 2,
    "movie_id": "string",
    "content": "string",
    "updated_at": "2026-05-06T12:00:00Z"
  }
}
```

### Error responses

```json
{ "error": { "code": "NOT_FOUND", "message": "comment not found" } }
```
```json
{ "error": { "code": "INTERNAL_ERROR", "message": "failed to load comment" } }
```

---

## PATCH /comments/{id}

Updates the content of an existing comment if it belongs to the authenticated
user. Requires `Authorization: Bearer <access_token>`.

### Path parameters

| Parameter | Type   | Description       |
|-----------|--------|-------------------|
| `id`      | string | ID of the comment |

### Request body

```json
{
  "content": "string"
}
```

### Response

```json
{
  "data": {
    "id": 1,
    "user_id": 2,
    "movie_id": "string",
    "content": "string",
    "updated_at": "2026-05-06T12:00:00Z"
  }
}
```

### Error responses

```json
{ "error": { "code": "VALIDATION_ERROR", "fields": { "body": { "message": "invalid request body" } } } }
```
```json
{ "error": { "code": "NOT_FOUND", "message": "comment not found" } }
```
```json
{ "error": { "code": "INTERNAL_ERROR", "message": "failed to update comment" } }
```

---

## DELETE /comments/{id}

Deletes a comment if it belongs to the authenticated user. Requires
`Authorization: Bearer <access_token>`.

### Path parameters

| Parameter | Type   | Description       |
|-----------|--------|-------------------|
| `id`      | string | ID of the comment |

No request body is used. The user is taken from the JWT.

### Response

`200 OK`

```json
{ "data": null }
```

### Error responses

```json
{ "error": { "code": "NOT_FOUND", "message": "comment not found" } }
```
```json
{ "error": { "code": "INTERNAL_ERROR", "message": "failed to delete comment" } }
```
