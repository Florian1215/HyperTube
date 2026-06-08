package comments

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"hypertube/api/internal/auth"
	"hypertube/api/internal/models"
)

type fakeCommentStore struct {
	comment        *models.Comment
	comments       []models.Comment
	total          int
	createMovieID  string
	updateUserID   int
	updatedContent string
	deleteUserID   int
	findErr        error
	updateErr      error
	deleteErr      error
}

func (s *fakeCommentStore) create(ctx context.Context, content string, movieID string, userID int) (models.Comment, error) {
	s.createMovieID = movieID
	return models.Comment{ID: 1, MovieID: movieID, UserID: userID, Content: content}, nil
}

func (s *fakeCommentStore) findByID(ctx context.Context, id int) (*models.Comment, error) {
	if s.findErr != nil {
		return nil, s.findErr
	}
	if s.comment != nil {
		return s.comment, nil
	}
	return &models.Comment{ID: id, UserID: 42, Content: "original"}, nil
}

func (s *fakeCommentStore) findAll(ctx context.Context, limit, offset int) ([]models.Comment, error) {
	return s.comments, nil
}

func (s *fakeCommentStore) countAll(ctx context.Context) (int, error) {
	if s.total != 0 {
		return s.total, nil
	}
	return len(s.comments), nil
}

func (s *fakeCommentStore) update(ctx context.Context, content string, id int, userID int) (models.Comment, error) {
	s.updateUserID = userID
	s.updatedContent = content
	if s.updateErr != nil {
		return models.Comment{}, s.updateErr
	}
	return models.Comment{ID: 1, UserID: userID, Content: content}, nil
}

func (s *fakeCommentStore) delete(ctx context.Context, id int, userID int) error {
	s.deleteUserID = userID
	return s.deleteErr
}

