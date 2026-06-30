package auth

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"hypertube/api/internal/models"
	"hypertube/api/internal/userinput"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrUserNotFound              = errors.New("user not found")
	ErrDuplicateUser             = errors.New("duplicate user")
	ErrInvalidPasswordResetToken = errors.New("invalid password reset token")
)

type DuplicateUserError struct {
	Fields []string
}

func (e *DuplicateUserError) Error() string {
	if len(e.Fields) == 0 {
		return ErrDuplicateUser.Error()
	}
	return fmt.Sprintf("%s: %s", ErrDuplicateUser, strings.Join(e.Fields, ", "))
}

func (e *DuplicateUserError) Unwrap() error {
	return ErrDuplicateUser
}

func duplicateUserError(fields ...string) error {
	return &DuplicateUserError{Fields: fields}
}

func duplicateUserFields(err error) []string {
	var duplicateErr *DuplicateUserError
	if errors.As(err, &duplicateErr) {
		return duplicateErr.Fields
	}
	return nil
}

type UserExistenceChecker interface {
	UserExists(ctx context.Context, userID int64) (bool, error)
}

type userStore interface {
	UserExistenceChecker
	CreateUser(ctx context.Context, params CreateUserParams) (models.User, error)
	FindUserByEmail(ctx context.Context, email string) (models.User, error)
	FindUserByLogin(ctx context.Context, login string) (models.User, error)
	FindOrCreateOAuthUser(ctx context.Context, params OAuthUserParams) (models.User, error)
	CreatePasswordResetToken(ctx context.Context, params CreatePasswordResetTokenParams) error
	ResetPasswordWithToken(ctx context.Context, tokenHash string, passwordHash string) (models.User, error)
}

type Store struct {
	db *pgxpool.Pool
}

var _ UserExistenceChecker = (*Store)(nil)

type CreateUserParams struct {
	Email          string
	Username       string
	FirstName      string
	LastName       string
	ProfilePicture string
	PasswordHash   string
	Color          string
}

type OAuthUserParams struct {
	Provider       string
	ProviderUserID string
	Email          string
	Username       string
	FirstName      string
	LastName       string
	ProfilePicture string
}

type CreatePasswordResetTokenParams struct {
	UserID    int64
	TokenHash string
	ExpiresAt time.Time
}

func NewStore(db *pgxpool.Pool) *Store {
	return &Store{db: db}
}

