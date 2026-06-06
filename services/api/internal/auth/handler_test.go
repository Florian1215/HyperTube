package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"hypertube/api/internal/models"
)

type memoryUserStore struct {
	nextID          int64
	usersByEmail    map[string]models.User
	usersByID       map[int64]models.User
	usersByUsername map[string]models.User
	oauthAccounts   map[string]int64
	resetTokens     map[string]memoryPasswordResetToken
}

type memoryPasswordResetToken struct {
	userID    int64
	expiresAt time.Time
	used      bool
}

func newMemoryUserStore() *memoryUserStore {
	return &memoryUserStore{
		usersByEmail:    make(map[string]models.User),
		usersByID:       make(map[int64]models.User),
		usersByUsername: make(map[string]models.User),
		oauthAccounts:   make(map[string]int64),
		resetTokens:     make(map[string]memoryPasswordResetToken),
	}
}

func (s *memoryUserStore) CreateUser(_ context.Context, params CreateUserParams) (models.User, error) {
	if params.PasswordHash != "" {
		if _, ok := s.usersByEmail[params.Email]; ok {
			return models.User{}, ErrDuplicateUser
		}
	}
	if _, ok := s.usersByUsername[params.Username]; ok {
		return models.User{}, ErrDuplicateUser
	}

	s.nextID++
	now := time.Now().UTC()
	user := models.User{
		ID:             s.nextID,
		Email:          params.Email,
		Username:       params.Username,
		FirstName:      params.FirstName,
		LastName:       params.LastName,
		ProfilePicture: params.ProfilePicture,
		PasswordHash:   params.PasswordHash,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	s.usersByID[user.ID] = user
	if user.PasswordHash != "" {
		s.usersByEmail[user.Email] = user
	}
	s.usersByUsername[user.Username] = user
	return user, nil
}

func (s *memoryUserStore) FindUserByEmail(_ context.Context, email string) (models.User, error) {
	user, ok := s.usersByEmail[email]
	if !ok {
		return models.User{}, ErrUserNotFound
	}
	return user, nil
}

func (s *memoryUserStore) FindUserByLogin(_ context.Context, login string) (models.User, error) {
	login = strings.TrimSpace(login)
	if email, ok := normalizeEmail(login); ok {
		if user, ok := s.usersByEmail[email]; ok {
			return user, nil
		}
	}
	if user, ok := s.usersByUsername[login]; ok && user.PasswordHash != "" {
		return user, nil
	}
	return models.User{}, ErrUserNotFound
}

func (s *memoryUserStore) FindOrCreateOAuthUser(_ context.Context, params OAuthUserParams) (models.User, error) {
	params = normalizeOAuthUserParams(params)
	key := oauthAccountKey(params.Provider, params.ProviderUserID)
	if userID, ok := s.oauthAccounts[key]; ok {
		user, err := s.findUserByID(userID)
		if err != nil {
			return models.User{}, err
		}
		return s.applyOAuthProfile(user, params), nil
	}

	username := oauthUsernameBase(params.Username, params.Provider, params.ProviderUserID)
	if _, ok := s.usersByUsername[username]; ok {
		username = usernameWithSuffix(username, "_"+params.ProviderUserID)
	}

	user, err := s.CreateUser(context.Background(), CreateUserParams{
		Email:          params.Email,
		Username:       username,
		FirstName:      params.FirstName,
		LastName:       params.LastName,
		ProfilePicture: params.ProfilePicture,
		PasswordHash:   "",
	})
	if err != nil {
		return models.User{}, err
	}
	s.oauthAccounts[key] = user.ID
	return user, nil
}

func (s *memoryUserStore) findUserByID(userID int64) (models.User, error) {
	if user, ok := s.usersByID[userID]; ok {
		return user, nil
	}
	return models.User{}, ErrUserNotFound
}

func (s *memoryUserStore) applyOAuthProfile(user models.User, params OAuthUserParams) models.User {
	if params.FirstName != "" {
		user.FirstName = params.FirstName
	}
	if params.LastName != "" {
		user.LastName = params.LastName
	}
	if params.ProfilePicture != "" {
		user.ProfilePicture = params.ProfilePicture
	}
	s.usersByID[user.ID] = user
	s.usersByUsername[user.Username] = user
	return user
}

func oauthAccountKey(provider string, providerUserID string) string {
	return fmt.Sprintf("%s:%s", provider, providerUserID)
}

func (s *memoryUserStore) CreatePasswordResetToken(_ context.Context, params CreatePasswordResetTokenParams) error {
	s.resetTokens[params.TokenHash] = memoryPasswordResetToken{
		userID:    params.UserID,
		expiresAt: params.ExpiresAt,
	}
	return nil
}

func (s *memoryUserStore) ResetPasswordWithToken(_ context.Context, tokenHash string, passwordHash string) (models.User, error) {
	token, ok := s.resetTokens[tokenHash]
	if !ok || token.used || !token.expiresAt.After(time.Now().UTC()) {
		return models.User{}, ErrInvalidPasswordResetToken
	}

	user, err := s.findUserByID(token.userID)
	if err != nil {
		return models.User{}, err
	}

	token.used = true
	s.resetTokens[tokenHash] = token
	user.PasswordHash = passwordHash
	user.UpdatedAt = time.Now().UTC()
	s.usersByID[user.ID] = user
	s.usersByEmail[user.Email] = user
	s.usersByUsername[user.Username] = user
	return user, nil
}

func TestRegisterAndLoginHappyPath(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	handler := NewHandler(store, tokens)

	registerBody := `{
		"email": "Alice@example.com",
		"username": "alice_1",
		"first_name": "Alice",
		"last_name": "Example",
		"password": "correct-horse-battery"
	}`
	registerReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", strings.NewReader(registerBody))
	registerRec := httptest.NewRecorder()

	handler.Register(registerRec, registerReq)

	if registerRec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", registerRec.Code, registerRec.Body.String())
	}

	registerResponse := decodeAuthEnvelope(t, registerRec)
	if registerResponse.Data.User.Email != "alice@example.com" {
		t.Fatalf("expected normalized email, got %q", registerResponse.Data.User.Email)
	}
	if registerResponse.Data.User.FirstName != "Alice" || registerResponse.Data.User.LastName != "Example" {
		t.Fatalf("expected canonical names, got %q %q", registerResponse.Data.User.FirstName, registerResponse.Data.User.LastName)
	}
	assertNoFrontendNameAliasFields(t, registerRec)
	if registerResponse.Data.User.JoinedAt == 0 {
		t.Fatal("expected joined_at compatibility field")
	}
	if registerResponse.Data.User.Color == "" || registerResponse.Data.User.WatchHistory == nil {
		t.Fatal("expected frontend profile compatibility fields")
	}
	if registerResponse.Data.AccessToken == "" {
		t.Fatal("expected access token")
	}
	if _, err := tokens.ValidateAccessToken(registerResponse.Data.AccessToken); err != nil {
		t.Fatalf("register token should validate: %v", err)
	}

	storedUser, err := store.FindUserByEmail(context.Background(), "alice@example.com")
	if err != nil {
		t.Fatalf("find stored user: %v", err)
	}
	if storedUser.PasswordHash == "correct-horse-battery" {
		t.Fatal("stored password must be hashed")
	}
	if !CheckPassword(storedUser.PasswordHash, "correct-horse-battery") {
		t.Fatal("stored hash must match original password")
	}

	loginBody := `{"login": "alice@example.com", "password": "correct-horse-battery"}`
	loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(loginBody))
	loginRec := httptest.NewRecorder()

	handler.Login(loginRec, loginReq)

	if loginRec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", loginRec.Code, loginRec.Body.String())
	}

	loginResponse := decodeAuthEnvelope(t, loginRec)
	if loginResponse.Data.User.ID != registerResponse.Data.User.ID {
		t.Fatalf("expected login user id %d, got %d", registerResponse.Data.User.ID, loginResponse.Data.User.ID)
	}
	if _, err := tokens.ValidateAccessToken(loginResponse.Data.AccessToken); err != nil {
		t.Fatalf("login token should validate: %v", err)
	}

	usernameLoginBody := `{"login": "alice_1", "password": "correct-horse-battery"}`
	usernameLoginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(usernameLoginBody))
	usernameLoginRec := httptest.NewRecorder()

	handler.Login(usernameLoginRec, usernameLoginReq)

	if usernameLoginRec.Code != http.StatusOK {
		t.Fatalf("expected username login 200, got %d: %s", usernameLoginRec.Code, usernameLoginRec.Body.String())
	}

	usernameLoginResponse := decodeAuthEnvelope(t, usernameLoginRec)
	if usernameLoginResponse.Data.User.ID != registerResponse.Data.User.ID {
		t.Fatalf("expected username login user id %d, got %d", registerResponse.Data.User.ID, usernameLoginResponse.Data.User.ID)
	}
}

