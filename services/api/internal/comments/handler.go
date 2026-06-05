package comments

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"hypertube/api/internal/auth"
	"hypertube/api/internal/i18n"
	"hypertube/api/internal/models"
	"hypertube/api/internal/respond"
)

type CommentsHandler struct {
	store CommentStore
}

func NewCommentsHandler(store CommentStore) *CommentsHandler {
	return &CommentsHandler{store: store}
}

type CommentStore interface {
	create(ctx context.Context, content string, movieID int, userID int) (models.Comment, error)
	findByID(ctx context.Context, id int) (*models.Comment, error)
	findAll(ctx context.Context) ([]models.Comment, error)
	update(ctx context.Context, content string, id int, userID int) (models.Comment, error)
	delete(ctx context.Context, id int, userID int) error
}

func parsePositiveID(raw string) (int, bool) {
	id, err := strconv.Atoi(raw)
	if err != nil || id <= 0 {
		return 0, false
	}
	return id, true
}

func (h *CommentsHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		respond.LocalizedError(w, r, http.StatusUnauthorized, "UNAUTHORIZED", i18n.MsgMissingUserContext)
		return
	}

	var input struct {
		Content string `json:"content"`
		MovieID string `json:"movie_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		log.Println("decode err:", err)
		respond.LocalizedFieldValidationError(w, r, http.StatusBadRequest, "body", i18n.MsgInvalidRequestBody)
		return
	}

	content := strings.TrimSpace(input.Content)
	if content == "" {
		respond.LocalizedFieldValidationError(w, r, http.StatusBadRequest, "content", i18n.MsgInvalidRequestBody)
		return
	}

	rawMovieID := r.PathValue("movie_id")
	if rawMovieID == "" {
		rawMovieID = r.PathValue("id")
	}
	if rawMovieID == "" {
		rawMovieID = input.MovieID
	}

	movieID, ok := parsePositiveID(rawMovieID)
	if !ok {
		respond.LocalizedError(w, r, http.StatusNotFound, "NOT_FOUND", i18n.MsgMovieNotFound)
		return
	}

	comment, err := h.store.create(r.Context(), content, movieID, int(userID))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			respond.LocalizedError(w, r, http.StatusNotFound, "NOT_FOUND", i18n.MsgMovieNotFound)
			return
		}
		log.Println("db err:", err)
		respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedCreateComment)
		return
	}

	respond.Item(w, http.StatusCreated, comment)
}

func (h *CommentsHandler) List(w http.ResponseWriter, r *http.Request) {
	comments, err := h.store.findAll(r.Context())
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			respond.LocalizedError(w, r, http.StatusNotFound, "NOT_FOUND", i18n.MsgCommentsNotFound)
		} else {
			log.Println("db err:", err)
			respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedLoadComments)
		}
		return
	}

	respond.List(w, http.StatusOK, comments)
}

func (h *CommentsHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePositiveID(r.PathValue("id"))
	if !ok {
		respond.LocalizedError(w, r, http.StatusNotFound, "NOT_FOUND", i18n.MsgCommentNotFound)
		return
	}

	comment, err := h.store.findByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			respond.LocalizedError(w, r, http.StatusNotFound, "NOT_FOUND", i18n.MsgCommentNotFound)
		} else {
			log.Println("db err:", err)
			respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedLoadComment)
		}
		return
	}

	respond.Item(w, http.StatusOK, comment)
}

func (h *CommentsHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		respond.LocalizedError(w, r, http.StatusUnauthorized, "UNAUTHORIZED", i18n.MsgMissingUserContext)
		return
	}

	id, ok := parsePositiveID(r.PathValue("id"))
	if !ok {
		respond.LocalizedError(w, r, http.StatusNotFound, "NOT_FOUND", i18n.MsgCommentNotFound)
		return
	}

	var input struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		log.Println("decode err:", err)
		respond.LocalizedFieldValidationError(w, r, http.StatusBadRequest, "body", i18n.MsgInvalidRequestBody)
		return
	}

	content := strings.TrimSpace(input.Content)
	if content == "" {
		respond.LocalizedFieldValidationError(w, r, http.StatusBadRequest, "content", i18n.MsgInvalidRequestBody)
		return
	}

	comment, err := h.store.update(r.Context(), content, id, int(userID))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			respond.LocalizedError(w, r, http.StatusNotFound, "NOT_FOUND", i18n.MsgCommentNotFound)
			return
		}
		log.Println("db err:", err)
		respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedUpdateComment)
		return
	}

	respond.Item(w, http.StatusOK, comment)
}

func (h *CommentsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		respond.LocalizedError(w, r, http.StatusUnauthorized, "UNAUTHORIZED", i18n.MsgMissingUserContext)
		return
	}

	id, ok := parsePositiveID(r.PathValue("id"))
	if !ok {
		respond.LocalizedError(w, r, http.StatusNotFound, "NOT_FOUND", i18n.MsgCommentNotFound)
		return
	}

	err := h.store.delete(r.Context(), id, int(userID))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			respond.LocalizedError(w, r, http.StatusNotFound, "NOT_FOUND", i18n.MsgCommentNotFound)
			return
		}
		log.Println("db err:", err)
		respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedDeleteComment)
		return
	}

	respond.Item(w, http.StatusOK, nil)
}