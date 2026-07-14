# HyperTube

A web application to search for and stream movies downloaded via Torrent — playback begins before the download completes.

Built as a 42 Berlin project by Jules Bernard, Omio Ohoro and Florian Guirama.

---

## Concept

A user searches for a movie. Results are pulled from two torrent sources (archive.org and C411) and enriched with metadata from TMDb (poster, rating, cast, year, synopsis). The user clicks play. The torrent service starts downloading with the BitTorrent client, transcodes the file to HLS on the fly with ffmpeg, and the browser begins playing within seconds via `hls.js`. All torrent traffic is routed through a VPN. Watch progress is tracked per user, and downloaded videos are deleted automatically after 30 days.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 / React 19 (App Router, `next-intl`, TanStack Query, Tailwind 4, `hls.js`) |
| API | Go (chi router) |
| Torrent + transcode | Go (`anacrolix/torrent` + `ffmpeg`) |
| Database | PostgreSQL 16 |
| VPN | Gluetun + OpenVPN (Private Internet Access) |
| Local dev | Docker Compose |

---

## Architecture

```
browser (Next.js + hls.js)
  │  REST  /api/v1/*
  ▼
api service (Go, :8080)
  ├── auth — email/password, 42 / GitHub / GitLab OAuth, JWT + refresh tokens
  ├── users, comments, watch history & progress
  ├── movie search + metadata (archive.org, C411, TMDb)
  └── stream — serves the HLS playlist + segments from the shared /data volume
        │  HTTP (internal)  →  torrent-transcode (:8081, behind VPN)
        ▼
torrent-transcode service (Go)
  ├── anacrolix/torrent — sequential piece download
  ├── ffmpeg — transcode to HLS (H.264 / AAC, 5s segments)
  └── cleanup — removes unfinished torrents on restart, old videos after 30 days

ALL torrent traffic shares the VPN container's network namespace (Gluetun / PIA)
```

The `api` and `torrent-transcode` services share the `./data` volume: `torrent-transcode`
downloads and transcodes into `/data/videos/{id}/`, and the `api` stream handler serves
those HLS files to the browser.

---

## The Streaming Pipeline

```
magnet / .torrent
  → anacrolix/torrent (sequential pieces)
  → ffmpeg -i <source> → HLS  (stream.m3u8 + stream0.ts, stream1.ts, …)
  → api /stream/{id}/index  and  /stream/{id}/{segment}
  → browser <video> via hls.js
```

Transcoding to HLS (rather than fragmented MP4) lets the browser play arbitrary input
codecs — H.264, H.265/HEVC and AV1 sources are all transcoded to a broadly playable
H.264/AAC HLS stream. Subtitles are extracted/served separately, with an optional
synchronized-track mode on the frontend.

---

## VPN

The `torrent-transcode` service shares the VPN container's network namespace, so all of
its traffic goes through the tunnel.

```yaml
vpn:
  image: qmcgaw/gluetun
  cap_add: [NET_ADMIN]
  environment:
    VPN_SERVICE_PROVIDER: private internet access
    VPN_TYPE: openvpn
    OPENVPN_USER: ${PIA_USER}
    OPENVPN_PASSWORD: ${PIA_PASSWORD}
    SERVER_REGIONS: ${PIA_REGION:-france}

torrent-transcode:
  network_mode: "service:vpn"
  depends_on:
    vpn:
      condition: service_healthy
```


---

## Running it

Copy the example environment and fill in the secrets:

```bash
cp .env.example .env
# set JWT_SECRET (e.g. openssl rand -base64 32), TMDB_API_KEY, C411_API_KEY,
# PIA credentials, OAuth provider client IDs/secrets, and Brevo key for password-reset email
```

Then use the Makefile:

```bash
make up        # build & start postgres + api + vpn + torrent-transcode
make up-vpn    # same, enabling the VPN profile
make re        # wipe ./data, recreate the stack from scratch
make down      # stop and remove volumes
make logs      # follow all logs
```

The frontend container is not started by Compose; run it locally:

```bash
make frontend  # cd frontend && npm run dev  (http://localhost:4200)
```

PostgreSQL initializes its schema from `db/` only when its volume is first created.
After a schema change, recreate the database (`make down` removes volumes, or `make re`).

| Service | Port |
|---|---|
| `postgres` | 5432 |
| `api` | 8080 |
| `torrent-transcode` | 8081 (reached via the `vpn` container) |
| `frontend` (run locally) | 4200 |

