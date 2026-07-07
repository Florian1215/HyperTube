package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"hypertube/api/internal/models"

	"github.com/go-chi/chi/v5"
)

func TestOAuthApplicationCredentialGeneration(t *testing.T) {
	clientID1, err := generateOAuthClientID()
	if err != nil {
		t.Fatalf("generate client id: %v", err)
	}
	clientID2, err := generateOAuthClientID()
	if err != nil {
		t.Fatalf("generate second client id: %v", err)
	}
	if !strings.HasPrefix(clientID1, "htc_") || clientID1 == "htc_" {
		t.Fatalf("unexpected client id %q", clientID1)
	}
	if clientID1 == clientID2 {
		t.Fatal("expected generated client ids to differ")
	}

	secret1, err := generateOAuthClientSecret()
	if err != nil {
		t.Fatalf("generate client secret: %v", err)
	}
	secret2, err := generateOAuthClientSecret()
	if err != nil {
		t.Fatalf("generate second client secret: %v", err)
	}
	if !strings.HasPrefix(secret1, "hts_") || secret1 == "hts_" {
		t.Fatalf("unexpected client secret %q", secret1)
	}
	if secret1 == secret2 {
		t.Fatal("expected generated client secrets to differ")
	}

	hash, err := HashPassword(secret1)
	if err != nil {
		t.Fatalf("hash secret: %v", err)
	}
	if hash == secret1 {
		t.Fatal("secret hash must not equal plaintext secret")
	}
	if !CheckPassword(hash, secret1) {
		t.Fatal("expected hashed secret to verify")
	}
}

func TestCreateOAuthApplicationRequiresAuthContext(t *testing.T) {
	handler := NewHandler(newMemoryUserStore(), newTestTokenManager(t))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/oauth/applications", strings.NewReader(`{"name":"My App"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler.CreateOAuthApplication(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestCreateOAuthApplicationValidation(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{name: "invalid JSON", body: `{"name":`, wantStatus: http.StatusBadRequest},
		{name: "missing name", body: `{}`, wantStatus: http.StatusBadRequest},
		{name: "blank name", body: `{"name":"   "}`, wantStatus: http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := NewHandler(newMemoryUserStore(), newTestTokenManager(t))

			rec := callOAuthApplicationRoute(t, handler, 42, http.MethodPost, "/oauth/applications", tt.body)

			if rec.Code != tt.wantStatus {
				t.Fatalf("expected %d, got %d: %s", tt.wantStatus, rec.Code, rec.Body.String())
			}
		})
	}
}

