package auth

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

func TestOAuthTokenPasswordGrantReturnsBearerToken(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	handler := NewHandler(store, tokens)
	user := createPasswordUser(t, store, "alice@example.com", "alice_1", "correct-horse-battery")

	form := url.Values{}
	form.Set("grant_type", "password")
	form.Set("username", "alice_1")
	form.Set("password", "correct-horse-battery")
	req := httptest.NewRequest(http.MethodPost, "/api/v1/oauth/token", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rec := httptest.NewRecorder()

	handler.OAuthToken(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var response oauthTokenResponse
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if response.AccessToken == "" {
		t.Fatal("expected access token")
	}
	if response.TokenType != "Bearer" {
		t.Fatalf("expected Bearer token type, got %q", response.TokenType)
	}
	if response.ExpiresIn != int64(AccessTokenTTL.Seconds()) {
		t.Fatalf("expected expires_in %d, got %d", int64(AccessTokenTTL.Seconds()), response.ExpiresIn)
	}
	claims, err := tokens.ValidateAccessToken(response.AccessToken)
	if err != nil {
		t.Fatalf("token should validate: %v", err)
	}
	if claims.UserID != user.ID {
		t.Fatalf("expected token user id %d, got %d", user.ID, claims.UserID)
	}
}

func TestOAuthTokenPasswordGrantAcceptsEmailLogin(t *testing.T) {
	store := newMemoryUserStore()
	handler := NewHandler(store, newTestTokenManager(t))
	createPasswordUser(t, store, "alice@example.com", "alice_1", "correct-horse-battery")

	body := `{"grant_type":"password","username":"Alice@Example.COM","password":"correct-horse-battery"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/oauth/token", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler.OAuthToken(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestOAuthTokenClientCredentialsGrantReturnsBearerTokenFromForm(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	handler := NewHandler(store, tokens)
	createStoredOAuthApplication(t, store, 42, "API Client", "read:movies", "hypertube-api", "replace-with-secret")

	form := validOAuthClientCredentialsForm()
	form.Set("client_id", " hypertube-api ")
	rec := postOAuthTokenForm(t, handler, form)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	response := decodeOAuthTokenResponse(t, rec)
	if response.AccessToken == "" {
		t.Fatal("expected access token")
	}
	if response.TokenType != "Bearer" {
		t.Fatalf("expected Bearer token type, got %q", response.TokenType)
	}
	if response.ExpiresIn != int64(AccessTokenTTL.Seconds()) {
		t.Fatalf("expected expires_in %d, got %d", int64(AccessTokenTTL.Seconds()), response.ExpiresIn)
	}
	claims, err := tokens.ValidateAccessToken(response.AccessToken)
	if err != nil {
		t.Fatalf("token should validate: %v", err)
	}
	if claims.UserID != 42 {
		t.Fatalf("expected token user id 42, got %d", claims.UserID)
	}
	if response.Scope != "read:movies" {
		t.Fatalf("expected application scope, got %q", response.Scope)
	}
}

func TestOAuthTokenClientCredentialsGrantAcceptsJSON(t *testing.T) {
	store := newMemoryUserStore()
	handler := NewHandler(store, newTestTokenManager(t))
	createStoredOAuthApplication(t, store, 42, "API Client", "", "hypertube-api", "replace-with-secret")

	body := `{"grant_type":"client_credentials","client_id":"hypertube-api","client_secret":"replace-with-secret"}`
	rec := postOAuthTokenJSON(t, handler, body)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	response := decodeOAuthTokenResponse(t, rec)
	if response.AccessToken == "" {
		t.Fatal("expected access token")
	}
}

func TestOAuthTokenClientCredentialsGrantAcceptsJSONWithoutGrantType(t *testing.T) {
	store := newMemoryUserStore()
	handler := NewHandler(store, newTestTokenManager(t))
	createStoredOAuthApplication(t, store, 42, "API Client", "", "hypertube-api", "replace-with-secret")

	body := `{"client_id":"hypertube-api","client_secret":"replace-with-secret"}`
	rec := postOAuthTokenJSON(t, handler, body)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	response := decodeOAuthTokenResponse(t, rec)
	if response.AccessToken == "" {
		t.Fatal("expected access token")
	}
}

func TestOAuthTokenClientCredentialsGrantScopeRules(t *testing.T) {
	store := newMemoryUserStore()
	handler := NewHandler(store, newTestTokenManager(t))
	createStoredOAuthApplication(t, store, 42, "API Client", "read:movies write:comments", "hypertube-api", "replace-with-secret")

	form := validOAuthClientCredentialsForm()
	rec := postOAuthTokenForm(t, handler, form)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	response := decodeOAuthTokenResponse(t, rec)
	if response.Scope != "read:movies write:comments" {
		t.Fatalf("expected application scope, got %q", response.Scope)
	}

	form = validOAuthClientCredentialsForm()
	form.Set("scope", "write:comments   read:movies")
	rec = postOAuthTokenForm(t, handler, form)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	response = decodeOAuthTokenResponse(t, rec)
	if response.Scope != "write:comments read:movies" {
		t.Fatalf("expected normalized requested scope, got %q", response.Scope)
	}

	form = validOAuthClientCredentialsForm()
	form.Set("scope", "admin")
	rec = postOAuthTokenForm(t, handler, form)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	errorResponse := decodeOAuthTokenError(t, rec)
	if errorResponse.Error != "invalid_scope" {
		t.Fatalf("expected invalid_scope, got %q", errorResponse.Error)
	}
}

func TestOAuthTokenClientCredentialsGrantRejectsInvalidRequest(t *testing.T) {
	tests := []struct {
		name       string
		mutateForm func(url.Values)
		wantStatus int
		wantError  string
	}{
		{
			name: "missing client id",
			mutateForm: func(form url.Values) {
				form.Del("client_id")
			},
			wantStatus: http.StatusBadRequest,
			wantError:  "invalid_request",
		},
		{
			name: "missing client secret",
			mutateForm: func(form url.Values) {
				form.Del("client_secret")
			},
			wantStatus: http.StatusBadRequest,
			wantError:  "invalid_request",
		},
		{
			name: "wrong client id",
			mutateForm: func(form url.Values) {
				form.Set("client_id", "other-client")
			},
			wantStatus: http.StatusUnauthorized,
			wantError:  "invalid_client",
		},
		{
			name: "wrong client secret",
			mutateForm: func(form url.Values) {
				form.Set("client_secret", "wrong-secret")
			},
			wantStatus: http.StatusUnauthorized,
			wantError:  "invalid_client",
		},
		{
			name: "secret with surrounding whitespace",
			mutateForm: func(form url.Values) {
				form.Set("client_secret", " replace-with-secret ")
			},
			wantStatus: http.StatusUnauthorized,
			wantError:  "invalid_client",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := newMemoryUserStore()
			handler := NewHandler(store, newTestTokenManager(t))
			createStoredOAuthApplication(t, store, 42, "API Client", "", "hypertube-api", "replace-with-secret")
			form := validOAuthClientCredentialsForm()
			tt.mutateForm(form)

			rec := postOAuthTokenForm(t, handler, form)

			if rec.Code != tt.wantStatus {
				t.Fatalf("expected %d, got %d: %s", tt.wantStatus, rec.Code, rec.Body.String())
			}
			response := decodeOAuthTokenError(t, rec)
			if response.Error != tt.wantError {
				t.Fatalf("expected error %q, got %q", tt.wantError, response.Error)
			}
		})
	}
}

func TestOAuthTokenClientCredentialsGrantRejectsNilStore(t *testing.T) {
	handler := NewHandler(nil, newTestTokenManager(t))

	rec := postOAuthTokenForm(t, handler, validOAuthClientCredentialsForm())

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d: %s", rec.Code, rec.Body.String())
	}
	response := decodeOAuthTokenError(t, rec)
	if response.Error != "server_error" {
		t.Fatalf("expected server_error, got %q", response.Error)
	}
}

func TestOAuthTokenClientCredentialsGrantRejectsNilTokenManager(t *testing.T) {
	store := newMemoryUserStore()
	handler := NewHandler(store, nil)
	createStoredOAuthApplication(t, store, 42, "API Client", "", "hypertube-api", "replace-with-secret")

	rec := postOAuthTokenForm(t, handler, validOAuthClientCredentialsForm())

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d: %s", rec.Code, rec.Body.String())
	}
	response := decodeOAuthTokenError(t, rec)
	if response.Error != "server_error" {
		t.Fatalf("expected server_error, got %q", response.Error)
	}
}

func TestOAuthTokenRejectsInvalidGrant(t *testing.T) {
	store := newMemoryUserStore()
	handler := NewHandler(store, newTestTokenManager(t))
	createPasswordUser(t, store, "alice@example.com", "alice_1", "right-password")

	tests := []struct {
		name      string
		form      url.Values
		wantError string
	}{
		{
			name: "missing grant type",
			form: url.Values{
				"username": {"alice_1"},
				"password": {"right-password"},
			},
			wantError: "invalid_request",
		},
		{
			name: "unsupported grant type",
			form: url.Values{
				"grant_type": {"authorization_code"},
			},
			wantError: "unsupported_grant_type",
		},
		{
			name: "wrong password",
			form: url.Values{
				"grant_type": {"password"},
				"username":   {"alice_1"},
				"password":   {"wrong-password"},
			},
			wantError: "invalid_grant",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/v1/oauth/token", strings.NewReader(tt.form.Encode()))
			req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
			rec := httptest.NewRecorder()

			handler.OAuthToken(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
			}
			var response oauthErrorResponse
			if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
				t.Fatalf("decode response: %v", err)
			}
			if response.Error != tt.wantError {
				t.Fatalf("expected error %q, got %q", tt.wantError, response.Error)
			}
		})
	}
}

func TestOAuthTokenErrorUsesAcceptLanguage(t *testing.T) {
	handler := NewHandler(newMemoryUserStore(), newTestTokenManager(t))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/oauth/token", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept-Language", "fr")
	rec := httptest.NewRecorder()

	handler.OAuthToken(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	var response oauthErrorResponse
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if response.Error != "invalid_request" {
		t.Fatalf("expected invalid_request, got %q", response.Error)
	}
	if response.ErrorDescription != "Type de grant requis" {
		t.Fatalf("expected French OAuth error description, got %q", response.ErrorDescription)
	}
}

func validOAuthClientCredentialsForm() url.Values {
	form := url.Values{}
	form.Set("grant_type", "client_credentials")
	form.Set("client_id", "hypertube-api")
	form.Set("client_secret", "replace-with-secret")
	return form
}

func postOAuthTokenForm(t *testing.T, handler *Handler, form url.Values) *httptest.ResponseRecorder {
	t.Helper()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/oauth/token", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rec := httptest.NewRecorder()

	handler.OAuthToken(rec, req)
	return rec
}

func postOAuthTokenJSON(t *testing.T, handler *Handler, body string) *httptest.ResponseRecorder {
	t.Helper()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/oauth/token", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler.OAuthToken(rec, req)
	return rec
}

func decodeOAuthTokenResponse(t *testing.T, rec *httptest.ResponseRecorder) oauthTokenResponse {
	t.Helper()

	var response oauthTokenResponse
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return response
}

func decodeOAuthTokenError(t *testing.T, rec *httptest.ResponseRecorder) oauthErrorResponse {
	t.Helper()

	var response oauthErrorResponse
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return response
}
