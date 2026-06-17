# Backend Auth Refactor Plan

Dieser Plan ist fuer einen Junior Developer geschrieben, der Go noch lernt. Arbeite ihn langsam und in kleinen Pull Requests ab. Das wichtigste Ziel ist: die Auth-Logik einfacher machen, ohne das Verhalten der API zu veraendern.

## Ziel

Die Auth-Logik im Backend soll weniger vermischt sein:

- HTTP-Handler sollen HTTP machen: Request lesen, validieren, Service aufrufen, Response schreiben.
- Wiederverwendbare Logik soll nur einmal existieren.
- OAuth-Provider-Code soll in kleinere Dateien aufgeteilt werden.
- Bestehende API-Routen, JSON-Responses, Status-Codes und JWTs sollen gleich bleiben.

## Strikte Grenzen

Diese Grenzen bitte nicht ueberschreiten:

- Nur Backend-Code anfassen.
- Erlaubte Codebereiche:
  - `services/api/**`
  - diese Plan-Datei im Repo-Root
- Nicht anfassen:
  - `frontend/**`
  - `verification/**`
  - `services/torrent-transcode/**`
  - `db/**`, ausser ein Senior sagt ausdruecklich, dass eine DB-Aenderung noetig ist
- Keine Routen aendern.
- Keine JSON-Feldnamen aendern.
- Keine HTTP-Status-Codes aendern.
- Keine JWT-Claims aendern.
- Keine Env-Var-Namen aendern.
- Keine neuen externen Dependencies einfuehren.

Wenn ein Test nach dem Refactor andere Response-Daten erwartet, ist das fast immer ein Fehler im Refactor, nicht im Test.

## Ist-Zustand

Wichtige Dateien:

- `services/api/internal/auth/handler.go`
  - Register/Login HTTP-Handler
  - Auth-Response-Typen
  - JSON-Decoding
  - Duplicate-User-Response-Mapping
- `services/api/internal/auth/oauth2.go`
  - `/oauth/token`
  - wiederholt viel Passwort-Login-Logik aus `Login`
- `services/api/internal/auth/password_reset.go`
  - Password-Reset Requests und Token-Handling
- `services/api/internal/auth/oauth.go`
  - 42, GitHub, GitLab OAuth-Clients
  - Browser-Login-Flow
  - Callback-Handling
  - State-Cookies
  - Redirect-Handling
- `services/api/internal/auth/store.go`
  - User-Erstellung fuer Passwort-User
  - OAuth-User-Erstellung
  - Password-Reset-Token-DB-Logik
- `services/api/internal/users/handler.go`
  - User-Update HTTP-Handler
  - dupliziert JSON-Decoding und Validierung aus `auth`

Die groessten Probleme:

- `auth/oauth.go` ist zu gross.
- Passwort-Login existiert mindestens zweimal.
- JSON-Decoding existiert in `auth` und `users`.
- Email-, Username-, Password- und Name-Validierung existiert in `auth` und `users`.
- Handler kennen zu viele Details.

## Arbeitsregeln

1. Immer nur eine Phase auf einmal machen.
2. Nach jeder Phase Tests laufen lassen.
3. Wenn Tests fehlschlagen, erst fixen, dann weitergehen.
4. Keine "kleinen Verbesserungen nebenbei" machen.
5. Bestehende Testnamen und Testfaelle moeglichst behalten.
6. Beim Verschieben von Code innerhalb desselben Go-Packages bleiben Funktionsnamen und Tests oft unveraendert.
7. Nach Go-Edits immer `gofmt` laufen lassen.
8. Alle Shell-Befehle in diesem Plan werden vom Repo-Root ausgefuehrt, ausser im Codeblock steht zuerst `cd services/api`. Wenn ein Codeblock mit `cd services/api` beginnt, gelten die folgenden Befehle in diesem Block relativ zu `services/api`.

## Test-Baseline

Vor der ersten Code-Aenderung:

```sh
git status --short
cd services/api
go test ./...
```

Falls lokal kein Go installiert ist, kann man mit Docker testen:

