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

const torrentDir = "/data/torrents"

type Client struct {
	cl *torrentlib.Client
	streams         *map[string]io.ReadSeekCloser // torrentID → reader
	mu              *sync.Mutex
}

func NewClient(mu *sync.Mutex, streams *map[string]io.ReadSeekCloser) (*Client, error) {
	cl, err := torrentlib.NewClient(nil)
	if err != nil {
		return nil, fmt.Errorf("torrent client: %w", err)
	}
	log.Printf("torrent client listening on: %v", cl.ListenAddrs())

	go func() {
		torrentPath, err := downloadTorrentFile("https://archive.org/download/batman-1966_202112/batman-1966_202112_archive.torrent")
		if err != nil {
			log.Printf("download torrent file: %v", err)
			return
		}
		t, err := cl.AddTorrentFromFile(torrentPath)
		if err != nil {
			log.Printf("add torrent: %v", err)
			return
		}
		<-t.GotInfo()
		var largest *torrentlib.File
		for _, f := range t.Files() {
			if largest == nil || f.Length() > largest.Length() {
				largest = f
			}
		}
		if largest == nil {
			return
		}
		log.Printf("downloading largest file: %s", largest.Path())
		largest.Download()

		const minBuffer = 10 * 1024 * 1024 // 10 MB before making reader available for probing
		for largest.BytesCompleted() < minBuffer {
			time.Sleep(500 * time.Millisecond)
		}
		log.Printf("buffer ready, registering reader")

		reader := largest.NewReader()
		reader.SetReadahead(largest.Length())
		mu.Lock()
		(*streams)["batman-1966"] = reader
		mu.Unlock()
		// for {
		// 	if largest.BytesCompleted() == largest.Length() {
		// 		log.Printf("file complete: %s", largest.Path())
		// 		return
		// 	}
		// 	time.Sleep(5 * time.Second)
		// 	log.Printf("downloading... %d/%d bytes complete", largest.BytesCompleted(), largest.Length())
		// }
	}()

	return &Client{cl: cl, streams: streams, mu: mu}, nil
}

func (c *Client) Close() {
	c.cl.Close()
}

// Add downloads the .torrent file at torrentURL to /data/torrent/, then starts
// streaming and returns a reader over the largest file (assumed to be the video).
func (c *Client) Add(torrentURL string) (io.ReadSeekCloser, error) {
	torrentPath, err := downloadTorrentFile(torrentURL)
	if err != nil {
		return nil, err
	}

	t, err := c.cl.AddTorrentFromFile(torrentPath)
	if err != nil {
		return nil, fmt.Errorf("add torrent: %w", err)
	}

	<-t.GotInfo()

	var largest *torrentlib.File
	for _, f := range t.Files() {
		if largest == nil || f.Length() > largest.Length() {
			largest = f
		}
	}
	if largest == nil {
		return nil, fmt.Errorf("torrent has no files")
	}

	largest.Download()

	r := largest.NewReader()
	r.SetReadahead(4 * 1024 * 1024)

	return r, nil
}

func downloadTorrentFile(torrentURL string) (string, error) {
	if err := os.MkdirAll(torrentDir, 0755); err != nil {
		return "", fmt.Errorf("create torrent dir: %w", err)
	}

	filename := filepath.Base(torrentURL)
	destPath := filepath.Join(torrentDir, filename)

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