func (s *Store) UserExists(ctx context.Context, userID int64) (bool, error) {
	var exists bool
	err := s.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM users
			WHERE id = $1
		)
	`, userID).Scan(&exists)
	return exists, err
}

func (s *Store) CreateUser(ctx context.Context, params CreateUserParams) (models.User, error) {
	color := strings.TrimSpace(params.Color)
	if color == "" {
		color = models.RandomUserColor()
	}
	if !models.IsValidUserColor(color) {
		return models.User{}, fmt.Errorf("invalid user color: %q", params.Color)
	}

	user, err := scanUser(s.db.QueryRow(ctx, `
		INSERT INTO users (email, username, first_name, last_name, profile_picture, password_hash, color)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, email, username, first_name, last_name, profile_picture, COALESCE(password_hash, ''), color, created_at, updated_at
	`, params.Email, params.Username, params.FirstName, params.LastName, nullableString(params.ProfilePicture), params.PasswordHash, color))
	if err != nil {
		if isUniqueViolation(err) {
			fields, fieldErr := s.duplicateCreateUserFields(ctx, params)
			if fieldErr != nil || len(fields) == 0 {
				return models.User{}, ErrDuplicateUser
			}
			return models.User{}, duplicateUserError(fields...)
		}
		return models.User{}, err
	}
	return user, nil
}

func (s *Store) duplicateCreateUserFields(ctx context.Context, params CreateUserParams) ([]string, error) {
	var emailExists bool
	var usernameExists bool
	err := s.db.QueryRow(ctx, `
		SELECT
			EXISTS (
				SELECT 1
				FROM users
				WHERE email = $1 AND COALESCE(password_hash, '') <> ''
			),
			EXISTS (
				SELECT 1
				FROM users
				WHERE username = $2
			)
	`, params.Email, params.Username).Scan(&emailExists, &usernameExists)
	if err != nil {
		return nil, err
	}

	fields := make([]string, 0, 2)
	if params.PasswordHash != "" && emailExists {
		fields = append(fields, "email")
	}
	if usernameExists {
		fields = append(fields, "username")
	}
	return fields, nil
}

func (s *Store) FindUserByEmail(ctx context.Context, email string) (models.User, error) {
	user, err := scanUser(s.db.QueryRow(ctx, `
		SELECT id, email, username, first_name, last_name, profile_picture, COALESCE(password_hash, ''), color, created_at, updated_at
		FROM users
		WHERE email = $1 AND COALESCE(password_hash, '') <> ''
	`, email))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.User{}, ErrUserNotFound
		}
		return models.User{}, err
	}
	return user, nil
}

func (s *Store) FindUserByLogin(ctx context.Context, login string) (models.User, error) {
	login = strings.TrimSpace(login)
	email := ""
	if normalizedEmail, ok := userinput.NormalizeEmail(login); ok {
		email = normalizedEmail
	}

	user, err := scanUser(s.db.QueryRow(ctx, `
		SELECT id, email, username, first_name, last_name, profile_picture, COALESCE(password_hash, ''), color, created_at, updated_at
		FROM users
		WHERE (email = $1 OR username = $2) AND COALESCE(password_hash, '') <> ''
	`, email, login))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.User{}, ErrUserNotFound
		}
		return models.User{}, err
	}
	return user, nil
}

func (s *Store) FindOrCreateOAuthUser(ctx context.Context, params OAuthUserParams) (models.User, error) {
	params = normalizeOAuthUserParams(params)
	if params.Provider == "" || params.ProviderUserID == "" {
		return models.User{}, ErrUserNotFound
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return models.User{}, err
	}
	defer tx.Rollback(ctx)

	user, err := findOAuthUserByAccount(ctx, tx, params.Provider, params.ProviderUserID)
	if err == nil {
		hasOtherProvider, err := userHasOtherOAuthProvider(ctx, tx, user.ID, params.Provider)
		if err != nil {
			return models.User{}, err
		}
		if hasOtherProvider {
			user, err = createOAuthUser(ctx, tx, params)
			if err != nil {
				return models.User{}, err
			}
			if err := reassignOAuthAccount(ctx, tx, user.ID, params); err != nil {
				return models.User{}, err
			}
			if err := tx.Commit(ctx); err != nil {
				return models.User{}, err
			}
			return user, nil
		}
		user, err = applyOAuthProfile(ctx, tx, user, params)
		if err != nil {
			return models.User{}, err
		}
		if err := tx.Commit(ctx); err != nil {
			return models.User{}, err
		}
		return user, nil
	}
	if !errors.Is(err, ErrUserNotFound) {
		return models.User{}, err
	}

	user, err = createOAuthUser(ctx, tx, params)
	if err != nil {
		return models.User{}, err
	}

	if err := insertOAuthAccount(ctx, tx, user.ID, params); err != nil {
		return models.User{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return models.User{}, err
	}
	return user, nil
}

func createOAuthUser(ctx context.Context, q rowQuerier, params OAuthUserParams) (models.User, error) {
	username, err := availableOAuthUsername(ctx, q, params.Username, params.Provider, params.ProviderUserID)
	if err != nil {
		return models.User{}, err
	}
	color := models.RandomUserColor()

	user, err := scanUser(q.QueryRow(ctx, `
		INSERT INTO users (email, username, first_name, last_name, profile_picture, password_hash, color)
		VALUES ($1, $2, $3, $4, $5, '', $6)
		RETURNING id, email, username, first_name, last_name, profile_picture, COALESCE(password_hash, ''), color, created_at, updated_at
	`, params.Email, username, params.FirstName, params.LastName, nullableString(params.ProfilePicture), color))
	if err != nil {
		if isUniqueViolation(err) {
			return models.User{}, ErrDuplicateUser
		}
		return models.User{}, err
	}
	return user, nil
}

func (s *Store) CreatePasswordResetToken(ctx context.Context, params CreatePasswordResetTokenParams) error {
	_, err := s.db.Exec(ctx, `
		INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`, params.UserID, params.TokenHash, params.ExpiresAt)
	return err
}

func (s *Store) ResetPasswordWithToken(ctx context.Context, tokenHash string, passwordHash string) (models.User, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return models.User{}, err
	}
	defer tx.Rollback(ctx)

	var userID int64
	err = tx.QueryRow(ctx, `
		UPDATE password_reset_tokens
		SET used_at = NOW()
		WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
		RETURNING user_id
	`, tokenHash).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.User{}, ErrInvalidPasswordResetToken
		}
		return models.User{}, err
	}

	user, err := scanUser(tx.QueryRow(ctx, `
		UPDATE users
		SET password_hash = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING id, email, username, first_name, last_name, profile_picture, COALESCE(password_hash, ''), color, created_at, updated_at
	`, passwordHash, userID))
	if err != nil {
		return models.User{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return models.User{}, err
	}
	return user, nil
}

func scanUser(row pgx.Row) (models.User, error) {
	var user models.User
	var profilePicture sql.NullString
	err := row.Scan(
		&user.ID,
		&user.Email,
		&user.Username,
		&user.FirstName,
		&user.LastName,
		&profilePicture,
		&user.PasswordHash,
		&user.Color,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return models.User{}, err
	}
	if profilePicture.Valid {
		user.ProfilePicture = profilePicture.String
	}
	return user, nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

type rowQuerier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

type execer interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

func findOAuthUserByAccount(ctx context.Context, q rowQuerier, provider string, providerUserID string) (models.User, error) {
	user, err := scanUser(q.QueryRow(ctx, `
		SELECT u.id, u.email, u.username, u.first_name, u.last_name, u.profile_picture, COALESCE(u.password_hash, ''), u.color, u.created_at, u.updated_at
		FROM users u
		JOIN oauth_accounts oa ON oa.user_id = u.id
		WHERE oa.provider = $1 AND oa.provider_user_id = $2
	`, provider, providerUserID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.User{}, ErrUserNotFound
		}
		return models.User{}, err
	}
	return user, nil
}

func userHasOtherOAuthProvider(ctx context.Context, q rowQuerier, userID int64, provider string) (bool, error) {
	var exists bool
	err := q.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM oauth_accounts
			WHERE user_id = $1 AND provider <> $2
		)
	`, userID, provider).Scan(&exists)
	return exists, err
}

