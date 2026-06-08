# Backend Test Rework Plan

## Ziel

Die Backend-Tests sollen uebersichtlicher, stabiler und naeher am aktuellen
API-Verhalten werden. Der Umbau konzentriert sich auf Tests, die ohne externe
Movie-Provider, Streaming-Pipeline oder Transcoding sinnvoll ueberarbeitet
werden koennen.

## Nicht Im Scope

Diese Bereiche werden bei diesem Test-Umbau nicht angefasst:

- Movie-Tests und Movie-Code:
  - `services/api/internal/movies`
  - `services/api/internal/movies/archive.org`
  - `services/api/internal/movies/c411`
  - `services/api/internal/movies/tmdb`
- Stream-Tests und Stream-Code:
  - `services/api/internal/stream`
- Transcode-Tests und Transcode-Code:
  - `services/torrent-transcode`

Das bedeutet auch: keine neuen Tests fuer Archive.org, C411, TMDB, Movie Search,
Movie Details, HLS Stream-Routen, Torrent-Download oder ffmpeg-Transcoding.

## Im Scope

Der Umbau betrifft nur diese Backend-Testbereiche:

- Auth:
  - Register
  - Login
  - JWT
  - Auth-Middleware
  - OAuth-Browser-Flows
  - OAuth2 Password Grant
  - Password Reset
- Comments:
  - Ownership
  - Create, List, Get, Update, Delete
  - Fehlerfaelle und Response-Envelopes
- i18n/respond:
  - Accept-Language-Auswahl
  - uebersetzte Fehlermeldungen
  - Error- und Validation-Envelopes
- Router-Grenzen:
  - Public Auth-Routen
  - Protected Auth-Grenzen
  - OAuth-Aliase
  - keine fachliche Movie- oder Stream-Handler-Logik
- Shell/API-Contract-Tests nur dort, wo sie Auth, Password Reset oder Comments
  pruefen.

## Phase 1: Baseline Und Teststruktur

1. Go-Testumgebung fuer `services/api` sicherstellen.
2. Aktuellen Zustand mit `cd services/api && go test ./...` festhalten.
3. Tests nach Klassen markieren oder dokumentieren:
   - schnelle Unit-Tests
   - HTTP-Handler-Tests ohne echte DB
   - Router-/Contract-Tests
   - externe Acceptance-Tests unter `verification/tests`
4. Sicherstellen, dass der normale Backend-Testlauf keine DB, kein Netzwerk,
   keine Movie-Provider, kein ffmpeg und keine `/data`-Mounts braucht.

## Phase 2: Gemeinsame Test-Helfer

Wiederholte Testlogik soll gebuendelt werden, ohne produktiven Code unnoetig
umzubauen.

Moegliche Helfer:

- Test-JWT und TokenManager
- Authenticated request wrapper
- JSON envelope decoder
- Error-Code assertions
- Field-validation assertions
- Accept-Language request helpers

Kandidaten fuer Dopplung:

- `newTestTokenManager`
- `serveWithUser`
- `decodeErrorEnvelope`
- `decodeAuthEnvelope`
- Router error decoder

## Phase 3: Auth-Tests Ueberarbeiten

Auth ist der wichtigste Bereich fuer den Umbau.

Aufgaben:

- `handler_test.go` fachlich besser aufteilen:
  - Register/Login
  - OAuth2 token endpoint
  - Browser-OAuth callbacks
  - Password reset
- Happy paths kurz und stabil halten.
- Fehlerfaelle table-driven testen.
- Response-Formate konsequent pruefen:
  - Statuscode
  - Error-Code
  - Field errors
  - Token-Typ und `expires_in`
- Sicherstellen, dass JSON-Validation weiterhin abdeckt:
  - malformed JSON
  - unknown fields
  - multiple JSON documents
  - zu grosse Bodies
- OAuth-State-Tests erhalten und klarer benennen:
  - state cookie gesetzt
  - invalid state rejected
  - provider error handled
  - unconfigured provider returns safe error

## Phase 4: Middleware Und JWT

Die Auth-Grenze soll explizit und schnell testbar bleiben.

Aufgaben:

