package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

func TestFortyTwoLoginRedirectsWithStateCookie(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	provider := &fakeOAuthProvider{authURL: "https://api.intra.42.fr/oauth/authorize"}
	handler := NewHandler(store, tokens, WithFortyTwoOAuth(provider))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/42/login", nil)
	rec := httptest.NewRecorder()

	handler.LoginFortyTwo(rec, req)

	if rec.Code != http.StatusFound {
		t.Fatalf("expected 302, got %d: %s", rec.Code, rec.Body.String())
	}
	if provider.lastState == "" {
		t.Fatal("expected generated OAuth state")
	}
	location := rec.Header().Get("Location")
	if !strings.Contains(location, "state="+provider.lastState) {
		t.Fatalf("expected redirect location to include state, got %q", location)
	}

	cookie := rec.Result().Cookies()[0]
	if cookie.Name != oauthStateCookieName {
		t.Fatalf("expected state cookie %q, got %q", oauthStateCookieName, cookie.Name)
	}
	if cookie.Value != provider.lastState {
		t.Fatalf("expected cookie state %q, got %q", provider.lastState, cookie.Value)
	}
	if !cookie.HttpOnly {
		t.Fatal("state cookie must be HttpOnly")
	}
}

func TestFortyTwoLoginStoresOAuthLocaleCookie(t *testing.T) {
	provider := &fakeOAuthProvider{authURL: "https://api.intra.42.fr/oauth/authorize"}
	handler := NewHandler(newMemoryUserStore(), newTestTokenManager(t), WithFortyTwoOAuth(provider))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/42/login", nil)
	req.Header.Set("Accept-Language", "de-DE,de;q=0.9")
	rec := httptest.NewRecorder()

	handler.LoginFortyTwo(rec, req)

	if rec.Code != http.StatusFound {
		t.Fatalf("expected 302, got %d: %s", rec.Code, rec.Body.String())
	}
	cookie := findCookie(t, rec, oauthLocaleCookieName(oauthStateCookieName))
	if cookie.Value != "de" {
		t.Fatalf("expected stored OAuth locale de, got %q", cookie.Value)
	}
	if !cookie.HttpOnly {
		t.Fatal("locale cookie must be HttpOnly")
	}
}