func TestRegisterAcceptsFrontendNameAliases(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	handler := NewHandler(store, tokens)

	registerBody := `{
		"email": "Frontend@example.com",
		"username": "frontend_1",
		"firstname": "Front",
		"lastname": "End",
		"password": "correct-horse-battery"
	}`
	registerReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", strings.NewReader(registerBody))
	registerRec := httptest.NewRecorder()

	handler.Register(registerRec, registerReq)

	if registerRec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", registerRec.Code, registerRec.Body.String())
	}

	registerResponse := decodeAuthEnvelope(t, registerRec)
	if registerResponse.Data.User.FirstName != "Front" || registerResponse.Data.User.LastName != "End" {
		t.Fatalf("expected canonical names from frontend aliases, got %q %q", registerResponse.Data.User.FirstName, registerResponse.Data.User.LastName)
	}
	assertNoFrontendNameAliasFields(t, registerRec)

	loginBody := `{"login": "frontend_1", "password": "correct-horse-battery"}`
	loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(loginBody))
	loginRec := httptest.NewRecorder()

	handler.Login(loginRec, loginReq)

	if loginRec.Code != http.StatusOK {
		t.Fatalf("expected username login 200, got %d: %s", loginRec.Code, loginRec.Body.String())
	}
}

func TestRegisterRejectsInvalidRequests(t *testing.T) {
	tests := []struct {
		name string
		body string
		code string
	}{
		{
			name: "malformed JSON",
			body: `{"email":`,
			code: "BAD_REQUEST",
		},
		{
			name: "unknown field",
			body: `{"email":"alice@example.com","username":"alice_1","first_name":"Alice","last_name":"Example","password":"correct-horse-battery","admin":true}`,
			code: "BAD_REQUEST",
		},
		{
			name: "multiple JSON documents",
			body: `{"email":"alice@example.com","username":"alice_1","first_name":"Alice","last_name":"Example","password":"correct-horse-battery"} {}`,
			code: "BAD_REQUEST",
		},
		{
			name: "invalid email",
			body: `{"email":"not-an-email","username":"alice_1","first_name":"Alice","last_name":"Example","password":"correct-horse-battery"}`,
			code: "VALIDATION_ERROR",
		},
		{
			name: "short password",
			body: `{"email":"alice@example.com","username":"alice_1","first_name":"Alice","last_name":"Example","password":"short"}`,
			code: "VALIDATION_ERROR",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := NewHandler(newMemoryUserStore(), newTestTokenManager(t))

			req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", strings.NewReader(tt.body))
			rec := httptest.NewRecorder()

			handler.Register(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
			}
			if got := decodeErrorEnvelope(t, rec).Error.Code; got != tt.code {
				t.Fatalf("expected error code %q, got %q", tt.code, got)
			}
		})
	}
}