```sh
# vom Repo-Root ausfuehren
docker run --rm -v "$PWD/services/api:/app" -w /app golang:1.26-alpine sh -c "go test ./..."
```

Hinweis: Docker muss dafuer Module herunterladen koennen. Wenn das Netzwerk blockiert ist, lokal mit installiertem Go testen oder einen Senior fragen.

Es gibt Integrationstests ausserhalb von `auth` und `users`, die vom lokalen DB-Zustand abhaengen koennen. Wenn `go test ./...` nur wegen fehlender DB oder fehlender Seed-Daten in einem Movie-Integrationstest fehlschlaegt, keine Auth-Logik anpassen. Dann den Fehler notieren, die gezielten Auth/User-Tests laufen lassen und einen Senior fragen.

Nach jeder Phase mindestens:

```sh
cd services/api
go test . ./internal/auth ./internal/users
```

Vor dem Abschluss:

```sh
cd services/api
go test ./...
```

## Phase 1: Gemeinsames JSON-Decoding auslagern

### Ziel

`auth` und `users` sollen nicht mehr jeweils eigene JSON-Decoder-Funktionen haben.

### Neue Dateien

Erstelle:

- `services/api/internal/requestjson/json.go`
- `services/api/internal/requestjson/json_test.go`

Package-Name:

```go
package requestjson
```

### Inhalt von `requestjson`

Diese Konstante soll dort leben:

- `const maxJSONBodyBytes = 1 << 20`

Diese Funktionen sollen dort leben:

- `DecodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool`
- `DecodeJSONObject(w http.ResponseWriter, r *http.Request, allowedFields map[string]struct{}) (map[string]json.RawMessage, bool)`
- `DecodeString(raw json.RawMessage) (string, bool)`
- `IsNull(raw json.RawMessage) bool`

Keine neuen externen Dependencies verwenden. Erlaubt sind nur Standardbibliothek und bestehende interne Packages.

`DecodeJSON` ist fuer normale JSON-Structs.

`DecodeJSONObject` ist fuer Endpoints, die:

- Unknown Fields ablehnen
- pro Feld eigene Validation Errors bauen
- `json.RawMessage` brauchen, um `null` oder falsche Typen sauber zu erkennen

### Verhalten, das gleich bleiben muss

- Maximal 1 MiB Body.
- Malformed JSON gibt `BAD_REQUEST`.
- Mehrere JSON-Dokumente in einem Body geben `BAD_REQUEST`.
- Unknown Fields geben `BAD_REQUEST`.
- Falsche Feldtypen werden spaeter als Field Validation Error gemeldet.

### Umsetzungsschritte

1. Kopiere die Logik aus `auth/handler.go`:
   - `decodeJSON`
   - `decodeJSONObject`
2. Kopiere die passende Logik aus `users/handler.go`:
   - `decodeStringField`
   - `isJSONNull`
3. Passe die Namen fuer das neue Package an.
4. Lege in `requestjson/json.go` eine eigene Konstante an:

   ```go
   const maxJSONBodyBytes = 1 << 20
   ```

   Wichtig: Diese Konstante gehoert zum neuen Package. Nicht versuchen, `auth.maxJSONBodyBytes` oder `users.maxJSONBodyBytes` aus `requestjson` heraus zu verwenden. Das wuerde entweder nicht kompilieren oder einen Import-Zyklus erzeugen.
5. Importiere im neuen Package:
   - `bytes`
   - `encoding/json`
   - `io`
   - `net/http`
   - `hypertube/api/internal/i18n`
   - `hypertube/api/internal/respond`
