package users

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
	"hypertube/api/internal/requestjson"
	"hypertube/api/internal/respond"
	"hypertube/api/internal/userinput"
)

type userStore interface {
	ListUsers(ctx context.Context, limit, offset int) ([]models.User, error)
	CountUsers(ctx context.Context) (int, error)
	FindUserByID(ctx context.Context, id int64) (models.User, error)
	UserHasOAuthAccount(ctx context.Context, id int64) (bool, error)
	UpdateUser(ctx context.Context, id int64, params UpdateUserParams) (models.User, error)
}

type Handler struct {
	store userStore
}

func NewHandler(store userStore) *Handler {
	return &Handler{store: store}
}

const (
	userPageLimit = 12
)

type validationErrors map[string]i18n.Message

type updateUserParams struct {
	UpdateUserParams
	Password *string
}

// ListUsers returns a paginated UserSmall list.
func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	page := parsePage(r)
	offset := (page - 1) * userPageLimit

	total, err := h.store.CountUsers(r.Context())
	if err != nil {
		log.Println("db err:", err)
		respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedLoadUser)
		return
	}

	users, err := h.store.ListUsers(r.Context(), userPageLimit, offset)
	if err != nil {
		log.Println("db err:", err)
		respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedLoadUser)
		return
	}

	result := make([]models.UserSmall, 0, len(users))
	for _, u := range users {
		result = append(result, models.ToUserSmallPrivate(u))
	}

	respond.ListPaginated(w, http.StatusOK, result, total, page, userPageLimit)
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

// UpdateUser applies a partial profile update for the authenticated user's own profile.
func (h *Handler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	authenticatedUserID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		respond.LocalizedError(w, r, http.StatusUnauthorized, "UNAUTHORIZED", i18n.MsgMissingUserContext)
		return
	}

	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		respond.LocalizedError(w, r, http.StatusNotFound, "NOT_FOUND", i18n.MsgUserNotFound)
		return
	}

	if authenticatedUserID != id {
		respond.LocalizedError(w, r, http.StatusForbidden, "FORBIDDEN", i18n.MsgUserUpdateForbidden)
		return
	}

	params, ok := decodeUpdateUserParams(w, r)
	if !ok {
		return
	}

	if params.Email != nil || params.Password != nil {
		if ok := h.ensureOAuthCredentialUpdateAllowed(w, r, id, params); !ok {
			return
		}
	}

	if params.Password != nil {
		passwordHash, err := auth.HashPassword(*params.Password)
		if err != nil {
			respond.LocalizedFieldValidationError(w, r, http.StatusBadRequest, "password", i18n.MsgPasswordInvalid)
			return
		}
		params.PasswordHash = &passwordHash
		params.Password = nil
	}

	user, err := h.store.UpdateUser(r.Context(), id, params.UpdateUserParams)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			respond.LocalizedError(w, r, http.StatusNotFound, "NOT_FOUND", i18n.MsgUserNotFound)
			return
		}
		if errors.Is(err, ErrDuplicateUser) {
			writeDuplicateUserError(w, r, duplicateUserFields(err))
			return
		}
		log.Println("db err:", err)
		respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedUpdateUser)
		return
	}

	respond.Data(w, http.StatusOK, user)
}

func (h *Handler) ensureOAuthCredentialUpdateAllowed(w http.ResponseWriter, r *http.Request, id int64, params updateUserParams) bool {
	hasOAuthAccount, err := h.store.UserHasOAuthAccount(r.Context(), id)
	if err != nil {
		log.Println("db err:", err)
		respond.LocalizedError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", i18n.MsgFailedUpdateUser)
		return false
	}
	if !hasOAuthAccount {
		return true
	}

	fields := validationErrors{}
	if params.Email != nil {
		fields["email"] = i18n.MsgOAuthEmailUpdateForbidden
	}
	if params.Password != nil {
		fields["password"] = i18n.MsgOAuthPasswordUpdateForbidden
	}
	writeValidationError(w, r, fields)
	return false
}

func parsePage(r *http.Request) int {
	page, err := strconv.Atoi(r.URL.Query().Get("page"))
	if err != nil || page < 1 {
		return 1
	}
	return page
}

