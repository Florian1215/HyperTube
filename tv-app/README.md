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

## Sign in with a phone (backend to do)

The TV only shows a code and waits, the phone does the actual sign in on the website.

1. `POST /api/v1/auth/tv/` (no auth) creates a pending code.

   ```json
   {"code": "K7QM2XPA", "url": "https://hypertube.example/tv?code=K7QM2XPA", "expires_in": 300}
   ```

   `url` is what the QR code contains: a page of the website where the signed in user confirms the code
   (`/tv?code=...`, with a field to type the code when opened without it).
2. The website calls an authenticated endpoint (for example `POST /api/v1/auth/tv/<code>/approve/`) when the user confirms.
3. The TV polls `GET /api/v1/auth/tv/<code>/` every 3 seconds:

   ```json
   {"status": "pending"}
   {"status": "approved", "access": "<jwt>", "refresh": "<jwt>"}
   {"status": "expired"}
   ```

   The tokens are the same as `auth/login/`; once they are returned the code must not be usable anymore.

Until this exists, the TV generates the code itself, shows `<server>/tv?code=<code>` in the QR code and keeps polling,
so it signs in as soon as the backend answers.
