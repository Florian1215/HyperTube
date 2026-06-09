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
	createUserID   int
	createdContent string
	createErr      error
	updateUserID   int
	updatedContent string
	deleteUserID   int
	findErr        error
	updateErr      error
	deleteErr      error
}

func (s *fakeCommentStore) create(ctx context.Context, content string, movieID string, userID int) (models.Comment, error) {
	s.createMovieID = movieID
	s.createUserID = userID
	s.createdContent = content
	if s.createErr != nil {
		return models.Comment{}, s.createErr
	}
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

func TestCreateUsesAuthenticatedUserIDAndPathMovieID(t *testing.T) {
	store := &fakeCommentStore{}
	handler := NewCommentsHandler(store)

	req := httptest.NewRequest(http.MethodPost, "/movies/tt123/comments", strings.NewReader(`{"content":"  hello  ","user_id":999}`))
	req.SetPathValue("id", "tt123")
	rec := httptest.NewRecorder()

	serveWithUser(t, 42, http.HandlerFunc(handler.Create)).ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}
	if store.createMovieID != "tt123" {
		t.Fatalf("expected movie id tt123, got %q", store.createMovieID)
	}
	if store.createUserID != 42 {
		t.Fatalf("expected token user id 42, got %d", store.createUserID)
	}
	if store.createdContent != "hello" {
		t.Fatalf("expected trimmed content, got %q", store.createdContent)
	}

	body := decodeCommentItemEnvelope(t, rec)
	if body.Data.UserID != 42 {
		t.Fatalf("expected response user id 42, got %d", body.Data.UserID)
	}
}

func TestCreateRejectsMissingAuthenticatedUser(t *testing.T) {
	handler := NewCommentsHandler(&fakeCommentStore{})

	req := httptest.NewRequest(http.MethodPost, "/movies/tt123/comments", strings.NewReader(`{"content":"hello"}`))
	req.SetPathValue("id", "tt123")
	rec := httptest.NewRecorder()

	handler.Create(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeCommentErrorEnvelope(t, rec).Error.Code; got != "UNAUTHORIZED" {
		t.Fatalf("expected UNAUTHORIZED, got %q", got)
	}
}

func TestCreateInvalidBodyReturnsFieldValidationError(t *testing.T) {
	handler := NewCommentsHandler(&fakeCommentStore{})

	req := httptest.NewRequest(http.MethodPost, "/movies/tt123/comments", strings.NewReader(`{"content":`))
	req.SetPathValue("id", "tt123")
	rec := httptest.NewRecorder()

	serveWithUser(t, 42, http.HandlerFunc(handler.Create)).ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}

	errorBody := decodeCommentErrorEnvelope(t, rec).Error
	if errorBody.Code != "VALIDATION_ERROR" {
		t.Fatalf("expected VALIDATION_ERROR, got %q", errorBody.Code)
	}
	if got := errorBody.Fields["body"].Message; got != "Invalid request body" {
		t.Fatalf("expected body field validation, got %q", got)
	}
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
	if got := decodeCommentErrorEnvelope(t, rec).Error.Code; got != "NOT_FOUND" {
		t.Fatalf("expected NOT_FOUND, got %q", got)
	}
}

func TestGetReturnsItemEnvelope(t *testing.T) {
	store := &fakeCommentStore{
		comment: &models.Comment{ID: 7, UserID: 42, MovieID: "tt123", Content: "hello"},
	}
	handler := NewCommentsHandler(store)

	req := httptest.NewRequest(http.MethodGet, "/comments/7", nil)
	req.SetPathValue("id", "7")
	rec := httptest.NewRecorder()

	handler.Get(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	body := decodeCommentItemEnvelope(t, rec)
	if body.Data.ID != 7 || body.Data.MovieID != "tt123" || body.Data.Content != "hello" {
		t.Fatalf("unexpected comment envelope: %+v", body.Data)
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
	if got := decodeCommentErrorEnvelope(t, rec).Error.Code; got != "NOT_FOUND" {
		t.Fatalf("expected NOT_FOUND, got %q", got)
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

func decodeCommentItemEnvelope(t *testing.T, rec *httptest.ResponseRecorder) struct {
	Data models.Comment `json:"data"`
} {
	t.Helper()

	var body struct {
		Data models.Comment `json:"data"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return body
}

func decodeCommentErrorEnvelope(t *testing.T, rec *httptest.ResponseRecorder) struct {
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
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return body
}
