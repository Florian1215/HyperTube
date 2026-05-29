package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"hypertube/api/internal/auth"
	"hypertube/api/internal/comments"
	"hypertube/api/internal/movies"
	"hypertube/api/internal/stream"
)

func TestRouterHealthCheck(t *testing.T) {
	router, _ := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestRouterAuthLoginIsPublic(t *testing.T) {
	router, _ := newTestRouter(t)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(`{"email":`))
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected public login route to return 400 for bad JSON, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeRouterErrorCode(t, rec); got != "BAD_REQUEST" {
		t.Fatalf("expected BAD_REQUEST, got %q", got)
	}
}

func TestRouterOAuthTokenIsPublic(t *testing.T) {
	router, _ := newTestRouter(t)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/oauth/token", strings.NewReader(`grant_type=client_credentials`))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected public OAuth token route to return 400 for unsupported grant, got %d: %s", rec.Code, rec.Body.String())
	}

	var body struct {
		Error string `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Error != "unsupported_grant_type" {
		t.Fatalf("expected unsupported_grant_type, got %q", body.Error)
	}
}

func TestRouterGitHubOAuthLoginIsPublic(t *testing.T) {
	router, _ := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/github/login", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected public GitHub OAuth route to return 503 when unconfigured, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeRouterErrorCode(t, rec); got != "OAUTH_NOT_CONFIGURED" {
		t.Fatalf("expected OAUTH_NOT_CONFIGURED, got %q", got)
	}
}

func TestRouterDevMovieRoutesReachHandlerWithoutBearerToken(t *testing.T) {
	router, _ := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/movies/search", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected handler validation 400, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeRouterErrorCode(t, rec); got != "VALIDATION_ERROR" {
		t.Fatalf("expected VALIDATION_ERROR, got %q", got)
	}
	if got := decodeRouterValidationField(t, rec, "title"); got != "title query parameter is required" {
		t.Fatalf("expected title field validation, got %q", got)
	}
}

func TestRouterMovieRouteStillAcceptsBearerTokenDuringDevAuth(t *testing.T) {
	router, _ := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/movies/search", nil)
	req.Header.Set("Authorization", "Bearer dev-token-is-ignored")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected handler validation 400, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeRouterErrorCode(t, rec); got != "VALIDATION_ERROR" {
		t.Fatalf("expected VALIDATION_ERROR, got %q", got)
	}
	if got := decodeRouterValidationField(t, rec, "title"); got != "title query parameter is required" {
		t.Fatalf("expected title field validation, got %q", got)
	}
}

func newTestRouter(t *testing.T) (http.Handler, *auth.TokenManager) {
	t.Helper()

	tokens, err := auth.NewTokenManager("0123456789abcdef0123456789abcdef", "hypertube-test")
	if err != nil {
		t.Fatalf("new token manager: %v", err)
	}

	return newRouter(
		movies.NewMoviesHandler(nil, nil, nil),
		comments.NewCommentsHandler(nil),
		auth.NewHandler(nil, tokens),
		tokens,
		stream.NewStreamHandler(),
		"http://localhost:4200",
	), tokens
}

func decodeRouterErrorCode(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()

	var body struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return body.Error.Code
}

func decodeRouterValidationField(t *testing.T, rec *httptest.ResponseRecorder, field string) string {
	t.Helper()

	var body struct {
		Error struct {
			Fields map[string]struct {
				Message string `json:"message"`
			} `json:"fields"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return body.Error.Fields[field].Message
}
