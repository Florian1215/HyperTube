package auth

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	"hypertube/api/internal/models"
	"hypertube/api/internal/respond"
)

const maxJSONBodyBytes = 1 << 20

type Handler struct {
	store                   userStore
	tokens                  *TokenManager
	fortyTwo                oauthProvider
	github                  oauthProvider
	gitlab                  oauthProvider
	frontendAuthCallbackURL string
	passwordResetMailer     passwordResetMailer
	passwordResetURL        string
	passwordResetTTL        time.Duration
}

type HandlerOption func(*Handler)

func WithFortyTwoOAuth(provider oauthProvider) HandlerOption {
	return func(h *Handler) {
		h.fortyTwo = provider
	}
}

func WithGitHubOAuth(provider oauthProvider) HandlerOption {
	return func(h *Handler) {
		h.github = provider
	}
}

func WithGitLabOAuth(provider oauthProvider) HandlerOption {
	return func(h *Handler) {
		h.gitlab = provider
	}
}

func WithFrontendAuthCallbackURL(callbackURL string) HandlerOption {
	return func(h *Handler) {
		h.frontendAuthCallbackURL = callbackURL
	}
}

func WithPasswordResetMailer(mailer passwordResetMailer) HandlerOption {
	return func(h *Handler) {
		h.passwordResetMailer = mailer
	}
}

func WithPasswordResetURL(resetURL string) HandlerOption {
	return func(h *Handler) {
		h.passwordResetURL = resetURL
	}
}

func WithPasswordResetTTL(ttl time.Duration) HandlerOption {
	return func(h *Handler) {
		if ttl > 0 {
			h.passwordResetTTL = ttl
		}
	}
}

func NewHandler(store userStore, tokens *TokenManager, opts ...HandlerOption) *Handler {
	handler := &Handler{store: store, tokens: tokens, passwordResetTTL: 30 * time.Minute}
	for _, opt := range opts {
		opt(handler)
	}
	return handler
}

type registerRequest struct {
	Email             string `json:"email"`
	Username          string `json:"username"`
	FirstName         string `json:"first_name"`
	LastName          string `json:"last_name"`
	FrontendFirstName string `json:"firstname"`
	FrontendLastName  string `json:"lastname"`
	Password          string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email,omitempty"`
	Login    string `json:"login,omitempty"`
	Password string `json:"password"`
}

type authResponse struct {
	AccessToken string       `json:"access_token"`
	TokenType   string       `json:"token_type"`
	ExpiresIn   int64        `json:"expires_in"`
	User        userResponse `json:"user"`
}

type userResponse struct {
	ID             int64   `json:"id"`
	Email          string  `json:"email"`
	Username       string  `json:"username"`
	FirstName      string  `json:"first_name"`
	LastName       string  `json:"last_name"`
	ProfilePicture *string `json:"profile_picture"`
	CreatedAt      string  `json:"created_at"`
	JoinedAt       int64   `json:"joined_at"`
	Color          string  `json:"color"`
	WatchHistory   []any   `json:"watch_history"`
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if !decodeJSON(w, r, &req) {
		return
	}

	params, validationFields, ok := validateRegisterRequest(req)
	if !ok {
		writeValidationError(w, validationFields)
		return
	}

	passwordHash, err := HashPassword(req.Password)
	if err != nil {
		respond.FieldValidationError(w, http.StatusBadRequest, "password", "password is invalid")
		return
	}
	params.PasswordHash = passwordHash

	user, err := h.store.CreateUser(r.Context(), params)
	if err != nil {
		if errors.Is(err, ErrDuplicateUser) {
			respond.Error(w, http.StatusConflict, "USER_EXISTS", "email or username already exists")
			return
		}
		respond.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create user")
		return
	}

	h.writeAuthResponse(w, http.StatusCreated, user)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if !decodeJSON(w, r, &req) {
		return
	}

	login, validationFields, ok := validateLoginRequest(req)
	if !ok {
		writeValidationError(w, validationFields)
		return
	}

	user, err := h.store.FindUserByLogin(r.Context(), login)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			respond.Error(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid username/email or password")
			return
		}
		respond.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load user")
		return
	}

	if user.PasswordHash == "" || !CheckPassword(user.PasswordHash, req.Password) {
		respond.Error(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid username/email or password")
		return
	}

	h.writeAuthResponse(w, http.StatusOK, user)
}

func (h *Handler) writeAuthResponse(w http.ResponseWriter, status int, user models.User) {
	token, _, err := h.tokens.CreateAccessToken(user.ID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create token")
		return
	}

	respond.Data(w, status, authResponse{
		AccessToken: token,
		TokenType:   "Bearer",
		ExpiresIn:   int64(AccessTokenTTL.Seconds()),
		User:        toUserResponse(user),
	})
}

func toUserResponse(user models.User) userResponse {
	var profilePicture *string
	if user.ProfilePicture != "" {
		profilePicture = &user.ProfilePicture
	}
	return userResponse{
		ID:             user.ID,
		Email:          user.Email,
		Username:       user.Username,
		FirstName:      user.FirstName,
		LastName:       user.LastName,
		ProfilePicture: profilePicture,
		CreatedAt:      user.CreatedAt.Format(time.RFC3339),
		JoinedAt:       user.CreatedAt.UnixMilli(),
		Color:          "purple",
		WatchHistory:   []any{},
	}
}

func writeValidationError(w http.ResponseWriter, fields validationErrors) {
	responseFields := make(respond.FieldErrors, len(fields))
	for field, message := range fields {
		responseFields[field] = respond.FieldError{Message: message}
	}
	respond.ValidationError(w, http.StatusBadRequest, responseFields)
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxJSONBodyBytes)

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(dst); err != nil {
		respond.Error(w, http.StatusBadRequest, "BAD_REQUEST", "invalid JSON body")
		return false
	}

	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		respond.Error(w, http.StatusBadRequest, "BAD_REQUEST", "invalid JSON body")
		return false
	}

	return true
}