func TestListReturnsPaginatedComments(t *testing.T) {
	store := &fakeCommentStore{
		comments: []models.Comment{
			{ID: 1, UserID: 42, MovieID: "tt123", Content: "hello"},
		},
		total: 25,
	}
	handler := NewCommentsHandler(store)

	req := httptest.NewRequest(http.MethodGet, "/comments?page=0", nil)
	rec := httptest.NewRecorder()

	serveWithUser(t, 42, http.HandlerFunc(handler.List)).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var body struct {
		Data []models.Comment `json:"data"`
		Meta struct {
			Total   int `json:"total"`
			Page    int `json:"page"`
			PerPage int `json:"per_page"`
		} `json:"meta"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Meta.Total != 25 || body.Meta.Page != 0 || body.Meta.PerPage != commentPageLimit {
		t.Fatalf("unexpected meta: %+v", body.Meta)
	}
}

func TestGetInvalidIDReturnsNotFound(t *testing.T) {
	handler := NewCommentsHandler(&fakeCommentStore{})

	req := httptest.NewRequest(http.MethodGet, "/comments/not-an-id", nil)
	req.SetPathValue("id", "not-an-id")
	rec := httptest.NewRecorder()

	handler.Get(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestGetMissingCommentReturnsNotFound(t *testing.T) {
	handler := NewCommentsHandler(&fakeCommentStore{findErr: ErrNotFound})

	req := httptest.NewRequest(http.MethodGet, "/comments/404", nil)
	req.SetPathValue("id", "404")
	rec := httptest.NewRecorder()

	handler.Get(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestUpdateUsesAuthenticatedUserID(t *testing.T) {
	store := &fakeCommentStore{}
	handler := NewCommentsHandler(store)

	req := httptest.NewRequest(http.MethodPatch, "/comments/1", strings.NewReader(`{"content":"edited","user_id":999}`))
	req.SetPathValue("id", "1")
	rec := httptest.NewRecorder()

	serveWithUser(t, 42, http.HandlerFunc(handler.Update)).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if store.updateUserID != 42 {
		t.Fatalf("expected token user id 42, got %d", store.updateUserID)
	}
}

func TestUpdateTrimsContent(t *testing.T) {
	store := &fakeCommentStore{}
	handler := NewCommentsHandler(store)

	req := httptest.NewRequest(http.MethodPatch, "/comments/1", strings.NewReader(`{"content":"  edited  "}`))
	req.SetPathValue("id", "1")
	rec := httptest.NewRecorder()

	serveWithUser(t, 42, http.HandlerFunc(handler.Update)).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if store.updatedContent != "edited" {
		t.Fatalf("expected trimmed content, got %q", store.updatedContent)
	}
}

func TestUpdateInvalidBodyReturnsFieldValidationError(t *testing.T) {
	store := &fakeCommentStore{}
	handler := NewCommentsHandler(store)

	req := httptest.NewRequest(http.MethodPatch, "/comments/1", strings.NewReader(`{"content":`))
	req.SetPathValue("id", "1")
	rec := httptest.NewRecorder()

	serveWithUser(t, 42, http.HandlerFunc(handler.Update)).ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}

	var body struct {
		Error struct {
			Code   string `json:"code"`
			Fields map[string]struct {
				Message string `json:"message"`
			} `json:"fields"`
		} `json:"error"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Error.Code != "VALIDATION_ERROR" {
		t.Fatalf("expected VALIDATION_ERROR, got %q", body.Error.Code)
	}
	if got := body.Error.Fields["body"].Message; got != "Invalid request body" {
		t.Fatalf("expected body field validation, got %q", got)
	}
}

func TestUpdateInvalidContentTypeReturnsContentFieldValidationError(t *testing.T) {
	store := &fakeCommentStore{}
	handler := NewCommentsHandler(store)

	req := httptest.NewRequest(http.MethodPatch, "/comments/1", strings.NewReader(`{"content":436}`))
	req.SetPathValue("id", "1")
	rec := httptest.NewRecorder()

	serveWithUser(t, 42, http.HandlerFunc(handler.Update)).ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}

	var body struct {
		Error struct {
			Code   string `json:"code"`
			Fields map[string]struct {
				Message string `json:"message"`
			} `json:"fields"`
		} `json:"error"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Error.Code != "VALIDATION_ERROR" {
		t.Fatalf("expected VALIDATION_ERROR, got %q", body.Error.Code)
	}
	if got := body.Error.Fields["content"].Message; got != "Invalid request body" {
		t.Fatalf("expected content field validation, got %q", got)
	}
	if _, ok := body.Error.Fields["body"]; ok {
		t.Fatalf("did not expect body field validation, got %+v", body.Error.Fields)
	}
}

func TestUpdateMissingCommentWinsOverInvalidBody(t *testing.T) {
	store := &fakeCommentStore{findErr: ErrNotFound}
	handler := NewCommentsHandler(store)

	req := httptest.NewRequest(http.MethodPatch, "/comments/1", strings.NewReader(`{"content":436}`))
	req.SetPathValue("id", "1")
	rec := httptest.NewRecorder()

	serveWithUser(t, 42, http.HandlerFunc(handler.Update)).ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestDeleteUsesAuthenticatedUserID(t *testing.T) {
	store := &fakeCommentStore{}
	handler := NewCommentsHandler(store)

	req := httptest.NewRequest(http.MethodDelete, "/comments/1", strings.NewReader(`{"user_id":999}`))
	req.SetPathValue("id", "1")
	rec := httptest.NewRecorder()

	serveWithUser(t, 42, http.HandlerFunc(handler.Delete)).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if store.deleteUserID != 42 {
		t.Fatalf("expected token user id 42, got %d", store.deleteUserID)
	}
}

func TestUpdateReturnsNotFoundWhenCommentIsNotOwnedByUser(t *testing.T) {
	store := &fakeCommentStore{updateErr: ErrNotFound}
	handler := NewCommentsHandler(store)

	req := httptest.NewRequest(http.MethodPatch, "/comments/1", strings.NewReader(`{"content":"edited","user_id":999}`))
	req.SetPathValue("id", "1")
	rec := httptest.NewRecorder()

	serveWithUser(t, 42, http.HandlerFunc(handler.Update)).ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", rec.Code, rec.Body.String())
	}
	if store.updateUserID != 42 {
		t.Fatalf("expected token user id 42, got %d", store.updateUserID)
	}
}

func TestDeleteReturnsNotFoundWhenCommentIsNotOwnedByUser(t *testing.T) {
	store := &fakeCommentStore{deleteErr: ErrNotFound}
	handler := NewCommentsHandler(store)

	req := httptest.NewRequest(http.MethodDelete, "/comments/1", strings.NewReader(`{"user_id":999}`))
	req.SetPathValue("id", "1")
	rec := httptest.NewRecorder()

	serveWithUser(t, 42, http.HandlerFunc(handler.Delete)).ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", rec.Code, rec.Body.String())
	}
	if store.deleteUserID != 42 {
		t.Fatalf("expected token user id 42, got %d", store.deleteUserID)
	}
}

func serveWithUser(t *testing.T, userID int64, next http.Handler) http.Handler {
	t.Helper()

	tokens, err := auth.NewTokenManager("0123456789abcdef0123456789abcdef", "hypertube-test")
	if err != nil {
		t.Fatalf("new token manager: %v", err)
	}
	token, _, err := tokens.CreateAccessToken(userID)
	if err != nil {
		t.Fatalf("create token: %v", err)
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Header.Set("Authorization", "Bearer "+token)
		auth.RequireAuth(tokens)(next).ServeHTTP(w, r)
	})
}