func TestRegisterValidationErrorReturnsFieldErrors(t *testing.T) {
	handler := NewHandler(newMemoryUserStore(), newTestTokenManager(t))
	body := `{"email":"not-an-email","username":"ab","first_name":"","last_name":"","password":"short"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", strings.NewReader(body))
	rec := httptest.NewRecorder()

	handler.Register(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}

	errorBody := decodeErrorEnvelope(t, rec).Error
	if errorBody.Code != "VALIDATION_ERROR" {
		t.Fatalf("expected VALIDATION_ERROR, got %q", errorBody.Code)
	}
	if errorBody.Message != "" {
		t.Fatalf("expected validation response without top-level message, got %q", errorBody.Message)
	}

	wantFields := map[string]string{
		"email":      "Invalid email",
		"username":   "Username is too short",
		"first_name": "First name is required",
		"last_name":  "Last name is required",
		"password":   "Password is too short",
	}
	for field, wantMessage := range wantFields {
		got, ok := errorBody.Fields[field]
		if !ok {
			t.Fatalf("expected field %q in validation response, got %+v", field, errorBody.Fields)
		}
		if got.Message != wantMessage {
			t.Fatalf("expected %s message %q, got %q", field, wantMessage, got.Message)
		}
	}
}

func TestLoginValidationErrorReturnsFieldErrors(t *testing.T) {
	handler := NewHandler(newMemoryUserStore(), newTestTokenManager(t))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(`{"login":"not-an-email!","password":""}`))
	rec := httptest.NewRecorder()

	handler.Login(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}

	errorBody := decodeErrorEnvelope(t, rec).Error
	if errorBody.Code != "VALIDATION_ERROR" {
		t.Fatalf("expected VALIDATION_ERROR, got %q", errorBody.Code)
	}
	if _, ok := errorBody.Fields["email"]; ok {
		t.Fatalf("did not expect email field validation, got %+v", errorBody.Fields["email"])
	}
	if got := errorBody.Fields["login"].Message; got != "Invalid email or username" {
		t.Fatalf("expected login validation message, got %q", got)
	}
	if got := errorBody.Fields["password"].Message; got != "Password is required" {
		t.Fatalf("expected password validation message, got %q", got)
	}
}

func TestLoginRejectsEmailField(t *testing.T) {
	handler := NewHandler(newMemoryUserStore(), newTestTokenManager(t))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(`{"email":"alice@example.com","password":"correct-horse-battery"}`))
	rec := httptest.NewRecorder()

	handler.Login(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeErrorEnvelope(t, rec).Error.Code; got != "BAD_REQUEST" {
		t.Fatalf("expected BAD_REQUEST, got %q", got)
	}
}

func TestRegisterValidationErrorUsesAcceptLanguage(t *testing.T) {
	handler := NewHandler(newMemoryUserStore(), newTestTokenManager(t))
	body := `{"email":"not-an-email","username":"ab","first_name":"","last_name":"","password":"short"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", strings.NewReader(body))
	req.Header.Set("Accept-Language", "fr")
	rec := httptest.NewRecorder()

	handler.Register(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	errorBody := decodeErrorEnvelope(t, rec).Error
	if got := errorBody.Fields["email"].Message; got != "Email invalide" {
		t.Fatalf("expected French email message, got %q", got)
	}
	if got := errorBody.Fields["password"].Message; got != "Mot de passe trop court" {
		t.Fatalf("expected French password message, got %q", got)
	}
}

func TestLoginInvalidCredentialsUsesAcceptLanguage(t *testing.T) {
	handler := NewHandler(newMemoryUserStore(), newTestTokenManager(t))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(`{"login":"missing@example.com","password":"right-password"}`))
	req.Header.Set("Accept-Language", "de")
	rec := httptest.NewRecorder()

	handler.Login(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", rec.Code, rec.Body.String())
	}
	errorBody := decodeErrorEnvelope(t, rec).Error
	if errorBody.Code != "INVALID_CREDENTIALS" {
		t.Fatalf("expected INVALID_CREDENTIALS, got %q", errorBody.Code)
	}
	if got := errorBody.Message; got != "E-Mail, Benutzername oder Passwort ist ungültig" {
		t.Fatalf("expected German invalid credentials message, got %q", got)
	}
}

func TestRegisterDuplicateUserReturnsConflict(t *testing.T) {
	store := newMemoryUserStore()
	handler := NewHandler(store, newTestTokenManager(t))
	body := `{
		"email": "alice@example.com",
		"username": "alice_1",
		"first_name": "Alice",
		"last_name": "Example",
		"password": "correct-horse-battery"
	}`

	firstReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", strings.NewReader(body))
	firstRec := httptest.NewRecorder()
	handler.Register(firstRec, firstReq)
	if firstRec.Code != http.StatusCreated {
		t.Fatalf("expected initial register 201, got %d: %s", firstRec.Code, firstRec.Body.String())
	}

	secondReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", strings.NewReader(body))
	secondRec := httptest.NewRecorder()
	handler.Register(secondRec, secondReq)

	if secondRec.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d: %s", secondRec.Code, secondRec.Body.String())
	}
	if got := decodeErrorEnvelope(t, secondRec).Error.Code; got != "USER_EXISTS" {
		t.Fatalf("expected USER_EXISTS, got %q", got)
	}
}

