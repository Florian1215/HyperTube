package users

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strconv"

	"hypertube/api/internal/i18n"
	"hypertube/api/internal/models"
	"hypertube/api/internal/respond"
)

type userStore interface {
	ListUsers(ctx context.Context) ([]models.User, error)
	FindUserByID(ctx context.Context, id int64) (models.User, error)
}

type Handler struct {
	store userStore
}

func NewHandler(store userStore) *Handler {
	return &Handler{store: store}
}

// ListUsers returns every user as a UserSmall list.
func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.store.ListUsers(r.Context())
	if err != nil {
		log.Println("db err:", err)
		respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedLoadUser)
		return
	}

	result := make([]models.UserSmall, 0, len(users))
	for _, u := range users {
		result = append(result, models.ToUserSmallPrivate(u))
	}

	respond.List(w, http.StatusOK, result)
}

// GetUser returns the public profile (UserSmall) for the user with the given id.
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		respond.LocalizedError(w, r, http.StatusNotFound, "NOT_FOUND", i18n.MsgUserNotFound)
		return
	}

	user, err := h.store.FindUserByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			respond.LocalizedError(w, r, http.StatusNotFound, "NOT_FOUND", i18n.MsgUserNotFound)
			return
		}
		log.Println("db err:", err)
		respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedLoadUser)
		return
	}

	respond.Data(w, http.StatusOK, models.ToUserSmallPrivate(user))
}
