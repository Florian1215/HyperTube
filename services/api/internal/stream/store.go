package stream

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("not found")

type Store struct {
	db *pgxpool.Pool
}

func NewStore(db *pgxpool.Pool) *Store {
	return &Store{db: db}
}

// Torrent holds the torrent metadata needed to start a stream.
type Torrent struct {
	URL   string
	Title string
}

func (s *Store) GetTorrent(ctx context.Context, id string) (Torrent, error) {
	var t Torrent
	err := s.db.QueryRow(ctx, `SELECT url, title FROM torrents WHERE id = $1`, id).Scan(&t.URL, &t.Title)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Torrent{}, ErrNotFound
		}
		return Torrent{}, err
	}
	return t, nil
}
