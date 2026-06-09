package users

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrUserNotFound = errors.New("user not found")

type Store struct {
	db *pgxpool.Pool
}

func NewStore(db *pgxpool.Pool) *Store {
	return &Store{db: db}
}

func (s *Store) UpdateMyColor(ctx context.Context, userID int64, color string) (string, error) {
	var updatedColor string
	err := s.db.QueryRow(ctx, `
		UPDATE users
		SET color = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING color
	`, color, userID).Scan(&updatedColor)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrUserNotFound
		}
		return "", err
	}
	return updatedColor, nil
}