6. Implementiere `DecodeString` bewusst ohne Feldnamen und ohne direkte Response-Logik:

   ```go
   func DecodeString(raw json.RawMessage) (string, bool) {
       if IsNull(raw) {
           return "", false
       }

       var value string
       if err := json.Unmarshal(raw, &value); err != nil {
           return "", false
       }
       return value, true
   }
   ```

   Der Caller setzt weiterhin die konkrete Field-Validation-Message. Beispiel fuer `auth`:

   ```go
   func decodeStringField(body map[string]json.RawMessage, field string, fields validationErrors) string {
       raw, ok := body[field]
       if !ok {
           return ""
       }
       value, ok := requestjson.DecodeString(raw)
       if !ok {
           fields[field] = i18n.MsgInvalidRequestBody
           return ""
       }
       return value
   }
   ```

   Beispiel fuer `users`:

   ```go
   value, ok := requestjson.DecodeString(raw)
   if !ok {
       fields["email"] = i18n.MsgInvalidRequestBody
       return updateUserParams{}, false
   }
   ```

   Wichtig: `null` und falsche JSON-Typen muessen weiterhin `MsgInvalidRequestBody` als Field Error erzeugen, nicht versehentlich `MsgEmailRequired`, `MsgPasswordRequired` oder andere Required-Fehler.
7. Schreibe Tests fuer:
   - valid JSON object
   - malformed JSON
   - unknown field
   - multiple JSON documents
   - string field ok
   - string field with `null`
   - string field with number
8. Ersetze in `auth/handler.go` die lokalen Decoder-Aufrufe durch `requestjson`.
9. Ersetze in `auth/password_reset.go` `decodeJSON` durch `requestjson.DecodeJSON`.
10. Ersetze in `users/handler.go` die lokalen Decoder-Aufrufe durch `requestjson`.
11. Loesche die alten lokalen Decoder-Funktionen, sobald nichts mehr sie nutzt.
12. Loesche lokale `maxJSONBodyBytes`-Konstanten nur dann, wenn sie in dem Package wirklich nicht mehr genutzt werden.
    - In `users` wird sie nach dieser Phase wahrscheinlich nicht mehr gebraucht.
    - In `auth` wird sie nach Phase 1 noch von `oauth2.go` genutzt und darf deshalb noch nicht geloescht werden.

### Typische Go-Fallen

- Wenn eine Funktion aus einem anderen Package genutzt wird, muss sie mit Grossbuchstaben beginnen.
  - Gut: `requestjson.DecodeJSON`
  - Nicht nutzbar von aussen: `requestjson.decodeJSON`
- `json.RawMessage` kommt aus `encoding/json`.
- `r.Body` kann nur einmal gelesen werden.
- Nach dem Loeschen alter Funktionen entstehen oft unused imports. Einfach entfernen.

### Checks

```sh
cd services/api
gofmt -w internal/requestjson internal/auth internal/users
go test . ./internal/requestjson ./internal/auth ./internal/users
```

Danach sollte diese Suche nur noch eine Implementierung finden:

```sh
# vom Repo-Root ausfuehren
rg "func DecodeJSONObject|func decodeJSONObject" services/api/internal
```

## Phase 2: Gemeinsame User-Input-Validierung auslagern

### Ziel

Email-, Username-, Password- und Name-Validierung soll nicht mehr in `auth` und `users` dupliziert sein.

### Neue Dateien

Erstelle:

- `services/api/internal/userinput/validation.go`
- `services/api/internal/userinput/validation_test.go`

Package-Name:

```go
package userinput
```

Keine neuen externen Dependencies verwenden. Erlaubt sind nur Standardbibliothek und bestehende interne Packages.

### Wichtige Regel

Nicht alle Passwort-Validierungen sind gleich. Bestehendes Verhalten muss erhalten bleiben.

Aktuell:

- Register und Reset Password:
  - leeres Passwort gibt `MsgPasswordRequired`
  - zu kurz gibt `MsgPasswordTooShort`
  - zu lang gibt `MsgPasswordTooLong`
- Login:
  - leeres Passwort gibt `MsgPasswordRequired`
  - zu lang gibt `MsgPasswordTooLong`
  - zu kurz wird nicht als Validation Error behandelt, sondern spaeter als invalid credentials
- User Update:
  - leeres Passwort gibt aktuell `MsgPasswordTooShort`
  - zu kurz gibt `MsgPasswordTooShort`
  - zu lang gibt `MsgPasswordTooLong`

Deshalb keine einzelne Funktion fuer alle Passwortfaelle bauen.

### Vorgeschlagene Funktionen