func decodeUpdateUserParams(w http.ResponseWriter, r *http.Request) (updateUserParams, bool) {
	body, ok := requestjson.DecodeJSONObject(w, r, map[string]struct{}{
		"email":           {},
		"username":        {},
		"password":        {},
		"profile_picture": {},
		"first_name":      {},
		"last_name":       {},
		"color":           {},
	})
	if !ok {
		return updateUserParams{}, false
	}
	if len(body) == 0 {
		respond.LocalizedFieldValidationError(w, r, http.StatusBadRequest, "body", i18n.MsgInvalidRequestBody)
		return updateUserParams{}, false
	}

	params := updateUserParams{}
	fields := validationErrors{}

	if raw, ok := body["email"]; ok {
		value, ok := decodeStringField(raw, "email", fields)
		if ok {
			if email, message, ok := userinput.ValidateEmail(value); ok {
				params.Email = &email
			} else {
				fields["email"] = message
			}
		}
	}

	if raw, ok := body["username"]; ok {
		value, ok := decodeStringField(raw, "username", fields)
		if ok {
			if username, message, ok := userinput.ValidateUsername(value); ok {
				params.Username = &username
			} else {
				fields["username"] = message
			}
		}
	}

	if raw, ok := body["password"]; ok {
		value, ok := decodeStringField(raw, "password", fields)
		if ok {
			if message, ok := userinput.ValidateUpdatePassword(value); ok {
				params.Password = &value
			} else {
				fields["password"] = message
			}
		}
	}

	if raw, ok := body["first_name"]; ok {
		value, ok := decodeStringField(raw, "first_name", fields)
		if ok {
			if firstName, message, ok := userinput.ValidateName(value, i18n.MsgFirstNameRequired, i18n.MsgFirstNameTooLong, i18n.MsgFirstNameInvalid); ok {
				params.FirstName = &firstName
			} else {
				fields["first_name"] = message
			}
		}
	}

	if raw, ok := body["last_name"]; ok {
		value, ok := decodeStringField(raw, "last_name", fields)
		if ok {
			if lastName, message, ok := userinput.ValidateName(value, i18n.MsgLastNameRequired, i18n.MsgLastNameTooLong, i18n.MsgLastNameInvalid); ok {
				params.LastName = &lastName
			} else {
				fields["last_name"] = message
			}
		}
	}

	if raw, ok := body["profile_picture"]; ok {
		params.ProfilePictureSet = true
		if !requestjson.IsNull(raw) {
			value, ok := decodeStringField(raw, "profile_picture", fields)
			if ok {
				profilePicture := strings.TrimSpace(value)
				if profilePicture != "" {
					params.ProfilePicture = &profilePicture
				}
			}
		}
	}

	if raw, ok := body["color"]; ok {
		value, ok := decodeStringField(raw, "color", fields)
		if ok {
			color := strings.TrimSpace(value)
			if models.IsValidUserColor(color) {
				params.Color = &color
			} else {
				fields["color"] = i18n.MsgInvalidUserColor
			}
		}
	}

	if len(fields) > 0 {
		writeValidationError(w, r, fields)
		return updateUserParams{}, false
	}

	return params, true
}

func decodeStringField(raw json.RawMessage, field string, fields validationErrors) (string, bool) {
	value, ok := requestjson.DecodeString(raw)
	if !ok {
		fields[field] = i18n.MsgInvalidRequestBody
		return "", false
	}
	return value, true
}

func writeValidationError(w http.ResponseWriter, r *http.Request, fields validationErrors) {
	locale := i18n.FromRequest(r)
	responseFields := make(respond.FieldErrors, len(fields))
	for field, message := range fields {
		responseFields[field] = respond.FieldError{Message: i18n.T(locale, message)}
	}
	respond.ValidationError(w, http.StatusBadRequest, responseFields)
}

func writeDuplicateUserError(w http.ResponseWriter, r *http.Request, fields []string) {
	locale := i18n.FromRequest(r)
	responseFields := respond.FieldErrors{}
	if len(fields) == 0 {
		fields = []string{"email", "username"}
	}

	for _, field := range fields {
		switch field {
		case "email":
			responseFields[field] = respond.FieldError{Message: i18n.T(locale, i18n.MsgEmailAlreadyInUse)}
		case "username":
			responseFields[field] = respond.FieldError{Message: i18n.T(locale, i18n.MsgUsernameAlreadyInUse)}
		}
	}
	if len(responseFields) == 0 {
		responseFields["email"] = respond.FieldError{Message: i18n.T(locale, i18n.MsgEmailAlreadyInUse)}
		responseFields["username"] = respond.FieldError{Message: i18n.T(locale, i18n.MsgUsernameAlreadyInUse)}
	}

	respond.ErrorWithFields(w, http.StatusConflict, "ALREADY_EXIST_ERROR", responseFields)
}
