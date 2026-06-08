# Issue 97 Implementation Plan

## Goal

Fix the endpoint validation, routing, authentication-order, comment, and pagination regressions listed in issue #97 while keeping the public API contract consistent.

## API Decisions

- `/auth/login` keeps the documented request body fields `login` and `password`.
- `/auth/login` must not introduce `email` as a request-field alias.
- Invalid field types on `/auth/login` must therefore report `fields.login` when the invalid identifier field is `login`.
- Payloads using an unknown `email` field on `/auth/login` can remain an unknown-field `BAD_REQUEST` unless the API contract is changed explicitly.
- Comment routes should stay plural. Remove the accidental singular `/comment` route.
- Comment creation should happen through `POST /movies/{id}/comments`; `POST /comments` should not create a comment.

## Implementation Steps

1. Add regression tests first

   Add focused tests for every reported case before changing behavior:

   - `/auth/register` rejects invalid email prefix, domain, TLD, max-length violations, invalid prefix characters, leading/trailing prefix periods, and consecutive prefix periods.
   - `/auth/register` rejects invalid `first_name` and `last_name` characters such as emojis.
   - `/auth/register` returns `VALIDATION_ERROR.fields.<field>` for invalid JSON field types.
   - `/auth/login` returns `VALIDATION_ERROR.fields.login` for an invalid `login` type.
   - `/auth/login` returns `VALIDATION_ERROR.fields.password` for an invalid `password` type.
   - `POST /comments` returns `405 Method Not Allowed`.
   - Invalid or missing comment/movie resources return `404 NOT_FOUND`.
   - Invalid comment `content` type returns `fields.content`, not `fields.body`.
   - Missing, empty, or whitespace-only `content` returns `400 VALIDATION_ERROR`.
   - Saved comment content is trimmed.
   - `GET /comments?page=0` and `GET /movies/{id}/comments?page=0` return paginated `meta`.

2. Replace direct auth JSON decoding with field-aware decoding

   Current decoding directly into string structs turns type errors such as `{"login":454}` into a generic `BAD_REQUEST`.

   Implement a small field-aware JSON decoder for auth requests:

   - Still reject malformed JSON, multiple JSON documents, oversized bodies, and unknown fields as `BAD_REQUEST`.
   - Decode known fields from `json.RawMessage`.
   - If a known field has the wrong JSON type, return `VALIDATION_ERROR` for that exact field.
   - Keep the existing i18n response shape via `writeValidationError`.

3. Strengthen register email validation

   Replace the permissive `net/mail.ParseAddress`-only check with explicit validation rules:

   - Exactly one `@`.
   - Prefix length `1..64`.
   - Prefix characters: `a-z`, `A-Z`, `0-9`, `.`, `_`, `-`, `+`.
   - Prefix cannot start/end with `.`.
   - Prefix cannot contain consecutive periods.
   - Domain length `1..253`.
   - Domain characters: `a-z`, `A-Z`, `0-9`, `.`, `-`.
   - Domain has at least one dot and a TLD.
   - Domain labels are non-empty.
   - Domain labels do not start/end with `-`.
   - TLD length `2..63`.
   - TLD contains letters only.

   Keep normalizing email to lowercase and trimming outer whitespace.

4. Keep login validation on `login`, not `email`

   Update `/auth/login` tests and implementation around the documented `login` field:

   - Valid request: `{"login":"alice@example.com","password":"..."}`.
   - Invalid identifier type: `{"login":454,"password":"..."}` returns `fields.login`.
   - Invalid identifier value: `{"login":"not-an-email!","password":"..."}` returns `fields.login`.
   - Missing identifier returns `fields.login`.
   - Do not accept or special-case `email` in the login payload.

5. Add name character validation

   Extend register validation for `first_name` and `last_name`:

   - Trim before validation, as today.
   - Keep required and max-length checks.
   - Reject emoji, digits, and symbols.
   - Allow Unicode letters, spaces, hyphen, and apostrophe.
   - Return `MsgFirstNameInvalid` or `MsgLastNameInvalid`.

6. Fix routing and method handling

   Update `services/api/main.go`:

   - Remove `GET /comment`.
   - Remove public comment creation from `POST /comments`.
   - Keep `GET /comments`, `GET /comments/{id}`, `PATCH /comments/{id}`, and `DELETE /comments/{id}`.
   - Keep `GET /movies/{id}/comments` and `POST /movies/{id}/comments`.
   - Avoid wrapping broad route groups in auth middleware when that causes `401` before method matching.
   - Apply auth with `r.With(auth.RequireAuth(tokenManager))` on protected method registrations so unsupported methods can resolve to `405`.

7. Fix comment resource and body validation order

   For comment update/delete/get routes:

   - Parse invalid IDs as `404 NOT_FOUND`.
   - Load/check the target comment before validating the body for update.
   - For update, if the comment does not exist or is not owned by the authenticated user, return `404`.
   - Decode `content` field-aware, so `{"content":436}` returns `fields.content`.
   - Trim `content` before saving.

   For movie comment routes:

   - Resolve `movies/{id}` before decoding request body.
   - If the movie does not exist, return `404 NOT_FOUND`.
   - Decode and validate `content` after the movie exists.
   - Return `fields.content` for missing, empty, whitespace-only, or invalid-type content.
   - Trim content before insert.

8. Unify comment storage around DB schema

   The database schema stores `comments.movie_id` as an IMDb string, but `comments.Store.create` currently accepts an `int`.

   Update comment storage contracts so movie IDs are consistently strings:

   - Use IMDb string IDs for comment creation.
   - Remove or stop exposing the stale `POST /comments` create path.
   - Ensure `findByID`, `findAll`, `update`, and `delete` use `int` comment IDs consistently.
   - Fix fake stores in tests to match the real interfaces.

9. Implement pagination for comment lists

   Add a shared page parser:

   - `page` defaults to `0`.
   - Negative values normalize to `0`.
   - Invalid non-integer values normalize to `0`, unless the team wants a validation error.
   - Use the same page size already used by movie search unless a separate comment page size is defined.

   Update stores and handlers:

   - `GET /comments?page=0` returns `respond.ListPaginated`.
   - `GET /movies/{id}/comments?page=0` returns `respond.ListPaginated`.
   - Store methods should query with `COUNT(*)`, `LIMIT`, and `OFFSET`.
   - Empty valid pages return `200` with empty data and correct `meta`.

10. Update docs and translations as needed

   - Update `services/api/README.md` to reflect the final comment route list and login contract.
   - Add or reuse i18n messages only where needed.
   - Keep validation response format consistent with existing `VALIDATION_ERROR.fields`.

11. Verify

   Run:

   ```sh
   go test ./services/api/...
   ```

   Then manually verify the issue examples against the router:

   - `POST /comments` returns `405`.
   - `PATCH /comments/{id}` with an invalid body and missing comment returns `404`.
   - `POST /movies/{invalid_id}/comments` returns `404`.
   - `GET /movies/{invalid_id}/comments` returns `404`.
   - `POST /movies/{valid_id}/comments` rejects missing/empty/invalid-type `content`.
   - `GET /comments/{invalid_id}` returns `404`.
   - `GET /comments?page=0` returns paginated meta.
   - `GET /movies/{movie_id}/comments?page=0` returns paginated meta.
   - `/auth/login` type errors target `fields.login` and `fields.password`.
