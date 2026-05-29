package torrent

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	torrentlib "github.com/anacrolix/torrent"
)

type Client struct {
	cl *torrentlib.Client
	streams         *map[string]io.ReadSeekCloser // torrentID → reader
	mu              *sync.Mutex
	torrentDir	   string
}

func NewClient(mu *sync.Mutex, streams *map[string]io.ReadSeekCloser) (*Client, error) {
	torrentDir := "/data/torrents"
	cl, err := torrentlib.NewClient(nil)
	if err != nil {
		return nil, fmt.Errorf("torrent client: %w", err)
	}
	log.Printf("torrent client listening on: %v", cl.ListenAddrs())
	return &Client{cl: cl, streams: streams, mu: mu, torrentDir: torrentDir}, nil
}

func (c *Client) Close() {
	c.cl.Close()
}

// Add downloads the .torrent file at torrentURL to /data/torrent/, then starts
// streaming and returns a reader over the largest file (assumed to be the video).
func (c *Client) Add(torrentPath string) (io.ReadSeekCloser, error) {

	torrent, err := c.cl.AddTorrentFromFile(torrentPath)
	if err != nil {
		return nil, fmt.Errorf("add torrent: %w", err)
	}

	<-torrent.GotInfo()

	var largest *torrentlib.File
	for _, f := range torrent.Files() {
		if largest == nil || f.Length() > largest.Length() {
			largest = f
		}
	}
	if largest == nil {
		return nil, fmt.Errorf("torrent has no files")
	}

	largest.Download()

	const minBuffer = 10 * 1024 * 1024 // 10 MB before making reader available for probing
	for largest.BytesCompleted() < minBuffer {
		time.Sleep(500 * time.Millisecond)
	}
	log.Printf("buffer ready, ready for transcoding")

	reader := largest.NewReader()
	reader.SetReadahead(largest.Length())

	return reader, nil
}

func (c *Client) DownloadTorrentFile(torrentURL string) (string, error) {
	if err := os.MkdirAll(c.torrentDir, 0755); err != nil {
		return "", fmt.Errorf("create torrent dir: %w", err)
	}

	filename := filepath.Base(torrentURL)
	destPath := filepath.Join(c.torrentDir, filename)

	if _, err := os.Stat(destPath); err == nil {
		return destPath, nil
	}

	resp, err := http.Get(torrentURL)
	if err != nil {
		return "", fmt.Errorf("download torrent file: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("download torrent file: status %d", resp.StatusCode)
	}

	f, err := os.Create(destPath)
	if err != nil {
		return "", fmt.Errorf("create torrent file: %w", err)
	}
	defer f.Close()

	if _, err := io.Copy(f, resp.Body); err != nil {
		return "", fmt.Errorf("write torrent file: %w", err)
	}

	return destPath, nil
}