```go
func ValidateEmail(raw string) (string, i18n.Message, bool)
func NormalizeEmail(raw string) (string, bool)
func ValidateUsername(raw string) (string, i18n.Message, bool)
func ValidateLoginIdentifier(raw string) (string, i18n.Message, bool)
func ValidateRequiredPassword(password string) (i18n.Message, bool)
func ValidateLoginPassword(password string) (i18n.Message, bool)
func ValidateUpdatePassword(password string) (i18n.Message, bool)
func ValidateName(raw string, requiredMessage, tooLongMessage, invalidMessage i18n.Message) (string, i18n.Message, bool)
```

Konstanten ebenfalls hierher verschieben:

- `minPasswordBytes`
- `maxPasswordBytes`
- `minUsernameLength`
- `maxUsernameLength`
- `maxNameLength`

Die Konstanten koennen klein bleiben, solange kein anderes Package sie direkt braucht:

```go
const minPasswordBytes = 8
```

`auth/oauth2.go` soll nicht direkt auf `maxPasswordBytes` zugreifen. Es soll stattdessen `userinput.ValidateLoginPassword` verwenden.

### Umsetzungsschritte

1. Kopiere die Validierungslogik aus `auth/validation.go`.
2. Kopiere fehlende Logik aus `users/handler.go`, besonders `validateName`.
3. Passe Namen und Exporte an.
4. Schreibe Tests im neuen Package.
5. Passe `auth/validation.go` an:
   - Die Datei darf weiter existieren.
   - Sie soll nur noch Request-spezifische Funktionen enthalten:
     - `validateRegisterRequest`
     - `validateLoginRequest`
   - Diese Funktionen rufen `userinput` auf.
6. Passe `auth/password_reset.go` an:
   - Email mit `userinput.ValidateEmail`
   - Password mit `userinput.ValidateRequiredPassword`
7. Passe `auth/oauth2.go` an:
   - `maxPasswordBytes` darf nach dem Verschieben nicht mehr direkt genutzt werden.
   - Behalte den bestehenden Check `login == "" || req.Password == ""`, weil dieser fuer OAuth2 `MsgUsernamePasswordRequired` liefern muss.
   - Ersetze danach die Laengenpruefung durch `userinput.ValidateLoginPassword`.
   - Beispiel:

     ```go
     if validationMessage, ok := userinput.ValidateLoginPassword(req.Password); !ok {
         writeOAuthError(w, http.StatusBadRequest, "invalid_request", i18n.T(locale, validationMessage))
         return
     }
     ```

     Weil der Empty-Check davor bleibt, kann dieser Block im Normalfall nur noch `MsgPasswordTooLong` liefern. Das erhaelt das bisherige OAuth2-Verhalten.
8. Passe `auth/store.go` an:
   - `normalizeEmail` durch `userinput.NormalizeEmail` ersetzen.
9. Passe `users/handler.go` an:
   - lokale Validierungsfunktionen entfernen
   - `userinput.ValidateEmail`
   - `userinput.ValidateUsername`
   - `userinput.ValidateUpdatePassword`
   - `userinput.ValidateName`
10. Passe `users/store.go` nur an, wenn dort Validierung dupliziert ist. Aktuell wahrscheinlich nicht noetig.
11. Passe `auth/validation_test.go` an, weil dieser Test aktuell direkt auf `minPasswordBytes`, `maxPasswordBytes` und `maxNameLength` aus `package auth` zugreift.
    - Wenn diese Konstanten nach `userinput` verschoben werden und klein geschrieben bleiben, sind sie fuer `auth`-Tests nicht mehr sichtbar.
    - Nicht nur fuer Tests extra `userinput`-Konstanten exportieren.
    - Lege stattdessen im Test lokale Test-Konstanten an oder nutze klare Literale.
    - Empfohlene Variante oben in `auth/validation_test.go`:

      ```go
      const (
          testMinPasswordBytes = 8
          testMaxPasswordBytes = 72
          testMaxNameLength    = 100
      )
      ```

      Danach im Test ersetzen:

      ```go
      minPasswordBytes -> testMinPasswordBytes
      maxPasswordBytes -> testMaxPasswordBytes
      maxNameLength    -> testMaxNameLength
      ```

    - Das ist Test-Code. Er prueft weiterhin dasselbe Verhalten, ohne interne Konstanten aus `userinput` exportieren zu muessen.
