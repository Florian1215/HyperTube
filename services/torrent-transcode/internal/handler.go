package torrent_transcode

import (
	"hypertube/torrent-transcode/internal/torrent"
	"hypertube/torrent-transcode/internal/transcode"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
)

type TorrentTranscodeHandler struct {
	videoBasePath   string
	torrentBasePath string
	torrentClient   *torrent.Client
	streams         *map[string]io.ReadSeekCloser // torrentID → reader
	mu              *sync.Mutex
}

func NewTorrentTranscodeHandler(torrentClient *torrent.Client, mu *sync.Mutex, streams *map[string]io.ReadSeekCloser) *TorrentTranscodeHandler {
	return &TorrentTranscodeHandler{
		videoBasePath:   "/data/videos",
		torrentBasePath: "/data/torrents",
		torrentClient:   torrentClient,
		streams:         streams,
		mu:              mu,
	}
}

func (s *TorrentTranscodeHandler) InitDownload(w http.ResponseWriter, r *http.Request) {

}

func (s *TorrentTranscodeHandler) InitTranscode(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	videoPath := s.videoBasePath + "/test"
	videoPath2 := s.videoBasePath + "/batman" // hardcoded for now

	torrentPath := s.torrentBasePath + "/" + "test" + "/rubber.mp4" // hardcoded for now
	id = "batman-1966"                                          // hardcoded for now
	s.mu.Lock()
	torrentReader := (*s.streams)[id]
	s.mu.Unlock()
	if torrentReader == nil {
		http.Error(w, "torrent not found", http.StatusNotFound)
		log.Printf("torrent not found: %s", id)
		return
	}

	if err := os.MkdirAll(videoPath, 0755); err != nil {
		http.Error(w, "failed to create stream directory", http.StatusInternalServerError)
		log.Printf("failed to create stream directory: %v", err)
		return
	}
	if err := os.MkdirAll(videoPath2, 0755); err != nil {
		http.Error(w, "failed to create stream directory", http.StatusInternalServerError)
		log.Printf("failed to create stream directory: %v", err)
		return
	}

	w.WriteHeader(http.StatusOK)

	go func() {
		log.Printf("ConvertHLS: torrentPath=%s videoPath=%s", torrentPath, videoPath)
		if err := transcode.ConvertHLS(torrentPath, videoPath); err != nil {
			log.Printf("ConvertHLS failed: %v", err)
			return
		}
		log.Printf("ConvertHLS done")
		if err := transcode.ConvertPipeHLS(torrentReader, videoPath2); err != nil {
			log.Printf("ConvertPipeHLS failed: %v", err)
		}
	}()
}
