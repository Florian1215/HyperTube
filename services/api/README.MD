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

All unauthenticated.

### POST /auth/register

Register with email and password.

### POST /auth/login

Log in with email and password. Returns a JWT.

### POST /auth/password-reset

Request a password-reset email.

### POST /auth/reset-password

Submit a new password using the token from the reset email.

### GET /auth/42/login → GET /auth/42/callback

42 OAuth flow.

### GET /auth/github/login → GET /auth/github/callback

GitHub OAuth flow.

### POST /oauth/token

Exchange an OAuth authorisation code for a JWT (called by the frontend after an OAuth callback).

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

## Protected endpoints *(require `Authorization: Bearer <jwt>`)*

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
{ "error": { "code": "VALIDATION_ERROR", "message": "title query parameter is required" } }
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
{ "error": { "code": "VALIDATION_ERROR", "message": "invalid request body" } }
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
{ "error": { "code": "VALIDATION_ERROR", "message": "invalid request body" } }
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
{ "error": { "code": "VALIDATION_ERROR", "message": "invalid request body" } }
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