### Useful dev commands

```bash
make api                   # run the api service directly (go run .)
make stream                # run the torrent service directly
make api-integration-test  # API integration tests
make tidy                  # go mod tidy across services
```

---

## Repository Structure

```
/
├── README.md
├── docker-compose.yml
├── Makefile
├── .env.example
├── db/                       # SQL migrations + dev/curated seeds (auto-loaded by postgres)
├── data/                     # shared volume: torrents/ and videos/ (git-ignored)
├── services/
│   ├── api/                  # Go REST API (chi)
│   │   ├── main.go
│   │   └── internal/
│   │       ├── auth/         # password + 42/GitHub/GitLab OAuth, JWT, refresh, reset
│   │       ├── movies/       # search + metadata; sources: archive.org/, c411/, tmdb/
│   │       ├── stream/       # serves HLS index + segments
│   │       ├── downloader/   # fetches .torrent files
│   │       ├── comments/ users/ email/ i18n/ models/ ...
│   │       └── README.md     # detailed auth request/response docs
│   └── torrent-transcode/    # Go: torrent download + ffmpeg HLS transcode + cleanup
│       └── internal/{torrent,transcode,cleanup}/
└── frontend/                 # Next.js app (src/app/[locale]/…), i18n: en / de / fr
```

---

## API

Base path: `/api/v1`. Most content routes are JWT-protected. Public routes: health,
movie listing/search, registration, login, refresh, password-reset, OAuth start/callback,
and the OAuth2 token endpoint. Detailed auth request/response examples live in
`services/api/README.md`.

```
GET    /health

POST   /auth/register
POST   /auth/login
POST   /auth/refresh-token
POST   /auth/password-reset/send-email
POST   /auth/password-reset/set-new-password
GET    /auth/42/login        GET /auth/42/callback
GET    /auth/github/login    GET /auth/github/callback
GET    /auth/gitlab/login    GET /auth/gitlab/callback
POST   /oauth/token
POST   /oauth/applications   GET /oauth/applications
PATCH  /oauth/applications/{id}
DELETE /oauth/applications/{id}

GET    /movies                       # default/curated list (public)
GET    /movies/featured              # public
GET    /movies/search                # public
GET    /movies/watched               # auth
GET    /movies/directstream          # auth
GET    /movies/{id}                  # auth
PATCH  /movies/{id}/progress         # auth — watch progress (percentage)
GET    /movies/{id}/torrents         # auth
GET    /movies/{id}/comments         # auth
POST   /movies/{id}/comments         # auth

GET    /comments        GET /comments/{id}
PATCH  /comments/{id}   DELETE /comments/{id}

GET    /users           GET /users/{id}
GET    /users/{id}/comments
GET    /users/{id}/movie-history
PATCH  /users/new-password
PATCH  /users/{id}

GET    /stream/{id}                  # init download + transcode
GET    /stream/{id}/index            # HLS playlist (stream.m3u8)
GET    /stream/{id}/{segment}        # HLS segment (.ts)
```

---

## Auth

- Registration: email, username, first name, last name, password (bcrypt)
- 42, GitHub and GitLab OAuth (when provider client credentials are configured);
  browser provider flows request fixed profile scopes: 42 `public`, GitHub
  `read:user user:email`, GitLab `read_user`
- JWT issued on login / OAuth callback, validated on every protected request, with refresh tokens
- User-managed OAuth applications and OAuth2 token endpoint at `POST /oauth/token`
  for registered `client_credentials` grants. Application `scope` is stored as a
  normalized whitespace-separated string; token requests may omit it to receive
  the app's full stored scope, or request a subset. Requested scopes outside the
  application scope are rejected with `invalid_scope`. Current JWT access tokens
  do not embed or enforce scopes on protected routes; they authenticate as the
  application owner user.
- Application scopes are optional free-form tokens, not a predefined permission
  catalogue. Enter them separated by spaces, for example
  `read:movies write:comments`; leaving the field empty is valid. The stored
  scope documents and constrains OAuth token requests, while API authorization
  continues to use the authenticated user model.
- Password reset by email via Brevo (when configured)

---

## Security

Eliminatory per the 42 subject — any breach scores zero:

- Passwords hashed (bcrypt)
- Parameterized queries (no SQL injection)
- Escaped output (no XSS)
- Form and input validation
- Credentials in `.env`, never committed
