package torrent_transcode

import (
	"hypertube/torrent-transcode/internal/torrent"
	"hypertube/torrent-transcode/internal/transcode"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"time"
)

type TorrentTranscodeHandler struct {
	videoBasePath   string
	torrentBasePath string
	torrentClient   *torrent.Client
	store           *Store
	streams         *map[string]io.ReadSeekCloser // torrentID → reader
	mu              *sync.Mutex
}

func NewTorrentTranscodeHandler(torrentClient *torrent.Client, store *Store, mu *sync.Mutex, streams *map[string]io.ReadSeekCloser) *TorrentTranscodeHandler {
	return &TorrentTranscodeHandler{
		videoBasePath:   "/data/videos",
		torrentBasePath: "/data/torrents",
		torrentClient:   torrentClient,
		store:           store,
		streams:         streams,
		mu:              mu,
	}
}

func (s *TorrentTranscodeHandler) InitDownload(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	torrentURL, err := s.store.GetTorrentURL(r.Context(), id)
	if err != nil {
		http.Error(w, "torrent not found", http.StatusNotFound)
		log.Printf("torrent not found in db for id %s: %v", id, err)
		return
	}
	
	torrentPath, err := s.torrentClient.DownloadTorrentFile(torrentURL)
	if err != nil {
		http.Error(w, "failed to download torrent file", http.StatusInternalServerError)
		log.Printf("failed to download torrent file: %v", err)
		return
	}
	log.Printf("%s: torrent file downloaded for torrent", id)
	
	IOReader, err := s.torrentClient.Add(torrentPath)
	if err != nil {
		http.Error(w, "failed to add torrent", http.StatusInternalServerError)
		log.Printf("failed to add torrent: %v", err)
		return
	}
	log.Printf("%s: torrent init successful for torrent", id)
	
	s.mu.Lock()
	(*s.streams)[id] = IOReader
	s.mu.Unlock()
	w.WriteHeader(http.StatusOK)
}

func (s *TorrentTranscodeHandler) InitTranscode(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	videoPath := s.videoBasePath + "/" + id
	// videoPath1 := s.videoBasePath + "/test"
	// videoPath2 := s.videoBasePath + "/batman" // hardcoded for now
	// videoPath3 := s.videoBasePath + "/nos" // hardcoded for now

	// torrentPath := s.torrentBasePath + "/" + "test" + "/rubber.mp4" // hardcoded for now
	// id = "batman-1966"     

	// Check if torrent is ready for transcoding
	var torrentReader io.ReadSeekCloser
	deadline := time.Now().Add(30 * time.Second)
	for time.Now().Before(deadline) {
		s.mu.Lock()
		torrentReader = (*s.streams)[id]
		s.mu.Unlock()
		if torrentReader != nil {
			break
		}
		time.Sleep(500 * time.Millisecond)
	}
	if torrentReader == nil {
		http.Error(w, "torrent not ready", http.StatusServiceUnavailable)
		log.Printf("torrent not ready after timeout: %s", id)
		return
	}
	log.Printf("%s: torrent file pipe ready for transcoding", id)

	if err := os.MkdirAll(videoPath, 0755); err != nil {
		http.Error(w, "failed to create stream directory", http.StatusInternalServerError)
		log.Printf("failed to create stream directory: %v", err)
		return
	}

	w.WriteHeader(http.StatusOK)

	go func() {
		log.Printf("%s: ConvertHLS starting", id)
		if err := transcode.ConvertPipeHLS(torrentReader, videoPath); err != nil {
			log.Printf("ConvertPipeHLS failed: %v", err)
		}
		// TODO register that the torrent is converted and finished in the db 
	}()
}