- Missing token -> `401 UNAUTHORIZED`
- Invalid bearer token -> `401 UNAUTHORIZED`
- Expired token -> `401 TOKEN_EXPIRED`
- Valid token setzt `user_id` im Context
- Bearer-Scheme bleibt case-insensitive
- Non-positive User IDs werden abgelehnt
- Wrong issuer wird abgelehnt

Diese Tests bleiben reine Unit-/Middleware-Tests ohne Router- oder DB-Abhaengigkeit.

## Phase 5: Comments-Tests Ergaenzen

Comments sind im Scope, weil sie Ownership und Auth-Kontext direkt pruefen.

Aufgaben:

- Vorhandene Update/Delete-Ownership-Tests behalten und vereinheitlichen.
- Fehlende Handler-Faelle ergaenzen:
  - Create nutzt authentifizierten User
  - List gibt erwartetes Envelope zurueck
  - Get behandelt Not Found sauber
  - Update invalid body
  - Delete not owned
- Sicherstellen, dass clientseitig gesendete `user_id` niemals gewinnt.
- Store-Fakes lokal im Comments-Package behalten oder minimal vereinheitlichen.

## Phase 6: i18n Und respond

Die Response-Konventionen sollen direkt getestet werden, statt nur indirekt
ueber grosse Handler-Tests.

Aufgaben:

- `Accept-Language` Parsing fuer `en`, `fr`, `de` und Fallbacks pruefen.
- Query-/Header-Prioritaet nur dort testen, wo sie fuer Auth/Comments relevant
  ist.
- Error envelope testen:
  - `{ "error": { "code": "...", "message": "..." } }`
- Validation envelope testen:
  - `{ "error": { "code": "VALIDATION_ERROR", "fields": ... } }`
- List/Data envelope testen, sofern ohne Movie-Kontext moeglich.

## Phase 7: Router-Tests Aktualisieren

Router-Tests sollen nur Routing- und Auth-Grenzen dokumentieren.

Aufgaben:

- Public Routen pruefen:
  - `/api/v1/health`
  - `/api/v1/auth/login`
  - `/api/v1/auth/register`
  - `/api/v1/auth/password-reset`
  - `/api/v1/auth/reset-password`
  - `/api/v1/oauth/token`
  - OAuth login/callback aliases
- Protected Routen nur als Auth-Grenze pruefen:
  - ohne Token -> `401`
  - mit invalidem Token -> `401`
  - mit gueltigem Token erreicht der Router den Handler
- Keine Movie-Fachlogik pruefen.
- Keine Stream-Fachlogik pruefen.
- Alte Dev-Auth-Bypass-Erwartungen entfernen, falls sie nicht mehr zum
  aktuellen Router passen.

## Phase 8: Shell/API-Tests Begrenzen

Acceptance-Tests unter `verification/tests` bleiben nuetzlich, sollen aber nicht
den Go-Test-Umbau verwischen.

Im Scope:

- Auth Contract
- OAuth Token
- Password Reset
- Comments-bezogene Auth-/Ownership-Flows

Nicht im Scope:

- Movie Search
- Featured Movies
- Movie Details
- Provider-Fallbacks
- Stream/Transcode-Flows

## Akzeptanzkriterien

- `services/api` hat einen schnellen Default-Testlauf ohne externe Dienste.
- Auth-, Middleware-, JWT-, Password-Reset-, Comments-, i18n- und
  Response-Tests sind klarer getrennt.
- Router-Tests spiegeln den aktuellen Auth-Stand wider.
- Keine Tests oder Implementierungen in Movie-, Stream- oder Transcode-Bereichen
  wurden im Rahmen dieses Umbaus geaendert.
- Die relevanten Shell/API-Tests sind weiterhin als Acceptance-Layer nutzbar.

## Vorgeschlagene Reihenfolge

1. Baseline herstellen und aktuelle Fehlschlaege dokumentieren.
2. Gemeinsame Test-Helfer einfuehren.
3. JWT/Middleware-Tests straffen.
4. Auth-Handler-Tests aufteilen und bereinigen.
5. Password-Reset-Tests vereinheitlichen.
6. Comments-Tests ergaenzen.
7. i18n/respond-Tests absichern.
8. Router-Tests auf echte Auth-Grenzen aktualisieren.
9. Shell/API-Tests nur fuer den erlaubten Scope nachziehen.
