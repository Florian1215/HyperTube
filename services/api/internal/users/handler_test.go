package users

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"hypertube/api/internal/auth"
	"hypertube/api/internal/models"
)

func TestUpdateMyColorStoresAuthenticatedUserColor(t *testing.T) {
	store := &fakeColorStore{}
	handler := NewHandler(store)
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/users/me/color", strings.NewReader(`{"color":" green "}`))
	rec := httptest.NewRecorder()

	auth.DevAuthenticateAs(42)(http.HandlerFunc(handler.UpdateMyColor)).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if !store.called {
		t.Fatal("expected store to be called")
	}
	if store.userID != 42 {
		t.Fatalf("expected user id 42, got %d", store.userID)
	}
	if store.color != models.UserColorGreen {
		t.Fatalf("expected stored color green, got %q", store.color)
	}

	var body struct {
		Data updateColorResponse `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Data.Color != models.UserColorGreen {
		t.Fatalf("expected response color green, got %q", body.Data.Color)
	}
}

func TestUpdateMyColorRequiresAuthContext(t *testing.T) {
	handler := NewHandler(&fakeColorStore{})
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/users/me/color", strings.NewReader(`{"color":"green"}`))
	rec := httptest.NewRecorder()

	handler.UpdateMyColor(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeUsersErrorEnvelope(t, rec).Error.Code; got != "UNAUTHORIZED" {
		t.Fatalf("expected UNAUTHORIZED, got %q", got)
	}
}

func TestUpdateMyColorRejectsInvalidJSON(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{name: "malformed", body: `{"color":`},
		{name: "unknown field", body: `{"color":"green","user_id":999}`},
		{name: "multiple documents", body: `{"color":"green"} {}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := &fakeColorStore{}
			handler := NewHandler(store)
			rec := serveUpdateMyColor(t, handler, tt.body)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
			}
			errorBody := decodeUsersErrorEnvelope(t, rec).Error
			if errorBody.Code != "VALIDATION_ERROR" {
				t.Fatalf("expected VALIDATION_ERROR, got %q", errorBody.Code)
			}
			if got := errorBody.Fields["body"].Message; got != "Invalid JSON body" {
				t.Fatalf("expected invalid body message, got %q", got)
			}
			if store.called {
				t.Fatal("store must not be called for invalid JSON")
			}
		})
	}
}

func TestUpdateMyColorRejectsInvalidColors(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{name: "empty", body: `{"color":""}`},
		{name: "whitespace", body: `{"color":"   "}`},
		{name: "unsupported", body: `{"color":"orange"}`},
		{name: "raw css", body: `{"color":"#747AF5"}`},
		{name: "uppercase", body: `{"color":"Purple"}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := &fakeColorStore{}
			handler := NewHandler(store)
			rec := serveUpdateMyColor(t, handler, tt.body)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
			}
			errorBody := decodeUsersErrorEnvelope(t, rec).Error
			if errorBody.Code != "VALIDATION_ERROR" {
				t.Fatalf("expected VALIDATION_ERROR, got %q", errorBody.Code)
			}
			if got := errorBody.Fields["color"].Message; got != "Invalid user color" {
				t.Fatalf("expected invalid color message, got %q", got)
			}
			if store.called {
				t.Fatal("store must not be called for invalid color")
			}
		})
	}
}

func TestUpdateMyColorMapsStoreErrors(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantStatus int
		wantCode   string
	}{
		{name: "missing user", err: ErrUserNotFound, wantStatus: http.StatusNotFound, wantCode: "NOT_FOUND"},
		{name: "internal", err: errors.New("db down"), wantStatus: http.StatusInternalServerError, wantCode: "INTERNAL_ERROR"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := NewHandler(&fakeColorStore{err: tt.err})
			rec := serveUpdateMyColor(t, handler, `{"color":"green"}`)

			if rec.Code != tt.wantStatus {
				t.Fatalf("expected %d, got %d: %s", tt.wantStatus, rec.Code, rec.Body.String())
			}
			if got := decodeUsersErrorEnvelope(t, rec).Error.Code; got != tt.wantCode {
				t.Fatalf("expected %s, got %q", tt.wantCode, got)
			}
		})
	}
}

func serveUpdateMyColor(t *testing.T, handler *Handler, body string) *httptest.ResponseRecorder {
	t.Helper()

	req := httptest.NewRequest(http.MethodPatch, "/api/v1/users/me/color", strings.NewReader(body))
	rec := httptest.NewRecorder()
	auth.DevAuthenticateAs(42)(http.HandlerFunc(handler.UpdateMyColor)).ServeHTTP(rec, req)
	return rec
}

type fakeColorStore struct {
	called bool
	userID int64
	color  string
	err    error
}

func (s *fakeColorStore) UpdateMyColor(_ context.Context, userID int64, color string) (string, error) {
	s.called = true
	s.userID = userID
	s.color = color
	if s.err != nil {
		return "", s.err
	}
	return color, nil
}

func decodeUsersErrorEnvelope(t *testing.T, rec *httptest.ResponseRecorder) struct {
	Error struct {
		Code   string `json:"code"`
		Fields map[string]struct {
			Message string `json:"message"`
		} `json:"fields"`
	} `json:"error"`
} {
	t.Helper()

	var body struct {
		Error struct {
			Code   string `json:"code"`
			Fields map[string]struct {
				Message string `json:"message"`
			} `json:"fields"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode error response: %v", err)
	}
	return body
}
