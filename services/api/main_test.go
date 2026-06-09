package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"hypertube/api/internal/auth"
	"hypertube/api/internal/comments"
	"hypertube/api/internal/movies"
	"hypertube/api/internal/stream"
	"hypertube/api/internal/users"
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

func TestRouterPublicAuthJSONRoutes(t *testing.T) {
	router, _ := newTestRouter(t)

	tests := []struct {
		name string
		path string
		body string
	}{
		{
			name: "login",
			path: "/api/v1/auth/login",
			body: `{"login":`,
		},
		{
			name: "register",
			path: "/api/v1/auth/register",
			body: `{"email":`,
		},
		{
			name: "password reset request",
			path: "/api/v1/auth/password-reset",
			body: `{"email":`,
		},
		{
			name: "reset password",
			path: "/api/v1/auth/reset-password",
			body: `{"token":`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, tt.path, strings.NewReader(tt.body))
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("expected public route to return 400 for bad JSON, got %d: %s", rec.Code, rec.Body.String())
			}
			if got := decodeRouterErrorCode(t, rec); got != "BAD_REQUEST" {
				t.Fatalf("expected BAD_REQUEST, got %q", got)
			}
		})
	}
}

func TestRouterOAuthTokenRoutesArePublic(t *testing.T) {
	router, _ := newTestRouter(t)

	for _, path := range []string{"/api/v1/oauth/token", "/oauth/token"} {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(`grant_type=client_credentials`))
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
		})
	}
}

func TestRouterPublicOAuthProviderRoutes(t *testing.T) {
	router, _ := newTestRouter(t)

	tests := []struct {
		name string
		path string
	}{
		{name: "42 login", path: "/api/v1/auth/42/login"},
		{name: "42 callback", path: "/api/v1/auth/42/callback?code=x&state=y"},
		{name: "github login", path: "/api/v1/auth/github/login"},
		{name: "github callback", path: "/api/v1/auth/github/callback?code=x&state=y"},
		{name: "gitlab login", path: "/api/v1/auth/gitlab/login"},
		{name: "gitlab callback", path: "/api/v1/auth/gitlab/callback?code=x&state=y"},
		{name: "42 callback alias", path: "/oauth/callback/42?code=x&state=y"},
		{name: "github callback alias", path: "/oauth/callback/github?code=x&state=y"},
		{name: "gitlab callback alias", path: "/oauth/callback/gitlab?code=x&state=y"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			if rec.Code != http.StatusServiceUnavailable {
				t.Fatalf("expected public OAuth route to return 503 when unconfigured, got %d: %s", rec.Code, rec.Body.String())
			}
			if got := decodeRouterErrorCode(t, rec); got != "OAUTH_NOT_CONFIGURED" {
				t.Fatalf("expected OAUTH_NOT_CONFIGURED, got %q", got)
			}
		})
	}
}

func TestRouterProtectedRouteRejectsMissingBearerToken(t *testing.T) {
	router, _ := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/movies/search", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeRouterErrorCode(t, rec); got != "UNAUTHORIZED" {
		t.Fatalf("expected UNAUTHORIZED, got %q", got)
	}
}

func TestRouterProtectedRouteRejectsInvalidBearerToken(t *testing.T) {
	router, _ := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/movies/search", nil)
	req.Header.Set("Authorization", "Bearer not-a-token")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeRouterErrorCode(t, rec); got != "UNAUTHORIZED" {
		t.Fatalf("expected UNAUTHORIZED, got %q", got)
	}
}

func TestRouterProtectedRouteWithValidTokenReachesHandler(t *testing.T) {
	router, tokens := newTestRouter(t)
	token, _, err := tokens.CreateAccessToken(42)
	if err != nil {
		t.Fatalf("create token: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/movies/search", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected downstream handler response, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeRouterErrorCode(t, rec); got != "VALIDATION_ERROR" {
		t.Fatalf("expected VALIDATION_ERROR, got %q", got)
	}
}

func TestRouterUserColorRouteRequiresBearerToken(t *testing.T) {
	router, _ := newTestRouter(t)

	req := httptest.NewRequest(http.MethodPatch, "/api/v1/users/me/color", strings.NewReader(`{"color":"green"}`))
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected missing token 401, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeRouterErrorCode(t, rec); got != "UNAUTHORIZED" {
		t.Fatalf("expected UNAUTHORIZED, got %q", got)
	}
}

func TestRouterUserColorRouteRejectsInvalidBearerToken(t *testing.T) {
	router, _ := newTestRouter(t)

	req := httptest.NewRequest(http.MethodPatch, "/api/v1/users/me/color", strings.NewReader(`{"color":"green"}`))
	req.Header.Set("Authorization", "Bearer not-a-token")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected invalid token 401, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeRouterErrorCode(t, rec); got != "UNAUTHORIZED" {
		t.Fatalf("expected UNAUTHORIZED, got %q", got)
	}
}

func TestRouterUserColorRouteWithValidTokenReachesHandler(t *testing.T) {
	userStore := &routerUserColorStore{}
	router, tokens := newTestRouterWithUsersStore(t, userStore)
	token, _, err := tokens.CreateAccessToken(42)
	if err != nil {
		t.Fatalf("create token: %v", err)
	}

	req := httptest.NewRequest(http.MethodPatch, "/api/v1/users/me/color", strings.NewReader(`{"color":"green"}`))
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected users handler response, got %d: %s", rec.Code, rec.Body.String())
	}
	if userStore.userID != 42 {
		t.Fatalf("expected user id 42, got %d", userStore.userID)
	}
	if userStore.color != "green" {
		t.Fatalf("expected color green, got %q", userStore.color)
	}

	var body struct {
		Data struct {
			Color string `json:"color"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Data.Color != "green" {
		t.Fatalf("expected response color green, got %q", body.Data.Color)
	}
}

func newTestRouter(t *testing.T) (http.Handler, *auth.TokenManager) {
	return newTestRouterWithUsersStore(t, &routerUserColorStore{})
}

func newTestRouterWithUsersStore(t *testing.T, userStore *routerUserColorStore) (http.Handler, *auth.TokenManager) {
	t.Helper()

	tokens, err := auth.NewTokenManager("0123456789abcdef0123456789abcdef", "hypertube-test")
	if err != nil {
		t.Fatalf("new token manager: %v", err)
	}

	return newRouter(
		movies.NewMoviesHandler(nil, nil, nil, nil),
		comments.NewCommentsHandler(nil),
		auth.NewHandler(nil, tokens),
		users.NewHandler(userStore),
		tokens,
		stream.NewStreamHandler(),
		"http://localhost:4200",
	), tokens
}

type routerUserColorStore struct {
	userID int64
	color  string
}

func (s *routerUserColorStore) UpdateMyColor(_ context.Context, userID int64, color string) (string, error) {
	s.userID = userID
	s.color = color
	return color, nil
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
