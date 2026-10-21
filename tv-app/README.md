# HyperTube TV

Android TV app of HyperTube, native Kotlin + Jetpack Compose for TV (`androidx.tv:tv-material`).

## Run

1. Open `tv-app/` in Android Studio (it downloads Gradle 8.11.1 from `gradle/wrapper/gradle-wrapper.properties`).
   To build from the command line, generate the wrapper once with `gradle wrapper --gradle-version 8.11.1`, then `./gradlew installDebug`.
2. Start an Android TV emulator (Device Manager > Television) or connect a TV with `adb connect <ip>`.
3. Start HyperTube (`make` at the root of the repo) and run the `app` configuration.

The server the app talks to is set in `gradle.properties`:

```properties
# 10.0.2.2 is the host machine seen from the emulator, use the LAN IP for a real TV
hypertube.serverUrl=http://10.0.2.2:8080
```

It can also be overridden for one build: `./gradlew installDebug -Phypertube.serverUrl=http://192.168.1.30:8080`.

## Release

The release talks to the production, `https://hypertube.bajeanno.com` (fixed in `app/build.gradle.kts`), over https only.
It is minified with R8 and signed with the key given in `keystore.properties` at the root of `tv-app/` (not committed):

```properties
storeFile=hypertube-release.jks
storePassword=...
keyAlias=hypertube
keyPassword=...
```

Create the key once, then keep it (an update of the app must be signed with the same key):

```sh
keytool -genkeypair -v -keystore hypertube-release.jks -alias hypertube -keyalg RSA -keysize 4096 -validity 10000
./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

Without `keystore.properties` the build gives an unsigned `app-release-unsigned.apk`, which cannot be installed.
Increase `versionCode` in `app/build.gradle.kts` for each new version.

## Screens

| Website | TV app |
| --- | --- |
| `src/app/page.tsx` | `ui/home/HomeScreen.kt`: hero of the featured medias (auto slide every 6 s, the whole hero is focusable: OK opens the media, left/right change the slide), friends activity (stacks of episodes, the focused one comes to the front), continue watching, featured, popular, top rated, coming soon, direct streaming |
| `src/app/search/page.tsx` | `ui/search/SearchScreen.kt`: movies / series / people / users (3 big cards per line), the "see all" lists of the home page, follow users, infinite scroll |
| `src/app/[type]/[id]/page.tsx` | `ui/details/MediaScreen.kt`: watch / resume (best source chosen automatically), watchlist, feature, torrent request, information, watched by, seasons and episodes, collection |
| `src/components/ui/VideoPlayer.tsx` | `ui/player/VideoPlayer.kt` (Media3 ExoPlayer, HLS): resume, progress saved like the website, audio tracks and subtitles from `tracks.json`, next episode (downloaded as soon as the button shows up, played at the end) |
| Sign in modal | `ui/auth/LoginScreen.kt`: QR code to sign in with a phone |

The right click menu of the website (watchlist, watched / not watched, clear progress, feature) is opened with a **long press on OK**, on any media card, season or episode.

Left out to keep the TV app simple: comments, sorting the search results, the credits modal, the manual source selection.

## Remote

| Key | Player |
| --- | --- |
| OK / Play-Pause | Play / pause |
| Left / Right | -10 s / +10 s (also on the progress bar when the controls are shown) |
| Up / Down | Show the controls |
| Back | Hide the controls, then close the player |

## Sign in with a phone

The TV only shows a QR code and waits, the phone does the actual sign in on the website (`src/app/tv/page.tsx`).

1. `POST /api/v1/auth/tv/` (no auth) creates a pending code: `{"code": "K7QM2XPA", "url": "http://<host>/tv?code=K7QM2XPA"}`.
   `url` is what the QR code contains, built from the host the TV used to reach the API.
2. On `/tv`, the signed in user confirms the code: `POST /api/v1/auth/tv/<code>/approve/` (authenticated).
3. The TV polls `GET /api/v1/auth/tv/<code>/` every 3 seconds: `{"status": "pending"}`,
   then `{"status": "approved", "access": "<jwt>", "refresh": "<jwt>"}` once (the code is deleted), or `{"status": "expired"}`.

The code does not expire while the TV polls it; a code not polled for 2 minutes is forgotten and the TV silently asks for a new one.
Backend: `users/tv_login.py` and the `TvLogin` model (migration `users/0008_tvlogin`).

## Cast from the website

While the TV app is open in the foreground with an account, the media page of the website signed in with the same account
shows a "Watch on TV" button. It opens the media on the TV and starts the playback, of the episode shown on the page for a series.

1. The TV polls `GET /api/v1/tv/poll/?device=<id>` (authenticated) every 3 seconds, `<id>` is a UUID kept in the TV preferences.
   It answers `{"cast": null}`, or `{"cast": {"type": "series", "id": "1399", "season": 2, "episode": 3}}` once after a cast.
   The device belongs to the account used for its last poll, so switching account on the TV moves it.
2. The website polls `GET /api/v1/tv/` every 10 seconds: `{"online": true}` while a TV of the user polled in the last 15 seconds.
3. The button sends `POST /api/v1/tv/cast/` with `{"type", "id", "season"?, "episode"?}`, 404 when no TV is online.

Backend: `users/tv_cast.py` and the `TvDevice` model (migration `users/0009_tvdevice`).
