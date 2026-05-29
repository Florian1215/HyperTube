# Development Auth Bypass

The API currently keeps the formerly protected route group reachable during frontend development by using a development-only auth middleware.

In `services/api/main.go`, the protected route group uses:

```go
r.Use(auth.DevAuthenticateAs(1))
// r.Use(auth.RequireAuth(tokenManager))
```

`DevAuthenticateAs(1)` injects user ID `1` into the request context. This means handlers that normally require an authenticated user, such as watched movies or comment mutations, can still run without a bearer token while the frontend is being built.

## Affected Routes

The development bypass applies to the route group that includes:

- `GET /api/v1/movies/watched`
- `GET /api/v1/movies/directstream`
- `GET /api/v1/movies/search`
- `GET /api/v1/movies/{id}`
- `GET /api/v1/movies/{id}/torrents`
- `GET /api/v1/movies/{id}/comments`
- `POST /api/v1/movies/{id}/comments`
- `GET /api/v1/comments`
- `GET /api/v1/comments/{id}`
- `PATCH /api/v1/comments/{id}`
- `DELETE /api/v1/comments/{id}`

Public auth routes, OAuth routes, health checks, and stream routes are not changed by this middleware.

## Returning To Real Auth

Before enabling production auth again, switch the route group back to the real middleware:

```go
// r.Use(auth.DevAuthenticateAs(1))
r.Use(auth.RequireAuth(tokenManager))
```

After switching back, requests to protected routes must include:

```http
Authorization: Bearer <access_token>
```

The router tests in `services/api/main_test.go` currently document the development behavior. They should be updated again when the real auth middleware is restored.
