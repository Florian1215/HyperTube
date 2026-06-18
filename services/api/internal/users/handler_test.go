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

func TestListUsersReturnsUserSmallList(t *testing.T) {
	store := &fakeUserStore{list: []models.User{
		{ID: 1, Username: "alice", Email: "alice@example.com", FirstName: "alice", LastName: "gu", PasswordHash: "secret", Color: models.UserColorGreen},
		{ID: 2, Username: "bob", Email: "bob@example.com", FirstName: "alice", LastName: "gu", PasswordHash: "hunter2", Color: models.UserColorBlue},
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
			Total   int `json:"total"`
			Page    int `json:"page"`
			PerPage int `json:"per_page"`
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
	if body.Meta.Page != 0 {
		t.Fatalf("expected page 0, got %d", body.Meta.Page)
	}
	if body.Meta.PerPage != userPageLimit {
		t.Fatalf("expected per_page %d, got %d", userPageLimit, body.Meta.PerPage)
	}
	if store.gotLimit != userPageLimit {
		t.Fatalf("expected limit %d, got %d", userPageLimit, store.gotLimit)
	}
	if store.gotOffset != 0 {
		t.Fatalf("expected offset 0, got %d", store.gotOffset)
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

func TestListUsersIncludesNullProfilePicture(t *testing.T) {
	store := &fakeUserStore{list: []models.User{
		{
			ID:        1,
			Username:  "alice",
			FirstName: "Alice",
			LastName:  "Liddell",
			Color:     models.UserColorGreen,
		},
	}}
	handler := NewHandler(store)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/users", nil)
	rec := httptest.NewRecorder()

	handler.ListUsers(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var body struct {
		Data []map[string]json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(body.Data) != 1 {
		t.Fatalf("expected 1 user, got %d", len(body.Data))
	}
	assertRawJSONField(t, body.Data[0], "profile_picture", "null")
}

func TestListUsersUsesPageOneQueryForSecondPagePagination(t *testing.T) {
	store := &fakeUserStore{
		list: []models.User{
			{ID: 13, Username: "page_two_user", FirstName: "Page", LastName: "Two", Color: models.UserColorBlue},
		},
		total: 25,
	}
	handler := NewHandler(store)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/users?page=1", nil)
	rec := httptest.NewRecorder()

	handler.ListUsers(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var body struct {
		Data []models.UserSmall `json:"data"`
		Meta struct {
			Total   int `json:"total"`
			Page    int `json:"page"`
			PerPage int `json:"per_page"`
		} `json:"meta"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if store.gotLimit != userPageLimit {
		t.Fatalf("expected limit %d, got %d", userPageLimit, store.gotLimit)
	}
	if store.gotOffset != userPageLimit {
		t.Fatalf("expected offset %d, got %d", userPageLimit, store.gotOffset)
	}
	if body.Meta.Total != 25 {
		t.Fatalf("expected total 25, got %d", body.Meta.Total)
	}
	if body.Meta.Page != 1 {
		t.Fatalf("expected page 1, got %d", body.Meta.Page)
	}
	if body.Meta.PerPage != userPageLimit {
		t.Fatalf("expected per_page %d, got %d", userPageLimit, body.Meta.PerPage)
	}
	if len(body.Data) != 1 || body.Data[0].Username != "page_two_user" {
		t.Fatalf("unexpected users: %+v", body.Data)
	}
}

func TestListUsersInvalidPageFallsBackToZero(t *testing.T) {
	tests := []struct {
		name string
		path string
	}{
		{name: "missing page", path: "/api/v1/users"},
		{name: "empty page", path: "/api/v1/users?page="},
		{name: "text page", path: "/api/v1/users?page=abc"},
		{name: "negative page", path: "/api/v1/users?page=-1"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := &fakeUserStore{
				list: []models.User{
					{ID: 1, Username: "alice", FirstName: "Alice", LastName: "Example", Color: models.UserColorGreen},
				},
				total: 1,
			}
			handler := NewHandler(store)

			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			rec := httptest.NewRecorder()

			handler.ListUsers(rec, req)

			if rec.Code != http.StatusOK {
				t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
			}
			if store.gotOffset != 0 {
				t.Fatalf("expected offset 0 for invalid page, got %d", store.gotOffset)
			}

			var body struct {
				Meta struct {
					Page int `json:"page"`
				} `json:"meta"`
			}
			if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
				t.Fatalf("decode response: %v", err)
			}
			if body.Meta.Page != 0 {
				t.Fatalf("expected page 0 for invalid page, got %d", body.Meta.Page)
			}
		})
	}
}

func TestListUsersAcceptsZeroPageQuery(t *testing.T) {
	store := &fakeUserStore{
		list: []models.User{
			{ID: 1, Username: "alice", FirstName: "Alice", LastName: "Example", Color: models.UserColorGreen},
		},
		total: 1,
	}
	handler := NewHandler(store)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/users?page=0", nil)
	rec := httptest.NewRecorder()

	handler.ListUsers(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if store.gotOffset != 0 {
		t.Fatalf("expected offset 0, got %d", store.gotOffset)
	}

	var body struct {
		Meta struct {
			Page int `json:"page"`
		} `json:"meta"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Meta.Page != 0 {
		t.Fatalf("expected page 0, got %d", body.Meta.Page)
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

func TestListUsersCountErrorReturnsInternalError(t *testing.T) {
	handler := NewHandler(&fakeUserStore{countErr: errors.New("db down")})

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

func TestGetUserIncludesNullProfilePicture(t *testing.T) {
	store := &fakeUserStore{users: map[int64]models.User{
		42: {
			ID:        42,
			Username:  "alice",
			FirstName: "Alice",
			LastName:  "Liddell",
			Color:     models.UserColorGreen,
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
		Data map[string]json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	assertRawJSONField(t, body.Data, "profile_picture", "null")
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

func TestUpdateUserAppliesPartialProfileUpdate(t *testing.T) {
	store := &fakeUserStore{users: map[int64]models.User{
		42: {
			ID:             42,
			Email:          "old@example.com",
			Username:       "old_username",
			FirstName:      "Old",
			LastName:       "Name",
			ProfilePicture: "https://example.com/old.png",
			Color:          models.UserColorPurple,
		},
	}}
	handler := NewHandler(store)

	rec := serveUpdateUser(t, handler, 42, "42", `{
		"email":"  New@Example.COM  ",
		"username":"  new_username  ",
		"first_name":"  Alice  ",
		"last_name":"  Liddell  ",
		"profile_picture":"  https://example.com/avatar.png  ",
		"color":"green"
	}`)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if !store.updated || store.updatedID != 42 {
		t.Fatalf("expected update for user 42, got updated=%v id=%d", store.updated, store.updatedID)
	}
	assertStringPointer(t, "email", store.updatedParams.Email, "new@example.com")
	assertStringPointer(t, "username", store.updatedParams.Username, "new_username")
	assertStringPointer(t, "first_name", store.updatedParams.FirstName, "Alice")
	assertStringPointer(t, "last_name", store.updatedParams.LastName, "Liddell")
	assertStringPointer(t, "profile_picture", store.updatedParams.ProfilePicture, "https://example.com/avatar.png")
	assertStringPointer(t, "color", store.updatedParams.Color, models.UserColorGreen)

	var body struct {
		Data models.UserResponse `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Data.Email != "new@example.com" || body.Data.Username != "new_username" {
		t.Fatalf("unexpected response user: %+v", body.Data)
	}
	if body.Data.Color != models.UserColorGreen {
		t.Fatalf("expected response color green, got %q", body.Data.Color)
	}
	if body.Data.ProfilePicture == nil || *body.Data.ProfilePicture != "https://example.com/avatar.png" {
		t.Fatalf("expected response profile_picture URL, got %+v", body.Data.ProfilePicture)
	}
}

func TestUpdateUserCanRemoveProfilePicture(t *testing.T) {
	store := &fakeUserStore{users: map[int64]models.User{
		42: {ID: 42, Email: "alice@example.com", Username: "alice", ProfilePicture: "https://example.com/avatar.png"},
	}}
	handler := NewHandler(store)

	rec := serveUpdateUser(t, handler, 42, "42", `{"profile_picture":null}`)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if !store.updatedParams.ProfilePictureSet {
		t.Fatalf("expected profile picture to be marked for update")
	}
	if store.updatedParams.ProfilePicture != nil {
		t.Fatalf("expected nil profile picture, got %q", *store.updatedParams.ProfilePicture)
	}

	var body struct {
		Data map[string]json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	assertRawJSONField(t, body.Data, "profile_picture", "null")
}

func TestUpdateUserEmptyProfilePictureReturnsNull(t *testing.T) {
	store := &fakeUserStore{users: map[int64]models.User{
		42: {ID: 42, Email: "alice@example.com", Username: "alice", ProfilePicture: "https://example.com/avatar.png"},
	}}
	handler := NewHandler(store)

	rec := serveUpdateUser(t, handler, 42, "42", `{"profile_picture":""}`)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if !store.updatedParams.ProfilePictureSet {
		t.Fatalf("expected profile picture to be marked for update")
	}
	if store.updatedParams.ProfilePicture != nil {
		t.Fatalf("expected nil profile picture, got %q", *store.updatedParams.ProfilePicture)
	}

	var body struct {
		Data map[string]json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	assertRawJSONField(t, body.Data, "profile_picture", "null")
}

func TestUpdateUserHashesPassword(t *testing.T) {
	store := &fakeUserStore{users: map[int64]models.User{
		42: {ID: 42, Email: "alice@example.com", Username: "alice"},
	}}
	handler := NewHandler(store)

	rec := serveUpdateUser(t, handler, 42, "42", `{"password":"new-secret-password"}`)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if store.updatedParams.PasswordHash == nil {
		t.Fatalf("expected password hash to be sent to store")
	}
	if *store.updatedParams.PasswordHash == "new-secret-password" {
		t.Fatalf("password was stored as plaintext")
	}
	if !auth.CheckPassword(*store.updatedParams.PasswordHash, "new-secret-password") {
		t.Fatalf("stored password hash does not match password")
	}
	if strings.Contains(rec.Body.String(), "new-secret-password") || strings.Contains(rec.Body.String(), *store.updatedParams.PasswordHash) {
		t.Fatalf("response leaked password material: %s", rec.Body.String())
	}
}

func TestUpdateUserRejectsOAuthEmailUpdate(t *testing.T) {
	store := &fakeUserStore{
		oauthUsers: map[int64]bool{42: true},
	}
	handler := NewHandler(store)

	rec := serveUpdateUser(t, handler, 42, "42", `{"email":"new@example.com"}`)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	body := decodeUsersErrorEnvelope(t, rec)
	if body.Error.Code != "VALIDATION_ERROR" {
		t.Fatalf("expected VALIDATION_ERROR, got %q", body.Error.Code)
	}
	if _, ok := body.Error.Fields["email"]; !ok {
		t.Fatalf("expected email field error, got %+v", body.Error.Fields)
	}
	if _, ok := body.Error.Fields["password"]; ok {
		t.Fatalf("did not expect password field error, got %+v", body.Error.Fields)
	}
	if store.updated {
		t.Fatalf("store update should not be called for blocked OAuth email update")
	}
	if !store.oauthChecked || store.oauthCheckedID != 42 {
		t.Fatalf("expected OAuth check for user 42, got checked=%v id=%d", store.oauthChecked, store.oauthCheckedID)
	}
}

func TestUpdateUserRejectsOAuthPasswordUpdate(t *testing.T) {
	store := &fakeUserStore{
		oauthUsers: map[int64]bool{42: true},
	}
	handler := NewHandler(store)

	rec := serveUpdateUser(t, handler, 42, "42", `{"password":"new-secret-password"}`)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	body := decodeUsersErrorEnvelope(t, rec)
	if body.Error.Code != "VALIDATION_ERROR" {
		t.Fatalf("expected VALIDATION_ERROR, got %q", body.Error.Code)
	}
	if _, ok := body.Error.Fields["password"]; !ok {
		t.Fatalf("expected password field error, got %+v", body.Error.Fields)
	}
	if _, ok := body.Error.Fields["email"]; ok {
		t.Fatalf("did not expect email field error, got %+v", body.Error.Fields)
	}
	if store.updated {
		t.Fatalf("store update should not be called for blocked OAuth password update")
	}
	if !store.oauthChecked || store.oauthCheckedID != 42 {
		t.Fatalf("expected OAuth check for user 42, got checked=%v id=%d", store.oauthChecked, store.oauthCheckedID)
	}
}

func TestUpdateUserRejectsOAuthEmailAndPasswordUpdate(t *testing.T) {
	store := &fakeUserStore{
		oauthUsers: map[int64]bool{42: true},
	}
	handler := NewHandler(store)

	rec := serveUpdateUser(t, handler, 42, "42", `{
		"email":"new@example.com",
		"password":"new-secret-password"
	}`)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	body := decodeUsersErrorEnvelope(t, rec)
	if body.Error.Code != "VALIDATION_ERROR" {
		t.Fatalf("expected VALIDATION_ERROR, got %q", body.Error.Code)
	}
	if _, ok := body.Error.Fields["email"]; !ok {
		t.Fatalf("expected email field error, got %+v", body.Error.Fields)
	}
	if _, ok := body.Error.Fields["password"]; !ok {
		t.Fatalf("expected password field error, got %+v", body.Error.Fields)
	}
	if store.updated {
		t.Fatalf("store update should not be called for blocked OAuth credential update")
	}
	if !store.oauthChecked || store.oauthCheckedID != 42 {
		t.Fatalf("expected OAuth check for user 42, got checked=%v id=%d", store.oauthChecked, store.oauthCheckedID)
	}
}

func TestUpdateUserAllowsOAuthAvatarFields(t *testing.T) {
	tests := []struct {
		name   string
		body   string
		assert func(t *testing.T, store *fakeUserStore)
	}{
		{
			name: "color",
			body: `{"color":"green"}`,
			assert: func(t *testing.T, store *fakeUserStore) {
				assertStringPointer(t, "color", store.updatedParams.Color, models.UserColorGreen)
				if store.updatedParams.ProfilePictureSet {
					t.Fatalf("did not expect profile picture update")
				}
			},
		},
		{
			name: "profile picture URL",
			body: `{"profile_picture":"https://example.com/avatar.png"}`,
			assert: func(t *testing.T, store *fakeUserStore) {
				if !store.updatedParams.ProfilePictureSet {
					t.Fatalf("expected profile picture update")
				}
				assertStringPointer(t, "profile_picture", store.updatedParams.ProfilePicture, "https://example.com/avatar.png")
			},
		},
		{
			name: "profile picture null",
			body: `{"profile_picture":null}`,
			assert: func(t *testing.T, store *fakeUserStore) {
				if !store.updatedParams.ProfilePictureSet {
					t.Fatalf("expected profile picture removal")
				}
				if store.updatedParams.ProfilePicture != nil {
					t.Fatalf("expected nil profile picture, got %q", *store.updatedParams.ProfilePicture)
				}
			},
		},
		{
			name: "profile picture empty string",
			body: `{"profile_picture":""}`,
			assert: func(t *testing.T, store *fakeUserStore) {
				if !store.updatedParams.ProfilePictureSet {
					t.Fatalf("expected profile picture removal")
				}
				if store.updatedParams.ProfilePicture != nil {
					t.Fatalf("expected nil profile picture, got %q", *store.updatedParams.ProfilePicture)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := &fakeUserStore{
				users: map[int64]models.User{
					42: {
						ID:             42,
						Email:          "oauth@example.com",
						Username:       "oauth_user",
						ProfilePicture: "https://example.com/old.png",
						Color:          models.UserColorPurple,
					},
				},
				oauthUsers: map[int64]bool{42: true},
			}
			handler := NewHandler(store)

			rec := serveUpdateUser(t, handler, 42, "42", tt.body)

			if rec.Code != http.StatusOK {
				t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
			}
			if !store.updated || store.updatedID != 42 {
				t.Fatalf("expected update for user 42, got updated=%v id=%d", store.updated, store.updatedID)
			}
			tt.assert(t, store)
			if store.oauthChecked {
				t.Fatalf("OAuth check should not run for avatar-only updates")
			}
		})
	}
}

func TestUpdateUserRejectsOAuthProviderManagedFields(t *testing.T) {
	store := &fakeUserStore{
		oauthUsers: map[int64]bool{42: true},
	}
	handler := NewHandler(store)

	rec := serveUpdateUser(t, handler, 42, "42", `{
		"username":"new_username",
		"first_name":"New",
		"last_name":"Name"
	}`)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	body := decodeUsersErrorEnvelope(t, rec)
	if body.Error.Code != "VALIDATION_ERROR" {
		t.Fatalf("expected VALIDATION_ERROR, got %q", body.Error.Code)
	}
	for _, field := range []string{"username", "first_name", "last_name"} {
		if _, ok := body.Error.Fields[field]; !ok {
			t.Fatalf("expected %s field error, got %+v", field, body.Error.Fields)
		}
	}
	if store.updated {
		t.Fatalf("store update should not be called for blocked OAuth provider-managed field update")
	}
	if !store.oauthChecked || store.oauthCheckedID != 42 {
		t.Fatalf("expected OAuth check for user 42, got checked=%v id=%d", store.oauthChecked, store.oauthCheckedID)
	}
}

func TestUpdateUserRejectsOAuthMixedAllowedAndRestrictedFields(t *testing.T) {
	store := &fakeUserStore{
		oauthUsers: map[int64]bool{42: true},
	}
	handler := NewHandler(store)

	rec := serveUpdateUser(t, handler, 42, "42", `{
		"color":"green",
		"username":"new_username"
	}`)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	body := decodeUsersErrorEnvelope(t, rec)
	if body.Error.Code != "VALIDATION_ERROR" {
		t.Fatalf("expected VALIDATION_ERROR, got %q", body.Error.Code)
	}
	if _, ok := body.Error.Fields["username"]; !ok {
		t.Fatalf("expected username field error, got %+v", body.Error.Fields)
	}
	if store.updated {
		t.Fatalf("store update should not be called when a restricted OAuth field is present")
	}
	if !store.oauthChecked || store.oauthCheckedID != 42 {
		t.Fatalf("expected OAuth check for user 42, got checked=%v id=%d", store.oauthChecked, store.oauthCheckedID)
	}
}

func TestUpdateUserAllowsEmailForPasswordUser(t *testing.T) {
	store := &fakeUserStore{users: map[int64]models.User{
		42: {ID: 42, Email: "old@example.com", Username: "alice"},
	}}
	handler := NewHandler(store)

	rec := serveUpdateUser(t, handler, 42, "42", `{"email":"new@example.com"}`)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	assertStringPointer(t, "email", store.updatedParams.Email, "new@example.com")
	if !store.oauthChecked || store.oauthCheckedID != 42 {
		t.Fatalf("expected OAuth check for credential update, got checked=%v id=%d", store.oauthChecked, store.oauthCheckedID)
	}
}

func TestUpdateUserAllowsProviderManagedFieldsForPasswordUser(t *testing.T) {
	store := &fakeUserStore{users: map[int64]models.User{
		42: {ID: 42, Email: "alice@example.com", Username: "old_username", FirstName: "Old", LastName: "Name"},
	}}
	handler := NewHandler(store)

	rec := serveUpdateUser(t, handler, 42, "42", `{
		"username":"new_username",
		"first_name":"New",
		"last_name":"Name"
	}`)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	assertStringPointer(t, "username", store.updatedParams.Username, "new_username")
	assertStringPointer(t, "first_name", store.updatedParams.FirstName, "New")
	assertStringPointer(t, "last_name", store.updatedParams.LastName, "Name")
	if !store.oauthChecked || store.oauthCheckedID != 42 {
		t.Fatalf("expected OAuth check for provider-managed field update, got checked=%v id=%d", store.oauthChecked, store.oauthCheckedID)
	}
}

func TestUpdateUserOAuthStatusErrorReturnsInternalError(t *testing.T) {
	store := &fakeUserStore{oauthErr: errors.New("db down")}
	handler := NewHandler(store)

	rec := serveUpdateUser(t, handler, 42, "42", `{"email":"new@example.com"}`)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d: %s", rec.Code, rec.Body.String())
	}
	body := decodeUsersErrorEnvelope(t, rec)
	if body.Error.Code != "INTERNAL_ERROR" {
		t.Fatalf("expected INTERNAL_ERROR, got %q", body.Error.Code)
	}
	if store.updated {
		t.Fatalf("store update should not be called when OAuth status lookup fails")
	}
	if !store.oauthChecked || store.oauthCheckedID != 42 {
		t.Fatalf("expected OAuth check for user 42, got checked=%v id=%d", store.oauthChecked, store.oauthCheckedID)
	}
}

func TestUpdateUserValidatesEmailBeforeOAuthPolicy(t *testing.T) {
	store := &fakeUserStore{
		oauthUsers: map[int64]bool{42: true},
	}
	handler := NewHandler(store)

	rec := serveUpdateUser(t, handler, 42, "42", `{"email":"not-an-email"}`)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	body := decodeUsersErrorEnvelope(t, rec)
	if body.Error.Code != "VALIDATION_ERROR" {
		t.Fatalf("expected VALIDATION_ERROR, got %q", body.Error.Code)
	}
	if _, ok := body.Error.Fields["email"]; !ok {
		t.Fatalf("expected email field error, got %+v", body.Error.Fields)
	}
	if store.oauthChecked {
		t.Fatalf("OAuth check should not run before body validation succeeds")
	}
	if store.updated {
		t.Fatalf("store update should not be called on validation error")
	}
}

func TestUpdateUserRejectsDifferentAuthenticatedUser(t *testing.T) {
	store := &fakeUserStore{}
	handler := NewHandler(store)

	rec := serveUpdateUser(t, handler, 42, "7", `{"color":"green"}`)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", rec.Code, rec.Body.String())
	}
	if store.updated {
		t.Fatalf("store update should not be called for another user's profile")
	}
	if got := decodeUsersErrorEnvelope(t, rec).Error.Code; got != "FORBIDDEN" {
		t.Fatalf("expected FORBIDDEN, got %q", got)
	}
}

func TestUpdateUserRejectsMissingAuthContext(t *testing.T) {
	handler := NewHandler(&fakeUserStore{})

	req := httptest.NewRequest(http.MethodPatch, "/api/v1/users/42", strings.NewReader(`{"color":"green"}`))
	req.SetPathValue("id", "42")
	rec := httptest.NewRecorder()

	handler.UpdateUser(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeUsersErrorEnvelope(t, rec).Error.Code; got != "UNAUTHORIZED" {
		t.Fatalf("expected UNAUTHORIZED, got %q", got)
	}
}

func TestUpdateUserValidationErrors(t *testing.T) {
	tests := []struct {
		name       string
		pathID     string
		body       string
		wantStatus int
		wantCode   string
		wantField  string
	}{
		{name: "invalid id", pathID: "abc", body: `{"color":"green"}`, wantStatus: http.StatusNotFound, wantCode: "NOT_FOUND"},
		{name: "malformed JSON", pathID: "42", body: `{"color":`, wantStatus: http.StatusBadRequest, wantCode: "BAD_REQUEST"},
		{name: "unknown field", pathID: "42", body: `{"role":"admin"}`, wantStatus: http.StatusBadRequest, wantCode: "BAD_REQUEST"},
		{name: "empty object", pathID: "42", body: `{}`, wantStatus: http.StatusBadRequest, wantCode: "VALIDATION_ERROR", wantField: "body"},
		{name: "invalid color", pathID: "42", body: `{"color":"orange"}`, wantStatus: http.StatusBadRequest, wantCode: "VALIDATION_ERROR", wantField: "color"},
		{name: "invalid email", pathID: "42", body: `{"email":"not-an-email"}`, wantStatus: http.StatusBadRequest, wantCode: "VALIDATION_ERROR", wantField: "email"},
		{name: "short password", pathID: "42", body: `{"password":"short"}`, wantStatus: http.StatusBadRequest, wantCode: "VALIDATION_ERROR", wantField: "password"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := &fakeUserStore{}
			handler := NewHandler(store)

			rec := serveUpdateUser(t, handler, 42, tt.pathID, tt.body)

			if rec.Code != tt.wantStatus {
				t.Fatalf("expected %d, got %d: %s", tt.wantStatus, rec.Code, rec.Body.String())
			}
			body := decodeUsersErrorEnvelope(t, rec)
			if body.Error.Code != tt.wantCode {
				t.Fatalf("expected %s, got %q", tt.wantCode, body.Error.Code)
			}
			if tt.wantField != "" {
				if _, ok := body.Error.Fields[tt.wantField]; !ok {
					t.Fatalf("expected field error for %q, got %+v", tt.wantField, body.Error.Fields)
				}
			}
			if store.updated {
				t.Fatalf("store update should not be called on validation error")
			}
		})
	}
}

func TestUpdateUserMapsStoreErrors(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantStatus int
		wantCode   string
		wantField  string
	}{
		{name: "missing user", err: ErrUserNotFound, wantStatus: http.StatusNotFound, wantCode: "NOT_FOUND"},
		{name: "duplicate email", err: duplicateUserError("email"), wantStatus: http.StatusConflict, wantCode: "ALREADY_EXIST_ERROR", wantField: "email"},
		{name: "duplicate username", err: duplicateUserError("username"), wantStatus: http.StatusConflict, wantCode: "ALREADY_EXIST_ERROR", wantField: "username"},
		{name: "internal", err: errors.New("db down"), wantStatus: http.StatusInternalServerError, wantCode: "INTERNAL_ERROR"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := NewHandler(&fakeUserStore{updateErr: tt.err})

			rec := serveUpdateUser(t, handler, 42, "42", `{"color":"green"}`)

			if rec.Code != tt.wantStatus {
				t.Fatalf("expected %d, got %d: %s", tt.wantStatus, rec.Code, rec.Body.String())
			}
			body := decodeUsersErrorEnvelope(t, rec)
			if body.Error.Code != tt.wantCode {
				t.Fatalf("expected %s, got %q", tt.wantCode, body.Error.Code)
			}
			if tt.wantField != "" {
				if _, ok := body.Error.Fields[tt.wantField]; !ok {
					t.Fatalf("expected field error for %q, got %+v", tt.wantField, body.Error.Fields)
				}
			}
		})
	}
}

type fakeUserStore struct {
	users          map[int64]models.User
	list           []models.User
	total          int
	err            error
	countErr       error
	updateErr      error
	oauthUsers     map[int64]bool
	oauthErr       error
	updated        bool
	updatedID      int64
	updatedParams  UpdateUserParams
	oauthChecked   bool
	oauthCheckedID int64
	gotLimit       int
	gotOffset      int
}

func (s *fakeUserStore) ListUsers(_ context.Context, limit, offset int) ([]models.User, error) {
	s.gotLimit = limit
	s.gotOffset = offset

	if s.err != nil {
		return nil, s.err
	}
	return s.list, nil
}

func (s *fakeUserStore) CountUsers(_ context.Context) (int, error) {
	if s.countErr != nil {
		return 0, s.countErr
	}
	if s.total != 0 {
		return s.total, nil
	}
	return len(s.list), nil
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

func (s *fakeUserStore) UserHasOAuthAccount(_ context.Context, id int64) (bool, error) {
	s.oauthChecked = true
	s.oauthCheckedID = id
	if s.oauthErr != nil {
		return false, s.oauthErr
	}
	return s.oauthUsers[id], nil
}

func (s *fakeUserStore) UpdateUser(_ context.Context, id int64, params UpdateUserParams) (models.User, error) {
	s.updated = true
	s.updatedID = id
	s.updatedParams = params

	if s.updateErr != nil {
		return models.User{}, s.updateErr
	}

	u := models.User{ID: id}
	if existing, ok := s.users[id]; ok {
		u = existing
	}
	if params.Email != nil {
		u.Email = *params.Email
	}
	if params.Username != nil {
		u.Username = *params.Username
	}
	if params.FirstName != nil {
		u.FirstName = *params.FirstName
	}
	if params.LastName != nil {
		u.LastName = *params.LastName
	}
	if params.PasswordHash != nil {
		u.PasswordHash = *params.PasswordHash
	}
	if params.ProfilePictureSet {
		u.ProfilePicture = ""
		if params.ProfilePicture != nil {
			u.ProfilePicture = *params.ProfilePicture
		}
	}
	if params.Color != nil {
		u.Color = *params.Color
	}
	return u, nil
}

func serveUpdateUser(t *testing.T, handler *Handler, authenticatedUserID int64, pathID string, body string) *httptest.ResponseRecorder {
	t.Helper()

	req := httptest.NewRequest(http.MethodPatch, "/api/v1/users/"+pathID, strings.NewReader(body))
	req.SetPathValue("id", pathID)
	rec := httptest.NewRecorder()

	auth.DevAuthenticateAs(authenticatedUserID)(http.HandlerFunc(handler.UpdateUser)).ServeHTTP(rec, req)
	return rec
}

func assertStringPointer(t *testing.T, name string, got *string, want string) {
	t.Helper()

	if got == nil {
		t.Fatalf("expected %s to be set to %q, got nil", name, want)
	}
	if *got != want {
		t.Fatalf("expected %s %q, got %q", name, want, *got)
	}
}

func assertRawJSONField(t *testing.T, fields map[string]json.RawMessage, field string, want string) {
	t.Helper()

	raw, ok := fields[field]
	if !ok {
		t.Fatalf("expected %s field, got fields: %+v", field, fields)
	}
	if string(raw) != want {
		t.Fatalf("expected %s to be %s, got %s", field, want, raw)
	}
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