func reassignOAuthAccount(ctx context.Context, q execer, userID int64, params OAuthUserParams) error {
	_, err := q.Exec(ctx, `
		UPDATE oauth_accounts
		SET user_id = $1, provider_email = $2, updated_at = NOW()
		WHERE provider = $3 AND provider_user_id = $4
	`, userID, nullableString(params.Email), params.Provider, params.ProviderUserID)
	if err != nil {
		if isUniqueViolation(err) {
			return ErrDuplicateUser
		}
		return err
	}
	return nil
}

func applyOAuthProfile(ctx context.Context, q rowQuerier, user models.User, params OAuthUserParams) (models.User, error) {
	username, err := oauthUsernameForExistingUser(ctx, q, user, params)
	if err != nil {
		return models.User{}, err
	}
	firstName := user.FirstName
	if params.FirstName != "" {
		firstName = params.FirstName
	}
	lastName := user.LastName
	if params.LastName != "" {
		lastName = params.LastName
	}

	if username == user.Username && firstName == user.FirstName && lastName == user.LastName {
		return user, nil
	}

	updatedUser, err := scanUser(q.QueryRow(ctx, `
		UPDATE users
		SET username = $1, first_name = $2, last_name = $3, updated_at = NOW()
		WHERE id = $4
		RETURNING id, email, username, first_name, last_name, profile_picture, COALESCE(password_hash, ''), color, created_at, updated_at
	`, username, firstName, lastName, user.ID))
	if err != nil {
		return models.User{}, err
	}
	return updatedUser, nil
}

func oauthUsernameForExistingUser(ctx context.Context, q rowQuerier, user models.User, params OAuthUserParams) (string, error) {
	username := oauthUsernameBase(params.Username, params.Provider, params.ProviderUserID)
	if username == user.Username {
		return user.Username, nil
	}

	available, err := usernameAvailableForUser(ctx, q, username, user.ID)
	if err != nil {
		return "", err
	}
	if available {
		return username, nil
	}
	return user.Username, nil
}

func usernameAvailableForUser(ctx context.Context, q rowQuerier, username string, userID int64) (bool, error) {
	var existingID int64
	err := q.QueryRow(ctx, `SELECT id FROM users WHERE username = $1`, username).Scan(&existingID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return true, nil
		}
		return false, err
	}
	return existingID == userID, nil
}

func insertOAuthAccount(ctx context.Context, q execer, userID int64, params OAuthUserParams) error {
	_, err := q.Exec(ctx, `
		INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email)
		VALUES ($1, $2, $3, $4)
	`, userID, params.Provider, params.ProviderUserID, nullableString(params.Email))
	if err != nil {
		if isUniqueViolation(err) {
			return ErrDuplicateUser
		}
		return err
	}
	return nil
}

