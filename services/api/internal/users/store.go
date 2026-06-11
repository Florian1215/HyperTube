package users

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"hypertube/api/internal/models"
)

var ErrUserNotFound = errors.New("user not found")

type Store struct {
	db *pgxpool.Pool
}

func NewStore(db *pgxpool.Pool) *Store {
	return &Store{db: db}
}

func (s *Store) ListUsers(ctx context.Context) ([]models.User, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, email, username, first_name, last_name, COALESCE(profile_picture, ''), COALESCE(password_hash, ''), color, created_at, updated_at
		FROM users
		ORDER BY id
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []models.User{}
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Email, &u.Username, &u.FirstName, &u.LastName, &u.ProfilePicture, &u.PasswordHash, &u.Color, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return users, nil
}

func (s *Store) FindUserByID(ctx context.Context, id int64) (models.User, error) {
	var u models.User
	err := s.db.QueryRow(ctx, `
		SELECT id, email, username, first_name, last_name, COALESCE(profile_picture, ''), COALESCE(password_hash, ''), color, created_at, updated_at
		FROM users
		WHERE id = $1
	`, id).Scan(&u.ID, &u.Email, &u.Username, &u.FirstName, &u.LastName, &u.ProfilePicture, &u.PasswordHash, &u.Color, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.User{}, ErrUserNotFound
		}
		return models.User{}, err
	}
	return u, nil
}
