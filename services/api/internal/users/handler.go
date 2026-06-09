package users

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strings"

	"hypertube/api/internal/auth"
	"hypertube/api/internal/i18n"
	"hypertube/api/internal/models"
	"hypertube/api/internal/respond"
)

const maxJSONBodyBytes = 1 << 20

type colorStore interface {
	UpdateMyColor(ctx context.Context, userID int64, color string) (string, error)
}

type Handler struct {
	store colorStore
}

type updateColorRequest struct {
	Color string `json:"color"`
}

type updateColorResponse struct {
	Color string `json:"color"`
}

func NewHandler(store colorStore) *Handler {
	return &Handler{store: store}
}

func (h *Handler) UpdateMyColor(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		respond.LocalizedError(w, r, http.StatusUnauthorized, "UNAUTHORIZED", i18n.MsgMissingUserContext)
		return
	}

	req, ok := decodeUpdateColorRequest(w, r)
	if !ok {
		return
	}

	color := strings.TrimSpace(req.Color)
	if !models.IsValidUserColor(color) {
		respond.LocalizedFieldValidationError(w, r, http.StatusBadRequest, "color", i18n.MsgInvalidUserColor)
		return
	}

	updatedColor, err := h.store.UpdateMyColor(r.Context(), userID, color)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			respond.LocalizedError(w, r, http.StatusNotFound, "NOT_FOUND", i18n.MsgUserNotFound)
			return
		}
		log.Println("db err:", err)
		respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedUpdateUserColor)
		return
	}

	respond.Data(w, http.StatusOK, updateColorResponse{Color: updatedColor})
}

func decodeUpdateColorRequest(w http.ResponseWriter, r *http.Request) (updateColorRequest, bool) {
	r.Body = http.MaxBytesReader(w, r.Body, maxJSONBodyBytes)

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	var req updateColorRequest
	if err := decoder.Decode(&req); err != nil {
		respond.LocalizedFieldValidationError(w, r, http.StatusBadRequest, "body", i18n.MsgInvalidJSONBody)
		return updateColorRequest{}, false
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		respond.LocalizedFieldValidationError(w, r, http.StatusBadRequest, "body", i18n.MsgInvalidJSONBody)
		return updateColorRequest{}, false
	}

	return req, true
}

func List(w http.ResponseWriter, r *http.Request)   {}
func Get(w http.ResponseWriter, r *http.Request)    {}
func Update(w http.ResponseWriter, r *http.Request) {}
