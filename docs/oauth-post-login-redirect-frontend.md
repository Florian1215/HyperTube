# Frontend Guide: OAuth Post-Login Redirect

## Goal

After a user starts OAuth login from a protected page, the frontend should send the target page to the backend and then use the backend-provided `redirect` value after OAuth succeeds.

Example:

```txt
User opens /movies/123
User is asked to sign in
User chooses GitHub OAuth
OAuth succeeds
Frontend lands back on /movies/123
```

The backend already preserves the redirect during the OAuth roundtrip and returns it in the frontend callback URL hash:

```txt
/auth/callback#access_token=...&user=...&redirect=%2Fmovies%2F123
```

The frontend only needs to:

1. Start OAuth with `redirect=...`.
2. Read `redirect` from the callback hash.
3. Navigate to that path after storing the user/token.

## File 1: OAuth Start

File:

```txt
frontend/src/api/auth.ts
```

Current code:

```ts
export function handleOauth(oatuhCompany: tOauthService, href: string | null) {
    let endpoint = `${API_URL}/auth/${oatuhCompany}/login`;

    if (href !== null)
        endpoint += `?href=${href}`;
    window.location.href = endpoint;
}
```

Change it to send `redirect` and URL-encode the path:

```ts
export function handleOauth(oatuhCompany: tOauthService, href: string | null) {
    let endpoint = `${API_URL}/auth/${oatuhCompany}/login`;

    if (href !== null)
        endpoint += `?redirect=${encodeURIComponent(href)}`;
    window.location.href = endpoint;
}
```

Why:

- `redirect` is the new backend contract.
- `encodeURIComponent` keeps paths with query strings valid, for example `/movies/123?tab=comments`.
- The backend still accepts the old `href` parameter, but new frontend code should use `redirect`.

No other OAuth button code needs to change. `Form.tsx` already passes `callbackUrl || pathname` into `handleOauth`.

## File 2: OAuth Callback

File:

```txt
frontend/src/app/[locale]/auth/callback/page.tsx
```

Current code always goes to `/`:

```ts
const token = params.get("access_token");
const userEncoded = params.get("user");

if (!token || !userEncoded)
    return;

const user = JSON.parse(decodeURIComponent(decodeURIComponent(userEncoded)));
login(user, token);
router.push("/");
```

Change it to read `redirect` from the hash and use it after login:

```ts
const token = params.get("access_token");
const userEncoded = params.get("user");
const redirect = params.get("redirect");

if (!token || !userEncoded)
    return;

const user = JSON.parse(decodeURIComponent(decodeURIComponent(userEncoded)));
const safeRedirect = redirect && redirect.startsWith("/") && !redirect.startsWith("//") && !redirect.includes("\\")
    ? redirect
    : "/";

login(user, token);
router.push(safeRedirect);
```

Why:

- The backend sends `redirect` in `window.location.hash`, not in the query string.
- `URLSearchParams` already decodes `%2Fmovies%2F123` into `/movies/123`.
- The safety check prevents external redirects like `https://evil.example` or `//evil.example`.
- If there is no redirect, the old fallback `/` remains unchanged.

## Expected Callback Values

Successful OAuth callback hash may contain:

```txt
access_token
token_type
expires_in
user
redirect
```

Only `redirect` is new.

Example:

```txt
/auth/callback#access_token=abc&token_type=Bearer&expires_in=3600&user=...&redirect=%2Fmovies%2F123
```

After parsing:

```ts
params.get("redirect") === "/movies/123"
```

## Manual Test

1. Open a protected page while logged out, for example:

```txt
/movies/123
```

2. Start OAuth login.

3. After the OAuth callback finishes, the user should land on:

```txt
/movies/123
```

4. Test the fallback by starting OAuth without a redirect. The user should land on:

```txt
/
```

## Important Notes

- Do not store this redirect in React state only. OAuth leaves the app, so React state is not reliable across the whole flow.
- Do not read `redirect` from `window.location.search`; the backend sends it in `window.location.hash`.
- Do not allow external URLs as redirects.
- No GitLab UI work is required for this redirect fix unless the app intentionally adds a GitLab OAuth button later.