func TestCreateOAuthApplicationReturnsOneTimeSecret(t *testing.T) {
	store := newMemoryUserStore()
	handler := NewHandler(store, newTestTokenManager(t))

	rec := callOAuthApplicationRoute(t, handler, 42, http.MethodPost, "/oauth/applications", `{
		"name": "  My App  ",
		"scope": "read:movies   write:comments"
	}`)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}

	var body struct {
		Data struct {
			ID           int64  `json:"id"`
			Name         string `json:"name"`
			Scope        string `json:"scope"`
			ClientID     string `json:"client_id"`
			ClientSecret string `json:"client_secret"`
			CreatedAt    string `json:"created_at"`
			UpdatedAt    string `json:"updated_at"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Data.ID == 0 || body.Data.Name != "My App" || body.Data.Scope != "read:movies write:comments" {
		t.Fatalf("unexpected app response: %+v", body.Data)
	}
	if !strings.HasPrefix(body.Data.ClientID, "htc_") {
		t.Fatalf("expected generated client id, got %q", body.Data.ClientID)
	}
	if !strings.HasPrefix(body.Data.ClientSecret, "hts_") {
		t.Fatalf("expected generated client secret, got %q", body.Data.ClientSecret)
	}
	if body.Data.CreatedAt == "" || body.Data.UpdatedAt == "" {
		t.Fatalf("expected timestamps, got %+v", body.Data)
	}

	assertJSONFieldsAbsent(t, rec.Body.Bytes(), "client_secret_hash", "owner_id")

	client, err := store.FindOAuthClientByClientID(context.Background(), body.Data.ClientID)
	if err != nil {
		t.Fatalf("find created client: %v", err)
	}
	if client.ClientSecretHash == body.Data.ClientSecret {
		t.Fatal("store must not keep plaintext client secret")
	}
	if !CheckPassword(client.ClientSecretHash, body.Data.ClientSecret) {
		t.Fatal("stored client secret hash should verify one-time secret")
	}
}

func TestListOAuthApplicationsFiltersByAuthenticatedUser(t *testing.T) {
	store := newMemoryUserStore()
	handler := NewHandler(store, newTestTokenManager(t))
	createStoredOAuthApplication(t, store, 42, "First", "read:movies", "client-one", "secret-one")
	createStoredOAuthApplication(t, store, 99, "Other", "admin", "client-other", "secret-other")
	createStoredOAuthApplication(t, store, 42, "Second", "write:comments", "client-two", "secret-two")

	rec := callOAuthApplicationRoute(t, handler, 42, http.MethodGet, "/oauth/applications", "")

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Data []struct {
			Name     string `json:"name"`
			ClientID string `json:"client_id"`
		} `json:"data"`
		Meta struct {
			Total int `json:"total"`
		} `json:"meta"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(body.Data) != 2 || body.Meta.Total != 2 {
		t.Fatalf("expected two owned apps, got %+v", body)
	}
	for _, app := range body.Data {
		if app.Name == "Other" || app.ClientID == "client-other" {
			t.Fatalf("listed app owned by another user: %+v", app)
		}
	}
	assertJSONFieldsAbsent(t, rec.Body.Bytes(), "client_secret", "client_secret_hash", "owner_id")
}

func TestListOAuthApplicationsReturnsEmptyList(t *testing.T) {
	handler := NewHandler(newMemoryUserStore(), newTestTokenManager(t))

	rec := callOAuthApplicationRoute(t, handler, 42, http.MethodGet, "/oauth/applications", "")

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if !bytes.Contains(rec.Body.Bytes(), []byte(`"data":[]`)) {
		t.Fatalf("expected empty list data array, got %s", rec.Body.String())
	}
}

func TestUpdateOAuthApplicationValidationAndOwnership(t *testing.T) {
	store := newMemoryUserStore()
	handler := NewHandler(store, newTestTokenManager(t))
	owned := createStoredOAuthApplication(t, store, 42, "Old", "read:movies", "owned-client", "owned-secret")
	other := createStoredOAuthApplication(t, store, 99, "Other", "read:movies", "other-client", "other-secret")

	rec := callOAuthApplicationRoute(t, handler, 42, http.MethodPatch, "/oauth/applications/not-a-number", `{"name":"New"}`)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected invalid id 404, got %d: %s", rec.Code, rec.Body.String())
	}

	rec = callOAuthApplicationRoute(t, handler, 42, http.MethodPatch, "/oauth/applications/"+strconvInt64(owned.ID), `{}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected empty patch 400, got %d: %s", rec.Code, rec.Body.String())
	}

	rec = callOAuthApplicationRoute(t, handler, 42, http.MethodPatch, "/oauth/applications/"+strconvInt64(other.ID), `{"name":"Nope"}`)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected foreign app 404, got %d: %s", rec.Code, rec.Body.String())
	}

	rec = callOAuthApplicationRoute(t, handler, 42, http.MethodPatch, "/oauth/applications/"+strconvInt64(owned.ID), `{
		"name": "  New Name  ",
		"scope": "write:comments   read:movies"
	}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected patch 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Data struct {
			Name  string `json:"name"`
			Scope string `json:"scope"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Data.Name != "New Name" || body.Data.Scope != "write:comments read:movies" {
		t.Fatalf("unexpected patch response: %+v", body.Data)
	}
	assertJSONFieldsAbsent(t, rec.Body.Bytes(), "client_secret", "client_secret_hash", "owner_id")
}

func TestDeleteOAuthApplicationDeletesOnlyOwnedApp(t *testing.T) {
	store := newMemoryUserStore()
	handler := NewHandler(store, newTestTokenManager(t))
	owned := createStoredOAuthApplication(t, store, 42, "Owned", "", "owned-client", "owned-secret")
	other := createStoredOAuthApplication(t, store, 99, "Other", "", "other-client", "other-secret")

	rec := callOAuthApplicationRoute(t, handler, 42, http.MethodDelete, "/oauth/applications/"+strconvInt64(other.ID), "")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected foreign delete 404, got %d: %s", rec.Code, rec.Body.String())
	}

	rec = callOAuthApplicationRoute(t, handler, 42, http.MethodDelete, "/oauth/applications/"+strconvInt64(owned.ID), "")
	if rec.Code != http.StatusOK {
		t.Fatalf("expected delete 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if !bytes.Contains(rec.Body.Bytes(), []byte(`"data":null`)) {
		t.Fatalf("expected data:null, got %s", rec.Body.String())
	}

	if _, err := store.FindOAuthClientByClientID(context.Background(), "owned-client"); !errors.Is(err, ErrOAuthApplicationNotFound) {
		t.Fatalf("expected deleted app to be missing, got %v", err)
	}
	if _, err := store.FindOAuthClientByClientID(context.Background(), "other-client"); err != nil {
		t.Fatalf("foreign app should remain, got %v", err)
	}
}

func callOAuthApplicationRoute(t *testing.T, handler *Handler, userID int64, method string, path string, body string) *httptest.ResponseRecorder {
	t.Helper()

	router := chi.NewRouter()
	router.With(DevAuthenticateAs(userID)).Post("/oauth/applications", handler.CreateOAuthApplication)
	router.With(DevAuthenticateAs(userID)).Get("/oauth/applications", handler.ListOAuthApplications)
	router.With(DevAuthenticateAs(userID)).Patch("/oauth/applications/{id}", handler.UpdateOAuthApplication)
	router.With(DevAuthenticateAs(userID)).Delete("/oauth/applications/{id}", handler.DeleteOAuthApplication)

	var reader *strings.Reader
	if body == "" {
		reader = strings.NewReader("")
	} else {
		reader = strings.NewReader(body)
	}
	req := httptest.NewRequest(method, path, reader)
	if method == http.MethodPost || method == http.MethodPatch {
		req.Header.Set("Content-Type", "application/json")
	}
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

func createStoredOAuthApplication(t *testing.T, store *memoryUserStore, ownerID int64, name string, scope string, clientID string, secret string) models.OAuthApplication {
	t.Helper()

	hash, err := HashPassword(secret)
	if err != nil {
		t.Fatalf("hash secret: %v", err)
	}
	app, err := store.CreateOAuthApplication(context.Background(), CreateOAuthApplicationParams{
		OwnerUserID:      ownerID,
		Name:             name,
		Scope:            scope,
		ClientID:         clientID,
		ClientSecretHash: hash,
	})
	if err != nil {
		t.Fatalf("create oauth application: %v", err)
	}
	return app
}

func assertJSONFieldsAbsent(t *testing.T, body []byte, fields ...string) {
	t.Helper()

	var value any
	if err := json.Unmarshal(body, &value); err != nil {
		t.Fatalf("decode JSON: %v", err)
	}
	for _, field := range fields {
		if jsonFieldExists(value, field) {
			t.Fatalf("expected field %q to be absent in %s", field, string(body))
		}
	}
}

func jsonFieldExists(value any, field string) bool {
	switch typed := value.(type) {
	case map[string]any:
		if _, ok := typed[field]; ok {
			return true
		}
		for _, child := range typed {
			if jsonFieldExists(child, field) {
				return true
			}
		}
	case []any:
		for _, child := range typed {
			if jsonFieldExists(child, field) {
				return true
			}
		}
	}
	return false
}

func strconvInt64(value int64) string {
	return strconv.FormatInt(value, 10)
}