func TestFortyTwoCallbackCreatesUserAndToken(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	provider := &fakeOAuthProvider{
		identity: OAuthIdentity{
			Provider:       fortyTwoProvider,
			ProviderUserID: "12345",
			Email:          "ft.user@example.com",
			Username:       "ft_user",
			FirstName:      "Forty",
			LastName:       "Two",
			ProfilePicture: "https://cdn.intra.42.fr/users/12345/medium_ft_user.jpg",
		},
	}
	handler := NewHandler(store, tokens, WithFortyTwoOAuth(provider))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/42/callback?code=valid-code&state=test-state", nil)
	req.AddCookie(&http.Cookie{Name: oauthStateCookieName, Value: "test-state"})
	rec := httptest.NewRecorder()

	handler.CallbackFortyTwo(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	response := decodeAuthEnvelope(t, rec)
	if response.Data.User.Email != "ft.user@example.com" {
		t.Fatalf("expected 42 email, got %q", response.Data.User.Email)
	}
	if response.Data.User.Username != "ft_user" {
		t.Fatalf("expected 42 login as username, got %q", response.Data.User.Username)
	}
	if response.Data.User.ProfilePicture == nil || *response.Data.User.ProfilePicture != "https://cdn.intra.42.fr/users/12345/medium_ft_user.jpg" {
		t.Fatalf("expected 42 profile picture, got %+v", response.Data.User.ProfilePicture)
	}
	if _, err := tokens.ValidateAccessToken(response.Data.AccessToken); err != nil {
		t.Fatalf("42 auth token should validate: %v", err)
	}

	secondReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/42/callback?code=valid-code&state=second-state", nil)
	secondReq.AddCookie(&http.Cookie{Name: oauthStateCookieName, Value: "second-state"})
	secondRec := httptest.NewRecorder()

	handler.CallbackFortyTwo(secondRec, secondReq)
	secondResponse := decodeAuthEnvelope(t, secondRec)
	if secondResponse.Data.User.ID != response.Data.User.ID {
		t.Fatalf("expected repeat 42 login to reuse user id %d, got %d", response.Data.User.ID, secondResponse.Data.User.ID)
	}
}

func TestFortyTwoCallbackRedirectsToFrontendWithTokenFragment(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	provider := &fakeOAuthProvider{
		identity: OAuthIdentity{
			Provider:       fortyTwoProvider,
			ProviderUserID: "12345",
			Email:          "ft.user@example.com",
			Username:       "ft_user",
			FirstName:      "Forty",
			LastName:       "Two",
		},
	}
	handler := NewHandler(
		store,
		tokens,
		WithFortyTwoOAuth(provider),
		WithFrontendAuthCallbackURL("http://frontend.local/auth/callback"),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/42/callback?code=valid-code&state=test-state", nil)
	req.AddCookie(&http.Cookie{Name: oauthStateCookieName, Value: "test-state"})
	rec := httptest.NewRecorder()

	handler.CallbackFortyTwo(rec, req)

	if rec.Code != http.StatusSeeOther {
		t.Fatalf("expected 303, got %d: %s", rec.Code, rec.Body.String())
	}

	location, err := url.Parse(rec.Header().Get("Location"))
	if err != nil {
		t.Fatalf("parse redirect location: %v", err)
	}
	if location.Scheme != "http" || location.Host != "frontend.local" || location.Path != "/auth/callback" {
		t.Fatalf("unexpected redirect location: %q", location.String())
	}

	fragment, err := url.ParseQuery(location.Fragment)
	if err != nil {
		t.Fatalf("parse redirect fragment: %v", err)
	}
	if _, err := tokens.ValidateAccessToken(fragment.Get("access_token")); err != nil {
		t.Fatalf("redirect access token should validate: %v", err)
	}
	if fragment.Get("token_type") != "Bearer" {
		t.Fatalf("expected Bearer token type, got %q", fragment.Get("token_type"))
	}

	var user userResponse
	if err := json.Unmarshal([]byte(fragment.Get("user")), &user); err != nil {
		t.Fatalf("decode user fragment: %v", err)
	}
	if user.Email != "ft.user@example.com" || user.Username != "ft_user" {
		t.Fatalf("unexpected redirected user: %+v", user)
	}

	cookie := findCookie(t, rec, oauthStateCookieName)
	if cookie.MaxAge >= 0 {
		t.Fatalf("expected OAuth state cookie to be cleared, got MaxAge=%d", cookie.MaxAge)
	}
}

func TestFortyTwoCallbackRedirectsProviderErrorToFrontend(t *testing.T) {
	handler := NewHandler(
		newMemoryUserStore(),
		newTestTokenManager(t),
		WithFortyTwoOAuth(&fakeOAuthProvider{}),
		WithFrontendAuthCallbackURL("http://frontend.local/auth/callback"),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/42/callback?error=access_denied&state=test-state", nil)
	req.AddCookie(&http.Cookie{Name: oauthStateCookieName, Value: "test-state"})
	rec := httptest.NewRecorder()

	handler.CallbackFortyTwo(rec, req)

	if rec.Code != http.StatusSeeOther {
		t.Fatalf("expected 303, got %d: %s", rec.Code, rec.Body.String())
	}
	location, err := url.Parse(rec.Header().Get("Location"))
	if err != nil {
		t.Fatalf("parse redirect location: %v", err)
	}
	if got := location.Query().Get("error"); got != "OAUTH_DENIED" {
		t.Fatalf("expected OAUTH_DENIED, got %q", got)
	}
	if got := location.Query().Get("error_description"); got != "OAuth authorization was denied for 42" {
		t.Fatalf("expected localized provider error description, got %q", got)
	}

	cookie := findCookie(t, rec, oauthStateCookieName)
	if cookie.MaxAge >= 0 {
		t.Fatalf("expected OAuth state cookie to be cleared, got MaxAge=%d", cookie.MaxAge)
	}
}

func TestFortyTwoCallbackErrorUsesStoredOAuthLocale(t *testing.T) {
	handler := NewHandler(
		newMemoryUserStore(),
		newTestTokenManager(t),
		WithFortyTwoOAuth(&fakeOAuthProvider{}),
		WithFrontendAuthCallbackURL("http://frontend.local/auth/callback"),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/42/callback?code=valid-code&state=bad-state", nil)
	req.AddCookie(&http.Cookie{Name: oauthStateCookieName, Value: "good-state"})
	req.AddCookie(&http.Cookie{Name: oauthLocaleCookieName(oauthStateCookieName), Value: "fr"})
	rec := httptest.NewRecorder()

	handler.CallbackFortyTwo(rec, req)

	if rec.Code != http.StatusSeeOther {
		t.Fatalf("expected 303, got %d: %s", rec.Code, rec.Body.String())
	}
	location, err := url.Parse(rec.Header().Get("Location"))
	if err != nil {
		t.Fatalf("parse redirect location: %v", err)
	}
	if got := location.Query().Get("error"); got != "INVALID_OAUTH_STATE" {
		t.Fatalf("expected INVALID_OAUTH_STATE, got %q", got)
	}
	if got := location.Query().Get("error_description"); got != "État OAuth invalide" {
		t.Fatalf("expected French OAuth error description, got %q", got)
	}
}

func TestFortyTwoCallbackRejectsInvalidState(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	provider := &fakeOAuthProvider{identity: OAuthIdentity{Provider: fortyTwoProvider, ProviderUserID: "1", Username: "ft"}}
	handler := NewHandler(store, tokens, WithFortyTwoOAuth(provider))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/42/callback?code=valid-code&state=bad-state", nil)
	req.AddCookie(&http.Cookie{Name: oauthStateCookieName, Value: "good-state"})
	rec := httptest.NewRecorder()

	handler.CallbackFortyTwo(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestFortyTwoCallbackRejectsExchangeError(t *testing.T) {
	handler := NewHandler(
		newMemoryUserStore(),
		newTestTokenManager(t),
		WithFortyTwoOAuth(&fakeOAuthProvider{exchangeErr: errors.New("provider down")}),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/42/callback?code=valid-code&state=test-state", nil)
	req.AddCookie(&http.Cookie{Name: oauthStateCookieName, Value: "test-state"})
	rec := httptest.NewRecorder()

	handler.CallbackFortyTwo(rec, req)

	if rec.Code != http.StatusBadGateway {
		t.Fatalf("expected 502, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeErrorEnvelope(t, rec).Error.Code; got != "OAUTH_EXCHANGE_FAILED" {
		t.Fatalf("expected OAUTH_EXCHANGE_FAILED, got %q", got)
	}
}

func TestFortyTwoLoginRequiresConfiguredProvider(t *testing.T) {
	handler := NewHandler(newMemoryUserStore(), newTestTokenManager(t))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/42/login", nil)
	rec := httptest.NewRecorder()

	handler.LoginFortyTwo(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeErrorEnvelope(t, rec).Error.Code; got != "OAUTH_NOT_CONFIGURED" {
		t.Fatalf("expected OAUTH_NOT_CONFIGURED, got %q", got)
	}
}

func TestGitHubLoginRedirectsWithStateCookie(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	provider := &fakeOAuthProvider{authURL: "https://github.com/login/oauth/authorize"}
	handler := NewHandler(store, tokens, WithGitHubOAuth(provider))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/github/login", nil)
	rec := httptest.NewRecorder()

	handler.LoginGitHub(rec, req)

	if rec.Code != http.StatusFound {
		t.Fatalf("expected 302, got %d: %s", rec.Code, rec.Body.String())
	}
	if provider.lastState == "" {
		t.Fatal("expected generated OAuth state")
	}
	location := rec.Header().Get("Location")
	if !strings.Contains(location, "state="+provider.lastState) {
		t.Fatalf("expected redirect location to include state, got %q", location)
	}

	cookie := rec.Result().Cookies()[0]
	if cookie.Name != githubOAuthStateCookieName {
		t.Fatalf("expected state cookie %q, got %q", githubOAuthStateCookieName, cookie.Name)
	}
	if cookie.Value != provider.lastState {
		t.Fatalf("expected cookie state %q, got %q", provider.lastState, cookie.Value)
	}
	if !cookie.HttpOnly {
		t.Fatal("state cookie must be HttpOnly")
	}
}

func TestGitHubCallbackCreatesUserAndToken(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	provider := &fakeOAuthProvider{
		identity: OAuthIdentity{
			Provider:       githubProvider,
			ProviderUserID: "98765",
			Email:          "gh.user@example.com",
			Username:       "gh_user",
			FirstName:      "Git",
			LastName:       "Hub",
		},
	}
	handler := NewHandler(store, tokens, WithGitHubOAuth(provider))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/github/callback?code=valid-code&state=test-state", nil)
	req.AddCookie(&http.Cookie{Name: githubOAuthStateCookieName, Value: "test-state"})
	rec := httptest.NewRecorder()

	handler.CallbackGitHub(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	response := decodeAuthEnvelope(t, rec)
	if response.Data.User.Email != "gh.user@example.com" {
		t.Fatalf("expected GitHub email, got %q", response.Data.User.Email)
	}
	if response.Data.User.Username != "gh_user" {
		t.Fatalf("expected GitHub login as username, got %q", response.Data.User.Username)
	}
	if _, err := tokens.ValidateAccessToken(response.Data.AccessToken); err != nil {
		t.Fatalf("GitHub auth token should validate: %v", err)
	}

	secondReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/github/callback?code=valid-code&state=second-state", nil)
	secondReq.AddCookie(&http.Cookie{Name: githubOAuthStateCookieName, Value: "second-state"})
	secondRec := httptest.NewRecorder()

	handler.CallbackGitHub(secondRec, secondReq)
	secondResponse := decodeAuthEnvelope(t, secondRec)
	if secondResponse.Data.User.ID != response.Data.User.ID {
		t.Fatalf("expected repeat GitHub login to reuse user id %d, got %d", response.Data.User.ID, secondResponse.Data.User.ID)
	}
}

func TestGitHubCallbackRejectsInvalidState(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	provider := &fakeOAuthProvider{identity: OAuthIdentity{Provider: githubProvider, ProviderUserID: "1", Username: "gh"}}
	handler := NewHandler(store, tokens, WithGitHubOAuth(provider))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/github/callback?code=valid-code&state=bad-state", nil)
	req.AddCookie(&http.Cookie{Name: githubOAuthStateCookieName, Value: "good-state"})
	rec := httptest.NewRecorder()

	handler.CallbackGitHub(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestGitHubLoginRequiresConfiguredProvider(t *testing.T) {
	handler := NewHandler(newMemoryUserStore(), newTestTokenManager(t))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/github/login", nil)
	rec := httptest.NewRecorder()

	handler.LoginGitHub(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeErrorEnvelope(t, rec).Error.Code; got != "OAUTH_NOT_CONFIGURED" {
		t.Fatalf("expected OAUTH_NOT_CONFIGURED, got %q", got)
	}
}

func TestGitLabLoginRedirectsWithStateCookie(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	provider := &fakeOAuthProvider{authURL: "https://gitlab.com/oauth/authorize"}
	handler := NewHandler(store, tokens, WithGitLabOAuth(provider))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/gitlab/login", nil)
	rec := httptest.NewRecorder()

	handler.LoginGitLab(rec, req)

	if rec.Code != http.StatusFound {
		t.Fatalf("expected 302, got %d: %s", rec.Code, rec.Body.String())
	}
	if provider.lastState == "" {
		t.Fatal("expected generated OAuth state")
	}
	location := rec.Header().Get("Location")
	if !strings.Contains(location, "state="+provider.lastState) {
		t.Fatalf("expected redirect location to include state, got %q", location)
	}

	cookie := rec.Result().Cookies()[0]
	if cookie.Name != gitlabOAuthStateCookieName {
		t.Fatalf("expected state cookie %q, got %q", gitlabOAuthStateCookieName, cookie.Name)
	}
	if cookie.Value != provider.lastState {
		t.Fatalf("expected cookie state %q, got %q", provider.lastState, cookie.Value)
	}
	if !cookie.HttpOnly {
		t.Fatal("state cookie must be HttpOnly")
	}
}

func TestGitLabCallbackCreatesUserAndToken(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	provider := &fakeOAuthProvider{
		identity: OAuthIdentity{
			Provider:       gitlabProvider,
			ProviderUserID: "13579",
			Email:          "gl.user@example.com",
			Username:       "gl_user",
			FirstName:      "Git",
			LastName:       "Lab",
			ProfilePicture: "https://gitlab.com/uploads/-/system/user/avatar/13579/avatar.png",
		},
	}
	handler := NewHandler(store, tokens, WithGitLabOAuth(provider))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/gitlab/callback?code=valid-code&state=test-state", nil)
	req.AddCookie(&http.Cookie{Name: gitlabOAuthStateCookieName, Value: "test-state"})
	rec := httptest.NewRecorder()

	handler.CallbackGitLab(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	response := decodeAuthEnvelope(t, rec)
	if response.Data.User.Email != "gl.user@example.com" {
		t.Fatalf("expected GitLab email, got %q", response.Data.User.Email)
	}
	if response.Data.User.Username != "gl_user" {
		t.Fatalf("expected GitLab username, got %q", response.Data.User.Username)
	}
	if response.Data.User.ProfilePicture == nil || *response.Data.User.ProfilePicture != "https://gitlab.com/uploads/-/system/user/avatar/13579/avatar.png" {
		t.Fatalf("expected GitLab profile picture, got %+v", response.Data.User.ProfilePicture)
	}
	if _, err := tokens.ValidateAccessToken(response.Data.AccessToken); err != nil {
		t.Fatalf("GitLab auth token should validate: %v", err)
	}

	secondReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/gitlab/callback?code=valid-code&state=second-state", nil)
	secondReq.AddCookie(&http.Cookie{Name: gitlabOAuthStateCookieName, Value: "second-state"})
	secondRec := httptest.NewRecorder()

	handler.CallbackGitLab(secondRec, secondReq)
	secondResponse := decodeAuthEnvelope(t, secondRec)
	if secondResponse.Data.User.ID != response.Data.User.ID {
		t.Fatalf("expected repeat GitLab login to reuse user id %d, got %d", response.Data.User.ID, secondResponse.Data.User.ID)
	}
}

func TestGitLabCallbackRejectsInvalidState(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	provider := &fakeOAuthProvider{identity: OAuthIdentity{Provider: gitlabProvider, ProviderUserID: "1", Username: "gl"}}
	handler := NewHandler(store, tokens, WithGitLabOAuth(provider))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/gitlab/callback?code=valid-code&state=bad-state", nil)
	req.AddCookie(&http.Cookie{Name: gitlabOAuthStateCookieName, Value: "good-state"})
	rec := httptest.NewRecorder()

	handler.CallbackGitLab(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestGitLabLoginRequiresConfiguredProvider(t *testing.T) {
	handler := NewHandler(newMemoryUserStore(), newTestTokenManager(t))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/gitlab/login", nil)
	rec := httptest.NewRecorder()

	handler.LoginGitLab(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeErrorEnvelope(t, rec).Error.Code; got != "OAUTH_NOT_CONFIGURED" {
		t.Fatalf("expected OAUTH_NOT_CONFIGURED, got %q", got)
	}
}