func TestLoginRejectsUnknownUserAndWrongPassword(t *testing.T) {
	store := newMemoryUserStore()
	handler := NewHandler(store, newTestTokenManager(t))
	passwordHash, err := HashPassword("right-password")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	if _, err := store.CreateUser(context.Background(), CreateUserParams{
		Email:        "alice@example.com",
		Username:     "alice_1",
		FirstName:    "Alice",
		LastName:     "Example",
		PasswordHash: passwordHash,
	}); err != nil {
		t.Fatalf("create user: %v", err)
	}

	tests := []struct {
		name string
		body string
	}{
		{
			name: "unknown user",
			body: `{"login":"missing@example.com","password":"right-password"}`,
		},
		{
			name: "wrong password",
			body: `{"login":"alice@example.com","password":"wrong-password"}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(tt.body))
			rec := httptest.NewRecorder()

			handler.Login(rec, req)

			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("expected 401, got %d: %s", rec.Code, rec.Body.String())
			}
			if got := decodeErrorEnvelope(t, rec).Error.Code; got != "INVALID_CREDENTIALS" {
				t.Fatalf("expected INVALID_CREDENTIALS, got %q", got)
			}
		})
	}
}

func TestOAuthTokenPasswordGrantReturnsBearerToken(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	handler := NewHandler(store, tokens)
	passwordHash, err := HashPassword("correct-horse-battery")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	user, err := store.CreateUser(context.Background(), CreateUserParams{
		Email:        "alice@example.com",
		Username:     "alice_1",
		FirstName:    "Alice",
		LastName:     "Example",
		PasswordHash: passwordHash,
	})
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	form := url.Values{}
	form.Set("grant_type", "password")
	form.Set("username", "alice_1")
	form.Set("password", "correct-horse-battery")
	req := httptest.NewRequest(http.MethodPost, "/api/v1/oauth/token", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rec := httptest.NewRecorder()

	handler.OAuthToken(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var response oauthTokenResponse
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if response.AccessToken == "" {
		t.Fatal("expected access token")
	}
	if response.TokenType != "Bearer" {
		t.Fatalf("expected Bearer token type, got %q", response.TokenType)
	}
	if response.ExpiresIn != int64(AccessTokenTTL.Seconds()) {
		t.Fatalf("expected expires_in %d, got %d", int64(AccessTokenTTL.Seconds()), response.ExpiresIn)
	}
	claims, err := tokens.ValidateAccessToken(response.AccessToken)
	if err != nil {
		t.Fatalf("token should validate: %v", err)
	}
	if claims.UserID != user.ID {
		t.Fatalf("expected token user id %d, got %d", user.ID, claims.UserID)
	}
}

func TestOAuthTokenPasswordGrantAcceptsEmailLogin(t *testing.T) {
	store := newMemoryUserStore()
	handler := NewHandler(store, newTestTokenManager(t))
	passwordHash, err := HashPassword("correct-horse-battery")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	if _, err := store.CreateUser(context.Background(), CreateUserParams{
		Email:        "alice@example.com",
		Username:     "alice_1",
		FirstName:    "Alice",
		LastName:     "Example",
		PasswordHash: passwordHash,
	}); err != nil {
		t.Fatalf("create user: %v", err)
	}

	body := `{"grant_type":"password","username":"Alice@Example.COM","password":"correct-horse-battery"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/oauth/token", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler.OAuthToken(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestOAuthTokenRejectsInvalidGrant(t *testing.T) {
	store := newMemoryUserStore()
	handler := NewHandler(store, newTestTokenManager(t))
	passwordHash, err := HashPassword("right-password")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	if _, err := store.CreateUser(context.Background(), CreateUserParams{
		Email:        "alice@example.com",
		Username:     "alice_1",
		FirstName:    "Alice",
		LastName:     "Example",
		PasswordHash: passwordHash,
	}); err != nil {
		t.Fatalf("create user: %v", err)
	}

	tests := []struct {
		name      string
		form      url.Values
		wantError string
	}{
		{
			name: "missing grant type",
			form: url.Values{
				"username": {"alice_1"},
				"password": {"right-password"},
			},
			wantError: "invalid_request",
		},
		{
			name: "unsupported grant type",
			form: url.Values{
				"grant_type": {"client_credentials"},
			},
			wantError: "unsupported_grant_type",
		},
		{
			name: "wrong password",
			form: url.Values{
				"grant_type": {"password"},
				"username":   {"alice_1"},
				"password":   {"wrong-password"},
			},
			wantError: "invalid_grant",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/v1/oauth/token", strings.NewReader(tt.form.Encode()))
			req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
			rec := httptest.NewRecorder()

			handler.OAuthToken(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
			}
			var response oauthErrorResponse
			if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
				t.Fatalf("decode response: %v", err)
			}
			if response.Error != tt.wantError {
				t.Fatalf("expected error %q, got %q", tt.wantError, response.Error)
			}
		})
	}
}

func TestOAuthTokenErrorUsesAcceptLanguage(t *testing.T) {
	handler := NewHandler(newMemoryUserStore(), newTestTokenManager(t))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/oauth/token", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept-Language", "fr")
	rec := httptest.NewRecorder()

	handler.OAuthToken(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	var response oauthErrorResponse
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if response.Error != "invalid_request" {
		t.Fatalf("expected invalid_request, got %q", response.Error)
	}
	if response.ErrorDescription != "Type de grant requis" {
		t.Fatalf("expected French OAuth error description, got %q", response.ErrorDescription)
	}
}

func decodeAuthEnvelope(t *testing.T, rec *httptest.ResponseRecorder) struct {
	Data authResponse `json:"data"`
} {
	t.Helper()

	var body struct {
		Data authResponse `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return body
}

func assertNoFrontendNameAliasFields(t *testing.T, rec *httptest.ResponseRecorder) {
	t.Helper()

	var body struct {
		Data struct {
			User map[string]json.RawMessage `json:"user"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response fields: %v", err)
	}
	for _, field := range []string{"firstname", "lastname"} {
		if _, ok := body.Data.User[field]; ok {
			t.Fatalf("response must not include %q alias field: %s", field, rec.Body.String())
		}
	}
}

func decodeErrorEnvelope(t *testing.T, rec *httptest.ResponseRecorder) struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
		Fields  map[string]struct {
			Message string `json:"message"`
		} `json:"fields"`
	} `json:"error"`
} {
	t.Helper()

	var body struct {
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
			Fields  map[string]struct {
				Message string `json:"message"`
			} `json:"fields"`
		} `json:"error"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode error response: %v", err)
	}
	return body
}

func TestMemoryUserStoreFindMissing(t *testing.T) {
	_, err := newMemoryUserStore().FindUserByEmail(context.Background(), "missing@example.com")
	if !errors.Is(err, ErrUserNotFound) {
		t.Fatalf("expected ErrUserNotFound, got %v", err)
	}
}

func TestOAuthUsersWithSameEmailStaySeparateByProvider(t *testing.T) {
	store := newMemoryUserStore()

	fortyTwoUser, err := store.FindOrCreateOAuthUser(context.Background(), OAuthUserParams{
		Provider:       fortyTwoProvider,
		ProviderUserID: "42-id",
		Email:          "same@example.com",
		Username:       "forty_two",
		FirstName:      "Forty",
		LastName:       "Two",
	})
	if err != nil {
		t.Fatalf("create 42 user: %v", err)
	}

	githubUser, err := store.FindOrCreateOAuthUser(context.Background(), OAuthUserParams{
		Provider:       githubProvider,
		ProviderUserID: "github-id",
		Email:          "same@example.com",
		Username:       "github_user",
		FirstName:      "Git",
		LastName:       "Hub",
	})
	if err != nil {
		t.Fatalf("create GitHub user: %v", err)
	}

	if githubUser.ID == fortyTwoUser.ID {
		t.Fatalf("expected separate OAuth users for matching provider email, got id %d", githubUser.ID)
	}
	if githubUser.FirstName != "Git" || githubUser.LastName != "Hub" {
		t.Fatalf("expected GitHub profile fields, got %+v", githubUser)
	}
}

func TestFortyTwoLoginRedirectsWithStateCookie(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	provider := &fakeOAuthProvider{authURL: "https://api.intra.42.fr/oauth/authorize"}
	handler := NewHandler(store, tokens, WithFortyTwoOAuth(provider))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/42/login", nil)
	rec := httptest.NewRecorder()

	handler.LoginFortyTwo(rec, req)

	if rec.Code != http.StatusFound {
		t.Fatalf("expected 302, got %d: %s", rec.Code, rec.Body.String())
	}
	if provider.lastState == "" {
		t.Fatal("expected generated OAuth state")
	}
	location := rec.Header().Get("Location")
	if !strings.Contains(location, "state="+provider.lastState) {
		t.Fatalf("expected redirect location to include state, got %q", location)
	}

	cookie := rec.Result().Cookies()[0]
	if cookie.Name != oauthStateCookieName {
		t.Fatalf("expected state cookie %q, got %q", oauthStateCookieName, cookie.Name)
	}
	if cookie.Value != provider.lastState {
		t.Fatalf("expected cookie state %q, got %q", provider.lastState, cookie.Value)
	}
	if !cookie.HttpOnly {
		t.Fatal("state cookie must be HttpOnly")
	}
}

func TestFortyTwoLoginStoresOAuthLocaleCookie(t *testing.T) {
	provider := &fakeOAuthProvider{authURL: "https://api.intra.42.fr/oauth/authorize"}
	handler := NewHandler(newMemoryUserStore(), newTestTokenManager(t), WithFortyTwoOAuth(provider))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/42/login", nil)
	req.Header.Set("Accept-Language", "de-DE,de;q=0.9")
	rec := httptest.NewRecorder()

	handler.LoginFortyTwo(rec, req)

	if rec.Code != http.StatusFound {
		t.Fatalf("expected 302, got %d: %s", rec.Code, rec.Body.String())
	}
	cookie := findCookie(t, rec, oauthLocaleCookieName(oauthStateCookieName))
	if cookie.Value != "de" {
		t.Fatalf("expected stored OAuth locale de, got %q", cookie.Value)
	}
	if !cookie.HttpOnly {
		t.Fatal("locale cookie must be HttpOnly")
	}
}

func TestFortyTwoCallbackCreatesUserAndToken(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	provider := &fakeOAuthProvider{
		identity: OAuthIdentity{
			Provider:       fortyTwoProvider,
			ProviderUserID: "12345",
			Email:          "ft.user@example.com",
			Username:       "ft_user",
			FirstName:      "Forty",
			LastName:       "Two",
			ProfilePicture: "https://cdn.intra.42.fr/users/12345/medium_ft_user.jpg",
		},
	}
	handler := NewHandler(store, tokens, WithFortyTwoOAuth(provider))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/42/callback?code=valid-code&state=test-state", nil)
	req.AddCookie(&http.Cookie{Name: oauthStateCookieName, Value: "test-state"})
	rec := httptest.NewRecorder()

	handler.CallbackFortyTwo(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	response := decodeAuthEnvelope(t, rec)
	if response.Data.User.Email != "ft.user@example.com" {
		t.Fatalf("expected 42 email, got %q", response.Data.User.Email)
	}
	if response.Data.User.Username != "ft_user" {
		t.Fatalf("expected 42 login as username, got %q", response.Data.User.Username)
	}
	if response.Data.User.ProfilePicture == nil || *response.Data.User.ProfilePicture != "https://cdn.intra.42.fr/users/12345/medium_ft_user.jpg" {
		t.Fatalf("expected 42 profile picture, got %+v", response.Data.User.ProfilePicture)
	}
	if _, err := tokens.ValidateAccessToken(response.Data.AccessToken); err != nil {
		t.Fatalf("42 auth token should validate: %v", err)
	}

	secondReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/42/callback?code=valid-code&state=second-state", nil)
	secondReq.AddCookie(&http.Cookie{Name: oauthStateCookieName, Value: "second-state"})
	secondRec := httptest.NewRecorder()

	handler.CallbackFortyTwo(secondRec, secondReq)
	secondResponse := decodeAuthEnvelope(t, secondRec)
	if secondResponse.Data.User.ID != response.Data.User.ID {
		t.Fatalf("expected repeat 42 login to reuse user id %d, got %d", response.Data.User.ID, secondResponse.Data.User.ID)
	}
}

func TestFortyTwoCallbackRedirectsToFrontendWithTokenFragment(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	provider := &fakeOAuthProvider{
		identity: OAuthIdentity{
			Provider:       fortyTwoProvider,
			ProviderUserID: "12345",
			Email:          "ft.user@example.com",
			Username:       "ft_user",
			FirstName:      "Forty",
			LastName:       "Two",
		},
	}
	handler := NewHandler(
		store,
		tokens,
		WithFortyTwoOAuth(provider),
		WithFrontendAuthCallbackURL("http://frontend.local/auth/callback"),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/42/callback?code=valid-code&state=test-state", nil)
	req.AddCookie(&http.Cookie{Name: oauthStateCookieName, Value: "test-state"})
	rec := httptest.NewRecorder()

	handler.CallbackFortyTwo(rec, req)

	if rec.Code != http.StatusSeeOther {
		t.Fatalf("expected 303, got %d: %s", rec.Code, rec.Body.String())
	}

	location, err := url.Parse(rec.Header().Get("Location"))
	if err != nil {
		t.Fatalf("parse redirect location: %v", err)
	}
	if location.Scheme != "http" || location.Host != "frontend.local" || location.Path != "/auth/callback" {
		t.Fatalf("unexpected redirect location: %q", location.String())
	}

	fragment, err := url.ParseQuery(location.Fragment)
	if err != nil {
		t.Fatalf("parse redirect fragment: %v", err)
	}
	if _, err := tokens.ValidateAccessToken(fragment.Get("access_token")); err != nil {
		t.Fatalf("redirect access token should validate: %v", err)
	}
	if fragment.Get("token_type") != "Bearer" {
		t.Fatalf("expected Bearer token type, got %q", fragment.Get("token_type"))
	}

	var user userResponse
	if err := json.Unmarshal([]byte(fragment.Get("user")), &user); err != nil {
		t.Fatalf("decode user fragment: %v", err)
	}
	if user.Email != "ft.user@example.com" || user.Username != "ft_user" {
		t.Fatalf("unexpected redirected user: %+v", user)
	}

	cookie := findCookie(t, rec, oauthStateCookieName)
	if cookie.MaxAge >= 0 {
		t.Fatalf("expected OAuth state cookie to be cleared, got MaxAge=%d", cookie.MaxAge)
	}
}

func TestFortyTwoCallbackRedirectsProviderErrorToFrontend(t *testing.T) {
	handler := NewHandler(
		newMemoryUserStore(),
		newTestTokenManager(t),
		WithFortyTwoOAuth(&fakeOAuthProvider{}),
		WithFrontendAuthCallbackURL("http://frontend.local/auth/callback"),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/42/callback?error=access_denied&state=test-state", nil)
	req.AddCookie(&http.Cookie{Name: oauthStateCookieName, Value: "test-state"})
	rec := httptest.NewRecorder()

	handler.CallbackFortyTwo(rec, req)

	if rec.Code != http.StatusSeeOther {
		t.Fatalf("expected 303, got %d: %s", rec.Code, rec.Body.String())
	}
	location, err := url.Parse(rec.Header().Get("Location"))
	if err != nil {
		t.Fatalf("parse redirect location: %v", err)
	}
	if got := location.Query().Get("error"); got != "OAUTH_DENIED" {
		t.Fatalf("expected OAUTH_DENIED, got %q", got)
	}
	if got := location.Query().Get("error_description"); got != "OAuth authorization was denied for 42" {
		t.Fatalf("expected localized provider error description, got %q", got)
	}

	cookie := findCookie(t, rec, oauthStateCookieName)
	if cookie.MaxAge >= 0 {
		t.Fatalf("expected OAuth state cookie to be cleared, got MaxAge=%d", cookie.MaxAge)
	}
}

func TestFortyTwoCallbackErrorUsesStoredOAuthLocale(t *testing.T) {
	handler := NewHandler(
		newMemoryUserStore(),
		newTestTokenManager(t),
		WithFortyTwoOAuth(&fakeOAuthProvider{}),
		WithFrontendAuthCallbackURL("http://frontend.local/auth/callback"),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/42/callback?code=valid-code&state=bad-state", nil)
	req.AddCookie(&http.Cookie{Name: oauthStateCookieName, Value: "good-state"})
	req.AddCookie(&http.Cookie{Name: oauthLocaleCookieName(oauthStateCookieName), Value: "fr"})
	rec := httptest.NewRecorder()

	handler.CallbackFortyTwo(rec, req)

	if rec.Code != http.StatusSeeOther {
		t.Fatalf("expected 303, got %d: %s", rec.Code, rec.Body.String())
	}
	location, err := url.Parse(rec.Header().Get("Location"))
	if err != nil {
		t.Fatalf("parse redirect location: %v", err)
	}
	if got := location.Query().Get("error"); got != "INVALID_OAUTH_STATE" {
		t.Fatalf("expected INVALID_OAUTH_STATE, got %q", got)
	}
	if got := location.Query().Get("error_description"); got != "État OAuth invalide" {
		t.Fatalf("expected French OAuth error description, got %q", got)
	}
}

func TestFortyTwoCallbackRejectsInvalidState(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	provider := &fakeOAuthProvider{identity: OAuthIdentity{Provider: fortyTwoProvider, ProviderUserID: "1", Username: "ft"}}
	handler := NewHandler(store, tokens, WithFortyTwoOAuth(provider))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/42/callback?code=valid-code&state=bad-state", nil)
	req.AddCookie(&http.Cookie{Name: oauthStateCookieName, Value: "good-state"})
	rec := httptest.NewRecorder()

	handler.CallbackFortyTwo(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestFortyTwoCallbackRejectsExchangeError(t *testing.T) {
	handler := NewHandler(
		newMemoryUserStore(),
		newTestTokenManager(t),
		WithFortyTwoOAuth(&fakeOAuthProvider{exchangeErr: errors.New("provider down")}),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/42/callback?code=valid-code&state=test-state", nil)
	req.AddCookie(&http.Cookie{Name: oauthStateCookieName, Value: "test-state"})
	rec := httptest.NewRecorder()

	handler.CallbackFortyTwo(rec, req)

	if rec.Code != http.StatusBadGateway {
		t.Fatalf("expected 502, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeErrorEnvelope(t, rec).Error.Code; got != "OAUTH_EXCHANGE_FAILED" {
		t.Fatalf("expected OAUTH_EXCHANGE_FAILED, got %q", got)
	}
}

func TestFortyTwoLoginRequiresConfiguredProvider(t *testing.T) {
	handler := NewHandler(newMemoryUserStore(), newTestTokenManager(t))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/42/login", nil)
	rec := httptest.NewRecorder()

	handler.LoginFortyTwo(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeErrorEnvelope(t, rec).Error.Code; got != "OAUTH_NOT_CONFIGURED" {
		t.Fatalf("expected OAUTH_NOT_CONFIGURED, got %q", got)
	}
}

func TestGitHubLoginRedirectsWithStateCookie(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	provider := &fakeOAuthProvider{authURL: "https://github.com/login/oauth/authorize"}
	handler := NewHandler(store, tokens, WithGitHubOAuth(provider))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/github/login", nil)
	rec := httptest.NewRecorder()

	handler.LoginGitHub(rec, req)

	if rec.Code != http.StatusFound {
		t.Fatalf("expected 302, got %d: %s", rec.Code, rec.Body.String())
	}
	if provider.lastState == "" {
		t.Fatal("expected generated OAuth state")
	}
	location := rec.Header().Get("Location")
	if !strings.Contains(location, "state="+provider.lastState) {
		t.Fatalf("expected redirect location to include state, got %q", location)
	}

	cookie := rec.Result().Cookies()[0]
	if cookie.Name != githubOAuthStateCookieName {
		t.Fatalf("expected state cookie %q, got %q", githubOAuthStateCookieName, cookie.Name)
	}
	if cookie.Value != provider.lastState {
		t.Fatalf("expected cookie state %q, got %q", provider.lastState, cookie.Value)
	}
	if !cookie.HttpOnly {
		t.Fatal("state cookie must be HttpOnly")
	}
}

func TestGitHubCallbackCreatesUserAndToken(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	provider := &fakeOAuthProvider{
		identity: OAuthIdentity{
			Provider:       githubProvider,
			ProviderUserID: "98765",
			Email:          "gh.user@example.com",
			Username:       "gh_user",
			FirstName:      "Git",
			LastName:       "Hub",
		},
	}
	handler := NewHandler(store, tokens, WithGitHubOAuth(provider))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/github/callback?code=valid-code&state=test-state", nil)
	req.AddCookie(&http.Cookie{Name: githubOAuthStateCookieName, Value: "test-state"})
	rec := httptest.NewRecorder()

	handler.CallbackGitHub(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	response := decodeAuthEnvelope(t, rec)
	if response.Data.User.Email != "gh.user@example.com" {
		t.Fatalf("expected GitHub email, got %q", response.Data.User.Email)
	}
	if response.Data.User.Username != "gh_user" {
		t.Fatalf("expected GitHub login as username, got %q", response.Data.User.Username)
	}
	if _, err := tokens.ValidateAccessToken(response.Data.AccessToken); err != nil {
		t.Fatalf("GitHub auth token should validate: %v", err)
	}

	secondReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/github/callback?code=valid-code&state=second-state", nil)
	secondReq.AddCookie(&http.Cookie{Name: githubOAuthStateCookieName, Value: "second-state"})
	secondRec := httptest.NewRecorder()

	handler.CallbackGitHub(secondRec, secondReq)
	secondResponse := decodeAuthEnvelope(t, secondRec)
	if secondResponse.Data.User.ID != response.Data.User.ID {
		t.Fatalf("expected repeat GitHub login to reuse user id %d, got %d", response.Data.User.ID, secondResponse.Data.User.ID)
	}
}

func TestGitHubCallbackRejectsInvalidState(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	provider := &fakeOAuthProvider{identity: OAuthIdentity{Provider: githubProvider, ProviderUserID: "1", Username: "gh"}}
	handler := NewHandler(store, tokens, WithGitHubOAuth(provider))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/github/callback?code=valid-code&state=bad-state", nil)
	req.AddCookie(&http.Cookie{Name: githubOAuthStateCookieName, Value: "good-state"})
	rec := httptest.NewRecorder()

	handler.CallbackGitHub(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestGitHubLoginRequiresConfiguredProvider(t *testing.T) {
	handler := NewHandler(newMemoryUserStore(), newTestTokenManager(t))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/github/login", nil)
	rec := httptest.NewRecorder()

	handler.LoginGitHub(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeErrorEnvelope(t, rec).Error.Code; got != "OAUTH_NOT_CONFIGURED" {
		t.Fatalf("expected OAUTH_NOT_CONFIGURED, got %q", got)
	}
}

func TestGitLabLoginRedirectsWithStateCookie(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	provider := &fakeOAuthProvider{authURL: "https://gitlab.com/oauth/authorize"}
	handler := NewHandler(store, tokens, WithGitLabOAuth(provider))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/gitlab/login", nil)
	rec := httptest.NewRecorder()

	handler.LoginGitLab(rec, req)

	if rec.Code != http.StatusFound {
		t.Fatalf("expected 302, got %d: %s", rec.Code, rec.Body.String())
	}
	if provider.lastState == "" {
		t.Fatal("expected generated OAuth state")
	}
	location := rec.Header().Get("Location")
	if !strings.Contains(location, "state="+provider.lastState) {
		t.Fatalf("expected redirect location to include state, got %q", location)
	}

	cookie := rec.Result().Cookies()[0]
	if cookie.Name != gitlabOAuthStateCookieName {
		t.Fatalf("expected state cookie %q, got %q", gitlabOAuthStateCookieName, cookie.Name)
	}
	if cookie.Value != provider.lastState {
		t.Fatalf("expected cookie state %q, got %q", provider.lastState, cookie.Value)
	}
	if !cookie.HttpOnly {
		t.Fatal("state cookie must be HttpOnly")
	}
}

func TestGitLabCallbackCreatesUserAndToken(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	provider := &fakeOAuthProvider{
		identity: OAuthIdentity{
			Provider:       gitlabProvider,
			ProviderUserID: "13579",
			Email:          "gl.user@example.com",
			Username:       "gl_user",
			FirstName:      "Git",
			LastName:       "Lab",
			ProfilePicture: "https://gitlab.com/uploads/-/system/user/avatar/13579/avatar.png",
		},
	}
	handler := NewHandler(store, tokens, WithGitLabOAuth(provider))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/gitlab/callback?code=valid-code&state=test-state", nil)
	req.AddCookie(&http.Cookie{Name: gitlabOAuthStateCookieName, Value: "test-state"})
	rec := httptest.NewRecorder()

	handler.CallbackGitLab(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	response := decodeAuthEnvelope(t, rec)
	if response.Data.User.Email != "gl.user@example.com" {
		t.Fatalf("expected GitLab email, got %q", response.Data.User.Email)
	}
	if response.Data.User.Username != "gl_user" {
		t.Fatalf("expected GitLab username, got %q", response.Data.User.Username)
	}
	if response.Data.User.ProfilePicture == nil || *response.Data.User.ProfilePicture != "https://gitlab.com/uploads/-/system/user/avatar/13579/avatar.png" {
		t.Fatalf("expected GitLab profile picture, got %+v", response.Data.User.ProfilePicture)
	}
	if _, err := tokens.ValidateAccessToken(response.Data.AccessToken); err != nil {
		t.Fatalf("GitLab auth token should validate: %v", err)
	}

	secondReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/gitlab/callback?code=valid-code&state=second-state", nil)
	secondReq.AddCookie(&http.Cookie{Name: gitlabOAuthStateCookieName, Value: "second-state"})
	secondRec := httptest.NewRecorder()

	handler.CallbackGitLab(secondRec, secondReq)
	secondResponse := decodeAuthEnvelope(t, secondRec)
	if secondResponse.Data.User.ID != response.Data.User.ID {
		t.Fatalf("expected repeat GitLab login to reuse user id %d, got %d", response.Data.User.ID, secondResponse.Data.User.ID)
	}
}

func TestGitLabCallbackRejectsInvalidState(t *testing.T) {
	store := newMemoryUserStore()
	tokens := newTestTokenManager(t)
	provider := &fakeOAuthProvider{identity: OAuthIdentity{Provider: gitlabProvider, ProviderUserID: "1", Username: "gl"}}
	handler := NewHandler(store, tokens, WithGitLabOAuth(provider))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/gitlab/callback?code=valid-code&state=bad-state", nil)
	req.AddCookie(&http.Cookie{Name: gitlabOAuthStateCookieName, Value: "good-state"})
	rec := httptest.NewRecorder()

	handler.CallbackGitLab(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestGitLabLoginRequiresConfiguredProvider(t *testing.T) {
	handler := NewHandler(newMemoryUserStore(), newTestTokenManager(t))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/gitlab/login", nil)
	rec := httptest.NewRecorder()

	handler.LoginGitLab(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := decodeErrorEnvelope(t, rec).Error.Code; got != "OAUTH_NOT_CONFIGURED" {
		t.Fatalf("expected OAUTH_NOT_CONFIGURED, got %q", got)
	}
}

func findCookie(t *testing.T, rec *httptest.ResponseRecorder, name string) *http.Cookie {
	t.Helper()

	for _, cookie := range rec.Result().Cookies() {
		if cookie.Name == name {
			return cookie
		}
	}
	t.Fatalf("expected cookie %q", name)
	return nil
}

type fakeOAuthProvider struct {
	authURL     string
	authErr     error
	lastState   string
	identity    OAuthIdentity
	exchangeErr error
}

func (p *fakeOAuthProvider) AuthCodeURL(state string) (string, error) {
	if p.authErr != nil {
		return "", p.authErr
	}
	p.lastState = state
	return p.authURL + "?state=" + state, nil
}

func (p *fakeOAuthProvider) Exchange(context.Context, string) (OAuthIdentity, error) {
	if p.exchangeErr != nil {
		return OAuthIdentity{}, p.exchangeErr
	}
	return p.identity, nil
}
