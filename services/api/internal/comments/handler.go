package comments

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"

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
	findByID(ctx context.Context, id string) (*models.Comment, error)
	findAll(ctx context.Context) ([]models.Comment, error)
	update(ctx context.Context, content string, id string, user_id int) (models.Comment, error)
	delete(ctx context.Context, id string, user_id int) error
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
	id := r.PathValue("id")
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

	id := r.PathValue("id")
	var input struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		log.Println("decode err:", err)
		respond.LocalizedFieldValidationError(w, r, http.StatusBadRequest, "body", i18n.MsgInvalidRequestBody)
		return
	}
	comment, err := h.store.update(r.Context(), input.Content, id, int(userID))
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

	id := r.PathValue("id")
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
