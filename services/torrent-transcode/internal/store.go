package torrent_transcode

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

// Torrent holds the torrent metadata needed to start a download.
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

func (s *Store) SetTorrentStatus(ctx context.Context, id, status string) error {
	tag, err := s.db.Exec(ctx, `UPDATE torrents SET status = $2 WHERE id = $1`, id, status)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
