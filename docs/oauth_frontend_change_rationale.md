# OAuth Callback Issue and Frontend Change Rationale

## Purpose

This document explains the OAuth problem that was observed during local 42 and
GitHub authentication, why a frontend change was initially attempted, and why
that frontend change can be a better long-term solution even if it must be
reviewed separately because the frontend is currently considered out of scope.

The goal is not to hide that the frontend was touched. The goal is to make the
technical reasoning explicit: the broken behavior crosses the backend/frontend
boundary, and a complete OAuth browser flow needs both sides to agree on the
same callback contract.

## Symptoms

The 42 OAuth login flow produced a redirect to:

```text
http://localhost:8080/api/v1/auth/42/manual-copy?code=...&state=...
```

That URL is not a registered application route for normal browser login, so it
returns `404 Not Found`.

When the URL was manually edited to:

```text
http://localhost:8080/api/v1/auth/42/callback?code=...&state=...
```

the backend returned:

```text
INVALID_OAUTH_STATE
invalid OAuth state
```

GitHub OAuth also reached the frontend error redirect:

```text
http://localhost:4200/en/auth/callback?error=INTERNAL_ERROR&error_description=failed+to+create+OAuth+user
```

## Correct OAuth URLs

For a browser-based OAuth flow, provider redirect URLs should point back to the
backend callback endpoint, because the backend owns the authorization-code
exchange and local user creation:

```env
FORTYTWO_REDIRECT_URL=http://localhost:8080/api/v1/auth/42/callback
GITHUB_REDIRECT_URL=http://localhost:8080/api/v1/auth/github/callback
```

After the backend validates state, exchanges the provider code, creates or
links the local user, and creates the app JWT, it redirects the browser to the
frontend callback URL:

```env
FRONTEND_AUTH_CALLBACK_URL=http://localhost:4200/en/auth/callback
```

These URLs have different responsibilities:

```text
Provider -> Backend callback -> Frontend callback
```

The provider must not redirect directly to the frontend, because the frontend
does not have the client secret and should not exchange provider authorization
codes directly.

## Why `manual-copy` Appeared

The `manual-copy` path exists in the repository as a CLI-only workaround for a
manual OAuth demo flow.

That path is documented in the shell walkthrough for a terminal-based flow where
`curl` keeps the OAuth state cookie, the user opens the provider consent page in
a browser, and then manually copies the final callback URL back into the script.

For that special CLI flow, `manual-copy` is only a parking URL. It is not meant
to be handled by the backend router as a normal production or local browser
callback.

For normal app login, the 42 app configuration should use:

```text
http://localhost:8080/api/v1/auth/42/callback
```

If the browser still lands on `manual-copy`, then one of these is true:

1. The `.env` file still contains `FORTYTWO_REDIRECT_URL=.../manual-copy`.
2. The running backend process or Docker container was not restarted after the
   `.env` file was changed.
3. The OAuth provider application settings still contain the old redirect URL.
4. The login flow was started before the configuration was corrected.

Changing `GITHUB_REDIRECT_URL` does not affect the 42 provider. The 42 provider
uses only `FORTYTWO_REDIRECT_URL`.

## Why Manual URL Editing Causes `INVALID_OAUTH_STATE`

The OAuth `state` value is a CSRF protection mechanism.

In this backend implementation, the flow works like this:

1. The browser opens `/api/v1/auth/42/login`.
2. The backend generates a random state value.
3. The backend stores that state in an HttpOnly cookie.
4. The backend redirects to the 42 authorization URL with the same state in the
   query string.
5. 42 redirects back to the configured backend callback with `code` and `state`.
6. The backend compares the query `state` with the HttpOnly cookie.

If the query value and cookie value do not match, the backend rejects the
callback with:

```text
INVALID_OAUTH_STATE
```

That rejection is correct and should not be bypassed.

Manually editing the callback URL is unreliable because it can break the link
between the exact browser request, the exact generated state value, and the
exact state cookie. A valid fix is to restart the login flow after the redirect
configuration has been corrected.

## Backend-Only Fixes

The backend/config side should do the following:

1. Keep provider callback URLs pointed at backend routes:

   ```env
   FORTYTWO_REDIRECT_URL=http://localhost:8080/api/v1/auth/42/callback
   GITHUB_REDIRECT_URL=http://localhost:8080/api/v1/auth/github/callback
   ```

2. Configure the frontend landing URL explicitly:

   ```env
   FRONTEND_AUTH_CALLBACK_URL=http://localhost:4200/en/auth/callback
   ```

3. Restart or recreate the backend process after `.env` changes:

   ```bash
   docker compose up -d --force-recreate api
   ```

4. Add backend logging around OAuth exchange and local user creation failures so
   that a generic frontend error such as `failed to create OAuth user` can be
   diagnosed from backend logs.

These backend changes are safe and useful even if the frontend cannot be
changed.

## Why a Frontend Change Was Attempted

The backend already has a frontend redirect contract.

On successful OAuth login, the backend redirects to `FRONTEND_AUTH_CALLBACK_URL`
and places the app auth data in the URL fragment:

```text
http://localhost:4200/en/auth/callback#access_token=...&token_type=Bearer&expires_in=...&user=...
```

On OAuth failure, the backend redirects to the same frontend route with error
data in the query string:

```text
http://localhost:4200/en/auth/callback?error=INVALID_OAUTH_STATE&error_description=invalid+OAuth+state
```

That means the frontend needs a page at:

```text
/[locale]/auth/callback
```

Without such a page, the backend can complete the OAuth part correctly and still
leave the user on a frontend route that does not know how to finish login.

The attempted frontend change added exactly that missing consumer:

1. A localized callback page under `/[locale]/auth/callback`.
2. Logic to read the URL fragment on success.
3. Logic to store the returned app JWT and user through the existing auth
   context.
4. Logic to show an error notification when the backend redirects with
   `error=...`.
5. A small normalization layer for the backend auth payload.

This was not an arbitrary frontend redesign. It was an implementation of the
client side of an already-existing backend OAuth contract.

## Why the Frontend Callback Page Is Probably the Better Long-Term Solution

A dedicated frontend callback route is the standard browser OAuth pattern for
single-page or Next.js applications where the backend owns the provider code
exchange.

It is better than leaving the user on a backend response because:

1. The browser ends in the actual application, not on an API endpoint.
2. The frontend can store the app JWT consistently using the existing auth
   context.
3. The frontend can display localized, user-facing errors instead of raw backend
   JSON.
4. The URL fragment is not sent to the server during normal HTTP navigation,
   which is appropriate for short-lived client-side handoff data.
5. The backend remains responsible for sensitive provider secrets and token
   exchange.
6. The provider callback and frontend callback become clearly separated.

This also improves debugging because each part has a clear responsibility:

```text
Backend callback:
- validate OAuth state
- exchange provider code
- fetch provider profile
- create or link local user
- create app JWT
- redirect to frontend callback

Frontend callback:
- parse success fragment or error query
- store app JWT/user
- show success or error state
- navigate back into the app
```

## Why the Payload Normalization Was Included

The backend response uses Go/JSON field names:

```json
{
  "first_name": "Example",
  "last_name": "User"
}
```

The frontend user type uses:

```ts
{
  firstname: string;
  lastname: string;
}
```

A frontend callback page that directly stores the backend payload would therefore
produce a user object that does not fully match the existing frontend type.

The attempted normalization layer converted backend auth payloads into the shape
already used by the frontend. That is why the change also touched the frontend
auth service, not only the callback page.

This normalization is not OAuth-specific. It also reveals an existing contract
mismatch between normal login/register responses and frontend expectations.

## Why This May Be Better Than a Backend-Only Redirect

A backend-only solution can make the provider callback work, but it cannot make
the frontend logged-in state appear unless the frontend consumes the result.

The backend has three choices after a successful OAuth callback:

1. Return JSON from the backend callback.
2. Redirect to the frontend with auth data.
3. Set an application cookie directly.

The current backend is already built around option 2.

Given option 2, the frontend must implement the matching callback page. If it
does not, users may successfully authenticate at the provider and still not be
logged into the app.

Therefore, the frontend callback page is not just nice to have. It is the
missing half of the chosen backend OAuth design.

## Why It Still Needs Separate Approval

Even though the frontend change is technically justified, it still changes
frontend behavior and frontend-owned files.

If the project rule is "do not touch frontend", then the correct process is:

1. Keep the backend/config fixes in the current scope.
2. Document the frontend requirement.
3. Ask the frontend owner or evaluator for permission to add the callback page.
4. Submit the frontend callback as a separate, minimal patch.

The smallest frontend patch should include only:

```text
frontend/src/app/[locale]/auth/callback/page.tsx
frontend/src/services/auth.ts
```

Optionally, if allowed:

```text
frontend/src/services/api.ts
frontend/src/types/user.ts
```

Those optional files are only needed to make API URL configuration and typing
cleaner. The core missing feature is the callback route.

## Recommended Next Steps

For the current backend/config scope:

1. Ensure `.env` contains:

   ```env
   FORTYTWO_REDIRECT_URL=http://localhost:8080/api/v1/auth/42/callback
   GITHUB_REDIRECT_URL=http://localhost:8080/api/v1/auth/github/callback
   FRONTEND_AUTH_CALLBACK_URL=http://localhost:4200/en/auth/callback
   ```

2. Ensure the 42 OAuth app settings contain exactly:

   ```text
   http://localhost:8080/api/v1/auth/42/callback
   ```

3. Ensure the GitHub OAuth app settings contain exactly:

   ```text
   http://localhost:8080/api/v1/auth/github/callback
   ```

4. Recreate the backend container or restart the backend process.

5. Start a completely new OAuth login attempt from the frontend login button.

For the full user-facing OAuth flow:

1. Add a frontend callback page for `/[locale]/auth/callback`.
2. Parse successful auth data from the URL fragment.
3. Parse errors from the query string.
4. Store the returned app JWT and user using the existing auth context.
5. Redirect the user back to the app after the callback is consumed.

## Summary

The immediate `manual-copy` problem is caused by wrong or stale 42 redirect
configuration. It should be fixed by using `FORTYTWO_REDIRECT_URL`, updating the
42 provider settings, and restarting the backend.

The `INVALID_OAUTH_STATE` problem is expected when manually editing callback
URLs because OAuth state validation depends on a matching HttpOnly cookie from
the same login attempt.

The GitHub `failed to create OAuth user` error is a backend-side failure that
needs backend logs to diagnose accurately.

The frontend change was attempted because the backend already redirects OAuth
success and failure to a frontend callback URL, but the frontend needs a route to
consume that callback. That frontend route is likely the better complete design,
but it should be reviewed and approved separately if frontend files are not
allowed in the current task scope.
