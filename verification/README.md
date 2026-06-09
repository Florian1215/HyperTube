# Verification

This folder collects the project checks and demo walkthroughs.

## API Tests

Run automated or semi-automated API checks:

```bash
verification/tests/start_me
verification/tests/start_me --list
verification/tests/start_me --run all
verification/tests/start_me --run issue-97
```

The `issue-97` test is a curl/jq regression suite for endpoint validation,
comment route behavior, comment pagination, and the fixed auth field errors.
Set `MOVIE_ID=tt0468569` when you want to force the valid movie comment checks
against a specific seeded movie.

## User Stories

Run user-facing walkthrough scripts for demos and defense preparation:

```bash
verification/user_stories/start_me
verification/user_stories/start_me --list
verification/user_stories/start_me --run all
```

`verification/tests` is for pass/fail API verification. `verification/user_stories`
is for readable journeys that demonstrate expected product behavior.