12. Wenn `auth.maxJSONBodyBytes` nach der Umstellung von `oauth2.go` nicht mehr genutzt wird, darf die Konstante aus `auth/handler.go` entfernt werden. Vorher mit `rg "maxJSONBodyBytes" services/api/internal/auth` pruefen.

### Typische Go-Fallen

- Import-Zyklen vermeiden.
  - `userinput` darf nicht `auth` oder `users` importieren.
  - `userinput` darf `i18n` importieren.
- Regex-Variablen koennen im neuen Package bleiben.
- Gleiche Funktionsnamen in verschiedenen Packages sind erlaubt.
- Gleiche Funktionsnamen im selben Package sind nicht erlaubt.

### Checks

```sh
cd services/api
gofmt -w internal/userinput internal/auth internal/users
go test . ./internal/userinput ./internal/auth ./internal/users
```

Danach sollten diese Funktionen nur noch in `userinput` oder als kleine Request-spezifische Wrapper existieren:

```sh
# vom Repo-Root ausfuehren
rg "func validateEmail|func normalizeEmail|func validateUsername|func validatePassword|func validPersonName" services/api/internal
rg "func ValidateEmail|func ValidateUsername|func Validate.*Password|func ValidateName" services/api/internal/userinput
rg "minPasswordBytes|maxPasswordBytes|maxNameLength" services/api/internal/auth/*_test.go
```

Die letzte Suche darf noch Treffer zeigen, aber nur fuer lokale Test-Konstanten wie `testMinPasswordBytes`, `testMaxPasswordBytes` oder `testMaxNameLength`. Sie darf keine alten direkten Zugriffe auf entfernte `auth`-Konstanten mehr zeigen.

## Phase 3: Passwort-Login nur einmal implementieren

### Ziel

`POST /auth/login` und `POST /oauth/token` pruefen Passwort-User aktuell separat. Diese Pruefung soll nur einmal existieren.

### Neue Datei

Erstelle:

- `services/api/internal/auth/password_auth.go`

Package:

```go
package auth
```

### Neue private Error-Variable

In `password_auth.go`:

```go
var errInvalidCredentials = errors.New("invalid credentials")
```

Der Fehler bleibt klein geschrieben, weil er nur innerhalb von `package auth` fuer Handler-Mapping gebraucht wird. Keine neue exportierte Package-API einfuehren.

Falls es den Namen schon gibt, einen anderen klaren privaten Namen nutzen, z.B. `errInvalidPasswordCredentials`.

### Neue private Methode

```go
func (h *Handler) authenticatePassword(ctx context.Context, login string, password string) (models.User, error)
```

Diese Methode macht:

1. `h.store.FindUserByLogin(ctx, login)`
2. Wenn User nicht gefunden:
   - `errInvalidCredentials` zurueckgeben
3. Wenn DB-Fehler:
   - Originalfehler zurueckgeben
4. Wenn `user.PasswordHash == ""`:
   - `errInvalidCredentials`
5. Wenn `CheckPassword(user.PasswordHash, password)` false:
   - `errInvalidCredentials`
6. Sonst User zurueckgeben.

### Anpassung in `auth/handler.go`

In `Login`:

1. Request decodieren wie vorher.
2. Validieren wie vorher.
3. `h.authenticatePassword(...)` aufrufen.
4. `errInvalidCredentials` mit `errors.Is` auf `401 INVALID_CREDENTIALS` mappen.
5. Andere Fehler auf `500 INTERNAL_ERROR` mit `MsgFailedLoadUser` mappen.
6. Auth-Response schreiben wie vorher.

### Anpassung in `auth/oauth2.go`

In `oauthPasswordGrant`:

1. Request decodieren wie vorher.
2. Grant-Type-Checks behalten.
3. Login/Password-Checks behalten.
4. `h.authenticatePassword(...)` aufrufen.
5. `errInvalidCredentials` mit `errors.Is` auf OAuth2 Error mappen:
   - Status: `400`
   - Error: `invalid_grant`
   - Message: `MsgInvalidUsernamePassword`