func availableOAuthUsername(ctx context.Context, q rowQuerier, rawUsername string, provider string, providerUserID string) (string, error) {
	base := oauthUsernameBase(rawUsername, provider, providerUserID)
	candidates := []string{
		base,
		usernameWithSuffix(base, "_"+provider),
		usernameWithSuffix(base, "_"+providerUserID),
	}

	for i := 2; i <= 100; i++ {
		candidates = append(candidates, usernameWithSuffix(base, fmt.Sprintf("_%s_%d", provider, i)))
	}

	for _, candidate := range candidates {
		exists, err := usernameExists(ctx, q, candidate)
		if err != nil {
			return "", err
		}
		if !exists {
			return candidate, nil
		}
	}

	return "", ErrDuplicateUser
}

func usernameExists(ctx context.Context, q rowQuerier, username string) (bool, error) {
	var exists bool
	err := q.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM users WHERE username = $1)`, username).Scan(&exists)
	return exists, err
}

func normalizeOAuthUserParams(params OAuthUserParams) OAuthUserParams {
	params.Provider = strings.TrimSpace(params.Provider)
	params.ProviderUserID = strings.TrimSpace(params.ProviderUserID)
	if email, ok := userinput.NormalizeEmail(params.Email); ok {
		params.Email = email
	} else {
		params.Email = oauthFallbackEmail(params.Provider, params.ProviderUserID)
	}

	params.Username = strings.TrimSpace(params.Username)
	if params.Username == "" {
		params.Username = "user_" + params.ProviderUserID
	}

	params.FirstName = strings.TrimSpace(params.FirstName)
	if params.FirstName == "" {
		params.FirstName = params.Username
	}

	params.LastName = strings.TrimSpace(params.LastName)
	if params.LastName == "" {
		params.LastName = params.Provider
	}

	params.ProfilePicture = strings.TrimSpace(params.ProfilePicture)

	return params
}

func oauthFallbackEmail(provider string, providerUserID string) string {
	provider = compactIdentifier(provider)
	providerUserID = compactIdentifier(providerUserID)
	if provider == "" {
		provider = "oauth"
	}
	if providerUserID == "" {
		providerUserID = "user"
	}
	return fmt.Sprintf("%s-%s@oauth.local", provider, providerUserID)
}

func oauthUsernameBase(rawUsername string, provider string, providerUserID string) string {
	rawUsername = strings.ToLower(strings.TrimSpace(rawUsername))
	var builder strings.Builder
	lastUnderscore := false
	for _, r := range rawUsername {
		valid := (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_'
		if valid {
			builder.WriteRune(r)
			lastUnderscore = r == '_'
			continue
		}
		if !lastUnderscore {
			builder.WriteByte('_')
			lastUnderscore = true
		}
	}

	base := strings.Trim(builder.String(), "_")
	if len(base) < 3 {
		base = "user_" + compactIdentifier(provider) + "_" + compactIdentifier(providerUserID)
	}
	if len(base) < 3 {
		base = "oauth_user"
	}
	if len(base) > 32 {
		base = base[:32]
	}
	return base
}

func usernameWithSuffix(base string, suffix string) string {
	suffix = compactUsernameSuffix(suffix)
	if suffix == "" {
		return base
	}
	if !strings.HasPrefix(suffix, "_") {
		suffix = "_" + suffix
	}
	if len(suffix) > 31 {
		suffix = suffix[:31]
	}
	limit := 32 - len(suffix)
	if limit < 1 {
		limit = 1
	}
	if len(base) > limit {
		base = strings.TrimRight(base[:limit], "_")
		if base == "" {
			base = "u"
		}
	}
	return base + suffix
}

func compactIdentifier(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	var builder strings.Builder
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			builder.WriteRune(r)
		}
	}
	return builder.String()
}

func compactUsernameSuffix(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	var builder strings.Builder
	lastUnderscore := false
	for _, r := range value {
		valid := (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_'
		if valid {
			builder.WriteRune(r)
			lastUnderscore = r == '_'
			continue
		}
		if !lastUnderscore {
			builder.WriteByte('_')
			lastUnderscore = true
		}
	}
	return strings.Trim(builder.String(), "_")
}

func nullableString(value string) any {
	if value == "" {
		return nil
	}
	return value
}
