package users

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"hypertube/api/internal/models"
)

func TestListUsersReturnsUserSmallList(t *testing.T) {
	store := &fakeUserStore{list: []models.User{
		{ID: 1, Username: "alice", Email: "alice@example.com", PasswordHash: "secret", Color: models.UserColorGreen},
		{ID: 2, Username: "bob", Email: "bob@example.com", PasswordHash: "hunter2", Color: models.UserColorBlue},
	}}
	handler := NewHandler(store)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/users", nil)
	rec := httptest.NewRecorder()

	handler.ListUsers(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var body struct {
		Data []models.UserSmall `json:"data"`
		Meta struct {
			Total int `json:"total"`
		} `json:"meta"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(body.Data) != 2 {
		t.Fatalf("expected 2 users, got %d", len(body.Data))
	}
	if body.Meta.Total != 2 {
		t.Fatalf("expected total 2, got %d", body.Meta.Total)
	}
	if body.Data[0].Username != "alice" || body.Data[1].Username != "bob" {
		t.Fatalf("unexpected users: %+v", body.Data)
	}
	if body.Data[0].Color != models.UserColorGreen {
		t.Fatalf("expected first user color green, got %q", body.Data[0].Color)
	}
	if raw := rec.Body.String(); strings.Contains(raw, "secret") || strings.Contains(raw, "alice@example.com") {
		t.Fatalf("response leaked sensitive data: %s", raw)
	}
}

func TestListUsersEmpty(t *testing.T) {
	handler := NewHandler(&fakeUserStore{list: []models.User{}})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/users", nil)
	rec := httptest.NewRecorder()

	handler.ListUsers(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var body struct {
		Data []models.UserSmall `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(body.Data) != 0 {
		t.Fatalf("expected empty list, got %+v", body.Data)
	}
}

func TestListUsersStoreErrorReturnsInternalError(t *testing.T) {
	handler := NewHandler(&fakeUserStore{err: errors.New("db down")})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/users", nil)
	rec := httptest.NewRecorder()

	handler.ListUsers(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeUsersErrorEnvelope(t, rec).Error.Code; got != "INTERNAL_ERROR" {
		t.Fatalf("expected INTERNAL_ERROR, got %q", got)
	}
}

func TestGetUserReturnsUserSmall(t *testing.T) {
	store := &fakeUserStore{users: map[int64]models.User{
		42: {
			ID:           42,
			Email:        "alice@example.com",
			Username:     "alice",
			FirstName:    "Alice",
			LastName:     "Liddell",
			Color:        models.UserColorGreen,
			PasswordHash: "secret",
		},
	}}
	handler := NewHandler(store)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/42", nil)
	req.SetPathValue("id", "42")
	rec := httptest.NewRecorder()

	handler.GetUser(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var body struct {
		Data models.UserSmall `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Data.ID != 42 {
		t.Fatalf("expected id 42, got %d", body.Data.ID)
	}
	if body.Data.Username != "alice" {
		t.Fatalf("expected username alice, got %q", body.Data.Username)
	}
	if body.Data.Color != models.UserColorGreen {
		t.Fatalf("expected color green, got %q", body.Data.Color)
	}

	// UserSmall must not leak sensitive fields.
	if raw := rec.Body.String(); strings.Contains(raw, "secret") || strings.Contains(raw, "alice@example.com") {
		t.Fatalf("response leaked sensitive data: %s", raw)
	}
}

func TestGetUserInvalidIDReturnsNotFound(t *testing.T) {
	handler := NewHandler(&fakeUserStore{})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/abc", nil)
	req.SetPathValue("id", "abc")
	rec := httptest.NewRecorder()

	handler.GetUser(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeUsersErrorEnvelope(t, rec).Error.Code; got != "NOT_FOUND" {
		t.Fatalf("expected NOT_FOUND, got %q", got)
	}
}

func TestGetUserMapsStoreErrors(t *testing.T) {
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
			handler := NewHandler(&fakeUserStore{err: tt.err})

			req := httptest.NewRequest(http.MethodGet, "/api/v1/users/42", nil)
			req.SetPathValue("id", "42")
			rec := httptest.NewRecorder()

			handler.GetUser(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("expected %d, got %d: %s", tt.wantStatus, rec.Code, rec.Body.String())
			}
			if got := decodeUsersErrorEnvelope(t, rec).Error.Code; got != tt.wantCode {
				t.Fatalf("expected %s, got %q", tt.wantCode, got)
			}
		})
	}
}

type fakeUserStore struct {
	users map[int64]models.User
	list  []models.User
	err   error
}

func (s *fakeUserStore) ListUsers(_ context.Context) ([]models.User, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.list, nil
}

func (s *fakeUserStore) FindUserByID(_ context.Context, id int64) (models.User, error) {
	if s.err != nil {
		return models.User{}, s.err
	}
	if u, ok := s.users[id]; ok {
		return u, nil
	}
	return models.User{}, ErrUserNotFound
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
