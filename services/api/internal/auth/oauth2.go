package auth

import (
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net/http"
	"strings"

	"hypertube/api/internal/i18n"
	"hypertube/api/internal/userinput"
)

type oauthTokenRequest struct {
	GrantType string `json:"grant_type"`
	Username  string `json:"username"`
	Password  string `json:"password"`
	Scope     string `json:"scope"`
}

type oauthTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int64  `json:"expires_in"`
	Scope       string `json:"scope,omitempty"`
}

type oauthErrorResponse struct {
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description,omitempty"`
}

func (h *Handler) OAuthToken(w http.ResponseWriter, r *http.Request) {
	locale := i18n.FromRequest(r)
	req, ok := decodeOAuthTokenRequest(w, r, locale)
	if !ok {
		return
	}

	switch strings.TrimSpace(req.GrantType) {
	case "password":
		h.oauthPasswordGrant(w, r, req, locale)
	case "":
		writeOAuthError(w, http.StatusBadRequest, "invalid_request", i18n.T(locale, i18n.MsgGrantTypeRequired))
	default:
		writeOAuthError(w, http.StatusBadRequest, "unsupported_grant_type", i18n.T(locale, i18n.MsgUnsupportedGrantType))
	}
}

func (h *Handler) oauthPasswordGrant(w http.ResponseWriter, r *http.Request, req oauthTokenRequest, locale i18n.Locale) {
	if h.store == nil || h.tokens == nil {
		writeOAuthError(w, http.StatusInternalServerError, "server_error", i18n.T(locale, i18n.MsgAuthServiceUnavailable))
		return
	}

	login := strings.TrimSpace(req.Username)
	if login == "" || req.Password == "" {
		writeOAuthError(w, http.StatusBadRequest, "invalid_request", i18n.T(locale, i18n.MsgUsernamePasswordRequired))
		return
	}
	if validationMessage, ok := userinput.ValidateLoginPassword(req.Password); !ok {
		writeOAuthError(w, http.StatusBadRequest, "invalid_request", i18n.T(locale, validationMessage))
		return
	}

	user, err := h.authenticatePassword(r.Context(), login, req.Password)
	if err != nil {
		if errors.Is(err, errInvalidCredentials) {
			writeOAuthError(w, http.StatusBadRequest, "invalid_grant", i18n.T(locale, i18n.MsgInvalidUsernamePassword))
			return
		}
		writeOAuthError(w, http.StatusInternalServerError, "server_error", i18n.T(locale, i18n.MsgFailedLoadUser))
		return
	}

	token, expiresIn, err := h.issueAccessToken(user.ID)
	if err != nil {
		writeOAuthError(w, http.StatusInternalServerError, "server_error", i18n.T(locale, i18n.MsgFailedCreateAccessToken))
		return
	}

	response := oauthTokenResponse{
		AccessToken: token,
		TokenType:   "Bearer",
		ExpiresIn:   expiresIn,
		Scope:       normalizeOAuthScope(req.Scope),
	}
	writeOAuthJSON(w, http.StatusOK, response)
}

func decodeOAuthTokenRequest(w http.ResponseWriter, r *http.Request, locale i18n.Locale) (oauthTokenRequest, bool) {
	contentType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil && r.Header.Get("Content-Type") != "" {
		writeOAuthError(w, http.StatusBadRequest, "invalid_request", i18n.T(locale, i18n.MsgInvalidContentType))
		return oauthTokenRequest{}, false
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxJSONBodyBytes)
	if contentType == "" || contentType == "application/x-www-form-urlencoded" {
		if err := r.ParseForm(); err != nil {
			writeOAuthError(w, http.StatusBadRequest, "invalid_request", i18n.T(locale, i18n.MsgInvalidFormBody))
			return oauthTokenRequest{}, false
		}
		return oauthTokenRequest{
			GrantType: r.PostForm.Get("grant_type"),
			Username:  r.PostForm.Get("username"),
			Password:  r.PostForm.Get("password"),
			Scope:     r.PostForm.Get("scope"),
		}, true
	}

	if contentType == "application/json" {
		var req oauthTokenRequest
		decoder := json.NewDecoder(r.Body)
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&req); err != nil {
			writeOAuthError(w, http.StatusBadRequest, "invalid_request", i18n.T(locale, i18n.MsgInvalidJSONBody))
			return oauthTokenRequest{}, false
		}
		if err := decoder.Decode(&struct{}{}); err != io.EOF {
			writeOAuthError(w, http.StatusBadRequest, "invalid_request", i18n.T(locale, i18n.MsgInvalidJSONBody))
			return oauthTokenRequest{}, false
		}
		return req, true
	}

	writeOAuthError(w, http.StatusUnsupportedMediaType, "invalid_request", i18n.T(locale, i18n.MsgRequestBodyFormOrJSON))
	return oauthTokenRequest{}, false
}

func normalizeOAuthScope(scope string) string {
	return strings.Join(strings.Fields(scope), " ")
}

func writeOAuthError(w http.ResponseWriter, status int, code string, description string) {
	writeOAuthJSON(w, status, oauthErrorResponse{
		Error:            code,
		ErrorDescription: description,
	})
}

func writeOAuthJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Pragma", "no-cache")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}