6. Andere Fehler wie vorher mappen.

### Checks

```sh
cd services/api
gofmt -w internal/auth
go test . ./internal/auth
```

Besonders wichtig:

- `TestLogin...`
- `TestOAuthTokenPasswordGrant...`
- `TestOAuthTokenRejectsInvalidGrant`

## Phase 4: Token- und Auth-Response-Erstellung buendeln

### Ziel

Bearer-Token und `authResponse` sollen an einer Stelle gebaut werden.

Aktuell gibt es Token-Erstellung in:

- `writeAuthResponse`
- `writeOAuthSuccess`
- `oauthPasswordGrant`

### Neue Hilfsfunktionen

In `auth/handler.go` oder neuer Datei `auth/response.go`:

```go
func (h *Handler) issueAccessToken(userID int64) (string, int64, error)
```

Diese Funktion:

1. ruft `h.tokens.CreateAccessToken(userID)`
2. gibt Token und `int64(AccessTokenTTL.Seconds())` zurueck

Zusaetzlich:

```go
func (h *Handler) newAuthResponse(user models.User, oauthMethod *string) (authResponse, error)
```

Diese Funktion:

1. ruft `issueAccessToken`
2. baut `authResponse`
3. nutzt `toUserResponse(user, oauthMethod)`

### Umsetzungsschritte

1. `writeAuthResponse` nutzt `newAuthResponse`.
2. `writeOAuthSuccess` nutzt `newAuthResponse`.
3. `oauthPasswordGrant` nutzt `issueAccessToken` oder eine kleine Token-Hilfe.
4. Fehler-Mapping im jeweiligen Handler bleibt dort, weil normale API und OAuth2 unterschiedliche Error Shapes haben.

### Nicht tun

Nicht versuchen, normale API-Responses und OAuth2-Responses in eine gemeinsame Response-Funktion zu pressen. Die Response-Formate sind bewusst unterschiedlich.

### Checks

```sh
cd services/api
gofmt -w internal/auth
go test . ./internal/auth
```

## Phase 5: OAuth-Datei in kleinere Dateien teilen

### Ziel

`services/api/internal/auth/oauth.go` soll kleiner werden. Verhalten bleibt gleich.

### Wichtig

Das ist groesstenteils Copy-Paste-Verschieben innerhalb von `package auth`. Weil das Package gleich bleibt, muessen viele Funktionen nicht exportiert werden.

### Ziel-Dateien

Erstelle diese Dateien:

- `services/api/internal/auth/oauth_types.go`
- `services/api/internal/auth/oauth_42.go`
- `services/api/internal/auth/oauth_github.go`
- `services/api/internal/auth/oauth_gitlab.go`
- `services/api/internal/auth/oauth_browser.go`

Optional, wenn `oauth_browser.go` zu gross wird:

- `services/api/internal/auth/oauth_state.go`

### Was wohin kommt

#### `oauth_types.go`

Gemeinsame Typen und Helpers:

- `ErrOAuthNotConfigured`
- `oauthProvider`
- `OAuthIdentity`
- `limitedResponseBody`
- `firstNonEmpty`
- `splitDisplayName`

Provider-Konstanten koennen hierhin oder in die jeweilige Provider-Datei. Fuer Anfaenger ist es einfacher:

- 42-Konstanten in `oauth_42.go`
- GitHub-Konstanten in `oauth_github.go`
- GitLab-Konstanten in `oauth_gitlab.go`
- Cookie-Konstanten in `oauth_browser.go`

#### `oauth_42.go`

Alles fuer 42:

- `FortyTwoOAuthConfig`
- `FortyTwoOAuth`
- `NewFortyTwoOAuth`
- Methoden von `FortyTwoOAuth`
- `fortyTwoTokenResponse`
- `fortyTwoProfile`
- `fortyTwoProfileImage`
- `profileImageURL`

#### `oauth_github.go`

Alles fuer GitHub:

- `GitHubOAuthConfig`
- `GitHubOAuth`
- `NewGitHubOAuth`
- Methoden von `GitHubOAuth`
- `githubTokenResponse`
- `githubProfile`
- `githubEmail`
- `githubAPIRequest`
- `githubOAuthErrorMessage`

#### `oauth_gitlab.go`

Alles fuer GitLab:

- `GitLabOAuthConfig`
- `GitLabOAuth`
- `NewGitLabOAuth`
- Methoden von `GitLabOAuth`
- `gitlabTokenResponse`
- `gitlabProfile`
- `gitlabOAuthErrorMessage`

#### `oauth_browser.go`

Browser-Flow:

- `LoginFortyTwo`
- `CallbackFortyTwo`
- `LoginGitHub`
- `CallbackGitHub`
- `LoginGitLab`
- `CallbackGitLab`
- `loginOAuth`
- `callbackOAuth`
- `writeOAuthSuccess`
- `redirectOAuthError`
- Cookie- und Redirect-Helfer, falls keine extra `oauth_state.go` genutzt wird

#### Optional `oauth_state.go`

Wenn du es noch klarer machen willst:

- `validOAuthState`
- `clearOAuthState`
- `oauthStateCookie`
- `oauthLocaleCookie`
- `oauthRedirectCookie`
- `oauthRedirectFromRequest`
- `oauthRedirectFromCookie`
- `validOAuthRedirectPath`
- `oauthLocaleFromRequest`
- `oauthLocaleCookieName`
- `oauthRedirectCookieName`
- `isSecureRequest`
- `newOAuthState`

### Vorgehen

1. Neue Datei anlegen.
2. Einen zusammenhaengenden Block aus `oauth.go` verschieben.
3. Imports in neuer Datei setzen.
4. Imports in `oauth.go` reduzieren.
5. `gofmt` laufen lassen.
6. Tests laufen lassen.
7. Naechsten Block verschieben.

Nicht alles auf einmal verschieben.

### Checks

Nach jedem verschobenen Block:

```sh
cd services/api
gofmt -w internal/auth
go test . ./internal/auth
```

Am Ende sollte `oauth.go` entweder geloescht oder nur noch sehr wenig enthalten. Wenn `oauth.go` geloescht wird, darauf achten, dass keine Tests oder Build-Dateien direkt den Dateinamen referenzieren. In Go ist der Dateiname fast nie wichtig, das Package ist wichtig.

## Phase 6: Password Reset nachkontrollieren

### Ziel

`password_reset.go` wurde bereits in Phase 1 und 2 teilweise umgestellt. Diese Phase ist keine zweite Umsetzung derselben Arbeit, sondern eine kurze Nachkontrolle: Es sollen keine alten Decoder- oder Validierungsreste uebrig bleiben.

### Kontrolle

Pruefe in `services/api/internal/auth/password_reset.go`:

1. `decodeJSON` wird nicht mehr genutzt.
2. `requestjson.DecodeJSON` wird genutzt.
3. Email wird mit `userinput.ValidateEmail` validiert.
4. Neues Passwort wird mit `userinput.ValidateRequiredPassword` validiert.
5. Token-Generierung (`newPasswordResetToken`, `passwordResetTokenHash`) bleibt in der Datei. Sie ist dort fachlich passend.
6. `buildPasswordResetURL` bleibt in der Datei. Auch das ist fachlich passend.

### Nicht tun

- Kein neues DB-Schema.
- Kein anderes Tokenformat.
- Kein anderes Verhalten fuer unbekannte Emails. Unbekannte Emails muessen weiterhin `202 Accepted` bekommen, damit kein Account-Leak entsteht.

### Checks

```sh
cd services/api
gofmt -w internal/auth
go test . ./internal/auth
```

Besonders wichtig:

- `password_reset_test.go`

## Phase 7: Store-Konsolidierung nur als spaeterer Schritt

### Ziel

`auth/store.go` und `users/store.go` arbeiten beide mit User-Daten. Langfristig koennte ein gemeinsames User-Repository sinnvoll sein.

### Empfehlung

Diese Phase nicht direkt am Anfang machen. Erst Phase 1 bis 6 abschliessen.

Warum:

- Store-Aenderungen haben mehr Risiko.
- DB-Fehler-Mapping ist empfindlich.
- OAuth-User-Erstellung hat Speziallogik.
- User-Update hat Speziallogik.

### Moeglicher spaeterer Ansatz

Wenn Phase 1 bis 6 stabil sind:

1. Gemeinsame Error-Typen pruefen:
   - `ErrUserNotFound`
   - `ErrDuplicateUser`
   - Duplicate field extraction
2. Gemeinsame Scan-Funktion pruefen:
   - `scanUser`
3. Erst dann ueberlegen, ob `auth.Store` und `users.Store` zusammengefuehrt werden.

### Nicht tun

- Nicht in derselben PR wie Handler-Refactor.
- Nicht ohne komplette `go test ./...`.
- Nicht ohne Review.

## Abschluss-Checkliste

Vor dem finalen Review:

```sh
git status --short
cd services/api
gofmt -w internal/auth internal/users internal/requestjson internal/userinput
go test ./...
```

Zusaetzliche Suchen:

```sh
# vom Repo-Root ausfuehren
rg "func decodeJSONObject|func DecodeJSONObject" services/api/internal
rg "func validateEmail|func ValidateEmail" services/api/internal
rg "CreateAccessToken" services/api/internal/auth -g "*.go" -g "!*_test.go"
```

Erwartung:

- JSON-Decoding ist zentral in `requestjson`.
- Basis-Validierung ist zentral in `userinput`.
- Passwort-Authentifizierung existiert nur einmal.
- Token-Erstellung ist gebuendelt.
- `CreateAccessToken` wird ausserhalb von `jwt.go` nur noch in der gebuendelten Token-/Response-Hilfe direkt aufgerufen.
- OAuth-Code ist auf mehrere kleinere Dateien verteilt.

## Definition of Done

Der Refactor ist fertig, wenn:

- `go test ./...` in `services/api` erfolgreich ist.
- Kein Frontend-Code geaendert wurde.
- Keine DB-Migration geaendert wurde.
- API-Dokumentation nur dann geaendert wurde, wenn sie vorher falsch war.
- Bestehende Auth-Tests weiterhin dieselben fachlichen Erwartungen pruefen.
- `auth/oauth.go` nicht mehr die zentrale Sammeldatei fuer alles ist.
- `auth` und `users` keine grossen Kopien derselben Validierungs- und Decoder-Funktionen mehr enthalten.

## Kleine Go-Hilfe

### Packages

Jede Datei beginnt mit einem Package-Namen:

```go
package auth
```

Alle Dateien im selben Ordner muessen dasselbe Package haben.

### Exportierte Namen

Grossbuchstaben bedeuten: andere Packages duerfen es nutzen.

```go
func DecodeJSON(...) bool
```

Kleinbuchstaben bedeuten: nur dasselbe Package darf es nutzen.

```go
func decodeJSON(...) bool
```

### Imports

Wenn Go sagt:

```text
imported and not used
```

dann den Import entfernen. Go erlaubt keine ungenutzten Imports.

### Fehler vergleichen

Wenn ein Fehler gewrappt sein kann, immer `errors.Is` nutzen:

```go
if errors.Is(err, ErrUserNotFound) {
    // ...
}
```

Nicht so:

```go
if err == ErrUserNotFound {
    // ...
}
```

### gofmt

Go-Code immer formatieren:

```sh
gofmt -w services/api/internal/auth
```

Oder fuer mehrere Ordner:

```sh
gofmt -w services/api/internal/auth services/api/internal/users
```

## Empfohlene PR-Aufteilung

PR 1:

- `requestjson` einfuehren
- `auth` und `users` darauf umstellen

PR 2:

- `userinput` einfuehren
- Validierung in `auth` und `users` darauf umstellen

PR 3:

- Passwort-Login zentralisieren
- Token/Auth-Response-Erstellung buendeln

PR 4:

- `oauth.go` in kleinere Dateien aufteilen

PR 5, optional:

- Password Reset nachkontrollieren, falls nach PR 1 und 2 noch Reste uebrig sind

PR 6, nur nach Absprache:

- Store-Konsolidierung pruefen
